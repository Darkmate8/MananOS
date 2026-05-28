# Font Setup Instructions (Phase 0.2)

The MananOS design system requires three custom fonts. Add them to `assets/fonts/` as TTF files.

## Required Fonts

1. **EB Garamond (Weight 600)**
   - File: `EBGaramond-SemiBold.ttf`
   - Usage: Display headlines, section titles
   - Source: https://fonts.google.com/specimen/EB+Garamond

2. **JetBrains Mono (Weights 400, 500)**
   - Files: `JetBrainsMono-Regular.ttf`, `JetBrainsMono-Medium.ttf`
   - Usage: Numeric data, timers, counters
   - Source: https://fonts.google.com/specimen/JetBrains+Mono

3. **Inter (Weights 400, 500)**
   - Files: `Inter-Regular.ttf`, `Inter-Medium.ttf`
   - Usage: Body text, labels, UI elements
   - Source: https://fonts.google.com/specimen/Inter

## How to Add Fonts

1. Download each font from Google Fonts
2. Extract the TTF files
3. Place them in `assets/fonts/` directory
4. The app will automatically load them via `expo-font`

## Font Registration

Fonts are registered in `src/app/_layout.tsx`:
- `EBGaramond_600` → Used in theme as `theme.fonts.display`
- `Inter_400` → Used in theme as `theme.fonts.body`
- `Inter_500` → Used in theme as `theme.fonts.bodyBold`
- `JetBrainsMono_400` → Used in theme as fallback
- `JetBrainsMono_500` → Used in theme as `theme.fonts.mono`

## Verification

Once fonts are added, the app will load them on startup. Check `src/lib/theme.ts` for the complete token system.
