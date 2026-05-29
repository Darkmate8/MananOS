import { Redirect } from 'expo-router';
import { View, ActivityIndicator } from 'react-native';
import { theme } from '@/lib/theme';
import { useAuthStore } from '@/store/authStore';

export default function Index() {
  const { isAuthenticated, isLoading } = useAuthStore();

  if (isLoading) {
    return (
      <View style={{ flex: 1, backgroundColor: theme.colors.bgCanvas, alignItems: 'center', justifyContent: 'center' }}>
        <ActivityIndicator color={theme.colors.accentPrimary} />
      </View>
    );
  }

  return <Redirect href={isAuthenticated ? '/(tabs)' : '/(auth)/sign-in'} />;
}
