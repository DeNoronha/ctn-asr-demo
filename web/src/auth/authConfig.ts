/**
 * Azure Entra ID Authentication Configuration
 *
 * User Hierarchy:
 * 1. System Admin - Creates/manages Association Admins
 * 2. Association Admin - Manages association via Admin Portal
 * 3. Member - Self-service via Member Portal
 *
 * All users must:
 * - Register on Member Portal first
 * - Have MFA enabled
 * - Be authenticated via Azure Entra ID (cloud-based, not local files)
 */

import type { Configuration, PopupRequest } from '@azure/msal-browser';

// Azure Entra ID Configuration
export const msalConfig: Configuration = {
  auth: {
    clientId: process.env.VITE_AZURE_CLIENT_ID || '',
    authority: `https://login.microsoftonline.com/${process.env.VITE_AZURE_TENANT_ID}`,
    redirectUri: process.env.VITE_REDIRECT_URI || window.location.origin,
    postLogoutRedirectUri: window.location.origin,
  },
  cache: {
    cacheLocation: 'sessionStorage', // Use sessionStorage for security
    storeAuthStateInCookie: false, // Set to true for IE11/Edge
  },
};

// Scopes for API access
export const loginRequest: PopupRequest = {
  scopes: ['User.Read', 'openid', 'profile', 'email'],
};

// API scopes for backend calls
export const apiRequest = {
  scopes: [`api://${process.env.VITE_AZURE_CLIENT_ID}/access_as_user`],
};

// User Roles (stored in Azure Entra ID App Roles)
export enum UserRole {
  SYSTEM_ADMIN = 'SystemAdmin',
  ASSOCIATION_ADMIN = 'AssociationAdmin',
  MEMBER = 'Member',
}

// Role hierarchy (for permission checks)
export const roleHierarchy: Record<UserRole, number> = {
  [UserRole.SYSTEM_ADMIN]: 3,
  [UserRole.ASSOCIATION_ADMIN]: 2,
  [UserRole.MEMBER]: 1,
};

// Portal access control
export const portalAccess = {
  adminPortal: [UserRole.SYSTEM_ADMIN, UserRole.ASSOCIATION_ADMIN],
  memberPortal: [UserRole.MEMBER, UserRole.ASSOCIATION_ADMIN], // Admins can view member portal
};

// MFA Policy
export const mfaPolicy = {
  required: true,
  enforcementMessage: 'Multi-factor authentication is required for all users.',
};
