import { useMutation, useQueryClient } from '@tanstack/react-query';
import { generateId } from '@/lib/generateId';
import { getIsConnected } from '@/lib/netUtils';
import { supabase } from '@/lib/supabaseClient';
import { useAuthStore } from '@/store/authStore';
import { getSyncQueue, setSyncQueue } from '@/lib/mmkv';
import type { WorkoutSessionDetail } from '@/hooks/useWorkoutSessions';

interface MutationContext {
  previous: WorkoutSessionDetail[] | undefined;
  queryKey: unknown[];
}

export function useDeleteWorkoutSession() {
  const queryClient = useQueryClient();
  const userId = useAuthStore((s) => s.userId);

  return useMutation<void, Error, string, MutationContext>({
    // ─── Phase A: Optimistic UI Update ───────────────────────────────────────
    onMutate: async (sessionId) => {
      const queryKey = ['workout_sessions', userId];
      await queryClient.cancelQueries({ queryKey });
      const previous = queryClient.getQueryData<WorkoutSessionDetail[]>(queryKey);
      queryClient.setQueryData<WorkoutSessionDetail[]>(queryKey, (old) =>
        (old ?? []).filter((s) => s.id !== sessionId),
      );
      return { previous, queryKey };
    },

    // ─── Phase B: Connectivity Verification ──────────────────────────────────
    mutationFn: async (sessionId) => {
      if (!userId) throw new Error('No authenticated user');
      const isConnected = await getIsConnected();
      if (isConnected) {
        // Cascades to workout_sets via FK; PRs keep their row but lose session_id (on delete set null)
        const { error } = await supabase.from('workout_sessions').delete().eq('id', sessionId);
        if (error) throw error;
      } else {
        const queue = JSON.parse(getSyncQueue(userId)) as unknown[];
        queue.push({
          id: generateId(),
          action: 'DELETE_SESSION',
          table: 'workout_sessions',
          payload: { id: sessionId },
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
    onSettled: () => {
      queryClient.invalidateQueries({ queryKey: ['workout_sessions', userId] });
      queryClient.invalidateQueries({ queryKey: ['personal_records', userId] });
    },
  });
}
