// ========================================
// Role-Based Access Control (RBAC) Middleware
// ========================================
// Enforces role and permission requirements on API endpoints

import { InvocationContext } from '@azure/functions';
import { AuthenticatedRequest } from './auth';

/**
 * User roles in the system
 */
export enum UserRole {
  SYSTEM_ADMIN = 'SystemAdmin', // Full system access
  ASSOCIATION_ADMIN = 'AssociationAdmin', // CTN administrative access
  MEMBER_ADMIN = 'MemberAdmin', // Organization admin
  MEMBER_USER = 'MemberUser', // Regular member user
  MEMBER_READONLY = 'MemberReadOnly', // Read-only member access
}

/**
 * Permissions that can be checked
 */
export enum Permission {
  // Legal Entity permissions
  READ_ALL_ENTITIES = 'read:all_entities',
  READ_OWN_ENTITY = 'read:own_entity',
  UPDATE_ALL_ENTITIES = 'update:all_entities',
  UPDATE_OWN_ENTITY = 'update:own_entity',
  DELETE_ENTITIES = 'delete:entities',
  CREATE_ENTITIES = 'create:entities',

  // Endpoint permissions
  MANAGE_ALL_ENDPOINTS = 'manage:all_endpoints',
  MANAGE_OWN_ENDPOINTS = 'manage:own_endpoints',
  READ_ALL_ENDPOINTS = 'read:all_endpoints',
  READ_OWN_ENDPOINTS = 'read:own_endpoints',

  // Token permissions
  ISSUE_TOKENS = 'issue:tokens',
  REVOKE_TOKENS = 'revoke:tokens',
  VIEW_ALL_TOKENS = 'view:all_tokens',
  VIEW_OWN_TOKENS = 'view:own_tokens',

  // Admin permissions
  MANAGE_USERS = 'manage:users',
  VIEW_AUDIT_LOGS = 'view:audit_logs',
  MANAGE_SUBSCRIPTIONS = 'manage:subscriptions',
  MANAGE_NEWSLETTERS = 'manage:newsletters',
  MANAGE_TASKS = 'manage:tasks',

  // KvK verification permissions
  UPLOAD_KVK_DOCUMENTS = 'upload:kvk_documents',
  REVIEW_KVK_DOCUMENTS = 'review:kvk_documents',
}

/**
 * Role to permissions mapping
 */
const ROLE_PERMISSIONS: Record<UserRole, Permission[]> = {
  [UserRole.SYSTEM_ADMIN]: [
    // System admins have all permissions
    ...Object.values(Permission),
  ],

  [UserRole.ASSOCIATION_ADMIN]: [
    // Read and manage all entities
    Permission.READ_ALL_ENTITIES,
    Permission.UPDATE_ALL_ENTITIES,
    Permission.CREATE_ENTITIES,
    Permission.DELETE_ENTITIES,

    // Manage all endpoints
    Permission.MANAGE_ALL_ENDPOINTS,
    Permission.READ_ALL_ENDPOINTS,

    // Token management
    Permission.ISSUE_TOKENS,
    Permission.REVOKE_TOKENS,
    Permission.VIEW_ALL_TOKENS,

    // Admin functions
    Permission.MANAGE_USERS,
    Permission.VIEW_AUDIT_LOGS,
    Permission.MANAGE_SUBSCRIPTIONS,
    Permission.MANAGE_NEWSLETTERS,
    Permission.MANAGE_TASKS,

    // KvK verification
    Permission.REVIEW_KVK_DOCUMENTS,
  ],

  [UserRole.MEMBER_ADMIN]: [
    // Own entity management
    Permission.READ_OWN_ENTITY,
    Permission.UPDATE_OWN_ENTITY,

    // Own endpoint management
    Permission.MANAGE_OWN_ENDPOINTS,
    Permission.READ_OWN_ENDPOINTS,

    // Own token management
    Permission.ISSUE_TOKENS,
    Permission.VIEW_OWN_TOKENS,

    // KvK uploads
    Permission.UPLOAD_KVK_DOCUMENTS,
  ],

  [UserRole.MEMBER_USER]: [
    // Read own entity
    Permission.READ_OWN_ENTITY,

    // Read own endpoints
    Permission.READ_OWN_ENDPOINTS,

    // View own tokens
    Permission.VIEW_OWN_TOKENS,
  ],

  [UserRole.MEMBER_READONLY]: [
    // Read-only access
    Permission.READ_OWN_ENTITY,
    Permission.READ_OWN_ENDPOINTS,
    Permission.VIEW_OWN_TOKENS,
  ],
};

/**
 * Check if user has a specific role
 */
export function hasRole(request: AuthenticatedRequest, role: UserRole): boolean {
  if (!request.user || !request.userRoles) {
    return false;
  }

  return request.userRoles.includes(role);
}

/**
 * Check if user has any of the specified roles
 */
export function hasAnyRole(request: AuthenticatedRequest, roles: UserRole[]): boolean {
  if (!request.user || !request.userRoles) {
    return false;
  }

  return roles.some((role) => request.userRoles!.includes(role));
}

/**
 * Check if user has a specific permission
 */
export function hasPermission(request: AuthenticatedRequest, permission: Permission): boolean {
  if (!request.user || !request.userRoles) {
    return false;
  }

  // Check all user roles for the permission
  for (const userRole of request.userRoles) {
    const roleEnum = userRole as UserRole;
    const rolePermissions = ROLE_PERMISSIONS[roleEnum];

    if (rolePermissions && rolePermissions.includes(permission)) {
      return true;
    }
  }

  return false;
}

/**
 * Check if user has all specified permissions
 */
export function hasAllPermissions(
  request: AuthenticatedRequest,
  permissions: Permission[]
): boolean {
  return permissions.every((permission) => hasPermission(request, permission));
}

/**
 * Check if user has any of the specified permissions
 */
export function hasAnyPermission(
  request: AuthenticatedRequest,
  permissions: Permission[]
): boolean {
  return permissions.some((permission) => hasPermission(request, permission));
}

/**
 * RBAC middleware - require specific roles
 */
export function requireRoles(
  roles: UserRole[]
): (request: AuthenticatedRequest, context: InvocationContext) => { authorized: boolean; response?: any } {
  return (request: AuthenticatedRequest, context: InvocationContext) => {
    if (!request.user) {
      context.warn('RBAC check failed: User not authenticated');
      return {
        authorized: false,
        response: {
          status: 401,
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            error: 'unauthorized',
            error_description: 'Authentication required',
          }),
        },
      };
    }

    if (!hasAnyRole(request, roles)) {
      context.warn(
        `RBAC check failed: User ${request.userEmail} lacks required roles: ${roles.join(', ')}`
      );
      return {
        authorized: false,
        response: {
          status: 403,
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            error: 'forbidden',
            error_description: 'Insufficient permissions',
            required_roles: roles,
          }),
        },
      };
    }

    context.log(`RBAC check passed: User ${request.userEmail} has required roles`);
    return { authorized: true };
  };
}

/**
 * RBAC middleware - require specific permissions
 */
export function requirePermissions(
  permissions: Permission[],
  requireAll: boolean = true
): (request: AuthenticatedRequest, context: InvocationContext) => { authorized: boolean; response?: any } {
  return (request: AuthenticatedRequest, context: InvocationContext) => {
    if (!request.user) {
      context.warn('RBAC check failed: User not authenticated');
      return {
        authorized: false,
        response: {
          status: 401,
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            error: 'unauthorized',
            error_description: 'Authentication required',
          }),
        },
      };
    }

    const hasRequiredPermissions = requireAll
      ? hasAllPermissions(request, permissions)
      : hasAnyPermission(request, permissions);

    if (!hasRequiredPermissions) {
      context.warn(
        `RBAC check failed: User ${request.userEmail} lacks required permissions: ${permissions.join(', ')}`
      );
      return {
        authorized: false,
        response: {
          status: 403,
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            error: 'forbidden',
            error_description: 'Insufficient permissions',
            required_permissions: permissions,
          }),
        },
      };
    }

    context.log(`RBAC check passed: User ${request.userEmail} has required permissions`);
    return { authorized: true };
  };
}

/**
 * Get all permissions for a user based on their roles
 */
export function getUserPermissions(request: AuthenticatedRequest): Permission[] {
  if (!request.user || !request.userRoles) {
    return [];
  }

  const permissions = new Set<Permission>();

  for (const userRole of request.userRoles) {
    const roleEnum = userRole as UserRole;
    const rolePermissions = ROLE_PERMISSIONS[roleEnum];

    if (rolePermissions) {
      rolePermissions.forEach((permission) => permissions.add(permission));
    }
  }

  return Array.from(permissions);
}
