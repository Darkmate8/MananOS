import {
  View,
  Text,
  TextInput,
  StyleSheet,
  FlatList,
  Pressable,
  KeyboardAvoidingView,
  Platform,
  ActivityIndicator,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { router } from 'expo-router';
import { useState, useCallback, useEffect, useRef } from 'react';
import * as Haptics from 'expo-haptics';
import { Ionicons } from '@expo/vector-icons';
import Animated, { useAnimatedStyle, useSharedValue, withTiming } from 'react-native-reanimated';
import { streamText } from 'ai';
import { createGoogleGenerativeAI } from '@ai-sdk/google';
import { v4 as uuidv4 } from 'uuid';

import { theme } from '@/lib/theme';
import { getApiKey } from '@/hooks/useApiKeys';
import { useCoachContext, type CoachContext } from '@/hooks/useCoachContext';
import { supabase } from '@/lib/supabaseClient';
import { useAuthStore } from '@/store/authStore';

// ─── Types ────────────────────────────────────────────────────────────────────

interface ChatMessage {
  id: string;
  role: 'user' | 'assistant';
  content: string;
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

function buildSystemPrompt(ctx: CoachContext | undefined): string {
  const base = `You are a Staff-Level Strength Coach, Biomechanist, and Habit Strategist.
Tone: Warm, direct, editorial, and highly specific. No clinical coldness; no emoji-spam. Speak like an experienced coach who knows the user's data.

RULES:
- You have absolute memory of all historical logs below. Never ask the user what they lifted or completed if the data is present.
- Frame progression over absolute numbers. Spot trends and reference them natively.
- If a data point is empty, acknowledge the blank slate. Do not invent history.
- Steps at 0 = unlogged, not zero activity.
- Keep responses concise: max 2 brief paragraphs + one actionable metric box if appropriate.
- Never output meta-commentary or apologies. Start directly with the coaching directive.
- When delivering performance summaries, use this exact markdown table format:
  ### [EXERCISE_NAME] Progression
  | Session | Top Set | Calculated Volume | Avg RPE |
  | :------ | :------ | :---------------- | :------ |`;

  if (!ctx) return base;

  const contextBlock = JSON.stringify(ctx, null, 2);
  return `${base}

--- USER DATA CONTEXT (ground truth) ---
${contextBlock}
--- END CONTEXT ---`;
}

const AnimatedPressable = Animated.createAnimatedComponent(Pressable);

function usePressFeedback() {
  const scale = useSharedValue(1);
  const animatedStyle = useAnimatedStyle(() => ({ transform: [{ scale: scale.value }] }));
  const onPressIn = () => { scale.value = withTiming(0.97, { duration: theme.animation.press }); };
  const onPressOut = () => { scale.value = withTiming(1, { duration: theme.animation.press }); };
  return { animatedStyle, onPressIn, onPressOut };
}

// ─── Message Bubble ───────────────────────────────────────────────────────────

function MessageBubble({ message, isStreaming }: { message: ChatMessage; isStreaming?: boolean }) {
  const isUser = message.role === 'user';

  return (
    <View style={[bubbleStyles.wrapper, isUser ? bubbleStyles.wrapperUser : bubbleStyles.wrapperAssistant]}>
      {!isUser && (
        <View style={bubbleStyles.avatarRow}>
          <View style={bubbleStyles.avatar}>
            <Text style={bubbleStyles.avatarText}>C</Text>
          </View>
        </View>
      )}
      <View style={[bubbleStyles.bubble, isUser ? bubbleStyles.bubbleUser : bubbleStyles.bubbleAssistant]}>
        <Text style={[bubbleStyles.text, isUser ? bubbleStyles.textUser : bubbleStyles.textAssistant]}>
          {message.content}
        </Text>
        {isStreaming && (
          <View style={bubbleStyles.cursor} />
        )}
      </View>
    </View>
  );
}

const bubbleStyles = StyleSheet.create({
  wrapper: {
    marginVertical: theme.spacing.xs,
    maxWidth: '85%',
  },
  wrapperUser: {
    alignSelf: 'flex-end',
  },
  wrapperAssistant: {
    alignSelf: 'flex-start',
    flexDirection: 'row',
    alignItems: 'flex-end',
    gap: theme.spacing.sm,
  },
  avatarRow: {
    marginBottom: theme.spacing.xs,
  },
  avatar: {
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: theme.colors.accentPrimary,
    alignItems: 'center',
    justifyContent: 'center',
  },
  avatarText: {
    fontSize: 12,
    fontFamily: theme.fonts.bodyBold.fontFamily,
    color: theme.colors.bgCanvas,
  },
  bubble: {
    borderRadius: theme.radius.card,
    padding: theme.spacing.lg,
    flex: 1,
  },
  bubbleUser: {
    backgroundColor: theme.colors.accentPrimary,
    borderBottomRightRadius: theme.spacing.xs,
  },
  bubbleAssistant: {
    backgroundColor: theme.colors.bgSurface1,
    borderWidth: 1,
    borderColor: theme.colors.borderDefault,
    borderBottomLeftRadius: theme.spacing.xs,
  },
  text: {
    fontSize: 15,
    lineHeight: 22,
  },
  textUser: {
    fontFamily: theme.fonts.body.fontFamily,
    color: theme.colors.bgCanvas,
  },
  textAssistant: {
    fontFamily: theme.fonts.body.fontFamily,
    color: theme.colors.textPrimary,
  },
  cursor: {
    width: 8,
    height: 2,
    backgroundColor: theme.colors.accentPrimary,
    marginTop: theme.spacing.xs,
    borderRadius: 1,
  },
});

// ─── No Key Banner ────────────────────────────────────────────────────────────

function NoKeyBanner() {
  return (
    <View style={noKeyStyles.container}>
      <Ionicons name="key-outline" size={40} color={theme.colors.textTertiary} />
      <Text style={noKeyStyles.title}>No API Key Configured</Text>
      <Text style={noKeyStyles.body}>
        Add your Gemini API key in Settings to activate the AI Coach.
      </Text>
      <Pressable
        style={noKeyStyles.button}
        onPress={() => router.push('/(modals)/settings')}
      >
        <Ionicons name="settings-outline" size={16} color={theme.colors.bgCanvas} />
        <Text style={noKeyStyles.buttonLabel}>Open Settings</Text>
      </Pressable>
    </View>
  );
}

const noKeyStyles = StyleSheet.create({
  container: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: theme.spacing.xxxl,
    gap: theme.spacing.lg,
  },
  title: {
    fontSize: 20,
    fontFamily: theme.fonts.display.fontFamily,
    color: theme.colors.textPrimary,
    textAlign: 'center',
  },
  body: {
    fontSize: 15,
    fontFamily: theme.fonts.body.fontFamily,
    color: theme.colors.textSecondary,
    textAlign: 'center',
    lineHeight: 22,
  },
  button: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: theme.spacing.sm,
    backgroundColor: theme.colors.accentPrimary,
    paddingHorizontal: theme.spacing.xxl,
    paddingVertical: theme.spacing.md,
    borderRadius: theme.radius.button,
    marginTop: theme.spacing.sm,
  },
  buttonLabel: {
    fontSize: 15,
    fontFamily: theme.fonts.bodyBold.fontFamily,
    color: theme.colors.bgCanvas,
  },
});

// ─── Screen ───────────────────────────────────────────────────────────────────

export default function CoachScreen() {
  const userId = useAuthStore((s) => s.userId);
  const { data: context, isLoading: contextLoading } = useCoachContext();

  const [apiKey, setApiKey] = useState<string | null>(null);
  const [keyLoaded, setKeyLoaded] = useState(false);
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [streamingMessage, setStreamingMessage] = useState<string>('');
  const [inputText, setInputText] = useState('');
  const [isStreaming, setIsStreaming] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const sendPress = usePressFeedback();
  const abortRef = useRef<AbortController | null>(null);

  useEffect(() => {
    getApiKey('gemini').then((key) => {
      setApiKey(key);
      setKeyLoaded(true);
    });
  }, []);

  useEffect(() => {
    return () => {
      abortRef.current?.abort();
    };
  }, []);

  const persistMessages = useCallback(
    async (userMsg: ChatMessage, assistantMsg: ChatMessage) => {
      if (!userId) return;
      await supabase.from('chat_messages').insert([
        { id: userMsg.id, user_id: userId, role: 'user', content: userMsg.content },
        { id: assistantMsg.id, user_id: userId, role: 'assistant', content: assistantMsg.content },
      ]);
    },
    [userId],
  );

  const handleSend = useCallback(async () => {
    const trimmed = inputText.trim();
    if (!trimmed || isStreaming || !apiKey) return;

    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    setError(null);

    const userMsg: ChatMessage = { id: uuidv4(), role: 'user', content: trimmed };
    setInputText('');
    setMessages((prev) => [userMsg, ...prev]);
    setIsStreaming(true);
    setStreamingMessage('');

    abortRef.current = new AbortController();

    try {
      const googleProvider = createGoogleGenerativeAI({ apiKey });

      // Build conversation history in chronological order (oldest first)
      const history: { role: 'user' | 'assistant'; content: string }[] = [
        ...messages.slice().reverse(),
        userMsg,
      ].map((m) => ({ role: m.role, content: m.content }));

      const result = streamText({
        model: googleProvider('gemini-2.0-flash'),
        system: buildSystemPrompt(context),
        messages: history,
        abortSignal: abortRef.current.signal,
      });

      let fullText = '';
      for await (const chunk of result.textStream) {
        fullText += chunk;
        setStreamingMessage(fullText);
      }

      const assistantMsg: ChatMessage = {
        id: uuidv4(),
        role: 'assistant',
        content: fullText,
      };

      setMessages((prev) => [assistantMsg, ...prev]);
      setStreamingMessage('');
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);

      persistMessages(userMsg, assistantMsg);
    } catch (err: unknown) {
      if (err instanceof Error && err.name === 'AbortError') return;
      setError('Failed to reach the coach. Check your API key and connection.');
      setStreamingMessage('');
    } finally {
      setIsStreaming(false);
      abortRef.current = null;
    }
  }, [inputText, isStreaming, apiKey, messages, context, persistMessages]);

  const renderItem = useCallback(
    ({ item }: { item: ChatMessage }) => <MessageBubble message={item} />,
    [],
  );

  const keyExtractor = useCallback((item: ChatMessage) => item.id, []);

  if (!keyLoaded || contextLoading) {
    return (
      <SafeAreaView style={styles.safe} edges={['top']}>
        <View style={styles.loadingCenter}>
          <ActivityIndicator color={theme.colors.accentPrimary} />
        </View>
      </SafeAreaView>
    );
  }

  if (!apiKey) {
    return (
      <SafeAreaView style={styles.safe} edges={['top']}>
        <View style={styles.header}>
          <Pressable onPress={() => router.back()} hitSlop={12} style={styles.backBtn}>
            <Ionicons name="arrow-back" size={22} color={theme.colors.textSecondary} />
          </Pressable>
          <Text style={styles.headerTitle}>Coach</Text>
          <View style={{ width: 34 }} />
        </View>
        <NoKeyBanner />
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.safe} edges={['top']}>
      {/* Header */}
      <View style={styles.header}>
        <Pressable onPress={() => router.back()} hitSlop={12} style={styles.backBtn}>
          <Ionicons name="arrow-back" size={22} color={theme.colors.textSecondary} />
        </Pressable>
        <View style={styles.headerCenter}>
          <Text style={styles.headerTitle}>Coach</Text>
          {contextLoading && (
            <ActivityIndicator size="small" color={theme.colors.textTertiary} style={{ marginLeft: theme.spacing.sm }} />
          )}
        </View>
        <View style={{ width: 34 }} />
      </View>

      <KeyboardAvoidingView
        style={styles.flex}
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        keyboardVerticalOffset={0}
      >
        {/* Message list (inverted: newest at bottom) */}
        <FlatList
          data={messages}
          renderItem={renderItem}
          keyExtractor={keyExtractor}
          inverted
          contentContainerStyle={styles.listContent}
          showsVerticalScrollIndicator={false}
          ListHeaderComponent={
            isStreaming && streamingMessage ? (
              <MessageBubble
                message={{ id: '__streaming__', role: 'assistant', content: streamingMessage }}
                isStreaming
              />
            ) : isStreaming && !streamingMessage ? (
              <View style={styles.typingIndicator}>
                <View style={styles.typingAvatar}>
                  <Text style={styles.typingAvatarText}>C</Text>
                </View>
                <View style={styles.typingDots}>
                  <ActivityIndicator size="small" color={theme.colors.textTertiary} />
                </View>
              </View>
            ) : null
          }
          ListEmptyComponent={
            !isStreaming ? (
              <View style={styles.emptyState}>
                <Text style={styles.emptyTitle}>Your AI Coach</Text>
                <Text style={styles.emptyBody}>
                  Ask about your workouts, nutrition, recovery, or habit streaks. I have your last 4 sessions and 7-day macro history loaded.
                </Text>
              </View>
            ) : null
          }
        />

        {/* Error banner */}
        {error && (
          <View style={styles.errorBanner}>
            <Ionicons name="alert-circle-outline" size={14} color={theme.colors.error} />
            <Text style={styles.errorText}>{error}</Text>
          </View>
        )}

        {/* Input bar */}
        <View style={styles.inputBar}>
          <TextInput
            style={styles.input}
            value={inputText}
            onChangeText={setInputText}
            placeholder="Ask your coach..."
            placeholderTextColor={theme.colors.textTertiary}
            multiline
            maxLength={1000}
            returnKeyType="default"
            editable={!isStreaming}
            onSubmitEditing={handleSend}
          />
          <AnimatedPressable
            style={[
              styles.sendButton,
              (!inputText.trim() || isStreaming) && styles.sendButtonDisabled,
              sendPress.animatedStyle,
            ]}
            onPressIn={sendPress.onPressIn}
            onPressOut={sendPress.onPressOut}
            onPress={handleSend}
            disabled={!inputText.trim() || isStreaming}
          >
            {isStreaming ? (
              <ActivityIndicator size="small" color={theme.colors.bgCanvas} />
            ) : (
              <Ionicons name="arrow-up" size={18} color={theme.colors.bgCanvas} />
            )}
          </AnimatedPressable>
        </View>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

// ─── Styles ───────────────────────────────────────────────────────────────────

const styles = StyleSheet.create({
  safe: {
    flex: 1,
    backgroundColor: theme.colors.bgCanvas,
  },
  flex: {
    flex: 1,
  },
  loadingCenter: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: theme.spacing.xxl,
    paddingVertical: theme.spacing.lg,
    borderBottomWidth: 1,
    borderBottomColor: theme.colors.borderDefault,
  },
  backBtn: {
    padding: theme.spacing.xs,
  },
  headerCenter: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  headerTitle: {
    fontSize: 20,
    fontFamily: theme.fonts.display.fontFamily,
    color: theme.colors.textPrimary,
  },
  listContent: {
    paddingHorizontal: theme.spacing.xxl,
    paddingVertical: theme.spacing.lg,
    gap: theme.spacing.xs,
  },
  typingIndicator: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: theme.spacing.sm,
    marginVertical: theme.spacing.xs,
  },
  typingAvatar: {
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: theme.colors.accentPrimary,
    alignItems: 'center',
    justifyContent: 'center',
  },
  typingAvatarText: {
    fontSize: 12,
    fontFamily: theme.fonts.bodyBold.fontFamily,
    color: theme.colors.bgCanvas,
  },
  typingDots: {
    paddingHorizontal: theme.spacing.md,
    paddingVertical: theme.spacing.md,
    backgroundColor: theme.colors.bgSurface1,
    borderRadius: theme.radius.card,
    borderWidth: 1,
    borderColor: theme.colors.borderDefault,
  },
  emptyState: {
    alignItems: 'center',
    paddingHorizontal: theme.spacing.xxxl,
    paddingTop: theme.spacing.huge,
    gap: theme.spacing.md,
  },
  emptyTitle: {
    fontSize: 20,
    fontFamily: theme.fonts.display.fontFamily,
    color: theme.colors.textPrimary,
    textAlign: 'center',
  },
  emptyBody: {
    fontSize: 14,
    fontFamily: theme.fonts.body.fontFamily,
    color: theme.colors.textSecondary,
    textAlign: 'center',
    lineHeight: 21,
  },
  errorBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: theme.spacing.sm,
    marginHorizontal: theme.spacing.xxl,
    marginBottom: theme.spacing.sm,
    backgroundColor: theme.colors.bgSurface1,
    borderRadius: theme.radius.button,
    borderWidth: 1,
    borderColor: theme.colors.error,
    padding: theme.spacing.md,
  },
  errorText: {
    flex: 1,
    fontSize: 12,
    fontFamily: theme.fonts.body.fontFamily,
    color: theme.colors.error,
  },
  inputBar: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    gap: theme.spacing.sm,
    paddingHorizontal: theme.spacing.xxl,
    paddingTop: theme.spacing.sm,
    paddingBottom: theme.spacing.xxl,
    borderTopWidth: 1,
    borderTopColor: theme.colors.borderDefault,
  },
  input: {
    flex: 1,
    minHeight: 44,
    maxHeight: 120,
    backgroundColor: theme.colors.bgSurface1,
    borderRadius: theme.radius.button,
    borderWidth: 1,
    borderColor: theme.colors.borderDefault,
    paddingHorizontal: theme.spacing.lg,
    paddingVertical: theme.spacing.md,
    fontSize: 15,
    fontFamily: theme.fonts.body.fontFamily,
    color: theme.colors.textPrimary,
  },
  sendButton: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: theme.colors.accentPrimary,
    alignItems: 'center',
    justifyContent: 'center',
  },
  sendButtonDisabled: {
    backgroundColor: theme.colors.bgSurface2,
  },
});
