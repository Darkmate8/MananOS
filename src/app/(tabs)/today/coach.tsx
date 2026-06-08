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
import { Ionicons, Feather } from '@expo/vector-icons';
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
  timestamp: Date;
}

// ─── System Prompt ────────────────────────────────────────────────────────────

function buildSystemPrompt(ctx: CoachContext | undefined): string {
  const base = `You are a Staff-Level Strength Coach, Biomechanist, and Habit Strategist.
Tone: Warm, direct, editorial, and highly specific. No clinical coldness; no emoji-spam. Speak like an experienced coach who knows the user's data.

FORMATTING RULES (follow strictly):
- Wrap all inline data points, metrics, and values in backticks: \`+18% volume\`, \`92kg top set\`, \`6h 32m avg sleep\`, \`RPE 6-7\`
- Never wrap backtick chips in parentheses. Include all context inside the backtick: use \`RPE 6-7\` not (\`RPE 6-7\`)
- Use **bold** for key emphasis and exercise names
- Use ### for section headers when giving structured plans
- Use bullet lists (- item) for workout prescriptions and numbered steps
- For performance tables, use this exact format:
  ### [EXERCISE] Progression
  | Session | Top Set | Volume | RPE |
  | :------ | :------ | :----- | :-- |
- Keep responses concise: max 2 paragraphs + 1 structured block if appropriate
- Never output meta-commentary or apologies. Start directly with the coaching directive.`;

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

// ─── Markdown Renderer ────────────────────────────────────────────────────────

type InlineSegment =
  | { type: 'text'; value: string }
  | { type: 'bold'; value: string }
  | { type: 'chip'; value: string };

function parseInline(raw: string): InlineSegment[] {
  const segments: InlineSegment[] = [];
  const pattern = /(\*\*([^*]+)\*\*|`([^`]+)`)/g;
  let last = 0;
  let match: RegExpExecArray | null;

  while ((match = pattern.exec(raw)) !== null) {
    if (match.index > last) {
      segments.push({ type: 'text', value: raw.slice(last, match.index) });
    }
    if (match[0].startsWith('**')) {
      segments.push({ type: 'bold', value: match[2] });
    } else {
      segments.push({ type: 'chip', value: match[3] });
    }
    last = match.index + match[0].length;
  }

  if (last < raw.length) {
    segments.push({ type: 'text', value: raw.slice(last) });
  }

  // Strip orphaned ( before chips and ) after chips so brackets don't float outside
  for (let i = 0; i < segments.length; i++) {
    if (segments[i].type === 'chip') {
      if (i > 0 && segments[i - 1].type === 'text') {
        segments[i - 1] = { type: 'text', value: (segments[i - 1] as { type: 'text'; value: string }).value.replace(/\(\s*$/, '') };
      }
      if (i < segments.length - 1 && segments[i + 1].type === 'text') {
        segments[i + 1] = { type: 'text', value: (segments[i + 1] as { type: 'text'; value: string }).value.replace(/^\s*\)/, '') };
      }
    }
  }

  return segments;
}

function InlineText({ raw, style }: { raw: string; style?: object }) {
  const segments = parseInline(raw);

  // If no chips, render as a plain nested Text (preserves natural line wrapping)
  const hasChips = segments.some((s) => s.type === 'chip');
  if (!hasChips) {
    return (
      <Text style={style}>
        {segments.map((seg, i) =>
          seg.type === 'bold'
            ? <Text key={i} style={mdStyles.bold}>{seg.value}</Text>
            : <Text key={i}>{seg.value}</Text>
        )}
      </Text>
    );
  }

  // Chip present: use flex-wrap View so chips get real View border radius
  return (
    <View style={mdStyles.inlineRow}>
      {segments.map((seg, i) => {
        if (seg.type === 'bold') {
          return <Text key={i} style={[style, mdStyles.bold]}>{seg.value}</Text>;
        }
        if (seg.type === 'chip') {
          return (
            <View key={i} style={mdStyles.chipContainer}>
              <Text style={mdStyles.chipText}>{seg.value}</Text>
            </View>
          );
        }
        return <Text key={i} style={style}>{seg.value}</Text>;
      })}
    </View>
  );
}

type Block =
  | { kind: 'h3'; text: string }
  | { kind: 'h2'; text: string }
  | { kind: 'paragraph'; text: string }
  | { kind: 'bullet'; text: string }
  | { kind: 'table'; headers: string[]; rows: string[][] }
  | { kind: 'divider' };

function parseBlocks(content: string): Block[] {
  const lines = content.split('\n');
  const blocks: Block[] = [];
  let i = 0;

  while (i < lines.length) {
    const line = lines[i].trim();

    if (line === '') { i++; continue; }
    if (line === '---' || line === '***') { blocks.push({ kind: 'divider' }); i++; continue; }

    if (line.startsWith('### ')) {
      blocks.push({ kind: 'h3', text: line.slice(4) });
      i++;
      continue;
    }
    if (line.startsWith('## ')) {
      blocks.push({ kind: 'h2', text: line.slice(3) });
      i++;
      continue;
    }

    if (line.startsWith('* ') || line.startsWith('- ')) {
      blocks.push({ kind: 'bullet', text: line.slice(2) });
      i++;
      continue;
    }

    if (line.startsWith('|')) {
      const headerCells = line.split('|').slice(1, -1).map((c) => c.trim());
      i++;
      // skip separator row (|:---|:---|)
      if (i < lines.length && lines[i].trim().startsWith('|') && lines[i].includes('---')) i++;
      const rows: string[][] = [];
      while (i < lines.length && lines[i].trim().startsWith('|')) {
        rows.push(lines[i].trim().split('|').slice(1, -1).map((c) => c.trim()));
        i++;
      }
      blocks.push({ kind: 'table', headers: headerCells, rows });
      continue;
    }

    blocks.push({ kind: 'paragraph', text: line });
    i++;
  }

  return blocks;
}

function MarkdownContent({ content, isUser }: { content: string; isUser: boolean }) {
  if (isUser) {
    return <Text style={mdStyles.userText}>{content}</Text>;
  }

  const blocks = parseBlocks(content);

  return (
    <View style={{ gap: theme.spacing.sm }}>
      {blocks.map((block, idx) => {
        switch (block.kind) {
          case 'h3':
            return (
              <Text key={idx} style={mdStyles.h3}>
                {block.text}
              </Text>
            );
          case 'h2':
            return (
              <Text key={idx} style={mdStyles.h2}>
                {block.text}
              </Text>
            );
          case 'divider':
            return <View key={idx} style={mdStyles.divider} />;
          case 'bullet':
            return (
              <View key={idx} style={mdStyles.bulletRow}>
                <View style={mdStyles.bulletDot} />
                <InlineText raw={block.text} style={mdStyles.bodyText} />
              </View>
            );
          case 'table':
            return (
              <View key={idx} style={mdStyles.tableCard}>
                <View style={mdStyles.tableHeader}>
                  {block.headers.map((h, hi) => (
                    <Text key={hi} style={[mdStyles.tableHeaderCell, hi > 0 && mdStyles.tableRightCell]}>
                      {h}
                    </Text>
                  ))}
                </View>
                {block.rows.map((row, ri) => (
                  <View key={ri} style={[mdStyles.tableRow, ri < block.rows.length - 1 && mdStyles.tableRowBorder]}>
                    {row.map((cell, ci) => (
                      <Text key={ci} style={[mdStyles.tableCell, ci > 0 && mdStyles.tableRightCell]}>
                        {cell}
                      </Text>
                    ))}
                  </View>
                ))}
              </View>
            );
          case 'paragraph':
          default:
            return (
              <InlineText key={idx} raw={block.text} style={mdStyles.bodyText} />
            );
        }
      })}
    </View>
  );
}

const mdStyles = StyleSheet.create({
  userText: {
    fontSize: 15,
    fontFamily: theme.fonts.body.fontFamily,
    color: theme.colors.bgCanvas,
    lineHeight: 22,
  },
  bodyText: {
    fontSize: 15,
    fontFamily: theme.fonts.body.fontFamily,
    color: theme.colors.textPrimary,
    lineHeight: 23,
  },
  bold: {
    fontFamily: theme.fonts.bodyBold.fontFamily,
    color: theme.colors.textPrimary,
  },
  inlineRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    alignItems: 'center',
  },
  chipContainer: {
    backgroundColor: theme.colors.accentPrimaryMuted,
    borderRadius: theme.radius.pill,
    paddingHorizontal: 7,
    paddingVertical: 2,
    marginHorizontal: 2,
  },
  chipText: {
    fontFamily: theme.fonts.mono.fontFamily,
    fontSize: 12,
    color: theme.colors.accentPrimary,
    lineHeight: 18,
  },
  h3: {
    fontSize: 16,
    fontFamily: theme.fonts.display.fontFamily,
    color: theme.colors.textPrimary,
    lineHeight: 22,
    marginTop: theme.spacing.xs,
  },
  h2: {
    fontSize: 18,
    fontFamily: theme.fonts.display.fontFamily,
    color: theme.colors.textPrimary,
    lineHeight: 26,
    marginTop: theme.spacing.xs,
  },
  divider: {
    height: 1,
    backgroundColor: theme.colors.borderDefault,
    marginVertical: theme.spacing.xs,
  },
  bulletRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: theme.spacing.sm,
  },
  bulletDot: {
    width: 5,
    height: 5,
    borderRadius: 3,
    backgroundColor: theme.colors.accentPrimary,
    marginTop: 9,
    flexShrink: 0,
  },
  tableCard: {
    borderRadius: theme.radius.button,
    borderWidth: 1,
    borderColor: theme.colors.borderStrong,
    overflow: 'hidden',
    marginTop: theme.spacing.xs,
  },
  tableHeader: {
    flexDirection: 'row',
    backgroundColor: theme.colors.bgSurface2,
    paddingHorizontal: theme.spacing.md,
    paddingVertical: theme.spacing.sm,
  },
  tableHeaderCell: {
    flex: 1,
    fontSize: 11,
    fontFamily: theme.fonts.mono.fontFamily,
    color: theme.colors.textTertiary,
    textTransform: 'uppercase',
    letterSpacing: 0.8,
  },
  tableRow: {
    flexDirection: 'row',
    paddingHorizontal: theme.spacing.md,
    paddingVertical: theme.spacing.sm,
  },
  tableRowBorder: {
    borderBottomWidth: 1,
    borderBottomColor: theme.colors.borderDefault,
  },
  tableCell: {
    flex: 1,
    fontSize: 13,
    fontFamily: theme.fonts.mono.fontFamily,
    color: theme.colors.textPrimary,
  },
  tableRightCell: {
    textAlign: 'right',
  },
});

// ─── Message Bubble ───────────────────────────────────────────────────────────

function formatTime(date: Date): string {
  return date.toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' });
}

function MessageBubble({ message, isStreaming }: { message: ChatMessage; isStreaming?: boolean }) {
  const isUser = message.role === 'user';

  return (
    <View style={[bubbleStyles.wrapper, isUser ? bubbleStyles.wrapperUser : bubbleStyles.wrapperAssistant]}>
      {!isUser && (
        <View style={bubbleStyles.avatarCol}>
          <View style={bubbleStyles.avatar}>
            <Text style={bubbleStyles.avatarText}>C</Text>
          </View>
        </View>
      )}
      <View style={bubbleStyles.contentCol}>
        <View style={[bubbleStyles.bubble, isUser ? bubbleStyles.bubbleUser : bubbleStyles.bubbleAssistant]}>
          <MarkdownContent content={message.content} isUser={isUser} />
          {isStreaming && <View style={bubbleStyles.cursor} />}
        </View>
        <Text style={[bubbleStyles.timestamp, isUser && bubbleStyles.timestampRight]}>
          {formatTime(message.timestamp)}
        </Text>
      </View>
    </View>
  );
}

const bubbleStyles = StyleSheet.create({
  wrapper: {
    marginVertical: theme.spacing.xs,
  },
  wrapperUser: {
    alignItems: 'flex-end',
  },
  wrapperAssistant: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: theme.spacing.sm,
  },
  avatarCol: {
    paddingTop: theme.spacing.xs,
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
  contentCol: {
    maxWidth: '82%',
    gap: 4,
  },
  bubble: {
    borderRadius: theme.radius.card,
    padding: theme.spacing.lg,
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
  timestamp: {
    fontSize: 11,
    fontFamily: theme.fonts.body.fontFamily,
    color: theme.colors.textTertiary,
    paddingLeft: theme.spacing.xs,
  },
  timestampRight: {
    textAlign: 'right',
    paddingRight: theme.spacing.xs,
  },
  cursor: {
    width: 8,
    height: 2,
    backgroundColor: theme.colors.accentPrimaryMuted,
    marginTop: theme.spacing.sm,
    borderRadius: 1,
  },
});

// ─── Context Chips ────────────────────────────────────────────────────────────

function ContextChips({ context }: { context: CoachContext | undefined }) {
  if (!context) return null;

  const chips = [
    { icon: 'activity' as const, label: 'Last 4 workouts' },
    { icon: 'pie-chart' as const, label: '7-day nutrition' },
    { icon: 'check-square' as const, label: 'Habit grid' },
  ];

  return (
    <View style={chipStyles.row}>
      {chips.map((chip) => (
        <View key={chip.label} style={chipStyles.chip}>
          <Feather name={chip.icon} size={11} color={theme.colors.textTertiary} />
          <Text style={chipStyles.label}>{chip.label}</Text>
        </View>
      ))}
    </View>
  );
}

const chipStyles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: theme.spacing.sm,
    paddingHorizontal: theme.spacing.xxl,
    paddingBottom: theme.spacing.md,
  },
  chip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: theme.spacing.xs,
    paddingHorizontal: theme.spacing.md,
    paddingVertical: 5,
    backgroundColor: theme.colors.bgSurface1,
    borderRadius: theme.radius.pill,
    borderWidth: 1,
    borderColor: theme.colors.borderDefault,
  },
  label: {
    fontSize: 12,
    fontFamily: theme.fonts.body.fontFamily,
    color: theme.colors.textTertiary,
  },
});

// ─── Date Separator ───────────────────────────────────────────────────────────

function DateSeparator({ label }: { label: string }) {
  return (
    <View style={sepStyles.row}>
      <View style={sepStyles.line} />
      <Text style={sepStyles.label}>{label}</Text>
      <View style={sepStyles.line} />
    </View>
  );
}

const sepStyles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: theme.spacing.md,
    marginVertical: theme.spacing.md,
  },
  line: {
    flex: 1,
    height: 1,
    backgroundColor: theme.colors.borderDefault,
  },
  label: {
    fontSize: 11,
    fontFamily: theme.fonts.mono.fontFamily,
    color: theme.colors.textTertiary,
    letterSpacing: 1.2,
  },
});

// ─── No Key Banner ────────────────────────────────────────────────────────────

function NoKeyBanner() {
  const press = usePressFeedback();
  return (
    <View style={noKeyStyles.container}>
      <Ionicons name="key-outline" size={40} color={theme.colors.textTertiary} />
      <Text style={noKeyStyles.title}>No API Key Configured</Text>
      <Text style={noKeyStyles.body}>
        Add your Gemini API key in Settings to activate the AI Coach.
      </Text>
      <AnimatedPressable
        style={[noKeyStyles.button, press.animatedStyle]}
        onPressIn={press.onPressIn}
        onPressOut={press.onPressOut}
        onPress={() => router.push('/(modals)/settings')}
      >
        <Ionicons name="settings-outline" size={16} color={theme.colors.bgCanvas} />
        <Text style={noKeyStyles.buttonLabel}>Open Settings</Text>
      </AnimatedPressable>
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
  const backPress = usePressFeedback();
  const abortRef = useRef<AbortController | null>(null);

  useEffect(() => {
    getApiKey('gemini').then((key) => {
      setApiKey(key);
      setKeyLoaded(true);
    });
  }, []);

  useEffect(() => {
    return () => { abortRef.current?.abort(); };
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

    const userMsg: ChatMessage = { id: uuidv4(), role: 'user', content: trimmed, timestamp: new Date() };
    setInputText('');
    setMessages((prev) => [userMsg, ...prev]);
    setIsStreaming(true);
    setStreamingMessage('');

    abortRef.current = new AbortController();

    try {
      const googleProvider = createGoogleGenerativeAI({ apiKey });

      const history: { role: 'user' | 'assistant'; content: string }[] = [
        ...messages.slice().reverse(),
        userMsg,
      ].map((m) => ({ role: m.role, content: m.content }));

      const result = streamText({
        model: googleProvider('gemini-2.5-flash'),
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
        timestamp: new Date(),
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
    ({ item, index }: { item: ChatMessage; index: number }) => {
      const isLast = index === messages.length - 1;
      return (
        <>
          {isLast && <DateSeparator label="TODAY" />}
          <MessageBubble message={item} />
        </>
      );
    },
    [messages.length],
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
          <AnimatedPressable
            onPressIn={backPress.onPressIn}
            onPressOut={backPress.onPressOut}
            onPress={() => router.back()}
            hitSlop={12}
            style={[styles.backBtn, backPress.animatedStyle]}
          >
            <Ionicons name="arrow-back" size={20} color={theme.colors.textSecondary} />
          </AnimatedPressable>
          <Text style={styles.headerTitle}>COACH · V1</Text>
          <View style={{ width: 32 }} />
        </View>
        <NoKeyBanner />
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.safe} edges={['top']}>
      {/* Header */}
      <View style={styles.header}>
        <AnimatedPressable
          onPressIn={backPress.onPressIn}
          onPressOut={backPress.onPressOut}
          onPress={() => router.back()}
          hitSlop={12}
          style={[styles.backBtn, backPress.animatedStyle]}
        >
          <Ionicons name="arrow-back" size={20} color={theme.colors.textSecondary} />
        </AnimatedPressable>
        <Text style={styles.headerTitle}>COACH · V1</Text>
        <View style={{ width: 32 }} />
      </View>

      {/* Hero title */}
      <View style={styles.heroBlock}>
        <Text style={styles.heroTitle}>How's the week going?</Text>
      </View>

      {/* Context chips */}
      <ContextChips context={context} />

      <View style={styles.divider} />

      <KeyboardAvoidingView
        style={styles.flex}
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        keyboardVerticalOffset={0}
      >
        {/* Message list */}
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
                message={{ id: '__streaming__', role: 'assistant', content: streamingMessage, timestamp: new Date() }}
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
                <Text style={styles.emptyBody}>
                  Ask about your workouts, nutrition, recovery, or habit streaks. Your last 4 sessions and 7-day macro history are loaded.
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
            placeholder="Ask Coach 1..."
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
    paddingVertical: theme.spacing.md,
  },
  backBtn: {
    padding: theme.spacing.xs,
    width: 32,
  },
  headerTitle: {
    fontSize: 12,
    fontFamily: theme.fonts.mono.fontFamily,
    color: theme.colors.textTertiary,
    letterSpacing: 1.5,
  },
  heroBlock: {
    paddingHorizontal: theme.spacing.xxl,
    paddingTop: theme.spacing.sm,
    paddingBottom: theme.spacing.lg,
  },
  heroTitle: {
    fontSize: 28,
    fontFamily: theme.fonts.display.fontFamily,
    color: theme.colors.textPrimary,
    lineHeight: 36,
  },
  divider: {
    height: 1,
    backgroundColor: theme.colors.borderDefault,
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
  },
  emptyBody: {
    fontSize: 14,
    fontFamily: theme.fonts.body.fontFamily,
    color: theme.colors.textTertiary,
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
