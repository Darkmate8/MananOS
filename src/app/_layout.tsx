import 'react-native-url-polyfill/auto';
import { TextEncoder, TextDecoder } from 'text-encoding'; // eslint-disable-line @typescript-eslint/no-require-imports
globalThis.TextEncoder = TextEncoder as typeof globalThis.TextEncoder;
globalThis.TextDecoder = TextDecoder as typeof globalThis.TextDecoder;

import { useFonts } from 'expo-font';
import * as SplashScreen from 'expo-splash-screen';
import { useEffect } from 'react';
import { Stack } from 'expo-router';
import { StatusBar } from 'expo-status-bar';

import { theme } from '@/lib/theme';

SplashScreen.preventAutoHideAsync();

export default function RootLayout() {
  const [fontsLoaded] = useFonts({
    EBGaramond_600: require('../../assets/fonts/EBGaramond-SemiBold.ttf'),
    Inter_400: require('../../assets/fonts/Inter_24pt-Regular.ttf'),
    Inter_500: require('../../assets/fonts/Inter_18pt-Medium.ttf'),
    JetBrainsMono_400: require('../../assets/fonts/JetBrainsMono-Regular.ttf'),
    JetBrainsMono_500: require('../../assets/fonts/JetBrainsMono-Medium.ttf'),
  });

  useEffect(() => {
    if (fontsLoaded) {
      SplashScreen.hideAsync();
    }
  }, [fontsLoaded]);

  useEffect(() => {
    const t = setTimeout(() => SplashScreen.hideAsync(), 2000);
    return () => clearTimeout(t);
  }, []);

  return (
    <>
      <StatusBar style="light" />
      <Stack screenOptions={{ headerShown: false, contentStyle: { backgroundColor: theme.colors.bgCanvas } }}>
        <Stack.Screen name="(tabs)" />
        <Stack.Screen
          name="(modals)"
          options={{ presentation: 'modal', animation: 'slide_from_bottom' }}
        />
      </Stack>
    </>
  );
}
