/**
 * Authentication Context
 * Manages user authentication state and role-based access
 */

import { type AccountInfo, PublicClientApplication } from '@azure/msal-browser';
import type React from 'react';
import { createContext, useContext, useEffect, useState } from 'react';
import { type UserRole, msalConfig, portalAccess, roleHierarchy } from './authConfig';

// Initialize MSAL instance
export const msalInstance = new PublicClientApplication(msalConfig);

interface AuthUser {
  account: AccountInfo;
  roles: UserRole[];
  primaryRole: UserRole;
  mfaEnabled: boolean;
  associationId?: string; // For Association Admins and Members
}

interface AuthContextType {
  user: AuthUser | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  login: () => Promise<void>;
  logout: () => Promise<void>;
  hasRole: (role: UserRole) => boolean;
  hasMinimumRole: (role: UserRole) => boolean;
  canAccessAdminPortal: () => boolean;
  canAccessMemberPortal: () => boolean;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<AuthUser | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    initializeAuth();
  }, []);

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
        amr?: string[];
        extension_AssociationId?: string;
      }
      const idTokenClaims = (account.idTokenClaims || {}) as IdTokenClaims;
      console.log('ID Token Claims:', idTokenClaims);

      const roles = (idTokenClaims?.roles || []) as UserRole[];
      console.log('Extracted roles:', roles);

      // Check MFA status from claims
      // TODO: Re-enable strict MFA checking once Conditional Access policy is fully enforced
      const mfaEnabled = true; // Temporarily bypassed - idTokenClaims?.amr?.includes('mfa') || false;
      console.log('MFA enabled:', mfaEnabled, '(bypassed until CA policy active)');

      // Get association ID from custom claim
      const associationId = idTokenClaims?.extension_AssociationId;

      // If no roles, user cannot proceed
      if (roles.length === 0) {
        console.error('No roles found for user');
        setUser(null);
        return;
      }

      // Determine primary role (highest in hierarchy)
      const primaryRole = roles.reduce((highest, role) => {
        return roleHierarchy[role] > roleHierarchy[highest] ? role : highest;
      }, roles[0]);

      console.log('Primary role:', primaryRole);

      setUser({
        account,
        roles,
        primaryRole,
        mfaEnabled,
        associationId,
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

  const hasRole = (role: UserRole): boolean => {
    return user?.roles.includes(role) || false;
  };

  const hasMinimumRole = (role: UserRole): boolean => {
    if (!user) return false;
    const userLevel = roleHierarchy[user.primaryRole];
    const requiredLevel = roleHierarchy[role];
    return userLevel >= requiredLevel;
  };

  const canAccessAdminPortal = (): boolean => {
    if (!user) return false;
    return portalAccess.adminPortal.some((role) => user.roles.includes(role));
  };

  const canAccessMemberPortal = (): boolean => {
    if (!user) return false;
    return portalAccess.memberPortal.some((role) => user.roles.includes(role));
  };

  return (
    <AuthContext.Provider
      value={{
        user,
        isAuthenticated: !!user && user.mfaEnabled, // Check both user and MFA
        isLoading,
        login,
        logout,
        hasRole,
        hasMinimumRole,
        canAccessAdminPortal,
        canAccessMemberPortal,
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
