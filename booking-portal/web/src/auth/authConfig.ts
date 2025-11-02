/**
 * Azure Entra ID Authentication Configuration
 * Booking Portal - Terminal operators and freight forwarders
 */

import type { Configuration, PopupRequest } from '@azure/msal-browser';

// Validate required environment variables at startup
const requiredEnvVars = {
  VITE_AZURE_CLIENT_ID: import.meta.env.VITE_AZURE_CLIENT_ID,
  VITE_AZURE_TENANT_ID: import.meta.env.VITE_AZURE_TENANT_ID,
};

// Check for missing environment variables
const missingVars = Object.entries(requiredEnvVars)
  .filter(([, value]) => !value)
  .map(([key]) => key);

if (missingVars.length > 0) {
  throw new Error(
    `Missing required environment variables: ${missingVars.join(', ')}. ` +
    'Please check your .env file and ensure all required variables are set.'
  );
}

// Azure Entra ID Configuration
export const msalConfig: Configuration = {
  auth: {
    clientId: import.meta.env.VITE_AZURE_CLIENT_ID,
    authority: `https://login.microsoftonline.com/${import.meta.env.VITE_AZURE_TENANT_ID}`,
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
  scopes: [`api://${import.meta.env.VITE_AZURE_CLIENT_ID}/access_as_user`],
};

// User Roles for Booking Portal
// Using System Admin role from CTN Association Register app (note the space)
export enum UserRole {
  SYSTEM_ADMIN = 'System Admin',
  TERMINAL_OPERATOR = 'TerminalOperator',
  FREIGHT_FORWARDER = 'FreightForwarder',
}

// Role hierarchy (for permission checks)
export const roleHierarchy: Record<UserRole, number> = {
  [UserRole.SYSTEM_ADMIN]: 3,
  [UserRole.TERMINAL_OPERATOR]: 2,
  [UserRole.FREIGHT_FORWARDER]: 1,
};
