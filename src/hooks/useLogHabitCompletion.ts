import { useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/lib/supabaseClient';
import { useAuthStore } from '@/store/authStore';
import { storage } from '@/lib/mmkv';
import { generateId } from '@/lib/generateId';
import { todayDateStr } from '@/lib/habitUtils';
import { getIsConnected } from '@/lib/netUtils';
import type { HabitWithToday } from './useTodayHabits';
import type { Database } from '@/types/database.types';

type HabitCompletionInsert = Database['public']['Tables']['habit_completions']['Insert'];

export interface LogHabitParams {
  habitId: string;
  currentCount: number;
  targetPerDay: number;
}

interface LogHabitContext {
  prev: HabitWithToday[] | undefined;
}

export function useLogHabitCompletion() {
  const userId = useAuthStore((s) => s.userId);
  const queryClient = useQueryClient();

  return useMutation<void, Error, LogHabitParams, LogHabitContext>({
    onMutate: async ({ habitId, currentCount, targetPerDay }) => {
      await queryClient.cancelQueries({ queryKey: ['today_habits', userId] });
      const prev = queryClient.getQueryData<HabitWithToday[]>(['today_habits', userId]);

      const newCount = currentCount >= targetPerDay ? 0 : currentCount + 1;

      queryClient.setQueryData<HabitWithToday[]>(['today_habits', userId], (old) =>
        old?.map((h) => (h.id === habitId ? { ...h, today_count: newCount } : h)) ?? [],
      );

      return { prev };
    },

    mutationFn: async ({ habitId, currentCount, targetPerDay }) => {
      const isConnected = await getIsConnected();
      const today = todayDateStr();
      const newCount = currentCount >= targetPerDay ? 0 : currentCount + 1;

      if (newCount === 0) {
        if (isConnected) {
          const { error } = await supabase
            .from('habit_completions')
            .delete()
            .eq('habit_id', habitId)
            .eq('completed_on', today);
          if (error) throw error;
        } else {
          const queueKey = `${userId}_sync_queue`;
          const raw = storage.getString(queueKey);
          const queue: unknown[] = raw ? JSON.parse(raw) : [];
          queue.push({
            action: 'delete',
            table: 'habit_completions',
            filter: { habit_id: habitId, completed_on: today },
          });
          storage.set(queueKey, JSON.stringify(queue));
        }
        return;
      }

      if (isConnected) {
        const payload: HabitCompletionInsert = {
          id: generateId(),
          user_id: userId!,
          habit_id: habitId,
          completed_on: today,
          count: newCount,
        };

        const { error } = await supabase
          .from('habit_completions')
          .upsert(payload, { onConflict: 'habit_id,completed_on' });
        if (error) throw error;
      } else {
        const payload: HabitCompletionInsert = {
          id: generateId(),
          user_id: userId!,
          habit_id: habitId,
          completed_on: today,
          count: newCount,
        };
        const queueKey = `${userId}_sync_queue`;
        const raw = storage.getString(queueKey);
        const queue: unknown[] = raw ? JSON.parse(raw) : [];
        queue.push({
          action: 'upsert',
          table: 'habit_completions',
          data: payload,
          onConflict: 'habit_id,completed_on',
        });
        storage.set(queueKey, JSON.stringify(queue));
      }
    },

    onError: (_err, _vars, context) => {
      if (context?.prev !== undefined) {
        queryClient.setQueryData(['today_habits', userId], context.prev);
      }
    },

    onSettled: () => {
      queryClient.invalidateQueries({ queryKey: ['today_habits', userId] });
    },
  });
}
