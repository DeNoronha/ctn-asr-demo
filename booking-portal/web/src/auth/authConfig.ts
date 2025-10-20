/**
 * Azure Entra ID Authentication Configuration
 * Booking Portal - Terminal operators and freight forwarders
 */

import type { Configuration, PopupRequest } from '@azure/msal-browser';

// Azure Entra ID Configuration
export const msalConfig: Configuration = {
  auth: {
    clientId: import.meta.env.VITE_AZURE_CLIENT_ID || 'd3037c11-a541-4f21-8862-8079137a0cde',
    authority: `https://login.microsoftonline.com/${import.meta.env.VITE_AZURE_TENANT_ID || '598664e7-725c-4daa-bd1f-89c4ada717ff'}`,
    redirectUri: import.meta.env.VITE_REDIRECT_URI || window.location.origin,
    postLogoutRedirectUri: window.location.origin,
  },
  cache: {
    cacheLocation: 'sessionStorage',
    storeAuthStateInCookie: false,
  },
};

// Scopes for API access
export const loginRequest: PopupRequest = {
  scopes: ['User.Read', 'openid', 'profile', 'email'],
};

// API scopes for backend calls
export const apiRequest = {
  scopes: [`api://${import.meta.env.VITE_AZURE_CLIENT_ID || 'd3037c11-a541-4f21-8862-8079137a0cde'}/access_as_user`],
};

// User Roles for Booking Portal
// Using SystemAdmin role from CTN Association Register app
export enum UserRole {
  SYSTEM_ADMIN = 'SystemAdmin',
  TERMINAL_OPERATOR = 'TerminalOperator',
  FREIGHT_FORWARDER = 'FreightForwarder',
}

// Role hierarchy (for permission checks)
export const roleHierarchy: Record<UserRole, number> = {
  [UserRole.SYSTEM_ADMIN]: 3,
  [UserRole.TERMINAL_OPERATOR]: 2,
  [UserRole.FREIGHT_FORWARDER]: 1,
};
