# UI & STYLE CONSTRAINTS: TOKEN-DRIVEN DESIGN SYSTEM

You must enforce this system across all visual components. Arbitrary magic layout dimensions, unchecked padding scales, and hardcoded inline hex codes are strictly prohibited.

## 1. ABSOLUTE THEME ISOLATION LAW

- **Source of Truth:** All visual layout implementations must exclusively pull properties from the preconfigured `src/lib/theme.ts` constants file.
- **The Anti-Hex Rule:** You are strictly forbidden from writing raw hexadecimal or RGB values directly into UI elements (`#22c55e`, `rgba(...)`). You must call token constants by name (e.g., `theme.colors.accentPrimary`).

## 2. TYPOGRAPHY BOUNDARIES & SCALE TRACKING

You must strictly enforce the following typography scale boundaries. Never combine unauthorized text styles or invent hybrid font configurations outside this explicit 7-token layout map:

- **Display Headline:** `fontFamily: theme.fonts.display` (EB Garamond 600), `fontSize: 28px`.
  - _Boundary Limit:_ Used strictly for main screen greetings or structural title headers.
- **Section Title:** `fontFamily: theme.fonts.display` (EB Garamond 600), `fontSize: 20px`.
  - _Boundary Limit:_ Used for secondary headings and structural block layouts.
- **Mono Data Large:** `fontFamily: theme.fonts.mono` (JetBrains Mono 500), `fontSize: 24px`.
  - _Boundary Limit:_ Used for live metrics tracking and ring summary displays.
- **Mono Data Small:** `fontFamily: theme.fonts.mono` (JetBrains Mono 400), `fontSize: 15px`.
  - _Boundary Limit:_ Used for workout logging fields and small data snapshots.
- **Body Core:** `fontFamily: theme.fonts.body` (Inter 400), `fontSize: 16px`.
  - _Boundary Limit:_ Primary interface text, labels, and paragraph layouts.
- **Body Bold:** `fontFamily: theme.fonts.body` (Inter 500), `fontSize: 16px`.
  - _Boundary Limit:_ High-emphasis row headers and button labels.
- **Caption Muted:** `fontFamily: theme.fonts.body` (Inter 400), `fontSize: 12px`, `color: theme.colors.textSecondary`.
  - _Boundary Limit:_ Timestamps, labels, sub-headers, and descriptive subtext.

## 3. LAYOUT SCALE & INTERACTION LAWS

- **Spacing Scale:** Layout margins, paddings, and flex gaps must strictly utilize incremental 4px spacing steps directly from `theme.spacing` (e.g., `theme.spacing.xs = 4px`, `theme.spacing.md = 16px`). Never specify inline numerical pixel offsets.
- **Interaction Scale:** Apply a strict structural press effect animation using React Native Reanimated to all pressable layers:
  - Scale property must tween precisely from `1.0 -> 0.97` on active press down.
  - Durations must be locked exactly to a snappy `100ms` response curves.
- **Haptic feedback execution:** Trigger targeted hardware responses via `expo-haptics`:
  - Use `Haptics.ImpactFeedbackStyle.Light` on valid selection toggles.
  - Use `Haptics.NotificationFeedbackType.Success` for PR completions and timer expirations.
