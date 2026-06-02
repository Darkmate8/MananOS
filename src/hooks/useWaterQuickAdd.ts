import { useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/lib/supabaseClient';
import { useAuthStore } from '@/store/authStore';
import { storage } from '@/lib/mmkv';
import { generateId } from '@/lib/generateId';
import { todayDateStr } from '@/lib/habitUtils';
import { getIsConnected } from '@/lib/netUtils';

const CUP_INCREMENT = 1;

export function useWaterQuickAdd() {
  const userId = useAuthStore((s) => s.userId);
  const queryClient = useQueryClient();

  return useMutation({
    onMutate: async () => {
      await queryClient.cancelQueries({ queryKey: ['today_rings'] });
      const prev = queryClient.getQueryData<{ water_cups_today: number }>(['today_rings']);
      queryClient.setQueryData(['today_rings'], (old: Record<string, number> | undefined) =>
        old ? { ...old, water_cups_today: (old.water_cups_today ?? 0) + CUP_INCREMENT } : old,
      );
      return { prev };
    },

    mutationFn: async () => {
      const isConnected = await getIsConnected();
      const loggedOn = todayDateStr();
      const existingQuery = await supabase
        .from('water_logs')
        .select('id, cups')
        .eq('user_id', userId!)
        .eq('logged_on', loggedOn)
        .maybeSingle();

      const payload = existingQuery.data
        ? { id: existingQuery.data.id, user_id: userId!, logged_on: loggedOn, cups: existingQuery.data.cups + CUP_INCREMENT }
        : { id: generateId(), user_id: userId!, logged_on: loggedOn, cups: CUP_INCREMENT };

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
