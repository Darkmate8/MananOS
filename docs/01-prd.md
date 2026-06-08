# SYSTEM DIRECTIVE: PRODUCT REQUIREMENTS (PRD 01/06)
**Target Audience:** AI Code Agent / Engineering Generator.
**Core Objective:** Act as the upstream functional source of truth. Build only the features described. Reject user entry flows or UI states not explicitly configured below.

---

## 1. CORE OVERVIEW & PLATFORM CONSTRAINTS
- **Scope:** Personal-use, private, single-user fitness/habit tracking application. 
- **Platform:** Android-only sideloaded APK deployment (v1). Metric units locked natively: kg, ml, km.
- **Access Flow:** Silent Supabase auth initialization. Zero onboarding registration screens. Zero manual login/signup forms. Cold boot must navigate instantly to Today Dashboard.
- **Onboarding Guard:** Block application interactive space on absolute first launch until initial manual bodyweight (kg) value is input.

---

## 2. MODULE SPECIFICATIONS

### 2.1 Today Dashboard (Home Screen)
Action-oriented interface. Must achieve render lifecycle under performance budget (<1.5s cold state).
- **Top Section Metrics (3 Rings via custom SVG):**
  - Steps Ring: Daily tracking vs target.
  - Water Ring: Daily ml consumption vs target.
  - Calories Ring: Accumulated kcal intake vs daily target.
- **Main Feed Ordered Composition:**
  1. Workout Card: Dynamically show "Start [Template Name]" CTA button if no workout exists, or a summary card of today's completed session (volume, duration, total PR count).
  2. Protein Progress Bar: Numerical and visual layout displaying `Xg / Yg target`.
  3. Habits Row: Horizontally scrolling list of modular daily habit tiles displaying check status.
  4. Quick Water Logger: Discrete clickable block executing `+ 250ml` addition hook.
  5. Metrics Prompt: Alert card appearing only if `current_date - last_weight_log_date > 7 days`.
- **Constraint:** Do not render any performance charts or progression graphics on this screen.

### 2.2 Resistance Workout Tracking
- **Template System:** Full Hevy-style CRUD. User creates named templates containing an ordered list of exercises, each with `target_sets`, `target_reps`, `target_weight_kg`, and an optional per-exercise `rest_seconds_override`. Starting a session deep-copies the template into an editable active session state schema. Session modifications (appending, deleting, or swapping individual movements) apply exclusively to the current active session object and never mutate the source template.
- **Live Tracking Interface:** Starting a session deep-copies template constants into an editable active session state schema. Session modifications apply exclusively to the current active session object.
- **Persistence Rules:** Active session must write state changes to local synchronous storage continuously. Mid-workout dropouts/app kills must reload state completely via a "Resume?" validation block on recovery boot.
- **Set Logging Constraints:** Swipe-right interaction logs a row matching previous set parameters. Capture variables: `weight_kg`, `reps`, `is_warmup`, `is_drop_set`.
  - `is_warmup = true`: row excluded from volume totals and PR calculations. Visual indicator: `W` pill.
  - `is_drop_set = true`: row counted in volume but flagged independently. Visual indicator: `D` pill.
  - Both flags can coexist on a row (though uncommon).
- **Unilateral Weight Rule:** Exercises with `is_unilateral = true` (dumbbells, cables, single-arm movements) display a "per arm" label next to the weight field. The logged `weight_kg` is the per-arm value. Application layer multiplies by 2 when computing total session volume display. The `volume` database column stores raw `weight_kg × reps` — the ×2 factor is applied client-side only.
- **Rest Timer:**
  - Auto-starts immediately on set completion.
  - Duration priority order: (1) per-exercise `default_rest_seconds` if set, (2) global default of 90s.
  - User can tap the timer overlay to manually set a custom duration for the current rest interval only. This does not mutate exercise defaults.
  - On timer expiry: fire `Haptics.NotificationFeedbackType.Success` + `expo-av` short audio buzz to alert the user even if the screen is backgrounded.
- **Delete Workout Session:** Long-press a completed workout card in the history list triggers a confirmation alert. On confirm, deletes the `workout_sessions` row (cascades to `workout_sets`). TanStack Query cache invalidated immediately.
- **Automation Blocks:**
  - PR Detection Protocol: On set validation, check against `personal_records` cache. Triggers across: Heaviest Weight, Max e1RM, Max Reps at specific weight. Fire visual PR animation + `NotificationFeedbackType.Success`.
- **Exercise Library:** Seeded from AscendAPI (exercisedb.dev). Each exercise stores `external_id`, `muscle_group`, `equipment`, `is_unilateral`, `default_rest_seconds`, `instructions`, `gif_url`. User can also create custom exercises. The exercise search modal filters across both seeded and custom entries.

### 2.3 Cardio Tracking
- **Structure:** Manual single-line interface inputs tracking `activity_type` (Run / Cycle), `distance_km`, and `duration_min`.
- **Calculation Logic:** Execute pace calculation and calorie derivation via MET constants inside the application runtime layer. Render in unified feed as simplified summary vectors.
- **Constraint:** Strictly no GPS, route-mapping, or hardware geo-location hooks allowed in code execution.

### 2.4 Nutrition Logging
- **Parameters:** Daily targets constrain to Calories (kcal) and Protein (grams). Both are user-configurable via the Settings modal and persisted to `profile.kcal_goal` / `profile.protein_goal_g`.
- **Control Plane:** All food additions must pipe exclusively through Coach 2 parsed JSON payload blocks. No direct manual food-name entry.
- **Post-Log Mutations:** Individual entries within the daily consumption array must remain deletable via inline swipe or trash icon. Deleting a `meal_item` row triggers immediate TanStack cache invalidation.
- **Weekly Deficit View:** A dedicated section in `nutrition/history.tsx` reads `v_weekly_nutrition` and displays:
  - A 7-day bar chart of kcal consumed vs `kcal_goal`.
  - A running weekly kcal deficit/surplus total (`Σ(kcal_goal - kcal_consumed)` over 7 days).
  - A 7-day protein achievement bar showing daily protein vs `protein_goal_g`.

### 2.5 Habits & Water Systems
- **Habit Typologies:**
  - Binary: Traditional toggle switch (Completed / Pending).
  - Count-Based: Integer counter tracking `current_count / target_count`.
- **Habit Metadata:** Custom String fields for `name`, `description`, `color_token`. Tracking requires immediate data serialization for 53-week layout visualization blocks.
- **Habit Grid — Aggregate Mode:** The contribution grid on `habits/index.tsx` renders an aggregate all-habits view. Each cell represents one calendar day. Cell color intensity is derived from `(habits_completed_that_day / total_active_habits)` normalized to the `grid-0` → `grid-4` ramp. Individual habit detail grids remain accessible via the existing `[habitId].tsx` drill-down route.
- **Water Tracker:** Click interface for additions. Default increment is `+250ml` (1 cup). User can set a custom cup-size increment in Settings, persisted to `profile`. Water log entries are deletable (tap-to-decrement or explicit clear-day action). State maps to device midnight for daily resets.

### 2.6 Dual AI Coach Engines
Two client-side isolated prompt setups using localized secure key validation.
- **Coach 1 (General Chat System):** Implements `streamText` processing engine. On component mounting layout, construct a compact text template enclosing localized historical user records (last 7 days of training, weight, volume vectors, and nutritional intake summaries) and inject directly into the base initialization system prompt.
  - **Ephemeral Session Rule:** Chat history is strictly in-memory (React `useState`). No messages are loaded from or written to the `chat_messages` table. Each screen mount starts a clean conversation. The `chat_messages` table is dropped from the schema in a future migration — do not write to it.
  - This is a hard cost-control constraint. Sending history to the model on every turn burns tokens. Each session starts cold.
- **Coach 2 (Nutrition Parser):** Non-chat interface executing deterministic `generateObject` structuring logic. Takes arbitrary natural language text string block, runs evaluation matrix, and outputs mapped nutritional primitives.

### 2.7 Settings & Custom Goals
The Settings modal (`/(modals)/settings.tsx`) is the single control surface for all user-configurable parameters. It must expose:
- **API Keys:** Gemini (primary), OpenAI (optional fallback). Persisted to `expo-secure-store`.
- **Daily Nutrition Goals:** `kcal_goal` (integer) and `protein_goal_g` (integer). Persisted to `profile`.
- **Activity Goals:** `steps_goal` (integer) and `water_goal_cups` (integer). Persisted to `profile`.
- **Water Cup Size:** Custom ml-per-cup value for the quick-add button. Stored locally (MMKV). Default 250ml.
- All goal fields render as numeric `TextInput` fields with a Save button. On save, `upsert` to `profile` via the standard offline mutation pattern.

---

## 3. COMPRESSED MATRIX: APPLIED EDGE CASES & ERROR STATES

- **Coach 2 Low Confidence Payload:** Do not commit data to database. Halt routine execution, isolate current string draft to client storage state, display explicit `clarifying_question` string text return block, and await subsequent response appending.
- **Null API Key State:** Block interface access to prompt engines completely. Replace normal prompt UI components with a fallback instructional placeholder layout directing user to Settings panel configuration.
- **Historical Edits / Deletions:** Trigger background queries invalidation cascade over TanStack Query hooks instantly. Force automatic downstream recalculated view values on next component lifecycle paint.
- **Active Session Midnight Crossover:** Preserve original operational timestamp anchoring variables. Maintain data linkage to initial workout initiation calendar day regardless of system datetime progression.