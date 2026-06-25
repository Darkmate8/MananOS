import { useMutation, useQueryClient } from '@tanstack/react-query';
import { generateId } from '@/lib/generateId';
import { getIsConnected } from '@/lib/netUtils';
import { supabase } from '@/lib/supabaseClient';
import { useAuthStore } from '@/store/authStore';
import { getSyncQueue, setSyncQueue } from '@/lib/mmkv';
import type { Database, ProfileRow } from '@/types/database.types';

type ProfileUpdate = Database['public']['Tables']['profile']['Update'];

export interface GoalsPayload {
  kcal_goal: number;
  protein_goal_g: number;
  steps_goal: number;
  water_goal_cups: number;
}

interface MutationContext {
  previous: ProfileRow | null | undefined;
  queryKey: unknown[];
}

export function useUpdateProfile() {
  const queryClient = useQueryClient();
  const userId = useAuthStore((s) => s.userId);

  return useMutation<void, Error, GoalsPayload, MutationContext>({
    // ─── Phase A: Optimistic UI Update ───────────────────────────────────────
    onMutate: async (payload) => {
      const queryKey = ['profile', userId];
      await queryClient.cancelQueries({ queryKey });
      const previous = queryClient.getQueryData<ProfileRow | null>(queryKey);
      queryClient.setQueryData<ProfileRow | null>(queryKey, (old) =>
        old ? { ...old, ...payload } : old,
      );
      return { previous, queryKey };
    },

    // ─── Phase B: Connectivity Verification ──────────────────────────────────
    mutationFn: async (payload) => {
      if (!userId) throw new Error('No authenticated user');
      const row: ProfileUpdate & { user_id: string } = { user_id: userId, ...payload };

      const isConnected = await getIsConnected();
      if (isConnected) {
        const { error } = await supabase.from('profile').upsert(row);
        if (error) throw error;
      } else {
        const queue = JSON.parse(getSyncQueue(userId)) as unknown[];
        queue.push({
          id: generateId(),
          action: 'UPSERT_PROFILE',
          table: 'profile',
          payload: row,
        });
        setSyncQueue(userId, queue);
      }
    },

    // ─── Phase C: Error & Settlement ─────────────────────────────────────────
    onError: (_err, _vars, context) => {
      if (context?.previous !== undefined) {
        queryClient.setQueryData(context.queryKey, context.previous);
      }
    },
    onSettled: (_data, _err, _vars, context) => {
      if (context?.queryKey) {
        queryClient.invalidateQueries({ queryKey: context.queryKey });
      }
      queryClient.invalidateQueries({ queryKey: ['nutrition_history_7d', userId] });
      queryClient.invalidateQueries({ queryKey: ['weekly_nutrition', userId] });
    },
  });
}
