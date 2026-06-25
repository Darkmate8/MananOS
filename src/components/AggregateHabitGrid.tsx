import { useMemo, useRef, useState } from 'react';
import { View, Text, ScrollView, Pressable, StyleSheet } from 'react-native';
import { format } from 'date-fns';
import { theme } from '@/lib/theme';
import {
  buildGrid,
  CELL_SIZE,
  CELL_GAP,
  CELL_STEP,
  MONTH_ROW_HEIGHT,
  DAY_LABEL_WIDTH,
  TOTAL_GRID_WIDTH,
  DAY_LABEL_CHARS,
  GRID_LEGEND_COLORS,
} from '@/lib/habitUtils';

export interface DayAggregate {
  completed: number;
  total: number;
}

interface AggregateHabitGridProps {
  /** dateStr -> { habits completed that day, total active habits } */
  aggregateMap: Record<string, DayAggregate>;
  totalHabits: number;
}

function ratioColor(completed: number, total: number): string {
  if (total <= 0 || completed <= 0) return theme.colors.habitGrid.empty;
  const ratio = completed / total;
  if (ratio > 0.75) return theme.colors.habitGrid.grid100;
  if (ratio > 0.5) return theme.colors.habitGrid.grid75;
  if (ratio > 0.25) return theme.colors.habitGrid.grid50;
  return theme.colors.habitGrid.grid25;
}

export function AggregateHabitGrid({ aggregateMap, totalHabits }: AggregateHabitGridProps) {
  const scrollRef = useRef<ScrollView>(null);
  const { weeks, todayStr, monthLabels } = useMemo(() => buildGrid(), []);
  const [selected, setSelected] = useState<string | null>(null);

  const selectedAggregate = selected ? aggregateMap[selected] : undefined;

  return (
    <View style={styles.wrapper}>
      <View style={styles.gridLayout}>
        {/* Day labels */}
        <View style={[styles.dayLabels, { marginTop: MONTH_ROW_HEIGHT + 4 }]}>
          {DAY_LABEL_CHARS.map((label, i) => (
            <View key={i} style={styles.dayLabelCell}>
              {label ? <Text style={styles.dayLabel}>{label}</Text> : null}
            </View>
          ))}
        </View>

        {/* Horizontal scroll: month labels + grid */}
        <ScrollView
          ref={scrollRef}
          horizontal
          showsHorizontalScrollIndicator={false}
          onLayout={() => scrollRef.current?.scrollToEnd({ animated: false })}
        >
          <View>
            <View style={styles.monthRow}>
              {monthLabels.map(({ label, col }) => (
                <Text
                  key={`${label}-${col}`}
                  style={[styles.monthLabel, { position: 'absolute', left: col * CELL_STEP }]}
                >
                  {label}
                </Text>
              ))}
            </View>

            {Array.from({ length: 7 }, (_, rowIndex) => (
              <View key={rowIndex} style={styles.gridRow}>
                {weeks.map((week, colIndex) => {
                  const cell = week[rowIndex];
                  const agg = aggregateMap[cell.dateStr];
                  const bgColor = cell.isFuture
                    ? 'transparent'
                    : ratioColor(agg?.completed ?? 0, agg?.total ?? totalHabits);
                  const isToday = cell.dateStr === todayStr;
                  const isSelected = cell.dateStr === selected;

                  if (cell.isFuture) {
                    return <View key={colIndex} style={styles.cell} />;
                  }
                  return (
                    <Pressable
                      key={colIndex}
                      onPress={() => setSelected((prev) => (prev === cell.dateStr ? null : cell.dateStr))}
                      style={[
                        styles.cell,
                        { backgroundColor: bgColor },
                        isToday && styles.cellToday,
                        isSelected && styles.cellSelected,
                      ]}
                    />
                  );
                })}
              </View>
            ))}
          </View>
        </ScrollView>
      </View>

      {/* Footer: tooltip (selected day) or hint + legend */}
      <View style={styles.footer}>
        {selectedAggregate !== undefined && selected ? (
          <View style={styles.tooltip}>
            <Text style={styles.tooltipDate}>{format(new Date(selected), 'MMM d, yyyy')}</Text>
            <Text style={styles.tooltipCount}>
              {selectedAggregate.completed} / {selectedAggregate.total} habits done
            </Text>
          </View>
        ) : selected ? (
          <View style={styles.tooltip}>
            <Text style={styles.tooltipDate}>{format(new Date(selected), 'MMM d, yyyy')}</Text>
            <Text style={styles.tooltipCount}>0 / {totalHabits} habits done</Text>
          </View>
        ) : (
          <Text style={styles.hintText}>Tap a cell for details</Text>
        )}
        <View style={styles.legend}>
          <Text style={styles.legendText}>Less</Text>
          {GRID_LEGEND_COLORS.map((color, i) => (
            <View key={i} style={[styles.legendCell, { backgroundColor: color }]} />
          ))}
          <Text style={styles.legendText}>More</Text>
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  wrapper: {
    gap: theme.spacing.md,
  },
  gridLayout: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: theme.spacing.xs,
  },
  dayLabels: {
    width: DAY_LABEL_WIDTH,
  },
  dayLabelCell: {
    height: CELL_SIZE,
    marginBottom: CELL_GAP,
    justifyContent: 'center',
    alignItems: 'flex-end',
  },
  dayLabel: {
    fontSize: 9,
    fontFamily: theme.fonts.body.fontFamily,
    color: theme.colors.textTertiary,
  },
  monthRow: {
    height: MONTH_ROW_HEIGHT,
    width: TOTAL_GRID_WIDTH,
    marginBottom: 4,
  },
  monthLabel: {
    fontSize: 9,
    fontFamily: theme.fonts.body.fontFamily,
    color: theme.colors.textTertiary,
  },
  gridRow: {
    flexDirection: 'row',
    gap: CELL_GAP,
    marginBottom: CELL_GAP,
  },
  cell: {
    width: CELL_SIZE,
    height: CELL_SIZE,
    borderRadius: 2,
  },
  cellToday: {
    borderWidth: 1,
    borderColor: theme.colors.textSecondary,
  },
  cellSelected: {
    borderWidth: 1,
    borderColor: theme.colors.accentPrimary,
  },
  footer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: theme.spacing.md,
  },
  tooltip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: theme.spacing.sm,
    backgroundColor: theme.colors.bgSurface2,
    borderRadius: theme.radius.pill,
    borderWidth: 1,
    borderColor: theme.colors.borderDefault,
    paddingHorizontal: theme.spacing.md,
    paddingVertical: theme.spacing.xs,
  },
  tooltipDate: {
    ...theme.typography.captionMuted,
    color: theme.colors.textSecondary,
  },
  tooltipCount: {
    ...theme.typography.captionMuted,
    color: theme.colors.accentPrimary,
  },
  hintText: {
    fontSize: 10,
    fontFamily: theme.fonts.body.fontFamily,
    color: theme.colors.textTertiary,
  },
  legend: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: theme.spacing.xs,
  },
  legendCell: {
    width: 10,
    height: 10,
    borderRadius: 2,
  },
  legendText: {
    fontSize: 10,
    fontFamily: theme.fonts.body.fontFamily,
    color: theme.colors.textTertiary,
  },
});
