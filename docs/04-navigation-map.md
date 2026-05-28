# SYSTEM DIRECTIVE: NAVIGATION ARCHITECTURE (DOC 04/06)
**Target Audience:** AI Routing Agent / Front-End Architect.
**Core Standard:** Expo Router v3+ file-based routing. Absolute paths only. 

---

## 1. EXPO ROUTER FILE TREE (src/app/)
Downstream generators must replicate this directory tree exactly.

```text
src/app/
├── _layout.tsx                          # Root layout: App bootstrap, global providers
├── (tabs)/                              # Core Tab Interface Shell
│   ├── _layout.tsx                      # <Tabs> custom layout wrapper
│   ├── today/                           # TODAY STACK
│   │   ├── _layout.tsx                  # <Stack> wrapper
│   │   ├── index.tsx                    # Today Dashboard root view
│   │   └── coach.tsx                    # Coach 1 Chat interface
│   ├── workouts/                        # WORKOUTS STACK
│   │   ├── _layout.tsx                  # <Stack> wrapper
│   │   ├── index.tsx                    # Workout list and history view
│   │   ├── active.tsx                   # Active session tracking UI (State Guarded)
│   │   ├── exercise-detail.tsx          # Exercise progression view
│   │   └── summary.tsx                  # Finished workout metric breakdown
│   ├── nutrition/                       # NUTRITION STACK
│   │   ├── _layout.tsx                  # <Stack> wrapper
│   │   ├── index.tsx                    # Nutrition logging & Coach 2 input
│   │   ├── meal-detail.tsx              # Single meal breakdown view
│   │   └── history.tsx                  # Nutrition history view
│   └── habits/                          # HABITS STACK
│       ├── _layout.tsx                  # <Stack> wrapper
│       ├── index.tsx                    # Habits home & daily toggles
│       └── habit-detail.tsx             # 53-week contribution grid
└── (modals)/                            # GLOBAL MODALS (Root interceptor group)
    ├── _layout.tsx                      # <Stack screenOptions={{ presentation: 'modal' }}>
    ├── set-edit.tsx                     # Workout set adjustments sheet
    ├── weight-log.tsx                   # Bodyweight entry sheet
    ├── habit-count.tsx                  # Incremental counter sheet
    ├── create-habit.tsx                 # Blueprint addition sheet
    └── settings.tsx                     # System config panel

```

---

## 2. STRICT ROUTE MATRIX & DEEP LINKS

AI routing engines must configure linking properties exactly to this JSON matrix. Scheme: `yourapp://` (defined in `app.json`).

```json
[
  { "path": "/(tabs)/today", "type": "TabRoot", "deepLink": "yourapp://today", "backAction": "HardwareBackHandler exit" },
  { "path": "/(tabs)/today/coach", "type": "StackPush", "deepLink": "yourapp://today/coach", "backAction": "router.back()" },
  { "path": "/(tabs)/workouts", "type": "TabRoot", "deepLink": "yourapp://workouts", "backAction": "Prevent snap back" },
  { "path": "/(tabs)/workouts/active", "type": "StackPush", "deepLink": "yourapp://workouts/active", "backAction": "Intercept with Discard Alert" },
  { "path": "/(tabs)/workouts/exercise-detail", "type": "StackPush", "deepLink": "yourapp://workouts/exercise-detail", "backAction": "router.back()" },
  { "path": "/(tabs)/workouts/summary", "type": "StackPush", "deepLink": "yourapp://workouts/summary", "backAction": "router.replace('/(tabs)/workouts')" },
  { "path": "/(tabs)/nutrition", "type": "TabRoot", "deepLink": "yourapp://nutrition", "backAction": "Prevent snap back" },
  { "path": "/(tabs)/nutrition/meal-detail", "type": "StackPush", "deepLink": "yourapp://nutrition/meal-detail", "backAction": "router.back()" },
  { "path": "/(tabs)/nutrition/history", "type": "StackPush", "deepLink": "yourapp://nutrition/history", "backAction": "router.back()" },
  { "path": "/(tabs)/habits", "type": "TabRoot", "deepLink": "yourapp://habits", "backAction": "Prevent snap back" },
  { "path": "/(tabs)/habits/habit-detail", "type": "StackPush", "deepLink": "yourapp://habits/habit-detail", "backAction": "router.back()" },
  { "path": "/(modals)/set-edit", "type": "RootModal", "deepLink": "yourapp://(modals)/set-edit", "backAction": "router.dismiss()" },
  { "path": "/(modals)/weight-log", "type": "RootModal", "deepLink": "yourapp://(modals)/weight-log", "backAction": "router.dismiss()" },
  { "path": "/(modals)/habit-count", "type": "RootModal", "deepLink": "yourapp://(modals)/habit-count", "backAction": "router.dismiss()" },
  { "path": "/(modals)/create-habit", "type": "RootModal", "deepLink": "yourapp://(modals)/create-habit", "backAction": "router.dismiss()" },
  { "path": "/(modals)/settings", "type": "RootModal", "deepLink": "yourapp://(modals)/settings", "backAction": "router.dismiss()" }
]

```

---

## 3. CORE INTEGRATION LAWS

### 3.1 Tab Architecture

* **State Isolation:** Each tab maintains its own independent stack. Switching tabs must NOT reset or unmount the stack state of the other tabs.

### 3.2 Global Modals

* To navigate to a modal from anywhere, strictly use `router.push('/(modals)/[name]')`.
* On Android, modal presentation defaults to a slide-up sheet (`presentation: 'modal'`).

### 3.3 Active Persistent Session State Guard

* `workouts/active.tsx` must utilize an automated entry checkpoint.
* **Rule:** If the `active_session` state is null/undefined on mount, instantly execute `router.replace('/(tabs)/workouts')`. This blocks access via stale deep links or dead back-navigations.
* Set `headerShown: false` in `workouts/_layout.tsx` specifically for the `active` screen. The session stats bar acts as the header.

### 3.4 Rest Timer Component (NON-ROUTE)

* The Rest Timer is **strictly not a route**. Do not build a file for it in `src/app/`.
* It is a persistent UI component rendered absolutely (`bottom: [tab_bar_height]`) inside `workouts/active.tsx`. It tracks state via Zustand/hook so it does not unmount when the user scrolls or interacts with the exercise list.

