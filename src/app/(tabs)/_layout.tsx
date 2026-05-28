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

  return (
    <View style={[styles.container, { paddingBottom: insets.bottom }]}>
      <View style={styles.topBorder} />
      <View style={styles.row}>
        {state.routes.map((route: { key: string; name: string }, index: number) => {
          const tab = TAB_DEFS[index] ?? TAB_DEFS[0];
          const focused = state.index === index;
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
              <Text style={[styles.label, { color }]}>{tab.label}</Text>
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
    fontSize: 11,
    fontFamily: theme.fonts.body.fontFamily,
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
    </Tabs>
  );
}
