import { useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/lib/supabaseClient';
import { getIsConnected } from '@/lib/netUtils';
import { useAuthStore } from '@/store/authStore';
import { storage } from '@/lib/mmkv';
import type { HabitWithToday } from './useTodayHabits';
import type { Database } from '@/types/database.types';

type HabitInsert = Database['public']['Tables']['habits']['Insert'];

export interface CreateHabitInput {
  id: string;
  name: string;
  description?: string;
  color: string;
  target_per_day: number;
}

interface CreateHabitContext {
  prev: HabitWithToday[] | undefined;
}

export function useCreateHabit() {
  const userId = useAuthStore((s) => s.userId);
  const queryClient = useQueryClient();

  return useMutation<void, Error, CreateHabitInput, CreateHabitContext>({
    onMutate: async (input) => {
      await queryClient.cancelQueries({ queryKey: ['today_habits', userId] });
      const prev = queryClient.getQueryData<HabitWithToday[]>(['today_habits', userId]);

      const optimistic: HabitWithToday = {
        id: input.id,
        user_id: userId!,
        name: input.name,
        description: input.description ?? null,
        color: input.color,
        target_per_day: input.target_per_day,
        is_archived: false,
        sort_order: 9999,
        created_at: new Date().toISOString(),
        today_count: 0,
      };

      queryClient.setQueryData<HabitWithToday[]>(['today_habits', userId], (old) => [
        ...(old ?? []),
        optimistic,
      ]);

      return { prev };
    },

    mutationFn: async (input) => {
      const isConnected = await getIsConnected();

      const payload: HabitInsert = {
        id: input.id,
        user_id: userId!,
        name: input.name,
        description: input.description,
        color: input.color,
        target_per_day: input.target_per_day,
      };

      if (isConnected) {
        const { error } = await supabase.from('habits').insert(payload);
        if (error) throw error;
      } else {
        const queueKey = `${userId}_sync_queue`;
        const raw = storage.getString(queueKey);
        const queue: unknown[] = raw ? JSON.parse(raw) : [];
        queue.push({ action: 'upsert', table: 'habits', data: payload });
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
