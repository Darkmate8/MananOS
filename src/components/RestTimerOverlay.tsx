import { useEffect, useRef, useState } from 'react';
import { View, Text, Pressable, TextInput, StyleSheet } from 'react-native';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withTiming,
} from 'react-native-reanimated';

const AnimatedPressable = Animated.createAnimatedComponent(Pressable);
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { theme } from '@/lib/theme';
import { useRestTimer } from '@/hooks/useRestTimer';

function formatCountdown(secs: number): string {
  const m = Math.floor(secs / 60).toString().padStart(2, '0');
  const s = (secs % 60).toString().padStart(2, '0');
  return `${m}:${s}`;
}

export function RestTimerOverlay() {
  const { remaining, isActive, total, skip, setRestTimer } = useRestTimer();
  const insets = useSafeAreaInsets();
  const translateY = useSharedValue(160);
  const skipScale = useSharedValue(1);
  const skipAnimStyle = useAnimatedStyle(() => ({ transform: [{ scale: skipScale.value }] }));

  const [isEditing, setIsEditing] = useState(false);
  const [editValue, setEditValue] = useState('');
  const inputRef = useRef<TextInput>(null);

  useEffect(() => {
    translateY.value = withTiming(isActive ? 0 : 160, {
      duration: theme.animation.modal,
    });
    if (!isActive) setIsEditing(false);
  }, [isActive]);

  const animStyle = useAnimatedStyle(() => ({
    transform: [{ translateY: translateY.value }],
  }));

  const progress = total > 0 ? remaining / total : 0;
  const isUrgent = remaining <= 10 && remaining > 0;

  const handleCountdownPress = () => {
    setEditValue(remaining.toString());
    setIsEditing(true);
    setTimeout(() => inputRef.current?.focus(), 50);
  };

  const commitEdit = () => {
    const parsed = parseInt(editValue, 10);
    if (!isNaN(parsed) && parsed > 0) {
      setRestTimer(parsed);
    }
    setIsEditing(false);
  };

  return (
    <Animated.View style={[styles.container, animStyle, { paddingBottom: insets.bottom + theme.spacing.lg }]}>
      <View style={styles.row}>
        <View style={styles.labelBlock}>
          <Text style={styles.label}>REST</Text>
          {isEditing ? (
            <TextInput
              ref={inputRef}
              style={styles.countdownInput}
              value={editValue}
              onChangeText={setEditValue}
              onBlur={commitEdit}
              onSubmitEditing={commitEdit}
              keyboardType="number-pad"
              returnKeyType="done"
              selectTextOnFocus
            />
          ) : (
            <Pressable onPress={handleCountdownPress} hitSlop={8}>
              <Text style={[styles.countdown, isUrgent && styles.countdownUrgent]}>
                {formatCountdown(remaining)}
              </Text>
            </Pressable>
          )}
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

        <AnimatedPressable
          onPressIn={() => { skipScale.value = withTiming(0.97, { duration: theme.animation.press }); }}
          onPressOut={() => { skipScale.value = withTiming(1, { duration: theme.animation.press }); }}
          onPress={skip}
          hitSlop={12}
          style={[styles.skipBtn, skipAnimStyle]}
        >
          <Text style={styles.skipText}>Skip</Text>
        </AnimatedPressable>
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
  countdownInput: {
    ...theme.typography.monoDataLarge,
    color: theme.colors.accentPrimary,
    fontSize: 22,
    minWidth: 60,
    padding: 0,
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
