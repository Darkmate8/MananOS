import { useState } from 'react';
import { View, Text, ScrollView, StyleSheet, Pressable, useWindowDimensions } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { router } from 'expo-router';
import Animated, { useSharedValue, useAnimatedStyle, withTiming } from 'react-native-reanimated';
import { BarChart } from 'react-native-gifted-charts';
import { Feather } from '@expo/vector-icons';

import { theme } from '@/lib/theme';
import { useNutritionHistory } from '@/hooks/useNutritionHistory';
import { useWeeklyNutrition } from '@/hooks/useWeeklyNutrition';

type Metric = 'kcal' | 'protein' | 'carbs' | 'fat';

const METRICS: { key: Metric; label: string; unit: string; color: string }[] = [
  { key: 'kcal', label: 'Calories', unit: 'kcal', color: theme.colors.ringCalories },
  { key: 'protein', label: 'Protein', unit: 'g', color: theme.colors.accentPrimary },
  { key: 'carbs', label: 'Carbs', unit: 'g', color: theme.colors.ringWater },
  { key: 'fat', label: 'Fat', unit: 'g', color: theme.colors.warning },
];

const AnimatedPressable = Animated.createAnimatedComponent(Pressable);

function MetricTab({ metric, active, onPress }: { metric: typeof METRICS[0]; active: boolean; onPress: () => void }) {
  const scale = useSharedValue(1);
  const animStyle = useAnimatedStyle(() => ({ transform: [{ scale: scale.value }] }));

  return (
    <AnimatedPressable
      style={[styles.tab, active && { borderBottomColor: metric.color, borderBottomWidth: 2 }, animStyle]}
      onPressIn={() => { scale.value = withTiming(0.97, { duration: theme.animation.press }); }}
      onPressOut={() => { scale.value = withTiming(1, { duration: theme.animation.press }); }}
      onPress={onPress}
    >
      <Text style={[styles.tabText, active && { color: theme.colors.textPrimary }]}>{metric.label}</Text>
    </AnimatedPressable>
  );
}

function SummaryCard({ label, value, unit, color }: { label: string; value: number; unit: string; color: string }) {
  return (
    <View style={styles.summaryCard}>
      <View style={[styles.summaryDot, { backgroundColor: color }]} />
      <Text style={styles.summaryLabel}>{label}</Text>
      <Text style={[styles.summaryValue, { color }]}>
        {Math.round(value)}
        <Text style={styles.summaryUnit}> {unit}</Text>
      </Text>
    </View>
  );
}

export default function NutritionHistoryScreen() {
  const [activeMetric, setActiveMetric] = useState<Metric>('kcal');
  const { data, isLoading } = useNutritionHistory();
  const { data: weekly } = useWeeklyNutrition();
  const backScale = useSharedValue(1);
  const backAnimStyle = useAnimatedStyle(() => ({ transform: [{ scale: backScale.value }] }));
  const { width: screenWidth } = useWindowDimensions();

  // card has 24px margin each side + 16px padding each side
  const chartWidth = screenWidth - theme.spacing.xxl * 2 - theme.spacing.lg * 2;

  const days = data?.days ?? [];
  const kcalGoal = data?.kcalGoal ?? 2200;
  const proteinGoalG = data?.proteinGoalG ?? 150;

  const currentMetric = METRICS.find((m) => m.key === activeMetric)!;

  function getMetricValue(dayIdx: number): number {
    const d = days[dayIdx];
    if (!d) return 0;
    if (activeMetric === 'kcal') return d.kcal;
    if (activeMetric === 'protein') return d.proteinG;
    if (activeMetric === 'carbs') return d.carbsG;
    return d.fatG;
  }

  const barData = days.map((d, idx) => {
    const value = getMetricValue(idx);
    return {
      value: Math.round(value),
      label: d.label,
      frontColor: currentMetric.color,
      topLabelComponent: value > 0
        ? () => <Text style={styles.barTopLabel}>{Math.round(value)}</Text>
        : undefined,
    };
  });

  const goalLine = activeMetric === 'kcal' ? kcalGoal : activeMetric === 'protein' ? proteinGoalG : undefined;

  const values = days.map((_, idx) => getMetricValue(idx));
  const maxBar = Math.max(...values, goalLine ?? 0, 1);
  const chartMax = Math.ceil(maxBar * 1.25);

  const avg7d = values.length > 0 ? values.reduce((s, v) => s + v, 0) / values.length : 0;
  const loggedDays = values.filter((v) => v > 0).length;

  const today = days[days.length - 1];
  const todayMacros = today && today.kcal > 0 ? today : null;

  return (
    <SafeAreaView style={styles.safe} edges={['top']}>
      <ScrollView contentContainerStyle={styles.scroll} showsVerticalScrollIndicator={false}>

        {/* Header */}
        <View style={styles.header}>
          <AnimatedPressable
            style={[styles.backBtn, backAnimStyle]}
            onPressIn={() => { backScale.value = withTiming(0.97, { duration: theme.animation.press }); }}
            onPressOut={() => { backScale.value = withTiming(1, { duration: theme.animation.press }); }}
            onPress={() => router.back()}
            hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
          >
            <Feather name="arrow-left" size={20} color={theme.colors.textSecondary} />
          </AnimatedPressable>
          <View style={styles.headerText}>
            <Text style={styles.dateMeta}>7-DAY OVERVIEW</Text>
            <Text style={styles.title}>History</Text>
          </View>
        </View>

        {/* Weekly Deficit Overview */}
        {weekly && weekly.days.length > 0 && (
          <View style={styles.deficitSection}>
            <Text style={styles.deficitTitle}>WEEKLY DEFICIT</Text>
            <BarChart
              data={weekly.days.map((d) => ({
                value: Math.round(d.kcal),
                label: new Date(d.on_date + 'T00:00:00').toLocaleDateString('en-US', { weekday: 'narrow' }),
                frontColor: theme.colors.ringCalories,
                topLabelComponent: d.kcal > 0
                  ? () => <Text style={styles.deficitBarLabel}>{Math.round(d.kcal)}</Text>
                  : undefined,
              }))}
              barWidth={26}
              spacing={14}
              roundedTop
              hideRules
              hideAxesAndRules
              xAxisLabelTextStyle={styles.xAxisLabel}
              maxValue={Math.ceil(Math.max(...weekly.days.map((d) => Math.max(d.kcal, d.kcal_goal))) * 1.25)}
              showReferenceLine1
              referenceLine1Config={{ color: theme.colors.textTertiary, dashWidth: 4, dashGap: 4, thickness: 1 }}
              referenceLine1Position={weekly.days[0]?.kcal_goal ?? 2200}
              isAnimated
              animationDuration={theme.animation.dataIntensive}
              height={140}
              width={screenWidth - theme.spacing.xxl * 2 - theme.spacing.lg * 2}
            />
            <View style={styles.deficitChipRow}>
              <View style={styles.deficitChip}>
                <Text style={styles.deficitChipLabel}>
                  {weekly.weeklyDeficitKcal >= 0 ? 'Weekly Deficit' : 'Weekly Surplus'}
                </Text>
                <Text style={[
                  styles.deficitChipValue,
                  { color: weekly.weeklyDeficitKcal >= 0 ? theme.colors.success : theme.colors.error },
                ]}>
                  {Math.abs(Math.round(weekly.weeklyDeficitKcal))} kcal
                </Text>
              </View>
              <View style={styles.deficitChip}>
                <Text style={styles.deficitChipLabel}>Protein Hit Rate</Text>
                <Text style={[styles.deficitChipValue, { color: theme.colors.accentPrimary }]}>
                  {weekly.proteinHitDays}/{weekly.totalDays} days
                </Text>
              </View>
            </View>
          </View>
        )}

        {/* Metric tabs */}
        <View style={styles.tabRow}>
          {METRICS.map((m) => (
            <MetricTab
              key={m.key}
              metric={m}
              active={activeMetric === m.key}
              onPress={() => setActiveMetric(m.key)}
            />
          ))}
        </View>

        {/* Chart card */}
        <View style={styles.chartCard}>
          {isLoading ? (
            <View style={styles.chartPlaceholder}>
              <Text style={styles.loadingText}>Loading…</Text>
            </View>
          ) : loggedDays === 0 ? (
            <View style={styles.chartPlaceholder}>
              <Feather name="bar-chart-2" size={32} color={theme.colors.textTertiary} />
              <Text style={styles.emptyText}>No data logged yet</Text>
            </View>
          ) : (
            <BarChart
              data={barData}
              barWidth={28}
              spacing={16}
              roundedTop
              hideRules
              hideAxesAndRules
              xAxisLabelTextStyle={styles.xAxisLabel}
              maxValue={chartMax}
              showReferenceLine1={!!goalLine}
              referenceLine1Config={{
                color: theme.colors.textTertiary,
                dashWidth: 4,
                dashGap: 4,
                thickness: 1,
              }}
              referenceLine1Position={goalLine}
              isAnimated
              animationDuration={theme.animation.dataIntensive}
              height={180}
              width={chartWidth}
            />
          )}
        </View>

        {/* Goal line label */}
        {goalLine ? (
          <View style={styles.goalRow}>
            <View style={styles.goalDash} />
            <Text style={styles.goalLabel}>
              Goal · {goalLine} {currentMetric.unit}
            </Text>
          </View>
        ) : null}

        {/* Weekly stats */}
        <View style={styles.statsSection}>
          <Text style={styles.statsSectionTitle}>Weekly Average</Text>
          <View style={styles.statsRow}>
            <View style={styles.statBlock}>
              <Text style={[styles.statValue, { color: currentMetric.color }]}>{Math.round(avg7d)}</Text>
              <Text style={styles.statUnit}>{currentMetric.unit} / day</Text>
            </View>
            <View style={styles.statDivider} />
            <View style={styles.statBlock}>
              <Text style={[styles.statValue, { color: theme.colors.textPrimary }]}>{loggedDays}</Text>
              <Text style={styles.statUnit}>days logged</Text>
            </View>
          </View>
        </View>

        {/* Per-day breakdown */}
        <View style={styles.breakdownSection}>
          <Text style={styles.statsSectionTitle}>Daily Breakdown</Text>
          {days.map((d, idx) => {
            const value = getMetricValue(idx);
            const pct = goalLine ? Math.min(value / goalLine, 1) : 0;
            return (
              <View key={d.date} style={styles.dayRow}>
                <Text style={styles.dayLabel}>{d.label}</Text>
                <View style={styles.dayBarTrack}>
                  <View
                    style={[
                      styles.dayBarFill,
                      {
                        width: `${(value / maxBar) * 100}%`,
                        backgroundColor: currentMetric.color,
                        opacity: value > 0 ? 1 : 0.2,
                      },
                    ]}
                  />
                </View>
                <Text style={[
                  styles.dayValue,
                  value > 0 ? { color: theme.colors.textPrimary } : { color: theme.colors.textTertiary },
                ]}>
                  {value > 0 ? `${Math.round(value)}` : '—'}
                </Text>
                {goalLine && value > 0 ? (
                  <View style={[
                    styles.pctBadge,
                    { backgroundColor: pct >= 1 ? currentMetric.color : theme.colors.bgSurface2 },
                  ]}>
                    <Text style={[styles.pctText, pct >= 1 && { color: theme.colors.bgCanvas }]}>
                      {Math.round(pct * 100)}%
                    </Text>
                  </View>
                ) : (
                  <View style={styles.pctBadgePlaceholder} />
                )}
              </View>
            );
          })}
        </View>

        {/* Today's macros summary card */}
        {todayMacros && (
          <View style={styles.macrosSummarySection}>
            <Text style={styles.statsSectionTitle}>Today's Macros</Text>
            <View style={styles.summaryGrid}>
              <SummaryCard label="Calories" value={todayMacros.kcal} unit="kcal" color={theme.colors.ringCalories} />
              <SummaryCard label="Protein" value={todayMacros.proteinG} unit="g" color={theme.colors.accentPrimary} />
              <SummaryCard label="Carbs" value={todayMacros.carbsG} unit="g" color={theme.colors.ringWater} />
              <SummaryCard label="Fat" value={todayMacros.fatG} unit="g" color={theme.colors.warning} />
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
  },

  header: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    paddingHorizontal: theme.spacing.xxl,
    gap: theme.spacing.md,
    marginBottom: theme.spacing.xxl,
  },
  backBtn: {
    marginTop: theme.spacing.sm,
    padding: theme.spacing.xs,
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

  deficitSection: {
    marginHorizontal: theme.spacing.xxl,
    backgroundColor: theme.colors.bgSurface1,
    borderRadius: theme.radius.card,
    borderWidth: 1,
    borderColor: theme.colors.borderDefault,
    padding: theme.spacing.lg,
    paddingTop: theme.spacing.md,
    marginBottom: theme.spacing.xxl,
    alignItems: 'center',
  },
  deficitTitle: {
    fontSize: 11,
    fontFamily: theme.fonts.bodyBold.fontFamily,
    color: theme.colors.textTertiary,
    letterSpacing: 0.8,
    textTransform: 'uppercase',
    alignSelf: 'flex-start',
    marginBottom: theme.spacing.md,
  },
  deficitBarLabel: {
    fontSize: 8,
    fontFamily: theme.fonts.mono.fontFamily,
    color: theme.colors.textTertiary,
    marginBottom: 2,
  },
  deficitChipRow: {
    flexDirection: 'row',
    gap: theme.spacing.sm,
    marginTop: theme.spacing.md,
    alignSelf: 'stretch',
  },
  deficitChip: {
    flex: 1,
    backgroundColor: theme.colors.bgSurface2,
    borderRadius: theme.radius.button,
    borderWidth: 1,
    borderColor: theme.colors.borderDefault,
    padding: theme.spacing.sm,
    gap: 2,
  },
  deficitChipLabel: {
    fontSize: 10,
    fontFamily: theme.fonts.body.fontFamily,
    color: theme.colors.textTertiary,
    textTransform: 'uppercase',
    letterSpacing: 0.6,
  },
  deficitChipValue: {
    fontSize: 15,
    fontFamily: theme.fonts.mono.fontFamily,
  },

  tabRow: {
    flexDirection: 'row',
    marginHorizontal: theme.spacing.xxl,
    marginBottom: theme.spacing.lg,
    borderBottomWidth: 1,
    borderBottomColor: theme.colors.borderDefault,
  },
  tab: {
    flex: 1,
    alignItems: 'center',
    paddingBottom: theme.spacing.sm,
    borderBottomColor: 'transparent',
    borderBottomWidth: 2,
  },
  tabText: {
    fontSize: 13,
    fontFamily: theme.fonts.bodyBold.fontFamily,
    color: theme.colors.textTertiary,
    letterSpacing: 0.2,
  },

  chartCard: {
    marginHorizontal: theme.spacing.xxl,
    backgroundColor: theme.colors.bgSurface1,
    borderRadius: theme.radius.card,
    borderWidth: 1,
    borderColor: theme.colors.borderDefault,
    padding: theme.spacing.lg,
    paddingTop: theme.spacing.xxl,
    alignItems: 'center',
    minHeight: 220,
    justifyContent: 'center',
  },
  chartPlaceholder: {
    alignItems: 'center',
    gap: theme.spacing.md,
    paddingVertical: theme.spacing.xxxl,
  },
  loadingText: {
    fontSize: 14,
    fontFamily: theme.fonts.body.fontFamily,
    color: theme.colors.textTertiary,
  },
  emptyText: {
    fontSize: 14,
    fontFamily: theme.fonts.body.fontFamily,
    color: theme.colors.textTertiary,
  },
  xAxisLabel: {
    fontSize: 11,
    fontFamily: theme.fonts.body.fontFamily,
    color: theme.colors.textTertiary,
  },
  barTopLabel: {
    fontSize: 9,
    fontFamily: theme.fonts.mono.fontFamily,
    color: theme.colors.textTertiary,
    marginBottom: 2,
  },

  goalRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginHorizontal: theme.spacing.xxl,
    marginTop: theme.spacing.sm,
    gap: theme.spacing.sm,
  },
  goalDash: {
    width: 16,
    height: 1,
    backgroundColor: theme.colors.textTertiary,
  },
  goalLabel: {
    fontSize: 12,
    fontFamily: theme.fonts.body.fontFamily,
    color: theme.colors.textTertiary,
  },

  statsSection: {
    marginHorizontal: theme.spacing.xxl,
    marginTop: theme.spacing.xxl,
    gap: theme.spacing.md,
  },
  statsSectionTitle: {
    fontSize: 13,
    fontFamily: theme.fonts.bodyBold.fontFamily,
    color: theme.colors.textTertiary,
    letterSpacing: 0.6,
    textTransform: 'uppercase',
  },
  statsRow: {
    flexDirection: 'row',
    backgroundColor: theme.colors.bgSurface1,
    borderRadius: theme.radius.card,
    borderWidth: 1,
    borderColor: theme.colors.borderDefault,
    paddingVertical: theme.spacing.lg,
  },
  statBlock: {
    flex: 1,
    alignItems: 'center',
    gap: 4,
  },
  statDivider: {
    width: 1,
    backgroundColor: theme.colors.borderDefault,
  },
  statValue: {
    fontSize: 24,
    fontFamily: theme.fonts.mono.fontFamily,
  },
  statUnit: {
    fontSize: 12,
    fontFamily: theme.fonts.body.fontFamily,
    color: theme.colors.textTertiary,
  },

  breakdownSection: {
    marginHorizontal: theme.spacing.xxl,
    marginTop: theme.spacing.xxl,
    gap: theme.spacing.md,
  },
  dayRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: theme.spacing.sm,
  },
  dayLabel: {
    width: 32,
    fontSize: 12,
    fontFamily: theme.fonts.body.fontFamily,
    color: theme.colors.textSecondary,
  },
  dayBarTrack: {
    flex: 1,
    height: 6,
    backgroundColor: theme.colors.bgSurface2,
    borderRadius: theme.radius.pill,
    overflow: 'hidden',
  },
  dayBarFill: {
    height: 6,
    borderRadius: theme.radius.pill,
  },
  dayValue: {
    width: 44,
    fontSize: 13,
    fontFamily: theme.fonts.mono.fontFamily,
    textAlign: 'right',
  },
  pctBadge: {
    width: 36,
    alignItems: 'center',
    paddingVertical: 2,
    borderRadius: theme.radius.pill,
  },
  pctBadgePlaceholder: {
    width: 36,
  },
  pctText: {
    fontSize: 10,
    fontFamily: theme.fonts.mono.fontFamily,
    color: theme.colors.textTertiary,
  },

  macrosSummarySection: {
    marginHorizontal: theme.spacing.xxl,
    marginTop: theme.spacing.xxl,
    gap: theme.spacing.md,
  },
  summaryGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: theme.spacing.sm,
  },
  summaryCard: {
    width: '47%',
    backgroundColor: theme.colors.bgSurface1,
    borderRadius: theme.radius.card,
    borderWidth: 1,
    borderColor: theme.colors.borderDefault,
    padding: theme.spacing.md,
    gap: theme.spacing.xs,
  },
  summaryDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
  },
  summaryLabel: {
    fontSize: 11,
    fontFamily: theme.fonts.body.fontFamily,
    color: theme.colors.textTertiary,
    textTransform: 'uppercase',
    letterSpacing: 0.8,
  },
  summaryValue: {
    fontSize: 20,
    fontFamily: theme.fonts.mono.fontFamily,
  },
  summaryUnit: {
    fontSize: 12,
    fontFamily: theme.fonts.body.fontFamily,
    color: theme.colors.textSecondary,
  },
});
