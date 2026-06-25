import { View, Text, StyleSheet, ScrollView, ActivityIndicator, Pressable, Alert } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { router } from 'expo-router';
import Animated, { useSharedValue, useAnimatedStyle, withTiming } from 'react-native-reanimated';
import * as Haptics from 'expo-haptics';
import { Feather, Ionicons } from '@expo/vector-icons';

import { theme } from '@/lib/theme';
import { useWorkoutTemplates, type WorkoutTemplateDetail } from '@/hooks/useWorkoutTemplates';
import { useDeleteTemplate } from '@/hooks/useTemplateMutations';
import { useSessionStore } from '@/store/sessionStore';

const AnimatedPressable = Animated.createAnimatedComponent(Pressable);

function usePressFeedback() {
  const scale = useSharedValue(1);
  const animatedStyle = useAnimatedStyle(() => ({ transform: [{ scale: scale.value }] }));
  const onPressIn = () => { scale.value = withTiming(0.97, { duration: theme.animation.press }); };
  const onPressOut = () => { scale.value = withTiming(1, { duration: theme.animation.press }); };
  return { animatedStyle, onPressIn, onPressOut };
}

function TemplateCard({
  template,
  onStart,
  onEdit,
  onDelete,
}: {
  template: WorkoutTemplateDetail;
  onStart: () => void;
  onEdit: () => void;
  onDelete: () => void;
}) {
  const cardPress = usePressFeedback();
  const startPress = usePressFeedback();
  const editPress = usePressFeedback();

  return (
    <AnimatedPressable
      style={[styles.card, cardPress.animatedStyle]}
      onPressIn={cardPress.onPressIn}
      onPressOut={cardPress.onPressOut}
      onLongPress={onDelete}
      delayLongPress={450}
    >
      <View style={styles.cardHeader}>
        <View style={styles.cardTitleBlock}>
          <Text style={styles.cardName}>{template.name}</Text>
          <Text style={styles.cardMeta}>
            {template.exerciseCount} exercise{template.exerciseCount === 1 ? '' : 's'} · {template.target_duration_minutes != null ? `${template.target_duration_minutes} min` : `~${template.estimatedMinutes} min`}
          </Text>
        </View>
        <AnimatedPressable
          hitSlop={10}
          onPressIn={editPress.onPressIn}
          onPressOut={editPress.onPressOut}
          onPress={onEdit}
          style={[styles.editBtn, editPress.animatedStyle]}
        >
          <Feather name="edit-2" size={15} color={theme.colors.textSecondary} />
        </AnimatedPressable>
      </View>

      {template.exercises.length > 0 && (
        <View style={styles.exerciseList}>
          {template.exercises.map((ex) => (
            <Text key={ex.id} style={styles.exerciseLine} numberOfLines={1}>
              {ex.target_sets} × {ex.target_reps ?? 'AMRAP'}  {ex.exerciseName}
            </Text>
          ))}
        </View>
      )}

      <AnimatedPressable
        onPressIn={startPress.onPressIn}
        onPressOut={startPress.onPressOut}
        onPress={onStart}
        style={[styles.startBtn, startPress.animatedStyle]}
      >
        <Ionicons name="play" size={14} color={theme.colors.textPrimary} />
        <Text style={styles.startBtnText}>Start</Text>
      </AnimatedPressable>
    </AnimatedPressable>
  );
}

export default function TemplatesScreen() {
  const { data: templates, isLoading } = useWorkoutTemplates();
  const { mutate: deleteTemplate } = useDeleteTemplate();

  const startSession = useSessionStore((s) => s.startSession);
  const hasActiveSession = useSessionStore((s) => s.hasActiveSession);
  const addExercise = useSessionStore((s) => s.addExercise);
  const addSet = useSessionStore((s) => s.addSet);

  const backPress = usePressFeedback();
  const fabPress = usePressFeedback();

  function handleStart(template: WorkoutTemplateDetail) {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);

    const begin = () => {
      // Deep-copy template into the session store — mid-session edits stay ephemeral
      startSession();
      for (const ex of template.exercises) {
        addExercise(ex.exercise_id, ex.exerciseName, ex.isUnilateral, ex.rest_seconds_override ?? ex.defaultRestSeconds);
        for (let i = 0; i < ex.target_sets; i++) {
          addSet(ex.exercise_id, {
            weightKg: ex.target_weight_kg,
            reps: ex.target_reps,
            restSeconds: ex.rest_seconds_override,
          });
        }
      }
      router.push('/(tabs)/workouts/active' as never);
    };

    if (hasActiveSession()) {
      Alert.alert('Active session', 'Starting from a template will replace your current session draft.', [
        { text: 'Cancel', style: 'cancel' },
        { text: 'Replace', style: 'destructive', onPress: begin },
      ]);
    } else {
      begin();
    }
  }

  function handleDelete(template: WorkoutTemplateDetail) {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    Alert.alert('Delete Template', `Delete "${template.name}"? This cannot be undone.`, [
      { text: 'Cancel', style: 'cancel' },
      { text: 'Delete', style: 'destructive', onPress: () => deleteTemplate(template.id) },
    ]);
  }

  return (
    <SafeAreaView style={styles.safe} edges={['top']}>
      <ScrollView contentContainerStyle={styles.scroll} showsVerticalScrollIndicator={false}>
        <View style={styles.header}>
          <AnimatedPressable
            style={[styles.backBtn, backPress.animatedStyle]}
            onPressIn={backPress.onPressIn}
            onPressOut={backPress.onPressOut}
            onPress={() => router.back()}
            hitSlop={8}
          >
            <Feather name="arrow-left" size={20} color={theme.colors.textSecondary} />
          </AnimatedPressable>
          <View style={styles.headerText}>
            <Text style={styles.dateMeta}>SAVED ROUTINES</Text>
            <Text style={styles.title}>Templates</Text>
          </View>
        </View>

        {isLoading ? (
          <View style={styles.loadingContainer}>
            <ActivityIndicator color={theme.colors.accentPrimary} size="large" />
          </View>
        ) : !templates || templates.length === 0 ? (
          <View style={styles.emptyCard}>
            <Ionicons name="albums-outline" size={32} color={theme.colors.textTertiary} />
            <Text style={styles.emptyTitle}>No templates yet</Text>
            <Text style={styles.emptyBody}>
              Build a routine once, then start it with one tap. Long-press a card to delete it.
            </Text>
          </View>
        ) : (
          <View style={styles.listContainer}>
            {templates.map((template) => (
              <TemplateCard
                key={template.id}
                template={template}
                onStart={() => handleStart(template)}
                onEdit={() => router.push(`/(modals)/create-template?templateId=${template.id}` as never)}
                onDelete={() => handleDelete(template)}
              />
            ))}
          </View>
        )}
      </ScrollView>

      <View style={styles.fabContainer}>
        <AnimatedPressable
          style={[styles.fab, fabPress.animatedStyle]}
          onPressIn={fabPress.onPressIn}
          onPressOut={fabPress.onPressOut}
          onPress={() => {
            Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
            router.push('/(modals)/create-template' as never);
          }}
        >
          <Feather name="plus" size={18} color={theme.colors.textPrimary} />
          <Text style={styles.fabText}>New Template</Text>
        </AnimatedPressable>
      </View>
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
    paddingBottom: theme.spacing.massive + theme.spacing.massive,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    paddingHorizontal: theme.spacing.xxl,
    gap: theme.spacing.md,
    marginBottom: theme.spacing.xxl,
  },
  backBtn: {
    marginTop: theme.spacing.sm,
    padding: theme.spacing.xs,
  },
  headerText: {
    gap: theme.spacing.xs,
  },
  dateMeta: {
    ...theme.typography.captionMuted,
    color: theme.colors.textTertiary,
    letterSpacing: 1.2,
    textTransform: 'uppercase',
  },
  title: {
    ...theme.typography.displayHeadline,
    color: theme.colors.textPrimary,
    lineHeight: 34,
  },
  loadingContainer: {
    paddingVertical: theme.spacing.xxxl,
    alignItems: 'center',
  },
  emptyCard: {
    marginHorizontal: theme.spacing.xxl,
    marginTop: theme.spacing.xxl,
    paddingVertical: theme.spacing.xxxl,
    paddingHorizontal: theme.spacing.xl,
    backgroundColor: theme.colors.bgSurface1,
    borderRadius: theme.radius.card,
    borderWidth: 1,
    borderColor: theme.colors.borderDefault,
    alignItems: 'center',
    gap: theme.spacing.sm,
  },
  emptyTitle: {
    ...theme.typography.bodyBold,
    color: theme.colors.textSecondary,
    marginTop: theme.spacing.sm,
  },
  emptyBody: {
    ...theme.typography.captionMuted,
    color: theme.colors.textTertiary,
    textAlign: 'center',
  },
  listContainer: {
    paddingHorizontal: theme.spacing.xxl,
    gap: theme.spacing.lg,
  },
  card: {
    backgroundColor: theme.colors.bgSurface1,
    borderRadius: theme.radius.card,
    borderWidth: 1,
    borderColor: theme.colors.borderDefault,
    padding: theme.spacing.lg,
    gap: theme.spacing.md,
  },
  cardHeader: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    justifyContent: 'space-between',
    gap: theme.spacing.md,
  },
  cardTitleBlock: {
    flex: 1,
    gap: theme.spacing.xs,
  },
  cardName: {
    ...theme.typography.bodyBold,
    color: theme.colors.textPrimary,
  },
  cardMeta: {
    ...theme.typography.captionMuted,
    color: theme.colors.textTertiary,
  },
  editBtn: {
    padding: theme.spacing.xs,
  },
  exerciseList: {
    gap: theme.spacing.xs,
  },
  exerciseLine: {
    ...theme.typography.captionMuted,
    color: theme.colors.textSecondary,
  },
  startBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: theme.spacing.sm,
    backgroundColor: theme.colors.accentPrimary,
    borderRadius: theme.radius.button,
    paddingVertical: theme.spacing.md,
  },
  startBtnText: {
    ...theme.typography.bodyBold,
    color: theme.colors.textPrimary,
  },
  fabContainer: {
    position: 'absolute',
    bottom: theme.spacing.xxxl,
    left: theme.spacing.xxl,
    right: theme.spacing.xxl,
  },
  fab: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: theme.spacing.sm,
    backgroundColor: theme.colors.bgSurface3,
    borderWidth: 1,
    borderColor: theme.colors.borderStrong,
    borderRadius: theme.radius.button,
    paddingVertical: theme.spacing.lg,
  },
  fabText: {
    ...theme.typography.bodyBold,
    color: theme.colors.textPrimary,
  },
});
