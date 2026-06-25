import { useEffect, useState } from 'react';
import {
  View,
  Text,
  TextInput,
  StyleSheet,
  Pressable,
  ScrollView,
  KeyboardAvoidingView,
  Platform,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { router, useLocalSearchParams } from 'expo-router';
import Animated, { useSharedValue, useAnimatedStyle, withTiming } from 'react-native-reanimated';
import * as Haptics from 'expo-haptics';
import { Feather } from '@expo/vector-icons';

import { theme } from '@/lib/theme';
import { generateId } from '@/lib/generateId';
import { useExerciseSearch } from '@/hooks/useExerciseSearch';
import { useWorkoutTemplates } from '@/hooks/useWorkoutTemplates';
import {
  useCreateTemplate,
  useUpdateTemplate,
  type TemplateExerciseDraft,
} from '@/hooks/useTemplateMutations';
import type { ExerciseRow } from '@/hooks/useExercises';

const AnimatedPressable = Animated.createAnimatedComponent(Pressable);

function usePressFeedback() {
  const scale = useSharedValue(1);
  const animatedStyle = useAnimatedStyle(() => ({ transform: [{ scale: scale.value }] }));
  const onPressIn = () => { scale.value = withTiming(0.97, { duration: theme.animation.press }); };
  const onPressOut = () => { scale.value = withTiming(1, { duration: theme.animation.press }); };
  return { animatedStyle, onPressIn, onPressOut };
}

function parseIntOrNull(raw: string): number | null {
  const v = parseInt(raw, 10);
  return isNaN(v) ? null : v;
}

function parseFloatOrNull(raw: string): number | null {
  const v = parseFloat(raw);
  return isNaN(v) ? null : v;
}

// ─── Per-exercise prescription row ────────────────────────────────────────────

function ExerciseDraftRow({
  draft,
  onChange,
  onRemove,
}: {
  draft: TemplateExerciseDraft;
  onChange: (updates: Partial<TemplateExerciseDraft>) => void;
  onRemove: () => void;
}) {
  const removePress = usePressFeedback();
  const [setsStr, setSetsStr] = useState(String(draft.targetSets));
  const [repsStr, setRepsStr] = useState(draft.targetReps?.toString() ?? '');
  const [weightStr, setWeightStr] = useState(draft.targetWeightKg?.toString() ?? '');
  const [restStr, setRestStr] = useState(draft.restSecondsOverride?.toString() ?? '');

  return (
    <View style={styles.draftRow}>
      <View style={styles.draftHeader}>
        <Text style={styles.draftName} numberOfLines={1}>{draft.exerciseName}</Text>
        <AnimatedPressable
          hitSlop={8}
          onPressIn={removePress.onPressIn}
          onPressOut={removePress.onPressOut}
          onPress={onRemove}
          style={removePress.animatedStyle}
        >
          <Feather name="x" size={16} color={theme.colors.textTertiary} />
        </AnimatedPressable>
      </View>
      <View style={styles.draftFields}>
        <View style={styles.draftField}>
          <Text style={styles.draftFieldLabel}>SETS</Text>
          <TextInput
            style={styles.draftInput}
            value={setsStr}
            onChangeText={setSetsStr}
            onBlur={() => onChange({ targetSets: Math.max(1, parseIntOrNull(setsStr) ?? 1) })}
            keyboardType="number-pad"
            placeholder="3"
            placeholderTextColor={theme.colors.textTertiary}
            selectTextOnFocus
          />
        </View>
        <View style={styles.draftField}>
          <Text style={styles.draftFieldLabel}>REPS</Text>
          <TextInput
            style={styles.draftInput}
            value={repsStr}
            onChangeText={setRepsStr}
            onBlur={() => onChange({ targetReps: parseIntOrNull(repsStr) })}
            keyboardType="number-pad"
            placeholder="—"
            placeholderTextColor={theme.colors.textTertiary}
            selectTextOnFocus
          />
        </View>
        <View style={styles.draftField}>
          <Text style={styles.draftFieldLabel}>KG</Text>
          <TextInput
            style={styles.draftInput}
            value={weightStr}
            onChangeText={setWeightStr}
            onBlur={() => onChange({ targetWeightKg: parseFloatOrNull(weightStr) })}
            keyboardType="decimal-pad"
            placeholder="—"
            placeholderTextColor={theme.colors.textTertiary}
            selectTextOnFocus
          />
        </View>
        <View style={styles.draftField}>
          <Text style={styles.draftFieldLabel}>REST s</Text>
          <TextInput
            style={styles.draftInput}
            value={restStr}
            onChangeText={setRestStr}
            onBlur={() => onChange({ restSecondsOverride: parseIntOrNull(restStr) })}
            keyboardType="number-pad"
            placeholder="auto"
            placeholderTextColor={theme.colors.textTertiary}
            selectTextOnFocus
          />
        </View>
      </View>
    </View>
  );
}

// ─── Modal ────────────────────────────────────────────────────────────────────

export default function CreateTemplateModal() {
  const { templateId } = useLocalSearchParams<{ templateId?: string }>();
  const isEdit = !!templateId;

  const { data: templates } = useWorkoutTemplates();
  const { mutate: createTemplate, isPending: creating } = useCreateTemplate();
  const { mutate: updateTemplate, isPending: updating } = useUpdateTemplate();

  const [name, setName] = useState('');
  const [drafts, setDrafts] = useState<TemplateExerciseDraft[]>([]);
  const [query, setQuery] = useState('');
  const [prefilled, setPrefilled] = useState(false);
  const { results } = useExerciseSearch(query);

  const savePress = usePressFeedback();

  // Prefill once when editing an existing template
  useEffect(() => {
    if (!isEdit || prefilled || !templates) return;
    const existing = templates.find((t) => t.id === templateId);
    if (!existing) return;
    setName(existing.name);
    setDrafts(
      existing.exercises.map((ex) => ({
        exerciseId: ex.exercise_id,
        exerciseName: ex.exerciseName,
        isUnilateral: ex.isUnilateral,
        defaultRestSeconds: ex.defaultRestSeconds,
        targetSets: ex.target_sets,
        targetReps: ex.target_reps,
        targetWeightKg: ex.target_weight_kg,
        restSecondsOverride: ex.rest_seconds_override,
      })),
    );
    setPrefilled(true);
  }, [isEdit, prefilled, templates, templateId]);

  function addExerciseToDraft(exercise: ExerciseRow) {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    setQuery('');
    setDrafts((prev) => {
      if (prev.some((d) => d.exerciseId === exercise.id)) return prev;
      return [
        ...prev,
        {
          exerciseId: exercise.id,
          exerciseName: exercise.name,
          isUnilateral: exercise.is_unilateral,
          defaultRestSeconds: exercise.default_rest_seconds,
          targetSets: 3,
          targetReps: null,
          targetWeightKg: null,
          restSecondsOverride: null,
        },
      ];
    });
  }

  const canSave = name.trim().length > 0 && drafts.length > 0 && !creating && !updating;

  function handleSave() {
    if (!canSave) return;
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    const payload = {
      templateId: isEdit ? templateId! : generateId(),
      name: name.trim(),
      notes: null,
      exercises: drafts,
    };
    if (isEdit) {
      updateTemplate(payload);
    } else {
      createTemplate(payload);
    }
    router.back();
  }

  return (
    <SafeAreaView style={styles.safe} edges={['top']}>
      <KeyboardAvoidingView
        style={styles.flex}
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      >
        <ScrollView
          contentContainerStyle={styles.content}
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}
        >
          <View style={styles.handle} />
          <Text style={styles.title}>{isEdit ? 'Edit Template' : 'New Template'}</Text>

          {/* Name */}
          <Text style={styles.fieldLabel}>Template name</Text>
          <TextInput
            style={styles.nameInput}
            value={name}
            onChangeText={setName}
            placeholder="Push Day A"
            placeholderTextColor={theme.colors.textTertiary}
            returnKeyType="done"
          />

          {/* Selected exercises */}
          {drafts.length > 0 && (
            <View style={styles.draftList}>
              {drafts.map((draft, idx) => (
                <ExerciseDraftRow
                  key={draft.exerciseId}
                  draft={draft}
                  onChange={(updates) =>
                    setDrafts((prev) => prev.map((d, i) => (i === idx ? { ...d, ...updates } : d)))
                  }
                  onRemove={() => {
                    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                    setDrafts((prev) => prev.filter((_, i) => i !== idx));
                  }}
                />
              ))}
            </View>
          )}

          {/* Exercise search */}
          <Text style={[styles.fieldLabel, { marginTop: theme.spacing.xl }]}>Add exercises</Text>
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

          {query.trim().length > 0 && (
            <View style={styles.resultsList}>
              {results.length === 0 ? (
                <Text style={styles.emptyText}>No exercises found.</Text>
              ) : (
                results.slice(0, 8).map((exercise) => (
                  <Pressable
                    key={exercise.id}
                    style={styles.resultRow}
                    onPress={() => addExerciseToDraft(exercise)}
                  >
                    <View style={styles.resultText}>
                      <Text style={styles.resultName}>{exercise.name}</Text>
                      <Text style={styles.resultMeta}>
                        {[exercise.muscle_group, exercise.equipment].filter(Boolean).join(' · ')}
                      </Text>
                    </View>
                    <Feather name="plus" size={16} color={theme.colors.accentPrimary} />
                  </Pressable>
                ))
              )}
            </View>
          )}
        </ScrollView>

        {/* Save CTA */}
        <View style={styles.footer}>
          <AnimatedPressable
            onPressIn={savePress.onPressIn}
            onPressOut={savePress.onPressOut}
            onPress={handleSave}
            disabled={!canSave}
            style={[styles.saveBtn, !canSave && styles.saveBtnDisabled, savePress.animatedStyle]}
          >
            <Text style={styles.saveBtnText}>{isEdit ? 'Save Changes' : 'Create Template'}</Text>
          </AnimatedPressable>
        </View>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: {
    flex: 1,
    backgroundColor: theme.colors.bgSurface2,
  },
  flex: {
    flex: 1,
  },
  content: {
    paddingHorizontal: theme.spacing.xxl,
    paddingTop: theme.spacing.lg,
    paddingBottom: theme.spacing.massive,
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
    marginBottom: theme.spacing.xl,
  },
  fieldLabel: {
    ...theme.typography.captionMuted,
    color: theme.colors.textTertiary,
    letterSpacing: 0.8,
    textTransform: 'uppercase',
    marginBottom: theme.spacing.sm,
  },
  nameInput: {
    ...theme.typography.bodyCore,
    color: theme.colors.textPrimary,
    backgroundColor: theme.colors.bgSurface3,
    borderRadius: theme.radius.button,
    borderWidth: 1,
    borderColor: theme.colors.borderDefault,
    paddingHorizontal: theme.spacing.lg,
    paddingVertical: theme.spacing.md,
    marginBottom: theme.spacing.xl,
  },
  draftList: {
    gap: theme.spacing.md,
  },
  draftRow: {
    backgroundColor: theme.colors.bgSurface3,
    borderRadius: theme.radius.card,
    borderWidth: 1,
    borderColor: theme.colors.borderDefault,
    padding: theme.spacing.md,
    gap: theme.spacing.md,
  },
  draftHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: theme.spacing.md,
  },
  draftName: {
    ...theme.typography.bodyBold,
    color: theme.colors.textPrimary,
    flex: 1,
  },
  draftFields: {
    flexDirection: 'row',
    gap: theme.spacing.sm,
  },
  draftField: {
    flex: 1,
    gap: theme.spacing.xs,
  },
  draftFieldLabel: {
    fontSize: 10,
    fontFamily: theme.fonts.body.fontFamily,
    color: theme.colors.textTertiary,
    letterSpacing: 0.8,
  },
  draftInput: {
    ...theme.typography.monoDataSmall,
    color: theme.colors.textPrimary,
    backgroundColor: theme.colors.bgSurface2,
    borderRadius: theme.radius.button,
    borderWidth: 1,
    borderColor: theme.colors.borderDefault,
    paddingVertical: theme.spacing.sm,
    textAlign: 'center',
  },
  searchBar: {
    backgroundColor: theme.colors.bgSurface3,
    borderRadius: theme.radius.button,
    borderWidth: 1,
    borderColor: theme.colors.borderDefault,
  },
  searchInput: {
    ...theme.typography.bodyCore,
    color: theme.colors.textPrimary,
    paddingHorizontal: theme.spacing.lg,
    paddingVertical: theme.spacing.md,
  },
  resultsList: {
    marginTop: theme.spacing.sm,
  },
  resultRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: theme.spacing.md,
    borderBottomWidth: 1,
    borderBottomColor: theme.colors.borderDefault,
    gap: theme.spacing.md,
  },
  resultText: {
    flex: 1,
    gap: theme.spacing.xs,
  },
  resultName: {
    ...theme.typography.bodyCore,
    color: theme.colors.textPrimary,
  },
  resultMeta: {
    ...theme.typography.captionMuted,
    color: theme.colors.textSecondary,
  },
  emptyText: {
    ...theme.typography.captionMuted,
    color: theme.colors.textTertiary,
    textAlign: 'center',
    paddingVertical: theme.spacing.lg,
  },
  footer: {
    paddingHorizontal: theme.spacing.xxl,
    paddingVertical: theme.spacing.lg,
    borderTopWidth: 1,
    borderTopColor: theme.colors.borderDefault,
  },
  saveBtn: {
    backgroundColor: theme.colors.accentPrimary,
    borderRadius: theme.radius.button,
    paddingVertical: theme.spacing.lg,
    alignItems: 'center',
  },
  saveBtnDisabled: {
    backgroundColor: theme.colors.bgSurface3,
  },
  saveBtnText: {
    ...theme.typography.bodyBold,
    color: theme.colors.textPrimary,
  },
});
