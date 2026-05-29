import { useEffect } from 'react';
import { View, Text, Pressable, StyleSheet } from 'react-native';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withTiming,
} from 'react-native-reanimated';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { theme } from '@/lib/theme';
import { useRestTimer } from '@/hooks/useRestTimer';

function formatCountdown(secs: number): string {
  const m = Math.floor(secs / 60).toString().padStart(2, '0');
  const s = (secs % 60).toString().padStart(2, '0');
  return `${m}:${s}`;
}

export function RestTimerOverlay() {
  const { remaining, isActive, total, skip } = useRestTimer();
  const insets = useSafeAreaInsets();
  const translateY = useSharedValue(160);

  useEffect(() => {
    translateY.value = withTiming(isActive ? 0 : 160, {
      duration: theme.animation.modal,
    });
  }, [isActive]);

  const animStyle = useAnimatedStyle(() => ({
    transform: [{ translateY: translateY.value }],
  }));

  const progress = total > 0 ? remaining / total : 0;
  const isUrgent = remaining <= 10 && remaining > 0;

  return (
    <Animated.View style={[styles.container, animStyle, { paddingBottom: insets.bottom + theme.spacing.lg }]}>
      <View style={styles.row}>
        <View style={styles.labelBlock}>
          <Text style={styles.label}>REST</Text>
          <Text style={[styles.countdown, isUrgent && styles.countdownUrgent]}>
            {formatCountdown(remaining)}
          </Text>
        </View>

        <View style={styles.progressTrack}>
          <Animated.View
            style={[
              styles.progressFill,
              { width: `${Math.round(progress * 100)}%` as `${number}%` },
              isUrgent && styles.progressFillUrgent,
            ]}
          />
        </View>

        <Pressable onPress={skip} hitSlop={12} style={styles.skipBtn}>
          <Text style={styles.skipText}>Skip</Text>
        </Pressable>
      </View>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  container: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    backgroundColor: theme.colors.bgSurface2,
    borderTopWidth: 1,
    borderTopColor: theme.colors.borderStrong,
    paddingHorizontal: theme.spacing.xxl,
    paddingTop: theme.spacing.lg,
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: theme.spacing.lg,
  },
  labelBlock: {
    gap: theme.spacing.xs,
    minWidth: 72,
  },
  label: {
    fontSize: 10,
    fontFamily: theme.fonts.body.fontFamily,
    color: theme.colors.textTertiary,
    letterSpacing: 1.2,
    textTransform: 'uppercase',
  },
  countdown: {
    ...theme.typography.monoDataLarge,
    color: theme.colors.textPrimary,
    fontSize: 22,
  },
  countdownUrgent: {
    color: theme.colors.warning,
  },
  progressTrack: {
    flex: 1,
    height: 4,
    backgroundColor: theme.colors.borderDefault,
    borderRadius: theme.radius.pill,
    overflow: 'hidden',
  },
  progressFill: {
    height: '100%',
    backgroundColor: theme.colors.accentPrimary,
    borderRadius: theme.radius.pill,
  },
  progressFillUrgent: {
    backgroundColor: theme.colors.warning,
  },
  skipBtn: {
    paddingHorizontal: theme.spacing.md,
    paddingVertical: theme.spacing.sm,
    borderRadius: theme.radius.button,
    backgroundColor: theme.colors.bgSurface3,
  },
  skipText: {
    fontSize: 13,
    fontFamily: theme.fonts.bodyBold.fontFamily,
    color: theme.colors.textSecondary,
  },
});
