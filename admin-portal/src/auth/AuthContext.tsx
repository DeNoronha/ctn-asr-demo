/**
 * Authentication Context
 * Manages user authentication state and role-based access
 */

import { type AccountInfo, PublicClientApplication } from '@azure/msal-browser';
import type React from 'react';
import { createContext, useContext, useEffect, useState } from 'react';
import { csrfService } from '../services/csrfService';
import { logger } from '../utils/logger';
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
  const [lastActivity, setLastActivity] = useState<number>(Date.now());
  const [showIdleWarning, setShowIdleWarning] = useState(false);

  // Session configuration (SEC-002)
  const IDLE_TIMEOUT_MS = 30 * 60 * 1000; // 30 minutes
  const IDLE_WARNING_MS = 28 * 60 * 1000; // Warning at 28 minutes
  const TOKEN_REFRESH_BEFORE_EXPIRY_MS = 5 * 60 * 1000; // Refresh 5 minutes before expiry

  useEffect(() => {
    initializeAuth();
  }, []);

  // SEC-002: Track user activity for idle timeout
  useEffect(() => {
    const events = ['mousedown', 'keydown', 'scroll', 'touchstart'];

    const updateActivity = () => {
      setLastActivity(Date.now());
      setShowIdleWarning(false);
    };

    events.forEach((event) => window.addEventListener(event, updateActivity));

    return () => {
      events.forEach((event) => window.removeEventListener(event, updateActivity));
    };
  }, []);

  // SEC-002 & SEC-003: Check for idle timeout and token expiration
  useEffect(() => {
    if (!user) return;

    const interval = setInterval(async () => {
      const now = Date.now();
      const idleTime = now - lastActivity;

      // Check if user has been idle for too long
      if (idleTime >= IDLE_TIMEOUT_MS) {
        logger.warn('Session timeout: User idle for 30 minutes');
        await logout();
        return;
      }

      // Show warning at 28 minutes
      if (idleTime >= IDLE_WARNING_MS && !showIdleWarning) {
        setShowIdleWarning(true);
        logger.warn('Idle timeout warning: 2 minutes remaining');
      }

      // SEC-001 & SEC-003: Check token expiration
      try {
        const account = msalInstance.getAllAccounts()[0];
        if (account?.idTokenClaims?.exp) {
          const expiryTime = (account.idTokenClaims.exp as number) * 1000; // Convert to ms
          const timeUntilExpiry = expiryTime - now;

          // Force logout if token expired (SEC-003)
          if (timeUntilExpiry <= 0) {
            logger.warn('Token expired: Forcing logout');
            await logout();
            return;
          }

          // Refresh token if expiring soon (SEC-001)
          if (timeUntilExpiry <= TOKEN_REFRESH_BEFORE_EXPIRY_MS) {
            logger.log('Token expiring soon: Attempting silent refresh');
            try {
              await msalInstance.acquireTokenSilent({
                scopes: ['User.Read', 'openid', 'profile', 'email'],
                account,
                forceRefresh: true,
              });
              // Rotate CSRF token on successful refresh (SEC-004)
              csrfService.generateToken();
              logger.log('Token refreshed successfully, CSRF token rotated');
            } catch (refreshError) {
              logger.error('Token refresh failed:', refreshError);
              // Force logout if refresh fails
              await logout();
            }
          }
        }
      } catch (error) {
        logger.error('Error checking token expiration:', error);
      }
    }, 60000); // Check every minute

    return () => clearInterval(interval);
  }, [user, lastActivity, showIdleWarning]);

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
      logger.error('Auth initialization error:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const loadUserRoles = async (account: AccountInfo) => {
    try {
      console.error('🔍 AUTH DEBUG: Loading user roles for account:', account);
      logger.log('Loading user roles for account:', account);

      // Extract roles from ID token claims
      interface IdTokenClaims extends Record<string, unknown> {
        roles?: UserRole[];
        amr?: string[];
        extension_AssociationId?: string;
      }
      const idTokenClaims = (account.idTokenClaims || {}) as IdTokenClaims;
      console.error('🔍 AUTH DEBUG: ID Token Claims:', JSON.stringify(idTokenClaims, null, 2));
      logger.log('ID Token Claims:', idTokenClaims);

      const roles = (idTokenClaims?.roles || []) as UserRole[];
      console.error('🔍 AUTH DEBUG: Extracted roles:', roles);
      logger.log('Extracted roles:', roles);

      // Check MFA status from claims
      // Can be disabled via VITE_REQUIRE_MFA=false for development/testing
      const requireMFA = import.meta.env.VITE_REQUIRE_MFA !== 'false';
      const mfaClaim = idTokenClaims?.amr?.includes('mfa') || false;
      const mfaEnabled = requireMFA ? mfaClaim : true;

      console.error(
        '🔍 AUTH DEBUG: MFA enforcement:',
        requireMFA ? 'ENABLED' : 'DISABLED (dev mode)'
      );
      console.error('🔍 AUTH DEBUG: MFA claim present:', mfaClaim);
      console.error('🔍 AUTH DEBUG: MFA check result:', mfaEnabled);
      logger.log('MFA enforcement:', requireMFA ? 'ENABLED' : 'DISABLED (dev mode)');
      logger.log('MFA claim present:', mfaClaim);
      logger.log('MFA check result:', mfaEnabled);

      // Get association ID from custom claim
      const associationId = idTokenClaims?.extension_AssociationId;

      // If no roles, user cannot proceed
      if (roles.length === 0) {
        console.error('❌ AUTH DEBUG: No roles found for user - will redirect to login');
        logger.error('No roles found for user');
        setUser(null);
        return;
      }
      console.error('✅ AUTH DEBUG: Roles found, proceeding with authentication');

      // Determine primary role (highest in hierarchy)
      const primaryRole = roles.reduce((highest, role) => {
        return roleHierarchy[role] > roleHierarchy[highest] ? role : highest;
      }, roles[0]);

      logger.log('Primary role:', primaryRole);

      setUser({
        account,
        roles,
        primaryRole,
        mfaEnabled,
        associationId,
      });

      // Generate CSRF token for secure API requests (SEC-004)
      csrfService.generateToken();
      logger.log('User loaded successfully, CSRF token generated');
    } catch (error) {
      logger.error('Error loading user roles:', error);
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
      logger.error('Login error:', error);
      setIsLoading(false);
      throw error;
    }
  };

  const logout = async () => {
    try {
      setIsLoading(true);
      // Clear CSRF token (SEC-004)
      csrfService.clearToken();
      await msalInstance.logoutRedirect();
      setUser(null);
    } catch (error) {
      logger.error('Logout error:', error);
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
