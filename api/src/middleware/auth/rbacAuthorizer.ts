/**
 * RBAC Authorization Middleware
 *
 * Validates user roles and permissions for access control.
 * Integrates existing RBAC logic into composable middleware pattern.
 */

import { HttpResponseInit } from '@azure/functions';
import { MiddlewareFunction, MiddlewareContext } from '../utils/middlewareTypes';
import { Permission, requirePermissions, requireRoles, UserRole } from '../rbac';

/**
 * RBAC authorizer configuration
 */
export interface RbacAuthorizerOptions {
  /** Required roles (any of these grants access) */
  requiredRoles?: UserRole[];

  /** Required permissions */
  requiredPermissions?: Permission[];

  /** Require all permissions (true) or any permission (false) */
  requireAllPermissions?: boolean;
}

/**
 * Create RBAC authorizer middleware
 *
 * Validates that authenticated user has required roles and/or permissions.
 * Returns 403 Forbidden if authorization fails.
 *
 * Note: This middleware requires authentication to have already occurred.
 * It expects context.authenticatedRequest to be populated.
 *
 * @param options RBAC configuration
 * @returns Middleware function
 *
 * @example
 * ```typescript
 * // Require specific roles
 * const adminAuth = createRbacAuthorizer({
 *   requiredRoles: [UserRole.SYSTEM_ADMIN, UserRole.ASSOCIATION_ADMIN]
 * });
 *
 * // Require specific permissions
 * const permissionAuth = createRbacAuthorizer({
 *   requiredPermissions: [Permission.MEMBER_READ],
 *   requireAllPermissions: true
 * });
 *
 * // Require both roles and permissions
 * const strictAuth = createRbacAuthorizer({
 *   requiredRoles: [UserRole.MEMBER_ADMIN],
 *   requiredPermissions: [Permission.MEMBER_WRITE],
 *   requireAllPermissions: true
 * });
 * ```
 */
export function createRbacAuthorizer(
  options: RbacAuthorizerOptions = {}
): MiddlewareFunction {
  const {
    requiredRoles,
    requiredPermissions,
    requireAllPermissions = true,
  } = options;

  return async (context: MiddlewareContext, next: () => Promise<HttpResponseInit>) => {
    const { invocationContext, requestId, authenticatedRequest } = context;

    // Ensure authentication has occurred
    if (!authenticatedRequest) {
      invocationContext.error(`[${requestId}] RBAC check failed - no authenticated request`);
      return {
        status: 401,
        headers: {
          'Content-Type': 'application/json',
          'X-Request-ID': requestId,
        },
        jsonBody: {
          error: 'unauthorized',
          error_description: 'Authentication required for authorization check',
        },
      };
    }

    // Check roles if specified
    if (requiredRoles && requiredRoles.length > 0) {
      const roleCheck = requireRoles(requiredRoles)(authenticatedRequest, invocationContext);

      if (!roleCheck.authorized && roleCheck.response) {
        const duration = Date.now() - context.startTime;
        invocationContext.warn(`[${requestId}] Authorization failed - roles (${duration}ms)`);

        return {
          ...roleCheck.response,
          headers: {
            ...(roleCheck.response.headers || {}),
            'X-Request-ID': requestId,
          },
        };
      }
    }

    // Check permissions if specified
    if (requiredPermissions && requiredPermissions.length > 0) {
      const permissionCheck = requirePermissions(
        requiredPermissions,
        requireAllPermissions
      )(authenticatedRequest, invocationContext);

      if (!permissionCheck.authorized && permissionCheck.response) {
        const duration = Date.now() - context.startTime;
        invocationContext.warn(`[${requestId}] Authorization failed - permissions (${duration}ms)`);

        return {
          ...permissionCheck.response,
          headers: {
            ...(permissionCheck.response.headers || {}),
            'X-Request-ID': requestId,
          },
        };
      }
    }

    // Authorization passed
    invocationContext.log(`[${requestId}] Authorization successful`);

    // Continue to next middleware
    return next();
  };
}

/**
 * Admin-only authorization (SystemAdmin or AssociationAdmin)
 */
export const adminAuthorizer = createRbacAuthorizer({
  requiredRoles: [UserRole.SYSTEM_ADMIN, UserRole.ASSOCIATION_ADMIN],
});

/**
 * Member authorization (any member role)
 */
export const memberAuthorizer = createRbacAuthorizer({
  requiredRoles: [
    UserRole.SYSTEM_ADMIN,
    UserRole.ASSOCIATION_ADMIN,
    UserRole.MEMBER_ADMIN,
    UserRole.MEMBER_USER,
  ],
});

/**
 * System admin only authorization
 */
export const systemAdminAuthorizer = createRbacAuthorizer({
  requiredRoles: [UserRole.SYSTEM_ADMIN],
});
