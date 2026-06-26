import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/lib/supabaseClient';
import { useAuthStore } from '@/store/authStore';
import type { ProfileRow } from '@/types/database.types';

async function fetchProfile(userId: string): Promise<ProfileRow | null> {
  const { data, error } = await supabase
    .from('profile')
    .select('*')
    .eq('user_id', userId)
    .maybeSingle();
  if (error) throw new Error(error.message);
  return data;
}

export function useProfile() {
  const userId = useAuthStore((s) => s.userId);

  return useQuery<ProfileRow | null>({
    queryKey: ['profile', userId],
    enabled: !!userId,
    staleTime: 1000 * 60 * 10,
    queryFn: () => fetchProfile(userId!),
  });
}
