import { View, Text, StyleSheet, ScrollView, Pressable } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { router } from 'expo-router';
import * as Haptics from 'expo-haptics';
import Animated, { useAnimatedStyle, useSharedValue, withTiming } from 'react-native-reanimated';
import { format } from 'date-fns';
import { Ionicons } from '@expo/vector-icons';

import { theme } from '@/lib/theme';
import { ActivityRings } from '@/components/ActivityRings';
import { useTodayRings } from '@/hooks/useTodayRings';
import { useWaterQuickAdd } from '@/hooks/useWaterQuickAdd';
import { useTodayWorkout } from '@/hooks/useTodayWorkout';
import { useTodayHabits } from '@/hooks/useTodayHabits';

const AnimatedPressable = Animated.createAnimatedComponent(Pressable);

function usePressFeedback() {
  const scale = useSharedValue(1);
  const animatedStyle = useAnimatedStyle(() => ({ transform: [{ scale: scale.value }] }));
  const onPressIn = () => {
    scale.value = withTiming(0.97, { duration: theme.animation.press });
  };
  const onPressOut = () => {
    scale.value = withTiming(1, { duration: theme.animation.press });
  };
  return { animatedStyle, onPressIn, onPressOut };
}

function dateLabel(): string {
  const now = new Date();
  return format(now, 'EEEE · MMM d').toUpperCase();
}

// ─── Ring Stat ────────────────────────────────────────────────────────────────

function RingStat({ color, label, value, sub }: { color: string; label: string; value: string; sub: string }) {
  return (
    <View style={ringStatStyles.item}>
      <View style={[ringStatStyles.dot, { backgroundColor: color }]} />
      <Text style={ringStatStyles.label}>{label}</Text>
      <Text style={ringStatStyles.value}>{value}</Text>
      <Text style={ringStatStyles.sub}>{sub}</Text>
    </View>
  );
}

const ringStatStyles = StyleSheet.create({
  item: {
    flex: 1,
    alignItems: 'center',
    gap: 2,
  },
  dot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    marginBottom: 2,
  },
  label: {
    fontSize: 11,
    fontFamily: theme.fonts.body.fontFamily,
    color: theme.colors.textTertiary,
    textAlign: 'center',
    alignSelf: 'stretch',
  },
  value: {
    fontSize: 15,
    fontFamily: theme.fonts.mono.fontFamily,
    color: theme.colors.textPrimary,
    textAlign: 'center',
    alignSelf: 'stretch',
  },
  sub: {
    fontSize: 11,
    fontFamily: theme.fonts.body.fontFamily,
    color: theme.colors.textTertiary,
    textAlign: 'center',
    alignSelf: 'stretch',
  },
});

// ─── Workout Card ─────────────────────────────────────────────────────────────

function WorkoutCard() {
  const { data: session, isLoading } = useTodayWorkout();
  const press = usePressFeedback();
  const completedPress = usePressFeedback();

  if (isLoading) return <View style={styles.card} />;

  if (!session) {
    return (
      <AnimatedPressable
        style={[styles.card, styles.workoutCardEmpty, press.animatedStyle]}
        onPressIn={press.onPressIn}
        onPressOut={press.onPressOut}
        onPress={() => router.push('/(tabs)/workouts/active')}
      >
        <View style={styles.workoutCardRow}>
          <Ionicons name="barbell-outline" size={20} color={theme.colors.accentPrimary} />
          <View style={{ flex: 1 }}>
            <Text style={styles.cardLabel}>No workout logged</Text>
            <Text style={styles.cardCta}>Start a session →</Text>
          </View>
        </View>
      </AnimatedPressable>
    );
  }

  const durationMin = session.ended_at
    ? Math.round((new Date(session.ended_at).getTime() - new Date(session.started_at).getTime()) / 60000)
    : null;

  return (
    <AnimatedPressable
      style={[styles.card, completedPress.animatedStyle]}
      onPressIn={completedPress.onPressIn}
      onPressOut={completedPress.onPressOut}
      onPress={() => router.push('/(tabs)/workouts')}
    >
      <View style={styles.cardHeader}>
        <Text style={styles.cardSectionTitle}>{session.title ?? 'Workout'}</Text>
        {session.prCount > 0 && (
          <View style={styles.prBadge}>
            <Ionicons name="trophy-outline" size={12} color={theme.colors.accentPrimary} />
            <Text style={styles.prBadgeText}>{session.prCount} PR</Text>
          </View>
        )}
      </View>
      <View style={styles.workoutStats}>
        <StatChip label="Volume" value={`${Math.round(session.totalVolume).toLocaleString()} kg`} />
        <StatChip label="Sets" value={String(session.setCount)} />
        {durationMin !== null && <StatChip label="Duration" value={`${durationMin}m`} />}
      </View>
    </AnimatedPressable>
  );
}

function StatChip({ label, value }: { label: string; value: string }) {
  return (
    <View style={styles.statChip}>
      <Text style={styles.statChipValue}>{value}</Text>
      <Text style={styles.statChipLabel}>{label}</Text>
    </View>
  );
}

// ─── Protein Progress Bar ──────────────────────────────────────────────────────

function ProteinBar({ current, goal }: { current: number; goal: number }) {
  const pct = goal > 0 ? Math.min(current / goal, 1) : 0;
  return (
    <View style={styles.card}>
      <View style={styles.cardHeader}>
        <Text style={styles.cardSectionTitle}>Protein</Text>
        <Text style={styles.monoSmall}>
          {Math.round(current)}g
          <Text style={styles.textTertiary}> / {goal}g</Text>
        </Text>
      </View>
      <View style={styles.progressTrack}>
        <View style={[styles.progressFill, { width: `${pct * 100}%` }]} />
      </View>
    </View>
  );
}

// ─── Habits Row ───────────────────────────────────────────────────────────────

type TodayHabit = ReturnType<typeof useTodayHabits>['data'] extends (infer T)[] | undefined ? T : never;

function HabitTile({ h }: { h: TodayHabit }) {
  const press = usePressFeedback();
  const isDone = h.today_count >= h.target_per_day;
  return (
    <AnimatedPressable
      style={[styles.habitTile, isDone && styles.habitTileDone, press.animatedStyle]}
      onPressIn={press.onPressIn}
      onPressOut={press.onPressOut}
      onPress={() => router.push(`/(tabs)/habits/${h.id}`)}
    >
      <View style={[styles.habitDot, { backgroundColor: h.color }]} />
      <Text style={[styles.habitName, isDone && styles.habitNameDone]} numberOfLines={2}>
        {h.name}
      </Text>
      {h.target_per_day > 1 && (
        <Text style={styles.habitCount}>
          {h.today_count}/{h.target_per_day}
        </Text>
      )}
    </AnimatedPressable>
  );
}

function HabitsRowEmpty() {
  const press = usePressFeedback();
  return (
    <AnimatedPressable
      style={[styles.card, { alignItems: 'center', paddingVertical: theme.spacing.xl }, press.animatedStyle]}
      onPressIn={press.onPressIn}
      onPressOut={press.onPressOut}
      onPress={() => router.push('/(tabs)/habits')}
    >
      <Text style={styles.cardLabel}>No habits yet — tap to add</Text>
    </AnimatedPressable>
  );
}

function HabitsRow() {
  const { data: habits } = useTodayHabits();

  if (!habits || habits.length === 0) {
    return <HabitsRowEmpty />;
  }

  return (
    <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.habitsScroll}>
      {habits.map((h) => <HabitTile key={h.id} h={h} />)}
    </ScrollView>
  );
}

// ─── Coach Card ───────────────────────────────────────────────────────────────

function CoachCard() {
  const press = usePressFeedback();
  return (
    <AnimatedPressable
      style={[styles.card, styles.coachCard, press.animatedStyle]}
      onPressIn={press.onPressIn}
      onPressOut={press.onPressOut}
      onPress={() => {
        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
        router.push('/(tabs)/today/coach');
      }}
    >
      <View style={styles.workoutCardRow}>
        <Ionicons name="sparkles-outline" size={20} color={theme.colors.accentPrimary} />
        <View style={{ flex: 1 }}>
          <Text style={styles.cardLabel}>AI Coach</Text>
          <Text style={styles.cardCta}>Ask about workouts, nutrition & habits →</Text>
        </View>
        <Ionicons name="chevron-forward" size={16} color={theme.colors.textTertiary} />
      </View>
    </AnimatedPressable>
  );
}

// ─── Weight Metrics Prompt ────────────────────────────────────────────────────

function MetricsPrompt({ lastWeightLogDate }: { lastWeightLogDate: string | null }) {
  const press = usePressFeedback();
  if (!lastWeightLogDate) return null;
  const daysSince = Math.floor(
    (Date.now() - new Date(lastWeightLogDate).getTime()) / (1000 * 60 * 60 * 24),
  );
  if (daysSince <= 7) return null;

  return (
    <AnimatedPressable
      style={[styles.metricsAlert, press.animatedStyle]}
      onPressIn={press.onPressIn}
      onPressOut={press.onPressOut}
      onPress={() => router.push('/(modals)/settings')}
    >
      <Ionicons name="alert-circle-outline" size={16} color={theme.colors.warning} />
      <Text style={styles.metricsAlertText}>
        No weight logged in {daysSince} days. Tap to log.
      </Text>
    </AnimatedPressable>
  );
}

// ─── Water FAB ────────────────────────────────────────────────────────────────

function WaterFAB() {
  const { mutate, isPending } = useWaterQuickAdd();
  const press = usePressFeedback();
  const minusPress = usePressFeedback();

  return (
    <View style={styles.waterFabGroup}>
      <AnimatedPressable
        style={[styles.waterMinusBtn, minusPress.animatedStyle, isPending && { opacity: 0.7 }]}
        onPressIn={minusPress.onPressIn}
        onPressOut={minusPress.onPressOut}
        onPress={() => {
          Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
          mutate(-1);
        }}
        hitSlop={8}
      >
        <Ionicons name="remove" size={18} color={theme.colors.textSecondary} />
      </AnimatedPressable>
      <AnimatedPressable
        style={[styles.waterFab, press.animatedStyle, isPending && { opacity: 0.7 }]}
        onPressIn={press.onPressIn}
        onPressOut={press.onPressOut}
        onPress={() => {
          Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
          mutate(1);
        }}
      >
        <Ionicons name="water-outline" size={24} color={theme.colors.textPrimary} />
      </AnimatedPressable>
    </View>
  );
}

// ─── Screen ───────────────────────────────────────────────────────────────────

export default function TodayScreen() {
  const { rings, profile } = useTodayRings();
  const ringsData = rings.data;
  const profileData = profile.data;
  const settingsPress = usePressFeedback();
  const seeAllPress = usePressFeedback();

  const kcalGoal = profileData?.kcal_goal ?? 2200;
  const proteinGoal = profileData?.protein_goal_g ?? 150;
  const stepsGoal = profileData?.steps_goal ?? 8000;
  const waterGoal = profileData?.water_goal_cups ?? 8;

  const kcalToday = ringsData?.kcal_today ?? 0;
  const proteinToday = ringsData?.protein_g_today ?? 0;
  const stepsToday = ringsData?.steps_today ?? 0;
  const waterToday = ringsData?.water_cups_today ?? 0;

  const stepsProgress = stepsGoal > 0 ? stepsToday / stepsGoal : 0;
  const waterProgress = waterGoal > 0 ? waterToday / waterGoal : 0;
  const caloriesProgress = kcalGoal > 0 ? kcalToday / kcalGoal : 0;

  return (
    <SafeAreaView style={styles.safe} edges={['top']}>
      <ScrollView contentContainerStyle={styles.scroll} showsVerticalScrollIndicator={false}>
        {/* Header */}
        <View style={styles.header}>
          <View style={styles.headerRow}>
            <View>
              <Text style={styles.dateMeta}>{dateLabel()}</Text>
              <Text style={styles.title}>Today</Text>
            </View>
            <AnimatedPressable
              onPressIn={settingsPress.onPressIn}
              onPressOut={settingsPress.onPressOut}
              onPress={() => router.push('/(modals)/settings')}
              hitSlop={12}
              style={[styles.settingsBtn, settingsPress.animatedStyle]}
            >
              <Ionicons name="settings-outline" size={22} color={theme.colors.textSecondary} />
            </AnimatedPressable>
          </View>
        </View>

        {/* Activity Rings */}
        <View style={styles.ringsContainer}>
          <ActivityRings
            stepsProgress={stepsProgress}
            waterProgress={waterProgress}
            caloriesProgress={caloriesProgress}
            stepsValue={stepsToday.toLocaleString()}
          />
        </View>

        {/* Ring stats row — rendered at full screen width to avoid clipping */}
        <View style={styles.ringStats}>
          <RingStat
            color={theme.colors.ringSteps}
            label="Steps"
            value={stepsToday.toLocaleString()}
            sub={`/ ${stepsGoal.toLocaleString()}`}
          />
          <RingStat
            color={theme.colors.ringWater}
            label="Water"
            value={`${waterToday}`}
            sub={`/ ${waterGoal} cups`}
          />
          <RingStat
            color={theme.colors.ringCalories}
            label="Kcal"
            value={`${Math.round(kcalToday).toLocaleString()}`}
            sub={`/ ${kcalGoal.toLocaleString()}`}
          />
        </View>

        {/* Feed */}
        <View style={styles.feed}>
          {/* Metrics Prompt */}
          <MetricsPrompt lastWeightLogDate={null} />

          {/* Workout Card */}
          <WorkoutCard />

          {/* Protein Bar */}
          <ProteinBar current={proteinToday} goal={proteinGoal} />

          {/* Habits Row */}
          <View style={styles.sectionHeader}>
            <Text style={styles.sectionTitle}>Habits</Text>
            <AnimatedPressable
              onPressIn={seeAllPress.onPressIn}
              onPressOut={seeAllPress.onPressOut}
              onPress={() => router.push('/(tabs)/habits')}
              style={seeAllPress.animatedStyle}
            >
              <Text style={styles.seeAll}>See all</Text>
            </AnimatedPressable>
          </View>
          <HabitsRow />

          {/* AI Coach Entry */}
          <CoachCard />
        </View>
      </ScrollView>

      {/* Water FAB */}
      <WaterFAB />
    </SafeAreaView>
  );
}

// ─── Styles ───────────────────────────────────────────────────────────────────

const styles = StyleSheet.create({
  safe: {
    flex: 1,
    backgroundColor: theme.colors.bgCanvas,
  },
  scroll: {
    paddingBottom: 120,
  },
  header: {
    paddingHorizontal: theme.spacing.xxl,
    paddingTop: theme.spacing.xl,
    marginBottom: theme.spacing.xxl,
  },
  headerRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    justifyContent: 'space-between',
  },
  settingsBtn: {
    marginTop: theme.spacing.xs,
    padding: theme.spacing.xs,
  },
  dateMeta: {
    fontSize: 12,
    fontFamily: theme.fonts.body.fontFamily,
    color: theme.colors.textTertiary,
    letterSpacing: 1.2,
    textTransform: 'uppercase',
  },
  title: {
    fontSize: 28,
    fontFamily: theme.fonts.display.fontFamily,
    color: theme.colors.textPrimary,
    lineHeight: 34,
  },
  ringsContainer: {
    alignItems: 'center',
    marginBottom: theme.spacing.lg,
  },
  ringStats: {
    flexDirection: 'row',
    paddingHorizontal: theme.spacing.xxl,
    marginBottom: theme.spacing.xxxl,
  },
  feed: {
    paddingHorizontal: theme.spacing.xxl,
    gap: theme.spacing.md,
  },
  card: {
    backgroundColor: theme.colors.bgSurface1,
    borderRadius: theme.radius.card,
    borderWidth: 1,
    borderColor: theme.colors.borderDefault,
    padding: theme.spacing.lg,
  },
  cardHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: theme.spacing.md,
  },
  cardSectionTitle: {
    fontSize: 20,
    fontFamily: theme.fonts.display.fontFamily,
    color: theme.colors.textPrimary,
    lineHeight: 26,
  },
  cardLabel: {
    fontSize: 14,
    fontFamily: theme.fonts.body.fontFamily,
    color: theme.colors.textSecondary,
  },
  cardCta: {
    fontSize: 15,
    fontFamily: theme.fonts.bodyBold.fontFamily,
    color: theme.colors.accentPrimary,
    marginTop: theme.spacing.xs,
  },
  workoutCardEmpty: {
    borderColor: theme.colors.borderStrong,
  },
  coachCard: {
    borderColor: theme.colors.accentPrimary,
    borderWidth: 1,
    backgroundColor: theme.colors.accentPrimaryMuted,
  },
  workoutCardRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: theme.spacing.md,
  },
  workoutStats: {
    flexDirection: 'row',
    gap: theme.spacing.sm,
  },
  statChip: {
    backgroundColor: theme.colors.bgSurface2,
    borderRadius: theme.radius.button,
    paddingHorizontal: theme.spacing.md,
    paddingVertical: theme.spacing.sm,
    alignItems: 'center',
    minWidth: 72,
  },
  statChipValue: {
    fontSize: 15,
    fontFamily: theme.fonts.mono.fontFamily,
    color: theme.colors.textPrimary,
  },
  statChipLabel: {
    fontSize: 11,
    fontFamily: theme.fonts.body.fontFamily,
    color: theme.colors.textTertiary,
    marginTop: 2,
  },
  prBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: theme.spacing.xs,
    backgroundColor: theme.colors.accentPrimaryMuted,
    paddingHorizontal: theme.spacing.sm,
    paddingVertical: theme.spacing.xs,
    borderRadius: theme.radius.pill,
  },
  prBadgeText: {
    fontSize: 12,
    fontFamily: theme.fonts.bodyBold.fontFamily,
    color: theme.colors.accentPrimary,
  },
  progressTrack: {
    height: 6,
    backgroundColor: theme.colors.bgSurface2,
    borderRadius: theme.radius.pill,
    overflow: 'hidden',
  },
  progressFill: {
    height: '100%',
    backgroundColor: theme.colors.accentPrimary,
    borderRadius: theme.radius.pill,
  },
  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginTop: theme.spacing.sm,
  },
  sectionTitle: {
    fontSize: 20,
    fontFamily: theme.fonts.display.fontFamily,
    color: theme.colors.textPrimary,
  },
  seeAll: {
    fontSize: 13,
    fontFamily: theme.fonts.body.fontFamily,
    color: theme.colors.accentPrimary,
  },
  habitsScroll: {
    gap: theme.spacing.md,
    paddingBottom: theme.spacing.xs,
  },
  habitTile: {
    width: 80,
    height: 80,
    backgroundColor: theme.colors.bgSurface1,
    borderRadius: theme.radius.card,
    borderWidth: 1,
    borderColor: theme.colors.borderDefault,
    padding: theme.spacing.sm,
    justifyContent: 'space-between',
  },
  habitTileDone: {
    backgroundColor: theme.colors.accentPrimaryMuted,
    borderColor: theme.colors.accentPrimary,
  },
  habitDot: {
    width: 10,
    height: 10,
    borderRadius: 5,
  },
  habitName: {
    fontSize: 11,
    fontFamily: theme.fonts.body.fontFamily,
    color: theme.colors.textSecondary,
    lineHeight: 14,
  },
  habitNameDone: {
    color: theme.colors.textPrimary,
  },
  habitCount: {
    fontSize: 11,
    fontFamily: theme.fonts.mono.fontFamily,
    color: theme.colors.textTertiary,
  },
  metricsAlert: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: theme.spacing.sm,
    backgroundColor: theme.colors.bgSurface1,
    borderRadius: theme.radius.card,
    borderWidth: 1,
    borderColor: theme.colors.warning,
    padding: theme.spacing.md,
  },
  metricsAlertText: {
    flex: 1,
    fontSize: 13,
    fontFamily: theme.fonts.body.fontFamily,
    color: theme.colors.warning,
  },
  monoSmall: {
    fontSize: 15,
    fontFamily: theme.fonts.mono.fontFamily,
    color: theme.colors.textPrimary,
  },
  textTertiary: {
    fontSize: 13,
    fontFamily: theme.fonts.body.fontFamily,
    color: theme.colors.textTertiary,
  },
  waterFabGroup: {
    position: 'absolute',
    bottom: theme.spacing.xxxl,
    right: theme.spacing.xxl,
    alignItems: 'center',
    gap: theme.spacing.sm,
  },
  waterMinusBtn: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: theme.colors.bgSurface2,
    borderWidth: 1,
    borderColor: theme.colors.borderStrong,
    alignItems: 'center',
    justifyContent: 'center',
  },
  waterFab: {
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: theme.colors.accentPrimary,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 2,
    borderColor: theme.colors.bgCanvas,
  },
});
