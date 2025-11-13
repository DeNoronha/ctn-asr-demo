/**
 * Microsoft Graph API Service
 * Handles user management operations via Microsoft Graph
 */

import { Client } from '@microsoft/microsoft-graph-client';
import type { User as GraphUser } from '@microsoft/microsoft-graph-types';
import { msalInstance } from '../auth/AuthContext';
import { UserRole } from '../auth/authConfig';
import { logger } from '../utils/logger';

export interface User {
  id: string;
  displayName: string;
  email: string;
  roles: UserRole[];
  enabled: boolean;
  createdDateTime: string;
  lastSignInDateTime?: string;
  mfaEnabled: boolean;
}

/**
 * Get authenticated Microsoft Graph client
 */
async function getGraphClient(): Promise<Client> {
  const accounts = msalInstance.getAllAccounts();

  if (accounts.length === 0) {
    throw new Error('No authenticated accounts found');
  }

  const clientId = import.meta.env.VITE_AZURE_CLIENT_ID;

  const tokenResponse = await msalInstance.acquireTokenSilent({
    scopes: ['User.Read.All', 'User.ReadWrite.All', 'Directory.Read.All'],
    account: accounts[0],
  });

  return Client.init({
    authProvider: (done) => {
      done(null, tokenResponse.accessToken);
    },
  });
}

/**
 * Map Graph user to our User interface
 */
function mapGraphUser(graphUser: GraphUser, roles: UserRole[] = []): User {
  return {
    id: graphUser.id || '',
    displayName: graphUser.displayName || graphUser.userPrincipalName || '',
    email: graphUser.mail || graphUser.userPrincipalName || '',
    roles: roles,
    enabled: graphUser.accountEnabled ?? true,
    createdDateTime: graphUser.createdDateTime || new Date().toISOString(),
    lastSignInDateTime: graphUser.signInActivity?.lastSignInDateTime || undefined,
    mfaEnabled: false, // Would need to query authentication methods
  };
}

/**
 * Extract roles from app role assignments
 */
function extractRoles(appRoleAssignments: any[]): UserRole[] {
  const roleMap: Record<string, UserRole> = {
    SystemAdmin: UserRole.SYSTEM_ADMIN,
    AssociationAdmin: UserRole.ASSOCIATION_ADMIN,
    Member: UserRole.MEMBER,
  };

  const roles: UserRole[] = [];

  for (const assignment of appRoleAssignments) {
    const roleName = assignment.appRoleDisplayName || assignment.appRoleValue;
    if (roleName && roleMap[roleName]) {
      roles.push(roleMap[roleName]);
    }
  }

  return roles.length > 0 ? roles : [UserRole.MEMBER];
}

/**
 * List all users in the directory
 */
export async function listUsers(): Promise<User[]> {
  try {
    logger.log('Fetching users from Microsoft Graph...');
    const client = await getGraphClient();

    const response = await client
      .api('/users')
      .select([
        'id',
        'displayName',
        'userPrincipalName',
        'mail',
        'accountEnabled',
        'createdDateTime',
        'signInActivity',
      ])
      .top(100)
      .get();

    const users: User[] = [];

    for (const graphUser of response.value) {
      // Get app role assignments for this user
      try {
        const appRoleResponse = await client.api(`/users/${graphUser.id}/appRoleAssignments`).get();

        const roles = extractRoles(appRoleResponse.value);
        users.push(mapGraphUser(graphUser, roles));
      } catch (error) {
        logger.warn(`Failed to get roles for user ${graphUser.id}:`, error);
        users.push(mapGraphUser(graphUser, [UserRole.MEMBER]));
      }
    }

    logger.log(`Fetched ${users.length} users from Microsoft Graph`);
    return users;
  } catch (error) {
    logger.error('Failed to list users:', error);
    throw new Error('Failed to fetch users from Microsoft Graph');
  }
}

/**
 * Invite a new user to the directory
 */
export async function inviteUser(
  email: string,
  displayName: string,
  roles: UserRole[]
): Promise<User> {
  try {
    logger.log('Inviting user via Microsoft Graph:', { email, displayName, roles });
    const client = await getGraphClient();

    // Create invitation
    const invitation = {
      invitedUserEmailAddress: email,
      invitedUserDisplayName: displayName,
      inviteRedirectUrl: window.location.origin,
      sendInvitationMessage: true,
    };

    const inviteResponse = await client.api('/invitations').post(invitation);

    logger.log('User invitation created:', inviteResponse.invitedUser.id);

    // Assign app roles (requires additional configuration)
    // Note: Role assignment requires the app to have AppRoleAssignment.ReadWrite.All permission
    const userId = inviteResponse.invitedUser.id;

    // TODO: Implement role assignment once app permissions are configured
    // This requires:
    // 1. Application to have AppRoleAssignment.ReadWrite.All permission
    // 2. App roles defined in Azure AD app registration
    // 3. Service principal ID of the app

    logger.log('User invited successfully. Role assignment requires additional configuration.');

    return mapGraphUser(inviteResponse.invitedUser, roles);
  } catch (error) {
    logger.error('Failed to invite user:', error);
    throw new Error('Failed to invite user via Microsoft Graph');
  }
}

/**
 * Update an existing user
 */
export async function updateUser(
  userId: string,
  updates: { displayName?: string; accountEnabled?: boolean }
): Promise<void> {
  try {
    logger.log('Updating user via Microsoft Graph:', { userId, updates });
    const client = await getGraphClient();

    await client.api(`/users/${userId}`).patch(updates);

    logger.log('User updated successfully:', userId);
  } catch (error) {
    logger.error('Failed to update user:', error);
    throw new Error('Failed to update user via Microsoft Graph');
  }
}

/**
 * Enable or disable a user account
 */
export async function toggleUserStatus(userId: string, enabled: boolean): Promise<void> {
  await updateUser(userId, { accountEnabled: enabled });
}

/**
 * Delete a user from the directory
 */
export async function deleteUser(userId: string): Promise<void> {
  try {
    logger.log('Deleting user via Microsoft Graph:', userId);
    const client = await getGraphClient();

    await client.api(`/users/${userId}`).delete();

    logger.log('User deleted successfully:', userId);
  } catch (error) {
    logger.error('Failed to delete user:', error);
    throw new Error('Failed to delete user via Microsoft Graph');
  }
}
