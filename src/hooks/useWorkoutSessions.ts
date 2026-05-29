import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/lib/supabaseClient';
import { useAuthStore } from '@/store/authStore';
import type { Database } from '@/types/database.types';

export type WorkoutSessionRow = Database['public']['Tables']['workout_sessions']['Row'];

export interface WorkoutSessionDetail extends WorkoutSessionRow {
  setCount: number;
  totalVolume: number;
  exerciseNames: string[];
}

type SetWithExercise = {
  id: string;
  session_id: string;
  exercise_id: string;
  volume: number;
  exercises: { name: string } | null;
};

async function fetchWorkoutSessions(userId: string): Promise<WorkoutSessionDetail[]> {
  const { data: sessions, error: sessionsError } = await supabase
    .from('workout_sessions')
    .select('*')
    .eq('user_id', userId)
    .not('ended_at', 'is', null)
    .order('ended_at', { ascending: false });

  if (sessionsError) throw sessionsError;
  if (!sessions || sessions.length === 0) return [];

  const sessionIds = sessions.map((s) => s.id);

  const setsQuery = await supabase
    .from('workout_sets')
    .select('id, session_id, exercise_id, volume, exercises(name)')
    .in('session_id', sessionIds);

  if (setsQuery.error) throw setsQuery.error;
  const sets = (setsQuery.data ?? []) as SetWithExercise[];

  const setsBySession = new Map<string, SetWithExercise[]>();
  sets.forEach((set) => {
    if (!setsBySession.has(set.session_id)) setsBySession.set(set.session_id, []);
    setsBySession.get(set.session_id)!.push(set);
  });

  return sessions.map((session) => {
    const sessionSets = setsBySession.get(session.id) ?? [];
    const seenExerciseIds = new Set<string>();
    const exerciseNames: string[] = [];

    sessionSets.forEach((s) => {
      if (!seenExerciseIds.has(s.exercise_id)) {
        seenExerciseIds.add(s.exercise_id);
        if (s.exercises?.name) exerciseNames.push(s.exercises.name);
      }
    });

    const totalVolume = sessionSets.reduce((sum, s) => sum + (s.volume ?? 0), 0);

    return {
      ...session,
      setCount: sessionSets.length,
      totalVolume,
      exerciseNames,
    };
  });
}

export function useWorkoutSessions() {
  const userId = useAuthStore((s) => s.userId);

  return useQuery<WorkoutSessionDetail[]>({
    queryKey: ['workout_sessions', userId],
    enabled: !!userId,
    staleTime: 1000 * 60 * 5,
    queryFn: () => fetchWorkoutSessions(userId!),
  });
}
