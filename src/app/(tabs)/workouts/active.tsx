import { useEffect, useState, useRef, useCallback } from 'react';
import {
  View,
  Text,
  ScrollView,
  TextInput,
  Pressable,
  StyleSheet,
  Alert,
  KeyboardAvoidingView,
  Platform,
  type StyleProp,
  type ViewStyle,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { router } from 'expo-router';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withTiming,
} from 'react-native-reanimated';
import * as Haptics from 'expo-haptics';

import { theme } from '@/lib/theme';
import { useSessionStore, type ActiveSet, type ActiveExercise } from '@/store/sessionStore';

const AnimatedPressable = Animated.createAnimatedComponent(Pressable);

function formatElapsed(secs: number): string {
  const h = Math.floor(secs / 3600);
  const m = Math.floor((secs % 3600) / 60).toString().padStart(2, '0');
  const s = (secs % 60).toString().padStart(2, '0');
  return h > 0 ? `${h}:${m}:${s}` : `${m}:${s}`;
}

function computeVolume(weightKg: number | null, reps: number | null): string {
  const w = weightKg ?? 0;
  const r = reps ?? 0;
  const vol = w * r;
  return vol > 0 ? `${vol.toLocaleString()} kg` : '—';
}

function PressableButton({
  onPress,
  style,
  children,
}: {
  onPress: () => void;
  style?: StyleProp<ViewStyle>;
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

function SetRow({
  set,
  exerciseId,
}: {
  set: ActiveSet;
  exerciseId: string;
}) {
  const updateSet = useSessionStore((s) => s.updateSet);
  const removeSet = useSessionStore((s) => s.removeSet);

  const [weightStr, setWeightStr] = useState(set.weightKg?.toString() ?? '');
  const [repsStr, setRepsStr] = useState(set.reps?.toString() ?? '');

  const commitWeight = useCallback(() => {
    const val = parseFloat(weightStr);
    updateSet(exerciseId, set.id, { weightKg: isNaN(val) ? null : val });
  }, [weightStr, exerciseId, set.id, updateSet]);

  const commitReps = useCallback(() => {
    const val = parseInt(repsStr, 10);
    updateSet(exerciseId, set.id, { reps: isNaN(val) ? null : val });
  }, [repsStr, exerciseId, set.id, updateSet]);

  const weightKg = parseFloat(weightStr) || null;
  const reps = parseInt(repsStr, 10) || null;

  return (
    <View style={styles.setRow}>
      <View style={styles.setIndexBadge}>
        <Text style={styles.setIndex}>{set.isWarmup ? 'W' : set.setIndex}</Text>
      </View>

      <View style={styles.setField}>
        <TextInput
          style={styles.setInput}
          value={weightStr}
          onChangeText={setWeightStr}
          onBlur={commitWeight}
          placeholder="—"
          placeholderTextColor={theme.colors.textTertiary}
          keyboardType="decimal-pad"
          returnKeyType="done"
          selectTextOnFocus
        />
        <Text style={styles.setUnit}>kg</Text>
      </View>

      <View style={styles.setField}>
        <TextInput
          style={styles.setInput}
          value={repsStr}
          onChangeText={setRepsStr}
          onBlur={commitReps}
          placeholder="—"
          placeholderTextColor={theme.colors.textTertiary}
          keyboardType="number-pad"
          returnKeyType="done"
          selectTextOnFocus
        />
        <Text style={styles.setUnit}>reps</Text>
      </View>

      <Text style={styles.setVolume}>{computeVolume(weightKg, reps)}</Text>

      <Pressable
        hitSlop={8}
        onPress={() => {
          Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
          removeSet(exerciseId, set.id);
        }}
      >
        <Text style={styles.removeSetBtn}>✕</Text>
      </Pressable>
    </View>
  );
}

function ExerciseCard({ exercise }: { exercise: ActiveExercise }) {
  const addSet = useSessionStore((s) => s.addSet);
  const removeExercise = useSessionStore((s) => s.removeExercise);

  const totalVolume = exercise.sets.reduce(
    (sum, s) => sum + (s.weightKg ?? 0) * (s.reps ?? 0),
    0,
  );

  return (
    <View style={styles.exerciseCard}>
      <View style={styles.exerciseHeader}>
        <Text style={styles.exerciseName}>{exercise.exerciseName}</Text>
        <Pressable
          hitSlop={8}
          onPress={() => {
            Alert.alert('Remove Exercise', `Remove ${exercise.exerciseName}?`, [
              { text: 'Cancel', style: 'cancel' },
              {
                text: 'Remove',
                style: 'destructive',
                onPress: () => removeExercise(exercise.exerciseId),
              },
            ]);
          }}
        >
          <Text style={styles.removeExerciseBtn}>Remove</Text>
        </Pressable>
      </View>

      <View style={styles.setHeader}>
        <Text style={[styles.setHeaderLabel, { width: 32 }]}>SET</Text>
        <Text style={[styles.setHeaderLabel, { flex: 1 }]}>WEIGHT</Text>
        <Text style={[styles.setHeaderLabel, { flex: 1 }]}>REPS</Text>
        <Text style={[styles.setHeaderLabel, { flex: 1 }]}>VOL</Text>
        <View style={{ width: 24 }} />
      </View>

      {exercise.sets.map((set) => (
        <SetRow key={set.id} set={set} exerciseId={exercise.exerciseId} />
      ))}

      {exercise.sets.length > 0 && totalVolume > 0 && (
        <Text style={styles.totalVolume}>
          Total: {Math.round(totalVolume).toLocaleString()} kg
        </Text>
      )}

      <PressableButton
        style={styles.addSetBtn}
        onPress={() => {
          Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
          const lastSet = exercise.sets[exercise.sets.length - 1];
          addSet(exercise.exerciseId, lastSet
            ? { weightKg: lastSet.weightKg, reps: lastSet.reps }
            : undefined,
          );
        }}
      >
        <Text style={styles.addSetBtnText}>+ Add Set</Text>
      </PressableButton>
    </View>
  );
}

export default function ActiveWorkoutScreen() {
  const sessionId = useSessionStore((s) => s.sessionId);
  const startedAt = useSessionStore((s) => s.startedAt);
  const exercises = useSessionStore((s) => s.exercises);
  const discardSession = useSessionStore((s) => s.discardSession);

  const [elapsed, setElapsed] = useState(0);
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

  // Guard: redirect if no active session
  useEffect(() => {
    if (!sessionId) {
      router.replace('/(tabs)/workouts');
    }
  }, [sessionId]);

  useEffect(() => {
    if (!startedAt) return;
    const origin = new Date(startedAt).getTime();
    setElapsed(Math.floor((Date.now() - origin) / 1000));
    intervalRef.current = setInterval(() => {
      setElapsed(Math.floor((Date.now() - origin) / 1000));
    }, 1000);
    return () => {
      if (intervalRef.current) clearInterval(intervalRef.current);
    };
  }, [startedAt]);

  const handleDiscard = useCallback(() => {
    Alert.alert('Discard Workout', 'All logged sets will be lost.', [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Discard',
        style: 'destructive',
        onPress: () => {
          discardSession();
          router.replace('/(tabs)/workouts');
        },
      },
    ]);
  }, [discardSession]);

  const handleFinish = useCallback(() => {
    router.push('/(tabs)/workouts/summary' as never);
  }, []);

  if (!sessionId) return null;

  return (
    <SafeAreaView style={styles.safe} edges={['top']}>
      <KeyboardAvoidingView
        style={{ flex: 1 }}
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        keyboardVerticalOffset={0}
      >
        {/* ── Session Header ── */}
        <View style={styles.header}>
          <Pressable hitSlop={8} onPress={handleDiscard}>
            <Text style={styles.headerDiscard}>Discard</Text>
          </Pressable>

          <View style={styles.headerCenter}>
            <Text style={styles.elapsedTimer}>{formatElapsed(elapsed)}</Text>
            <Text style={styles.headerMeta}>ACTIVE SESSION</Text>
          </View>

          <PressableButton style={styles.finishBtn} onPress={handleFinish}>
            <Text style={styles.finishBtnText}>Finish</Text>
          </PressableButton>
        </View>

        {/* ── Exercise List ── */}
        <ScrollView
          contentContainerStyle={styles.scroll}
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}
        >
          {exercises.length === 0 ? (
            <View style={styles.emptyState}>
              <Text style={styles.emptyText}>No exercises yet</Text>
              <Text style={styles.emptySubtext}>Tap "Add Exercise" to begin logging</Text>
            </View>
          ) : (
            exercises.map((exercise) => (
              <ExerciseCard key={exercise.exerciseId} exercise={exercise} />
            ))
          )}

          <PressableButton
            style={styles.addExerciseBtn}
            onPress={() => router.push('/(modals)/exercise-search')}
          >
            <Text style={styles.addExerciseBtnText}>+ Add Exercise</Text>
          </PressableButton>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: {
    flex: 1,
    backgroundColor: theme.colors.bgCanvas,
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
  headerDiscard: {
    fontSize: 14,
    fontFamily: theme.fonts.body.fontFamily,
    color: theme.colors.error,
  },
  headerCenter: {
    alignItems: 'center',
    gap: theme.spacing.xs,
  },
  elapsedTimer: {
    ...theme.typography.monoDataLarge,
    color: theme.colors.textPrimary,
  },
  headerMeta: {
    fontSize: 10,
    fontFamily: theme.fonts.body.fontFamily,
    color: theme.colors.textTertiary,
    letterSpacing: 1.2,
    textTransform: 'uppercase',
  },
  finishBtn: {
    backgroundColor: theme.colors.accentPrimary,
    borderRadius: theme.radius.button,
    paddingHorizontal: theme.spacing.lg,
    paddingVertical: theme.spacing.sm,
  },
  finishBtnText: {
    fontSize: 14,
    fontFamily: theme.fonts.bodyBold.fontFamily,
    color: theme.colors.textPrimary,
    fontWeight: '500',
  },
  scroll: {
    padding: theme.spacing.xxl,
    gap: theme.spacing.xxl,
    paddingBottom: theme.spacing.massive,
  },
  emptyState: {
    alignItems: 'center',
    paddingVertical: theme.spacing.massive,
    gap: theme.spacing.md,
  },
  emptyText: {
    ...theme.typography.bodyCore,
    color: theme.colors.textSecondary,
  },
  emptySubtext: {
    ...theme.typography.captionMuted,
    color: theme.colors.textTertiary,
  },
  exerciseCard: {
    backgroundColor: theme.colors.bgSurface1,
    borderRadius: theme.radius.card,
    borderWidth: 1,
    borderColor: theme.colors.borderDefault,
    padding: theme.spacing.lg,
    gap: theme.spacing.md,
  },
  exerciseHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  exerciseName: {
    ...theme.typography.bodyBold,
    color: theme.colors.textPrimary,
    flex: 1,
  },
  removeExerciseBtn: {
    ...theme.typography.captionMuted,
    color: theme.colors.textTertiary,
  },
  setHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: theme.spacing.sm,
  },
  setHeaderLabel: {
    fontSize: 10,
    fontFamily: theme.fonts.body.fontFamily,
    color: theme.colors.textTertiary,
    letterSpacing: 0.8,
    textTransform: 'uppercase',
  },
  setRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: theme.spacing.sm,
    paddingVertical: theme.spacing.xs,
  },
  setIndexBadge: {
    width: 32,
    height: 28,
    borderRadius: theme.radius.button,
    backgroundColor: theme.colors.bgCanvas,
    alignItems: 'center',
    justifyContent: 'center',
  },
  setIndex: {
    fontSize: 13,
    fontFamily: theme.fonts.mono.fontFamily,
    color: theme.colors.textSecondary,
    fontWeight: '500',
  },
  setField: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: theme.colors.bgCanvas,
    borderRadius: theme.radius.button,
    borderWidth: 1,
    borderColor: theme.colors.borderDefault,
    paddingHorizontal: theme.spacing.sm,
    gap: theme.spacing.xs,
  },
  setInput: {
    flex: 1,
    fontSize: 15,
    fontFamily: theme.fonts.monoSmall.fontFamily,
    color: theme.colors.textPrimary,
    paddingVertical: theme.spacing.sm,
    textAlign: 'center',
  },
  setUnit: {
    fontSize: 11,
    fontFamily: theme.fonts.body.fontFamily,
    color: theme.colors.textTertiary,
  },
  setVolume: {
    flex: 1,
    fontSize: 13,
    fontFamily: theme.fonts.monoSmall.fontFamily,
    color: theme.colors.accentPrimary,
    textAlign: 'center',
  },
  removeSetBtn: {
    width: 24,
    fontSize: 12,
    fontFamily: theme.fonts.body.fontFamily,
    color: theme.colors.textTertiary,
    textAlign: 'center',
  },
  totalVolume: {
    fontSize: 12,
    fontFamily: theme.fonts.monoSmall.fontFamily,
    color: theme.colors.textSecondary,
    textAlign: 'right',
  },
  addSetBtn: {
    alignItems: 'center',
    paddingVertical: theme.spacing.sm,
    borderRadius: theme.radius.button,
    borderWidth: 1,
    borderColor: theme.colors.borderDefault,
    borderStyle: 'dashed',
  },
  addSetBtnText: {
    fontSize: 14,
    fontFamily: theme.fonts.body.fontFamily,
    color: theme.colors.accentPrimary,
  },
  addExerciseBtn: {
    backgroundColor: theme.colors.accentPrimary,
    borderRadius: theme.radius.button,
    paddingVertical: theme.spacing.lg,
    alignItems: 'center',
  },
  addExerciseBtnText: {
    ...theme.typography.bodyBold,
    color: theme.colors.textPrimary,
  },
});
