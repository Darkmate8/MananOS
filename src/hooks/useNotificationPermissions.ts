import { useState, useEffect, useCallback } from 'react';
import * as Notifications from 'expo-notifications';
import { Platform } from 'react-native';

async function fetchDevicePushToken(): Promise<string | undefined> {
  try {
    if (Platform.OS === 'android') {
      const { data } = await Notifications.getDevicePushTokenAsync();
      return data;
    }
  } catch {
    // Token fetch is best-effort — local notifications work without it
  }
  return undefined;
}

export function useNotificationPermissions() {
  const [granted, setGranted] = useState(false);
  const [checked, setChecked] = useState(false);

  useEffect(() => {
    Notifications.getPermissionsAsync().then(({ status }) => {
      setGranted(status === 'granted');
      setChecked(true);
    });
  }, []);

  const request = useCallback(async (): Promise<{ granted: boolean; token?: string }> => {
    const { status } = await Notifications.requestPermissionsAsync();
    const isGranted = status === 'granted';
    setGranted(isGranted);
    const token = isGranted ? await fetchDevicePushToken() : undefined;
    return { granted: isGranted, token };
  }, []);

  return { granted, checked, request };
}
