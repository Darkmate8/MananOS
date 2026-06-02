import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/lib/supabaseClient';
import { useAuthStore } from '@/store/authStore';
import { rollingWindowStart } from '@/lib/habitUtils';

async function fetchAllCompletions(userId: string): Promise<Record<string, Record<string, number>>> {
  const cutoffStr = rollingWindowStart();

  const { data, error } = await supabase
    .from('habit_completions')
    .select('habit_id, completed_on, count')
    .eq('user_id', userId)
    .gte('completed_on', cutoffStr);

  if (error) throw error;

  const result: Record<string, Record<string, number>> = {};
  for (const row of data ?? []) {
    if (!result[row.habit_id]) result[row.habit_id] = {};
    result[row.habit_id][row.completed_on] = row.count;
  }
  return result;
}

export function useAllHabitsCompletions() {
  const userId = useAuthStore((s) => s.userId);

  return useQuery<Record<string, Record<string, number>>>({
    queryKey: ['all_habits_completions', userId],
    enabled: !!userId,
    staleTime: 1000 * 60 * 5,
    queryFn: () => fetchAllCompletions(userId!),
  });
}
