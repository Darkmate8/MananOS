import { useState, useEffect } from 'react';
import {
  View,
  Text,
  TextInput,
  StyleSheet,
  Pressable,
  Switch,
  ScrollView,
  ActivityIndicator,
} from 'react-native';
import Animated, { useSharedValue, useAnimatedStyle, withTiming } from 'react-native-reanimated';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';
import { useApiKeys } from '@/hooks/useApiKeys';
import { useNotifPrefs } from '@/hooks/useNotifPrefs';
import { useNotificationPermissions } from '@/hooks/useNotificationPermissions';
import { useProfile } from '@/hooks/useProfile';
import { useUpdateProfile } from '@/hooks/useUpdateProfile';
import { storage } from '@/lib/mmkv';
import { theme } from '@/lib/theme';

const AnimatedPressable = Animated.createAnimatedComponent(Pressable);

function usePressFeedback() {
  const scale = useSharedValue(1);
  const animatedStyle = useAnimatedStyle(() => ({ transform: [{ scale: scale.value }] }));
  const onPressIn = () => { scale.value = withTiming(0.97, { duration: theme.animation.press }); };
  const onPressOut = () => { scale.value = withTiming(1, { duration: theme.animation.press }); };
  return { animatedStyle, onPressIn, onPressOut };
}

type SaveState = 'idle' | 'saved' | 'error';

export default function SettingsModal() {
  const { openaiKey, setOpenaiKey, geminiKey, setGeminiKey, loaded, saving, save, clearAll } =
    useApiKeys();
  const { prefs, updatePrefs } = useNotifPrefs();
  const { granted, checked, request } = useNotificationPermissions();
  const { data: profile } = useProfile();
  const { mutate: saveGoals, isPending: savingGoals } = useUpdateProfile();

  const [showOpenai, setShowOpenai] = useState(false);
  const [showGemini, setShowGemini] = useState(false);
  const [saveState, setSaveState] = useState<SaveState>('idle');
  const [goalsSaveState, setGoalsSaveState] = useState<SaveState>('idle');

  const [kcalGoal, setKcalGoal] = useState('');
  const [proteinGoal, setProteinGoal] = useState('');
  const [stepsGoal, setStepsGoal] = useState('');
  const [waterGoal, setWaterGoal] = useState('');
  const [cupSizeMl, setCupSizeMl] = useState(
    () => String(storage.getNumber('water_cup_size_ml') ?? 240),
  );

  useEffect(() => {
    if (!profile) return;
    setKcalGoal(String(profile.kcal_goal));
    setProteinGoal(String(profile.protein_goal_g));
    setStepsGoal(String(profile.steps_goal));
    setWaterGoal(String(profile.water_goal_cups));
  }, [profile]);

  const openaiEyePress = usePressFeedback();
  const geminiEyePress = usePressFeedback();
  const savePress = usePressFeedback();
  const clearPress = usePressFeedback();
  const permissionPress = usePressFeedback();
  const saveGoalsPress = usePressFeedback();

  async function handleSave() {
    try {
      await save();
      setSaveState('saved');
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      setTimeout(() => setSaveState('idle'), 2000);
    } catch {
      setSaveState('error');
      setTimeout(() => setSaveState('idle'), 2000);
    }
  }

  async function handleClear() {
    await clearAll();
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    setSaveState('idle');
  }

  function handleSaveGoals() {
    const kcal = parseInt(kcalGoal, 10);
    const protein = parseInt(proteinGoal, 10);
    const steps = parseInt(stepsGoal, 10);
    const water = parseFloat(waterGoal);
    const cupSize = parseInt(cupSizeMl, 10);

    if (!kcal || !protein || !steps || !water || !cupSize) return;

    storage.set('water_cup_size_ml', cupSize);

    saveGoals(
      { kcal_goal: kcal, protein_goal_g: protein, steps_goal: steps, water_goal_cups: water },
      {
        onSuccess: () => {
          setGoalsSaveState('saved');
          Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
          setTimeout(() => setGoalsSaveState('idle'), 2000);
        },
        onError: () => {
          setGoalsSaveState('error');
          setTimeout(() => setGoalsSaveState('idle'), 2000);
        },
      },
    );
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
            <AnimatedPressable
              onPressIn={openaiEyePress.onPressIn}
              onPressOut={openaiEyePress.onPressOut}
              onPress={() => setShowOpenai((v) => !v)}
              style={[styles.eyeButton, openaiEyePress.animatedStyle]}
              hitSlop={8}
            >
              <Ionicons
                name={showOpenai ? 'eye-off-outline' : 'eye-outline'}
                size={18}
                color={theme.colors.textTertiary}
              />
            </AnimatedPressable>
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
            <AnimatedPressable
              onPressIn={geminiEyePress.onPressIn}
              onPressOut={geminiEyePress.onPressOut}
              onPress={() => setShowGemini((v) => !v)}
              style={[styles.eyeButton, geminiEyePress.animatedStyle]}
              hitSlop={8}
            >
              <Ionicons
                name={showGemini ? 'eye-off-outline' : 'eye-outline'}
                size={18}
                color={theme.colors.textTertiary}
              />
            </AnimatedPressable>
          </View>
        </View>

        {/* Notifications Section */}
        <Text style={[styles.sectionLabel, { marginTop: theme.spacing.xxl }]}>Notifications</Text>
        <Text style={styles.sectionCaption}>
          Reminders fire locally on-device. No internet required.
        </Text>

        {checked && !granted && (
          <AnimatedPressable
            style={[styles.permissionBanner, permissionPress.animatedStyle]}
            onPressIn={permissionPress.onPressIn}
            onPressOut={permissionPress.onPressOut}
            onPress={async () => {
              const result = await request();
              if (result.granted) {
                updatePrefs({ push_token: result.token });
              }
              Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
            }}
          >
            <Ionicons name="notifications-off-outline" size={16} color={theme.colors.warning} />
            <Text style={styles.permissionBannerText}>
              Tap to grant notification permission
            </Text>
          </AnimatedPressable>
        )}

        {/* Water Reminders */}
        <View style={styles.toggleRow}>
          <View style={styles.toggleLabel}>
            <Text style={styles.fieldLabel}>Water Reminders</Text>
            <Text style={styles.fieldCaption}>
              Every {prefs.water_interval_hours}h · {prefs.water_start_hour}:00–{prefs.water_end_hour}:00
            </Text>
          </View>
          <Switch
            value={prefs.water_enabled}
            disabled={!granted}
            onValueChange={(v) => {
              updatePrefs({ water_enabled: v });
              Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
            }}
            trackColor={{ false: theme.colors.borderStrong, true: theme.colors.ringWater }}
            thumbColor={theme.colors.textPrimary}
          />
        </View>

        {prefs.water_enabled && granted && (
          <View style={styles.configPanel}>
            <Text style={styles.configLabel}>Interval</Text>
            <View style={styles.chipRow}>
              {([1, 2, 3, 4] as const).map((h) => (
                <IntervalChip
                  key={h}
                  value={h}
                  active={prefs.water_interval_hours === h}
                  onPress={() => {
                    updatePrefs({ water_interval_hours: h });
                    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                  }}
                />
              ))}
            </View>

            <Text style={[styles.configLabel, { marginTop: theme.spacing.md }]}>Window</Text>
            <View style={styles.stepperGroup}>
              <StepperRow
                label="From"
                value={`${prefs.water_start_hour}:00`}
                onDecrement={() => {
                  const next = Math.max(0, prefs.water_start_hour - 1);
                  if (next < prefs.water_end_hour) updatePrefs({ water_start_hour: next });
                  Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                }}
                onIncrement={() => {
                  const next = prefs.water_start_hour + 1;
                  if (next < prefs.water_end_hour) updatePrefs({ water_start_hour: next });
                  Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                }}
              />
              <StepperRow
                label="Until"
                value={`${prefs.water_end_hour}:00`}
                onDecrement={() => {
                  const next = prefs.water_end_hour - 1;
                  if (next > prefs.water_start_hour) updatePrefs({ water_end_hour: next });
                  Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                }}
                onIncrement={() => {
                  const next = Math.min(23, prefs.water_end_hour + 1);
                  updatePrefs({ water_end_hour: next });
                  Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                }}
              />
            </View>
          </View>
        )}

        {/* Habit Reminder */}
        <View style={styles.toggleRow}>
          <View style={styles.toggleLabel}>
            <Text style={styles.fieldLabel}>Habit Reminder</Text>
            <Text style={styles.fieldCaption}>Daily at {prefs.habits_reminder_hour}:00</Text>
          </View>
          <Switch
            value={prefs.habits_enabled}
            disabled={!granted}
            onValueChange={(v) => {
              updatePrefs({ habits_enabled: v });
              Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
            }}
            trackColor={{ false: theme.colors.borderStrong, true: theme.colors.accentPrimary }}
            thumbColor={theme.colors.textPrimary}
          />
        </View>

        {/* Goals Section */}
        <Text style={[styles.sectionLabel, { marginTop: theme.spacing.xxl }]}>Goals</Text>
        <Text style={styles.sectionCaption}>
          Daily targets used for ring progress and nutrition deficit tracking.
        </Text>

        <GoalField
          label="Daily Kcal Target"
          value={kcalGoal}
          onChangeText={setKcalGoal}
          suffix="kcal"
        />
        <GoalField
          label="Daily Protein Target"
          value={proteinGoal}
          onChangeText={setProteinGoal}
          suffix="g"
        />
        <GoalField
          label="Daily Steps Goal"
          value={stepsGoal}
          onChangeText={setStepsGoal}
          suffix="steps"
        />
        <GoalField
          label="Daily Water Goal"
          value={waterGoal}
          onChangeText={setWaterGoal}
          suffix="cups"
        />
        <GoalField
          label="Water Cup Size"
          value={cupSizeMl}
          onChangeText={setCupSizeMl}
          suffix="ml"
          caption="Stored on device only — not synced."
        />

        <AnimatedPressable
          onPressIn={saveGoalsPress.onPressIn}
          onPressOut={saveGoalsPress.onPressOut}
          onPress={handleSaveGoals}
          disabled={savingGoals}
          style={[
            styles.saveButton,
            { marginBottom: theme.spacing.xxl },
            goalsSaveState === 'saved' && styles.saveButtonSuccess,
            goalsSaveState === 'error' && styles.saveButtonError,
            saveGoalsPress.animatedStyle,
          ]}
        >
          {savingGoals ? (
            <ActivityIndicator size="small" color={theme.colors.textPrimary} />
          ) : goalsSaveState === 'saved' ? (
            <Ionicons name="checkmark" size={16} color={theme.colors.textPrimary} />
          ) : null}
          {!savingGoals && (
            <Text style={styles.saveButtonLabel}>
              {goalsSaveState === 'saved' ? 'Saved' : goalsSaveState === 'error' ? 'Error' : 'Save Goals'}
            </Text>
          )}
        </AnimatedPressable>

        {/* Actions */}
        <View style={styles.actions}>
          <AnimatedPressable
            onPressIn={savePress.onPressIn}
            onPressOut={savePress.onPressOut}
            onPress={handleSave}
            disabled={saving}
            style={[
              styles.saveButtonWrapper,
              styles.saveButton,
              saveState === 'saved' && styles.saveButtonSuccess,
              saveState === 'error' && styles.saveButtonError,
              savePress.animatedStyle,
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
          </AnimatedPressable>

          <AnimatedPressable
            onPressIn={clearPress.onPressIn}
            onPressOut={clearPress.onPressOut}
            onPress={handleClear}
            disabled={saving}
            style={[styles.clearButton, clearPress.animatedStyle]}
          >
            <Ionicons name="trash-outline" size={15} color={theme.colors.error} />
            <Text style={styles.clearButtonLabel}>Clear All</Text>
          </AnimatedPressable>
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

function GoalField({
  label,
  value,
  onChangeText,
  suffix,
  caption,
}: {
  label: string;
  value: string;
  onChangeText: (v: string) => void;
  suffix: string;
  caption?: string;
}) {
  return (
    <View style={styles.fieldGroup}>
      <Text style={styles.fieldLabel}>{label}</Text>
      {caption && <Text style={styles.fieldCaption}>{caption}</Text>}
      <View style={styles.inputRow}>
        <TextInput
          style={styles.input}
          value={value}
          onChangeText={onChangeText}
          keyboardType="numeric"
          returnKeyType="done"
          placeholderTextColor={theme.colors.textTertiary}
          placeholder="0"
        />
        <Text style={styles.goalSuffix}>{suffix}</Text>
      </View>
    </View>
  );
}

function StepperBtn({ onPress, icon }: { onPress: () => void; icon: 'remove' | 'add' }) {
  const press = usePressFeedback();
  return (
    <AnimatedPressable
      onPressIn={press.onPressIn}
      onPressOut={press.onPressOut}
      onPress={onPress}
      style={[stepperStyles.btn, press.animatedStyle]}
      hitSlop={8}
    >
      <Ionicons name={icon} size={14} color={theme.colors.textSecondary} />
    </AnimatedPressable>
  );
}

function IntervalChip({ value, active, onPress }: { value: number; active: boolean; onPress: () => void }) {
  const press = usePressFeedback();
  return (
    <AnimatedPressable
      style={[styles.chip, active && styles.chipActive, press.animatedStyle]}
      onPressIn={press.onPressIn}
      onPressOut={press.onPressOut}
      onPress={onPress}
    >
      <Text style={[styles.chipLabel, active && styles.chipLabelActive]}>{value}h</Text>
    </AnimatedPressable>
  );
}

function StepperRow({
  label,
  value,
  onDecrement,
  onIncrement,
}: {
  label: string;
  value: string;
  onDecrement: () => void;
  onIncrement: () => void;
}) {
  return (
    <View style={stepperStyles.row}>
      <Text style={stepperStyles.label}>{label}</Text>
      <View style={stepperStyles.controls}>
        <StepperBtn onPress={onDecrement} icon="remove" />
        <Text style={stepperStyles.value}>{value}</Text>
        <StepperBtn onPress={onIncrement} icon="add" />
      </View>
    </View>
  );
}

const stepperStyles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: theme.spacing.sm,
  },
  label: {
    fontSize: 13,
    fontFamily: theme.fonts.body.fontFamily,
    color: theme.colors.textSecondary,
  },
  controls: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: theme.spacing.md,
  },
  btn: {
    width: 28,
    height: 28,
    borderRadius: theme.radius.button,
    backgroundColor: theme.colors.bgSurface3,
    borderWidth: 1,
    borderColor: theme.colors.borderStrong,
    alignItems: 'center',
    justifyContent: 'center',
  },
  value: {
    fontSize: 14,
    fontFamily: theme.fonts.mono.fontFamily,
    color: theme.colors.textPrimary,
    minWidth: 44,
    textAlign: 'center',
  },
});

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
  goalSuffix: {
    fontSize: 13,
    fontFamily: theme.fonts.body.fontFamily,
    color: theme.colors.textTertiary,
    paddingRight: theme.spacing.md,
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
  configPanel: {
    backgroundColor: theme.colors.bgSurface3,
    borderRadius: theme.radius.card,
    padding: theme.spacing.lg,
    marginBottom: theme.spacing.md,
    borderWidth: 1,
    borderColor: theme.colors.borderDefault,
  },
  configLabel: {
    fontSize: 11,
    fontFamily: theme.fonts.bodyBold.fontFamily,
    color: theme.colors.textTertiary,
    textTransform: 'uppercase',
    letterSpacing: 0.8,
    marginBottom: theme.spacing.sm,
  },
  chipRow: {
    flexDirection: 'row',
    gap: theme.spacing.sm,
  },
  chip: {
    paddingHorizontal: theme.spacing.md,
    paddingVertical: theme.spacing.xs,
    borderRadius: theme.radius.pill,
    borderWidth: 1,
    borderColor: theme.colors.borderStrong,
    backgroundColor: theme.colors.bgSurface2,
  },
  chipActive: {
    borderColor: theme.colors.ringWater,
    backgroundColor: theme.colors.ringWaterMuted,
  },
  chipLabel: {
    fontSize: 13,
    fontFamily: theme.fonts.monoSmall.fontFamily,
    color: theme.colors.textSecondary,
  },
  chipLabelActive: {
    color: theme.colors.ringWater,
  },
  stepperGroup: {
    gap: 0,
  },
  permissionBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: theme.spacing.sm,
    backgroundColor: theme.colors.bgSurface3,
    borderRadius: theme.radius.button,
    borderWidth: 1,
    borderColor: theme.colors.warning,
    padding: theme.spacing.md,
    marginBottom: theme.spacing.lg,
  },
  permissionBannerText: {
    fontSize: 13,
    fontFamily: theme.fonts.body.fontFamily,
    color: theme.colors.warning,
    flex: 1,
  },
  toggleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: theme.spacing.md,
    borderBottomWidth: 1,
    borderBottomColor: theme.colors.borderDefault,
  },
  toggleLabel: {
    flex: 1,
    gap: 2,
  },
});
