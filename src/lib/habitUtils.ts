import { theme } from './theme';

export const CELL_SIZE = 11;
export const CELL_GAP = 2;
export const CELL_STEP = CELL_SIZE + CELL_GAP;
export const MONTH_ROW_HEIGHT = 16;
export const DAY_LABEL_WIDTH = 18;
export const TOTAL_GRID_WIDTH = 52 * CELL_SIZE + 51 * CELL_GAP; // 674px

export const MONTHS = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'];
export const DAY_LABEL_CHARS = ['M', '', 'W', '', 'F', '', 'S'];

export const GRID_LEGEND_COLORS = [
  theme.colors.habitGrid.empty,
  theme.colors.habitGrid.grid25,
  theme.colors.habitGrid.grid50,
  theme.colors.habitGrid.grid75,
  theme.colors.habitGrid.grid100,
] as const;

export type GridCell = { dateStr: string; isFuture: boolean };

export interface GridData {
  weeks: GridCell[][];
  todayStr: string;
  monthLabels: Array<{ label: string; col: number }>;
}

export function buildGrid(): GridData {
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const todayStr = today.toISOString().split('T')[0];

  const dow = today.getDay(); // 0=Sun
  const daysSinceMon = dow === 0 ? 6 : dow - 1;
  const thisMonday = new Date(today);
  thisMonday.setDate(today.getDate() - daysSinceMon);

  const gridStart = new Date(thisMonday);
  gridStart.setDate(thisMonday.getDate() - 51 * 7);

  const weeks: GridCell[][] = [];
  const monthLabels: Array<{ label: string; col: number }> = [];
  let lastMonth = -1;

  for (let w = 0; w < 52; w++) {
    const week: GridCell[] = [];
    for (let d = 0; d < 7; d++) {
      const date = new Date(gridStart);
      date.setDate(gridStart.getDate() + w * 7 + d);
      const dateStr = date.toISOString().split('T')[0];
      week.push({ dateStr, isFuture: dateStr > todayStr });
    }
    const month = new Date(week[0].dateStr).getMonth();
    if (month !== lastMonth) {
      monthLabels.push({ label: MONTHS[month], col: w });
      lastMonth = month;
    }
    weeks.push(week);
  }

  return { weeks, todayStr, monthLabels };
}

export function intensityColor(count: number, target: number): string {
  if (count <= 0) return theme.colors.habitGrid.empty;
  const ratio = count / target;
  if (ratio >= 1) return theme.colors.habitGrid.grid100;
  if (ratio >= 0.75) return theme.colors.habitGrid.grid75;
  if (ratio >= 0.5) return theme.colors.habitGrid.grid50;
  return theme.colors.habitGrid.grid25;
}

export function calcStreak(completionsMap: Record<string, number>, target: number): number {
  const cursor = new Date();
  cursor.setHours(0, 0, 0, 0);
  const todayStr = cursor.toISOString().split('T')[0];
  if ((completionsMap[todayStr] ?? 0) < target) {
    cursor.setDate(cursor.getDate() - 1);
  }
  let streak = 0;
  for (let i = 0; i < 365; i++) {
    const dateStr = cursor.toISOString().split('T')[0];
    if ((completionsMap[dateStr] ?? 0) >= target) {
      streak++;
      cursor.setDate(cursor.getDate() - 1);
    } else {
      break;
    }
  }
  return streak;
}

export function calcTotal(completionsMap: Record<string, number>, target: number): number {
  return Object.values(completionsMap).filter((c) => c >= target).length;
}
