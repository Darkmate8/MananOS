import { useEffect, useCallback, useRef } from 'react';
import * as Notifications from 'expo-notifications';
import { Platform } from 'react-native';
import { useAuthStore } from '@/store/authStore';
import { useNotifPrefs } from './useNotifPrefs';
import { NotifPrefs } from '@/types/notifPrefs';

async function ensureAndroidChannel() {
  if (Platform.OS !== 'android') return;
  await Notifications.setNotificationChannelAsync('reminders', {
    name: 'Reminders',
    importance: Notifications.AndroidImportance.DEFAULT,
    vibrationPattern: [0, 250, 250, 250],
  });
}

async function scheduleWater(prefs: NotifPrefs) {
  if (!prefs.water_enabled) return;
  const interval = prefs.water_interval_hours;
  if (interval <= 0) return;
  if (prefs.water_start_hour > prefs.water_end_hour) return;

  for (let h = prefs.water_start_hour; h <= prefs.water_end_hour; h += interval) {
    await Notifications.scheduleNotificationAsync({
      identifier: `water_${h}`,
      content: {
        title: 'Stay hydrated',
        body: 'Time for a cup of water.',
        data: { type: 'water' },
        ...(Platform.OS === 'android' && { channelId: 'reminders' }),
      },
      trigger: {
        type: Notifications.SchedulableTriggerInputTypes.DAILY,
        hour: h,
        minute: 0,
      },
    });
  }
}

async function scheduleHabits(prefs: NotifPrefs) {
  if (!prefs.habits_enabled) return;
  await Notifications.scheduleNotificationAsync({
    identifier: 'habits_daily',
    content: {
      title: 'Daily habits',
      body: "Check in on today's habits.",
      data: { type: 'habits' },
      ...(Platform.OS === 'android' && { channelId: 'reminders' }),
    },
    trigger: {
      type: Notifications.SchedulableTriggerInputTypes.DAILY,
      hour: prefs.habits_reminder_hour,
      minute: prefs.habits_reminder_minute,
    },
  });
}

export function useReconcileNotifications() {
  const isAuthenticated = useAuthStore((s) => s.isAuthenticated);
  const { prefs, isLoading } = useNotifPrefs();
  const runningRef = useRef(false);

  const reconcile = useCallback(async () => {
    if (runningRef.current) return;
    runningRef.current = true;
    try {
      const { status } = await Notifications.getPermissionsAsync();
      if (status !== 'granted') return;

      await ensureAndroidChannel();
      await Notifications.cancelAllScheduledNotificationsAsync();
      await scheduleWater(prefs);
      await scheduleHabits(prefs);
    } finally {
      runningRef.current = false;
    }
  }, [prefs]);

  useEffect(() => {
    if (!isAuthenticated || isLoading) return;
    reconcile();
  }, [isAuthenticated, isLoading, reconcile]);

  return { reconcile };
}
