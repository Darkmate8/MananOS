import { useEffect, useRef } from 'react';
import { View, Text, ActivityIndicator, StyleSheet } from 'react-native';
import { router } from 'expo-router';
import { theme } from '@/lib/theme';
import { useAuthStore } from '@/store/authStore';

export default function SignIn() {
  const { signInAnonymously } = useAuthStore();
  const attempted = useRef(false);

  useEffect(() => {
    if (attempted.current) return;
    attempted.current = true;

    signInAnonymously()
      .then(() => router.replace('/(tabs)'))
      .catch(() => router.replace('/(auth)/sign-up'));
  }, [signInAnonymously]);

  return (
    <View style={styles.container}>
      <Text style={styles.wordmark}>MananOS</Text>
      <ActivityIndicator color={theme.colors.accentPrimary} size="small" style={styles.spinner} />
      <Text style={styles.caption}>Starting session…</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: theme.colors.bgCanvas,
    alignItems: 'center',
    justifyContent: 'center',
    gap: theme.spacing.md,
  },
  wordmark: {
    ...theme.typography.displayHeadline,
    color: theme.colors.textPrimary,
    letterSpacing: 1,
  },
  spinner: {
    marginTop: theme.spacing.lg,
  },
  caption: {
    ...theme.typography.captionMuted,
    color: theme.colors.textTertiary,
  },
});
