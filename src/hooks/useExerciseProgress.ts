import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/lib/supabaseClient';
import { useAuthStore } from '@/store/authStore';

export interface ExerciseProgressPoint {
  date: string;
  maxWeight: number;
  estimatedOneRM: number;
  totalVolume: number;
}

async function fetchExerciseProgress(
  userId: string,
  exerciseId: string,
  days: number,
): Promise<ExerciseProgressPoint[]> {
  const since = new Date(Date.now() - days * 24 * 60 * 60 * 1000).toISOString();

  const { data: sessions, error: sessionsError } = await supabase
    .from('workout_sessions')
    .select('id, started_at')
    .eq('user_id', userId)
    .gte('started_at', since)
    .not('ended_at', 'is', null)
    .order('started_at', { ascending: true });

  if (sessionsError) throw sessionsError;
  if (!sessions || sessions.length === 0) return [];

  const sessionIds = sessions.map((s) => s.id);

  const { data: sets, error: setsError } = await supabase
    .from('workout_sets')
    .select('session_id, weight_kg, reps, volume')
    .in('session_id', sessionIds)
    .eq('exercise_id', exerciseId)
    .eq('is_warmup', false)
    .not('completed_at', 'is', null);

  if (setsError) throw setsError;
  if (!sets || sets.length === 0) return [];

  const sessionDateMap = new Map<string, string>();
  sessions.forEach((s) => {
    sessionDateMap.set(s.id, s.started_at.slice(0, 10));
  });

  const byDate = new Map<
    string,
    { maxWeight: number; bestOneRM: number; totalVolume: number }
  >();

  sets.forEach((set) => {
    const date = sessionDateMap.get(set.session_id);
    if (!date) return;
    const w = set.weight_kg ?? 0;
    const r = set.reps ?? 0;
    const v = set.volume ?? 0;
    const oneRM = w > 0 && r > 0 ? w * (1 + r / 30) : 0;

    const existing = byDate.get(date);
    if (!existing) {
      byDate.set(date, { maxWeight: w, bestOneRM: oneRM, totalVolume: v });
    } else {
      existing.maxWeight = Math.max(existing.maxWeight, w);
      existing.bestOneRM = Math.max(existing.bestOneRM, oneRM);
      existing.totalVolume += v;
    }
  });

  return Array.from(byDate.entries())
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([date, vals]) => ({
      date,
      maxWeight: vals.maxWeight,
      estimatedOneRM: Math.round(vals.bestOneRM * 10) / 10,
      totalVolume: Math.round(vals.totalVolume),
    }));
}

export function useExerciseProgress(exerciseId: string, days = 90) {
  const userId = useAuthStore((s) => s.userId);

  return useQuery<ExerciseProgressPoint[]>({
    queryKey: ['exercise_progress', userId, exerciseId, days],
    enabled: !!userId && !!exerciseId,
    staleTime: 1000 * 60 * 5,
    queryFn: () => fetchExerciseProgress(userId!, exerciseId, days),
  });
}
