import { View, Text, StyleSheet, ScrollView } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { theme } from '@/lib/theme';

const DATE_LABEL = 'THURSDAY · MAY 28';

export default function HabitsScreen() {
  return (
    <SafeAreaView style={styles.safe} edges={['top']}>
      <ScrollView contentContainerStyle={styles.scroll} showsVerticalScrollIndicator={false}>
        <View style={styles.header}>
          <Text style={styles.dateMeta}>{DATE_LABEL}</Text>
          <Text style={styles.title}>Habits</Text>
        </View>
        <View style={styles.placeholder}>
          <Text style={styles.placeholderText}>Habit grid & checklist — coming in Phase 2</Text>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: {
    flex: 1,
    backgroundColor: theme.colors.bgCanvas,
  },
  scroll: {
    paddingTop: theme.spacing.xl,
    paddingBottom: theme.spacing.massive,
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
