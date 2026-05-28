import { View, Text, StyleSheet } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { theme } from '@/lib/theme';

export default function ActiveWorkoutScreen() {
  return (
    <SafeAreaView style={styles.safe} edges={['top']}>
      <View style={styles.container}>
        <View style={styles.header}>
          <Text style={styles.dateMeta}>ACTIVE SESSION</Text>
          <Text style={styles.title}>Logger</Text>
        </View>
        <View style={styles.placeholder}>
          <Text style={styles.placeholderText}>Active workout logger — coming in Phase 1</Text>
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
