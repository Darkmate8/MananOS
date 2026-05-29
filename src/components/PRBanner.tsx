import { useEffect } from 'react';
import { View, Text, StyleSheet } from 'react-native';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withTiming,
  withDelay,
  runOnJS,
} from 'react-native-reanimated';
import { theme } from '@/lib/theme';
import type { PRResult } from '@/hooks/usePRDetection';

const SLIDE_IN_MS = 300;
const HOLD_MS = 2200;
const SLIDE_OUT_MS = 250;
const BANNER_HEIGHT = 60;

interface Props {
  activePR: PRResult | null;
  onDismiss: () => void;
}

export function PRBanner({ activePR, onDismiss }: Props) {
  const translateY = useSharedValue(-BANNER_HEIGHT - 16);

  useEffect(() => {
    if (!activePR) {
      translateY.value = withTiming(-BANNER_HEIGHT - 16, { duration: SLIDE_OUT_MS });
      return;
    }
    // Slide in
    translateY.value = withTiming(0, { duration: SLIDE_IN_MS });
    // After hold period, slide out and dismiss
    translateY.value = withDelay(
      SLIDE_IN_MS + HOLD_MS,
      withTiming(-BANNER_HEIGHT - 16, { duration: SLIDE_OUT_MS }, (finished) => {
        if (finished) runOnJS(onDismiss)();
      }),
    );
  }, [activePR]); // eslint-disable-line react-hooks/exhaustive-deps

  const animStyle = useAnimatedStyle(() => ({
    transform: [{ translateY: translateY.value }],
  }));

  if (!activePR) return null;

  const label = activePR.previousValue === null ? 'FIRST PR' : 'NEW PR';
  const formattedValue = `${activePR.newValue.toFixed(1)} kg`;

  return (
    <Animated.View style={[styles.banner, animStyle]} pointerEvents="none">
      <View style={styles.badgeRow}>
        <View style={styles.badge}>
          <Text style={styles.badgeText}>{label}</Text>
        </View>
        <View style={styles.divider} />
        <View style={styles.textBlock}>
          <Text style={styles.exerciseName} numberOfLines={1}>
            {activePR.exerciseName}
          </Text>
          <Text style={styles.value}>{formattedValue} est. 1RM</Text>
        </View>
      </View>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  banner: {
    position: 'absolute',
    top: theme.spacing.md,
    left: theme.spacing.xxl,
    right: theme.spacing.xxl,
    height: BANNER_HEIGHT,
    backgroundColor: theme.colors.bgSurface3,
    borderRadius: theme.radius.card,
    borderWidth: 1,
    borderColor: theme.colors.accentPrimary,
    paddingHorizontal: theme.spacing.lg,
    justifyContent: 'center',
    shadowColor: theme.colors.accentPrimary,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 8,
    elevation: 8,
    zIndex: 100,
  },
  badgeRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: theme.spacing.md,
  },
  badge: {
    backgroundColor: theme.colors.accentPrimary,
    borderRadius: theme.radius.button,
    paddingHorizontal: theme.spacing.sm,
    paddingVertical: theme.spacing.xs,
  },
  badgeText: {
    fontSize: 10,
    fontFamily: theme.fonts.bodyBold.fontFamily,
    color: theme.colors.textPrimary,
    letterSpacing: 1,
  },
  divider: {
    width: 1,
    height: 28,
    backgroundColor: theme.colors.borderStrong,
  },
  textBlock: {
    flex: 1,
    gap: 2,
  },
  exerciseName: {
    fontSize: 13,
    fontFamily: theme.fonts.bodyBold.fontFamily,
    color: theme.colors.textPrimary,
  },
  value: {
    fontSize: 11,
    fontFamily: theme.fonts.mono.fontFamily,
    color: theme.colors.accentPrimary,
  },
});
