import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/lib/supabaseClient';
import { useAuthStore } from '@/store/authStore';

export interface TodayWorkoutSummary {
  id: string;
  title: string | null;
  started_at: string;
  ended_at: string | null;
  totalVolume: number;
  setCount: number;
  prCount: number;
}

function todayStart(): string {
  const d = new Date();
  d.setHours(0, 0, 0, 0);
  return d.toISOString();
}

async function fetchTodayWorkout(userId: string): Promise<TodayWorkoutSummary | null> {
  const { data: sessions, error } = await supabase
    .from('workout_sessions')
    .select('id, title, started_at, ended_at')
    .eq('user_id', userId)
    .gte('started_at', todayStart())
    .not('ended_at', 'is', null)
    .order('started_at', { ascending: false })
    .limit(1);

  if (error) throw error;
  if (!sessions || sessions.length === 0) return null;

  const session = sessions[0];

  const [setsResult, prsResult] = await Promise.all([
    supabase
      .from('workout_sets')
      .select('id, volume')
      .eq('session_id', session.id)
      .eq('is_warmup', false),
    supabase
      .from('personal_records')
      .select('id')
      .eq('session_id', session.id),
  ]);

  const sets = setsResult.data ?? [];
  const totalVolume = sets.reduce((sum, s) => sum + Number(s.volume ?? 0), 0);

  return {
    ...session,
    totalVolume,
    setCount: sets.length,
    prCount: (prsResult.data ?? []).length,
  };
}

export function useTodayWorkout() {
  const userId = useAuthStore((s) => s.userId);

  return useQuery<TodayWorkoutSummary | null>({
    queryKey: ['today_workout', userId],
    enabled: !!userId,
    staleTime: 1000 * 60 * 2,
    queryFn: () => fetchTodayWorkout(userId!),
  });
}
