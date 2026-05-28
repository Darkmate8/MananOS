import { useFonts } from 'expo-font';

/**
 * Load custom fonts: EB Garamond (display), JetBrains Mono (data), Inter (body).
 * Fonts should be placed in assets/fonts/ directory as TTF files.
 */
export function useFontLoader() {
  const fontMap = {
    EBGaramond_600: require('@/assets/fonts/EBGaramond-SemiBold.ttf'),
    Inter_400: require('@/assets/fonts/Inter-Regular.ttf'),
    Inter_500: require('@/assets/fonts/Inter-Medium.ttf'),
    JetBrainsMono_400: require('@/assets/fonts/JetBrainsMono-Regular.ttf'),
    JetBrainsMono_500: require('@/assets/fonts/JetBrainsMono-Medium.ttf'),
  };

  const [fontsLoaded, fontError] = useFonts(fontMap);

  return { fontsLoaded, fontError };
}
