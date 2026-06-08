import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/lib/supabaseClient';
import { useAuthStore } from '@/store/authStore';
import { NotifPrefs, DEFAULT_NOTIF_PREFS } from '@/types/notifPrefs';
import { getIsConnected } from '@/lib/netUtils';

export function useNotifPrefs() {
  const userId = useAuthStore((s) => s.userId);
  const queryClient = useQueryClient();

  const query = useQuery({
    queryKey: ['notif_prefs', userId],
    enabled: !!userId,
    queryFn: async (): Promise<NotifPrefs> => {
      const { data, error } = await supabase
        .from('profile')
        .select('notif_prefs')
        .eq('user_id', userId!)
        .maybeSingle();
      if (error) throw error;
      const raw = (data?.notif_prefs ?? {}) as Partial<NotifPrefs>;
      return { ...DEFAULT_NOTIF_PREFS, ...raw };
    },
  });

  const mutation = useMutation({
    onMutate: async (patch: Partial<NotifPrefs>) => {
      await queryClient.cancelQueries({ queryKey: ['notif_prefs', userId] });
      const prev = queryClient.getQueryData<NotifPrefs>(['notif_prefs', userId]);
      queryClient.setQueryData<NotifPrefs>(['notif_prefs', userId], (old) => ({
        ...(old ?? DEFAULT_NOTIF_PREFS),
        ...patch,
      }));
      return { prev };
    },

    mutationFn: async (patch: Partial<NotifPrefs>) => {
      const current =
        queryClient.getQueryData<NotifPrefs>(['notif_prefs', userId]) ?? DEFAULT_NOTIF_PREFS;
      const merged = { ...current, ...patch };
      const isConnected = await getIsConnected();
      if (isConnected) {
        const { error } = await supabase
          .from('profile')
          .update({ notif_prefs: merged as Record<string, unknown> })
          .eq('user_id', userId!);
        if (error) throw error;
      }
    },

    onError: (_err, _vars, context) => {
      if (context?.prev !== undefined) {
        queryClient.setQueryData(['notif_prefs', userId], context.prev);
      }
    },

    onSettled: () => {
      queryClient.invalidateQueries({ queryKey: ['notif_prefs', userId] });
    },
  });

  return {
    prefs: query.data ?? DEFAULT_NOTIF_PREFS,
    isLoading: query.isLoading,
    updatePrefs: mutation.mutate,
    isSaving: mutation.isPending,
  };
}
