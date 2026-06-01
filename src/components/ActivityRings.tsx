import React, { useEffect } from 'react';
import { View, Text, StyleSheet } from 'react-native';
import Svg, { Circle } from 'react-native-svg';
import Animated, {
  useSharedValue,
  useAnimatedProps,
  withTiming,
  Easing,
} from 'react-native-reanimated';
import { theme } from '@/lib/theme';

const AnimatedCircle = Animated.createAnimatedComponent(Circle);

interface RingProps {
  size: number;
  strokeWidth: number;
  color: string;
  progress: number; // 0–1
  cx: number;
  cy: number;
}

function AnimatedRing({ size, strokeWidth, color, progress, cx, cy }: RingProps) {
  const radius = (size - strokeWidth) / 2;
  const circumference = 2 * Math.PI * radius;

  const animatedProgress = useSharedValue(0);

  useEffect(() => {
    animatedProgress.value = withTiming(Math.min(progress, 1), {
      duration: theme.animation.dataIntensive,
      easing: Easing.out(Easing.cubic),
    });
  }, [progress]);

  const animatedProps = useAnimatedProps(() => ({
    strokeDashoffset: circumference * (1 - animatedProgress.value),
  }));

  // Track ring (12% opacity)
  const trackColor = color + '1F'; // ~12% opacity hex

  return (
    <>
      <Circle
        cx={cx}
        cy={cy}
        r={radius}
        stroke={trackColor}
        strokeWidth={strokeWidth}
        fill="none"
        strokeLinecap="round"
      />
      <AnimatedCircle
        cx={cx}
        cy={cy}
        r={radius}
        stroke={color}
        strokeWidth={strokeWidth}
        fill="none"
        strokeLinecap="round"
        strokeDasharray={circumference}
        animatedProps={animatedProps}
        rotation="-90"
        origin={`${cx}, ${cy}`}
      />
    </>
  );
}

interface ActivityRingsProps {
  stepsProgress: number;
  waterProgress: number;
  caloriesProgress: number;
  stepsValue: string;
}

const CANVAS = 230;
const CX = CANVAS / 2;
const CY = CANVAS / 2;

const OUTER_DIAMETER = 220;
const OUTER_STROKE = 14;
const MIDDLE_DIAMETER = 180;
const MIDDLE_STROKE = 14;
const INNER_DIAMETER = 140;
const INNER_STROKE = 14;

export function ActivityRings({
  stepsProgress,
  waterProgress,
  caloriesProgress,
  stepsValue,
}: ActivityRingsProps) {
  return (
    <View style={styles.container}>
      <Svg width={CANVAS} height={CANVAS}>
        <AnimatedRing
          size={OUTER_DIAMETER}
          strokeWidth={OUTER_STROKE}
          color={theme.colors.ringSteps}
          progress={stepsProgress}
          cx={CX}
          cy={CY}
        />
        <AnimatedRing
          size={MIDDLE_DIAMETER}
          strokeWidth={MIDDLE_STROKE}
          color={theme.colors.ringWater}
          progress={waterProgress}
          cx={CX}
          cy={CY}
        />
        <AnimatedRing
          size={INNER_DIAMETER}
          strokeWidth={INNER_STROKE}
          color={theme.colors.ringCalories}
          progress={caloriesProgress}
          cx={CX}
          cy={CY}
        />
      </Svg>
      <View style={styles.core} pointerEvents="none">
        <Text style={styles.coreValue}>{stepsValue}</Text>
        <Text style={styles.coreLabel}>steps</Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    alignItems: 'center',
    gap: theme.spacing.lg,
  },
  core: {
    position: 'absolute',
    top: 0,
    left: 0,
    width: CANVAS,
    height: CANVAS,
    alignItems: 'center',
    justifyContent: 'center',
  },
  coreValue: {
    fontSize: 24,
    fontFamily: theme.fonts.mono.fontFamily,
    color: theme.colors.textPrimary,
    lineHeight: 28,
  },
  coreLabel: {
    fontSize: 12,
    fontFamily: theme.fonts.body.fontFamily,
    color: theme.colors.textTertiary,
    letterSpacing: 0.5,
  },
});
