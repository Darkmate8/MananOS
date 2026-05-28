# SYSTEM DIRECTIVE: DATABASE SCHEMA & QUERY PATTERNS (DOC 05/06)
**Target Audience:** AI Database Architect / React Native Query Generator.
**Core Standard:** Supabase Postgres. All tables require `user_id` mapped to `auth.uid()`. UUIDs are generated client-side for offline sync idempotency. No Realtime edge functions are allowed in this architecture.

---

## 1. TABLE STRUCTURES

14 core tables. All row-bearing (every table carries `user_id`); no static lookup tables.

- **`profile`** (Singleton settings/goals per auth user)
  - Columns: `user_id uuid PK FK`, `display_name text`, `height_cm numeric(5,2)`, `birth_date date`, `display_weight_unit weight_unit`, `kcal_goal int2`, `protein_goal_g int2`, `steps_goal int4`, `water_goal_cups int2`, `featured_habit_id uuid FK`, `notif_prefs jsonb`, `created_at`, `updated_at`
- **`exercises`** (User-owned exercise library)
  - Columns: `id uuid PK`, `user_id uuid FK`, `name text`, `muscle_group text`, `equipment text`, `is_archived bool`, `created_at`
- **`workout_sessions`** (Workout headers)
  - Columns: `id uuid PK`, `user_id uuid FK`, `started_at timestamptz`, `ended_at timestamptz`, `title text`, `notes text`, `created_at`
- **`workout_sets`** (Individual sets - flat, no session_exercises join)
  - Columns: `id uuid PK`, `user_id uuid FK`, `session_id uuid FK`, `exercise_id uuid FK`, `set_index int2`, `weight_kg numeric(6,2)`, `reps int2`, `rpe numeric(3,1)`, `is_warmup bool`, `rest_seconds int2`, `volume numeric(8,2) GENERATED`, `completed_at timestamptz`
- **`personal_records`** (Current PR per exercise/type - materialized)
  - Columns: `id uuid PK`, `user_id uuid FK`, `exercise_id uuid FK`, `pr_type pr_type`, `value numeric(8,2)`, `reps int2`, `weight_kg numeric(6,2)`, `session_id uuid FK`, `set_id uuid FK`, `achieved_at timestamptz`
- **`foods`** (User-owned food library)
  - Columns: `id uuid PK`, `user_id uuid FK`, `name text`, `brand text`, `default_unit food_unit`, `serving_size numeric(7,2)`, `kcal_per_serving numeric(7,2)`, `protein_g_per_serving numeric(6,2)`, `carbs_g_per_serving numeric(6,2)`, `fat_g_per_serving numeric(6,2)`, `is_archived bool`, `created_at`
- **`meals`** (Meal headers)
  - Columns: `id uuid PK`, `user_id uuid FK`, `eaten_at timestamptz`, `meal_type meal_type`, `notes text`, `created_at`
- **`meal_items`** (Foods inside a meal, with macro snapshot)
  - Columns: `id uuid PK`, `user_id uuid FK`, `meal_id uuid FK`, `food_id uuid FK`, `quantity numeric(7,2)`, `unit food_unit`, `kcal numeric(7,2)`, `protein_g numeric(6,2)`, `carbs_g numeric(6,2)`, `fat_g numeric(6,2)`, `created_at`
- **`habits`** (Habit definitions)
  - Columns: `id uuid PK`, `user_id uuid FK`, `name text`, `description text`, `color text`, `target_per_day int2`, `is_archived bool`, `sort_order int2`, `created_at`
- **`habit_completions`** (One row per habit per day)
  - Columns: `id uuid PK`, `user_id uuid FK`, `habit_id uuid FK`, `completed_on date`, `count int2`, `created_at`, `updated_at`
- **`water_logs`** (One row per day, integer cups)
  - Columns: `id uuid PK`, `user_id uuid FK`, `logged_on date`, `cups int2`, `created_at`, `updated_at`
- **`weight_logs`** (Daily weight)
  - Columns: `id uuid PK`, `user_id uuid FK`, `logged_on date`, `weight_kg numeric(5,2)`, `note text`, `created_at`
- **`steps_logs`** (Manual daily steps)
  - Columns: `id uuid PK`, `user_id uuid FK`, `logged_on date`, `steps int4`, `created_at`, `updated_at`
- **`chat_messages`** (Single rolling Coach AI thread)
  - Columns: `id uuid PK`, `user_id uuid FK`, `role chat_role`, `content text`, `metadata jsonb`, `created_at`

### 1.1 Architecture Tradeoffs & Strict Rules
- **Snapshot Macros:** `meal_items` snapshots macros at log time. Editing a `foods` row does NOT retroactively rewrite history.
- **Materialized PRs:** `personal_records` tracks the current PR only. App logic must fetch current PRs, recompute from new session sets, and write back deltas on session save.
- **Flat Sets:** There is no `session_exercises` join table. `workout_sets` carries `exercise_id` directly; the UI groups by exercise.

---

## 2. FOREIGN KEY RELATIONSHIP MAP

- `profile.user_id` → `auth.users.id` (1:1, cascade)
- `profile.featured_habit_id` → `habits.id` (N:1, set null)
- `exercises.user_id` → `auth.users.id` (N:1, cascade)
- `workout_sessions.user_id` → `auth.users.id` (N:1, cascade)
- `workout_sets.session_id` → `workout_sessions.id` (N:1, cascade)
- `workout_sets.exercise_id` → `exercises.id` (N:1, restrict - block deletion if sets exist)
- `workout_sets.user_id` → `auth.users.id` (N:1, cascade)
- `personal_records.exercise_id` → `exercises.id` (N:1, cascade)
- `personal_records.session_id` → `workout_sessions.id` (N:1, set null)
- `personal_records.set_id` → `workout_sets.id` (N:1, set null)
- `foods.user_id` → `auth.users.id` (N:1, cascade)
- `meals.user_id` → `auth.users.id` (N:1, cascade)
- `meal_items.meal_id` → `meals.id` (N:1, cascade)
- `meal_items.food_id` → `foods.id` (N:1, restrict - block deletion if items exist)
- `habits.user_id` → `auth.users.id` (N:1, cascade)
- `habit_completions.habit_id` → `habits.id` (N:1, cascade)
- `water_logs.user_id` → `auth.users.id` (N:1, cascade)
- `weight_logs.user_id` → `auth.users.id` (N:1, cascade)
- `steps_logs.user_id` → `auth.users.id` (N:1, cascade)
- `chat_messages.user_id` → `auth.users.id` (N:1, cascade)

---

## 3. ROW LEVEL SECURITY (RLS) & UUIDs

- **RLS Enabled:** Must be explicitly enabled on all 14 tables.
- **Universal RLS Policy:** Every single table uses the exact same policy: `FOR ALL USING (user_id = auth.uid()) WITH CHECK (user_id = auth.uid());`. This check blocks clients from inserting rows with another user's `user_id`.
- **No Exemptions:** There are no global library or lookup tables.
- **Client-Side UUID Idempotency:** While Postgres will use `gen_random_uuid()` by default, React Native client hooks MUST generate their own UUIDv4s prior to insertion. This ensures offline MMKV sync queue upserts are idempotent.

---

## 4. STRICT INDEXES

Do not generate indexes beyond what serves the UI screens.
- `workout_sessions(user_id, started_at desc)` — Workout List scan
- `workout_sets(session_id, set_index)` — Active Session grouping
- `workout_sets(exercise_id, completed_at desc)` — Exercise Detail progression chart
- `workout_sets(user_id, completed_at desc)` — Coach Context assembly
- `personal_records(user_id, exercise_id)` — Workout Summary PR lookup
- `meals(user_id, eaten_at desc)` — Nutrition Home scan
- `meal_items(meal_id)` — Meal Detail expansion
- `habits(user_id, sort_order) where is_archived = false` — Habits active list
- `habit_completions(habit_id, completed_on desc)` — Habit Detail grid
- `habit_completions(user_id, completed_on desc)` — Today screen scan
- `chat_messages(user_id, created_at desc)` — Coach Chat scroll
- **Unique Constraints (Double as Indexes):** - `(user_id, logged_on)` on water/weight/steps
  - `(habit_id, completed_on)` on habit_completions

---

## 5. CORE QUERY PATTERNS (REACT QUERY TARGETS)

Downstream AI generating `useQuery` hooks must map precisely to these SQL patterns. Do not loop requests.

**1. Today Root** (3 parallel reads)
```sql
-- The Rings View (Ensure this is created via CREATE VIEW inheriting RLS)
select steps_today, water_cups_today, kcal_today from v_today_rings where user_id = auth.uid();
-- Active Habits
select h.id, h.name, h.color, h.target_per_day, coalesce(hc.count, 0) as count_today
  from habits h left join habit_completions hc on hc.habit_id = h.id and hc.completed_on = current_date
 where h.user_id = auth.uid() and h.is_archived = false order by h.sort_order;
-- Weight Sparkline
select logged_on, weight_kg from weight_logs where user_id = auth.uid() order by logged_on desc limit 7;

```

**2. Workout List**

```sql
select s.id, s.title, s.started_at, s.ended_at,
       count(ws.id) filter (where ws.is_warmup = false) as work_sets,
       sum(ws.volume) as total_volume
  from workout_sessions s left join workout_sets ws on ws.session_id = s.id
 where s.user_id = auth.uid() group by s.id order by s.started_at desc limit 20;

```

**3. Active Session**

```sql
select ws.*, e.name as exercise_name from workout_sets ws join exercises e on e.id = ws.exercise_id
 where ws.session_id = :session_id order by ws.exercise_id, ws.set_index;

```

**4. Exercise Detail (Progression Chart)**

```sql
select date_trunc('day', completed_at) as day, max(weight_kg) as top_weight, sum(volume) as day_volume
  from workout_sets where exercise_id = :exercise_id and is_warmup = false
 group by 1 order by 1 desc limit 90;

```

**5. Nutrition Home**

```sql
select m.id, m.meal_type, m.eaten_at, sum(mi.kcal) as kcal, sum(mi.protein_g) as protein_g, sum(mi.carbs_g) as carbs_g, sum(mi.fat_g) as fat_g
  from meals m left join meal_items mi on mi.meal_id = m.id
 where m.user_id = auth.uid() and m.eaten_at::date = current_date
 group by m.id order by m.eaten_at;

```

---

## 6. COACH AI CONTEXT ASSEMBLY

The Coach Chat send-message path requires assembling one compact context payload.
**Crucial AI Constraint:** Do NOT use Supabase Edge Functions or Realtime. The context is fetched via a client-side Postgres RPC/Query, passed to the Vercel AI SDK inside React Native, and the AI streams its answer natively on the device using locally stored API keys.

**Context Assembly Query:**

```sql
with last_4_workouts as (
  select s.id, s.started_at, s.ended_at, s.title,
         jsonb_agg(jsonb_build_object('exercise', e.name, 'set_index', ws.set_index, 'weight_kg', ws.weight_kg, 'reps', ws.reps, 'rpe', ws.rpe, 'is_warmup', ws.is_warmup) order by ws.exercise_id, ws.set_index) as sets
    from workout_sessions s left join workout_sets ws on ws.session_id = s.id left join exercises e on e.id = ws.exercise_id
   where s.user_id = auth.uid() and s.ended_at is not null group by s.id order by s.started_at desc limit 4
),
macros_7d as (
  select date_trunc('day', m.eaten_at)::date as day, sum(mi.kcal) as kcal, sum(mi.protein_g) as protein_g, sum(mi.carbs_g) as carbs_g, sum(mi.fat_g) as fat_g
    from meals m join meal_items mi on mi.meal_id = m.id
   where m.user_id = auth.uid() and m.eaten_at >= current_date - interval '7 days' group by 1 order by 1
),
habit_grid_30d as (
  select h.id as habit_id, h.name as habit_name, h.target_per_day,
         coalesce(jsonb_object_agg(hc.completed_on, hc.count) filter (where hc.completed_on is not null), '{}'::jsonb) as completions
    from habits h left join habit_completions hc on hc.habit_id = h.id and hc.completed_on >= current_date - interval '30 days'
   where h.user_id = auth.uid() and h.is_archived = false group by h.id
),
goals as (
  select kcal_goal, protein_goal_g, steps_goal, water_goal_cups from profile where user_id = auth.uid()
)
select jsonb_build_object(
  'goals', (select to_jsonb(g) from goals g),
  'last_4_workouts', (select jsonb_agg(to_jsonb(w)) from last_4_workouts w),
  'macros_7d', (select jsonb_agg(to_jsonb(m)) from macros_7d m),
  'habit_grid_30d', (select jsonb_agg(to_jsonb(h)) from habit_grid_30d h)
) as coach_context;

```

---

## 7. SUPABASE-SPECIFIC CONSTRAINTS

* **Enums Required:** `meal_type`, `chat_role`, `pr_type`, `weight_unit`, `food_unit`.
* **Generated Columns:** `workout_sets.volume = weight_kg * reps` (STORED).
* **JSONB Usage:** `profile.notif_prefs`, `chat_messages.metadata`.
* **Triggers:** Generate a standard `set_updated_at()` trigger for `profile`, `water_logs`, `steps_logs`, and `habit_completions`.
* **No Storage Required:** Do not generate any storage buckets.