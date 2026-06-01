import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/lib/supabaseClient';
import { useAuthStore } from '@/store/authStore';
import type { Database } from '@/types/database.types';

export type HabitRow = Database['public']['Tables']['habits']['Row'];
export type HabitCompletionRow = Database['public']['Tables']['habit_completions']['Row'];

export interface HabitWithToday extends HabitRow {
  today_count: number;
}

function todayDate(): string {
  return new Date().toISOString().split('T')[0];
}

async function fetchTodayHabits(userId: string): Promise<HabitWithToday[]> {
  const today = todayDate();

  const [habitsResult, completionsResult] = await Promise.all([
    supabase
      .from('habits')
      .select('*')
      .eq('user_id', userId)
      .eq('is_archived', false)
      .order('sort_order', { ascending: true }),
    supabase
      .from('habit_completions')
      .select('habit_id, count')
      .eq('user_id', userId)
      .eq('completed_on', today),
  ]);

  if (habitsResult.error) throw habitsResult.error;
  if (completionsResult.error) throw completionsResult.error;

  const completionMap = new Map<string, number>();
  (completionsResult.data ?? []).forEach((c) => {
    completionMap.set(c.habit_id, c.count);
  });

  return (habitsResult.data ?? []).map((h) => ({
    ...h,
    today_count: completionMap.get(h.id) ?? 0,
  }));
}

export function useTodayHabits() {
  const userId = useAuthStore((s) => s.userId);

  return useQuery<HabitWithToday[]>({
    queryKey: ['today_habits', userId],
    enabled: !!userId,
    staleTime: 1000 * 60 * 2,
    queryFn: () => fetchTodayHabits(userId!),
  });
}
