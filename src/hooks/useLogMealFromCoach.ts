import { useMutation, useQueryClient } from '@tanstack/react-query';
import { v4 as uuidv4 } from 'uuid';
import { supabase } from '@/lib/supabaseClient';
import { useAuthStore } from '@/store/authStore';
import { storage } from '@/lib/mmkv';
import { getIsConnected } from '@/lib/netUtils';
import { recomputeTotals } from '@/lib/nutritionUtils';
import type { MealType } from '@/types/database.types';
import type { ParsedItem } from '@/lib/nutritionMockParser';
import type { NutritionTodayData, MealWithItems, MealItemView } from './useNutritionToday';

export interface LogMealInput {
  mealType: MealType;
  items: ParsedItem[];
  notes?: string;
}

interface LogMealContext {
  prev: NutritionTodayData | undefined;
}

export function useLogMealFromCoach() {
  const userId = useAuthStore((s) => s.userId);
  const queryClient = useQueryClient();

  return useMutation<void, Error, LogMealInput, LogMealContext>({
    // ── Phase A: Optimistic UI ──────────────────────────────────────────────────
    onMutate: async ({ mealType, items }) => {
      await queryClient.cancelQueries({ queryKey: ['nutrition_today', userId] });
      const prev = queryClient.getQueryData<NutritionTodayData>(['nutrition_today', userId]);

      const mealId = uuidv4();
      const now = new Date().toISOString();

      const optimisticItems: MealItemView[] = items.map((item) => ({
        id: uuidv4(),
        mealId,
        quantity: item.quantity,
        unit: item.unit,
        kcal: item.kcal,
        proteinG: item.protein_g,
        carbsG: item.carbs_g,
        fatG: item.fat_g,
        createdAt: now,
        foodName: item.name,
        foodBrand: null,
      }));

      const optimisticMeal: MealWithItems = {
        id: mealId,
        mealType,
        eatenAt: now,
        notes: null,
        items: optimisticItems,
      };

      queryClient.setQueryData<NutritionTodayData>(['nutrition_today', userId], (old) => {
        const meals = [...(old?.meals ?? []), optimisticMeal];
        return {
          meals,
          totals: recomputeTotals(meals),
          goals: old?.goals ?? { kcalGoal: 2200, proteinGoalG: 150 },
        };
      });

      return { prev };
    },

    // ── Phase B: Connectivity check + Supabase / Queue ─────────────────────────
    mutationFn: async ({ mealType, items, notes }) => {
      if (!userId) throw new Error('Not authenticated');

      const isConnected = await getIsConnected();

      if (isConnected) {
        // 1. Resolve food IDs — select first, insert only if missing.
        //    The unique constraint is (user_id, name, brand). Brand is always null
        //    here, so we match on user_id + name only to avoid duplicate inserts.
        const foodIds: string[] = [];
        for (const item of items) {
          const { data: existing } = await supabase
            .from('foods')
            .select('id')
            .eq('user_id', userId)
            .eq('name', item.name)
            .is('brand', null)
            .maybeSingle();

          if (existing) {
            foodIds.push(existing.id);
          } else {
            const newId = uuidv4();
            const { error: insertErr } = await supabase.from('foods').insert({
              id: newId,
              user_id: userId,
              name: item.name,
              default_unit: item.unit,
              serving_size: item.quantity,
              kcal_per_serving: item.kcal,
              protein_g_per_serving: item.protein_g,
              carbs_g_per_serving: item.carbs_g,
              fat_g_per_serving: item.fat_g,
            });
            if (insertErr) throw insertErr;
            foodIds.push(newId);
          }
        }

        // 2. Insert meal record
        const mealId = uuidv4();
        const { error: mealErr } = await supabase.from('meals').insert({
          id: mealId,
          user_id: userId,
          meal_type: mealType,
          notes: notes ?? null,
        });
        if (mealErr) throw mealErr;

        // 3. Insert meal_items
        const mealItemRows = items.map((item, i) => ({
          id: uuidv4(),
          user_id: userId,
          meal_id: mealId,
          food_id: foodIds[i],
          quantity: item.quantity,
          unit: item.unit,
          kcal: item.kcal,
          protein_g: item.protein_g,
          carbs_g: item.carbs_g,
          fat_g: item.fat_g,
        }));
        const { error: itemsErr } = await supabase.from('meal_items').insert(mealItemRows);
        if (itemsErr) throw itemsErr;
      } else {
        const queueKey = `${userId}_sync_queue`;
        const raw = storage.getString(queueKey);
        const queue: unknown[] = raw ? JSON.parse(raw) : [];
        queue.push({ action: 'log_meal_from_coach', mealType, items, notes, userId });
        storage.set(queueKey, JSON.stringify(queue));
      }
    },

    // ── Phase C: Error rollback + settlement ───────────────────────────────────
    onError: (_err, _vars, context) => {
      if (context?.prev !== undefined) {
        queryClient.setQueryData(['nutrition_today', userId], context.prev);
      }
    },

    onSettled: () => {
      queryClient.invalidateQueries({ queryKey: ['nutrition_today', userId] });
      queryClient.invalidateQueries({ queryKey: ['nutrition_history_7d', userId] });
      queryClient.invalidateQueries({ queryKey: ['today_rings'] });
    },
  });
}
