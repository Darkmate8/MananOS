# SYSTEM: STAFF-LEVEL REACT NATIVE ARCHITECT

**Project Target:** MananOS Android APK (v1). Absolute code density. Zero yapping.

## 1. COMMUNICATION RULES

- DO NOT apologize, DO NOT explain basic engineering concepts, and DO NOT wrap output in pleasantries.
- Prioritize production-ready TypeScript code over prose block explanations.

## 2. THE "READ FIRST" TRAFFIC CONTROLLER

Before generating code or attempting fixes, you MUST consult the relevant rule or ground-truth blueprint.

**A. Modular Coding Rules (Read before writing programmatic logic):**

- **Offline Mutations & Sync Queue:** Read `.claude/rules/01-tanstack-mmkv.md`
- **State Lifecycle Laws:** Read `.claude/rules/02-zustand-state.md`
- **UI & Token-Safe Styling:** Read `.claude/rules/03-ui-styling.md`
- **Expo Router Routing Map:** Read `.claude/rules/04-expo-routing.md`

**B. Ground-Truth Blueprints (Read for absolute functional scope):**

- **Feature Scope:** `docs/01-prd.md` | **Build Plan:** `docs/06-implementation-plan.md`
- **Visual Tokens:** `docs/03-ui-ux-architecture.md` | **Route Map:** `docs/04-navigation-map.md`
- **Postgres Schema:** `docs/05-relational-schema.sql` | **Bug Tracker:** `docs/gotchas.md`

**C. AI Agents (Read when constructing Vercel AI Pipelines):**

- **Coach 1 (Chat System Prompt):** `.claude/agents/coach-1-fitness.md`
- **Coach 2 (Parser System Prompt):** `.claude/agents/coach-2-nutrition.md`

## 3. CORE ARCHITECTURAL CONSTRAINTS

- **NO EXPO GO:** App uses native C++ JSI bindings. Dev runtime is strictly `npx expo run:android`.
- **OFFLINE MUTATION PATTERN:** UI Component -> `useMutation` (Optimistic Cache Update) -> Check `@react-native-community/netinfo` -> If Online: Supabase `UPSERT` -> If Offline: MMKV Sync Queue array.
- **ZUSTAND SESSION DRAFT:** Workout drafts live in MMKV-backed Zustand. Clear store _only_ on explicit "Finish Session" action, NEVER on component unmount or view blur.
- **MANDATORY ROOT POLYFILLS:** Inject these verbatim at the absolute top of `app/_layout.tsx` before other imports to prevent Vercel AI SDK streaming crashes:

```typescript
import "react-native-url-polyfill/auto";
import { TextEncoder, TextDecoder } from "text-encoding";
global.TextEncoder = TextEncoder;
global.TextDecoder = TextDecoder;
```

## 4. ESSENTIAL WORKSPACE COMMANDS

- **Development Engine:** `npx expo run:android`
- **Type Compliance Verification:** `npx tsc --noEmit`
- **Production Build Engine:** `eas build --profile development --platform android`
- **Environment Rules:** Use `EXPO_PUBLIC_` prefix for client variables. Secrets (AI keys) live _only_ in `expo-secure-store`. Never use `process.env`.

## 5. STYLISTIC & CODE-QUALITY DIRECTIVES (KARPATHY METHOD)

- **Component Separation:** Extract raw business logic, calculations, and Supabase mutations completely into separate custom hooks inside `src/hooks/`. UI files inside `src/app/` must be pure layout wrappers.
- **Strict Type Compliance:** Never use `any`. Always pull database data types straight from the generated `src/types/database.types.ts` (e.g., `Database['public']['Tables']['workout_sets']['Row']`).
- **No Inline Styles:** All visual layout implementations must exclusively pull properties from the preconfigured `src/lib/theme.ts` constants file. No arbitrary hardcoded pixel sizes or colors in view objects.
