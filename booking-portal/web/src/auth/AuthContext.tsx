/**
 * Authentication Context
 * Manages user authentication state and provides JWT tokens for API calls
 */

import { type AccountInfo, PublicClientApplication, InteractionRequiredAuthError } from '@azure/msal-browser';
import type React from 'react';
import { createContext, useContext, useEffect, useState } from 'react';
import { UserRole, msalConfig, apiRequest, roleHierarchy } from './authConfig';
import axios from 'axios';

// Initialize MSAL instance
export const msalInstance = new PublicClientApplication(msalConfig);

interface AuthUser {
  account: AccountInfo;
  roles: UserRole[];
  primaryRole: UserRole;
  email: string;
  name: string;
  tenantId?: string; // Organization/Terminal ID
}

interface AuthContextType {
  user: AuthUser | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  login: () => Promise<void>;
  logout: () => Promise<void>;
  getAccessToken: () => Promise<string>;
  hasRole: (role: UserRole) => boolean;
  hasMinimumRole: (role: UserRole) => boolean;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<AuthUser | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    initializeAuth();
  }, []);

  // Configure axios to automatically add JWT tokens and use API base URL
  useEffect(() => {
    const interceptor = axios.interceptors.request.use(
      async (config: any) => {
        // Set base URL for API calls
        const apiUrl = import.meta.env.VITE_API_URL || 'https://func-ctn-booking-prod.azurewebsites.net';
        if (config.url?.startsWith('/api/')) {
          config.url = `${apiUrl}${config.url}`;
        }

        if (user) {
          try {
            console.log('Acquiring access token for API...');
            const token = await getAccessToken();
            console.log('Access token acquired successfully');
            if (!config.headers) {
              config.headers = {};
            }
            config.headers.Authorization = `Bearer ${token}`;
          } catch (error) {
            console.error('Failed to get access token:', error);
            throw error; // Re-throw to prevent request without token
          }
        } else {
          console.warn('No user logged in, skipping token acquisition');
        }
        return config;
      },
      (error) => Promise.reject(error)
    );

    return () => {
      axios.interceptors.request.eject(interceptor);
    };
  }, [user]);

  const initializeAuth = async () => {
    try {
      await msalInstance.initialize();

      // Handle redirect response
      const response = await msalInstance.handleRedirectPromise();
      if (response?.account) {
        await loadUserRoles(response.account);
      } else {
        const accounts = msalInstance.getAllAccounts();
        if (accounts.length > 0) {
          await loadUserRoles(accounts[0]);
        }
      }
    } catch (error) {
      console.error('Auth initialization error:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const loadUserRoles = async (account: AccountInfo) => {
    try {
      console.log('Loading user roles for account:', account);

      // Extract roles from ID token claims
      interface IdTokenClaims extends Record<string, unknown> {
        roles?: UserRole[];
        extension_TenantId?: string;
        preferred_username?: string;
        name?: string;
      }
      const idTokenClaims = (account.idTokenClaims || {}) as IdTokenClaims;
      console.log('ID Token Claims:', idTokenClaims);

      const roles = (idTokenClaims?.roles || []) as UserRole[];
      console.log('Extracted roles:', roles);

      // Get tenant ID from custom claim
      const tenantId = idTokenClaims?.extension_TenantId;
      const email = idTokenClaims?.preferred_username || account.username;
      const name = idTokenClaims?.name || account.name || '';

      // If no roles, user cannot access the portal
      if (roles.length === 0) {
        console.error('No roles found for user - access denied');
        setUser(null);
        return;
      }

      const userRoles = roles;

      // Determine primary role (highest in hierarchy)
      const primaryRole = userRoles.reduce((highest, role) => {
        return roleHierarchy[role] > roleHierarchy[highest] ? role : highest;
      }, userRoles[0]);

      console.log('Primary role:', primaryRole);

      setUser({
        account,
        roles: userRoles,
        primaryRole,
        email,
        name,
        tenantId,
      });

      console.log('User loaded successfully');
    } catch (error) {
      console.error('Error loading user roles:', error);
      setUser(null);
    }
  };

  const login = async () => {
    try {
      setIsLoading(true);
      await msalInstance.loginRedirect({
        scopes: [
          'User.Read',
          'openid',
          'profile',
          'email',
          `api://${msalConfig.auth.clientId}/access_as_user`
        ],
      });
    } catch (error) {
      console.error('Login error:', error);
      setIsLoading(false);
      throw error;
    }
  };

  const logout = async () => {
    try {
      setIsLoading(true);
      await msalInstance.logoutRedirect();
      setUser(null);
    } catch (error) {
      console.error('Logout error:', error);
      throw error;
    } finally {
      setIsLoading(false);
    }
  };

  const getAccessToken = async (): Promise<string> => {
    try {
      console.log('[Auth] Getting access token...');
      console.log('[Auth] User object:', user);
      console.log('[Auth] API Request scopes:', apiRequest);

      const account = user?.account || msalInstance.getAllAccounts()[0];
      console.log('[Auth] Account:', account);

      if (!account) {
        throw new Error('No active account');
      }

      // Try silent token acquisition first
      console.log('[Auth] Attempting silent token acquisition...');
      const response = await msalInstance.acquireTokenSilent({
        ...apiRequest,
        account,
      });

      console.log('[Auth] Token acquired successfully!');
      console.log('[Auth] Token scopes:', response.scopes);
      console.log('[Auth] Token expires:', new Date(response.expiresOn!));

      // Decode and log token claims for debugging
      const tokenParts = response.accessToken.split('.');
      if (tokenParts.length === 3) {
        const payload = JSON.parse(atob(tokenParts[1]));
        console.log('[Auth] Token claims:', payload);
      }

      return response.accessToken;
    } catch (error: any) {
      console.error('[Auth] Token acquisition failed:', error);
      console.error('[Auth] Error name:', error.name);
      console.error('[Auth] Error message:', error.message);

      if (error instanceof InteractionRequiredAuthError) {
        console.log('[Auth] Interaction required, redirecting...');
        // Fallback to interactive method
        await msalInstance.acquireTokenRedirect({
          ...apiRequest,
          account: user?.account,
        });
        throw new Error('Token acquisition requires redirect');
      }
      throw error;
    }
  };

  const hasRole = (role: UserRole): boolean => {
    return user?.roles.includes(role) || false;
  };

  const hasMinimumRole = (role: UserRole): boolean => {
    if (!user) return false;
    const userLevel = roleHierarchy[user.primaryRole];
    const requiredLevel = roleHierarchy[role];
    return userLevel >= requiredLevel;
  };

  return (
    <AuthContext.Provider
      value={{
        user,
        isAuthenticated: !!user,
        isLoading,
        login,
        logout,
        getAccessToken,
        hasRole,
        hasMinimumRole,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within AuthProvider');
  }
  return context;
};
