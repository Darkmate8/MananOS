-- ============================================================
-- SYSTEM DIRECTIVE: CANONICAL SQL SCHEMA (DOC 05B/06)
-- Target Audience: AI Database Architect / Supabase CLI.
-- Core Standard: Raw PostgreSQL executable script. Do NOT alter table names or constraints.
-- Crucial AI Constraint: Ignore any legacy comments regarding "Edge Functions" or "Realtime." 
-- This architecture relies strictly on client-side AI streaming and offline-first client-generated UUIDs.
-- ============================================================

-- 0. ENUMS
create type meal_type   as enum ('breakfast', 'lunch', 'dinner', 'snack');
create type chat_role   as enum ('user', 'assistant', 'system');
create type pr_type     as enum ('one_rep_max', 'volume_session', 'reps_at_weight');
create type weight_unit as enum ('kg', 'lb');
create type food_unit   as enum ('g', 'ml', 'serving', 'piece');

-- 1. PROFILE
create table profile (
  user_id              uuid primary key references auth.users(id) on delete cascade,
  display_name         text,
  height_cm            numeric(5,2) check (height_cm > 0 and height_cm < 300),
  birth_date           date,
  display_weight_unit  weight_unit not null default 'kg',
  kcal_goal            int2 not null default 2200  check (kcal_goal > 0),
  protein_goal_g       int2 not null default 150   check (protein_goal_g > 0),
  steps_goal           int4 not null default 8000  check (steps_goal > 0),
  water_goal_cups      int2 not null default 8     check (water_goal_cups > 0),
  featured_habit_id    uuid, 
  notif_prefs          jsonb not null default '{}'::jsonb,
  created_at           timestamptz not null default now(),
  updated_at           timestamptz not null default now()
);

-- 2. EXERCISES
create table exercises (
  id                   uuid primary key default gen_random_uuid(),
  user_id              uuid not null references auth.users(id) on delete cascade,
  name                 text not null,
  muscle_group         text,
  equipment            text,
  is_unilateral        bool not null default false,   -- true = dumbbell/cable single-arm; weight logged is per-arm
  default_rest_seconds int2 check (default_rest_seconds >= 0),  -- null = use global default (90s)
  external_id          text,                          -- AscendAPI / ExerciseDB source id
  instructions         text,                          -- optional cue text from API import
  gif_url              text,                          -- optional animation from API import
  is_archived          bool not null default false,
  created_at           timestamptz not null default now(),
  unique (user_id, name)
);

-- 3. WORKOUT SESSIONS
create table workout_sessions (
  id          uuid primary key default gen_random_uuid(),
  user_id     uuid not null references auth.users(id) on delete cascade,
  started_at  timestamptz not null default now(),
  ended_at    timestamptz,
  title       text,
  notes       text,
  created_at  timestamptz not null default now(),
  check (ended_at is null or ended_at >= started_at)
);

-- 4. WORKOUT SETS
create table workout_sets (
  id            uuid primary key default gen_random_uuid(),
  user_id       uuid not null references auth.users(id) on delete cascade,
  session_id    uuid not null references workout_sessions(id) on delete cascade,
  exercise_id   uuid not null references exercises(id)        on delete restrict,
  set_index     int2 not null check (set_index >= 1),
  weight_kg     numeric(6,2) check (weight_kg >= 0),  -- for unilateral exercises, this is the per-arm weight
  reps          int2          check (reps >= 0),
  rpe           numeric(3,1)  check (rpe >= 1 and rpe <= 10),
  is_warmup     bool not null default false,           -- warmups excluded from volume/PR calculations
  is_drop_set   bool not null default false,           -- drop sets flagged independently from warmups
  rest_seconds  int2 check (rest_seconds >= 0),        -- actual rest taken (may differ from exercise default)
  -- volume: for unilateral exercises multiply by 2 in application layer; generated column uses raw weight
  volume        numeric(8,2) generated always as (coalesce(weight_kg, 0) * coalesce(reps, 0)) stored,
  completed_at  timestamptz not null default now()
);

-- 5. WORKOUT TEMPLATES
create table workout_templates (
  id          uuid primary key default gen_random_uuid(),
  user_id     uuid not null references auth.users(id) on delete cascade,
  name        text not null,
  notes       text,
  is_archived bool not null default false,
  sort_order  int2 not null default 0,
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now(),
  unique (user_id, name)
);

-- 5B. WORKOUT TEMPLATE EXERCISES
-- ordered list of exercises inside a template, each with default set prescriptions
create table workout_template_exercises (
  id                   uuid primary key default gen_random_uuid(),
  template_id          uuid not null references workout_templates(id) on delete cascade,
  user_id              uuid not null references auth.users(id) on delete cascade,
  exercise_id          uuid not null references exercises(id) on delete restrict,
  exercise_order       int2 not null check (exercise_order >= 1),
  target_sets          int2 not null default 3 check (target_sets >= 1),
  target_reps          int2 check (target_reps >= 0),          -- null = AMRAP
  target_weight_kg     numeric(6,2) check (target_weight_kg >= 0),  -- null = bodyweight / auto
  rest_seconds_override int2 check (rest_seconds_override >= 0),    -- null = use exercise default
  unique (template_id, exercise_order)
);

create trigger trg_workout_template_updated
  before update on workout_templates
  for each row execute function set_updated_at();

-- 7. PERSONAL RECORDS
create table personal_records (
  id            uuid primary key default gen_random_uuid(),
  user_id       uuid not null references auth.users(id) on delete cascade,
  exercise_id   uuid not null references exercises(id)  on delete cascade,
  pr_type       pr_type not null,
  value         numeric(8,2) not null check (value > 0),
  reps          int2,
  weight_kg     numeric(6,2),
  session_id    uuid references workout_sessions(id) on delete set null,
  set_id        uuid references workout_sets(id)     on delete set null,
  achieved_at   timestamptz not null default now(),
  unique (user_id, exercise_id, pr_type)
);

-- 6. FOODS
create table foods (
  id                      uuid primary key default gen_random_uuid(),
  user_id                 uuid not null references auth.users(id) on delete cascade,
  name                    text not null,
  brand                   text,
  default_unit            food_unit not null default 'g',
  serving_size            numeric(7,2) not null default 100 check (serving_size > 0),
  kcal_per_serving        numeric(7,2) not null check (kcal_per_serving >= 0),
  protein_g_per_serving   numeric(6,2) not null default 0 check (protein_g_per_serving >= 0),
  carbs_g_per_serving     numeric(6,2) not null default 0 check (carbs_g_per_serving >= 0),
  fat_g_per_serving       numeric(6,2) not null default 0 check (fat_g_per_serving >= 0),
  is_archived             bool not null default false,
  created_at              timestamptz not null default now(),
  unique (user_id, name, brand)
);

-- 7. MEALS
create table meals (
  id          uuid primary key default gen_random_uuid(),
  user_id     uuid not null references auth.users(id) on delete cascade,
  eaten_at    timestamptz not null default now(),
  meal_type   meal_type not null,
  notes       text,
  created_at  timestamptz not null default now()
);

-- 8. MEAL ITEMS
create table meal_items (
  id          uuid primary key default gen_random_uuid(),
  user_id     uuid not null references auth.users(id) on delete cascade,
  meal_id     uuid not null references meals(id) on delete cascade,
  food_id     uuid not null references foods(id) on delete restrict,
  quantity    numeric(7,2) not null check (quantity > 0),
  unit        food_unit not null,
  kcal        numeric(7,2) not null check (kcal >= 0),
  protein_g   numeric(6,2) not null default 0 check (protein_g >= 0),
  carbs_g     numeric(6,2) not null default 0 check (carbs_g >= 0),
  fat_g       numeric(6,2) not null default 0 check (fat_g >= 0),
  created_at  timestamptz not null default now()
);

-- 9. HABITS
create table habits (
  id              uuid primary key default gen_random_uuid(),
  user_id         uuid not null references auth.users(id) on delete cascade,
  name            text not null,
  description     text,
  color           text not null default '#22c55e',
  target_per_day  int2 not null default 1 check (target_per_day >= 1),
  is_archived     bool not null default false,
  sort_order      int2 not null default 0,
  created_at      timestamptz not null default now(),
  unique (user_id, name)
);

alter table profile
  add constraint profile_featured_habit_fk
  foreign key (featured_habit_id) references habits(id) on delete set null;

-- 10. HABIT COMPLETIONS
create table habit_completions (
  id            uuid primary key default gen_random_uuid(),
  user_id       uuid not null references auth.users(id) on delete cascade,
  habit_id      uuid not null references habits(id) on delete cascade,
  completed_on  date not null,
  count         int2 not null default 1 check (count >= 1),
  created_at    timestamptz not null default now(),
  updated_at    timestamptz not null default now(),
  unique (habit_id, completed_on)
);

-- 11. WATER LOGS
create table water_logs (
  id          uuid primary key default gen_random_uuid(),
  user_id     uuid not null references auth.users(id) on delete cascade,
  logged_on   date not null,
  cups        int2 not null default 0 check (cups >= 0),
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now(),
  unique (user_id, logged_on)
);

-- 12. WEIGHT LOGS
create table weight_logs (
  id          uuid primary key default gen_random_uuid(),
  user_id     uuid not null references auth.users(id) on delete cascade,
  logged_on   date not null,
  weight_kg   numeric(5,2) not null check (weight_kg > 0 and weight_kg < 500),
  note        text,
  created_at  timestamptz not null default now(),
  unique (user_id, logged_on)
);

-- 13. STEPS LOGS
create table steps_logs (
  id          uuid primary key default gen_random_uuid(),
  user_id     uuid not null references auth.users(id) on delete cascade,
  logged_on   date not null,
  steps       int4 not null default 0 check (steps >= 0),
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now(),
  unique (user_id, logged_on)
);

-- 14. CHAT MESSAGES
create table chat_messages (
  id          uuid primary key default gen_random_uuid(),
  user_id     uuid not null references auth.users(id) on delete cascade,
  role        chat_role not null,
  content     text not null,
  metadata    jsonb not null default '{}'::jsonb,
  created_at  timestamptz not null default now()
);

-- 15. INDEXES
create index idx_sessions_user_started     on workout_sessions           (user_id, started_at desc);
create index idx_sets_session              on workout_sets               (session_id, set_index);
create index idx_sets_exercise_completed   on workout_sets               (exercise_id, completed_at desc);
create index idx_sets_user_completed       on workout_sets               (user_id, completed_at desc);
create index idx_pr_user_exercise          on personal_records           (user_id, exercise_id);
create index idx_templates_user_sort       on workout_templates          (user_id, sort_order) where is_archived = false;
create index idx_template_exercises_tmpl   on workout_template_exercises (template_id, exercise_order);
create index idx_meals_user_eaten          on meals               (user_id, eaten_at desc);
create index idx_meal_items_meal           on meal_items          (meal_id);
create index idx_habits_user_sort          on habits              (user_id, sort_order) where is_archived = false;
create index idx_habit_compl_habit_date    on habit_completions   (habit_id, completed_on desc);
create index idx_habit_compl_user_date     on habit_completions   (user_id, completed_on desc);
create index idx_water_user_date           on water_logs          (user_id, logged_on desc);
create index idx_weight_user_date          on weight_logs         (user_id, logged_on desc);
create index idx_steps_user_date           on steps_logs          (user_id, logged_on desc);
create index idx_chat_user_created         on chat_messages       (user_id, created_at desc);

-- 16. UPDATED_AT TRIGGERS
create or replace function set_updated_at() returns trigger as $$
begin
  new.updated_at = now();
  return new;
end;
$$ language plpgsql;

create trigger trg_profile_updated         before update on profile           for each row execute function set_updated_at();
create trigger trg_water_updated           before update on water_logs        for each row execute function set_updated_at();
create trigger trg_steps_updated           before update on steps_logs        for each row execute function set_updated_at();
create trigger trg_habit_compl_updated     before update on habit_completions for each row execute function set_updated_at();

-- 17. ROW LEVEL SECURITY (RLS)
alter table profile                      enable row level security;
alter table exercises                    enable row level security;
alter table workout_sessions             enable row level security;
alter table workout_sets                 enable row level security;
alter table personal_records             enable row level security;
alter table workout_templates            enable row level security;
alter table workout_template_exercises   enable row level security;
alter table foods                        enable row level security;
alter table meals                        enable row level security;
alter table meal_items                   enable row level security;
alter table habits                       enable row level security;
alter table habit_completions            enable row level security;
alter table water_logs                   enable row level security;
alter table weight_logs                  enable row level security;
alter table steps_logs                   enable row level security;
alter table chat_messages                enable row level security;

create policy own_rows on profile                    for all using (user_id = auth.uid()) with check (user_id = auth.uid());
create policy own_rows on exercises                  for all using (user_id = auth.uid()) with check (user_id = auth.uid());
create policy own_rows on workout_sessions           for all using (user_id = auth.uid()) with check (user_id = auth.uid());
create policy own_rows on workout_sets               for all using (user_id = auth.uid()) with check (user_id = auth.uid());
create policy own_rows on personal_records           for all using (user_id = auth.uid()) with check (user_id = auth.uid());
create policy own_rows on workout_templates          for all using (user_id = auth.uid()) with check (user_id = auth.uid());
create policy own_rows on workout_template_exercises for all using (user_id = auth.uid()) with check (user_id = auth.uid());
create policy own_rows on foods                      for all using (user_id = auth.uid()) with check (user_id = auth.uid());
create policy own_rows on meals                      for all using (user_id = auth.uid()) with check (user_id = auth.uid());
create policy own_rows on meal_items                 for all using (user_id = auth.uid()) with check (user_id = auth.uid());
create policy own_rows on habits                     for all using (user_id = auth.uid()) with check (user_id = auth.uid());
create policy own_rows on habit_completions          for all using (user_id = auth.uid()) with check (user_id = auth.uid());
create policy own_rows on water_logs                 for all using (user_id = auth.uid()) with check (user_id = auth.uid());
create policy own_rows on weight_logs                for all using (user_id = auth.uid()) with check (user_id = auth.uid());
create policy own_rows on steps_logs                 for all using (user_id = auth.uid()) with check (user_id = auth.uid());
create policy own_rows on chat_messages              for all using (user_id = auth.uid()) with check (user_id = auth.uid());

-- 18. TODAY RINGS VIEW
create or replace view v_today_rings with (security_invoker = true) as
select
  auth.uid() as user_id,
  (current_date) as on_date,
  coalesce((select sum(mi.kcal)
              from meal_items mi
              join meals m on m.id = mi.meal_id
             where mi.user_id = auth.uid()
               and m.eaten_at::date = current_date), 0) as kcal_today,
  coalesce((select sum(mi.protein_g)
              from meal_items mi
              join meals m on m.id = mi.meal_id
             where mi.user_id = auth.uid()
               and m.eaten_at::date = current_date), 0) as protein_g_today,
  coalesce((select steps from steps_logs
             where user_id = auth.uid()
               and logged_on = current_date), 0) as steps_today,
  coalesce((select cups from water_logs
             where user_id = auth.uid()
               and logged_on = current_date), 0) as water_cups_today;

-- 19. WEEKLY NUTRITION VIEW
-- Returns one row per day for the trailing 7 days (including today).
-- Consumed vs goal columns are for client-side deficit/surplus calculation.
create or replace view v_weekly_nutrition with (security_invoker = true) as
select
  auth.uid()                                    as user_id,
  day_series.on_date,
  coalesce(agg.kcal,      0)                    as kcal,
  coalesce(agg.protein_g, 0)                    as protein_g,
  coalesce(agg.carbs_g,   0)                    as carbs_g,
  coalesce(agg.fat_g,     0)                    as fat_g,
  p.kcal_goal,
  p.protein_goal_g
from
  generate_series(current_date - interval '6 days', current_date, '1 day') as day_series(on_date)
  cross join (select kcal_goal, protein_goal_g from profile where user_id = auth.uid()) p
  left join (
    select
      m.eaten_at::date                          as on_date,
      sum(mi.kcal)                              as kcal,
      sum(mi.protein_g)                         as protein_g,
      sum(mi.carbs_g)                           as carbs_g,
      sum(mi.fat_g)                             as fat_g
    from meal_items mi
    join meals m on m.id = mi.meal_id
    where mi.user_id = auth.uid()
      and m.eaten_at::date >= current_date - interval '6 days'
    group by m.eaten_at::date
  ) agg on agg.on_date = day_series.on_date
order by day_series.on_date;
