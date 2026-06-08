// Mock data structures matching the Postgres schema exactly.
// Used during development before Supabase credentials are wired up.
// Every ID is a stable UUID so mutations remain idempotent.

import {
  ProfileRow,
  ExerciseRow,
  WorkoutSessionRow,
  WorkoutSetRow,
  HabitRow,
  HabitCompletionRow,
  FoodRow,
  MealRow,
  MealItemRow,
  WaterLogRow,
  StepsLogRow,
  TodayRingsRow,
} from '@/types/database.types';

const MOCK_USER_ID = '00000000-0000-0000-0000-000000000001';
const TODAY = new Date().toISOString().split('T')[0];

export const mockProfile: ProfileRow = {
  user_id: MOCK_USER_ID,
  display_name: 'Manan',
  height_cm: 178,
  birth_date: '1999-01-25',
  display_weight_unit: 'kg',
  kcal_goal: 2200,
  protein_goal_g: 150,
  steps_goal: 8000,
  water_goal_cups: 8,
  featured_habit_id: '00000000-0000-0000-0000-000000000101',
  notif_prefs: {},
  created_at: '2025-01-01T00:00:00Z',
  updated_at: '2025-01-01T00:00:00Z',
};

export const mockExercises: ExerciseRow[] = [
  {
    id: '00000000-0000-0000-0000-000000000201',
    user_id: MOCK_USER_ID,
    name: 'Barbell Bench Press',
    muscle_group: 'Chest',
    equipment: 'Barbell',
    is_archived: false,
    is_unilateral: false,
    default_rest_seconds: null,
    created_at: '2025-01-01T00:00:00Z',
  },
  {
    id: '00000000-0000-0000-0000-000000000202',
    user_id: MOCK_USER_ID,
    name: 'Pull-Up',
    muscle_group: 'Back',
    equipment: 'Bodyweight',
    is_archived: false,
    is_unilateral: false,
    default_rest_seconds: null,
    created_at: '2025-01-01T00:00:00Z',
  },
  {
    id: '00000000-0000-0000-0000-000000000203',
    user_id: MOCK_USER_ID,
    name: 'Barbell Back Squat',
    muscle_group: 'Legs',
    equipment: 'Barbell',
    is_archived: false,
    is_unilateral: false,
    default_rest_seconds: null,
    created_at: '2025-01-01T00:00:00Z',
  },
  {
    id: '00000000-0000-0000-0000-000000000204',
    user_id: MOCK_USER_ID,
    name: 'Romanian Deadlift',
    muscle_group: 'Hamstrings',
    equipment: 'Barbell',
    is_archived: false,
    is_unilateral: false,
    default_rest_seconds: null,
    created_at: '2025-01-01T00:00:00Z',
  },
  {
    id: '00000000-0000-0000-0000-000000000205',
    user_id: MOCK_USER_ID,
    name: 'Overhead Press',
    muscle_group: 'Shoulders',
    equipment: 'Barbell',
    is_archived: false,
    is_unilateral: false,
    default_rest_seconds: null,
    created_at: '2025-01-01T00:00:00Z',
  },
];

export const mockWorkoutSession: WorkoutSessionRow = {
  id: '00000000-0000-0000-0000-000000000301',
  user_id: MOCK_USER_ID,
  started_at: `${TODAY}T09:00:00Z`,
  ended_at: `${TODAY}T10:15:00Z`,
  title: 'Push A',
  notes: null,
  created_at: `${TODAY}T09:00:00Z`,
};

export const mockWorkoutSets: WorkoutSetRow[] = [
  {
    id: '00000000-0000-0000-0000-000000000401',
    user_id: MOCK_USER_ID,
    session_id: mockWorkoutSession.id,
    exercise_id: mockExercises[0].id,
    set_index: 1,
    weight_kg: 80,
    reps: 8,
    rpe: 7,
    is_warmup: false,
    is_drop_set: false,
    rest_seconds: 120,
    volume: 640,
    completed_at: `${TODAY}T09:05:00Z`,
  },
  {
    id: '00000000-0000-0000-0000-000000000402',
    user_id: MOCK_USER_ID,
    session_id: mockWorkoutSession.id,
    exercise_id: mockExercises[0].id,
    set_index: 2,
    weight_kg: 82.5,
    reps: 7,
    rpe: 8,
    is_warmup: false,
    is_drop_set: false,
    rest_seconds: 120,
    volume: 577.5,
    completed_at: `${TODAY}T09:08:00Z`,
  },
];

export const mockHabits: HabitRow[] = [
  {
    id: '00000000-0000-0000-0000-000000000101',
    user_id: MOCK_USER_ID,
    name: 'Morning Journal',
    description: 'Write 3 things you are grateful for',
    color: '#c2a87a',
    target_per_day: 1,
    is_archived: false,
    sort_order: 0,
    created_at: '2025-01-01T00:00:00Z',
  },
  {
    id: '00000000-0000-0000-0000-000000000102',
    user_id: MOCK_USER_ID,
    name: 'Read',
    description: '20 minutes of reading',
    color: '#6e8fa8',
    target_per_day: 1,
    is_archived: false,
    sort_order: 1,
    created_at: '2025-01-01T00:00:00Z',
  },
  {
    id: '00000000-0000-0000-0000-000000000103',
    user_id: MOCK_USER_ID,
    name: 'Cold Shower',
    description: null,
    color: '#5b9bab',
    target_per_day: 1,
    is_archived: false,
    sort_order: 2,
    created_at: '2025-01-01T00:00:00Z',
  },
];

export const mockHabitCompletions: HabitCompletionRow[] = [
  {
    id: '00000000-0000-0000-0000-000000000501',
    user_id: MOCK_USER_ID,
    habit_id: mockHabits[0].id,
    completed_on: TODAY,
    count: 1,
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
  },
];

export const mockFoods: FoodRow[] = [
  {
    id: '00000000-0000-0000-0000-000000000601',
    user_id: MOCK_USER_ID,
    name: 'Chicken Breast',
    brand: null,
    default_unit: 'g',
    serving_size: 100,
    kcal_per_serving: 165,
    protein_g_per_serving: 31,
    carbs_g_per_serving: 0,
    fat_g_per_serving: 3.6,
    is_archived: false,
    created_at: '2025-01-01T00:00:00Z',
  },
  {
    id: '00000000-0000-0000-0000-000000000602',
    user_id: MOCK_USER_ID,
    name: 'White Rice (cooked)',
    brand: null,
    default_unit: 'g',
    serving_size: 100,
    kcal_per_serving: 130,
    protein_g_per_serving: 2.7,
    carbs_g_per_serving: 28,
    fat_g_per_serving: 0.3,
    is_archived: false,
    created_at: '2025-01-01T00:00:00Z',
  },
  {
    id: '00000000-0000-0000-0000-000000000603',
    user_id: MOCK_USER_ID,
    name: 'Whole Eggs',
    brand: null,
    default_unit: 'piece',
    serving_size: 1,
    kcal_per_serving: 78,
    protein_g_per_serving: 6,
    carbs_g_per_serving: 0.6,
    fat_g_per_serving: 5,
    is_archived: false,
    created_at: '2025-01-01T00:00:00Z',
  },
];

export const mockMeal: MealRow = {
  id: '00000000-0000-0000-0000-000000000701',
  user_id: MOCK_USER_ID,
  eaten_at: `${TODAY}T08:00:00Z`,
  meal_type: 'breakfast',
  notes: null,
  created_at: `${TODAY}T08:00:00Z`,
};

export const mockMealItems: MealItemRow[] = [
  {
    id: '00000000-0000-0000-0000-000000000801',
    user_id: MOCK_USER_ID,
    meal_id: mockMeal.id,
    food_id: mockFoods[2].id,
    quantity: 3,
    unit: 'piece',
    kcal: 234,
    protein_g: 18,
    carbs_g: 1.8,
    fat_g: 15,
    created_at: `${TODAY}T08:00:00Z`,
  },
];

export const mockWaterLog: WaterLogRow = {
  id: '00000000-0000-0000-0000-000000000901',
  user_id: MOCK_USER_ID,
  logged_on: TODAY,
  cups: 3,
  created_at: new Date().toISOString(),
  updated_at: new Date().toISOString(),
};

export const mockStepsLog: StepsLogRow = {
  id: '00000000-0000-0000-0000-000000000a01',
  user_id: MOCK_USER_ID,
  logged_on: TODAY,
  steps: 4200,
  created_at: new Date().toISOString(),
  updated_at: new Date().toISOString(),
};

export const mockTodayRings: TodayRingsRow = {
  user_id: MOCK_USER_ID,
  on_date: TODAY,
  kcal_today: 234,
  protein_g_today: 18,
  steps_today: 4200,
  water_cups_today: 3,
};
