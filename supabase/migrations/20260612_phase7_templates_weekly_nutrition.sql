-- Phase 7 prerequisites (templates + exercise import columns) and Phase 9 weekly nutrition view.
-- Matches docs/05-relational-schema.sql §2, §5, §5B, §19.

-- ── Exercises: import columns (7.5) ──────────────────────────────────────────
alter table exercises add column if not exists external_id  text;
alter table exercises add column if not exists instructions text;
alter table exercises add column if not exists gif_url      text;

-- Upsert conflict key for the AscendAPI/ExerciseDB import script
create unique index if not exists idx_exercises_user_external
  on exercises (user_id, external_id) where external_id is not null;

-- ── 5. Workout templates ─────────────────────────────────────────────────────
create table if not exists workout_templates (
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

-- ── 5B. Workout template exercises ───────────────────────────────────────────
create table if not exists workout_template_exercises (
  id                    uuid primary key default gen_random_uuid(),
  template_id           uuid not null references workout_templates(id) on delete cascade,
  user_id               uuid not null references auth.users(id) on delete cascade,
  exercise_id           uuid not null references exercises(id) on delete restrict,
  exercise_order        int2 not null check (exercise_order >= 1),
  target_sets           int2 not null default 3 check (target_sets >= 1),
  target_reps           int2 check (target_reps >= 0),
  target_weight_kg      numeric(6,2) check (target_weight_kg >= 0),
  rest_seconds_override int2 check (rest_seconds_override >= 0),
  unique (template_id, exercise_order)
);

drop trigger if exists trg_workout_template_updated on workout_templates;
create trigger trg_workout_template_updated
  before update on workout_templates
  for each row execute function set_updated_at();

-- ── Indexes ──────────────────────────────────────────────────────────────────
create index if not exists idx_templates_user_sort
  on workout_templates (user_id, sort_order) where is_archived = false;
create index if not exists idx_template_exercises_tmpl
  on workout_template_exercises (template_id, exercise_order);

-- ── RLS ──────────────────────────────────────────────────────────────────────
alter table workout_templates          enable row level security;
alter table workout_template_exercises enable row level security;

drop policy if exists own_rows on workout_templates;
create policy own_rows on workout_templates
  for all using (user_id = auth.uid()) with check (user_id = auth.uid());

drop policy if exists own_rows on workout_template_exercises;
create policy own_rows on workout_template_exercises
  for all using (user_id = auth.uid()) with check (user_id = auth.uid());

-- ── 19. Weekly nutrition view (9.1) ──────────────────────────────────────────
create or replace view v_weekly_nutrition with (security_invoker = true) as
select
  auth.uid()                 as user_id,
  day_series.on_date::date   as on_date,
  coalesce(agg.kcal,      0) as kcal,
  coalesce(agg.protein_g, 0) as protein_g,
  coalesce(agg.carbs_g,   0) as carbs_g,
  coalesce(agg.fat_g,     0) as fat_g,
  p.kcal_goal,
  p.protein_goal_g
from
  generate_series(current_date - interval '6 days', current_date, '1 day') as day_series(on_date)
  cross join (select kcal_goal, protein_goal_g from profile where user_id = auth.uid()) p
  left join (
    select
      m.eaten_at::date  as on_date,
      sum(mi.kcal)      as kcal,
      sum(mi.protein_g) as protein_g,
      sum(mi.carbs_g)   as carbs_g,
      sum(mi.fat_g)     as fat_g
    from meal_items mi
    join meals m on m.id = mi.meal_id
    where mi.user_id = auth.uid()
      and m.eaten_at::date >= current_date - interval '6 days'
    group by m.eaten_at::date
  ) agg on agg.on_date = day_series.on_date::date
order by day_series.on_date;
