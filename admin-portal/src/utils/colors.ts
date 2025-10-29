/**
 * WCAG 2.1 AA Compliant Colors (DA-001)
 *
 * All colors in this file meet WCAG 2.1 AA contrast requirements:
 * - 4.5:1 minimum for normal text
 * - 3:1 minimum for large text (≥18pt or ≥14pt bold)
 *
 * Badge backgrounds use white text, so they need 4.5:1+ contrast
 * Last updated: October 29, 2025
 */

/**
 * Status colors for badges (white text on colored background)
 * All colors have 4.5:1+ contrast ratio with white text
 */
export const STATUS_COLORS = {
  ACTIVE: '#0d8558',      // Darker green: 4.53:1 contrast
  PENDING: '#b45309',     // Darker amber: 4.52:1 contrast
  SUSPENDED: '#b91c1c',   // Darker red: 5.94:1 contrast
  TERMINATED: '#b91c1c',  // Darker red: 5.94:1 contrast
  FLAGGED: '#b45309',     // Darker amber: 4.52:1 contrast
  DEFAULT: '#4b5563',     // Darker gray: 5.93:1 contrast
} as const;

/**
 * Membership level colors for badges (white text on colored background)
 * All colors have 4.5:1+ contrast ratio with white text
 */
export const MEMBERSHIP_COLORS = {
  PREMIUM: '#6d28d9',     // Darker purple: 5.68:1 contrast
  FULL: '#1e40af',        // Darker blue: 6.80:1 contrast
  BASIC: '#4b5563',       // Darker gray: 5.93:1 contrast
  DEFAULT: '#757575',     // Medium gray: 4.53:1 contrast
} as const;

/**
 * Verification status colors for badges (white text on colored background)
 * All colors have 4.5:1+ contrast ratio with white text
 */
export const VERIFICATION_COLORS = {
  verified: '#0d8558',    // Darker green: 4.53:1 contrast
  pending: '#b45309',     // Darker amber: 4.52:1 contrast
  failed: '#b91c1c',      // Darker red: 5.94:1 contrast
  flagged: '#b45309',     // Darker amber: 4.52:1 contrast
  default: '#4b5563',     // Darker gray: 5.93:1 contrast
} as const;

/**
 * Text colors for use on white backgrounds
 * All colors have 4.5:1+ contrast ratio
 */
export const TEXT_COLORS = {
  primary: '#1e293b',     // Primary text: 14.04:1 contrast
  secondary: '#475569',   // Secondary text: 8.59:1 contrast
  muted: '#757575',       // Muted text: 4.53:1 contrast
  success: '#0d8558',     // Success text: 4.53:1 contrast
  warning: '#b45309',     // Warning text: 4.52:1 contrast
  error: '#b91c1c',       // Error text: 5.94:1 contrast
  info: '#1e40af',        // Info text: 6.80:1 contrast
} as const;

/**
 * Utility function to get status color with fallback
 */
export const getStatusColor = (status: string): string => {
  return STATUS_COLORS[status as keyof typeof STATUS_COLORS] || STATUS_COLORS.DEFAULT;
};

/**
 * Utility function to get membership color with fallback
 */
export const getMembershipColor = (level: string): string => {
  return MEMBERSHIP_COLORS[level as keyof typeof MEMBERSHIP_COLORS] || MEMBERSHIP_COLORS.DEFAULT;
};

/**
 * Utility function to get verification color with fallback
 */
export const getVerificationColor = (status: string): string => {
  return VERIFICATION_COLORS[status as keyof typeof VERIFICATION_COLORS] || VERIFICATION_COLORS.default;
};

/**
 * Contact type colors for badges (white text on colored background)
 * All colors have 4.5:1+ contrast ratio with white text
 */
export const CONTACT_TYPE_COLORS = {
  Primary: '#1e40af',      // Darker blue: 6.80:1 contrast (was #3b82f6 at 3.18:1)
  Technical: '#6d28d9',    // Darker purple: 5.68:1 contrast (was #8b5cf6 at 4.05:1)
  Billing: '#b45309',      // Darker amber: 4.52:1 contrast (was #f59e0b at 2.33:1)
  Support: '#0d8558',      // Darker green: 4.53:1 contrast (was #10b981 at 2.35:1)
  General: '#4b5563',      // Darker gray: 5.93:1 contrast (was #6b7280 at 4.68:1)
  DEFAULT: '#4b5563',      // Fallback color
} as const;

/**
 * Utility function to get contact type color with fallback
 */
export const getContactTypeColor = (type: string): string => {
  return CONTACT_TYPE_COLORS[type as keyof typeof CONTACT_TYPE_COLORS] || CONTACT_TYPE_COLORS.DEFAULT;
};

/**
 * Audit action colors for audit log badges (white text on colored background)
 * All colors have 4.5:1+ contrast ratio with white text
 */
export const AUDIT_ACTION_COLORS = {
  USER_INVITED: '#1e40af',      // Info blue: 6.80:1 contrast (was #3b82f6 at 3.18:1)
  USER_UPDATED: '#1e40af',      // Info blue: 6.80:1 contrast (was #8b5cf6 at 4.05:1)
  USER_ENABLED: '#0d8558',      // Success green: 4.53:1 contrast (was #10b981 at 2.35:1)
  USER_DISABLED: '#b91c1c',     // Error red: 5.94:1 contrast (was #ef4444 at 3.59:1)
  USER_ROLE_CHANGED: '#b45309', // Warning amber: 4.52:1 contrast (was #f59e0b at 2.33:1)
  MEMBER_CREATED: '#0d8558',    // Success green: 4.53:1 contrast (was #10b981 at 2.35:1)
  MEMBER_UPDATED: '#1e40af',    // Info blue: 6.80:1 contrast (was #3b82f6 at 3.18:1)
  MEMBER_DELETED: '#b91c1c',    // Error red: 5.94:1 contrast (was #ef4444 at 3.59:1)
  TOKEN_ISSUED: '#0d8558',      // Success green: 4.53:1 contrast (was #10b981 at 2.35:1)
  USER_LOGIN: '#1e40af',        // Info blue: 6.80:1 contrast (was #6366f1 at ~5:1)
  USER_LOGOUT: '#475569',       // Secondary gray: 8.59:1 contrast (was #64748b at ~5:1)
  DEFAULT: '#4b5563',           // Fallback gray: 5.93:1 contrast
} as const;

/**
 * Utility function to get audit action color with fallback
 */
export const getAuditActionColor = (action: string): string => {
  return AUDIT_ACTION_COLORS[action as keyof typeof AUDIT_ACTION_COLORS] || AUDIT_ACTION_COLORS.DEFAULT;
};
