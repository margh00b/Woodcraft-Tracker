/**
 * Centralized Theme Constants
 * All colors and gradients used across the application
 */

// ============================================
// Color Primitives
// ============================================
export const colors = {
  violet: {
    primary: "#4A00E0",
    secondary: "#8E2DE2",
    light: "#6C63FF",
    lighter: "#7b2de2",
  },
  blue: {
    primary: "#0066cc",
    secondary: "#4da0ff",
  },
  green: {
    primary: "#218838",
    secondary: "#28a745",
    success: "#009c2f",
  },
  red: {
    primary: "#FF3B3B",
    secondary: "#FF6B6B",
  },
  orange: {
    primary: "#FF9966",
    secondary: "#FF5E62",
  },
  gray: {
    border: "#dee2e6",
    borderLight: "#e9ecef",
    background: "#f8f9fa",
    backgroundAlt: "#f1f3f5",
    title: "#343a40",
    rowAlt: "#e0e0e0",
  },
} as const;

// ============================================
// Mantine Gradient Objects
// For use with Mantine's gradient prop
// ============================================
export const gradients = {
  primary: {
    from: colors.violet.secondary,
    to: colors.violet.primary,
    deg: 135,
  },
  primaryVertical: {
    from: colors.violet.lighter,
    to: colors.violet.primary,
    deg: 0,
  },
  primary90: {
    from: colors.violet.secondary,
    to: colors.violet.primary,
    deg: 90,
  },
  service: { from: colors.blue.secondary, to: colors.blue.primary, deg: 135 },
  success: { from: colors.green.secondary, to: colors.green.primary, deg: 135 },
  danger: { from: colors.red.secondary, to: colors.red.primary, deg: 135 },
  backorder: {
    from: colors.orange.secondary,
    to: colors.orange.primary,
    deg: 135,
  },
  inactive: { from: colors.gray.borderLight, to: colors.gray.border, deg: 135 },
} as const;

// ============================================
// CSS Linear Gradient Strings
// For use in inline styles
// ============================================
export const linearGradients = {
  primary: `linear-gradient(135deg, ${colors.violet.secondary} 0%, ${colors.violet.primary} 100%)`,
  primaryVertical: `linear-gradient(0deg, ${colors.violet.lighter} 20%, ${colors.violet.primary} 80%)`,
  service: `linear-gradient(135deg, ${colors.blue.secondary} 0%, ${colors.blue.primary} 100%)`,
  success: `linear-gradient(135deg, ${colors.green.secondary} 0%, ${colors.green.primary} 100%)`,
  danger: `linear-gradient(135deg, ${colors.red.secondary} 0%, ${colors.red.primary} 100%)`,
  backorder: `linear-gradient(135deg, ${colors.orange.secondary} 0%, ${colors.orange.primary} 100%)`,
  inactive: `linear-gradient(135deg, ${colors.gray.borderLight} 0%, ${colors.gray.border} 100%)`,
  lightViolet: `linear-gradient(135deg, #f0edff 0%, #e4dbff 100%)`,
  pageBackground: `linear-gradient(135deg, #DDE6F5 0%, #E7D9F0 100%)`,
} as const;

// ============================================
// Service Order Status Gradients
// ============================================
export const serviceStatusGradients = {
  ALL: `linear-gradient(135deg, ${colors.violet.light} 0%, ${colors.violet.primary} 100%)`,
  OPEN: `linear-gradient(135deg, ${colors.blue.secondary} 0%, ${colors.blue.primary} 100%)`,
  COMPLETED: `linear-gradient(135deg, #3ac47d 0%, #0f9f4f 100%)`,
} as const;

export const serviceStatusGradientsLight = {
  ALL: `linear-gradient(135deg, #e4d9ff 0%, #d7caff 100%)`,
  OPEN: `linear-gradient(135deg, #d7e9ff 0%, #c2ddff 100%)`,
  COMPLETED: `linear-gradient(135deg, #d0f2e1 0%, #b9ebd3 100%)`,
} as const;
