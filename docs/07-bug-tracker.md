# MananOS Bug Tracker & Feature Backlog

**Status as of 2026-06-25.** Work through these in order — Criticals first, then UX Overhaul, then Features.

---

## CRITICAL CRASHES

### [C-1] Habits tab render crash — `calcTotal` not imported
**File:** `src/app/(tabs)/habits/index.tsx:11`  
**Error:** `Property 'calcTotal' doesn't exist` → full screen red error, tab unusable.  
**Root cause:** Line 11 imports `{ calcStreak, todayDateStr }` from `@/lib/habitUtils` but `calcTotal` (which IS exported from `habitUtils.ts:104`) is never imported. Used at line 158 inside `FeaturedCard`.  
**Fix:** Add `calcTotal` to the import on line 11.
```ts
import { calcStreak, calcTotal, todayDateStr } from '@/lib/habitUtils';
```

---

## UX OVERHAUL — Active Workout Screen (`active.tsx`)

### [U-1] Set type selector — replace W/D pills with a dropdown
**File:** `src/app/(tabs)/workouts/active.tsx:119–144`  
**Problem:** Two 22×22px circle toggles (W and D) sit in the cramped set row. They are nearly untappable on mobile. There's no visual affordance for what they mean. User expects a Hevy/Strong-style dropdown.  
**Fix:**
- Remove the two `AnimatedPressable` W/D pills from `SetRow`.
- Replace with a single tappable badge that cycles through: `normal → warmup → dropset → normal` OR opens an `ActionSheetIOS` / custom bottom-sheet with options: `Normal Set`, `Warm-up Set`, `Drop Set`.
- The set index badge already reads `W` / `D` / `setIndex` — make tapping that badge open the picker. Saves 2 elements from an already-packed row.
- On Android, use a `Modal`-based option list styled with `theme` tokens (no third-party ActionSheet needed).

### [U-2] Set row layout — too cramped, weight unreadable
**File:** `src/app/(tabs)/workouts/active.tsx:513–591` (styles)  
**Problem:** One row contains: set badge (32px) + W pill (22px) + D pill (22px) + weight field (flex:1) + reps field (flex:1) + volume (flex:1) + check (28px) + remove (text). On a 390px wide screen that's ~7 elements fighting for space. Weight input clips to ~2 chars wide.  
**Fix:**
- After fixing [U-1] (removing W/D pills), the row is: badge + weight + reps + vol + check + remove. Still tight.
- Increase `setField` `flex` to 1.4 for weight, keep reps at 1.
- Raise `typePill` to 26×26 minimum (irrelevant once [U-1] lands).
- Consider dropping the inline VOL column and showing total volume at the exercise footer only (it already renders there).

### [U-3] Rest timer — can't adjust duration properly
**File:** `src/components/RestTimerOverlay.tsx:45–57`  
**Problem:** To change rest duration you tap the countdown display which switches to a raw `TextInput` for seconds. There's no preset buttons (+30, –30, 1:00, 1:30, 2:00). The overlay also has no way to set a *default* rest time for a specific exercise without editing the template.  
**Fix:**
- Add three quick-tap chips inside the overlay: `−30`, `+30`, `+60`. Each calls `setRestTimer(remaining + delta)`.
- Optionally add a "Set default for this exercise" action that writes `rest_seconds_override` to the active exercise in session store.
- Keep the tap-to-edit TextInput as a fallback for custom values.

### [U-4] Rest timer not adjustable during active template session
**File:** `src/store/sessionStore.ts` (check `ActiveExercise.defaultRestSeconds`)  
**Problem:** When a session is started from a template, `defaultRestSeconds` is populated from the template prescription. But there's no way to override it mid-session for a specific exercise without editing the whole template.  
**Fix:** Add a `setExerciseRestSeconds(exerciseId, seconds)` action to `sessionStore`. Wire a long-press or "Edit rest" button on `ExerciseCard` header to a quick number-picker modal.

---

## TEMPLATES BUGS

### [T-1] Second template creation appears to fail / only one shows
**Files:** `src/hooks/useTemplateMutations.ts:73`, `src/hooks/useWorkoutTemplates.ts:38–43`  
**Root cause (likely):** `buildOptimisticTemplate` hardcodes `sort_order: 0` for every template. The DB query orders by `sort_order` then `created_at DESC`. The optimistic update prepends with `sort_order: 0`, which collides. After `onSettled` invalidates and refetches, the server may return both templates but the query cache may not render them if the `queryKey` is stale or if there's an RLS policy only returning `user_id = auth.uid()` and the anonymous user ID is drifting between sessions.  
**Debugging steps:**
1. Check Supabase dashboard → `workout_templates` table → confirm both rows exist with the correct `user_id`.
2. If rows exist, the bug is in the React Query cache or render path — add a `console.log(templates)` after `useWorkoutTemplates()` to verify the array length.
3. If rows are missing, it's an RLS or `user_id` mismatch — the anonymous `userId` in `authStore` may differ from what Supabase auth session returns at upsert time.  
**Fix (sort_order):** Generate incremental `sort_order` values: `sort_order: (old?.length ?? 0)` in the optimistic builder.

### [T-2] No custom rest time per template exercise
**File:** `src/app/(modals)/create-template.tsx:64` — `restStr` field exists but may not persist correctly.  
**Problem:** User wants Hevy-style per-exercise rest timer override on the template itself.  
**Verify:** Check that `restSecondsOverride` flows from the `ExerciseDraftRow` → `useCreateTemplate` payload → `buildExerciseRows` → `rest_seconds_override` column. If the UI field is there but the value drops somewhere in the chain, trace it through `useTemplateMutations.ts:56–66`.

### [T-3] No per-template estimated duration display
**File:** `src/app/(tabs)/workouts/templates.tsx:50`  
**Problem:** `estimatedMinutes` is calculated but the formula uses `SECONDS_PER_SET_WORK = 45` flat for all sets. No user-configurable total workout duration target (Hevy lets you set a "target duration" on the template).  
**Fix:** Add a `target_duration_minutes` nullable column to `workout_templates`. Show it on the card and let the user edit it in `create-template.tsx`. Fall back to the auto-estimate if null.

---

## GENERAL UI/ALIGNMENT ISSUES

### [G-1] Active session screen — content bleeds under rest timer overlay
**File:** `src/app/(tabs)/workouts/active.tsx:374–401`  
**Problem:** `RestTimerOverlay` is `position: absolute, bottom: 0` with height ~80px. The `ScrollView` `paddingBottom` is `theme.spacing.massive` but if that value is smaller than the overlay + safe area, the last exercise card gets covered.  
**Fix:** Measure the overlay height (or use a fixed constant ~100px) and ensure `ScrollView` `contentContainerStyle.paddingBottom` is at least that large plus `insets.bottom`.

### [G-2] Tab bar label "Tod..." truncated
**File:** `src/app/(tabs)/_layout.tsx` (tab label for Today/Dashboard)  
**Fix:** Either shorten the label string to "Today" with no truncation, or remove labels entirely (icon-only tabs per the design spec in `docs/03-ui-ux-architecture.md`).

---

## PRIORITY ORDER FOR OPUS 4.8

| Priority | ID   | Effort | Impact |
|----------|------|--------|--------|
| 1        | C-1  | 5 min  | Unblocks entire Habits tab |
| 2        | T-1  | 30 min | Fixes template creation |
| 3        | U-1  | 2 hrs  | Biggest UX win in active logging |
| 4        | U-2  | 45 min | Layout legibility |
| 5        | U-3  | 45 min | Rest timer UX |
| 6        | T-2  | 30 min | Template rest time integrity |
| 7        | U-4  | 1 hr   | Mid-session rest override |
| 8        | T-3  | 2 hrs  | Template duration target |
| 9        | G-1  | 20 min | Scroll clipping |
| 10       | G-2  | 5 min  | Label truncation |
