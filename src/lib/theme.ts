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

  // Typography System
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
  },

  typography: {
    displayXl: {
      fontSize: 36,
      lineHeight: 40,
      fontWeight: "600",
      fontFamily: "EBGaramond_600",
    },
    displayLg: {
      fontSize: 28,
      lineHeight: 34,
      fontWeight: "600",
      fontFamily: "EBGaramond_600",
    },
    heading: {
      fontSize: 20,
      lineHeight: 26,
      fontWeight: "600",
      fontFamily: "EBGaramond_600",
    },
    bodyLg: {
      fontSize: 17,
      lineHeight: 24,
      fontWeight: "400",
      fontFamily: "Inter_400",
    },
    body: {
      fontSize: 15,
      lineHeight: 22,
      fontWeight: "400",
      fontFamily: "Inter_400",
    },
    caption: {
      fontSize: 13,
      lineHeight: 18,
      fontWeight: "500",
      fontFamily: "Inter_500",
    },
    monoData: {
      fontSize: 15,
      lineHeight: 20,
      fontWeight: "500",
      fontFamily: "JetBrainsMono_500",
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
