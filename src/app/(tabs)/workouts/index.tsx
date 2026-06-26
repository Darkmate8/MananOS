import { View, Text, StyleSheet, ScrollView, ActivityIndicator, Pressable, Alert } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { format } from 'date-fns';
import { router } from 'expo-router';
import Animated, { useSharedValue, useAnimatedStyle, withTiming } from 'react-native-reanimated';
import * as Haptics from 'expo-haptics';
import { Ionicons } from '@expo/vector-icons';

import { theme } from '@/lib/theme';
import { useWorkoutSessions, type WorkoutSessionDetail } from '@/hooks/useWorkoutSessions';
import { useDeleteWorkoutSession } from '@/hooks/useDeleteWorkoutSession';
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
  const { mutate: deleteSession } = useDeleteWorkoutSession();
  const startSession = useSessionStore((s) => s.startSession);
  const hasActiveSession = useSessionStore((s) => s.hasActiveSession);

  const fabScale = useSharedValue(1);
  const fabAnimStyle = useAnimatedStyle(() => ({ transform: [{ scale: fabScale.value }] }));
  const templatesScale = useSharedValue(1);
  const templatesAnimStyle = useAnimatedStyle(() => ({ transform: [{ scale: templatesScale.value }] }));

  function handleStartWorkout() {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    if (!hasActiveSession()) startSession();
    router.push('/(tabs)/workouts/active' as never);
  }

  function handleDeleteSession(session: WorkoutSessionDetail) {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    Alert.alert(
      'Delete Workout',
      `Delete "${session.title || 'Workout'}" and all its sets? This cannot be undone.`,
      [
        { text: 'Cancel', style: 'cancel' },
        { text: 'Delete', style: 'destructive', onPress: () => deleteSession(session.id) },
      ],
    );
  }

  return (
    <SafeAreaView style={styles.safe} edges={['top']}>
      <ScrollView contentContainerStyle={styles.scroll} showsVerticalScrollIndicator={false}>

        <View style={styles.header}>
          <Text style={styles.dateMeta}>{format(new Date(), 'EEEE · MMM d').toUpperCase()}</Text>
          <View style={styles.headerRow}>
            <Text style={styles.title}>Workouts</Text>
            <AnimatedPressable
              style={[styles.templatesBtn, templatesAnimStyle]}
              onPressIn={() => { templatesScale.value = withTiming(0.97, { duration: theme.animation.press }); }}
              onPressOut={() => { templatesScale.value = withTiming(1, { duration: theme.animation.press }); }}
              onPress={() => router.push('/(tabs)/workouts/templates' as never)}
              hitSlop={8}
            >
              <Ionicons name="albums-outline" size={16} color={theme.colors.textSecondary} />
              <Text style={styles.templatesBtnText}>Templates</Text>
            </AnimatedPressable>
          </View>
        </View>

        {isLoading ? (
          <View style={styles.loadingContainer}>
            <ActivityIndicator color={theme.colors.accentPrimary} size="large" />
          </View>
        ) : !sessions || sessions.length === 0 ? (
          <View style={styles.emptyCard}>
            <Ionicons name="barbell-outline" size={32} color={theme.colors.textTertiary} />
            <Text style={styles.emptyTitle}>No workouts logged yet</Text>
            <Text style={styles.emptyBody}>Tap Start Workout below to begin your first session.</Text>
          </View>
        ) : (
          <View style={styles.listContainer}>
            {sessions.map((session, idx) => (
              <View key={session.id}>
                {(idx === 0 || formatDateLabel(sessions[idx - 1].ended_at!) !== formatDateLabel(session.ended_at!)) && (
                  <Text style={styles.dateSection}>{formatDateLabel(session.ended_at!)}</Text>
                )}
                <Pressable
                  style={styles.card}
                  onLongPress={() => handleDeleteSession(session)}
                  delayLongPress={450}
                >
                  <View style={styles.cardHeader}>
                    <View style={styles.cardTitle}>
                      <Text style={styles.workoutName}>{session.title || 'Workout'}</Text>
                      <Text style={styles.cardMeta}>{formatDuration(session.started_at, session.ended_at)}</Text>
                    </View>
                  </View>

                  {(session.sessionExercises?.length ?? 0) > 0 && (
                    <View style={styles.exerciseList}>
                      {(session.sessionExercises ?? []).map((ex) => (
                        <Pressable
                          key={ex.id}
                          onPress={() =>
                            router.push({
                              pathname: '/(modals)/exercise-progress' as never,
                              params: { exerciseId: ex.id, exerciseName: ex.name },
                            })
                          }
                          hitSlop={4}
                        >
                          <Text style={styles.exerciseName}>{ex.name}</Text>
                        </Pressable>
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
                </Pressable>
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
  headerRow: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    justifyContent: 'space-between',
  },
  templatesBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: theme.spacing.xs,
    paddingHorizontal: theme.spacing.md,
    paddingVertical: theme.spacing.sm,
    borderRadius: theme.radius.pill,
    borderWidth: 1,
    borderColor: theme.colors.borderStrong,
    backgroundColor: theme.colors.bgSurface1,
    marginBottom: theme.spacing.xs,
  },
  templatesBtnText: {
    ...theme.typography.captionMuted,
    color: theme.colors.textSecondary,
  },
  loadingContainer: {
    paddingVertical: theme.spacing.xxxl,
    alignItems: 'center',
  },
  emptyCard: {
    marginHorizontal: theme.spacing.xxl,
    marginTop: theme.spacing.xxl,
    paddingVertical: theme.spacing.xxxl,
    backgroundColor: theme.colors.bgSurface1,
    borderRadius: theme.radius.card,
    borderWidth: 1,
    borderColor: theme.colors.borderDefault,
    alignItems: 'center',
    gap: theme.spacing.sm,
  },
  emptyTitle: {
    ...theme.typography.bodyBold,
    color: theme.colors.textSecondary,
    marginTop: theme.spacing.sm,
  },
  emptyBody: {
    ...theme.typography.captionMuted,
    color: theme.colors.textTertiary,
    textAlign: 'center',
    paddingHorizontal: theme.spacing.xl,
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
