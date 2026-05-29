import { useState, useCallback } from 'react';
import { useSessionStore } from '@/store/sessionStore';
import {
  View,
  Text,
  TextInput,
  FlatList,
  Pressable,
  ActivityIndicator,
  StyleSheet,
  ListRenderItemInfo,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { router } from 'expo-router';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withTiming,
} from 'react-native-reanimated';

import { theme } from '@/lib/theme';
import { useExerciseSearch } from '@/hooks/useExerciseSearch';
import type { ExerciseRow } from '@/hooks/useExercises';

const AnimatedPressable = Animated.createAnimatedComponent(Pressable);

function ExerciseItem({
  item,
  onSelect,
}: {
  item: ExerciseRow;
  onSelect: (exercise: ExerciseRow) => void;
}) {
  const scale = useSharedValue(1);

  const animatedStyle = useAnimatedStyle(() => ({
    transform: [{ scale: scale.value }],
  }));

  return (
    <AnimatedPressable
      style={[styles.row, animatedStyle]}
      onPressIn={() => {
        scale.value = withTiming(0.97, { duration: theme.animation.press });
      }}
      onPressOut={() => {
        scale.value = withTiming(1, { duration: theme.animation.press });
      }}
      onPress={() => onSelect(item)}
    >
      <View style={styles.rowContent}>
        <Text style={styles.rowName}>{item.name}</Text>
        <Text style={styles.rowMeta}>
          {[item.muscle_group, item.equipment].filter(Boolean).join(' · ')}
        </Text>
      </View>
    </AnimatedPressable>
  );
}

export default function ExerciseSearchModal() {
  const [query, setQuery] = useState('');
  const { results, isLoading } = useExerciseSearch(query);

  const addExercise = useSessionStore((s) => s.addExercise);

  const handleSelect = useCallback((exercise: ExerciseRow) => {
    addExercise(exercise.id, exercise.name);
    router.back();
  }, [addExercise]);

  const renderItem = useCallback(
    ({ item }: ListRenderItemInfo<ExerciseRow>) => (
      <ExerciseItem item={item} onSelect={handleSelect} />
    ),
    [handleSelect],
  );

  return (
    <SafeAreaView style={styles.safe} edges={['top']}>
      <View style={styles.container}>
        <View style={styles.handle} />

        <Text style={styles.title}>Add Exercise</Text>

        <View style={styles.searchBar}>
          <TextInput
            style={styles.searchInput}
            placeholder="Search by name, muscle, or equipment…"
            placeholderTextColor={theme.colors.textTertiary}
            value={query}
            onChangeText={setQuery}
            autoCapitalize="none"
            autoCorrect={false}
            returnKeyType="search"
          />
        </View>

        {isLoading ? (
          <ActivityIndicator
            color={theme.colors.accentPrimary}
            style={styles.loader}
          />
        ) : (
          <FlatList
            data={results}
            keyExtractor={(item) => item.id}
            renderItem={renderItem}
            contentContainerStyle={styles.list}
            keyboardShouldPersistTaps="handled"
            showsVerticalScrollIndicator={false}
            ListEmptyComponent={
              <Text style={styles.emptyText}>
                {query.trim() ? 'No exercises found.' : 'Start typing to search.'}
              </Text>
            }
            ItemSeparatorComponent={() => <View style={styles.separator} />}
          />
        )}
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
    paddingHorizontal: theme.spacing.xxl,
    paddingTop: theme.spacing.lg,
  },
  handle: {
    width: 36,
    height: 4,
    borderRadius: 2,
    backgroundColor: theme.colors.borderStrong,
    alignSelf: 'center',
    marginBottom: theme.spacing.xxl,
  },
  title: {
    ...theme.typography.sectionTitle,
    color: theme.colors.textPrimary,
    marginBottom: theme.spacing.lg,
  },
  searchBar: {
    backgroundColor: theme.colors.bgSurface3,
    borderRadius: theme.radius.button,
    borderWidth: 1,
    borderColor: theme.colors.borderDefault,
    marginBottom: theme.spacing.lg,
  },
  searchInput: {
    ...theme.typography.bodyCore,
    color: theme.colors.textPrimary,
    paddingHorizontal: theme.spacing.lg,
    paddingVertical: theme.spacing.md,
  },
  loader: {
    marginTop: theme.spacing.massive,
  },
  list: {
    paddingBottom: theme.spacing.massive,
  },
  row: {
    paddingVertical: theme.spacing.md,
  },
  rowContent: {
    gap: theme.spacing.xs,
  },
  rowName: {
    ...theme.typography.bodyBold,
    color: theme.colors.textPrimary,
  },
  rowMeta: {
    ...theme.typography.captionMuted,
    color: theme.colors.textSecondary,
  },
  separator: {
    height: 1,
    backgroundColor: theme.colors.borderDefault,
  },
  emptyText: {
    ...theme.typography.captionMuted,
    color: theme.colors.textTertiary,
    textAlign: 'center',
    marginTop: theme.spacing.massive,
  },
});
