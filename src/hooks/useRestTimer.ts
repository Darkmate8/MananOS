import { useEffect, useRef, useState } from 'react';
import * as Haptics from 'expo-haptics';
import { createAudioPlayer, setAudioModeAsync } from 'expo-audio';
import { useSessionStore } from '@/store/sessionStore';

let audioModeConfigured = false;

async function configureAudioMode() {
  if (audioModeConfigured) return;
  audioModeConfigured = true;
  try {
    await setAudioModeAsync({
      shouldPlayInBackground: true,
      playsInSilentMode: true,
    });
  } catch {
    // Non-critical — best effort
  }
}

async function playChime() {
  try {
    await configureAudioMode();
    const player = createAudioPlayer(
      // eslint-disable-next-line @typescript-eslint/no-require-imports
      require('../../assets/sounds/chime.mp3'),
    );
    player.volume = 1.0;
    player.play();
    // Chime is ~0.5s; release the player once playback has finished
    setTimeout(() => { player.remove(); }, 2000);
  } catch {
    // Chime unavailable — haptic already fired
  }
}

export function useRestTimer() {
  const restTimerSeconds = useSessionStore((s) => s.restTimerSeconds);
  const clearRestTimer = useSessionStore((s) => s.clearRestTimer);
  const setRestTimer = useSessionStore((s) => s.setRestTimer);

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
          playChime();
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

  return { remaining, isActive, total: initialRef.current, skip, setRestTimer };
}
