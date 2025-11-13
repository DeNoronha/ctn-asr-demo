/**
 * CTN Brand Colors
 * Centralized color constants for the admin portal
 *
 * Usage:
 * ```typescript
 * import { CTN_COLORS } from '../theme/colors';
 *
 * // In components
 * color: CTN_COLORS.primary.blue
 * borderColor: CTN_COLORS.accent.orange
 * ```
 */

export const CTN_COLORS = {
  // Primary brand colors
  primary: {
    blue: '#0066b3', // CTN primary blue
    blueLight: '#00a3e0', // CTN light blue
    blueDark: '#1a4d6d', // CTN dark blue
  },

  // Accent colors
  accent: {
    orange: '#ff8c00', // CTN accent orange
    green: '#85ea2d', // Success/Swagger green
  },

  // Semantic colors (aligned with Mantine theme)
  semantic: {
    success: '#10b981', // Green for success states
    warning: '#f59e0b', // Orange/yellow for warnings
    error: '#ef4444', // Red for errors
    info: '#06b6d4', // Cyan for info
  },

  // Text colors (use Mantine tokens in light-dark() instead)
  text: {
    primary: '#1e293b', // Dark gray for primary text
    secondary: '#64748b', // Medium gray for secondary text
    tertiary: '#94a3b8', // Light gray for tertiary text
    disabled: '#cbd5e1', // Disabled text
  },

  // Background colors (use Mantine tokens in light-dark() instead)
  background: {
    gray: '#f9fafb', // Light gray background
    grayDark: '#f3f4f6', // Slightly darker gray
    white: '#ffffff', // White background
  },

  // Border colors
  border: {
    light: '#e5e7eb', // Light border
    medium: '#d1d5db', // Medium border
    dark: '#9ca3af', // Dark border
  },

  // Partner/external colors
  external: {
    contargo: '#005eb8', // Contargo blue
    inlandTerminal: '#004d40', // Inland Terminal green
    vanBerkel: '#d32f2f', // Van Berkel red
  },
} as const;

/**
 * Z-index scale for layering
 * Use these instead of arbitrary z-index values
 */
export const Z_INDEX = {
  base: 0,
  dropdown: 1000,
  sticky: 1020,
  fixed: 1030,
  modalBackdrop: 1040,
  modal: 1050,
  popover: 1060,
  tooltip: 1070,
} as const;

/**
 * Type-safe color access
 */
export type CTNColor = typeof CTN_COLORS;
export type ZIndex = typeof Z_INDEX;
