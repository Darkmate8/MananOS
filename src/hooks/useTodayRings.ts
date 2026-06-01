import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/lib/supabaseClient';
import { useAuthStore } from '@/store/authStore';
import type { Database } from '@/types/database.types';

export interface TodayRings {
  kcal_today: number;
  protein_g_today: number;
  steps_today: number;
  water_cups_today: number;
}

export type ProfileRow = Database['public']['Tables']['profile']['Row'];

async function fetchTodayRings(): Promise<TodayRings> {
  const { data, error } = await supabase.from('v_today_rings').select('*').single();
  if (error) throw error;
  return {
    kcal_today: Number(data.kcal_today ?? 0),
    protein_g_today: Number(data.protein_g_today ?? 0),
    steps_today: Number(data.steps_today ?? 0),
    water_cups_today: Number(data.water_cups_today ?? 0),
  };
}

async function fetchProfile(userId: string): Promise<ProfileRow | null> {
  const { data, error } = await supabase
    .from('profile')
    .select('*')
    .eq('user_id', userId)
    .maybeSingle();
  if (error) throw error;
  return data;
}

export function useTodayRings() {
  const userId = useAuthStore((s) => s.userId);

  const rings = useQuery<TodayRings>({
    queryKey: ['today_rings'],
    enabled: !!userId,
    staleTime: 1000 * 60,
    queryFn: fetchTodayRings,
  });

  const profile = useQuery<ProfileRow | null>({
    queryKey: ['profile', userId],
    enabled: !!userId,
    staleTime: 1000 * 60 * 10,
    queryFn: () => fetchProfile(userId!),
  });

  return { rings, profile };
}
