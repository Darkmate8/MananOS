# SYSTEM DIRECTIVE: TECHNICAL REQUIREMENTS (TRD 02/06)
**Target Audience:** AI Code Generator / Engineering Agent.
**Context:** Single-user, offline-first, sideloaded Android fitness app. Replaces Hevy.
**Rule:** Treat this document as immutable law. Do not invent libraries, architecture, workflows, or product decisions outside this spec.

---

## 1. CORE STACK & RUNTIME CONSTRAINTS

- **Framework:** React Native + Expo SDK 53+ (Managed Workflow).
- **Language:** TypeScript (`strict: true`). Use `@/` path aliases for all relative imports.
- **Build Target:** Android only via EAS Build (`eas build --profile development --platform android`).
- **CRITICAL - NO EXPO GO:** `react-native-mmkv` uses JSI and will not work in standard Expo Go. All code must assume a custom Development Build (`npx expo run:android`).
- **State Management:** Server state = `@tanstack/react-query`; client/ephemeral state = `zustand` (flat stores, no providers, no reducers).
- **Navigation:** Expo Router (file-based routing).
- **Backend:** Supabase (Postgres, Auth, RLS). Use generated `database.types.ts` for all Supabase types.
- **Storage:** `react-native-mmkv` for local sync storage; `expo-secure-store` for API keys.
- **UI/Charts:** `react-native-gifted-charts` and `react-native-svg`.
- **Environment:** Use `EXPO_PUBLIC_` for all non-secret env vars. Never use `process.env`.

---

## 2. VERCEL AI SDK & POLYFILLS

This app uses `ai`, `@ai-sdk/openai`, and `@ai-sdk/google` for LLM features. React Native lacks standard web APIs required for streaming.

**MANDATORY ROOT SETUP:** inject this at the very top of `app/_layout.tsx` or `index.ts`, before any other imports:

```typescript
import 'react-native-url-polyfill/auto';
import { TextEncoder, TextDecoder } from 'text-encoding';

global.TextEncoder = TextEncoder;
global.TextDecoder = TextDecoder;
```

**API Key Handling:**
Keys (`coach1_openai_key`, etc.) live only in `expo-secure-store`. Never send them to Supabase. Inject them client-side into the Vercel AI SDK config.

---

## 3. OFFLINE-FIRST DATA ARCHITECTURE

**Rule:** Components never call Supabase directly. All reads go through `useQuery`. All writes go through `useMutation`.

### 3.1 Read Cache Persister

TanStack Query must use `createSyncStoragePersister` with MMKV.

- MMKV stores strings.
- Persister must `JSON.stringify` on write and `JSON.parse` on read.

### 3.2 Offline Mutation Protocol (Sync Queue)

For mutation hooks like `useLogSet`, always follow this flow:

1. Optimistically update the TanStack Query cache.
2. Check network with `@react-native-community/netinfo`.
3. If online: write to Supabase, then invalidate affected queries.
4. If offline: push the operation into the MMKV sync queue.

**Sync Queue Schema:**

```typescript
interface SyncOperation {
  id: string; // UUIDv4 generated on client
  table: string; // e.g. 'sets', 'sessions'
  op: 'insert' | 'update' | 'delete';
  payload: any;
  timestamp: string; // ISO string
}

// MMKV key: 'sync_queue' -> Array<SyncOperation>
```

**Flush Logic:**
- On reconnect, drain FIFO.
- Upserts must use client-generated UUIDs so retries are idempotent.
- Duplicate sends must be harmless.

### 3.3 Active Session Draft

When a workout starts, create `active_session_draft` in MMKV immediately.

- Every logged set updates this draft synchronously.
- If the app is force-closed or loses signal mid-workout, restore the draft on next launch.
- The draft is the source of truth until the workout is finished.
- Do not clear the draft until the full session is written to Supabase, or moved into `sync_queue` when finishing offline.

### 3.4 Finish Workout Flow

- "Finish Workout" attempts one atomic Supabase write for the session and its sets.
- If online and successful: clear `active_session_draft`, invalidate affected queries, return to normal flow.
- If offline: push the entire session payload as one operation to `sync_queue`, keep the draft, and retry on reconnect.
- The offline finish path must be lossless.

---

## 4. AI COACH IMPLEMENTATIONS

### 4.1 Coach 1: Chat

**Method:** `streamText` from Vercel AI SDK.

**Context Injection:**
On mount, query the last 7 days of user data from Supabase and format it into a compact string prepended to the system prompt.

**Constraints:**
- Limit chat history to about 80k tokens.
- Drop oldest messages if exceeded.
- Prefer summaries over raw rows.

### 4.2 Coach 2: Meal Parser

**Method:** `generateObject` from Vercel AI SDK. Use fast models (`gpt-4o-mini` or `gemini-1.5-flash`).

**Schema:**

```typescript
import { z } from 'zod';

const MealParserSchema = z.object({
  meal_name: z.string().describe('e.g. lunch, post-workout snack'),
  items: z.array(z.object({
    food: z.string(),
    qty: z.number(),
    unit: z.string().describe('e.g. g, piece, ml, cup'),
    kcal: z.number(),
    protein_g: z.number()
  })),
  total_kcal: z.number(),
  total_protein_g: z.number(),
  confidence: z.enum(['high', 'medium', 'low']).describe('Low if ambiguous quantity/food'),
  clarifying_question: z.string().nullable().describe('Ask this if confidence is low')
});
```

**Execution Branching:**
- `high`: auto-write to `nutrition_entries`.
- `medium`: write to DB, but flag UI with a `Needs Review` pill.
- `low`: do not write. Render `clarifying_question`, append the user reply to context, and re-run parser.

---

## 5. DERIVED DATA & MATH LOGIC

Do not generate Postgres triggers or denormalized PR/volume columns. Compute on the fly to prevent drift.

**Hardcoded formulas:**
- **e1RM (Epley):** `weight * (1 + (reps / 30))`
- **Cardio kcal:** `MET_VALUE * bodyweight_kg * (duration_minutes / 60)`
- **MRV:** flag the UI if the user exceeds `20` hard sets per primary muscle group in a rolling 7-day window.

**Postgres aggregations:**
- Heaviest PR: `SELECT MAX(weight) FROM sets WHERE exercise_id = X AND set_type != 'warmup'`
- Volume: `SUM(weight * reps)` grouped by week

---

## 6. AUTHENTICATION & SECURITY

- **Auth Flow:** Call `supabase.auth.signInAnonymously()` on first launch.
- The anonymous session is auto-persisted for the lifetime of the install.
- **Important consequence:** uninstalling the app or clearing local app data creates a new `auth.uid()`.
- Old data still exists in Supabase, but the new install cannot access it unless a future upgrade path is added.
- **Do not** build email/password UI for v1.
- **RLS:** All user tables must enforce `user_id = auth.uid()` for `SELECT`, `INSERT`, `UPDATE`, and `DELETE`.
- **Seed Data:** The exercise library is immutable and public. Use an `IS NOT NULL` read policy for that table.

---

## 7. NOTIFICATIONS

- **Library:** `expo-notifications` only. Local scheduling only. No push server, no FCM.
- **Source of Truth:** Notification settings live in Supabase (`water_settings`, `habit_settings`).
- **Reconciliation Flow:** On every app launch after auth:
  1. Read notification settings from Supabase.
  2. Call `cancelAllScheduledNotificationsAsync()`.
  3. Reschedule all active reminders with `scheduleNotificationAsync()`.
- This prevents stale schedules, duplicate pings, and old settings surviving edits or reinstalls.
- **Water Logic:** Use time-interval triggers. If a notification fires outside the user’s wake window, suppress the alert in-app.
- **Permissions:** If permission is denied, scheduling becomes a no-op and the rest of the app must still work normally.

---

## 8. AI GENERATION GUARDRAILS

1. Do not use `AsyncStorage`; use only `react-native-mmkv`.
2. Do not write raw `fetch` calls to Supabase; use the Supabase JS client wrapped in TanStack Query.
3. Do not implement complex Redux setups; use Zustand.
4. Do not hallucinate iOS-specific config in the main flow; v1 is Android-only.
5. Do not create backend cron jobs for day boundaries; all “Today” math is client-side using `date-fns` and local device midnight.

---

## 9. HARD CONSTANTS & SEED DATA

### 9.1 Strength Standards Table
Ratio = e1RM / bodyweight.

Lifts: bench, squat, deadlift, ohp, row, pullup.

Use this exact mapping for client-side strength band lookup:

- bench: `beginner 0-0.75`, `novice 0.75-1.0`, `intermediate 1.0-1.5`, `advanced 1.5-1.9`, `elite 1.9-99`
- squat: `beginner 0-1.0`, `novice 1.0-1.25`, `intermediate 1.25-1.75`, `advanced 1.75-2.25`, `elite 2.25-99`
- deadlift: `beginner 0-1.25`, `novice 1.25-1.5`, `intermediate 1.5-2.0`, `advanced 2.0-2.5`, `elite 2.5-99`
- ohp: `beginner 0-0.5`, `novice 0.5-0.65`, `intermediate 0.65-0.85`, `advanced 0.85-1.1`, `elite 1.1-99`
- row/pullup: use bench metrics as fallback mapping
- Hide the strength module for any other exercise

### 9.2 Cardio MET Pace Bands

**Running:**
- Pace >= 10.0 min/km (<= 6 km/h) -> MET 6.0
- Pace 7.5 to 9.9 min/km (6-8 km/h) -> MET 8.3
- Pace 6.0 to 7.4 min/km (8-10 km/h) -> MET 9.8
- Pace 5.0 to 5.9 min/km (10-12 km/h) -> MET 11.5
- Pace < 5.0 min/km (> 12 km/h) -> MET 14.0

**Cycling:**
- Speed < 16 km/h -> MET 4.0
- Speed 16-19 km/h -> MET 6.8
- Speed 19-22 km/h -> MET 8.0
- Speed 22-26 km/h -> MET 10.0
- Speed > 26 km/h -> MET 12.0

---

## 10. WHAT THIS TRD DOES NOT COVER

Keep this document focused on how the system is built, not downstream implementation details.

- Database schema, table definitions, foreign keys, indexes, and SQL migrations.
- UI component library, layout primitives, typography, colors, spacing, and animations.
- Screen-by-screen navigation tree and routing hierarchy.
- Step-by-step implementation plan, task ordering, and milestones.
- Copywriting, onboarding text, coach personality, and final UI wording.
- Future v2 platform support details beyond noting that v1 is Android-only.

---

## 11. VERIFICATION CHECKLIST

Use these checks to confirm the TRD was implemented correctly:

1. **Offline workout test:** Start a session, enable airplane mode, log several sets, force-close the app, reopen it, confirm the draft restores, then finish the workout and verify the session syncs after reconnect.
2. **Reinstall test:** Log real data, uninstall the app, reinstall it, and confirm a fresh anonymous `auth.uid()` is created and prior data is no longer reachable from the new install.
3. **Notification reschedule test:** Change reminder settings, force-close the app, reopen it, and confirm old notifications are cancelled and only the new schedule remains.
4. **Coach 2 confidence test:** Low-confidence food input must ask for clarification and must not write to the database until clarified.
5. **PR recalculation test:** Delete or edit a prior PR and confirm the current PR recomputes from source data without manual fixes.
6. **Performance test:** Cold launch must render the Today screen quickly from cached data, even when offline.
