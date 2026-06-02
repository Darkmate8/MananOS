import { useState, useRef } from 'react';
import {
  View,
  Text,
  TextInput,
  StyleSheet,
  Pressable,
  ScrollView,
  ActivityIndicator,
  Animated,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';
import { useApiKeys } from '@/hooks/useApiKeys';
import { theme } from '@/lib/theme';

type SaveState = 'idle' | 'saved' | 'error';

export default function SettingsModal() {
  const { openaiKey, setOpenaiKey, geminiKey, setGeminiKey, loaded, saving, save, clearAll } =
    useApiKeys();

  const [showOpenai, setShowOpenai] = useState(false);
  const [showGemini, setShowGemini] = useState(false);
  const [saveState, setSaveState] = useState<SaveState>('idle');

  const openaiScale = useRef(new Animated.Value(1)).current;
  const saveScale = useRef(new Animated.Value(1)).current;
  const clearScale = useRef(new Animated.Value(1)).current;

  function animatePress(anim: Animated.Value, cb: () => void) {
    Animated.sequence([
      Animated.timing(anim, { toValue: 0.97, duration: 100, useNativeDriver: true }),
      Animated.timing(anim, { toValue: 1, duration: 100, useNativeDriver: true }),
    ]).start(cb);
  }

  async function handleSave() {
    animatePress(saveScale, async () => {
      try {
        await save();
        setSaveState('saved');
        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
        setTimeout(() => setSaveState('idle'), 2000);
      } catch {
        setSaveState('error');
        setTimeout(() => setSaveState('idle'), 2000);
      }
    });
  }

  async function handleClear() {
    animatePress(clearScale, async () => {
      await clearAll();
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
      setSaveState('idle');
    });
  }

  if (!loaded) {
    return (
      <SafeAreaView style={styles.safe} edges={['top']}>
        <View style={styles.center}>
          <ActivityIndicator color={theme.colors.accentPrimary} />
        </View>
      </SafeAreaView>
    );
  }

  const saveLabel =
    saveState === 'saved' ? 'Saved' : saveState === 'error' ? 'Error' : saving ? '' : 'Save Keys';

  return (
    <SafeAreaView style={styles.safe} edges={['top']}>
      <ScrollView
        style={styles.scroll}
        contentContainerStyle={styles.content}
        keyboardShouldPersistTaps="handled"
      >
        <View style={styles.handle} />
        <Text style={styles.title}>Settings</Text>

        {/* API Keys Section */}
        <Text style={styles.sectionLabel}>AI Coach API Keys</Text>
        <Text style={styles.sectionCaption}>
          Keys are stored locally in device secure storage and never transmitted.
        </Text>

        {/* OpenAI */}
        <View style={styles.fieldGroup}>
          <Text style={styles.fieldLabel}>OpenAI API Key</Text>
          <Text style={styles.fieldCaption}>Used by Coach 1 (Chat) and Coach 2 (Parser)</Text>
          <View style={styles.inputRow}>
            <TextInput
              style={styles.input}
              value={openaiKey}
              onChangeText={setOpenaiKey}
              placeholder="sk-..."
              placeholderTextColor={theme.colors.textTertiary}
              secureTextEntry={!showOpenai}
              autoCapitalize="none"
              autoCorrect={false}
              returnKeyType="done"
            />
            <Pressable
              onPress={() => setShowOpenai((v) => !v)}
              style={styles.eyeButton}
              hitSlop={8}
            >
              <Ionicons
                name={showOpenai ? 'eye-off-outline' : 'eye-outline'}
                size={18}
                color={theme.colors.textTertiary}
              />
            </Pressable>
          </View>
        </View>

        {/* Gemini */}
        <View style={styles.fieldGroup}>
          <Text style={styles.fieldLabel}>Gemini API Key</Text>
          <Text style={styles.fieldCaption}>Fallback provider for AI pipelines</Text>
          <View style={styles.inputRow}>
            <TextInput
              style={styles.input}
              value={geminiKey}
              onChangeText={setGeminiKey}
              placeholder="AIza..."
              placeholderTextColor={theme.colors.textTertiary}
              secureTextEntry={!showGemini}
              autoCapitalize="none"
              autoCorrect={false}
              returnKeyType="done"
            />
            <Pressable
              onPress={() => setShowGemini((v) => !v)}
              style={styles.eyeButton}
              hitSlop={8}
            >
              <Ionicons
                name={showGemini ? 'eye-off-outline' : 'eye-outline'}
                size={18}
                color={theme.colors.textTertiary}
              />
            </Pressable>
          </View>
        </View>

        {/* Actions */}
        <View style={styles.actions}>
          <Animated.View style={[styles.saveButtonWrapper, { transform: [{ scale: saveScale }] }]}>
            <Pressable
              onPress={handleSave}
              disabled={saving}
              style={[
                styles.saveButton,
                saveState === 'saved' && styles.saveButtonSuccess,
                saveState === 'error' && styles.saveButtonError,
              ]}
            >
              {saving ? (
                <ActivityIndicator size="small" color={theme.colors.textPrimary} />
              ) : saveState === 'saved' ? (
                <Ionicons name="checkmark" size={16} color={theme.colors.textPrimary} />
              ) : null}
              {!saving && (
                <Text style={styles.saveButtonLabel}>{saveLabel}</Text>
              )}
            </Pressable>
          </Animated.View>

          <Animated.View style={{ transform: [{ scale: clearScale }] }}>
            <Pressable onPress={handleClear} style={styles.clearButton} disabled={saving}>
              <Ionicons name="trash-outline" size={15} color={theme.colors.error} />
              <Text style={styles.clearButtonLabel}>Clear All</Text>
            </Pressable>
          </Animated.View>
        </View>

        {/* Key status indicators */}
        <View style={styles.statusRow}>
          <StatusDot active={openaiKey.length > 10} label="OpenAI" />
          <StatusDot active={geminiKey.length > 10} label="Gemini" />
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

function StatusDot({ active, label }: { active: boolean; label: string }) {
  return (
    <View style={statusStyles.row}>
      <View style={[statusStyles.dot, active ? statusStyles.dotActive : statusStyles.dotInactive]} />
      <Text style={statusStyles.label}>
        {label}: {active ? 'Configured' : 'Not set'}
      </Text>
    </View>
  );
}

const statusStyles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: theme.spacing.xs,
  },
  dot: {
    width: 7,
    height: 7,
    borderRadius: theme.radius.pill,
  },
  dotActive: {
    backgroundColor: theme.colors.success,
  },
  dotInactive: {
    backgroundColor: theme.colors.textTertiary,
  },
  label: {
    fontSize: 12,
    fontFamily: theme.fonts.body.fontFamily,
    color: theme.colors.textSecondary,
  },
});

const styles = StyleSheet.create({
  safe: {
    flex: 1,
    backgroundColor: theme.colors.bgSurface2,
  },
  scroll: {
    flex: 1,
  },
  content: {
    padding: theme.spacing.xxl,
    paddingBottom: theme.spacing.massive,
  },
  center: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  handle: {
    width: 36,
    height: 4,
    borderRadius: 2,
    backgroundColor: theme.colors.borderStrong,
    alignSelf: 'center',
    marginBottom: theme.spacing.xxl,
  },
  title: {
    fontSize: 20,
    fontFamily: theme.fonts.display.fontFamily,
    color: theme.colors.textPrimary,
    marginBottom: theme.spacing.xxl,
  },
  sectionLabel: {
    fontSize: 16,
    fontFamily: theme.fonts.bodyBold.fontFamily,
    color: theme.colors.textPrimary,
    marginBottom: theme.spacing.xs,
  },
  sectionCaption: {
    fontSize: 12,
    fontFamily: theme.fonts.body.fontFamily,
    color: theme.colors.textTertiary,
    marginBottom: theme.spacing.xxl,
    lineHeight: 18,
  },
  fieldGroup: {
    marginBottom: theme.spacing.xl,
  },
  fieldLabel: {
    fontSize: 14,
    fontFamily: theme.fonts.bodyBold.fontFamily,
    color: theme.colors.textSecondary,
    marginBottom: theme.spacing.xs,
  },
  fieldCaption: {
    fontSize: 12,
    fontFamily: theme.fonts.body.fontFamily,
    color: theme.colors.textTertiary,
    marginBottom: theme.spacing.sm,
  },
  inputRow: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: theme.colors.bgSurface3,
    borderRadius: theme.radius.button,
    borderWidth: 1,
    borderColor: theme.colors.borderDefault,
    paddingHorizontal: theme.spacing.lg,
  },
  input: {
    flex: 1,
    height: 48,
    fontSize: 14,
    fontFamily: theme.fonts.mono.fontFamily,
    color: theme.colors.textPrimary,
    letterSpacing: 0.5,
  },
  eyeButton: {
    paddingLeft: theme.spacing.sm,
    paddingVertical: theme.spacing.sm,
  },
  actions: {
    flexDirection: 'row',
    gap: theme.spacing.md,
    marginTop: theme.spacing.xxl,
    marginBottom: theme.spacing.xl,
  },
  saveButtonWrapper: {
    flex: 1,
  },
  saveButton: {
    flexDirection: 'row',
    height: 48,
    backgroundColor: theme.colors.accentPrimary,
    borderRadius: theme.radius.button,
    alignItems: 'center',
    justifyContent: 'center',
    gap: theme.spacing.sm,
  },
  saveButtonSuccess: {
    backgroundColor: theme.colors.success,
  },
  saveButtonError: {
    backgroundColor: theme.colors.error,
  },
  saveButtonLabel: {
    fontSize: 16,
    fontFamily: theme.fonts.bodyBold.fontFamily,
    color: theme.colors.textPrimary,
  },
  clearButton: {
    flexDirection: 'row',
    height: 48,
    paddingHorizontal: theme.spacing.lg,
    borderRadius: theme.radius.button,
    borderWidth: 1,
    borderColor: theme.colors.error,
    alignItems: 'center',
    justifyContent: 'center',
    gap: theme.spacing.xs,
  },
  clearButtonLabel: {
    fontSize: 14,
    fontFamily: theme.fonts.body.fontFamily,
    color: theme.colors.error,
  },
  statusRow: {
    flexDirection: 'row',
    gap: theme.spacing.xl,
  },
});
