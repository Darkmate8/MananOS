import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/lib/supabaseClient';
import { useAuthStore } from '@/store/authStore';
import type { MealType } from '@/types/database.types';

export type { MealType };

export interface MealItemView {
  id: string;
  mealId: string;
  quantity: number;
  unit: string;
  kcal: number;
  proteinG: number;
  carbsG: number;
  fatG: number;
  createdAt: string;
  foodName: string;
  foodBrand: string | null;
}

export interface MealWithItems {
  id: string;
  mealType: MealType;
  eatenAt: string;
  notes: string | null;
  items: MealItemView[];
}

export interface NutritionTotals {
  kcal: number;
  proteinG: number;
  carbsG: number;
  fatG: number;
}

export interface NutritionGoals {
  kcalGoal: number;
  proteinGoalG: number;
}

export interface NutritionTodayData {
  meals: MealWithItems[];
  totals: NutritionTotals;
  goals: NutritionGoals;
}

function getTodayRange(): { start: string; end: string } {
  const now = new Date();
  const start = new Date(now.getFullYear(), now.getMonth(), now.getDate()).toISOString();
  const end = new Date(now.getFullYear(), now.getMonth(), now.getDate() + 1).toISOString();
  return { start, end };
}

function computeTotals(meals: MealWithItems[]): NutritionTotals {
  return meals.reduce<NutritionTotals>(
    (acc, meal) => {
      meal.items.forEach((item) => {
        acc.kcal += item.kcal;
        acc.proteinG += item.proteinG;
        acc.carbsG += item.carbsG;
        acc.fatG += item.fatG;
      });
      return acc;
    },
    { kcal: 0, proteinG: 0, carbsG: 0, fatG: 0 },
  );
}

async function fetchNutritionToday(userId: string): Promise<NutritionTodayData> {
  const { start, end } = getTodayRange();

  const [mealsResult, profileResult] = await Promise.all([
    supabase
      .from('meals')
      .select(`
        id, meal_type, eaten_at, notes,
        meal_items (
          id, quantity, unit, kcal, protein_g, carbs_g, fat_g, created_at,
          foods ( name, brand )
        )
      `)
      .eq('user_id', userId)
      .gte('eaten_at', start)
      .lt('eaten_at', end)
      .order('eaten_at', { ascending: true }),
    supabase
      .from('profile')
      .select('kcal_goal, protein_goal_g')
      .eq('user_id', userId)
      .maybeSingle(),
  ]);

  if (mealsResult.error) throw mealsResult.error;
  if (profileResult.error) throw profileResult.error;

  type RawMealItem = {
    id: string;
    quantity: number;
    unit: string;
    kcal: number;
    protein_g: number;
    carbs_g: number;
    fat_g: number;
    created_at: string;
    foods: { name: string; brand: string | null } | null;
  };

  type RawMeal = {
    id: string;
    meal_type: string;
    eaten_at: string;
    notes: string | null;
    meal_items: RawMealItem[];
  };

  const rawMeals = (mealsResult.data ?? []) as RawMeal[];

  const meals: MealWithItems[] = rawMeals
    .map((m) => ({
      id: m.id,
      mealType: m.meal_type as MealType,
      eatenAt: m.eaten_at,
      notes: m.notes ?? null,
      items: (m.meal_items ?? []).map((item) => ({
        id: item.id,
        mealId: m.id,
        quantity: Number(item.quantity),
        unit: item.unit,
        kcal: Number(item.kcal),
        proteinG: Number(item.protein_g),
        carbsG: Number(item.carbs_g),
        fatG: Number(item.fat_g),
        createdAt: item.created_at,
        foodName: item.foods?.name ?? 'Unknown',
        foodBrand: item.foods?.brand ?? null,
      })),
    }))
    .filter((m) => m.items.length > 0);

  return {
    meals,
    totals: computeTotals(meals),
    goals: {
      kcalGoal: profileResult.data?.kcal_goal ?? 2200,
      proteinGoalG: profileResult.data?.protein_goal_g ?? 150,
    },
  };
}

export function useNutritionToday() {
  const userId = useAuthStore((s) => s.userId);

  return useQuery<NutritionTodayData>({
    queryKey: ['nutrition_today', userId],
    enabled: !!userId,
    staleTime: 1000 * 60,
    queryFn: () => fetchNutritionToday(userId!),
  });
}
