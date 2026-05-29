import { useCallback } from 'react';
import { View, Text, ScrollView, Pressable, StyleSheet } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { router } from 'expo-router';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withTiming,
} from 'react-native-reanimated';
import * as Haptics from 'expo-haptics';

import { theme } from '@/lib/theme';
import { useSessionStore } from '@/store/sessionStore';
import { useFinishWorkout } from '@/hooks/useFinishWorkout';

const AnimatedPressable = Animated.createAnimatedComponent(Pressable);

function formatDuration(startedAt: string): string {
  const elapsed = Math.floor((Date.now() - new Date(startedAt).getTime()) / 1000);
  const h = Math.floor(elapsed / 3600);
  const m = Math.floor((elapsed % 3600) / 60).toString().padStart(2, '0');
  const s = (elapsed % 60).toString().padStart(2, '0');
  return h > 0 ? `${h}:${m}:${s}` : `${m}:${s}`;
}

export default function WorkoutSummaryScreen() {
  const sessionId = useSessionStore((s) => s.sessionId);
  const startedAt = useSessionStore((s) => s.startedAt);
  const exercises = useSessionStore((s) => s.exercises);
  const discardSession = useSessionStore((s) => s.discardSession);
  const { mutate } = useFinishWorkout();

  const scale = useSharedValue(1);
  const animStyle = useAnimatedStyle(() => ({ transform: [{ scale: scale.value }] }));

  const completedSets = exercises.flatMap((e) => e.sets.filter((s) => s.isCompleted));
  const totalVolume = completedSets.reduce(
    (sum, ws) => sum + (ws.weightKg ?? 0) * (ws.reps ?? 0),
    0,
  );

  const handleDone = useCallback(() => {
    if (!sessionId || !startedAt) return;

    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);

    // Snapshot before clearing store
    const payload = { sessionId, startedAt, exercises };

    // Dispatch mutation, then flush store per state lifecycle rules
    mutate(payload);
    discardSession();
    router.replace('/(tabs)/workouts');
  }, [sessionId, startedAt, exercises, mutate, discardSession]);

  // Guard: no active session → redirect
  if (!sessionId || !startedAt) {
    router.replace('/(tabs)/workouts');
    return null;
  }

  return (
    <SafeAreaView style={styles.safe} edges={['top', 'bottom']}>
      {/* ── Header ── */}
      <View style={styles.header}>
        <Text style={styles.headerTitle}>Workout Complete</Text>
        <Text style={styles.headerSub}>Great work. Here's your summary.</Text>
      </View>

      <ScrollView
        contentContainerStyle={styles.scroll}
        showsVerticalScrollIndicator={false}
      >
        {/* ── Stats Row ── */}
        <View style={styles.statsRow}>
          <View style={styles.statCell}>
            <Text style={styles.statValue}>{formatDuration(startedAt)}</Text>
            <Text style={styles.statLabel}>DURATION</Text>
          </View>
          <View style={styles.statDivider} />
          <View style={styles.statCell}>
            <Text style={styles.statValue}>{completedSets.length}</Text>
            <Text style={styles.statLabel}>SETS</Text>
          </View>
          <View style={styles.statDivider} />
          <View style={styles.statCell}>
            <Text style={styles.statValue}>
              {totalVolume > 0 ? Math.round(totalVolume).toLocaleString() : '—'}
            </Text>
            <Text style={styles.statLabel}>VOL (KG)</Text>
          </View>
        </View>

        {/* ── Exercise Breakdown ── */}
        {exercises.length > 0 && (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Exercises</Text>
            {exercises.map((ex) => {
              const doneSets = ex.sets.filter((s) => s.isCompleted);
              const exVol = doneSets.reduce(
                (sum, ws) => sum + (ws.weightKg ?? 0) * (ws.reps ?? 0),
                0,
              );
              return (
                <View key={ex.exerciseId} style={styles.exerciseRow}>
                  <View style={styles.exerciseRowTop}>
                    <Text style={styles.exerciseName}>{ex.exerciseName}</Text>
                    <Text style={styles.exerciseMeta}>
                      {doneSets.length} set{doneSets.length !== 1 ? 's' : ''}
                      {exVol > 0 ? ` · ${Math.round(exVol).toLocaleString()} kg` : ''}
                    </Text>
                  </View>
                  {doneSets.length > 0 && (
                    <View style={styles.setBadgesRow}>
                      {doneSets.map((ws) => (
                        <View key={ws.id} style={styles.setBadge}>
                          <Text style={styles.setBadgeText}>
                            {ws.weightKg != null ? `${ws.weightKg}` : '—'}
                            {ws.reps != null ? ` × ${ws.reps}` : ''}
                          </Text>
                        </View>
                      ))}
                    </View>
                  )}
                </View>
              );
            })}
          </View>
        )}
      </ScrollView>

      {/* ── Done CTA ── */}
      <View style={styles.footer}>
        <AnimatedPressable
          style={[styles.doneBtn, animStyle]}
          onPressIn={() => {
            scale.value = withTiming(0.97, { duration: theme.animation.press });
          }}
          onPressOut={() => {
            scale.value = withTiming(1, { duration: theme.animation.press });
          }}
          onPress={handleDone}
        >
          <Text style={styles.doneBtnText}>Save & Done</Text>
        </AnimatedPressable>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: {
    flex: 1,
    backgroundColor: theme.colors.bgCanvas,
  },
  header: {
    paddingHorizontal: theme.spacing.xxl,
    paddingTop: theme.spacing.xxl,
    paddingBottom: theme.spacing.lg,
    gap: theme.spacing.xs,
    borderBottomWidth: 1,
    borderBottomColor: theme.colors.borderDefault,
  },
  headerTitle: {
    ...theme.typography.displayHeadline,
    color: theme.colors.textPrimary,
  },
  headerSub: {
    ...theme.typography.captionMuted,
    color: theme.colors.textSecondary,
  },
  scroll: {
    padding: theme.spacing.xxl,
    gap: theme.spacing.xxl,
    paddingBottom: theme.spacing.massive,
  },
  statsRow: {
    flexDirection: 'row',
    backgroundColor: theme.colors.bgSurface1,
    borderRadius: theme.radius.card,
    borderWidth: 1,
    borderColor: theme.colors.borderDefault,
    paddingVertical: theme.spacing.xl,
  },
  statCell: {
    flex: 1,
    alignItems: 'center',
    gap: theme.spacing.xs,
  },
  statDivider: {
    width: 1,
    backgroundColor: theme.colors.borderDefault,
    marginVertical: theme.spacing.sm,
  },
  statValue: {
    ...theme.typography.monoDataLarge,
    color: theme.colors.accentPrimary,
  },
  statLabel: {
    fontSize: 10,
    fontFamily: theme.fonts.body.fontFamily,
    color: theme.colors.textTertiary,
    letterSpacing: 1,
  },
  section: {
    gap: theme.spacing.md,
  },
  sectionTitle: {
    ...theme.typography.sectionTitle,
    color: theme.colors.textPrimary,
  },
  exerciseRow: {
    backgroundColor: theme.colors.bgSurface1,
    borderRadius: theme.radius.card,
    borderWidth: 1,
    borderColor: theme.colors.borderDefault,
    padding: theme.spacing.lg,
    gap: theme.spacing.md,
  },
  exerciseRowTop: {
    gap: theme.spacing.xs,
  },
  exerciseName: {
    ...theme.typography.bodyBold,
    color: theme.colors.textPrimary,
  },
  exerciseMeta: {
    ...theme.typography.captionMuted,
    color: theme.colors.textSecondary,
  },
  setBadgesRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: theme.spacing.sm,
  },
  setBadge: {
    backgroundColor: theme.colors.bgSurface2,
    borderRadius: theme.radius.button,
    paddingHorizontal: theme.spacing.md,
    paddingVertical: theme.spacing.xs,
  },
  setBadgeText: {
    fontSize: 13,
    fontFamily: theme.fonts.monoSmall.fontFamily,
    color: theme.colors.textSecondary,
  },
  footer: {
    paddingHorizontal: theme.spacing.xxl,
    paddingBottom: theme.spacing.xxl,
    paddingTop: theme.spacing.md,
    borderTopWidth: 1,
    borderTopColor: theme.colors.borderDefault,
  },
  doneBtn: {
    backgroundColor: theme.colors.accentPrimary,
    borderRadius: theme.radius.button,
    paddingVertical: theme.spacing.lg,
    alignItems: 'center',
  },
  doneBtnText: {
    ...theme.typography.bodyBold,
    color: theme.colors.textPrimary,
  },
});
