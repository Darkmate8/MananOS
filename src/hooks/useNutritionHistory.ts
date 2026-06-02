import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/lib/supabaseClient';
import { useAuthStore } from '@/store/authStore';

export interface DayNutrition {
  date: string; // 'YYYY-MM-DD'
  label: string; // 'Mon', 'Tue', etc.
  kcal: number;
  proteinG: number;
  carbsG: number;
  fatG: number;
}

export interface NutritionHistoryData {
  days: DayNutrition[];
  kcalGoal: number;
  proteinGoalG: number;
}

const DAY_LABELS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

function getLast7Days(): { date: string; label: string }[] {
  const result: { date: string; label: string }[] = [];
  for (let i = 6; i >= 0; i--) {
    const d = new Date();
    d.setDate(d.getDate() - i);
    const yyyy = d.getFullYear();
    const mm = String(d.getMonth() + 1).padStart(2, '0');
    const dd = String(d.getDate()).padStart(2, '0');
    result.push({
      date: `${yyyy}-${mm}-${dd}`,
      label: DAY_LABELS[d.getDay()],
    });
  }
  return result;
}

async function fetchNutritionHistory(userId: string): Promise<NutritionHistoryData> {
  const days = getLast7Days();
  const startDate = days[0].date;
  const endDate = days[days.length - 1].date;

  const rangeStart = `${startDate}T00:00:00`;
  const rangeEnd = new Date(`${endDate}T00:00:00`);
  rangeEnd.setDate(rangeEnd.getDate() + 1);
  const rangeEndStr = rangeEnd.toISOString().slice(0, 19);

  const [mealsResult, profileResult] = await Promise.all([
    supabase
      .from('meals')
      .select(`
        eaten_at,
        meal_items ( kcal, protein_g, carbs_g, fat_g )
      `)
      .eq('user_id', userId)
      .gte('eaten_at', rangeStart)
      .lt('eaten_at', rangeEndStr),
    supabase
      .from('profile')
      .select('kcal_goal, protein_goal_g')
      .eq('user_id', userId)
      .maybeSingle(),
  ]);

  if (mealsResult.error) throw mealsResult.error;
  if (profileResult.error) throw profileResult.error;

  type RawMealItem = { kcal: number; protein_g: number; carbs_g: number; fat_g: number };
  type RawMeal = { eaten_at: string; meal_items: RawMealItem[] };

  const rawMeals = (mealsResult.data ?? []) as RawMeal[];

  const aggregated = new Map<string, { kcal: number; proteinG: number; carbsG: number; fatG: number }>();

  rawMeals.forEach((meal) => {
    const dateKey = meal.eaten_at.slice(0, 10);
    if (!aggregated.has(dateKey)) {
      aggregated.set(dateKey, { kcal: 0, proteinG: 0, carbsG: 0, fatG: 0 });
    }
    const entry = aggregated.get(dateKey)!;
    meal.meal_items.forEach((item) => {
      entry.kcal += Number(item.kcal);
      entry.proteinG += Number(item.protein_g);
      entry.carbsG += Number(item.carbs_g);
      entry.fatG += Number(item.fat_g);
    });
  });

  const result: DayNutrition[] = days.map(({ date, label }) => {
    const entry = aggregated.get(date) ?? { kcal: 0, proteinG: 0, carbsG: 0, fatG: 0 };
    return { date, label, ...entry };
  });

  return {
    days: result,
    kcalGoal: profileResult.data?.kcal_goal ?? 2200,
    proteinGoalG: profileResult.data?.protein_goal_g ?? 150,
  };
}

export function useNutritionHistory() {
  const userId = useAuthStore((s) => s.userId);

  return useQuery<NutritionHistoryData>({
    queryKey: ['nutrition_history_7d', userId],
    enabled: !!userId,
    staleTime: 1000 * 60 * 5,
    queryFn: () => fetchNutritionHistory(userId!),
  });
}
