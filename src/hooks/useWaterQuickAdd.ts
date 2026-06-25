import { useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/lib/supabaseClient';
import { useAuthStore } from '@/store/authStore';
import { storage } from '@/lib/mmkv';
import { generateId } from '@/lib/generateId';
import { todayDateStr } from '@/lib/habitUtils';
import { getIsConnected } from '@/lib/netUtils';

// delta: +1 quick-add, -1 decrement. Cups never go below 0 (9.3).
export function useWaterQuickAdd() {
  const userId = useAuthStore((s) => s.userId);
  const queryClient = useQueryClient();

  return useMutation<void, Error, number, { prev: { water_cups_today: number } | undefined }>({
    onMutate: async (delta) => {
      await queryClient.cancelQueries({ queryKey: ['today_rings'] });
      const prev = queryClient.getQueryData<{ water_cups_today: number }>(['today_rings']);
      queryClient.setQueryData(['today_rings'], (old: Record<string, number> | undefined) =>
        old ? { ...old, water_cups_today: Math.max(0, (old.water_cups_today ?? 0) + delta) } : old,
      );
      return { prev };
    },

    mutationFn: async (delta) => {
      const isConnected = await getIsConnected();
      const loggedOn = todayDateStr();
      const existingQuery = await supabase
        .from('water_logs')
        .select('id, cups')
        .eq('user_id', userId!)
        .eq('logged_on', loggedOn)
        .maybeSingle();

      const currentCups = existingQuery.data?.cups ?? 0;
      const nextCups = Math.max(0, currentCups + delta);
      if (nextCups === currentCups && delta < 0) return; // already at 0 — nothing to write

      const payload = existingQuery.data
        ? { id: existingQuery.data.id, user_id: userId!, logged_on: loggedOn, cups: nextCups }
        : { id: generateId(), user_id: userId!, logged_on: loggedOn, cups: nextCups };

      if (isConnected) {
        const { error } = await supabase.from('water_logs').upsert(payload);
        if (error) throw error;
      } else {
        const queueKey = `${userId}_sync_queue`;
        const raw = storage.getString(queueKey);
        const queue: unknown[] = raw ? JSON.parse(raw) : [];
        queue.push({ action: 'upsert', table: 'water_logs', data: payload });
        storage.set(queueKey, JSON.stringify(queue));
      }
    },

    onError: (_err, _vars, context) => {
      if (context?.prev !== undefined) {
        queryClient.setQueryData(['today_rings'], context.prev);
      }
    },

    onSettled: () => {
      queryClient.invalidateQueries({ queryKey: ['today_rings'] });
    },
  });
}
