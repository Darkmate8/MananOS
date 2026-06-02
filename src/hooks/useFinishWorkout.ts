import { useMutation, useQueryClient } from '@tanstack/react-query';
import { generateId } from '@/lib/generateId';
import { getIsConnected } from '@/lib/netUtils';
import { supabase } from '@/lib/supabaseClient';
import { useAuthStore } from '@/store/authStore';
import { getSyncQueue, setSyncQueue } from '@/lib/mmkv';
import type { ActiveExercise } from '@/store/sessionStore';
import type { Database } from '@/types/database.types';
import type { WorkoutSessionDetail } from '@/hooks/useWorkoutSessions';

type WorkoutSetInsert = Database['public']['Tables']['workout_sets']['Insert'];

export interface FinishPayload {
  sessionId: string;
  startedAt: string;
  exercises: ActiveExercise[];
}

function buildSets(payload: FinishPayload, userId: string): WorkoutSetInsert[] {
  const now = new Date().toISOString();
  const rows: WorkoutSetInsert[] = [];
  for (const ex of payload.exercises) {
    for (const ws of ex.sets) {
      if (!ws.isCompleted) continue;
      rows.push({
        id: ws.id,
        user_id: userId,
        session_id: payload.sessionId,
        exercise_id: ex.exerciseId,
        set_index: ws.setIndex,
        weight_kg: ws.weightKg,
        reps: ws.reps,
        rpe: ws.rpe,
        is_warmup: ws.isWarmup,
        rest_seconds: ws.restSeconds,
        completed_at: now,
      });
    }
  }
  return rows;
}

function buildOptimisticSession(payload: FinishPayload, userId: string): WorkoutSessionDetail {
  const sets = buildSets(payload, userId);
  const seenExercises = new Set<string>();
  const exerciseNames: string[] = [];
  for (const ex of payload.exercises) {
    if (!seenExercises.has(ex.exerciseId)) {
      seenExercises.add(ex.exerciseId);
      exerciseNames.push(ex.exerciseName);
    }
  }
  const totalVolume = payload.exercises.reduce(
    (sum, ex) =>
      sum +
      ex.sets.reduce((s, ws) => s + (ws.isCompleted ? (ws.weightKg ?? 0) * (ws.reps ?? 0) : 0), 0),
    0,
  );
  const now = new Date().toISOString();
  return {
    id: payload.sessionId,
    user_id: userId,
    started_at: payload.startedAt,
    ended_at: now,
    title: null,
    notes: null,
    created_at: now,
    setCount: sets.length,
    totalVolume,
    exerciseNames,
  };
}

export function useFinishWorkout() {
  const queryClient = useQueryClient();
  const userId = useAuthStore((s) => s.userId);

  return useMutation<void, Error, FinishPayload>({
    // ─── Phase A: Optimistic UI Update ───────────────────────────────────────
    onMutate: async (payload) => {
      if (!userId) return;
      const queryKey = ['workout_sessions', userId];
      await queryClient.cancelQueries({ queryKey });
      const previous = queryClient.getQueryData<WorkoutSessionDetail[]>(queryKey);
      const optimistic = buildOptimisticSession(payload, userId);
      queryClient.setQueryData<WorkoutSessionDetail[]>(queryKey, (old) =>
        [optimistic, ...(old ?? [])],
      );
      return { previous, queryKey };
    },

    // ─── Phase B: Connectivity Verification ──────────────────────────────────
    mutationFn: async (payload) => {
      if (!userId) throw new Error('No authenticated user');
      const endedAt = new Date().toISOString();
      const sets = buildSets(payload, userId);

      const isConnected = await getIsConnected();
      if (isConnected) {
        const { error: sessionError } = await supabase
          .from('workout_sessions')
          .upsert({
            id: payload.sessionId,
            user_id: userId,
            started_at: payload.startedAt,
            ended_at: endedAt,
          });
        if (sessionError) throw sessionError;

        if (sets.length > 0) {
          const { error: setsError } = await supabase.from('workout_sets').upsert(sets);
          if (setsError) throw setsError;
        }
      } else {
        const queue = JSON.parse(getSyncQueue(userId)) as unknown[];
        queue.push({
          id: generateId(),
          action: 'FINISH_WORKOUT',
          table: 'workout_sessions',
          payload: {
            session: {
              id: payload.sessionId,
              user_id: userId,
              started_at: payload.startedAt,
              ended_at: endedAt,
            },
            sets,
          },
        });
        setSyncQueue(userId, queue);
      }
    },

    // ─── Phase C: Error & Settlement ─────────────────────────────────────────
    onError: (_err, _vars, context) => {
      const ctx = context as { previous: WorkoutSessionDetail[] | undefined; queryKey: unknown[] } | undefined;
      if (ctx?.previous !== undefined) {
        queryClient.setQueryData(ctx.queryKey, ctx.previous);
      }
    },

    onSettled: (_data, _err, _vars, context) => {
      const ctx = context as { queryKey: unknown[] } | undefined;
      if (ctx?.queryKey) {
        queryClient.invalidateQueries({ queryKey: ctx.queryKey });
      }
    },
  });
}
