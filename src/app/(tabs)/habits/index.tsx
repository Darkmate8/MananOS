import { useCallback, useMemo } from 'react';
import { View, Text, Pressable, ScrollView, StyleSheet } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { router } from 'expo-router';
import Animated, { useSharedValue, useAnimatedStyle, withTiming } from 'react-native-reanimated';
import * as Haptics from 'expo-haptics';
import { Feather, Ionicons } from '@expo/vector-icons';

import { theme } from '@/lib/theme';
import { calcStreak, todayDateStr } from '@/lib/habitUtils';
import { useTodayHabits, type HabitWithToday } from '@/hooks/useTodayHabits';
import { useLogHabitCompletion } from '@/hooks/useLogHabitCompletion';
import { useAllHabitsCompletions } from '@/hooks/useAllHabitsCompletions';
import { AggregateHabitGrid, type DayAggregate } from '@/components/AggregateHabitGrid';

const AnimatedPressable = Animated.createAnimatedComponent(Pressable);

function getDateLabel(): string {
  const now = new Date();
  const days = ['SUNDAY', 'MONDAY', 'TUESDAY', 'WEDNESDAY', 'THURSDAY', 'FRIDAY', 'SATURDAY'];
  const months = ['JAN', 'FEB', 'MAR', 'APR', 'MAY', 'JUN', 'JUL', 'AUG', 'SEP', 'OCT', 'NOV', 'DEC'];
  return `${days[now.getDay()]} · ${months[now.getMonth()]} ${now.getDate()}`;
}

// ─── Habit List Row ────────────────────────────────────────────────────────────

function HabitListRow({
  habit,
  streak,
  isLast,
  onCheck,
}: {
  habit: HabitWithToday;
  streak: number;
  isLast: boolean;
  onCheck: () => void;
}) {
  const scale = useSharedValue(1);
  const animStyle = useAnimatedStyle(() => ({ transform: [{ scale: scale.value }] }));
  const checkScale = useSharedValue(1);
  const checkAnimStyle = useAnimatedStyle(() => ({ transform: [{ scale: checkScale.value }] }));
  const isDone = habit.today_count >= habit.target_per_day;

  return (
    <AnimatedPressable
      style={[styles.listRow, !isLast && styles.listRowBorder, animStyle]}
      onPressIn={() => { scale.value = withTiming(0.97, { duration: theme.animation.press }); }}
      onPressOut={() => { scale.value = withTiming(1, { duration: theme.animation.press }); }}
      onPress={() => router.push(`/(tabs)/habits/${habit.id}`)}
    >
      {/* Colored icon box */}
      <View style={styles.iconBox}>
        <View style={[styles.iconDot, { backgroundColor: habit.color }]} />
      </View>

      {/* Name + meta */}
      <View style={styles.rowMeta}>
        <Text style={styles.rowName} numberOfLines={1}>{habit.name}</Text>
        <View style={styles.rowMetaRow}>
          <Text style={styles.rowSub}>Daily</Text>
          {streak > 0 && (
            <>
              <Text style={styles.rowSubDot}> · </Text>
              <Ionicons name="flame" size={11} color={theme.colors.accentPrimary} />
              <Text style={styles.rowStreak}>{streak} days</Text>
            </>
          )}
        </View>
      </View>

      {/* Check button */}
      <AnimatedPressable
        onPressIn={() => { checkScale.value = withTiming(0.97, { duration: theme.animation.press }); }}
        onPressOut={() => { checkScale.value = withTiming(1, { duration: theme.animation.press }); }}
        onPress={() => {
          Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
          onCheck();
        }}
        hitSlop={10}
        style={checkAnimStyle}
      >
        {isDone ? (
          <View style={[styles.checkCircle, { backgroundColor: habit.color + '22', borderColor: habit.color }]}>
            <Feather name="check" size={13} color={habit.color} />
          </View>
        ) : habit.today_count > 0 ? (
          <View style={[styles.checkCircle, { borderColor: habit.color }]}>
            <Text style={[styles.checkCountText, { color: habit.color }]}>
              {habit.today_count}/{habit.target_per_day}
            </Text>
          </View>
        ) : (
          <View style={styles.checkCircle} />
        )}
      </AnimatedPressable>

      <Feather name="chevron-right" size={16} color={theme.colors.textTertiary} />
    </AnimatedPressable>
  );
}

function AddPressable({ onPress, style, hitSlop, children }: { onPress: () => void; style?: object; hitSlop?: number; children: React.ReactNode }) {
  const press = useSharedValue(1);
  const animStyle = useAnimatedStyle(() => ({ transform: [{ scale: press.value }] }));
  return (
    <AnimatedPressable
      onPressIn={() => { press.value = withTiming(0.97, { duration: theme.animation.press }); }}
      onPressOut={() => { press.value = withTiming(1, { duration: theme.animation.press }); }}
      onPress={onPress}
      style={[style, animStyle]}
      hitSlop={hitSlop}
    >
      {children}
    </AnimatedPressable>
  );
}

// ─── Screen ───────────────────────────────────────────────────────────────────

export default function HabitsScreen() {
  const { data: habits, isLoading, isError } = useTodayHabits();
  const { mutate: logCompletion } = useLogHabitCompletion();
  const { data: allCompletions } = useAllHabitsCompletions();

  const doneCount = useMemo(
    () => (habits ?? []).filter((h) => h.today_count >= h.target_per_day).length,
    [habits],
  );

  const streaksMap = useMemo(() => {
    if (!habits || !allCompletions) return {} as Record<string, number>;
    const map: Record<string, number> = {};
    for (const h of habits) {
      map[h.id] = calcStreak(allCompletions[h.id] ?? {}, h.target_per_day);
    }
    return map;
  }, [habits, allCompletions]);

  const aggregateMap = useMemo((): Record<string, DayAggregate> => {
    if (!habits || !allCompletions || habits.length === 0) return {};
    const allDates = new Set<string>();
    for (const dateMap of Object.values(allCompletions)) {
      for (const date of Object.keys(dateMap)) allDates.add(date);
    }
    const totalHabits = habits.length;
    const result: Record<string, DayAggregate> = {};
    for (const date of allDates) {
      let completed = 0;
      for (const habit of habits) {
        const count = allCompletions[habit.id]?.[date] ?? 0;
        if (count >= habit.target_per_day) completed++;
      }
      result[date] = { completed, total: totalHabits };
    }
    return result;
  }, [habits, allCompletions]);

  const handleCheck = useCallback(
    (habit: HabitWithToday) => {
      logCompletion({
        habitId: habit.id,
        currentCount: habit.today_count,
        targetPerDay: habit.target_per_day,
      });
    },
    [logCompletion],
  );

  const totalCount = habits?.length ?? 0;

  return (
    <SafeAreaView style={styles.safe} edges={['top']}>
      <ScrollView contentContainerStyle={styles.scroll} showsVerticalScrollIndicator={false}>

        {/* ─── Header ─────────────────────────────────────── */}
        <View style={styles.header}>
          <Text style={styles.completionMeta}>
            {totalCount > 0
              ? `${doneCount} OF ${totalCount} DONE TODAY`
              : getDateLabel()}
          </Text>
          <View style={styles.headerRow}>
            <Text style={styles.title}>Habits</Text>
            <AddPressable onPress={() => router.push('/(modals)/create-habit')} style={styles.addBtn} hitSlop={8}>
              <Feather name="plus" size={20} color={theme.colors.textPrimary} />
            </AddPressable>
          </View>
        </View>

        {/* ─── Error State ─────────────────────────────────── */}
        {isError && !isLoading && (
          <View style={styles.section}>
            <View style={styles.errorCard}>
              <Feather name="alert-circle" size={18} color={theme.colors.error} />
              <Text style={styles.errorText}>Could not load habits. Check your connection.</Text>
            </View>
          </View>
        )}

        {/* ─── Aggregate Grid ──────────────────────────────── */}
        {!isLoading && !isError && habits && habits.length > 0 && (
          <View style={styles.section}>
            <View style={styles.sectionHeader}>
              <Text style={styles.sectionTitle}>All Habits · 52 Weeks</Text>
            </View>
            <View style={styles.gridCard}>
              <AggregateHabitGrid aggregateMap={aggregateMap} totalHabits={habits.length} />
            </View>
          </View>
        )}

        {/* ─── All Habits List ─────────────────────────────── */}
        <View style={styles.section}>
          {!isLoading && !isError && habits && habits.length > 0 ? (
            <>
              <View style={styles.sectionHeader}>
                <Text style={styles.sectionTitle}>All habits</Text>
                <AddPressable onPress={() => router.push('/(modals)/create-habit')} hitSlop={8}>
                  <Text style={styles.addLink}>+ Add</Text>
                </AddPressable>
              </View>

              <View style={styles.listContainer}>
                {habits.map((habit, index) => (
                  <HabitListRow
                    key={habit.id}
                    habit={habit}
                    streak={streaksMap[habit.id] ?? 0}
                    isLast={index === habits.length - 1}
                    onCheck={() => handleCheck(habit)}
                  />
                ))}
              </View>
            </>
          ) : !isLoading && !isError ? (
            <View style={styles.emptyCard}>
              <Text style={styles.emptyTitle}>No habits yet</Text>
              <Text style={styles.emptyBody}>
                Tap + to create your first habit and start tracking.
              </Text>
            </View>
          ) : null}
        </View>

      </ScrollView>
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
    paddingBottom: theme.spacing.massive,
  },

  // ─── Header ─────────────────────────────────────────────────────────────────
  header: {
    paddingHorizontal: theme.spacing.xxl,
    paddingTop: theme.spacing.xl,
    marginBottom: theme.spacing.xxl,
    gap: theme.spacing.xs,
  },
  completionMeta: {
    fontSize: 12,
    fontFamily: theme.fonts.body.fontFamily,
    color: theme.colors.textTertiary,
    letterSpacing: 1.2,
    textTransform: 'uppercase',
  },
  headerRow: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    justifyContent: 'space-between',
  },
  title: {
    fontSize: 28,
    fontFamily: theme.fonts.display.fontFamily,
    color: theme.colors.textPrimary,
    lineHeight: 34,
  },
  addBtn: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: theme.colors.bgSurface1,
    borderWidth: 1,
    borderColor: theme.colors.borderDefault,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 2,
  },

  // ─── Section wrapper ─────────────────────────────────────────────────────────
  section: {
    paddingHorizontal: theme.spacing.xxl,
    marginBottom: theme.spacing.xxl,
  },
  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'baseline',
    justifyContent: 'space-between',
    marginBottom: theme.spacing.md,
  },
  sectionTitle: {
    fontSize: 20,
    fontFamily: theme.fonts.display.fontFamily,
    color: theme.colors.textPrimary,
  },
  addLink: {
    fontSize: 14,
    fontFamily: theme.fonts.body.fontFamily,
    color: theme.colors.accentPrimary,
  },

  // ─── Aggregate Grid ──────────────────────────────────────────────────────────
  gridCard: {
    backgroundColor: theme.colors.bgSurface1,
    borderRadius: theme.radius.card,
    borderWidth: 1,
    borderColor: theme.colors.borderDefault,
    padding: theme.spacing.lg,
  },

  // ─── Error ───────────────────────────────────────────────────────────────────
  errorCard: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: theme.spacing.sm,
    backgroundColor: theme.colors.bgSurface1,
    borderRadius: theme.radius.card,
    borderWidth: 1,
    borderColor: theme.colors.error,
    padding: theme.spacing.lg,
  },
  errorText: {
    flex: 1,
    fontSize: 13,
    fontFamily: theme.fonts.body.fontFamily,
    color: theme.colors.error,
  },

  // ─── All Habits Section ──────────────────────────────────────────────────────
  listContainer: {
    backgroundColor: theme.colors.bgSurface1,
    borderRadius: theme.radius.card,
    borderWidth: 1,
    borderColor: theme.colors.borderDefault,
    overflow: 'hidden',
  },
  listRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: theme.spacing.lg,
    paddingVertical: theme.spacing.md,
    gap: theme.spacing.md,
    minHeight: 60,
  },
  listRowBorder: {
    borderBottomWidth: 1,
    borderBottomColor: theme.colors.borderDefault,
  },
  iconBox: {
    width: 36,
    height: 36,
    borderRadius: theme.radius.button,
    backgroundColor: theme.colors.bgSurface2,
    borderWidth: 1,
    borderColor: theme.colors.borderDefault,
    alignItems: 'center',
    justifyContent: 'center',
  },
  iconDot: {
    width: 14,
    height: 14,
    borderRadius: 7,
  },
  rowMeta: {
    flex: 1,
    gap: 2,
  },
  rowName: {
    fontSize: 15,
    fontFamily: theme.fonts.bodyBold.fontFamily,
    color: theme.colors.textPrimary,
  },
  rowMetaRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  rowSub: {
    fontSize: 12,
    fontFamily: theme.fonts.body.fontFamily,
    color: theme.colors.textTertiary,
  },
  rowSubDot: {
    fontSize: 12,
    fontFamily: theme.fonts.body.fontFamily,
    color: theme.colors.textTertiary,
  },
  rowStreak: {
    fontSize: 12,
    fontFamily: theme.fonts.mono.fontFamily,
    color: theme.colors.textSecondary,
  },
  checkCircle: {
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: theme.colors.bgSurface2,
    borderWidth: 1.5,
    borderColor: theme.colors.borderStrong,
    alignItems: 'center',
    justifyContent: 'center',
  },
  checkCountText: {
    fontSize: 9,
    fontFamily: theme.fonts.mono.fontFamily,
  },

  // ─── Empty ──────────────────────────────────────────────────────────────────
  emptyCard: {
    backgroundColor: theme.colors.bgSurface1,
    borderRadius: theme.radius.card,
    borderWidth: 1,
    borderColor: theme.colors.borderDefault,
    padding: theme.spacing.xxxl,
    alignItems: 'center',
    gap: theme.spacing.sm,
  },
  emptyTitle: {
    fontSize: 16,
    fontFamily: theme.fonts.bodyBold.fontFamily,
    color: theme.colors.textPrimary,
  },
  emptyBody: {
    fontSize: 13,
    fontFamily: theme.fonts.body.fontFamily,
    color: theme.colors.textTertiary,
    textAlign: 'center',
    lineHeight: 18,
  },
});
