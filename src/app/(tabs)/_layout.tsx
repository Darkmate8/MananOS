import { Tabs } from 'expo-router';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Feather } from '@expo/vector-icons';

type TabBarProps = {
  state: { index: number; routes: { key: string; name: string }[] };
  navigation: { navigate: (name: string) => void };
  descriptors: Record<string, unknown>;
};

import { theme } from '@/lib/theme';

const TAB_DEFS = [
  { name: 'index',     label: 'Today',     icon: 'home'       },
  { name: 'workouts',  label: 'Workouts',  icon: 'activity'   },
  { name: 'nutrition', label: 'Nutrition', icon: 'pie-chart'  },
  { name: 'habits',    label: 'Habits',    icon: 'check-square' },
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
          const color = focused ? theme.colors.textPrimary : theme.colors.textTertiary;

          return (
            <TouchableOpacity
              key={route.key}
              style={styles.item}
              activeOpacity={1}
              onPress={() => {
                if (!focused) navigation.navigate(route.name);
              }}
            >
              {focused && <View style={styles.activeDot} />}
              {!focused && <View style={styles.dotSpacer} />}
              <Feather name={tab.icon} size={22} color={color} />
              <Text style={[styles.label, { color }]} numberOfLines={1}>{tab.label}</Text>
            </TouchableOpacity>
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
  label: {
    fontSize: 10,
    fontFamily: theme.fonts.body.fontFamily,
    includeFontPadding: false,
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
