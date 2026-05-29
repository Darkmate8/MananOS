import { useEffect, useRef, useState } from 'react';
import * as Haptics from 'expo-haptics';
import { useSessionStore } from '@/store/sessionStore';

export function useRestTimer() {
  const restTimerSeconds = useSessionStore((s) => s.restTimerSeconds);
  const clearRestTimer = useSessionStore((s) => s.clearRestTimer);

  const [remaining, setRemaining] = useState<number>(0);
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const initialRef = useRef<number>(0);

  useEffect(() => {
    if (restTimerSeconds === null) {
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
        intervalRef.current = null;
      }
      setRemaining(0);
      return;
    }

    // New timer started — seed from store value
    initialRef.current = restTimerSeconds;
    setRemaining(restTimerSeconds);

    if (intervalRef.current) clearInterval(intervalRef.current);

    intervalRef.current = setInterval(() => {
      setRemaining((prev) => {
        if (prev <= 1) {
          clearInterval(intervalRef.current!);
          intervalRef.current = null;
          Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
          clearRestTimer();
          return 0;
        }
        return prev - 1;
      });
    }, 1000);

    return () => {
      if (intervalRef.current) clearInterval(intervalRef.current);
    };
  }, [restTimerSeconds]); // eslint-disable-line react-hooks/exhaustive-deps

  const skip = () => {
    if (intervalRef.current) {
      clearInterval(intervalRef.current);
      intervalRef.current = null;
    }
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    clearRestTimer();
    setRemaining(0);
  };

  const isActive = restTimerSeconds !== null;

  return { remaining, isActive, total: initialRef.current, skip };
}
