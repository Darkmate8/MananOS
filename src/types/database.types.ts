// Auto-derived from docs/05-relational-schema.sql — DO NOT hand-edit enums or table names.
// Flat Insert/Update shapes + Relationships:[] required by supabase-js GenericTable constraint.

export type MealType = 'breakfast' | 'lunch' | 'dinner' | 'snack';
export type ChatRole = 'user' | 'assistant' | 'system';
export type PrType = 'one_rep_max' | 'volume_session' | 'reps_at_weight';
export type WeightUnit = 'kg' | 'lb';
export type FoodUnit = 'g' | 'ml' | 'serving' | 'piece';

export interface Database {
  public: {
    Tables: {
      profile: {
        Row: {
          user_id: string;
          display_name: string | null;
          height_cm: number | null;
          birth_date: string | null;
          display_weight_unit: WeightUnit;
          kcal_goal: number;
          protein_goal_g: number;
          steps_goal: number;
          water_goal_cups: number;
          featured_habit_id: string | null;
          notif_prefs: Record<string, unknown>;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          user_id: string;
          display_name?: string | null;
          height_cm?: number | null;
          birth_date?: string | null;
          display_weight_unit?: WeightUnit;
          kcal_goal?: number;
          protein_goal_g?: number;
          steps_goal?: number;
          water_goal_cups?: number;
          featured_habit_id?: string | null;
          notif_prefs?: Record<string, unknown>;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          user_id?: string;
          display_name?: string | null;
          height_cm?: number | null;
          birth_date?: string | null;
          display_weight_unit?: WeightUnit;
          kcal_goal?: number;
          protein_goal_g?: number;
          steps_goal?: number;
          water_goal_cups?: number;
          featured_habit_id?: string | null;
          notif_prefs?: Record<string, unknown>;
          created_at?: string;
          updated_at?: string;
        };
        Relationships: [];
      };
      exercises: {
        Row: {
          id: string;
          user_id: string;
          name: string;
          muscle_group: string | null;
          equipment: string | null;
          is_archived: boolean;
          created_at: string;
        };
        Insert: {
          id?: string;
          user_id: string;
          name: string;
          muscle_group?: string | null;
          equipment?: string | null;
          is_archived?: boolean;
          created_at?: string;
        };
        Update: {
          id?: string;
          user_id?: string;
          name?: string;
          muscle_group?: string | null;
          equipment?: string | null;
          is_archived?: boolean;
          created_at?: string;
        };
        Relationships: [];
      };
      workout_sessions: {
        Row: {
          id: string;
          user_id: string;
          started_at: string;
          ended_at: string | null;
          title: string | null;
          notes: string | null;
          created_at: string;
        };
        Insert: {
          id?: string;
          user_id: string;
          started_at?: string;
          ended_at?: string | null;
          title?: string | null;
          notes?: string | null;
          created_at?: string;
        };
        Update: {
          id?: string;
          user_id?: string;
          started_at?: string;
          ended_at?: string | null;
          title?: string | null;
          notes?: string | null;
          created_at?: string;
        };
        Relationships: [];
      };
      workout_sets: {
        Row: {
          id: string;
          user_id: string;
          session_id: string;
          exercise_id: string;
          set_index: number;
          weight_kg: number | null;
          reps: number | null;
          rpe: number | null;
          is_warmup: boolean;
          rest_seconds: number | null;
          volume: number;
          completed_at: string;
        };
        Insert: {
          id?: string;
          user_id: string;
          session_id: string;
          exercise_id: string;
          set_index: number;
          weight_kg?: number | null;
          reps?: number | null;
          rpe?: number | null;
          is_warmup?: boolean;
          rest_seconds?: number | null;
          completed_at?: string;
        };
        Update: {
          id?: string;
          user_id?: string;
          session_id?: string;
          exercise_id?: string;
          set_index?: number;
          weight_kg?: number | null;
          reps?: number | null;
          rpe?: number | null;
          is_warmup?: boolean;
          rest_seconds?: number | null;
          completed_at?: string;
        };
        Relationships: [];
      };
      personal_records: {
        Row: {
          id: string;
          user_id: string;
          exercise_id: string;
          pr_type: PrType;
          value: number;
          reps: number | null;
          weight_kg: number | null;
          session_id: string | null;
          set_id: string | null;
          achieved_at: string;
        };
        Insert: {
          id?: string;
          user_id: string;
          exercise_id: string;
          pr_type: PrType;
          value: number;
          reps?: number | null;
          weight_kg?: number | null;
          session_id?: string | null;
          set_id?: string | null;
          achieved_at?: string;
        };
        Update: {
          id?: string;
          user_id?: string;
          exercise_id?: string;
          pr_type?: PrType;
          value?: number;
          reps?: number | null;
          weight_kg?: number | null;
          session_id?: string | null;
          set_id?: string | null;
          achieved_at?: string;
        };
        Relationships: [];
      };
      foods: {
        Row: {
          id: string;
          user_id: string;
          name: string;
          brand: string | null;
          default_unit: FoodUnit;
          serving_size: number;
          kcal_per_serving: number;
          protein_g_per_serving: number;
          carbs_g_per_serving: number;
          fat_g_per_serving: number;
          is_archived: boolean;
          created_at: string;
        };
        Insert: {
          id?: string;
          user_id: string;
          name: string;
          brand?: string | null;
          default_unit?: FoodUnit;
          serving_size?: number;
          kcal_per_serving: number;
          protein_g_per_serving?: number;
          carbs_g_per_serving?: number;
          fat_g_per_serving?: number;
          is_archived?: boolean;
          created_at?: string;
        };
        Update: {
          id?: string;
          user_id?: string;
          name?: string;
          brand?: string | null;
          default_unit?: FoodUnit;
          serving_size?: number;
          kcal_per_serving?: number;
          protein_g_per_serving?: number;
          carbs_g_per_serving?: number;
          fat_g_per_serving?: number;
          is_archived?: boolean;
          created_at?: string;
        };
        Relationships: [];
      };
      meals: {
        Row: {
          id: string;
          user_id: string;
          eaten_at: string;
          meal_type: MealType;
          notes: string | null;
          created_at: string;
        };
        Insert: {
          id?: string;
          user_id: string;
          eaten_at?: string;
          meal_type: MealType;
          notes?: string | null;
          created_at?: string;
        };
        Update: {
          id?: string;
          user_id?: string;
          eaten_at?: string;
          meal_type?: MealType;
          notes?: string | null;
          created_at?: string;
        };
        Relationships: [];
      };
      meal_items: {
        Row: {
          id: string;
          user_id: string;
          meal_id: string;
          food_id: string;
          quantity: number;
          unit: FoodUnit;
          kcal: number;
          protein_g: number;
          carbs_g: number;
          fat_g: number;
          created_at: string;
        };
        Insert: {
          id?: string;
          user_id: string;
          meal_id: string;
          food_id: string;
          quantity: number;
          unit: FoodUnit;
          kcal: number;
          protein_g?: number;
          carbs_g?: number;
          fat_g?: number;
          created_at?: string;
        };
        Update: {
          id?: string;
          user_id?: string;
          meal_id?: string;
          food_id?: string;
          quantity?: number;
          unit?: FoodUnit;
          kcal?: number;
          protein_g?: number;
          carbs_g?: number;
          fat_g?: number;
          created_at?: string;
        };
        Relationships: [];
      };
      habits: {
        Row: {
          id: string;
          user_id: string;
          name: string;
          description: string | null;
          color: string;
          target_per_day: number;
          is_archived: boolean;
          sort_order: number;
          created_at: string;
        };
        Insert: {
          id?: string;
          user_id: string;
          name: string;
          description?: string | null;
          color?: string;
          target_per_day?: number;
          is_archived?: boolean;
          sort_order?: number;
          created_at?: string;
        };
        Update: {
          id?: string;
          user_id?: string;
          name?: string;
          description?: string | null;
          color?: string;
          target_per_day?: number;
          is_archived?: boolean;
          sort_order?: number;
          created_at?: string;
        };
        Relationships: [];
      };
      habit_completions: {
        Row: {
          id: string;
          user_id: string;
          habit_id: string;
          completed_on: string;
          count: number;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          user_id: string;
          habit_id: string;
          completed_on: string;
          count?: number;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          user_id?: string;
          habit_id?: string;
          completed_on?: string;
          count?: number;
          created_at?: string;
          updated_at?: string;
        };
        Relationships: [];
      };
      water_logs: {
        Row: {
          id: string;
          user_id: string;
          logged_on: string;
          cups: number;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          user_id: string;
          logged_on: string;
          cups?: number;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          user_id?: string;
          logged_on?: string;
          cups?: number;
          created_at?: string;
          updated_at?: string;
        };
        Relationships: [];
      };
      weight_logs: {
        Row: {
          id: string;
          user_id: string;
          logged_on: string;
          weight_kg: number;
          note: string | null;
          created_at: string;
        };
        Insert: {
          id?: string;
          user_id: string;
          logged_on: string;
          weight_kg: number;
          note?: string | null;
          created_at?: string;
        };
        Update: {
          id?: string;
          user_id?: string;
          logged_on?: string;
          weight_kg?: number;
          note?: string | null;
          created_at?: string;
        };
        Relationships: [];
      };
      steps_logs: {
        Row: {
          id: string;
          user_id: string;
          logged_on: string;
          steps: number;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          user_id: string;
          logged_on: string;
          steps?: number;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          user_id?: string;
          logged_on?: string;
          steps?: number;
          created_at?: string;
          updated_at?: string;
        };
        Relationships: [];
      };
      chat_messages: {
        Row: {
          id: string;
          user_id: string;
          role: ChatRole;
          content: string;
          metadata: Record<string, unknown>;
          created_at: string;
        };
        Insert: {
          id?: string;
          user_id: string;
          role: ChatRole;
          content: string;
          metadata?: Record<string, unknown>;
          created_at?: string;
        };
        Update: {
          id?: string;
          user_id?: string;
          role?: ChatRole;
          content?: string;
          metadata?: Record<string, unknown>;
          created_at?: string;
        };
        Relationships: [];
      };
    };
    Views: {
      v_today_rings: {
        Row: {
          user_id: string;
          on_date: string;
          kcal_today: number;
          protein_g_today: number;
          steps_today: number;
          water_cups_today: number;
        };
        Relationships: [];
      };
    };
    Functions: Record<string, never>;
  };
}

// Convenience row-type aliases
export type ProfileRow = Database['public']['Tables']['profile']['Row'];
export type ExerciseRow = Database['public']['Tables']['exercises']['Row'];
export type WorkoutSessionRow = Database['public']['Tables']['workout_sessions']['Row'];
export type WorkoutSetRow = Database['public']['Tables']['workout_sets']['Row'];
export type PersonalRecordRow = Database['public']['Tables']['personal_records']['Row'];
export type FoodRow = Database['public']['Tables']['foods']['Row'];
export type MealRow = Database['public']['Tables']['meals']['Row'];
export type MealItemRow = Database['public']['Tables']['meal_items']['Row'];
export type HabitRow = Database['public']['Tables']['habits']['Row'];
export type HabitCompletionRow = Database['public']['Tables']['habit_completions']['Row'];
export type WaterLogRow = Database['public']['Tables']['water_logs']['Row'];
export type WeightLogRow = Database['public']['Tables']['weight_logs']['Row'];
export type StepsLogRow = Database['public']['Tables']['steps_logs']['Row'];
export type ChatMessageRow = Database['public']['Tables']['chat_messages']['Row'];
export type TodayRingsRow = Database['public']['Views']['v_today_rings']['Row'];
