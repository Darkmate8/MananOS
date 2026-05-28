// Mandatory root polyfills (CRITICAL for Vercel AI SDK streaming)
import 'react-native-url-polyfill/auto';

import { useFonts } from 'expo-font';
import * as SplashScreen from 'expo-splash-screen';
import { useEffect } from 'react';
import { DarkTheme, DefaultTheme, ThemeProvider } from 'expo-router';
import { useColorScheme } from 'react-native';

import { AnimatedSplashOverlay } from '@/components/animated-icon';
import AppTabs from '@/components/app-tabs';

SplashScreen.preventAutoHideAsync();

export default function TabLayout() {
  const colorScheme = useColorScheme();

  // Load custom fonts: EB Garamond (display), JetBrains Mono (data), Inter (body)
  // Fonts must be in assets/fonts/ as TTF files (use relative paths, not aliases)
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

  // Hide splash while fonts load (proceed even if fonts fail)
  useEffect(() => {
    const hideTimeout = setTimeout(() => {
      SplashScreen.hideAsync();
    }, 2000);
    return () => clearTimeout(hideTimeout);
  }, []);

  return (
    <ThemeProvider value={colorScheme === 'dark' ? DarkTheme : DefaultTheme}>
      <AnimatedSplashOverlay />
      <AppTabs />
    </ThemeProvider>
  );
}
