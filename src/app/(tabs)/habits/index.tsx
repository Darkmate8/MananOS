import { useCallback } from 'react';
import { View, Text, Pressable, ScrollView, StyleSheet } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { router } from 'expo-router';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withTiming,
} from 'react-native-reanimated';
import * as Haptics from 'expo-haptics';
import { Feather } from '@expo/vector-icons';

import { theme } from '@/lib/theme';
import { useTodayHabits, type HabitWithToday } from '@/hooks/useTodayHabits';
import { useLogHabitCompletion } from '@/hooks/useLogHabitCompletion';

const AnimatedPressable = Animated.createAnimatedComponent(Pressable);

function getDateLabel(): string {
  const now = new Date();
  const days = ['SUNDAY', 'MONDAY', 'TUESDAY', 'WEDNESDAY', 'THURSDAY', 'FRIDAY', 'SATURDAY'];
  const months = ['JAN', 'FEB', 'MAR', 'APR', 'MAY', 'JUN', 'JUL', 'AUG', 'SEP', 'OCT', 'NOV', 'DEC'];
  return `${days[now.getDay()]} · ${months[now.getMonth()]} ${now.getDate()}`;
}

function HabitTile({
  habit,
  onPress,
  onLongPress,
}: {
  habit: HabitWithToday;
  onPress: () => void;
  onLongPress: () => void;
}) {
  const scale = useSharedValue(1);
  const animStyle = useAnimatedStyle(() => ({ transform: [{ scale: scale.value }] }));

  const isComplete = habit.today_count >= habit.target_per_day;
  const isBinary = habit.target_per_day === 1;

  return (
    <AnimatedPressable
      style={[
        styles.tile,
        animStyle,
        isComplete && { backgroundColor: theme.colors.accentPrimaryMuted, borderColor: habit.color },
      ]}
      onPressIn={() => { scale.value = withTiming(0.97, { duration: theme.animation.press }); }}
      onPressOut={() => { scale.value = withTiming(1, { duration: theme.animation.press }); }}
      onPress={onPress}
      onLongPress={onLongPress}
      delayLongPress={400}
    >
      {isBinary ? (
        isComplete ? (
          <Feather name="check-circle" size={28} color={habit.color} />
        ) : (
          <Feather name="circle" size={28} color={theme.colors.textTertiary} />
        )
      ) : (
        <Text
          style={[
            styles.tileCount,
            isComplete && { color: habit.color },
          ]}
        >
          {habit.today_count}/{habit.target_per_day}
        </Text>
      )}
      <Text style={styles.tileName} numberOfLines={2}>
        {habit.name}
      </Text>
    </AnimatedPressable>
  );
}

export default function HabitsScreen() {
  const { data: habits, isLoading } = useTodayHabits();
  const { mutate: logCompletion } = useLogHabitCompletion();

  const handleTilePress = useCallback(
    (habit: HabitWithToday) => {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
      logCompletion({
        habitId: habit.id,
        currentCount: habit.today_count,
        targetPerDay: habit.target_per_day,
      });
    },
    [logCompletion],
  );

  const handleTileLongPress = useCallback((habitId: string) => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    router.push(`/(tabs)/habits/${habitId}`);
  }, []);

  return (
    <SafeAreaView style={styles.safe} edges={['top']}>
      <ScrollView
        contentContainerStyle={styles.scroll}
        showsVerticalScrollIndicator={false}
      >
        {/* Header */}
        <View style={styles.headerRow}>
          <View style={styles.headerText}>
            <Text style={styles.dateMeta}>{getDateLabel()}</Text>
            <Text style={styles.title}>Habits</Text>
          </View>
          <Pressable
            onPress={() => router.push('/(modals)/create-habit')}
            style={styles.addBtn}
            hitSlop={8}
          >
            <Feather name="plus" size={20} color={theme.colors.textPrimary} />
          </Pressable>
        </View>

        {/* Grid */}
        {!isLoading && habits && habits.length > 0 ? (
          <View style={styles.grid}>
            {habits.map((habit) => (
              <HabitTile
                key={habit.id}
                habit={habit}
                onPress={() => handleTilePress(habit)}
                onLongPress={() => handleTileLongPress(habit.id)}
              />
            ))}
          </View>
        ) : !isLoading ? (
          <View style={styles.emptyCard}>
            <Text style={styles.emptyTitle}>No habits yet</Text>
            <Text style={styles.emptyBody}>
              Tap + to create your first habit and start tracking.
            </Text>
          </View>
        ) : null}
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
  headerRow: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    justifyContent: 'space-between',
    marginBottom: theme.spacing.xxxl,
  },
  headerText: {
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
  addBtn: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: theme.colors.bgSurface1,
    borderWidth: 1,
    borderColor: theme.colors.borderDefault,
    alignItems: 'center',
    justifyContent: 'center',
  },
  grid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: theme.spacing.md,
  },
  tile: {
    width: 80,
    height: 80,
    backgroundColor: theme.colors.bgSurface1,
    borderRadius: theme.radius.card,
    borderWidth: 1,
    borderColor: theme.colors.borderDefault,
    alignItems: 'center',
    justifyContent: 'center',
    padding: theme.spacing.xs,
    gap: theme.spacing.xs,
  },
  tileCount: {
    fontSize: 15,
    fontFamily: theme.fonts.mono.fontFamily,
    color: theme.colors.textSecondary,
  },
  tileName: {
    fontSize: 11,
    fontFamily: theme.fonts.body.fontFamily,
    color: theme.colors.textSecondary,
    textAlign: 'center',
    lineHeight: 14,
  },
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
    ...theme.typography.bodyBold,
    color: theme.colors.textPrimary,
  },
  emptyBody: {
    ...theme.typography.captionMuted,
    color: theme.colors.textTertiary,
    textAlign: 'center',
    lineHeight: 18,
  },
});
