import { View, Text, StyleSheet } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useLocalSearchParams } from 'expo-router';

import { theme } from '@/lib/theme';

export default function HabitDetailScreen() {
  const { habitId } = useLocalSearchParams<{ habitId: string }>();

  return (
    <SafeAreaView style={styles.safe} edges={['top']}>
      <View style={styles.container}>
        <View style={styles.header}>
          <Text style={styles.dateMeta}>HABIT DETAIL</Text>
          <Text style={styles.title}>{habitId ?? 'Habit'}</Text>
        </View>
        <View style={styles.placeholder}>
          <Text style={styles.placeholderText}>Contribution grid visualization — coming in Phase 2</Text>
        </View>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: {
    flex: 1,
    backgroundColor: theme.colors.bgCanvas,
  },
  container: {
    flex: 1,
    paddingTop: theme.spacing.xl,
  },
  header: {
    paddingHorizontal: theme.spacing.xxl,
    gap: theme.spacing.xs,
    marginBottom: theme.spacing.xxxl,
  },
  dateMeta: {
    fontSize: 12,
    fontFamily: theme.fonts.body.fontFamily,
    color: theme.colors.textTertiary,
    letterSpacing: 1.2,
    textTransform: 'uppercase',
  },
  title: {
    fontSize: 28,
    fontFamily: theme.fonts.display.fontFamily,
    color: theme.colors.textPrimary,
    lineHeight: 34,
  },
  placeholder: {
    marginHorizontal: theme.spacing.xxl,
    padding: theme.spacing.xxl,
    backgroundColor: theme.colors.bgSurface1,
    borderRadius: theme.radius.card,
    borderWidth: 1,
    borderColor: theme.colors.borderDefault,
    alignItems: 'center',
  },
  placeholderText: {
    fontSize: 14,
    fontFamily: theme.fonts.body.fontFamily,
    color: theme.colors.textTertiary,
  },
});
