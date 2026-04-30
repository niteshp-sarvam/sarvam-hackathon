/**
 * Gamification color palette for Vaani.
 *
 * Tatva semantic tokens (positive/danger/warning/brand) drive the core UI, but
 * gamification features need richer, brand-specific accents — XP gold,
 * Duolingo-green for "good" ratings, Mistake-Garden stage tints, etc. This
 * module centralizes those values so we never copy-paste a hex code into a
 * page again.
 */

export const GAME_COLORS = {
  // Success / "good" rating / completed lessons
  success: "#58CC02",
  successDark: "#46A302",
  successLight: "#89E219",

  // Danger / "forgot" rating / errors
  danger: "#FF4B4B",
  dangerAlt: "#EF4444",
  dangerDark: "#E53E3E",

  // Warning / "hard" rating / pending
  warning: "#F59E0B",
  warningAlt: "#FFC200",
  warningOrange: "#FF9600",
  warningOrangeDark: "#F49000",
  warningOrangeAlt: "#E68600",

  // XP / streaks / hero stats — gold family
  xp: "#FFC200",
  xpDark: "#F49000",
  xpStar: "#FFC800",

  // Info / "easy" rating / listening lessons
  info: "#1CB0F6",
  infoDark: "#0899DB",

  // Brand indigo / scenario / blooming
  brand: "#6366F1",
  brandLight: "#A855F7",

  // Scenario / purple
  scenario: "#CE82FF",
  scenarioDark: "#A855F7",

  // Neutral fallbacks (used when CSS vars miss)
  neutralBorder: "#E5E5E5",
  neutralBorderDark: "#333333",
  neutralBgFallback: "#F3F4F6",
  neutralBgTertiary: "#F3F3F3",
  starInactive: "#D0D0D0",
} as const;

/** Translucent tints / borders used by Mistake Garden and rating chips. */
export const GAME_TINTS = {
  successBg: "rgba(88,204,2,0.10)",
  successBorder: "rgba(88,204,2,0.25)",

  dangerBg: "rgba(239,68,68,0.10)",
  dangerBorder: "rgba(239,68,68,0.25)",

  warningBg: "rgba(245,158,11,0.10)",
  warningBorder: "rgba(245,158,11,0.25)",

  infoBg: "rgba(28,176,246,0.10)",
  infoBorder: "rgba(28,176,246,0.25)",

  brandBg: "rgba(99,102,241,0.10)",
  brandBorder: "rgba(99,102,241,0.25)",

  xpBg: "rgba(251,191,36,0.10)",
  xpBorder: "rgba(251,191,36,0.25)",
} as const;

/** Pre-baked gradients for hero buttons, score banners, and CTA blocks. */
export const GAME_GRADIENTS = {
  success: `linear-gradient(135deg, ${GAME_COLORS.success}, ${GAME_COLORS.successDark})`,
  danger: `linear-gradient(135deg, ${GAME_COLORS.danger}, ${GAME_COLORS.dangerDark})`,
  warning: `linear-gradient(135deg, ${GAME_COLORS.warningAlt}, ${GAME_COLORS.warningOrangeDark})`,
  warningSoft: `linear-gradient(90deg, ${GAME_COLORS.warningAlt}, ${GAME_COLORS.warningOrangeDark})`,
  info: `linear-gradient(135deg, ${GAME_COLORS.info}, ${GAME_COLORS.infoDark})`,
  infoSoft: `linear-gradient(90deg, ${GAME_COLORS.info}, ${GAME_COLORS.infoDark})`,
  speak: `linear-gradient(135deg, ${GAME_COLORS.warningOrange}, ${GAME_COLORS.warningOrangeAlt})`,
  speakSoft: `linear-gradient(90deg, ${GAME_COLORS.warningOrange}, ${GAME_COLORS.warningOrangeAlt})`,
  scenario: `linear-gradient(135deg, ${GAME_COLORS.scenario}, ${GAME_COLORS.scenarioDark})`,
  brand: `linear-gradient(90deg, ${GAME_COLORS.brand}, ${GAME_COLORS.info})`,
  successSoft: `linear-gradient(90deg, ${GAME_COLORS.success}, ${GAME_COLORS.successLight})`,
} as const;

/** Tatva surface var helpers — fallbacks match the dark theme defaults. */
export const SURFACE_VARS = {
  backgroundTertiary: "var(--tatva-background-tertiary, #F3F4F6)",
  surfaceSecondary: "var(--tatva-surface-secondary, #fff)",
  contentPrimary: "var(--tatva-content-primary, #fff)",
  borderPrimary: "var(--tatva-border-primary, #333)",
  borderSecondary: "var(--tatva-border-secondary, #E5E5E5)",
} as const;

export type GameColorKey = keyof typeof GAME_COLORS;
export type GameTintKey = keyof typeof GAME_TINTS;
export type GameGradientKey = keyof typeof GAME_GRADIENTS;
