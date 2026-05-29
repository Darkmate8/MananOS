import { useState } from 'react';
import { View, Text, Pressable, StyleSheet, ActivityIndicator } from 'react-native';
import Animated, { useSharedValue, useAnimatedStyle, withTiming } from 'react-native-reanimated';
import { router } from 'expo-router';
import { theme } from '@/lib/theme';
import { useAuthStore } from '@/store/authStore';

const AnimatedPressable = Animated.createAnimatedComponent(Pressable);

export default function SignUp() {
  const { signInAnonymously } = useAuthStore();
  const [retrying, setRetrying] = useState(false);
  const [errorMsg, setErrorMsg] = useState('Could not connect. Check your network and try again.');

  const scale = useSharedValue(1);
  const animatedStyle = useAnimatedStyle(() => ({ transform: [{ scale: scale.value }] }));

  const handleRetry = async () => {
    if (retrying) return;
    setRetrying(true);
    setErrorMsg('');
    try {
      await signInAnonymously();
      router.replace('/(tabs)');
    } catch {
      setErrorMsg('Still unable to connect. Try again.');
      setRetrying(false);
    }
  };

  return (
    <View style={styles.container}>
      <Text style={styles.title}>Connection Failed</Text>
      <Text style={styles.body}>{errorMsg}</Text>

      <AnimatedPressable
        style={[styles.retryBtn, animatedStyle]}
        onPressIn={() => { scale.value = withTiming(0.97, { duration: 100 }); }}
        onPressOut={() => { scale.value = withTiming(1, { duration: 100 }); }}
        onPress={handleRetry}
        disabled={retrying}
      >
        {retrying
          ? <ActivityIndicator color={theme.colors.bgCanvas} size="small" />
          : <Text style={styles.retryLabel}>Retry</Text>
        }
      </AnimatedPressable>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: theme.colors.bgCanvas,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: theme.spacing.xxxl,
    gap: theme.spacing.md,
  },
  title: {
    ...theme.typography.sectionTitle,
    color: theme.colors.textPrimary,
    textAlign: 'center',
  },
  body: {
    ...theme.typography.bodyCore,
    color: theme.colors.textSecondary,
    textAlign: 'center',
    marginBottom: theme.spacing.lg,
  },
  retryBtn: {
    backgroundColor: theme.colors.accentPrimary,
    borderRadius: theme.radius.button,
    paddingVertical: theme.spacing.md,
    paddingHorizontal: theme.spacing.xxxl,
    alignItems: 'center',
    minWidth: 140,
  },
  retryLabel: {
    ...theme.typography.bodyBold,
    color: theme.colors.bgCanvas,
  },
});
