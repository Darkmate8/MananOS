# SYSTEM DIRECTIVE: IMPLEMENTATION PLAN (DOC 06/06)
**Target Audience:** AI Code Generator / Execution Agent.
**Core Standard:** Strict sequential execution. Do not initiate Feature N+1 until Feature N is fully implemented and validated. Scope is completely frozen. 

---

## 0. CRITICAL GROUND RULES (DO NOT VIOLATE)
1. **NO EXPO GO:** Development must occur via custom native builds (`npx expo run:android`) from Phase 0 onwards due to `react-native-mmkv` and `expo-secure-store` native dependencies.
2. **No Scope Creep:** If a feature is not in this document, it belongs in v2. Do not hallucinate GPS, wearables, or multi-user auth.
3. **Zustand Persistence Trap:** Session stores must be cleared explicitly via a "Finish" action, NEVER on component unmount/blur, to prevent mid-workout data wiping.

---

## PHASE 0: FOUNDATION (SCAFFOLD & SHELL)
**Exit Condition:** App boots via `run:android`, Supabase connected, 4-tab shell renders.

* **0.1 Scaffold:** `npx create-expo-app` (TS template). Install dependencies (`zustand`, `@tanstack/react-query`, `react-native-mmkv`, `react-native-reanimated`, etc.). 
  * *CRITICAL:* Inject `react-native-reanimated/plugin` into `babel.config.js` immediately.
* **0.2 Theme:** Build `src/lib/theme.ts` exporting exact hex codes, spacing, and typography from Doc 03. Load `EB Garamond` and `JetBrains Mono` via `expo-font`. 
* **0.3 Supabase:** Initialize client (`src/lib/supabaseClient.ts`) using `EXPO_PUBLIC_` env vars. Execute `05-relational-schema.sql` in backend.
* **0.4 Auth:** Implement `supabase.auth.signInAnonymously()`. Map state to Zustand `useAuthStore`. Route unauthenticated to loading/auth, authenticated to `/(tabs)`.
* **0.5 Nav Shell:** Build `app/(tabs)/_layout.tsx` with 4 empty tab indexes (Today, Workouts, Nutrition, Habits). Build empty `app/(modals)/_layout.tsx` for global sheets.

---

## PHASE 1: CORE WORKOUT TRACKER
**Exit Condition:** Full workout logged, persisted offline, and synced to Supabase.

* **1.1 Exercise DB:** Seed `exercises` table. Create `useExerciseSearch` hook using client-side fuzzy search on cached data.
* **1.2 Workout List:** Build `workouts/index.tsx`. Fetch completed sessions via TanStack Query.
* **1.3 Active Logger:** Build `workouts/active.tsx`. 
  * *State:* Track in MMKV-backed Zustand store.
  * *Logic:* Auto-calculate volume per set. 
* **1.4 Rest Timer:** Build overlay component. Anchor to bottom. Track via Zustand. Auto-start on set check. Auto-dismiss at 0:00.
* **1.5 PR Detection:** On set log, query `personal_records` cache. If exceeded, trigger visual PR animation + `NotificationFeedbackType.Success`.
* **1.6 Summary Screen:** Build `workouts/summary.tsx`. On "Done", flush Zustand session store and execute Supabase write.

---

## PHASE 2: TODAY DASHBOARD & HABITS
**Exit Condition:** Dashboard renders live dynamic data. Habit grid updates.

* **2.1 Dashboard UI:** Build `today/index.tsx`. Render greeting, Metric Row, and SVG Activity Rings (Steps, Water, Kcal). Connect to `v_today_rings` query. 
* **2.2 Habit CRUD:** Build `habits/index.tsx` and `create-habit` modal. 
* **2.3 Contribution Grid:** Build 52-week grid UI. Map intensity colors (`grid-0` to `grid-4`) based on `habit_completions` count. Tap to log increments.

---

## PHASE 3: NUTRITION LOGGING
**Exit Condition:** Meals logged and macros aggregated dynamically.

* **3.1 Nutrition Home:** Build `nutrition/index.tsx`. Render macro progress bars (kcal, protein). 
* **3.2 NLP Input Stub:** Build text input UI. Connect to a mock JSON response (stubbing Coach 2) to test UI rendering of parsed `meal_items`.
* **3.3 History View:** Build `nutrition/history.tsx`. Render weekly aggregate bar charts using `react-native-gifted-charts`.

---

## PHASE 4: DUAL AI COACH PIPELINES
**Exit Condition:** Client-side Vercel AI SDK streams chat and parses meal JSON.
**Provider:** Gemini (primary). Package: `ai` + `@ai-sdk/google`. Key read from `expo-secure-store` key `api_key_gemini`. No OpenAI dependency.

* **4.1 API Keystore:** Build `settings` modal. Input fields for Gemini (primary) and OpenAI (optional fallback) keys. Persist strictly to `expo-secure-store`. ✅ DONE
* **4.2 Coach 1 (Chat):** Build `today/coach.tsx`.
  * *Provider:* `createGoogleGenerativeAI` from `@ai-sdk/google`, model `gemini-2.0-flash`.
  * *Data Prep:* Fetch context JSON from Postgres (Doc 05 §6).
  * *Execution:* Pass context as system prompt to Vercel AI SDK `streamText`. Stream response locally on-device.
* **4.3 Coach 2 (Parser):** Connect Feature 3.2 input to `generateObject`.
  * *Provider:* Same Gemini key, model `gemini-2.0-flash`.
  * *Constraint:* Force JSON schema validation using Zod. If confidence is `<70%` or `low`, block DB write and render clarifying question in UI.

---

## PHASE 5: LOCAL NOTIFICATIONS
**Exit Condition:** Water and Habit reminders fire locally via OS.

* **5.1 Permissions:** Request via `expo-notifications`. Save token (if required) to profile.
* **5.2 Scheduling Logic:** Build `useReconcileNotifications` hook. 
  * *Flow:* Cancel all scheduled -> Read Supabase preferences -> Reschedule. 
* **5.3 Water Triggers:** Schedule interval notifications (e.g., every 2h).

---

## PHASE 6: POLISH
**Exit Condition:** All visual and empty-state polish applied.

* **6.1 Animation Audit:** Verify all buttons map to `scale: 0.97` on press. Verify modal slide-ups (300ms). ✅ DONE
* **6.2 Empty States:** Ensure no blank screens. Render fallback UI for empty workout lists, 0-calorie days, and missing API keys. ✅ DONE

---

## PHASE 7: WORKOUT ENHANCEMENTS
**Exit Condition:** Drop/warmup labels, unilateral weight, custom rest timer (with buzz), and template system all working end-to-end.

**Schema migrations required before coding (run in Supabase SQL editor):**
```sql
alter table workout_sets add column if not exists is_drop_set bool not null default false;
alter table exercises add column if not exists is_unilateral bool not null default false;
alter table exercises add column if not exists default_rest_seconds int2 check (default_rest_seconds >= 0);
alter table exercises add column if not exists external_id text;
alter table exercises add column if not exists instructions text;
alter table exercises add column if not exists gif_url text;

create table if not exists workout_templates ( ... ); -- see schema doc §5
create table if not exists workout_template_exercises ( ... ); -- see schema doc §5B
```
Also run the new indexes and RLS policies from the schema doc.

* **7.1 Set Type Labels (Drop / Warmup):**
  * Add `is_warmup` and `is_drop_set` toggle buttons inside the set row in `workouts/active.tsx`. Render `W` / `D` pills (terracotta-tinted, `radius-pill`) when active. Both flags mutually independent.
  * `is_warmup = true`: exclude from volume calculation and PR check in `useSessionStore`.
  * `is_drop_set = true`: include in volume, flag in DB write.
  * Update `useSessionStore` set schema and `useFinishWorkout` mutation payload.

* **7.2 Unilateral Weight Flag:**
  * `exercises` table now has `is_unilateral`. Seed/import must set this flag for dumbbell and single-arm cable exercises.
  * In `workouts/active.tsx` exercise header, if `exercise.is_unilateral`, display `"per arm"` caption next to the weight field.
  * In volume display (session totals, summary, history card), multiply `weight_kg × reps × 2` for unilateral exercises. The DB `volume` column stores the raw product — the ×2 is a display-layer-only constant applied in hooks.

* **7.3 Custom Rest Timer:**
  * Extend `RestTimerOverlay` to show an editable duration: tap the timer countdown text opens a small numeric input for the current rest only. Confirm replaces the remaining seconds — does NOT persist to exercise defaults.
  * Resolution order for initial duration: `exercise.default_rest_seconds` → fallback `90`.
  * On timer expiry: `Haptics.NotificationFeedbackType.Success` + `expo-av` `Audio.Sound` play (a short 0.5s chime bundled as a local asset). Audio must trigger even if app is in background (use `staysActiveInBackground: true` in Audio session config).

* **7.4 Workout Template System:**
  * New route: `/(tabs)/workouts/templates.tsx` — browsable list of saved templates. Each card shows template name, exercise count, estimated duration. FAB to create new.
  * New modal: `/(modals)/create-template.tsx` — step-by-step builder. Add exercises from the existing exercise search, set `target_sets` / `target_reps` / `target_weight_kg` per exercise, optional `rest_seconds_override` per exercise.
  * "Start" CTA on a template card deep-copies the template into `useSessionStore` (same structure as blank session start). All edits mid-session are ephemeral.
  * Template edit: tap edit icon on a template card → opens `create-template` modal prefilled.
  * Template delete: long-press card → confirmation alert → `DELETE workout_templates WHERE id = ?` (cascades to `workout_template_exercises`).
  * Hook: `useWorkoutTemplates` — TanStack Query fetch of all non-archived templates. `useCreateTemplate`, `useUpdateTemplate`, `useDeleteTemplate` mutations following the standard offline triple-play pattern.

* **7.5 Exercise Library — AscendAPI Import:**
  * Write a one-time seeding script (`scripts/seed-exercises.ts`, run via `npx ts-node`).
  * Fetches from `https://exercisedb.dev/api/v2/exercises?limit=1000` (public, no auth needed).
  * Maps API fields: `id → external_id`, `name`, `bodyPart → muscle_group`, `equipment`, `gifUrl → gif_url`, `instructions`.
  * Derives `is_unilateral = true` for any exercise where `equipment` is `'dumbbell'` or name contains `'single'` / `'unilateral'`.
  * Derives `default_rest_seconds`: compound lifts (squat, deadlift, bench, row, press) → `180`, isolation → `90`, bodyweight → `60`. Heuristic based on muscle_group and name keywords.
  * Upserts into `exercises` table using `external_id` as conflict key.
  * This runs once at build time — not a runtime API call. App works fully offline after seed.

---

## PHASE 8: HABIT GRID — AGGREGATE MODE
**Exit Condition:** Habits screen shows aggregate all-habits intensity grid. Individual detail grids still accessible.

* **8.1 Aggregate Grid Component:**
  * Replace the existing single-habit grid in `habits/index.tsx` with an aggregate view.
  * Data source: `useAllHabitsCompletions` (already exists). Per calendar day, compute `ratio = habits_completed / total_active_habits`. Map ratio to grid intensity: `0 → grid-0`, `>0–0.25 → grid-1`, `>0.25–0.5 → grid-2`, `>0.5–0.75 → grid-3`, `>0.75 → grid-4`.
  * Tap a grid cell → shows a small tooltip/popover with the date and `X / Y habits done`.
  * Section header above the grid reads `"All Habits · 52 Weeks"`.
  * Individual habit's 52-week grid remains accessible via `habits/[habitId].tsx` drill-down (existing route, unchanged).

---

## PHASE 9: NUTRITION & SETTINGS ENHANCEMENTS
**Exit Condition:** Weekly deficit view, custom goals, and deletion all functional.

* **9.1 Weekly Nutrition Deficit View:**
  * In `nutrition/history.tsx`, add a new top section above the existing charts:
    * A 7-day kcal bar chart (bars = consumed, dashed line = goal). Color: `ringCalories`.
    * Below it: a summary chip row showing `Weekly Deficit: Xkcal` (sum of daily surplus/deficit) and `Protein Hit Rate: X/7 days`.
    * Data from `v_weekly_nutrition` via a new `useWeeklyNutrition` hook.

* **9.2 Custom Goals in Settings:**
  * Extend `/(modals)/settings.tsx` with a "Goals" section below the API keys section.
  * Fields: `Daily Kcal Target` (numeric), `Daily Protein Target (g)` (numeric), `Daily Steps Goal` (numeric), `Daily Water Goal (cups)` (numeric), `Water Cup Size (ml)` (numeric, stored in MMKV not Supabase).
  * Save button triggers `upsert` to `profile` via `useUpdateProfile` mutation (offline-safe).

* **9.3 Deletion — Workouts & Water:**
  * **Workout sessions:** Long-press on a completed session card in `workouts/index.tsx` → confirmation alert → `useDeleteWorkoutSession` mutation (DELETE cascade). Cache invalidation on `workout_sessions` and `personal_records` query keys.
  * **Water log:** Add a `−` button beside the `+` quick-add on the Today dashboard. Decrements cups by 1, minimum 0. Uses `useLogWater` mutation with a negative delta (or a separate `useDecrementWater` mutation). Never goes below 0.
  * **Nutrition items:** Already implemented (swipe / trash icon). No changes needed.

* **9.4 Coach 1 — Ephemeral Sessions:**
  * Remove the `persistMessages` call from `today/coach.tsx` entirely.
  * Remove the `supabase.from('chat_messages').insert(...)` call.
  * Confirm that `messages` is pure `useState<ChatMessage[]>([])` with no DB loading on mount.
  * The `chat_messages` table remains in the schema (do not drop — Supabase migrations are irreversible in dev without reset) but no code writes to it.

---

## PHASE 10: EAS BUILD
**Exit Condition:** Shippable APK verified on Android device.

* **10.1 Final type-check:** `npx tsc --noEmit` — zero errors.
* **10.2 EAS Execution:** `eas build --platform android --profile development`. Install on device and smoke-test all 5 phases.
* **10.3 Production build:** `eas build --platform android --profile production`. Generate signed APK for sideload.
