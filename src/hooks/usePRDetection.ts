import { useCallback, useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import NetInfo from '@react-native-community/netinfo';
import * as Haptics from 'expo-haptics';
import { v4 as uuidv4 } from 'uuid';
import { supabase } from '@/lib/supabaseClient';
import { useAuthStore } from '@/store/authStore';
import { getSyncQueue, setSyncQueue } from '@/lib/mmkv';
import type { PrType } from '@/types/database.types';

interface PersonalRecord {
  id: string;
  exercise_id: string;
  pr_type: PrType;
  value: number;
  reps: number | null;
  weight_kg: number | null;
}

interface PRUpsertPayload extends PersonalRecord {
  user_id: string;
}

export type PRType = Extract<PrType, 'one_rep_max'>;

export interface PRResult {
  prType: PRType;
  exerciseName: string;
  newValue: number;
  previousValue: number | null;
}

// Epley formula: estimated 1-rep max
function epley1RM(weightKg: number, reps: number): number {
  if (reps <= 0 || weightKg <= 0) return 0;
  if (reps === 1) return weightKg;
  return weightKg * (1 + reps / 30);
}

export function usePRDetection() {
  const userId = useAuthStore((s) => s.userId);
  const queryClient = useQueryClient();
  const [activePR, setActivePR] = useState<PRResult | null>(null);

  const { data: personalRecords = [] } = useQuery<PersonalRecord[]>({
    queryKey: ['personal_records', userId],
    queryFn: async () => {
      if (!userId) return [];
      const { data, error } = await supabase
        .from('personal_records')
        .select('id, exercise_id, pr_type, value, reps, weight_kg')
        .eq('user_id', userId);
      if (error) throw error;
      return (data ?? []) as PersonalRecord[];
    },
    enabled: !!userId,
    staleTime: 5 * 60 * 1000,
  });

  const upsertMutation = useMutation<void, Error, PRUpsertPayload, { previous: PersonalRecord[] | undefined }>({
    onMutate: async (record) => {
      await queryClient.cancelQueries({ queryKey: ['personal_records', userId] });
      const previous = queryClient.getQueryData<PersonalRecord[]>(['personal_records', userId]);
      queryClient.setQueryData<PersonalRecord[]>(
        ['personal_records', userId],
        (old = []) => {
          const idx = old.findIndex(
            (r) => r.exercise_id === record.exercise_id && r.pr_type === record.pr_type,
          );
          return idx >= 0
            ? old.map((r, i) => (i === idx ? record : r))
            : [...old, record];
        },
      );
      return { previous };
    },
    mutationFn: async (record) => {
      const net = await NetInfo.fetch();
      if (net.isConnected) {
        const { error } = await supabase
          .from('personal_records')
          .upsert(record, { onConflict: 'user_id,exercise_id,pr_type' });
        if (error) throw error;
      } else {
        const queue = JSON.parse(getSyncQueue(record.user_id)) as unknown[];
        queue.push({ action: 'upsert', table: 'personal_records', data: record });
        setSyncQueue(record.user_id, queue);
      }
    },
    onError: (_err, _vars, context) => {
      if (context?.previous) {
        queryClient.setQueryData(['personal_records', userId], context.previous);
      }
    },
    onSettled: () => {
      queryClient.invalidateQueries({ queryKey: ['personal_records', userId] });
    },
  });

  const checkPR = useCallback(
    (
      exerciseId: string,
      exerciseName: string,
      weightKg: number | null,
      reps: number | null,
    ) => {
      if (!userId || !weightKg || !reps || weightKg <= 0 || reps <= 0) return;

      const estimated = epley1RM(weightKg, reps);
      const existing = personalRecords.find(
        (r) => r.exercise_id === exerciseId && r.pr_type === 'one_rep_max',
      );

      if (!existing || estimated > existing.value) {
        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
        setActivePR({
          prType: 'one_rep_max',
          exerciseName,
          newValue: estimated,
          previousValue: existing?.value ?? null,
        });
        upsertMutation.mutate({
          id: existing?.id ?? uuidv4(),
          user_id: userId,
          exercise_id: exerciseId,
          pr_type: 'one_rep_max',
          value: Math.round(estimated * 10) / 10,
          reps,
          weight_kg: weightKg,
        });
      }
    },
    [userId, personalRecords, upsertMutation],
  );

  const dismissPR = useCallback(() => setActivePR(null), []);

  return { checkPR, activePR, dismissPR };
}
