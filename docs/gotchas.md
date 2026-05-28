# GOTCHAS & BUG LOG
**Maintenance Protocol:** 
- Before starting a new coding session, review this file.
- If the AI gets stuck in a loop failing to fix an error 3 times, STOP. Document the error here, research the actual fix, log it, and start a fresh AI context window.
- Never delete resolved issues; they act as permanent context for the AI.

## 1. React Native / UI Quirks
- *Example: EB Garamond font looks clipped on Android if `lineHeight` is not explicitly set.*
- (Log new UI bugs here)

## 2. Expo / Build / Native Errors
- *Example: Cannot use Expo Go. App instantly crashes due to `react-native-mmkv` missing native bindings. Must use `npx expo run:android`.*
- (Log new build bugs here)

## 3. Zustand / State Issues
- *Example: Do NOT clear the active session store on component unmount or view blur. It wipes workout data if the user minimizes the app. Only clear on explicit "Finish" button press.*
- (Log new state bugs here)

## 4. TanStack Query / Caching
- (Log data fetching/caching bugs here)

## 5. MMKV / Offline Sync
- (Log offline queue and local storage bugs here)

## 6. Supabase / RLS & Auth
- (Log database permission and auth bugs here)

## 7. AI / Streaming SDK
- *Example: Vercel AI SDK streams will crash on React Native unless `TextEncoder` and `TextDecoder` polyfills are injected at the very top of `app/_layout.tsx`.*
- (Log LLM parsing and stream bugs here)

## 8. Navigation / Routing
- (Log Expo Router structural bugs here)