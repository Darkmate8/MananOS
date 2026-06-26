import { useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/lib/supabaseClient';
import { useAuthStore } from '@/store/authStore';
import { getSyncQueue, setSyncQueue } from '@/lib/mmkv';
import { generateId } from '@/lib/generateId';
import { getIsConnected } from '@/lib/netUtils';
import type { HabitWithToday } from './useTodayHabits';

interface DeleteContext {
  prevToday: HabitWithToday[] | undefined;
  queryKey: unknown[];
}

export function useDeleteHabit() {
  const userId = useAuthStore((s) => s.userId);
  const queryClient = useQueryClient();

  return useMutation<void, Error, string, DeleteContext>({
    // ─── Phase A: Optimistic UI Update ───────────────────────────────────────
    onMutate: async (habitId) => {
      const queryKey = ['today_habits', userId];
      await queryClient.cancelQueries({ queryKey });
      const prevToday = queryClient.getQueryData<HabitWithToday[]>(queryKey);
      queryClient.setQueryData<HabitWithToday[]>(queryKey, (old) =>
        (old ?? []).filter((h) => h.id !== habitId),
      );
      return { prevToday, queryKey };
    },

    // ─── Phase B: Connectivity Verification ──────────────────────────────────
    mutationFn: async (habitId) => {
      if (!userId) throw new Error('No authenticated user');
      const isConnected = await getIsConnected();
      if (isConnected) {
        const { error } = await supabase
          .from('habits')
          .update({ is_archived: true })
          .eq('id', habitId)
          .eq('user_id', userId);
        if (error) throw new Error(error.message);
      } else {
        const queue = JSON.parse(getSyncQueue(userId)) as unknown[];
        queue.push({ id: generateId(), action: 'ARCHIVE_HABIT', table: 'habits', payload: { id: habitId } });
        setSyncQueue(userId, queue);
      }
    },

    // ─── Phase C: Error & Settlement ─────────────────────────────────────────
    onError: (_err, _vars, context) => {
      if (context?.prevToday !== undefined) {
        queryClient.setQueryData(context.queryKey, context.prevToday);
      }
    },
    onSettled: (_data, _err, _vars, context) => {
      if (context?.queryKey) {
        queryClient.invalidateQueries({ queryKey: context.queryKey });
      }
      queryClient.invalidateQueries({ queryKey: ['all_habits_completions', userId] });
    },
  });
}
