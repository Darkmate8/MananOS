import { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  Pressable,
  ActivityIndicator,
  useWindowDimensions,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { router, useLocalSearchParams } from 'expo-router';
import Animated, { useSharedValue, useAnimatedStyle, withTiming } from 'react-native-reanimated';
import { LineChart } from 'react-native-gifted-charts';
import { Feather } from '@expo/vector-icons';
import { format } from 'date-fns';

import { theme } from '@/lib/theme';
import { useExerciseProgress } from '@/hooks/useExerciseProgress';

type MetricKey = 'oneRM' | 'maxWeight' | 'volume';

const METRICS: { key: MetricKey; label: string; unit: string }[] = [
  { key: 'oneRM', label: 'Est. 1RM', unit: 'kg' },
  { key: 'maxWeight', label: 'Max Weight', unit: 'kg' },
  { key: 'volume', label: 'Volume', unit: 'kg' },
];

const AnimatedPressable = Animated.createAnimatedComponent(Pressable);

function MetricChip({
  metric,
  active,
  onPress,
}: {
  metric: (typeof METRICS)[0];
  active: boolean;
  onPress: () => void;
}) {
  const scale = useSharedValue(1);
  const animStyle = useAnimatedStyle(() => ({ transform: [{ scale: scale.value }] }));
  return (
    <AnimatedPressable
      style={[styles.chip, active && styles.chipActive, animStyle]}
      onPressIn={() => { scale.value = withTiming(0.97, { duration: theme.animation.press }); }}
      onPressOut={() => { scale.value = withTiming(1, { duration: theme.animation.press }); }}
      onPress={onPress}
    >
      <Text style={[styles.chipText, active && styles.chipTextActive]}>{metric.label}</Text>
    </AnimatedPressable>
  );
}

export default function ExerciseProgressModal() {
  const { exerciseId, exerciseName } = useLocalSearchParams<{
    exerciseId: string;
    exerciseName: string;
  }>();
  const [activeMetric, setActiveMetric] = useState<MetricKey>('oneRM');
  const { data, isLoading } = useExerciseProgress(exerciseId ?? '', 90);
  const { width: screenWidth } = useWindowDimensions();

  const chartWidth = screenWidth - theme.spacing.xxl * 2 - theme.spacing.lg * 2;

  const currentMetric = METRICS.find((m) => m.key === activeMetric)!;

  function getPointValue(idx: number): number {
    const p = data?.[idx];
    if (!p) return 0;
    if (activeMetric === 'oneRM') return p.estimatedOneRM;
    if (activeMetric === 'maxWeight') return p.maxWeight;
    return p.totalVolume;
  }

  const hasData = data && data.length >= 2;

  const lineData = (data ?? []).map((point, idx) => ({
    value: getPointValue(idx),
    label: format(new Date(point.date + 'T00:00:00'), 'MMM d'),
    dataPointText: '',
  }));

  const latestValue = lineData.length > 0 ? lineData[lineData.length - 1].value : null;
  const firstValue = lineData.length > 0 ? lineData[0].value : null;
  const delta =
    latestValue !== null && firstValue !== null && firstValue > 0
      ? ((latestValue - firstValue) / firstValue) * 100
      : null;

  const maxVal = lineData.length > 0 ? Math.max(...lineData.map((d) => d.value), 1) : 1;
  const chartMax = Math.ceil(maxVal * 1.25);

  return (
    <SafeAreaView style={styles.safe} edges={['top']}>
      <ScrollView contentContainerStyle={styles.scroll} showsVerticalScrollIndicator={false}>

        {/* Header */}
        <View style={styles.header}>
          <AnimatedPressable
            onPress={() => router.back()}
            hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
          >
            <Feather name="x" size={20} color={theme.colors.textSecondary} />
          </AnimatedPressable>
          <View style={styles.headerText}>
            <Text style={styles.exerciseName}>{exerciseName ?? 'Exercise'}</Text>
            <Text style={styles.subtitle}>Last 90 days</Text>
          </View>
        </View>

        {/* Metric toggle chips */}
        <View style={styles.chipRow}>
          {METRICS.map((m) => (
            <MetricChip
              key={m.key}
              metric={m}
              active={activeMetric === m.key}
              onPress={() => setActiveMetric(m.key)}
            />
          ))}
        </View>

        {/* Summary stat */}
        {latestValue !== null && (
          <View style={styles.statRow}>
            <View style={styles.statBox}>
              <Text style={styles.statLabel}>CURRENT</Text>
              <Text style={styles.statValue}>
                {activeMetric === 'volume'
                  ? Math.round(latestValue).toLocaleString()
                  : latestValue.toFixed(1)}{' '}
                <Text style={styles.statUnit}>{currentMetric.unit}</Text>
              </Text>
            </View>
            {delta !== null && (
              <View style={styles.statBox}>
                <Text style={styles.statLabel}>90-DAY CHANGE</Text>
                <Text style={[styles.statValue, { color: delta >= 0 ? theme.colors.success : theme.colors.error }]}>
                  {delta >= 0 ? '+' : ''}{delta.toFixed(1)}%
                </Text>
              </View>
            )}
          </View>
        )}

        {/* Chart */}
        <View style={styles.chartCard}>
          {isLoading ? (
            <View style={styles.chartPlaceholder}>
              <ActivityIndicator color={theme.colors.accentPrimary} />
            </View>
          ) : !hasData ? (
            <View style={styles.chartPlaceholder}>
              <Feather name="bar-chart-2" size={28} color={theme.colors.textTertiary} />
              <Text style={styles.emptyTitle}>Not enough data yet</Text>
              <Text style={styles.emptyBody}>
                Log this exercise in at least 2 sessions to see your progression.
              </Text>
            </View>
          ) : (
            <LineChart
              data={lineData}
              width={chartWidth}
              height={220}
              color={theme.colors.accentPrimary}
              dataPointsColor={theme.colors.accentPrimary}
              dataPointsRadius={4}
              startFillColor={theme.colors.accentPrimary}
              endFillColor={theme.colors.bgSurface2}
              startOpacity={0.22}
              endOpacity={0}
              areaChart
              curved
              hideRules
              hideAxesAndRules={false}
              xAxisColor={theme.colors.borderDefault}
              yAxisColor={theme.colors.borderDefault}
              xAxisLabelTextStyle={styles.axisLabel}
              yAxisTextStyle={styles.axisLabel}
              maxValue={chartMax}
              isAnimated
              animationDuration={theme.animation.dataIntensive}
              spacing={chartWidth / Math.max(lineData.length - 1, 1)}
              initialSpacing={0}
            />
          )}
        </View>

        {/* Session breakdown */}
        {hasData && (
          <View style={styles.section}>
            <Text style={styles.sectionLabel}>SESSION HISTORY</Text>
            {[...(data ?? [])].reverse().map((point) => (
              <View key={point.date} style={styles.sessionRow}>
                <Text style={styles.sessionDate}>
                  {format(new Date(point.date + 'T00:00:00'), 'MMM d, yyyy')}
                </Text>
                <View style={styles.sessionStats}>
                  <Text style={styles.sessionStat}>
                    {point.estimatedOneRM.toFixed(1)} kg 1RM
                  </Text>
                  <Text style={styles.sessionStatMuted}>
                    {point.maxWeight} kg · {Math.round(point.totalVolume).toLocaleString()} vol
                  </Text>
                </View>
              </View>
            ))}
          </View>
        )}

      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: {
    flex: 1,
    backgroundColor: theme.colors.bgSurface2,
  },
  scroll: {
    paddingTop: theme.spacing.xl,
    paddingBottom: theme.spacing.massive,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: theme.spacing.md,
    paddingHorizontal: theme.spacing.xxl,
    marginBottom: theme.spacing.xl,
  },
  headerText: {
    flex: 1,
    gap: theme.spacing.xs,
  },
  exerciseName: {
    ...theme.typography.sectionTitle,
    color: theme.colors.textPrimary,
    lineHeight: 26,
  },
  subtitle: {
    ...theme.typography.captionMuted,
    color: theme.colors.textTertiary,
  },
  chipRow: {
    flexDirection: 'row',
    gap: theme.spacing.sm,
    paddingHorizontal: theme.spacing.xxl,
    marginBottom: theme.spacing.xl,
  },
  chip: {
    paddingHorizontal: theme.spacing.md,
    paddingVertical: theme.spacing.sm,
    borderRadius: theme.radius.pill,
    borderWidth: 1,
    borderColor: theme.colors.borderStrong,
    backgroundColor: theme.colors.bgSurface1,
  },
  chipActive: {
    borderColor: theme.colors.accentPrimary,
    backgroundColor: theme.colors.accentPrimaryMuted,
  },
  chipText: {
    ...theme.typography.captionMuted,
    color: theme.colors.textSecondary,
  },
  chipTextActive: {
    color: theme.colors.accentPrimary,
  },
  statRow: {
    flexDirection: 'row',
    gap: theme.spacing.md,
    paddingHorizontal: theme.spacing.xxl,
    marginBottom: theme.spacing.xl,
  },
  statBox: {
    flex: 1,
    backgroundColor: theme.colors.bgSurface1,
    borderRadius: theme.radius.button,
    borderWidth: 1,
    borderColor: theme.colors.borderDefault,
    padding: theme.spacing.md,
    gap: theme.spacing.xs,
    alignItems: 'center',
  },
  statLabel: {
    ...theme.typography.captionMuted,
    color: theme.colors.textTertiary,
    letterSpacing: 0.8,
    textTransform: 'uppercase',
  },
  statValue: {
    ...theme.typography.monoDataSmall,
    color: theme.colors.accentPrimary,
  },
  statUnit: {
    ...theme.typography.captionMuted,
    color: theme.colors.textTertiary,
  },
  chartCard: {
    marginHorizontal: theme.spacing.xxl,
    backgroundColor: theme.colors.bgSurface1,
    borderRadius: theme.radius.card,
    borderWidth: 1,
    borderColor: theme.colors.borderDefault,
    padding: theme.spacing.lg,
    marginBottom: theme.spacing.xl,
  },
  chartPlaceholder: {
    height: 220,
    alignItems: 'center',
    justifyContent: 'center',
    gap: theme.spacing.md,
  },
  emptyTitle: {
    ...theme.typography.bodyBold,
    color: theme.colors.textSecondary,
  },
  emptyBody: {
    ...theme.typography.captionMuted,
    color: theme.colors.textTertiary,
    textAlign: 'center',
    paddingHorizontal: theme.spacing.lg,
  },
  axisLabel: {
    ...theme.typography.captionMuted,
    color: theme.colors.textTertiary,
    fontSize: 10,
  },
  section: {
    paddingHorizontal: theme.spacing.xxl,
    gap: theme.spacing.sm,
  },
  sectionLabel: {
    ...theme.typography.captionMuted,
    color: theme.colors.textTertiary,
    letterSpacing: 1.2,
    textTransform: 'uppercase',
    marginBottom: theme.spacing.xs,
  },
  sessionRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: theme.spacing.md,
    borderBottomWidth: 1,
    borderBottomColor: theme.colors.borderDefault,
  },
  sessionDate: {
    ...theme.typography.bodyCore,
    color: theme.colors.textSecondary,
  },
  sessionStats: {
    alignItems: 'flex-end',
    gap: theme.spacing.xs,
  },
  sessionStat: {
    ...theme.typography.monoDataSmall,
    color: theme.colors.textPrimary,
  },
  sessionStatMuted: {
    ...theme.typography.captionMuted,
    color: theme.colors.textTertiary,
  },
});
