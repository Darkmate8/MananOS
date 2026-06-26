import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/lib/supabaseClient';
import { useAuthStore } from '@/store/authStore';
import type { WeeklyNutritionRow } from '@/types/database.types';

export interface WeeklyNutritionSummary {
  days: WeeklyNutritionRow[];
  weeklyDeficitKcal: number;
  proteinHitDays: number;
  totalDays: number;
}

async function fetchWeeklyNutrition(userId: string): Promise<WeeklyNutritionSummary> {
  const cutoff = new Date();
  cutoff.setDate(cutoff.getDate() - 6);
  const cutoffStr = cutoff.toISOString().split('T')[0];

  const { data, error } = await supabase
    .from('v_weekly_nutrition')
    .select('*')
    .eq('user_id', userId)
    .gte('on_date', cutoffStr)
    .order('on_date', { ascending: true });

  if (error) throw new Error(error.message);

  const days = (data ?? []) as WeeklyNutritionRow[];
  const weeklyDeficitKcal = days.reduce((sum, d) => sum + (d.kcal_goal - d.kcal), 0);
  const proteinHitDays = days.filter((d) => d.protein_g >= d.protein_goal_g).length;

  return { days, weeklyDeficitKcal, proteinHitDays, totalDays: days.length };
}

export function useWeeklyNutrition() {
  const userId = useAuthStore((s) => s.userId);

  return useQuery<WeeklyNutritionSummary>({
    queryKey: ['weekly_nutrition', userId],
    enabled: !!userId,
    staleTime: 1000 * 60 * 5,
    queryFn: () => fetchWeeklyNutrition(userId!),
  });
}
