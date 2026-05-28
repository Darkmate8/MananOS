import { Stack } from 'expo-router';

import { theme } from '@/lib/theme';

export default function ModalsLayout() {
  return (
    <Stack
      screenOptions={{
        headerShown: false,
        presentation: 'modal',
        contentStyle: { backgroundColor: theme.colors.bgSurface2 },
        animation: 'slide_from_bottom',
      }}
    >
      <Stack.Screen name="exercise-search" />
      <Stack.Screen name="create-habit" />
      <Stack.Screen name="settings" />
    </Stack>
  );
}
