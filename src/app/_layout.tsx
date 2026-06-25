import 'react-native-get-random-values';
import 'react-native-url-polyfill/auto';
import { TextEncoder, TextDecoder } from 'text-encoding';
globalThis.TextEncoder = TextEncoder as typeof globalThis.TextEncoder;
globalThis.TextDecoder = TextDecoder as typeof globalThis.TextDecoder;

import { useFonts } from 'expo-font';
import * as SplashScreen from 'expo-splash-screen';
import { useEffect, useState } from 'react';
import { Modal, Pressable, StyleSheet, Text, View } from 'react-native';
import Animated, { useSharedValue, useAnimatedStyle, withTiming } from 'react-native-reanimated';
import { Stack, router } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { QueryClient } from '@tanstack/react-query';
import { PersistQueryClientProvider, PersistedClient, Persister } from '@tanstack/react-query-persist-client';

import { theme } from '@/lib/theme';

const AnimatedPressable = Animated.createAnimatedComponent(Pressable);

function usePressFeedback() {
  const scale = useSharedValue(1);
  const animatedStyle = useAnimatedStyle(() => ({ transform: [{ scale: scale.value }] }));
  const onPressIn = () => { scale.value = withTiming(0.97, { duration: theme.animation.press }); };
  const onPressOut = () => { scale.value = withTiming(1, { duration: theme.animation.press }); };
  return { animatedStyle, onPressIn, onPressOut };
}
import { tanstackMMKVStorage } from '@/lib/mmkv';
import { useAuthStore } from '@/store/authStore';
import { useSessionStore } from '@/store/sessionStore';
import * as Notifications from 'expo-notifications';
import { useReconcileNotifications } from '@/hooks/useReconcileNotifications';

Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowAlert: true,
    shouldShowBanner: true,
    shouldShowList: true,
    shouldPlaySound: false,
    shouldSetBadge: false,
  }),
});

SplashScreen.preventAutoHideAsync();

function NotificationReconciler() {
  useReconcileNotifications();
  return null;
}

function ResumeModal({ visible, onResume, onDiscard }: { visible: boolean; onResume: () => void; onDiscard: () => void }) {
  const resumePress = usePressFeedback();
  const discardPress = usePressFeedback();
  return (
    <Modal visible={visible} transparent animationType="fade" statusBarTranslucent>
      <View style={styles.overlay}>
        <View style={styles.sheet}>
          <Text style={styles.sheetTitle}>Active session detected. Resume tracking?</Text>
          <Text style={styles.sheetBody}>
            You have an unfinished workout session. Pick up where you left off or discard it.
          </Text>
          <AnimatedPressable
            style={[styles.resumeBtn, resumePress.animatedStyle]}
            onPressIn={resumePress.onPressIn}
            onPressOut={resumePress.onPressOut}
            onPress={onResume}
          >
            <Text style={styles.resumeLabel}>Resume</Text>
          </AnimatedPressable>
          <AnimatedPressable
            style={[styles.discardBtn, discardPress.animatedStyle]}
            onPressIn={discardPress.onPressIn}
            onPressOut={discardPress.onPressOut}
            onPress={onDiscard}
          >
            <Text style={styles.discardLabel}>Discard Session</Text>
          </AnimatedPressable>
        </View>
      </View>
    </Modal>
  );
}

const queryClient = new QueryClient({
  defaultOptions: { queries: { gcTime: 1000 * 60 * 60 * 24 } },
});

const PERSIST_KEY = 'tanstack-query-cache';
const mmkvPersister: Persister = {
  persistClient: async (client: PersistedClient) => {
    tanstackMMKVStorage.setItem(PERSIST_KEY, JSON.stringify(client));
  },
  restoreClient: async (): Promise<PersistedClient | undefined> => {
    const raw = tanstackMMKVStorage.getItem(PERSIST_KEY);
    return raw ? (JSON.parse(raw) as PersistedClient) : undefined;
  },
  removeClient: async () => {
    tanstackMMKVStorage.removeItem(PERSIST_KEY);
  },
};

export default function RootLayout() {
  const [fontsLoaded] = useFonts({
    EBGaramond_600: require('../../assets/fonts/EBGaramond-SemiBold.ttf'),
    Inter_400: require('../../assets/fonts/Inter_24pt-Regular.ttf'),
    Inter_500: require('../../assets/fonts/Inter_18pt-Medium.ttf'),
    JetBrainsMono_400: require('../../assets/fonts/JetBrainsMono-Regular.ttf'),
    JetBrainsMono_500: require('../../assets/fonts/JetBrainsMono-Medium.ttf'),
  });

  const { isAuthenticated, rehydrateSession } = useAuthStore();
  const { hasActiveSession, discardSession } = useSessionStore();
  const [showResumeModal, setShowResumeModal] = useState(false);

  useEffect(() => {
    if (fontsLoaded) SplashScreen.hideAsync();
  }, [fontsLoaded]);

  useEffect(() => {
    const t = setTimeout(() => SplashScreen.hideAsync(), 2000);
    return () => clearTimeout(t);
  }, []);

  useEffect(() => {
    rehydrateSession();
  }, [rehydrateSession]);

  useEffect(() => {
    if (isAuthenticated && hasActiveSession()) setShowResumeModal(true);
  }, [isAuthenticated]); // eslint-disable-line react-hooks/exhaustive-deps

  const handleResume = () => {
    setShowResumeModal(false);
    router.replace('/(tabs)/workouts/active');
  };

  const handleDiscard = () => {
    discardSession();
    setShowResumeModal(false);
    router.replace('/(tabs)');
  };

  return (
    <PersistQueryClientProvider client={queryClient} persistOptions={{ persister: mmkvPersister }}>
      <NotificationReconciler />
      <StatusBar style="light" />

      <ResumeModal visible={showResumeModal} onResume={handleResume} onDiscard={handleDiscard} />

      <Stack screenOptions={{ headerShown: false, contentStyle: { backgroundColor: theme.colors.bgCanvas } }}>
        <Stack.Screen name="index" />
        <Stack.Screen name="(auth)" />
        <Stack.Screen name="(tabs)" />
        <Stack.Screen name="(modals)" options={{ presentation: 'modal', animation: 'slide_from_bottom' }} />
      </Stack>
    </PersistQueryClientProvider>
  );
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    justifyContent: 'center',
    backgroundColor: 'rgba(0,0,0,0.72)',
    paddingHorizontal: theme.spacing.xxl,
  },
  sheet: {
    backgroundColor: theme.colors.bgSurface2,
    borderRadius: theme.radius.modal,
    padding: theme.spacing.xxl,
    gap: theme.spacing.md,
  },
  sheetTitle: {
    fontSize: 20,
    fontFamily: theme.fonts.display.fontFamily,
    color: theme.colors.textPrimary,
    lineHeight: 28,
  },
  sheetBody: {
    fontSize: 15,
    fontFamily: theme.fonts.body.fontFamily,
    color: theme.colors.textSecondary,
    lineHeight: 22,
  },
  resumeBtn: {
    backgroundColor: theme.colors.accentPrimary,
    borderRadius: theme.radius.button,
    padding: theme.spacing.md,
    alignItems: 'center',
  },
  resumeLabel: {
    fontSize: 15,
    fontFamily: theme.fonts.bodyBold.fontFamily,
    color: theme.colors.bgCanvas,
  },
  discardBtn: {
    borderRadius: theme.radius.button,
    padding: theme.spacing.md,
    alignItems: 'center',
  },
  discardLabel: {
    fontSize: 15,
    fontFamily: theme.fonts.body.fontFamily,
    color: theme.colors.textSecondary,
  },
});
