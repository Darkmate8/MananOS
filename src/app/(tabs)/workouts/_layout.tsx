import { Stack } from 'expo-router';

import { theme } from '@/lib/theme';

export default function WorkoutsLayout() {
  return (
    <Stack
      screenOptions={{
        headerShown: false,
        contentStyle: { backgroundColor: theme.colors.bgCanvas },
      }}
    >
      <Stack.Screen name="index" />
      <Stack.Screen
        name="active"
        options={{ gestureEnabled: false }}
      />
    </Stack>
  );
}
