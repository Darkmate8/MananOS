import { useMutation, useQueryClient } from '@tanstack/react-query';
import { generateId } from '@/lib/generateId';
import { getIsConnected } from '@/lib/netUtils';
import { supabase } from '@/lib/supabaseClient';
import { useAuthStore } from '@/store/authStore';
import { getSyncQueue, setSyncQueue } from '@/lib/mmkv';
import type { Database } from '@/types/database.types';
import type { WorkoutTemplateDetail, TemplateExerciseDetail } from '@/hooks/useWorkoutTemplates';

type TemplateInsert = Database['public']['Tables']['workout_templates']['Insert'];
type TemplateExerciseInsert = Database['public']['Tables']['workout_template_exercises']['Insert'];

export interface TemplateExerciseDraft {
  exerciseId: string;
  exerciseName: string;
  isUnilateral: boolean;
  defaultRestSeconds: number | null;
  targetSets: number;
  targetReps: number | null;
  targetWeightKg: number | null;
  restSecondsOverride: number | null;
}

export interface TemplatePayload {
  templateId: string; // client-generated uuid for create; existing id for update
  name: string;
  notes: string | null;
  exercises: TemplateExerciseDraft[];
}

interface MutationContext {
  previous: WorkoutTemplateDetail[] | undefined;
  queryKey: unknown[];
}

function buildExerciseRows(payload: TemplatePayload, userId: string): TemplateExerciseInsert[] {
  return payload.exercises.map((ex, i) => ({
    id: generateId(),
    template_id: payload.templateId,
    user_id: userId,
    exercise_id: ex.exerciseId,
    exercise_order: i + 1,
    target_sets: ex.targetSets,
    target_reps: ex.targetReps,
    target_weight_kg: ex.targetWeightKg,
    rest_seconds_override: ex.restSecondsOverride,
  }));
}

function buildOptimisticTemplate(payload: TemplatePayload, userId: string): WorkoutTemplateDetail {
  const now = new Date().toISOString();
  const rows = buildExerciseRows(payload, userId);
  const exercises: TemplateExerciseDetail[] = rows.map((row, i) => ({
    id: row.id!,
    template_id: payload.templateId,
    user_id: userId,
    exercise_id: row.exercise_id,
    exercise_order: row.exercise_order,
    target_sets: row.target_sets ?? 3,
    target_reps: row.target_reps ?? null,
    target_weight_kg: row.target_weight_kg ?? null,
    rest_seconds_override: row.rest_seconds_override ?? null,
    exerciseName: payload.exercises[i].exerciseName,
    isUnilateral: payload.exercises[i].isUnilateral,
    defaultRestSeconds: payload.exercises[i].defaultRestSeconds,
  }));
  return {
    id: payload.templateId,
    user_id: userId,
    name: payload.name,
    notes: payload.notes,
    is_archived: false,
    sort_order: 0,
    created_at: now,
    updated_at: now,
    exercises,
    exerciseCount: exercises.length,
    estimatedMinutes: Math.max(
      5,
      Math.round(exercises.reduce((s, e) => s + e.target_sets * (45 + (e.rest_seconds_override ?? e.defaultRestSeconds ?? 90)), 0) / 60),
    ),
  };
}

async function upsertTemplateOnline(payload: TemplatePayload, userId: string): Promise<void> {
  const template: TemplateInsert = {
    id: payload.templateId,
    user_id: userId,
    name: payload.name,
    notes: payload.notes,
  };
  const { error: tplError } = await supabase.from('workout_templates').upsert(template);
  if (tplError) throw tplError;

  // Replace exercise prescriptions wholesale — simplest consistent update
  const { error: delError } = await supabase
    .from('workout_template_exercises')
    .delete()
    .eq('template_id', payload.templateId);
  if (delError) throw delError;

  const rows = buildExerciseRows(payload, userId);
  if (rows.length > 0) {
    const { error: exError } = await supabase.from('workout_template_exercises').upsert(rows);
    if (exError) throw exError;
  }
}

function queueOffline(action: string, payload: unknown, userId: string): void {
  const queue = JSON.parse(getSyncQueue(userId)) as unknown[];
  queue.push({ id: generateId(), action, table: 'workout_templates', payload });
  setSyncQueue(userId, queue);
}

function useSaveTemplate(mode: 'create' | 'update') {
  const queryClient = useQueryClient();
  const userId = useAuthStore((s) => s.userId);

  return useMutation<void, Error, TemplatePayload, MutationContext>({
    // ─── Phase A: Optimistic UI Update ───────────────────────────────────────
    onMutate: async (payload) => {
      const queryKey = ['workout_templates', userId];
      await queryClient.cancelQueries({ queryKey });
      const previous = queryClient.getQueryData<WorkoutTemplateDetail[]>(queryKey);
      const optimistic = buildOptimisticTemplate(payload, userId!);
      queryClient.setQueryData<WorkoutTemplateDetail[]>(queryKey, (old) =>
        mode === 'create'
          ? [optimistic, ...(old ?? [])]
          : (old ?? []).map((t) => (t.id === payload.templateId ? optimistic : t)),
      );
      return { previous, queryKey };
    },

    // ─── Phase B: Connectivity Verification ──────────────────────────────────
    mutationFn: async (payload) => {
      if (!userId) throw new Error('No authenticated user');
      const isConnected = await getIsConnected();
      if (isConnected) {
        await upsertTemplateOnline(payload, userId);
      } else {
        queueOffline('UPSERT_TEMPLATE', {
          template: { id: payload.templateId, user_id: userId, name: payload.name, notes: payload.notes },
          exercises: buildExerciseRows(payload, userId),
        }, userId);
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
    },
  });
}

export function useCreateTemplate() {
  return useSaveTemplate('create');
}

export function useUpdateTemplate() {
  return useSaveTemplate('update');
}

export function useDeleteTemplate() {
  const queryClient = useQueryClient();
  const userId = useAuthStore((s) => s.userId);

  return useMutation<void, Error, string, MutationContext>({
    // ─── Phase A: Optimistic UI Update ───────────────────────────────────────
    onMutate: async (templateId) => {
      const queryKey = ['workout_templates', userId];
      await queryClient.cancelQueries({ queryKey });
      const previous = queryClient.getQueryData<WorkoutTemplateDetail[]>(queryKey);
      queryClient.setQueryData<WorkoutTemplateDetail[]>(queryKey, (old) =>
        (old ?? []).filter((t) => t.id !== templateId),
      );
      return { previous, queryKey };
    },

    // ─── Phase B: Connectivity Verification ──────────────────────────────────
    mutationFn: async (templateId) => {
      if (!userId) throw new Error('No authenticated user');
      const isConnected = await getIsConnected();
      if (isConnected) {
        // Cascades to workout_template_exercises via FK
        const { error } = await supabase.from('workout_templates').delete().eq('id', templateId);
        if (error) throw error;
      } else {
        queueOffline('DELETE_TEMPLATE', { id: templateId }, userId);
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
    },
  });
}
