import { useMemo, useCallback } from 'react';
import { View, Text, ScrollView, Pressable, Alert, StyleSheet } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useLocalSearchParams, router } from 'expo-router';
import { useQueryClient } from '@tanstack/react-query';
import * as Haptics from 'expo-haptics';
import { Feather } from '@expo/vector-icons';
import Animated, { useSharedValue, useAnimatedStyle, withTiming } from 'react-native-reanimated';

import { theme } from '@/lib/theme';

const AnimatedPressable = Animated.createAnimatedComponent(Pressable);
import { calcStreak, calcTotal, todayDateStr } from '@/lib/habitUtils';
import { useHabitHistory, type HabitHistoryData } from '@/hooks/useHabitHistory';
import { useLogHabitCompletion } from '@/hooks/useLogHabitCompletion';
import { useDeleteHabit } from '@/hooks/useDeleteHabit';
import { useAuthStore } from '@/store/authStore';
import { HabitContributionGrid } from '@/components/HabitContributionGrid';

export default function HabitDetailScreen() {
  const { habitId } = useLocalSearchParams<{ habitId: string }>();
  const userId = useAuthStore((s) => s.userId);
  const queryClient = useQueryClient();

  const { data, isLoading } = useHabitHistory(habitId);
  const { mutate: logCompletion } = useLogHabitCompletion();
  const { mutate: deleteHabit } = useDeleteHabit();

  const todayStr = useMemo(() => todayDateStr(), []);
  const habit = data?.habit;
  const backScale = useSharedValue(1);
  const backAnimStyle = useAnimatedStyle(() => ({ transform: [{ scale: backScale.value }] }));
  const trashScale = useSharedValue(1);
  const trashAnimStyle = useAnimatedStyle(() => ({ transform: [{ scale: trashScale.value }] }));

  const handleDelete = useCallback(() => {
    if (!habit) return;
    Alert.alert(
      'Delete Habit',
      `Delete "${habit.name}"? This cannot be undone.`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: () => {
            Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
            deleteHabit(habitId, { onSuccess: () => router.back() });
          },
        },
      ],
    );
  }, [habit, habitId, deleteHabit]);
  const completionsMap = data?.completionsMap ?? {};

  const streak = useMemo(
    () => (habit ? calcStreak(completionsMap, habit.target_per_day) : 0),
    [completionsMap, habit],
  );
  const total = useMemo(
    () => (habit ? calcTotal(completionsMap, habit.target_per_day) : 0),
    [completionsMap, habit],
  );

  const handleTodayTap = useCallback(() => {
    if (!data) return;
    const { habit: h, completionsMap: map } = data;
    const todayCount = map[todayStr] ?? 0;
    const newCount = todayCount >= h.target_per_day ? 0 : todayCount + 1;

    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);

    queryClient.setQueryData<HabitHistoryData>(['habit_history', habitId, userId], (old) =>
      old
        ? { ...old, completionsMap: { ...old.completionsMap, [todayStr]: newCount } }
        : old,
    );

    logCompletion(
      { habitId, currentCount: todayCount, targetPerDay: h.target_per_day },
      {
        onError: () => {
          queryClient.invalidateQueries({ queryKey: ['habit_history', habitId, userId] });
        },
        onSettled: () => {
          queryClient.invalidateQueries({ queryKey: ['habit_history', habitId, userId] });
        },
      },
    );
  }, [data, habitId, userId, todayStr, queryClient, logCompletion]);

  return (
    <SafeAreaView style={styles.safe} edges={['top']}>
      <ScrollView contentContainerStyle={styles.scroll} showsVerticalScrollIndicator={false}>

        {/* Header */}
        <View style={styles.header}>
          <AnimatedPressable
            onPressIn={() => { backScale.value = withTiming(0.97, { duration: theme.animation.press }); }}
            onPressOut={() => { backScale.value = withTiming(1, { duration: theme.animation.press }); }}
            onPress={() => router.back()}
            style={[styles.backBtn, backAnimStyle]}
            hitSlop={12}
          >
            <Feather name="chevron-left" size={22} color={theme.colors.textSecondary} />
          </AnimatedPressable>
          <View style={styles.headerText}>
            <Text style={styles.dateMeta}>HABIT DETAIL</Text>
            <Text style={styles.title} numberOfLines={2}>{habit?.name ?? '—'}</Text>
          </View>
          {habit && (
            <AnimatedPressable
              onPressIn={() => { trashScale.value = withTiming(0.97, { duration: theme.animation.press }); }}
              onPressOut={() => { trashScale.value = withTiming(1, { duration: theme.animation.press }); }}
              onPress={handleDelete}
              style={[styles.trashBtn, trashAnimStyle]}
              hitSlop={12}
            >
              <Feather name="trash-2" size={18} color={theme.colors.error} />
            </AnimatedPressable>
          )}
        </View>

        {/* Stats */}
        {!isLoading && habit && (
          <View style={styles.statsRow}>
            <View style={styles.statBlock}>
              <Text style={styles.statValue}>{streak}</Text>
              <Text style={styles.statLabel}>day streak</Text>
            </View>
            <View style={styles.statDivider} />
            <View style={styles.statBlock}>
              <Text style={styles.statValue}>{total}</Text>
              <Text style={styles.statLabel}>total days</Text>
            </View>
          </View>
        )}

        {/* Contribution Grid */}
        {!isLoading && habit && (
          <View style={styles.gridSection}>
            <Text style={styles.sectionLabel}>52-WEEK HISTORY</Text>
            <View style={styles.gridCard}>
              <HabitContributionGrid
                completionsMap={completionsMap}
                targetPerDay={habit.target_per_day}
                onTodayTap={handleTodayTap}
                showLegend
                showHint
              />
            </View>
          </View>
        )}

      </ScrollView>
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
    paddingHorizontal: theme.spacing.xxl,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: theme.spacing.sm,
    marginBottom: theme.spacing.xxl,
  },
  backBtn: {
    marginTop: theme.spacing.xs,
    padding: theme.spacing.xs,
  },
  trashBtn: {
    marginTop: theme.spacing.xs,
    padding: theme.spacing.xs,
  },
  headerText: {
    flex: 1,
    gap: theme.spacing.xs,
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
  statsRow: {
    flexDirection: 'row',
    backgroundColor: theme.colors.bgSurface1,
    borderRadius: theme.radius.card,
    borderWidth: 1,
    borderColor: theme.colors.borderDefault,
    padding: theme.spacing.xxl,
    marginBottom: theme.spacing.xxl,
    alignItems: 'center',
  },
  statBlock: {
    flex: 1,
    alignItems: 'center',
    gap: theme.spacing.xs,
  },
  statValue: {
    ...theme.typography.monoDataLarge,
    color: theme.colors.textPrimary,
  },
  statLabel: {
    ...theme.typography.captionMuted,
    color: theme.colors.textTertiary,
  },
  statDivider: {
    width: 1,
    height: 40,
    backgroundColor: theme.colors.borderDefault,
  },
  gridSection: {
    gap: theme.spacing.md,
  },
  sectionLabel: {
    fontSize: 12,
    fontFamily: theme.fonts.body.fontFamily,
    color: theme.colors.textTertiary,
    letterSpacing: 1.2,
    textTransform: 'uppercase',
  },
  gridCard: {
    backgroundColor: theme.colors.bgSurface1,
    borderRadius: theme.radius.card,
    borderWidth: 1,
    borderColor: theme.colors.borderDefault,
    padding: theme.spacing.md,
  },
});
