/**
 * Protected Route Component
 * Ensures user is authenticated and has required role before accessing route
 */

import type React from 'react';
import { Navigate } from 'react-router-dom';
import { useAuth } from './AuthContext';
import { UserRole } from './authConfig';

interface ProtectedRouteProps {
  children: React.ReactNode;
  requiredRole?: UserRole;
  requireAdminPortalAccess?: boolean;
  requireMemberPortalAccess?: boolean;
}

export const ProtectedRoute: React.FC<ProtectedRouteProps> = ({
  children,
  requiredRole,
  requireAdminPortalAccess,
  requireMemberPortalAccess,
}) => {
  const { user, isAuthenticated, isLoading } = useAuth();

  // Show loading while checking auth
  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center">
          <div className="k-loading k-loading-lg" />
          <p className="mt-4">Verifying authentication...</p>
        </div>
      </div>
    );
  }

  // Not authenticated - redirect to login
  if (!isAuthenticated) {
    return <Navigate to="/login" replace />;
  }

  // Check MFA requirement
  if (!user?.mfaEnabled) {
    return <Navigate to="/mfa-required" replace />;
  }

  // Check specific role requirement
  if (requiredRole && !user.roles.includes(requiredRole)) {
    return <Navigate to="/unauthorized" replace />;
  }

  // Check admin portal access
  if (requireAdminPortalAccess) {
    const canAccess =
      user.roles.includes(UserRole.SYSTEM_ADMIN) || user.roles.includes(UserRole.ASSOCIATION_ADMIN);
    if (!canAccess) {
      return <Navigate to="/unauthorized" replace />;
    }
  }

  // Check member portal access
  if (requireMemberPortalAccess) {
    const canAccess =
      user.roles.includes(UserRole.MEMBER) ||
      user.roles.includes(UserRole.ASSOCIATION_ADMIN) ||
      user.roles.includes(UserRole.SYSTEM_ADMIN);
    if (!canAccess) {
      return <Navigate to="/unauthorized" replace />;
    }
  }

  return <>{children}</>;
};

/**
 * Role-Based Component Wrapper
 * Shows/hides UI elements based on user role
 */
interface RoleGuardProps {
  children: React.ReactNode;
  allowedRoles: UserRole[];
  fallback?: React.ReactNode;
}

export const RoleGuard: React.FC<RoleGuardProps> = ({
  children,
  allowedRoles,
  fallback = null,
}) => {
  const { user } = useAuth();

  if (!user) return <>{fallback}</>;

  const hasAccess = allowedRoles.some((role) => user.roles.includes(role));

  return hasAccess ? <>{children}</> : <>{fallback}</>;
};
