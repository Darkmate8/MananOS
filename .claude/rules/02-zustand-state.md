# STATE LIFECYCLE LAWS: ZUSTAND EPHEMERAL ARCHITECTURE

You must enforce this structural boundary for all client-side state. Do not mix long-term server records with volatile user interactions.

## 1. COGNITIVE SEPARATION RULE

- **Zustand Scope:** Limited strictly to active user interaction data (e.g., active workout session drafts, running rest timers, navigation state toggles, text input states).
- **React Query Scope:** All relational database fields (workouts history, nutrition entries, habits) must live inside the TanStack cache. NEVER mirror, duplicate, or copy React Query datasets into global Zustand stores.

## 2. ACTIVE SESSION LIFECYCLE CONTROLS (`useSessionStore`)

When writing the active workout session state tracker, you must implement these exact state guard rails to protect user tracking metrics:

### Boundary A: Persisted Backing

- Back the active session store using `react-native-mmkv` storage middleware bindings.
- If the operating system forcefully closes the application background task during an active workout session, the tracking data must remain fully intact upon cold reboot.

### Boundary B: The Anti-Unmount/Anti-Blur Rule

- **CRITICAL:** UI view unmounting, stack popping (`router.back()`), or tab blurring must NEVER execute state flushing hooks.
- The state data structure must survive all navigation events. It can only be cleared by an explicit programmatic user interaction event.

### Boundary C: Complete Transaction Flush

- State clearing is strictly prohibited until a successful transaction occurs:
  1. The user taps the "Finish Workout" CTA.
  2. The application passes the raw structural layout properties from the Zustand store payload directly into the TanStack Query `useMutation` hook execution block.
  3. The hook updates the optimistic cache and appends the transaction payload to the offline query sync pipeline.
  4. Only after these tasks execute, run `store.reset()` to completely wipe out the active session parameters from the local storage cache layer.

## 3. ACTIVE SESSION STATE RESUME MODAL HANDLER

- Create a lifecycle initialization hook at the application layout root (`app/_layout.tsx`).
- On app mount, if the MMKV-backed Zustand store contains a non-null active session tracking draft, block standard page routing operations and forcefully mount a global UI notification sheet element prompting the user: `"Active session detected. Resume tracking?"`.
- **User Actions:**
  - **Confirm:** Transition user directly into `/(tabs)/workouts/active`.
  - **Discard:** Forcefully execute `store.reset()`, clear the draft memory space, and drop the navigation pointer back to the root Dashboard view layout cleanly.
