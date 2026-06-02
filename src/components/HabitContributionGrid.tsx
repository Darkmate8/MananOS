import { useRef, useMemo } from 'react';
import { View, Text, ScrollView, Pressable, StyleSheet } from 'react-native';
import { theme } from '@/lib/theme';
import {
  buildGrid,
  intensityColor,
  CELL_SIZE,
  CELL_GAP,
  CELL_STEP,
  MONTH_ROW_HEIGHT,
  DAY_LABEL_WIDTH,
  TOTAL_GRID_WIDTH,
  DAY_LABEL_CHARS,
  GRID_LEGEND_COLORS,
} from '@/lib/habitUtils';

interface HabitContributionGridProps {
  completionsMap: Record<string, number>;
  targetPerDay: number;
  onTodayTap?: () => void;
  showLegend?: boolean;
  showHint?: boolean;
}

export function HabitContributionGrid({
  completionsMap,
  targetPerDay,
  onTodayTap,
  showLegend = true,
  showHint = false,
}: HabitContributionGridProps) {
  const scrollRef = useRef<ScrollView>(null);
  const { weeks, todayStr, monthLabels } = useMemo(() => buildGrid(), []);

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
            {/* Month labels row */}
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

            {/* 7 rows × 52 columns */}
            {Array.from({ length: 7 }, (_, rowIndex) => (
              <View key={rowIndex} style={styles.gridRow}>
                {weeks.map((week, colIndex) => {
                  const cell = week[rowIndex];
                  const count = completionsMap[cell.dateStr] ?? 0;
                  const isToday = cell.dateStr === todayStr;
                  const bgColor = cell.isFuture
                    ? 'transparent'
                    : intensityColor(count, targetPerDay);

                  if (isToday && onTodayTap) {
                    return (
                      <Pressable
                        key={colIndex}
                        onPress={onTodayTap}
                        style={[styles.cell, { backgroundColor: bgColor }, styles.cellToday]}
                      />
                    );
                  }

                  return (
                    <View
                      key={colIndex}
                      style={[
                        styles.cell,
                        { backgroundColor: bgColor },
                        isToday && styles.cellToday,
                      ]}
                    />
                  );
                })}
              </View>
            ))}
          </View>
        </ScrollView>
      </View>

      {/* Footer: hint + legend */}
      {(showLegend || showHint) && (
        <View style={styles.footer}>
          <Text style={styles.hintText}>{showHint ? 'Tap a cell to log' : ''}</Text>
          {showLegend && (
            <View style={styles.legend}>
              <Text style={styles.legendText}>Less</Text>
              {GRID_LEGEND_COLORS.map((color, i) => (
                <View key={i} style={[styles.legendCell, { backgroundColor: color }]} />
              ))}
              <Text style={styles.legendText}>More</Text>
            </View>
          )}
        </View>
      )}
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
  footer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
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
