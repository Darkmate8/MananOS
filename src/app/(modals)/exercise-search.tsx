import { View, Text, StyleSheet } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { theme } from '@/lib/theme';

export default function ExerciseSearchModal() {
  return (
    <SafeAreaView style={styles.safe} edges={['top']}>
      <View style={styles.container}>
        <View style={styles.handle} />
        <Text style={styles.title}>Add Exercise</Text>
        <View style={styles.placeholder}>
          <Text style={styles.placeholderText}>Exercise search — coming in Phase 1</Text>
        </View>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: {
    flex: 1,
    backgroundColor: theme.colors.bgSurface2,
  },
  container: {
    flex: 1,
    padding: theme.spacing.xxl,
    alignItems: 'center',
  },
  handle: {
    width: 36,
    height: 4,
    borderRadius: 2,
    backgroundColor: theme.colors.borderStrong,
    marginBottom: theme.spacing.xxl,
  },
  title: {
    fontSize: 20,
    fontFamily: theme.fonts.display.fontFamily,
    color: theme.colors.textPrimary,
    alignSelf: 'flex-start',
    marginBottom: theme.spacing.xxl,
  },
  placeholder: {
    width: '100%',
    padding: theme.spacing.xxl,
    backgroundColor: theme.colors.bgSurface3,
    borderRadius: theme.radius.card,
    alignItems: 'center',
  },
  placeholderText: {
    fontSize: 14,
    fontFamily: theme.fonts.body.fontFamily,
    color: theme.colors.textTertiary,
  },
});
