import { useState } from 'react';
import {
  View,
  Text,
  TextInput,
  Pressable,
  ScrollView,
  StyleSheet,
  KeyboardAvoidingView,
  Platform,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { router } from 'expo-router';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withTiming,
} from 'react-native-reanimated';
import * as Haptics from 'expo-haptics';
import { generateId } from '@/lib/generateId';
import { Feather } from '@expo/vector-icons';

import { theme } from '@/lib/theme';
import { useCreateHabit } from '@/hooks/useCreateHabit';

const AnimatedPressable = Animated.createAnimatedComponent(Pressable);

function ColorSwatch({ color, selected, onPress }: { color: string; selected: boolean; onPress: () => void }) {
  const scale = useSharedValue(1);
  const animStyle = useAnimatedStyle(() => ({ transform: [{ scale: scale.value }] }));
  return (
    <AnimatedPressable
      onPressIn={() => { scale.value = withTiming(0.97, { duration: theme.animation.press }); }}
      onPressOut={() => { scale.value = withTiming(1, { duration: theme.animation.press }); }}
      onPress={onPress}
      style={[styles.colorSwatch, { backgroundColor: color }, selected && styles.colorSwatchSelected, animStyle]}
    />
  );
}

function CounterButton({ onPress, icon }: { onPress: () => void; icon: 'minus' | 'plus' }) {
  const scale = useSharedValue(1);
  const animStyle = useAnimatedStyle(() => ({ transform: [{ scale: scale.value }] }));
  return (
    <AnimatedPressable
      onPressIn={() => { scale.value = withTiming(0.97, { duration: theme.animation.press }); }}
      onPressOut={() => { scale.value = withTiming(1, { duration: theme.animation.press }); }}
      onPress={onPress}
      style={[styles.counterBtn, animStyle]}
      hitSlop={8}
    >
      <Feather name={icon} size={18} color={theme.colors.textPrimary} />
    </AnimatedPressable>
  );
}

const HABIT_COLORS = [
  theme.colors.accentPrimary,
  theme.colors.ringWater,
  theme.colors.success,
  theme.colors.warning,
  theme.colors.error,
  theme.colors.ringCalories,
];

function PressableButton({
  onPress,
  style,
  children,
}: {
  onPress: () => void;
  style?: object;
  children: React.ReactNode;
}) {
  const scale = useSharedValue(1);
  const animStyle = useAnimatedStyle(() => ({ transform: [{ scale: scale.value }] }));

  return (
    <AnimatedPressable
      style={[animStyle, style]}
      onPressIn={() => { scale.value = withTiming(0.97, { duration: theme.animation.press }); }}
      onPressOut={() => { scale.value = withTiming(1, { duration: theme.animation.press }); }}
      onPress={onPress}
    >
      {children}
    </AnimatedPressable>
  );
}

export default function CreateHabitModal() {
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [selectedColor, setSelectedColor] = useState(HABIT_COLORS[0]);
  const [isCountBased, setIsCountBased] = useState(false);
  const [targetCount, setTargetCount] = useState(3);

  const { mutate, isPending, error } = useCreateHabit();

  function handleSave() {
    if (!name.trim()) return;

    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);

    mutate(
      {
        id: generateId(),
        name: name.trim(),
        description: description.trim() || undefined,
        color: selectedColor,
        target_per_day: isCountBased ? targetCount : 1,
      },
      { onSuccess: () => router.back() },
    );
  }

  function adjustTarget(delta: number) {
    setTargetCount((prev) => Math.max(2, Math.min(99, prev + delta)));
  }

  return (
    <SafeAreaView style={styles.safe} edges={['top']}>
      <KeyboardAvoidingView
        style={styles.flex}
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      >
        <ScrollView
          style={styles.flex}
          contentContainerStyle={styles.scroll}
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}
        >
          {/* Handle */}
          <View style={styles.handle} />

          {/* Header */}
          <View style={styles.headerRow}>
            <Text style={styles.title}>New Habit</Text>
            <PressableButton onPress={() => router.back()} style={styles.closeBtn}>
              <Feather name="x" size={20} color={theme.colors.textSecondary} />
            </PressableButton>
          </View>

          {/* Name */}
          <Text style={styles.label}>Name</Text>
          <View style={styles.inputWrap}>
            <TextInput
              style={styles.input}
              placeholder="e.g. Morning walk"
              placeholderTextColor={theme.colors.textTertiary}
              value={name}
              onChangeText={setName}
              autoCapitalize="sentences"
              returnKeyType="next"
              maxLength={40}
            />
          </View>

          {/* Description */}
          <Text style={styles.label}>Description <Text style={styles.optional}>(optional)</Text></Text>
          <View style={[styles.inputWrap, styles.inputMultiline]}>
            <TextInput
              style={[styles.input, styles.inputMultilineText]}
              placeholder="What does this habit involve?"
              placeholderTextColor={theme.colors.textTertiary}
              value={description}
              onChangeText={setDescription}
              autoCapitalize="sentences"
              multiline
              numberOfLines={3}
              maxLength={120}
            />
          </View>

          {/* Color */}
          <Text style={styles.label}>Color</Text>
          <View style={styles.colorRow}>
            {HABIT_COLORS.map((color) => (
              <ColorSwatch
                key={color}
                color={color}
                selected={selectedColor === color}
                onPress={() => {
                  setSelectedColor(color);
                  Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                }}
              />
            ))}
          </View>

          {/* Type */}
          <Text style={styles.label}>Type</Text>
          <View style={styles.typeRow}>
            <PressableButton
              onPress={() => {
                setIsCountBased(false);
                Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
              }}
              style={[styles.typeBtn, !isCountBased && styles.typeBtnActive]}
            >
              <Text style={[styles.typeBtnText, !isCountBased && styles.typeBtnTextActive]}>
                Binary
              </Text>
            </PressableButton>
            <PressableButton
              onPress={() => {
                setIsCountBased(true);
                Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
              }}
              style={[styles.typeBtn, isCountBased && styles.typeBtnActive]}
            >
              <Text style={[styles.typeBtnText, isCountBased && styles.typeBtnTextActive]}>
                Count-Based
              </Text>
            </PressableButton>
          </View>

          {/* Target count (count-based only) */}
          {isCountBased && (
            <>
              <Text style={styles.label}>Daily Target</Text>
              <View style={styles.counterRow}>
                <CounterButton onPress={() => adjustTarget(-1)} icon="minus" />
                <Text style={styles.counterValue}>{targetCount}</Text>
                <CounterButton onPress={() => adjustTarget(1)} icon="plus" />
              </View>
            </>
          )}

          {/* Error */}
          {error && (
            <View style={styles.errorBox}>
              <Text style={styles.errorText}>{error.message}</Text>
            </View>
          )}

          {/* Save button */}
          <PressableButton
            onPress={handleSave}
            style={[styles.saveBtn, (!name.trim() || isPending) && styles.saveBtnDisabled]}
          >
            <Text style={styles.saveBtnText}>{isPending ? 'Saving…' : 'Create Habit'}</Text>
          </PressableButton>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: {
    flex: 1,
    backgroundColor: theme.colors.bgSurface2,
  },
  flex: {
    flex: 1,
  },
  scroll: {
    paddingHorizontal: theme.spacing.xxl,
    paddingBottom: theme.spacing.massive,
  },
  handle: {
    width: 36,
    height: 4,
    borderRadius: 2,
    backgroundColor: theme.colors.borderStrong,
    alignSelf: 'center',
    marginTop: theme.spacing.md,
    marginBottom: theme.spacing.xxl,
  },
  headerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: theme.spacing.xxxl,
  },
  title: {
    ...theme.typography.sectionTitle,
    color: theme.colors.textPrimary,
  },
  closeBtn: {
    padding: theme.spacing.xs,
  },
  label: {
    ...theme.typography.captionMuted,
    color: theme.colors.textSecondary,
    letterSpacing: 0.6,
    textTransform: 'uppercase',
    marginBottom: theme.spacing.sm,
  },
  optional: {
    ...theme.typography.captionMuted,
    color: theme.colors.textTertiary,
    textTransform: 'none',
    letterSpacing: 0,
  },
  inputWrap: {
    backgroundColor: theme.colors.bgSurface3,
    borderRadius: theme.radius.button,
    borderWidth: 1,
    borderColor: theme.colors.borderDefault,
    marginBottom: theme.spacing.xl,
  },
  inputMultiline: {
    minHeight: 80,
  },
  input: {
    ...theme.typography.bodyCore,
    color: theme.colors.textPrimary,
    paddingHorizontal: theme.spacing.lg,
    paddingVertical: theme.spacing.md,
  },
  inputMultilineText: {
    textAlignVertical: 'top',
  },
  colorRow: {
    flexDirection: 'row',
    gap: theme.spacing.md,
    marginBottom: theme.spacing.xl,
  },
  colorSwatch: {
    width: 36,
    height: 36,
    borderRadius: 18,
  },
  colorSwatchSelected: {
    borderWidth: 3,
    borderColor: theme.colors.textPrimary,
  },
  typeRow: {
    flexDirection: 'row',
    gap: theme.spacing.md,
    marginBottom: theme.spacing.xl,
  },
  typeBtn: {
    flex: 1,
    paddingVertical: theme.spacing.md,
    borderRadius: theme.radius.button,
    borderWidth: 1,
    borderColor: theme.colors.borderDefault,
    backgroundColor: theme.colors.bgSurface3,
    alignItems: 'center',
  },
  typeBtnActive: {
    backgroundColor: theme.colors.accentPrimary,
    borderColor: theme.colors.accentPrimary,
  },
  typeBtnText: {
    ...theme.typography.bodyBold,
    color: theme.colors.textSecondary,
  },
  typeBtnTextActive: {
    color: theme.colors.textPrimary,
  },
  counterRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: theme.spacing.xl,
    marginBottom: theme.spacing.xl,
    backgroundColor: theme.colors.bgSurface3,
    borderRadius: theme.radius.button,
    borderWidth: 1,
    borderColor: theme.colors.borderDefault,
    paddingHorizontal: theme.spacing.xxl,
    paddingVertical: theme.spacing.md,
    alignSelf: 'flex-start',
  },
  counterBtn: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: theme.colors.bgSurface2,
    borderWidth: 1,
    borderColor: theme.colors.borderStrong,
    alignItems: 'center',
    justifyContent: 'center',
  },
  counterValue: {
    ...theme.typography.monoDataLarge,
    color: theme.colors.textPrimary,
    minWidth: 32,
    textAlign: 'center',
  },
  errorBox: {
    backgroundColor: theme.colors.bgSurface3,
    borderRadius: theme.radius.button,
    borderWidth: 1,
    borderColor: theme.colors.error,
    padding: theme.spacing.md,
    marginTop: theme.spacing.md,
  },
  errorText: {
    ...theme.typography.captionMuted,
    color: theme.colors.error,
  },
  saveBtn: {
    backgroundColor: theme.colors.accentPrimary,
    borderRadius: theme.radius.button,
    paddingVertical: theme.spacing.lg,
    alignItems: 'center',
    marginTop: theme.spacing.lg,
  },
  saveBtnDisabled: {
    opacity: 0.45,
  },
  saveBtnText: {
    ...theme.typography.bodyBold,
    color: theme.colors.textPrimary,
  },
});
