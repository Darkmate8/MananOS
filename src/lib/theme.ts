// Theme tokens (Doc 03 / UI-UX Design Framework)
export const theme = {
  // Color System: Surfaces & Canvas
  colors: {
    bgCanvas: "#1A1714",
    bgSurface1: "#211D1A",
    bgSurface2: "#2A2522",
    bgSurface3: "#332D29",
    borderDefault: "#2F2925",
    borderStrong: "#403832",

    // Text Properties
    textPrimary: "#F0EBE3",
    textSecondary: "#B8B0A4",
    textTertiary: "#7A7268",

    // System Accent & Data States
    accentPrimary: "#D97757",
    accentPrimaryPressed: "#C26545",
    accentPrimaryMuted: "rgba(217, 119, 87, 0.15)",

    // Activity Ring Colors
    ringSteps: "#D97757",
    ringWater: "#6A8CAF",
    ringWaterMuted: "rgba(106, 140, 175, 0.15)",
    ringCalories: "#788C5D",

    // Semantic Signals
    success: "#7A9B6E",
    warning: "#C9A05C",
    error: "#C26B5C",
    info: "#6A8CAF",

    // Habit Grid Intensity Ramp
    habitGrid: {
      empty: "#211D1A",
      grid25: "#3A2E26",
      grid50: "#7A4A33",
      grid75: "#B2613F",
      grid100: "#D97757",
    },
  },

  // Typography System - 7 Authorized Styles (Constraint Rule: 03-ui-styling.md)
  fonts: {
    display: {
      fontFamily: "EBGaramond_600",
    },
    body: {
      fontFamily: "Inter_400",
    },
    bodyBold: {
      fontFamily: "Inter_500",
    },
    mono: {
      fontFamily: "JetBrainsMono_500",
    },
    monoSmall: {
      fontFamily: "JetBrainsMono_400",
    },
  },

  // Typography Styles (MUST enforce these 7 boundary styles - constraint rule 03-ui-styling.md Section 2)
  typography: {
    // Display Headline: Main screen greetings or structural title headers
    displayHeadline: {
      fontSize: 28,
      fontWeight: "600",
      fontFamily: "EBGaramond_600",
    },
    // Section Title: Secondary headings and structural block layouts
    sectionTitle: {
      fontSize: 20,
      fontWeight: "600",
      fontFamily: "EBGaramond_600",
    },
    // Mono Data Large: Live metrics tracking and ring summary displays
    monoDataLarge: {
      fontSize: 24,
      fontWeight: "500",
      fontFamily: "JetBrainsMono_500",
    },
    // Mono Data Small: Workout logging fields and small data snapshots
    monoDataSmall: {
      fontSize: 15,
      fontWeight: "400",
      fontFamily: "JetBrainsMono_400",
    },
    // Body Core: Primary interface text, labels, and paragraph layouts
    bodyCore: {
      fontSize: 16,
      fontWeight: "400",
      fontFamily: "Inter_400",
    },
    // Body Bold: High-emphasis row headers and button labels
    bodyBold: {
      fontSize: 16,
      fontWeight: "500",
      fontFamily: "Inter_500",
    },
    // Caption Muted: Timestamps, labels, sub-headers, descriptive subtext
    captionMuted: {
      fontSize: 12,
      fontWeight: "400",
      fontFamily: "Inter_400",
      color: "#B8B0A4", // textSecondary
    },
  },

  // Spacing System (4px base increment)
  spacing: {
    xs: 4,    // space-1
    sm: 8,    // space-2
    md: 12,   // space-3
    lg: 16,   // space-4
    xl: 20,   // space-5
    xxl: 24,  // space-6
    xxxl: 32, // space-8
    huge: 40, // space-10
    massive: 48, // space-12
  },

  // Border Radius
  radius: {
    button: 10,
    card: 16,
    modal: 24,
    pill: 999,
  },

  // Animation
  animation: {
    standard: 180,      // Standard component transitions (ms)
    dataIntensive: 600, // Activity rings & statistical elements (ms)
    press: 100,         // Button press scale effect (ms)
    modal: 300,         // Modal slide-up (ms)
  },
} as const;

// Preset responsive breakpoints (if needed for future web support)
export const breakpoints = {
  sm: 375,
  md: 768,
  lg: 1024,
} as const;
