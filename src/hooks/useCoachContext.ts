import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/lib/supabaseClient';
import { useAuthStore } from '@/store/authStore';

export interface CoachGoals {
  kcal_goal: number;
  protein_goal_g: number;
  steps_goal: number;
  water_goal_cups: number;
}

export interface CoachSet {
  exercise: string;
  set_index: number;
  weight_kg: number | null;
  reps: number | null;
  rpe: number | null;
  volume: number | null;
}

export interface CoachWorkout {
  date: string;
  title: string | null;
  sets: CoachSet[];
}

export interface CoachMacroDay {
  date: string;
  kcal: number;
  protein_g: number;
  carbs_g: number;
  fat_g: number;
}

export interface CoachContext {
  goals: CoachGoals;
  last_4_workouts: CoachWorkout[];
  macros_7d: CoachMacroDay[];
  habit_grid_30d: Record<string, Record<string, number>>;
}

async function fetchCoachContext(userId: string): Promise<CoachContext> {
  const today = new Date();
  const sevenDaysAgo = new Date(today);
  sevenDaysAgo.setDate(today.getDate() - 7);
  const thirtyDaysAgo = new Date(today);
  thirtyDaysAgo.setDate(today.getDate() - 30);

  const [profileRes, sessionsRes, mealItemsRes, habitsRes, completionsRes] = await Promise.all([
    supabase
      .from('profile')
      .select('kcal_goal, protein_goal_g, steps_goal, water_goal_cups')
      .eq('user_id', userId)
      .single(),

    supabase
      .from('workout_sessions')
      .select(
        'id, started_at, title, workout_sets(set_index, weight_kg, reps, rpe, volume, exercises!exercise_id(name))',
      )
      .eq('user_id', userId)
      .not('ended_at', 'is', null)
      .order('started_at', { ascending: false })
      .limit(4),

    supabase
      .from('meal_items')
      .select('kcal, protein_g, carbs_g, fat_g, meals!inner(eaten_at)')
      .eq('user_id', userId)
      .gte('meals.eaten_at', sevenDaysAgo.toISOString()),

    supabase
      .from('habits')
      .select('id, name')
      .eq('user_id', userId)
      .eq('is_archived', false),

    supabase
      .from('habit_completions')
      .select('habit_id, completed_on, count')
      .eq('user_id', userId)
      .gte('completed_on', thirtyDaysAgo.toISOString().split('T')[0]),
  ]);

  const p = profileRes.data;
  const goals: CoachGoals = {
    kcal_goal: p?.kcal_goal ?? 2200,
    protein_goal_g: p?.protein_goal_g ?? 150,
    steps_goal: p?.steps_goal ?? 8000,
    water_goal_cups: p?.water_goal_cups ?? 8,
  };

  type RawSession = {
    id: string;
    started_at: string;
    title: string | null;
    workout_sets: Array<{
      set_index: number;
      weight_kg: number | null;
      reps: number | null;
      rpe: number | null;
      volume: number | null;
      exercises: { name: string } | null;
    }>;
  };

  const last_4_workouts: CoachWorkout[] = ((sessionsRes.data as unknown as RawSession[]) ?? []).map((s) => ({
    date: s.started_at,
    title: s.title,
    sets: (s.workout_sets ?? []).map((ws) => ({
      exercise: ws.exercises?.name ?? 'Unknown',
      set_index: ws.set_index,
      weight_kg: ws.weight_kg,
      reps: ws.reps,
      rpe: ws.rpe,
      volume: ws.volume,
    })),
  }));

  const macroByDate: Record<string, { kcal: number; protein_g: number; carbs_g: number; fat_g: number }> = {};
  for (const item of (mealItemsRes.data ?? []) as Array<{
    kcal: number; protein_g: number; carbs_g: number; fat_g: number;
    meals: { eaten_at: string };
  }>) {
    const dateStr = item.meals.eaten_at.split('T')[0];
    if (!macroByDate[dateStr]) {
      macroByDate[dateStr] = { kcal: 0, protein_g: 0, carbs_g: 0, fat_g: 0 };
    }
    macroByDate[dateStr].kcal += Number(item.kcal);
    macroByDate[dateStr].protein_g += Number(item.protein_g);
    macroByDate[dateStr].carbs_g += Number(item.carbs_g);
    macroByDate[dateStr].fat_g += Number(item.fat_g);
  }
  const macros_7d: CoachMacroDay[] = Object.entries(macroByDate)
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([date, v]) => ({
      date,
      kcal: Math.round(v.kcal),
      protein_g: Math.round(v.protein_g),
      carbs_g: Math.round(v.carbs_g),
      fat_g: Math.round(v.fat_g),
    }));

  const habitMap: Record<string, string> = {};
  for (const h of habitsRes.data ?? []) {
    habitMap[h.id] = h.name;
  }
  const habit_grid_30d: Record<string, Record<string, number>> = {};
  for (const c of (completionsRes.data ?? [])) {
    const dateStr = c.completed_on;
    if (!habit_grid_30d[dateStr]) habit_grid_30d[dateStr] = {};
    habit_grid_30d[dateStr][habitMap[c.habit_id] ?? c.habit_id] = c.count;
  }

  return { goals, last_4_workouts, macros_7d, habit_grid_30d };
}

export function useCoachContext() {
  const userId = useAuthStore((s) => s.userId);

  return useQuery({
    queryKey: ['coach_context', userId],
    queryFn: () => fetchCoachContext(userId!),
    enabled: !!userId,
    staleTime: 1000 * 60 * 5,
  });
}
