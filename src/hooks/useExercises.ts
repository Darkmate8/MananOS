import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/lib/supabaseClient';
import { useAuthStore } from '@/store/authStore';
import { EXERCISE_SEED } from '@/data/exerciseSeed';
import type { Database } from '@/types/database.types';

export type ExerciseRow = Database['public']['Tables']['exercises']['Row'];

async function fetchAndSeedExercises(userId: string): Promise<ExerciseRow[]> {
  const { data, error } = await supabase
    .from('exercises')
    .select('*')
    .eq('user_id', userId)
    .eq('is_archived', false)
    .order('name');

  if (error) throw error;

  if (data.length === 0) {
    const seedRows = EXERCISE_SEED.map((e) => ({
      user_id: userId,
      name: e.name,
      muscle_group: e.muscle_group,
      equipment: e.equipment,
      is_archived: false,
    }));

    const { error: seedError } = await supabase
      .from('exercises')
      .upsert(seedRows, { onConflict: 'user_id,name' });

    if (seedError) throw seedError;

    const { data: seeded, error: refetchError } = await supabase
      .from('exercises')
      .select('*')
      .eq('user_id', userId)
      .eq('is_archived', false)
      .order('name');

    if (refetchError) throw refetchError;
    return seeded;
  }

  return data;
}

export function useExercises() {
  const userId = useAuthStore((s) => s.userId);

  return useQuery<ExerciseRow[]>({
    queryKey: ['exercises', userId],
    enabled: !!userId,
    staleTime: 1000 * 60 * 10,
    queryFn: () => fetchAndSeedExercises(userId!),
  });
}
