# NAVIGATION LAWS: EXPO ROUTER FILEhierarchy & GUARDRAILS

You must strictly enforce this routing standard. Custom routing functions, dynamic layout generation hacks, or implicit file path declarations are prohibited.

## 1. STRATEGIC RE-EXPORT & IMPORT PATH LAW
- **Pathing Standard:** You must exclusively utilize absolute path aliases mapped via TypeScript settings (`@/components/...`, `@/hooks/...`, `@/store/...`).
- **Relative Path Ban:** Never write multi-step relative lookups (`../../components`). If a file location changes, absolute alias paths must remain valid without modifications.

## 2. EXPO ROUTER V3 TAB AND MODAL STRUCTURES
The application structure is locked to this explicit directory architecture. Do not create unapproved paths:

```text
src/app/
├── (auth)/                    # Isolated authentication gateway
│   ├── sign-in.tsx            # Anonymous session sign-in handler
│   └── sign-up.tsx            # Fallback sign-up sheet layout
├── (tabs)/                    # Persistent bottom navigation container
│   ├── _layout.tsx            # Configures custom tab layout mechanics
│   ├── index.tsx              # Today Dashboard route root
│   ├── workouts/              # Workout interface stack directory
│   │   ├── index.tsx          # History overview list view
│   │   └── active.tsx         # Active session tracking screen
│   ├── nutrition/             # Nutrition interface stack directory
│   │   ├── index.tsx          # Macro tracker home view
│   │   └── history.tsx        # Aggregate nutrition history chart
│   └── habits/                # Habits interface stack directory
│       ├── index.tsx          # Habits checklist home view
│       └── [habitId].tsx      # Individual habit detail visualization
└── (modals)/                  # Floating bottom-sheet interaction layover
    ├── _layout.tsx            # Formats native page modal configurations
    ├── exercise-search.tsx    # Modal selection for active logging additions
    ├── create-habit.tsx       # Sheet element for initializing tracked items
    └── settings.tsx           # Security engine configuration view

```

## 3. ABSOLUTE DEEP LINK & ROUTING ACTIONS

* **Native Routing Standard:** Trigger navigation properties exclusively through type-safe string literals via the `router` component instance from `expo-router` (e.g., `router.push('/(modals)/settings')`).
* **Tab Layout Aesthetics:** Custom navigation component layouts in `app/(tabs)/_layout.tsx` must strictly render visual guardrails matching Doc 03:
* Warm dark canvas background color configurations.
* Active indicators styled using an explicit terracotta dot overlay centered directly underneath the focused icon layout frame.
* Tab bar presentation settings must hide system-rendered page titles, displaying only raw icon shapes (`lucide-react-native`).



## 4. DESTRUCTIVE VIEW GUARDRAILS

* **Active Tracker Locking:** The active workout logger route (`/workouts/active`) is protected by condition properties. A user must never be redirected out of this screen accidentally via navigation swipes.
* Force `gestureEnabled: false` inside screen layout configurations on active screens to ensure the viewport does not close mid-workout.

