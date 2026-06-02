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

## PHASE 6: POLISH & EAS BUILD
**Exit Condition:** Shippable APK verified on Android device.

* **6.1 Animation Audit:** Verify all buttons map to `scale: 0.97` on press. Verify modal slide-ups (300ms).
* **6.2 Empty States:** Ensure no blank screens. Render fallback UI for empty workout lists, 0-calorie days, and missing API keys.
* **6.3 EAS Execution:** Run `eas build --platform android --profile development/production`. Generate APK.
