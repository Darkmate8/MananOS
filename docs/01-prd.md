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
- **Template System:** Core blueprints containing an ordered array of target exercises with predefined set, rep, and load weights seeded from the historical parameters of the last recorded log instance of that template.
- **Live Tracking Interface:** Starting a session deep-copies template constants into an editable active session state schema. Session modifications (appending, deleting, or swapping individual movements) apply exclusively to the current active session object.
- **Persistence Rules:** Active session must write state changes to local synchronous storage continuously. Mid-workout dropouts/app kills must reload state completely via a "Resume?" validation block on recovery boot.
- **Set Logging Constraints:** Swipe-right interaction logs a row matching previous set parameters. Capture variables: `weight_kg`, `reps`, `set_type` (Normal, Warmup, Drop). Warmups are programmatic exclusions from volume logic. Drop sets require independent schema flags.
- **Automation Blocks:**
  - Automated rest countdown timer triggering immediately upon set validation. Preconfigured default values pull from exercise metadata.
  - PR Detection Protocol: On set validation, check against database to catch PR triggers across: Heaviest Weight, Max e1RM, and Max Reps at specific weights. Fire visual layout animation when boolean catches true.

### 2.3 Cardio Tracking
- **Structure:** Manual single-line interface inputs tracking `activity_type` (Run / Cycle), `distance_km`, and `duration_min`.
- **Calculation Logic:** Execute pace calculation and calorie derivation via MET constants inside the application runtime layer. Render in unified feed as simplified summary vectors.
- **Constraint:** Strictly no GPS, route-mapping, or hardware geo-location hooks allowed in code execution.

### 2.4 Nutrition Logging
- **Parameters:** Daily targets constrain solely to absolute Calories (kcal) and Protein (grams).
- **Control Plane:** Zero direct manual entry panels or text inputs. All additions must pipe exclusively through Coach 2 parsed JSON payload blocks.
- **Post-Log Mutations:** Individual entries within the daily consumption array must remain completely editable and deletable via inline modal triggers.

### 2.5 Habits & Water Systems
- **Habit Typologies:** - Binary: Traditional toggle switch (Completed / Pending).
  - Count-Based: Integer counter tracking `current_count / target_count`.
- **Habit Metadata:** Custom String fields for `name`, `description`, `color_token`. Tracking requires immediate data serialization for 53-week layout visualization blocks.
- **Water Tracker:** Simple click interface executing tracking additions via uniform cup size intervals. State array maps cleanly to device midnight variables for complete data resetting.

### 2.6 Dual AI Coach Engines
Two client-side isolated prompt setups using localized secure key validation. 
- **Coach 1 (General Chat System):** Implements `streamText` processing engine. On component mounting layout, construct a compact text template enclosing localized historical user records (last 7 days of training, weight, volume vectors, and nutritional intake summaries) and inject directly into the base initialization system prompt. 
- **Coach 2 (Nutrition Parser):** Non-chat interface executing deterministic `generateObject` structuring logic. Takes arbitrary natural language text string block, runs evaluation matrix, and outputs mapped nutritional primitives.

---

## 3. COMPRESSED MATRIX: APPLIED EDGE CASES & ERROR STATES

- **Coach 2 Low Confidence Payload:** Do not commit data to database. Halt routine execution, isolate current string draft to client storage state, display explicit `clarifying_question` string text return block, and await subsequent response appending.
- **Null API Key State:** Block interface access to prompt engines completely. Replace normal prompt UI components with a fallback instructional placeholder layout directing user to Settings panel configuration.
- **Historical Edits / Deletions:** Trigger background queries invalidation cascade over TanStack Query hooks instantly. Force automatic downstream recalculated view values on next component lifecycle paint.
- **Active Session Midnight Crossover:** Preserve original operational timestamp anchoring variables. Maintain data linkage to initial workout initiation calendar day regardless of system datetime progression.