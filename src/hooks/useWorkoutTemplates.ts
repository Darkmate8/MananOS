import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/lib/supabaseClient';
import { useAuthStore } from '@/store/authStore';
import type { Database } from '@/types/database.types';

export type WorkoutTemplateRow = Database['public']['Tables']['workout_templates']['Row'];
export type WorkoutTemplateExerciseRow = Database['public']['Tables']['workout_template_exercises']['Row'];

export interface TemplateExerciseDetail extends WorkoutTemplateExerciseRow {
  exerciseName: string;
  isUnilateral: boolean;
  defaultRestSeconds: number | null;
}

export interface WorkoutTemplateDetail extends WorkoutTemplateRow {
  exercises: TemplateExerciseDetail[];
  exerciseCount: number;
  estimatedMinutes: number;
}

type RawTemplateExercise = WorkoutTemplateExerciseRow & {
  exercises: { name: string; is_unilateral: boolean; default_rest_seconds: number | null } | null;
};

const SECONDS_PER_SET_WORK = 45; // avg set execution time used for duration estimate
const FALLBACK_REST_SECONDS = 90;

function estimateMinutes(exercises: TemplateExerciseDetail[]): number {
  const totalSeconds = exercises.reduce((sum, ex) => {
    const rest = ex.rest_seconds_override ?? ex.defaultRestSeconds ?? FALLBACK_REST_SECONDS;
    return sum + ex.target_sets * (SECONDS_PER_SET_WORK + rest);
  }, 0);
  return Math.max(5, Math.round(totalSeconds / 60));
}

async function fetchTemplates(userId: string): Promise<WorkoutTemplateDetail[]> {
  const { data: templates, error } = await supabase
    .from('workout_templates')
    .select('*')
    .eq('user_id', userId)
    .eq('is_archived', false)
    .order('sort_order')
    .order('created_at', { ascending: false });

  if (error) throw error;
  if (!templates || templates.length === 0) return [];

  const templateIds = templates.map((t) => t.id);
  const exercisesQuery = await supabase
    .from('workout_template_exercises')
    .select('*, exercises(name, is_unilateral, default_rest_seconds)')
    .in('template_id', templateIds)
    .order('exercise_order');

  if (exercisesQuery.error) throw exercisesQuery.error;
  const rawExercises = (exercisesQuery.data ?? []) as RawTemplateExercise[];

  const byTemplate = new Map<string, TemplateExerciseDetail[]>();
  for (const row of rawExercises) {
    const detail: TemplateExerciseDetail = {
      ...row,
      exerciseName: row.exercises?.name ?? 'Unknown exercise',
      isUnilateral: row.exercises?.is_unilateral ?? false,
      defaultRestSeconds: row.exercises?.default_rest_seconds ?? null,
    };
    if (!byTemplate.has(row.template_id)) byTemplate.set(row.template_id, []);
    byTemplate.get(row.template_id)!.push(detail);
  }

  return templates.map((t) => {
    const exercises = byTemplate.get(t.id) ?? [];
    return {
      ...t,
      exercises,
      exerciseCount: exercises.length,
      estimatedMinutes: t.target_duration_minutes ?? estimateMinutes(exercises),
    };
  });
}

export function useWorkoutTemplates() {
  const userId = useAuthStore((s) => s.userId);

  return useQuery<WorkoutTemplateDetail[]>({
    queryKey: ['workout_templates', userId],
    enabled: !!userId,
    staleTime: 1000 * 60 * 5,
    queryFn: () => fetchTemplates(userId!),
  });
}
