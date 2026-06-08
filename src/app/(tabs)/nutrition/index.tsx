import { useState, useRef } from 'react';
import {
  View, Text, Pressable, ScrollView, StyleSheet, Alert,
  TextInput, KeyboardAvoidingView, Platform,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { router } from 'expo-router';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withTiming,
} from 'react-native-reanimated';
import * as Haptics from 'expo-haptics';
import { Feather, Ionicons } from '@expo/vector-icons';

import { theme } from '@/lib/theme';
import { useNutritionToday, type MealWithItems, type MealItemView } from '@/hooks/useNutritionToday';
import { useDeleteMealItem } from '@/hooks/useDeleteMealItem';
import { useLogMealFromCoach } from '@/hooks/useLogMealFromCoach';
import { useCoach2Parse } from '@/hooks/useCoach2Parse';
import type { ParseResult, ParsedItem } from '@/lib/nutritionMockParser';
import type { MealType } from '@/types/database.types';

const AnimatedPressable = Animated.createAnimatedComponent(Pressable);

const MEAL_ORDER: MealWithItems['mealType'][] = ['breakfast', 'lunch', 'dinner', 'snack'];
const MEAL_LABELS: Record<MealWithItems['mealType'], string> = {
  breakfast: 'Breakfast',
  lunch: 'Lunch',
  dinner: 'Dinner',
  snack: 'Snack',
};

function getDateLabel(): string {
  const now = new Date();
  const days = ['SUNDAY', 'MONDAY', 'TUESDAY', 'WEDNESDAY', 'THURSDAY', 'FRIDAY', 'SATURDAY'];
  const months = ['JAN', 'FEB', 'MAR', 'APR', 'MAY', 'JUN', 'JUL', 'AUG', 'SEP', 'OCT', 'NOV', 'DEC'];
  return `${days[now.getDay()]} · ${months[now.getMonth()]} ${now.getDate()}`;
}

// ─── Macro Progress Bar ────────────────────────────────────────────────────────

function MacroBar({
  label,
  current,
  goal,
  unit,
  fillColor,
}: {
  label: string;
  current: number;
  goal: number;
  unit: string;
  fillColor: string;
}) {
  const pct = goal > 0 ? Math.min(current / goal, 1) : 0;
  const displayCurrent = Math.round(current);
  const displayGoal = Math.round(goal);

  return (
    <View style={styles.macroRow}>
      <View style={styles.macroLabelRow}>
        <Text style={styles.macroLabel}>{label}</Text>
        <Text style={styles.macroValue}>
          <Text style={[styles.macroValueCurrent, { color: fillColor }]}>{displayCurrent}</Text>
          <Text style={styles.macroValueSep}> / </Text>
          <Text style={styles.macroValueGoal}>{displayGoal} {unit}</Text>
        </Text>
      </View>
      <View style={styles.barTrack}>
        <View style={[styles.barFill, { width: `${pct * 100}%`, backgroundColor: fillColor }]} />
      </View>
    </View>
  );
}

// ─── Macro Progress Card ───────────────────────────────────────────────────────

function MacroProgressCard({
  kcal,
  kcalGoal,
  proteinG,
  proteinGoalG,
}: {
  kcal: number;
  kcalGoal: number;
  proteinG: number;
  proteinGoalG: number;
}) {
  return (
    <View style={styles.macroCard}>
      <MacroBar
        label="KCAL"
        current={kcal}
        goal={kcalGoal}
        unit="kcal"
        fillColor={theme.colors.ringCalories}
      />
      <View style={styles.macroDivider} />
      <MacroBar
        label="PROTEIN"
        current={proteinG}
        goal={proteinGoalG}
        unit="g"
        fillColor={theme.colors.accentPrimary}
      />
    </View>
  );
}

// ─── Meal Item Row ─────────────────────────────────────────────────────────────

function MealItemRow({
  item,
  isLast,
  onDelete,
}: {
  item: MealItemView;
  isLast: boolean;
  onDelete: () => void;
}) {
  const scale = useSharedValue(1);
  const animStyle = useAnimatedStyle(() => ({ transform: [{ scale: scale.value }] }));
  const deleteScale = useSharedValue(1);
  const deleteAnimStyle = useAnimatedStyle(() => ({ transform: [{ scale: deleteScale.value }] }));

  function handleDeletePress() {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    Alert.alert(
      'Remove item',
      `Remove "${item.foodName}" from today's log?`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Remove',
          style: 'destructive',
          onPress: () => {
            Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning);
            onDelete();
          },
        },
      ],
    );
  }

  return (
    <AnimatedPressable
      style={[styles.itemRow, !isLast && styles.itemRowBorder, animStyle]}
      onPressIn={() => { scale.value = withTiming(0.97, { duration: theme.animation.press }); }}
      onPressOut={() => { scale.value = withTiming(1, { duration: theme.animation.press }); }}
      onPress={handleDeletePress}
    >
      <View style={styles.itemInfo}>
        <Text style={styles.itemName} numberOfLines={1}>{item.foodName}</Text>
        {item.foodBrand ? (
          <Text style={styles.itemBrand} numberOfLines={1}>{item.foodBrand}</Text>
        ) : null}
        <Text style={styles.itemMeta}>
          {item.quantity} {item.unit}
          {item.proteinG > 0 ? `  ·  ${Math.round(item.proteinG)}g protein` : ''}
        </Text>
      </View>
      <View style={styles.itemRight}>
        <Text style={styles.itemKcal}>{Math.round(item.kcal)}</Text>
        <Text style={styles.itemKcalUnit}>kcal</Text>
      </View>
      <AnimatedPressable
        style={[styles.deleteBtn, deleteAnimStyle]}
        onPressIn={() => { deleteScale.value = withTiming(0.97, { duration: theme.animation.press }); }}
        onPressOut={() => { deleteScale.value = withTiming(1, { duration: theme.animation.press }); }}
        onPress={handleDeletePress}
        hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
      >
        <Feather name="trash-2" size={14} color={theme.colors.textTertiary} />
      </AnimatedPressable>
    </AnimatedPressable>
  );
}

// ─── Meal Section ──────────────────────────────────────────────────────────────

function MealSection({
  meals,
  mealType,
  onDeleteItem,
}: {
  meals: MealWithItems[];
  mealType: MealWithItems['mealType'];
  onDeleteItem: (itemId: string) => void;
}) {
  const mealsOfType = meals.filter((m) => m.mealType === mealType);
  if (mealsOfType.length === 0) return null;

  const allItems = mealsOfType.flatMap((m) => m.items);
  const sectionKcal = allItems.reduce((sum, it) => sum + it.kcal, 0);

  return (
    <View style={styles.mealSection}>
      <View style={styles.mealHeader}>
        <Text style={styles.mealLabel}>{MEAL_LABELS[mealType]}</Text>
        <Text style={styles.mealKcalTotal}>{Math.round(sectionKcal)} kcal</Text>
      </View>
      <View style={styles.mealCard}>
        {allItems.map((item, idx) => (
          <MealItemRow
            key={item.id}
            item={item}
            isLast={idx === allItems.length - 1}
            onDelete={() => onDeleteItem(item.id)}
          />
        ))}
      </View>
    </View>
  );
}

// ─── Empty State ───────────────────────────────────────────────────────────────

function EmptyState() {
  return (
    <View style={styles.emptyCard}>
      <Ionicons name="restaurant-outline" size={32} color={theme.colors.textTertiary} />
      <Text style={styles.emptyTitle}>No meals logged today</Text>
      <Text style={styles.emptyBody}>Use Coach 2 to log what you ate.</Text>
    </View>
  );
}

// ─── Coach 2 Input Section ─────────────────────────────────────────────────────

const MEAL_TYPE_OPTIONS: MealType[] = ['breakfast', 'lunch', 'dinner', 'snack'];

function MealTypeChip({ type, selected, onPress }: { type: MealType; selected: boolean; onPress: () => void }) {
  const press = useSharedValue(1);
  const animStyle = useAnimatedStyle(() => ({ transform: [{ scale: press.value }] }));
  return (
    <AnimatedPressable
      style={[styles.mealTypeChip, selected && styles.mealTypeChipActive, animStyle]}
      onPressIn={() => { press.value = withTiming(0.97, { duration: theme.animation.press }); }}
      onPressOut={() => { press.value = withTiming(1, { duration: theme.animation.press }); }}
      onPress={onPress}
    >
      <Text style={[styles.mealTypeChipText, selected && styles.mealTypeChipTextActive]}>
        {MEAL_LABELS[type]}
      </Text>
    </AnimatedPressable>
  );
}

function ActionBtn({ onPress, disabled, style, children }: { onPress: () => void; disabled?: boolean; style?: object; children: React.ReactNode }) {
  const press = useSharedValue(1);
  const animStyle = useAnimatedStyle(() => ({ transform: [{ scale: press.value }] }));
  return (
    <AnimatedPressable
      onPressIn={() => { press.value = withTiming(0.97, { duration: theme.animation.press }); }}
      onPressOut={() => { press.value = withTiming(1, { duration: theme.animation.press }); }}
      onPress={onPress}
      disabled={disabled}
      style={[style, animStyle]}
    >
      {children}
    </AnimatedPressable>
  );
}

function Coach2Input() {
  const [text, setText] = useState('');
  const [parseResult, setParseResult] = useState<ParseResult | null>(null);
  const [selectedMealType, setSelectedMealType] = useState<MealType>('lunch');
  const { mutate: logMeal, isPending } = useLogMealFromCoach();
  const { parse, isParsing, parseError } = useCoach2Parse();
  const inputRef = useRef<TextInput>(null);

  const sendScale = useSharedValue(1);
  const sendAnimStyle = useAnimatedStyle(() => ({ transform: [{ scale: sendScale.value }] }));

  async function handleParse() {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    const result = await parse(text.trim());
    if (result) setParseResult(result);
  }

  function handleConfirm() {
    if (!parseResult || parseResult.items.length === 0) return;
    logMeal(
      { mealType: selectedMealType, items: parseResult.items },
      {
        onSuccess: () => {
          Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
          setText('');
          setParseResult(null);
        },
        onError: () => {
          Alert.alert('Error', 'Could not log meal. Try again.');
        },
      },
    );
  }

  function handleDiscard() {
    setParseResult(null);
  }

  return (
    <View style={styles.coach2Container}>
      <View style={styles.coach2Header}>
        <Text style={styles.coach2Label}>COACH 2</Text>
        <Text style={styles.coach2Subtitle}>Log food in plain language</Text>
      </View>

      {/* Text input row */}
      <View style={styles.coach2InputRow}>
        <TextInput
          ref={inputRef}
          style={styles.coach2TextInput}
          placeholder="e.g. 2 eggs and a banana"
          placeholderTextColor={theme.colors.textTertiary}
          value={text}
          onChangeText={setText}
          multiline={false}
          returnKeyType="send"
          onSubmitEditing={handleParse}
        />
        <Animated.View style={sendAnimStyle}>
          <Pressable
            style={[styles.coach2SendBtn, (!text.trim() || isPending || isParsing) && styles.coach2SendBtnDisabled]}
            disabled={!text.trim() || isPending || isParsing}
            onPressIn={() => { sendScale.value = withTiming(0.97, { duration: theme.animation.press }); }}
            onPressOut={() => { sendScale.value = withTiming(1, { duration: theme.animation.press }); }}
            onPress={handleParse}
          >
            {isParsing
              ? <Feather name="loader" size={18} color={theme.colors.bgCanvas} />
              : <Feather name="arrow-up" size={18} color={theme.colors.bgCanvas} />
            }
          </Pressable>
        </Animated.View>
      </View>

      {/* API / parse error */}
      {parseError !== null && (
        <View style={styles.parseErrorBox}>
          <Feather name="alert-circle" size={14} color={theme.colors.ringCalories} />
          <Text style={styles.parseErrorText}>{parseError}</Text>
        </View>
      )}

      {/* Parse result card */}
      {parseResult !== null && (
        <View style={styles.coach2ResultCard}>
          {parseResult.clarification_needed ? (
            // ── Clarification state ──
            <View style={styles.clarifyBox}>
              <Feather name="help-circle" size={18} color={theme.colors.ringCalories} />
              <Text style={styles.clarifyText}>{parseResult.clarification_message}</Text>
            </View>
          ) : (
            <>
              {/* Confidence badge */}
              <View style={styles.confidenceRow}>
                <Text style={styles.confidenceLabel}>CONFIDENCE</Text>
                <View style={[
                  styles.confidenceBadge,
                  { backgroundColor: parseResult.confidence_score >= 80 ? theme.colors.accentPrimary : theme.colors.ringCalories },
                ]}>
                  <Text style={styles.confidenceBadgeText}>{parseResult.confidence_score}%</Text>
                </View>
              </View>

              {/* Parsed items list */}
              <View style={styles.parsedItems}>
                {parseResult.items.map((item, idx) => (
                  <ParsedItemRow key={idx} item={item} isLast={idx === parseResult.items.length - 1} />
                ))}
              </View>

              {/* Meal type selector */}
              <View style={styles.mealTypeRow}>
                {MEAL_TYPE_OPTIONS.map((type) => (
                  <MealTypeChip
                    key={type}
                    type={type}
                    selected={selectedMealType === type}
                    onPress={() => {
                      setSelectedMealType(type);
                      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                    }}
                  />
                ))}
              </View>

              {/* Action buttons */}
              <View style={styles.coach2Actions}>
                <ActionBtn style={styles.discardBtn} onPress={handleDiscard}>
                  <Text style={styles.discardBtnText}>Discard</Text>
                </ActionBtn>
                <ActionBtn
                  style={[styles.confirmBtn, isPending && styles.confirmBtnDisabled]}
                  disabled={isPending}
                  onPress={handleConfirm}
                >
                  <Text style={styles.confirmBtnText}>{isPending ? 'Logging...' : 'Log Meal'}</Text>
                </ActionBtn>
              </View>
            </>
          )}
        </View>
      )}
    </View>
  );
}

function ParsedItemRow({ item, isLast }: { item: ParsedItem; isLast: boolean }) {
  return (
    <View style={[styles.parsedItemRow, !isLast && styles.parsedItemRowBorder]}>
      <View style={styles.parsedItemInfo}>
        <Text style={styles.parsedItemName}>{item.name}</Text>
        <Text style={styles.parsedItemMeta}>
          {item.quantity} {item.unit}
          {item.protein_g > 0 ? `  ·  ${Math.round(item.protein_g)}g protein` : ''}
        </Text>
      </View>
      <Text style={styles.parsedItemKcal}>{Math.round(item.kcal)} <Text style={styles.parsedItemKcalUnit}>kcal</Text></Text>
    </View>
  );
}

// ─── Screen ────────────────────────────────────────────────────────────────────

export default function NutritionScreen() {
  const { data, isLoading } = useNutritionToday();
  const { mutate: deleteItem } = useDeleteMealItem();
  const historyPress = useSharedValue(1);
  const historyAnimStyle = useAnimatedStyle(() => ({ transform: [{ scale: historyPress.value }] }));

  const meals = data?.meals ?? [];
  const totals = data?.totals ?? { kcal: 0, proteinG: 0, carbsG: 0, fatG: 0 };
  const goals = data?.goals ?? { kcalGoal: 2200, proteinGoalG: 150 };
  const hasMeals = meals.length > 0;

  return (
    <SafeAreaView style={styles.safe} edges={['top']}>
      <KeyboardAvoidingView
        style={{ flex: 1 }}
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        keyboardVerticalOffset={Platform.OS === 'ios' ? 0 : 24}
      >
        <ScrollView contentContainerStyle={styles.scroll} showsVerticalScrollIndicator={false}>

          {/* Header */}
          <View style={styles.header}>
            <View style={styles.headerTop}>
              <Text style={styles.dateMeta}>{getDateLabel()}</Text>
              <AnimatedPressable
                style={[styles.historyBtn, historyAnimStyle]}
                onPressIn={() => { historyPress.value = withTiming(0.97, { duration: theme.animation.press }); }}
                onPressOut={() => { historyPress.value = withTiming(1, { duration: theme.animation.press }); }}
                onPress={() => router.push('/(tabs)/nutrition/history')}
                hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
              >
                <Feather name="bar-chart-2" size={18} color={theme.colors.textTertiary} />
              </AnimatedPressable>
            </View>
            <Text style={styles.title}>Nutrition</Text>
          </View>

          {/* Macro Progress Card */}
          <MacroProgressCard
            kcal={totals.kcal}
            kcalGoal={goals.kcalGoal}
            proteinG={totals.proteinG}
            proteinGoalG={goals.proteinGoalG}
          />

          {/* Secondary totals strip */}
          {hasMeals && (
            <View style={styles.secondaryStrip}>
              <View style={styles.secondaryItem}>
                <Text style={styles.secondaryValue}>{Math.round(totals.carbsG)}<Text style={styles.secondaryUnit}>g</Text></Text>
                <Text style={styles.secondaryLabel}>Carbs</Text>
              </View>
              <View style={styles.secondarySep} />
              <View style={styles.secondaryItem}>
                <Text style={styles.secondaryValue}>{Math.round(totals.fatG)}<Text style={styles.secondaryUnit}>g</Text></Text>
                <Text style={styles.secondaryLabel}>Fat</Text>
              </View>
            </View>
          )}

          {/* Meals list */}
          {hasMeals ? (
            <View style={styles.mealsList}>
              {MEAL_ORDER.map((type) => (
                <MealSection
                  key={type}
                  meals={meals}
                  mealType={type}
                  onDeleteItem={(id) => deleteItem(id)}
                />
              ))}
            </View>
          ) : !isLoading ? (
            <EmptyState />
          ) : null}

          {/* Coach 2 NLP input */}
          <Coach2Input />

        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

// ─── Styles ────────────────────────────────────────────────────────────────────

const styles = StyleSheet.create({
  safe: {
    flex: 1,
    backgroundColor: theme.colors.bgCanvas,
  },
  scroll: {
    paddingTop: theme.spacing.xl,
    paddingBottom: theme.spacing.massive,
  },

  // Header
  header: {
    paddingHorizontal: theme.spacing.xxl,
    gap: theme.spacing.xs,
    marginBottom: theme.spacing.xxl,
  },
  headerTop: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  historyBtn: {
    padding: theme.spacing.xs,
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

  // Macro card
  macroCard: {
    marginHorizontal: theme.spacing.xxl,
    backgroundColor: theme.colors.bgSurface1,
    borderRadius: theme.radius.card,
    borderWidth: 1,
    borderColor: theme.colors.borderDefault,
    padding: theme.spacing.lg,
    gap: theme.spacing.md,
  },
  macroDivider: {
    height: 1,
    backgroundColor: theme.colors.borderDefault,
  },
  macroRow: {
    gap: theme.spacing.sm,
  },
  macroLabelRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'baseline',
  },
  macroLabel: {
    fontSize: 11,
    fontFamily: theme.fonts.body.fontFamily,
    color: theme.colors.textTertiary,
    letterSpacing: 1.4,
    textTransform: 'uppercase',
  },
  macroValue: {
    flexDirection: 'row',
    alignItems: 'baseline',
  },
  macroValueCurrent: {
    fontSize: 18,
    fontFamily: theme.fonts.mono.fontFamily,
    lineHeight: 22,
  },
  macroValueSep: {
    fontSize: 14,
    fontFamily: theme.fonts.body.fontFamily,
    color: theme.colors.textTertiary,
  },
  macroValueGoal: {
    fontSize: 13,
    fontFamily: theme.fonts.body.fontFamily,
    color: theme.colors.textSecondary,
  },
  barTrack: {
    height: 6,
    backgroundColor: theme.colors.bgSurface2,
    borderRadius: theme.radius.pill,
    overflow: 'hidden',
  },
  barFill: {
    height: 6,
    borderRadius: theme.radius.pill,
  },

  // Secondary strip
  secondaryStrip: {
    flexDirection: 'row',
    marginHorizontal: theme.spacing.xxl,
    marginTop: theme.spacing.sm,
    backgroundColor: theme.colors.bgSurface1,
    borderRadius: theme.radius.button,
    borderWidth: 1,
    borderColor: theme.colors.borderDefault,
    paddingVertical: theme.spacing.md,
  },
  secondaryItem: {
    flex: 1,
    alignItems: 'center',
    gap: 2,
  },
  secondarySep: {
    width: 1,
    backgroundColor: theme.colors.borderDefault,
  },
  secondaryValue: {
    fontSize: 16,
    fontFamily: theme.fonts.mono.fontFamily,
    color: theme.colors.textPrimary,
  },
  secondaryUnit: {
    fontSize: 12,
    fontFamily: theme.fonts.body.fontFamily,
    color: theme.colors.textSecondary,
  },
  secondaryLabel: {
    fontSize: 11,
    fontFamily: theme.fonts.body.fontFamily,
    color: theme.colors.textTertiary,
    letterSpacing: 0.8,
    textTransform: 'uppercase',
  },

  // Meals list
  mealsList: {
    marginTop: theme.spacing.xxl,
    gap: theme.spacing.lg,
  },
  mealSection: {
    gap: theme.spacing.sm,
  },
  mealHeader: {
    paddingHorizontal: theme.spacing.xxl,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'baseline',
  },
  mealLabel: {
    fontSize: 13,
    fontFamily: theme.fonts.bodyBold.fontFamily,
    color: theme.colors.textSecondary,
    letterSpacing: 0.4,
  },
  mealKcalTotal: {
    fontSize: 12,
    fontFamily: theme.fonts.mono.fontFamily,
    color: theme.colors.textTertiary,
  },
  mealCard: {
    marginHorizontal: theme.spacing.xxl,
    backgroundColor: theme.colors.bgSurface1,
    borderRadius: theme.radius.card,
    borderWidth: 1,
    borderColor: theme.colors.borderDefault,
    overflow: 'hidden',
  },

  // Item row
  itemRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: theme.spacing.lg,
    paddingVertical: theme.spacing.md,
    gap: theme.spacing.sm,
    minHeight: 56,
  },
  itemRowBorder: {
    borderBottomWidth: 1,
    borderBottomColor: theme.colors.borderDefault,
  },
  itemInfo: {
    flex: 1,
    gap: 2,
  },
  itemName: {
    fontSize: 15,
    fontFamily: theme.fonts.bodyBold.fontFamily,
    color: theme.colors.textPrimary,
  },
  itemBrand: {
    fontSize: 12,
    fontFamily: theme.fonts.body.fontFamily,
    color: theme.colors.textTertiary,
  },
  itemMeta: {
    fontSize: 12,
    fontFamily: theme.fonts.body.fontFamily,
    color: theme.colors.textSecondary,
  },
  itemRight: {
    alignItems: 'flex-end',
    gap: 1,
  },
  itemKcal: {
    fontSize: 16,
    fontFamily: theme.fonts.mono.fontFamily,
    color: theme.colors.textPrimary,
  },
  itemKcalUnit: {
    fontSize: 11,
    fontFamily: theme.fonts.body.fontFamily,
    color: theme.colors.textTertiary,
  },
  deleteBtn: {
    padding: theme.spacing.xs,
  },

  // Empty state
  emptyCard: {
    marginHorizontal: theme.spacing.xxl,
    marginTop: theme.spacing.xxl,
    paddingVertical: theme.spacing.xxxl,
    backgroundColor: theme.colors.bgSurface1,
    borderRadius: theme.radius.card,
    borderWidth: 1,
    borderColor: theme.colors.borderDefault,
    alignItems: 'center',
    gap: theme.spacing.sm,
  },
  emptyTitle: {
    fontSize: 16,
    fontFamily: theme.fonts.bodyBold.fontFamily,
    color: theme.colors.textSecondary,
    marginTop: theme.spacing.sm,
  },
  emptyBody: {
    fontSize: 13,
    fontFamily: theme.fonts.body.fontFamily,
    color: theme.colors.textTertiary,
    textAlign: 'center',
    paddingHorizontal: theme.spacing.xl,
  },

  // ── Coach 2 NLP Input ──────────────────────────────────────────────────────
  coach2Container: {
    marginHorizontal: theme.spacing.xxl,
    marginTop: theme.spacing.xxl,
    gap: theme.spacing.md,
  },
  coach2Header: {
    gap: 2,
  },
  coach2Label: {
    fontSize: 11,
    fontFamily: theme.fonts.body.fontFamily,
    color: theme.colors.accentPrimary,
    letterSpacing: 1.4,
    textTransform: 'uppercase',
  },
  coach2Subtitle: {
    fontSize: 13,
    fontFamily: theme.fonts.body.fontFamily,
    color: theme.colors.textSecondary,
  },
  coach2InputRow: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: theme.colors.bgSurface1,
    borderRadius: theme.radius.button,
    borderWidth: 1,
    borderColor: theme.colors.borderDefault,
    paddingLeft: theme.spacing.lg,
    paddingRight: theme.spacing.sm,
    paddingVertical: theme.spacing.sm,
    gap: theme.spacing.sm,
  },
  coach2TextInput: {
    flex: 1,
    fontSize: 15,
    fontFamily: theme.fonts.body.fontFamily,
    color: theme.colors.textPrimary,
    paddingVertical: theme.spacing.xs,
  },
  coach2SendBtn: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: theme.colors.accentPrimary,
    alignItems: 'center',
    justifyContent: 'center',
  },
  coach2SendBtnDisabled: {
    backgroundColor: theme.colors.bgSurface2,
  },

  // Parse error
  parseErrorBox: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: theme.spacing.sm,
    paddingVertical: theme.spacing.sm,
    paddingHorizontal: theme.spacing.md,
    backgroundColor: theme.colors.bgSurface1,
    borderRadius: theme.radius.button,
    borderWidth: 1,
    borderColor: theme.colors.ringCalories,
  },
  parseErrorText: {
    flex: 1,
    fontSize: 13,
    fontFamily: theme.fonts.body.fontFamily,
    color: theme.colors.ringCalories,
    lineHeight: 18,
  },

  // Parse result card
  coach2ResultCard: {
    backgroundColor: theme.colors.bgSurface1,
    borderRadius: theme.radius.card,
    borderWidth: 1,
    borderColor: theme.colors.borderDefault,
    overflow: 'hidden',
  },

  // Clarification state
  clarifyBox: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: theme.spacing.sm,
    padding: theme.spacing.lg,
  },
  clarifyText: {
    flex: 1,
    fontSize: 14,
    fontFamily: theme.fonts.body.fontFamily,
    color: theme.colors.textSecondary,
    lineHeight: 20,
  },

  // Confidence badge
  confidenceRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: theme.spacing.lg,
    paddingTop: theme.spacing.md,
    paddingBottom: theme.spacing.sm,
  },
  confidenceLabel: {
    fontSize: 11,
    fontFamily: theme.fonts.body.fontFamily,
    color: theme.colors.textTertiary,
    letterSpacing: 1.2,
    textTransform: 'uppercase',
  },
  confidenceBadge: {
    borderRadius: theme.radius.pill,
    paddingHorizontal: theme.spacing.sm,
    paddingVertical: 2,
  },
  confidenceBadgeText: {
    fontSize: 12,
    fontFamily: theme.fonts.mono.fontFamily,
    color: theme.colors.bgCanvas,
    fontWeight: '600',
  },

  // Parsed items list
  parsedItems: {
    borderTopWidth: 1,
    borderTopColor: theme.colors.borderDefault,
  },
  parsedItemRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: theme.spacing.lg,
    paddingVertical: theme.spacing.md,
    gap: theme.spacing.sm,
  },
  parsedItemRowBorder: {
    borderBottomWidth: 1,
    borderBottomColor: theme.colors.borderDefault,
  },
  parsedItemInfo: {
    flex: 1,
    gap: 2,
  },
  parsedItemName: {
    fontSize: 15,
    fontFamily: theme.fonts.bodyBold.fontFamily,
    color: theme.colors.textPrimary,
  },
  parsedItemMeta: {
    fontSize: 12,
    fontFamily: theme.fonts.body.fontFamily,
    color: theme.colors.textSecondary,
  },
  parsedItemKcal: {
    fontSize: 16,
    fontFamily: theme.fonts.mono.fontFamily,
    color: theme.colors.textPrimary,
  },
  parsedItemKcalUnit: {
    fontSize: 11,
    fontFamily: theme.fonts.body.fontFamily,
    color: theme.colors.textTertiary,
  },

  // Meal type selector
  mealTypeRow: {
    flexDirection: 'row',
    paddingHorizontal: theme.spacing.lg,
    paddingVertical: theme.spacing.md,
    gap: theme.spacing.sm,
    borderTopWidth: 1,
    borderTopColor: theme.colors.borderDefault,
  },
  mealTypeChip: {
    flex: 1,
    alignItems: 'center',
    paddingVertical: theme.spacing.sm,
    borderRadius: theme.radius.button,
    backgroundColor: theme.colors.bgSurface2,
  },
  mealTypeChipActive: {
    backgroundColor: theme.colors.accentPrimary,
  },
  mealTypeChipText: {
    fontSize: 12,
    fontFamily: theme.fonts.body.fontFamily,
    color: theme.colors.textSecondary,
  },
  mealTypeChipTextActive: {
    color: theme.colors.bgCanvas,
    fontFamily: theme.fonts.bodyBold.fontFamily,
  },

  // Action buttons
  coach2Actions: {
    flexDirection: 'row',
    gap: theme.spacing.sm,
    padding: theme.spacing.lg,
    borderTopWidth: 1,
    borderTopColor: theme.colors.borderDefault,
  },
  discardBtn: {
    flex: 1,
    alignItems: 'center',
    paddingVertical: theme.spacing.md,
    borderRadius: theme.radius.button,
    backgroundColor: theme.colors.bgSurface2,
  },
  discardBtnText: {
    fontSize: 15,
    fontFamily: theme.fonts.body.fontFamily,
    color: theme.colors.textSecondary,
  },
  confirmBtn: {
    flex: 2,
    alignItems: 'center',
    paddingVertical: theme.spacing.md,
    borderRadius: theme.radius.button,
    backgroundColor: theme.colors.accentPrimary,
  },
  confirmBtnDisabled: {
    opacity: 0.5,
  },
  confirmBtnText: {
    fontSize: 15,
    fontFamily: theme.fonts.bodyBold.fontFamily,
    color: theme.colors.bgCanvas,
  },
});
