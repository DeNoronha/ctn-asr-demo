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

  // Configure axios to automatically add JWT tokens
  useEffect(() => {
    const interceptor = axios.interceptors.request.use(
      async (config: any) => {
        if (user) {
          try {
            const token = await getAccessToken();
            if (!config.headers) {
              config.headers = {};
            }
            config.headers.Authorization = `Bearer ${token}`;
          } catch (error) {
            console.error('Failed to get access token:', error);
          }
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

      // If no roles, assign default FreightForwarder role for now
      // TODO: Implement proper role assignment in Azure AD
      const userRoles = roles.length > 0 ? roles : [UserRole.FREIGHT_FORWARDER];

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
        scopes: ['User.Read', 'openid', 'profile', 'email'],
        prompt: 'select_account',
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
      const account = user?.account || msalInstance.getAllAccounts()[0];
      if (!account) {
        throw new Error('No active account');
      }

      // Try silent token acquisition first
      const response = await msalInstance.acquireTokenSilent({
        ...apiRequest,
        account,
      });

      return response.accessToken;
    } catch (error) {
      if (error instanceof InteractionRequiredAuthError) {
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
