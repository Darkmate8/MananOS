import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/lib/supabaseClient';
import { useAuthStore } from '@/store/authStore';
import type { Database } from '@/types/database.types';

export type HabitRow = Database['public']['Tables']['habits']['Row'];

export interface HabitHistoryData {
  habit: HabitRow;
  completionsMap: Record<string, number>; // ISO date string -> count
}

async function fetchHabitHistory(habitId: string, userId: string): Promise<HabitHistoryData> {
  const cutoff = new Date();
  cutoff.setDate(cutoff.getDate() - 364);
  const cutoffStr = cutoff.toISOString().split('T')[0];

  const [habitRes, completionsRes] = await Promise.all([
    supabase.from('habits').select('*').eq('id', habitId).eq('user_id', userId).single(),
    supabase
      .from('habit_completions')
      .select('completed_on, count')
      .eq('habit_id', habitId)
      .eq('user_id', userId)
      .gte('completed_on', cutoffStr),
  ]);

  if (habitRes.error) throw habitRes.error;
  if (completionsRes.error) throw completionsRes.error;

  const completionsMap: Record<string, number> = {};
  for (const c of completionsRes.data ?? []) {
    completionsMap[c.completed_on] = c.count;
  }

  return { habit: habitRes.data, completionsMap };
}

export function useHabitHistory(habitId: string) {
  const userId = useAuthStore((s) => s.userId);

  return useQuery<HabitHistoryData>({
    queryKey: ['habit_history', habitId, userId],
    enabled: !!userId && !!habitId,
    staleTime: 1000 * 60 * 5,
    queryFn: () => fetchHabitHistory(habitId, userId!),
  });
}
