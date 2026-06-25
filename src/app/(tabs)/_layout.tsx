import { Tabs } from 'expo-router';
import { View, Text, Pressable, StyleSheet } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Feather } from '@expo/vector-icons';
import Animated, { useSharedValue, useAnimatedStyle, withTiming } from 'react-native-reanimated';

type TabBarProps = {
  state: { index: number; routes: { key: string; name: string }[] };
  navigation: { navigate: (name: string) => void };
  descriptors: Record<string, unknown>;
};

import { theme } from '@/lib/theme';

const AnimatedPressable = Animated.createAnimatedComponent(Pressable);

function TabItem({
  route,
  tab,
  focused,
  onPress,
}: {
  route: { key: string; name: string };
  tab: (typeof TAB_DEFS)[number];
  focused: boolean;
  onPress: () => void;
}) {
  const scale = useSharedValue(1);
  const animStyle = useAnimatedStyle(() => ({ transform: [{ scale: scale.value }] }));
  const color = focused ? theme.colors.textPrimary : theme.colors.textTertiary;
  return (
    <AnimatedPressable
      key={route.key}
      style={[styles.item, animStyle]}
      onPressIn={() => { scale.value = withTiming(0.97, { duration: theme.animation.press }); }}
      onPressOut={() => { scale.value = withTiming(1, { duration: theme.animation.press }); }}
      onPress={onPress}
    >
      {focused && <View style={styles.activeDot} />}
      {!focused && <View style={styles.dotSpacer} />}
      <Feather name={tab.icon} size={22} color={color} />
    </AnimatedPressable>
  );
}

const TAB_DEFS = [
  { name: 'index',     icon: 'home'         },
  { name: 'workouts',  icon: 'activity'     },
  { name: 'nutrition', icon: 'pie-chart'    },
  { name: 'habits',    icon: 'check-square' },
] as const;

function CustomTabBar({ state, navigation }: TabBarProps) {
  const insets = useSafeAreaInsets();

  // Only render routes that are actual tabs (exclude nested stacks like today/)
  const activeRouteName = state.routes[state.index]?.name;
  const visibleRoutes = state.routes.filter((r: { key: string; name: string }) =>
    TAB_DEFS.some((t) => t.name === r.name),
  );

  return (
    <View style={[styles.container, { paddingBottom: insets.bottom }]}>
      <View style={styles.topBorder} />
      <View style={styles.row}>
        {visibleRoutes.map((route: { key: string; name: string }) => {
          const tab = TAB_DEFS.find((t) => t.name === route.name)!;
          const focused = activeRouteName === route.name;
          return (
            <TabItem
              key={route.key}
              route={route}
              tab={tab}
              focused={focused}
              onPress={() => { if (!focused) navigation.navigate(route.name); }}
            />
          );
        })}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    backgroundColor: theme.colors.bgCanvas,
    height: 64,
  },
  topBorder: {
    height: 1,
    backgroundColor: theme.colors.borderDefault,
  },
  row: {
    flex: 1,
    flexDirection: 'row',
  },
  item: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    gap: theme.spacing.xs,
  },
  activeDot: {
    width: 4,
    height: 4,
    borderRadius: 2,
    backgroundColor: theme.colors.accentPrimary,
  },
  dotSpacer: {
    width: 4,
    height: 4,
  },
});

export default function TabLayout() {
  return (
    <Tabs
      tabBar={(props) => <CustomTabBar {...props} />}
      screenOptions={{ headerShown: false }}
    >
      <Tabs.Screen name="index" />
      <Tabs.Screen name="workouts" />
      <Tabs.Screen name="nutrition" />
      <Tabs.Screen name="habits" />
      {/* today/ is a nested stack (coach screen), not a tab */}
      <Tabs.Screen name="today" options={{ href: null }} />
    </Tabs>
  );
}
