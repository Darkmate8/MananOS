import { useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/lib/supabaseClient';
import { useAuthStore } from '@/store/authStore';
import { storage } from '@/lib/mmkv';
import { getIsConnected } from '@/lib/netUtils';
import { recomputeTotals } from '@/lib/nutritionUtils';
import type { NutritionTodayData } from './useNutritionToday';

interface DeleteContext {
  prev: NutritionTodayData | undefined;
}

export function useDeleteMealItem() {
  const userId = useAuthStore((s) => s.userId);
  const queryClient = useQueryClient();

  return useMutation<void, Error, string, DeleteContext>({
    onMutate: async (itemId) => {
      await queryClient.cancelQueries({ queryKey: ['nutrition_today', userId] });
      const prev = queryClient.getQueryData<NutritionTodayData>(['nutrition_today', userId]);

      queryClient.setQueryData<NutritionTodayData>(['nutrition_today', userId], (old) => {
        if (!old) return old;
        const meals = old.meals
          .map((meal) => ({ ...meal, items: meal.items.filter((it) => it.id !== itemId) }))
          .filter((meal) => meal.items.length > 0);
        return { ...old, meals, totals: recomputeTotals(meals) };
      });

      return { prev };
    },

    mutationFn: async (itemId) => {
      const isConnected = await getIsConnected();

      if (isConnected) {
        const { error } = await supabase.from('meal_items').delete().eq('id', itemId);
        if (error) throw error;
      } else {
        const queueKey = `${userId}_sync_queue`;
        const raw = storage.getString(queueKey);
        const queue: unknown[] = raw ? JSON.parse(raw) : [];
        queue.push({ action: 'delete', table: 'meal_items', filter: { id: itemId } });
        storage.set(queueKey, JSON.stringify(queue));
      }
    },

    onError: (_err, _itemId, context) => {
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
