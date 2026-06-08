# Graph Report - .  (2026-06-03)

## Corpus Check
- Corpus is ~35,006 words - fits in a single context window. You may not need a graph.

## Summary
- 526 nodes · 1007 edges · 29 communities (23 shown, 6 thin omitted)
- Extraction: 94% EXTRACTED · 5% INFERRED · 0% AMBIGUOUS · INFERRED: 55 edges (avg confidence: 0.86)
- Token cost: 18,500 input · 3,200 output

## Community Hubs (Navigation)
- [[_COMMUNITY_Core App Infrastructure|Core App Infrastructure]]
- [[_COMMUNITY_Nutrition Data Layer|Nutrition Data Layer]]
- [[_COMMUNITY_Habits Tracking System|Habits Tracking System]]
- [[_COMMUNITY_Expo & React Native Dependencies|Expo & React Native Dependencies]]
- [[_COMMUNITY_Auth & Root Navigation|Auth & Root Navigation]]
- [[_COMMUNITY_App Shell & Workout Flow|App Shell & Workout Flow]]
- [[_COMMUNITY_Activity Ring Visualization|Activity Ring Visualization]]
- [[_COMMUNITY_Expo App Configuration|Expo App Configuration]]
- [[_COMMUNITY_VSCode Dev Environment|VSCode Dev Environment]]
- [[_COMMUNITY_Architectural Concepts|Architectural Concepts]]
- [[_COMMUNITY_AI API Key Management|AI API Key Management]]
- [[_COMMUNITY_AI Coach Context Pipeline|AI Coach Context Pipeline]]
- [[_COMMUNITY_Dev & Build Dependencies|Dev & Build Dependencies]]
- [[_COMMUNITY_Exercise Data & Search|Exercise Data & Search]]
- [[_COMMUNITY_Mock & Seed Data|Mock & Seed Data]]
- [[_COMMUNITY_Theme Token System|Theme Token System]]
- [[_COMMUNITY_TypeScript Config|TypeScript Config]]
- [[_COMMUNITY_Nutrition History Charts|Nutrition History Charts]]
- [[_COMMUNITY_Build Config Files|Build Config Files]]
- [[_COMMUNITY_ESLint Config|ESLint Config]]
- [[_COMMUNITY_VSCode Extensions|VSCode Extensions]]
- [[_COMMUNITY_Rest Timer Overlay|Rest Timer Overlay]]
- [[_COMMUNITY_Rest Timer Overlay|Rest Timer Overlay]]
- [[_COMMUNITY_Session Discard Action|Session Discard Action]]

## God Nodes (most connected - your core abstractions)
1. `useAuthStore` - 52 edges
2. `theme` - 28 edges
3. `supabase` - 26 edges
4. `useSessionStore` - 19 edges
5. `workbench.colorCustomizations` - 18 edges
6. `storage` - 18 edges
7. `getIsConnected()` - 14 edges
8. `expo` - 13 edges
9. `useFinishWorkout()` - 13 edges
10. `useLogHabitCompletion()` - 13 edges

## Surprising Connections (you probably didn't know these)
- `Active Session Draft (MMKV-backed Zustand)` --implements--> `Session Store (useSessionStore)`  [INFERRED]
  docs/02-trd.md → src/store/sessionStore.ts
- `storage` --implements--> `MMKV Sync Queue for Offline Mutations`  [INFERRED]
  src/lib/mmkv.ts → docs/02-trd.md
- `getSyncQueue()` --implements--> `MMKV Sync Queue for Offline Mutations`  [INFERRED]
  src/lib/mmkv.ts → docs/02-trd.md
- `setSyncQueue()` --implements--> `MMKV Sync Queue for Offline Mutations`  [INFERRED]
  src/lib/mmkv.ts → docs/02-trd.md
- `Supabase Anonymous Authentication` --implements--> `Auth Store (useAuthStore)`  [INFERRED]
  docs/02-trd.md → src/store/authStore.ts

## Import Cycles
- None detected.

## Hyperedges (group relationships)
- **Offline Mutation Triple-Play Pattern** — concept_sync_queue, concept_offline_first, concept_active_session_draft, store_session_store [EXTRACTED 0.95]
- **Dual AI Coach Pipeline (Coach 1 + Coach 2 + API Keys)** — concept_coach1_chat, concept_coach2_parser, hooks_use_api_keys, modals_settings [INFERRED 0.85]
- **Anonymous Auth Flow Screen Stack** — auth_layout, auth_sign_in, auth_sign_up, concept_anonymous_auth [EXTRACTED 0.95]
- **Active Workout Session Lifecycle (Store → Active Screen → Summary → Finish)** — workouts_active_activeworkoutscreen, workouts_summary_workoutsummaryscreen, app__layout_rootlayout, workouts_index_workoutsscreen [EXTRACTED 0.95]
- **Habit Tracking & Visualization Flow (Screen → Grid → Completions Hook)** — habits_index_habitsscreen, habits_habitid_habitdetailscreen, components_habitcontributiongrid_habitcontributiongrid, hooks_useallhabitscompletions_useallhabitscompletions [EXTRACTED 0.95]
- **Today Dashboard Aggregates Activity Rings, Workout, Nutrition, Habits** — tabs_index_todayscreen, components_activityrings_activityrings, tabs_index_workoutcard, tabs_index_habitsrow, tabs_index_proteinbar [EXTRACTED 0.95]
- **Offline Mutation Triple-Play Pattern (onMutate + mutationFn + onError/onSettled)** — concept_optimistic_ui, lib_netutils_getisconnected, concept_sync_queue, concept_offline_mutation_pattern [EXTRACTED 0.95]
- **AI Nutrition Logging Pipeline (Parse -> Log -> Cache)** — hooks_usecoach2parse_usecoach2parse, hooks_uselogmealfromcoach_uselogmealfromcoach, hooks_usenutritiontoday_usenutritiontoday, hooks_usenutritionhistory_usenutritionhistory [INFERRED 0.85]
- **Habit Tracking System (Create -> Log -> Today -> History)** — hooks_usecreatehabit_usecreatehabit, hooks_useloghabitcompletion_useloghabitcompletion, hooks_usetodayhabits_usetodayhabits, hooks_usehabithistory_usehabithistory [INFERRED 0.85]
- **MMKV Persistence Layer — Auth + Session + Supabase Storage** — lib_supabaseclient_mmkvauthstorage, store_authstore_useauthstore, store_sessionstore_usesessionstore [INFERRED 0.85]
- **Nutrition NLP Parsing Pipeline** — lib_nutritionmockparser_mockparsenlp, lib_nutritionmockparser_known_foods, lib_nutritionmockparser_tokenize, lib_nutritionmockparser_parseresult [EXTRACTED 1.00]
- **Active Workout Session Lifecycle Flow** — store_sessionstore_startsession, store_sessionstore_finishsession, store_sessionstore_discardsession, store_sessionstore_usesessionstore [EXTRACTED 1.00]

## Communities (29 total, 6 thin omitted)

### Community 0 - "Core App Infrastructure"
Cohesion: 0.08
Nodes (50): mmkvPersister, queryClient, styles, Epley 1RM Formula, Offline Mutation Pattern (Triple-Play), Optimistic UI Update Strategy, MMKV Sync Queue for Offline Mutations, CreateHabitInput (+42 more)

### Community 1 - "Nutrition Data Layer"
Cohesion: 0.08
Nodes (40): DeleteContext, LogMealContext, LogMealInput, useLogMealFromCoach(), useNutritionHistory(), computeTotals(), fetchNutritionToday(), getTodayRange() (+32 more)

### Community 2 - "Habits Tracking System"
Cohesion: 0.11
Nodes (38): HabitContributionGrid(), HabitContributionGridProps, styles, HabitsLayout, HabitDetailScreen(), styles, AnimatedPressable, FeaturedCard() (+30 more)

### Community 3 - "Expo & React Native Dependencies"
Cohesion: 0.04
Nodes (45): dependencies, ai, @ai-sdk/google, date-fns, expo, expo-constants, expo-device, expo-font (+37 more)

### Community 4 - "Auth & Root Navigation"
Cohesion: 0.06
Nodes (26): Index(), SignIn(), styles, AnimatedPressable, SignUp(), styles, Supabase Anonymous Authentication, Token-Driven Design System (+18 more)

### Community 5 - "App Shell & Workout Flow"
Cohesion: 0.08
Nodes (31): mmkvPersister, RootLayout, RootLayout(), PRBanner(), Props, styles, formatCountdown(), RestTimerOverlay() (+23 more)

### Community 6 - "Activity Ring Visualization"
Cohesion: 0.09
Nodes (25): ActivityRings(), ActivityRingsProps, AnimatedCircle, AnimatedRing(), RingProps, styles, ProfileRow, TodayRings (+17 more)

### Community 7 - "Expo App Configuration"
Cohesion: 0.07
Nodes (26): backgroundColor, backgroundImage, foregroundImage, monochromeImage, adaptiveIcon, package, predictiveBackGestureEnabled, reactCompiler (+18 more)

### Community 8 - "VSCode Dev Environment"
Cohesion: 0.08
Nodes (24): editor.codeActionsOnSave, source.fixAll, source.organizeImports, source.sortMembers, folder-color.pathColors, peacock.color, workbench.colorCustomizations, activityBar.activeBackground (+16 more)

### Community 9 - "Architectural Concepts"
Cohesion: 0.11
Nodes (21): Active Session Draft (MMKV-backed Zustand), Coach 1 Chat Engine (streamText), Coach 2 Nutrition Parser (generateObject), e1RM Epley Formula, 53-Week Habit Contribution Grid, MealParserSchema (Zod), Nutrition Logging via Coach 2, Offline-First Architecture Pattern (+13 more)

### Community 10 - "AI API Key Management"
Cohesion: 0.14
Nodes (16): NLP Nutritional Extraction Engine (Coach 2), SecureStore API Key Management, useApiKeys Hook, ApiKeyProvider, getApiKey(), KEYS, readKey(), useApiKeys() (+8 more)

### Community 11 - "AI Coach Context Pipeline"
Cohesion: 0.16
Nodes (17): CoachContext, CoachGoals, CoachMacroDay, CoachSet, CoachWorkout, fetchCoachContext(), useCoachContext(), AnimatedPressable (+9 more)

### Community 12 - "Dev & Build Dependencies"
Cohesion: 0.11
Nodes (18): devDependencies, eslint, eslint-config-expo, @types/react, @types/text-encoding, @types/uuid, typescript, main (+10 more)

### Community 13 - "Exercise Data & Search"
Cohesion: 0.18
Nodes (13): EXERCISE_SEED, SeedExercise, useExerciseSearch Hook, useExercises Hook / ExerciseRow Type, ExerciseRow, fetchAndSeedExercises(), useExercises(), scoreExercise() (+5 more)

### Community 14 - "Mock & Seed Data"
Cohesion: 0.17
Nodes (12): mockExercises, mockFoods, mockHabitCompletions, mockHabits, mockMeal, mockMealItems, mockProfile, mockStepsLog (+4 more)

### Community 15 - "Theme Token System"
Cohesion: 0.25
Nodes (7): Colors, Fonts, Spacing, ThemeColor, useColorScheme (native), useColorScheme(), useTheme()

### Community 16 - "TypeScript Config"
Cohesion: 0.25
Nodes (7): compilerOptions, paths, strict, extends, include, @/*, @/assets/*

### Community 17 - "Nutrition History Charts"
Cohesion: 0.40
Nodes (5): DAY_LABELS, DayNutrition, fetchNutritionHistory(), getLast7Days(), NutritionHistoryData

## Ambiguous Edges - Review These
- `useRestTimer()` → `Offline Mutation Pattern (Triple-Play)`  [AMBIGUOUS]
  src/hooks/useRestTimer.ts · relation: conceptually_related_to
- `Token-Driven Design System` → `React Native Streaming Polyfills (TextEncoder/TextDecoder)`  [AMBIGUOUS]
  docs/02-trd.md · relation: semantically_similar_to

## Knowledge Gaps
- **230 isolated node(s):** `recommendations`, `source.fixAll`, `source.organizeImports`, `source.sortMembers`, `folder-color.pathColors` (+225 more)
  These have ≤1 connection - possible missing edges or undocumented components.
- **6 thin communities (<3 nodes) omitted from report** — run `graphify query` to explore isolated nodes.

## Suggested Questions
_Questions this graph is uniquely positioned to answer:_

- **What is the exact relationship between `useRestTimer()` and `Offline Mutation Pattern (Triple-Play)`?**
  _Edge tagged AMBIGUOUS (relation: conceptually_related_to) - confidence is low._
- **What is the exact relationship between `Token-Driven Design System` and `React Native Streaming Polyfills (TextEncoder/TextDecoder)`?**
  _Edge tagged AMBIGUOUS (relation: semantically_similar_to) - confidence is low._
- **Why does `useAuthStore` connect `Habits Tracking System` to `Core App Infrastructure`, `Nutrition Data Layer`, `Auth & Root Navigation`, `App Shell & Workout Flow`, `Activity Ring Visualization`, `AI Coach Context Pipeline`, `Exercise Data & Search`, `Nutrition History Charts`?**
  _High betweenness centrality (0.114) - this node is a cross-community bridge._
- **Why does `theme` connect `Auth & Root Navigation` to `Core App Infrastructure`, `Nutrition Data Layer`, `Habits Tracking System`, `App Shell & Workout Flow`, `Activity Ring Visualization`, `AI API Key Management`, `AI Coach Context Pipeline`, `Exercise Data & Search`?**
  _High betweenness centrality (0.092) - this node is a cross-community bridge._
- **Why does `useAllHabitsCompletions()` connect `Habits Tracking System` to `Mock & Seed Data`?**
  _High betweenness centrality (0.030) - this node is a cross-community bridge._
- **Are the 2 inferred relationships involving `useSessionStore` (e.g. with `useAuthStore` and `Anti-Unmount Session Guard`) actually correct?**
  _`useSessionStore` has 2 INFERRED edges - model-reasoned connections that need verification._
- **What connects `recommendations`, `source.fixAll`, `source.organizeImports` to the rest of the system?**
  _235 weakly-connected nodes found - possible documentation gaps or missing edges._