import { View, Text, StyleSheet, ScrollView, ActivityIndicator } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { format } from 'date-fns';
import { router } from 'expo-router';
import Animated, { useSharedValue, useAnimatedStyle, withTiming } from 'react-native-reanimated';
import { Pressable } from 'react-native';
import * as Haptics from 'expo-haptics';

import { theme } from '@/lib/theme';
import { useWorkoutSessions } from '@/hooks/useWorkoutSessions';
import { useSessionStore } from '@/store/sessionStore';

const AnimatedPressable = Animated.createAnimatedComponent(Pressable);

function formatDateLabel(isoString: string): string {
  const date = new Date(isoString);
  return format(date, 'EEEE · MMM d').toUpperCase();
}

function formatDuration(startedAt: string, endedAt: string | null): string {
  if (!endedAt) return '—';
  const start = new Date(startedAt);
  const end = new Date(endedAt);
  const diffMs = end.getTime() - start.getTime();
  const diffMin = Math.round(diffMs / 60000);
  return `${diffMin} min`;
}

export default function WorkoutsScreen() {
  const { data: sessions, isLoading } = useWorkoutSessions();
  const startSession = useSessionStore((s) => s.startSession);
  const hasActiveSession = useSessionStore((s) => s.hasActiveSession);

  const fabScale = useSharedValue(1);
  const fabAnimStyle = useAnimatedStyle(() => ({ transform: [{ scale: fabScale.value }] }));

  function handleStartWorkout() {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    if (!hasActiveSession()) startSession();
    router.push('/(tabs)/workouts/active' as never);
  }

  return (
    <SafeAreaView style={styles.safe} edges={['top']}>
      <ScrollView contentContainerStyle={styles.scroll} showsVerticalScrollIndicator={false}>

        <View style={styles.header}>
          <Text style={styles.dateMeta}>{format(new Date(), 'EEEE · MMM d').toUpperCase()}</Text>
          <Text style={styles.title}>Workouts</Text>
        </View>

        {isLoading ? (
          <View style={styles.loadingContainer}>
            <ActivityIndicator color={theme.colors.accentPrimary} size="large" />
          </View>
        ) : !sessions || sessions.length === 0 ? (
          <View style={styles.emptyState}>
            <Text style={styles.emptyStateText}>No workouts yet</Text>
            <Text style={styles.emptyStateSubtext}>Start tracking by logging a workout</Text>
          </View>
        ) : (
          <View style={styles.listContainer}>
            {sessions.map((session, idx) => (
              <View key={session.id}>
                {(idx === 0 || formatDateLabel(sessions[idx - 1].ended_at!) !== formatDateLabel(session.ended_at!)) && (
                  <Text style={styles.dateSection}>{formatDateLabel(session.ended_at!)}</Text>
                )}
                <View style={styles.card}>
                  <View style={styles.cardHeader}>
                    <View style={styles.cardTitle}>
                      <Text style={styles.workoutName}>{session.title || 'Workout'}</Text>
                      <Text style={styles.cardMeta}>{formatDuration(session.started_at, session.ended_at)}</Text>
                    </View>
                  </View>

                  {session.exerciseNames.length > 0 && (
                    <View style={styles.exerciseList}>
                      {session.exerciseNames.map((name, i) => (
                        <Text key={i} style={styles.exerciseName}>
                          {name}
                        </Text>
                      ))}
                    </View>
                  )}

                  <View style={styles.cardStats}>
                    <View style={styles.statBox}>
                      <Text style={styles.statLabel}>Sets</Text>
                      <Text style={styles.statValue}>{session.setCount}</Text>
                    </View>
                    <View style={styles.statBox}>
                      <Text style={styles.statLabel}>Volume</Text>
                      <Text style={styles.statValue}>{Math.round(session.totalVolume).toLocaleString()} kg</Text>
                    </View>
                  </View>
                </View>
              </View>
            ))}
          </View>
        )}
      </ScrollView>

      {/* Floating Start Workout button */}
      <View style={styles.fabContainer}>
        <AnimatedPressable
          style={[styles.fab, fabAnimStyle]}
          onPressIn={() => { fabScale.value = withTiming(0.97, { duration: theme.animation.press }); }}
          onPressOut={() => { fabScale.value = withTiming(1, { duration: theme.animation.press }); }}
          onPress={handleStartWorkout}
        >
          <Text style={styles.fabText}>
            {hasActiveSession() ? 'Resume Workout' : 'Start Workout'}
          </Text>
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
  scroll: {
    paddingTop: theme.spacing.xl,
    paddingBottom: theme.spacing.massive,
  },
  header: {
    paddingHorizontal: theme.spacing.xxl,
    gap: theme.spacing.xs,
    marginBottom: theme.spacing.xxxl,
  },
  dateMeta: {
    ...theme.typography.captionMuted,
    color: theme.colors.textTertiary,
    letterSpacing: 1.2,
    textTransform: 'uppercase',
  },
  title: {
    ...theme.typography.displayHeadline,
    color: theme.colors.textPrimary,
    lineHeight: 34,
  },
  loadingContainer: {
    paddingVertical: theme.spacing.xxxl,
    alignItems: 'center',
  },
  emptyState: {
    marginHorizontal: theme.spacing.xxl,
    paddingVertical: theme.spacing.xxxl,
    alignItems: 'center',
    gap: theme.spacing.md,
  },
  emptyStateText: {
    ...theme.typography.bodyCore,
    color: theme.colors.textSecondary,
  },
  emptyStateSubtext: {
    ...theme.typography.captionMuted,
    color: theme.colors.textTertiary,
  },
  listContainer: {
    paddingHorizontal: 0,
    gap: theme.spacing.xl,
  },
  dateSection: {
    ...theme.typography.captionMuted,
    color: theme.colors.textTertiary,
    letterSpacing: 1.2,
    textTransform: 'uppercase',
    marginBottom: theme.spacing.md,
    marginTop: theme.spacing.lg,
    paddingHorizontal: theme.spacing.xxl,
  },
  card: {
    backgroundColor: theme.colors.bgSurface1,
    borderRadius: theme.radius.card,
    borderWidth: 1,
    borderColor: theme.colors.borderDefault,
    padding: theme.spacing.lg,
    gap: theme.spacing.md,
    marginHorizontal: theme.spacing.xxl,
  },
  cardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
  },
  cardTitle: {
    flex: 1,
    gap: theme.spacing.xs,
  },
  workoutName: {
    ...theme.typography.bodyBold,
    color: theme.colors.textPrimary,
  },
  cardMeta: {
    ...theme.typography.captionMuted,
    color: theme.colors.textTertiary,
  },
  exerciseList: {
    gap: theme.spacing.sm,
  },
  exerciseName: {
    ...theme.typography.captionMuted,
    color: theme.colors.textSecondary,
  },
  cardStats: {
    flexDirection: 'row',
    gap: theme.spacing.md,
  },
  statBox: {
    flex: 1,
    backgroundColor: theme.colors.bgCanvas,
    borderRadius: theme.radius.button,
    padding: theme.spacing.md,
    alignItems: 'center',
    gap: theme.spacing.xs,
  },
  statLabel: {
    ...theme.typography.captionMuted,
    color: theme.colors.textTertiary,
    letterSpacing: 0.5,
    textTransform: 'uppercase',
  },
  statValue: {
    ...theme.typography.monoDataSmall,
    color: theme.colors.accentPrimary,
  },
  fabContainer: {
    position: 'absolute',
    bottom: theme.spacing.xxxl,
    left: theme.spacing.xxl,
    right: theme.spacing.xxl,
  },
  fab: {
    backgroundColor: theme.colors.accentPrimary,
    borderRadius: theme.radius.button,
    paddingVertical: theme.spacing.lg,
    alignItems: 'center',
  },
  fabText: {
    ...theme.typography.bodyBold,
    color: theme.colors.textPrimary,
  },
});
