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
 * Microsoft Graph API scopes required for user management
 */
export const GRAPH_SCOPES = ['User.Read.All', 'User.ReadWrite.All', 'Directory.Read.All'];

/**
 * Request admin consent for Microsoft Graph API scopes
 * Opens a popup for the user to grant consent
 */
export async function requestGraphConsent(): Promise<void> {
  try {
    logger.log('Requesting Graph API consent...');
    await msalInstance.loginPopup({
      scopes: GRAPH_SCOPES,
      prompt: 'consent',
    });
    logger.log('Graph API consent granted successfully');
  } catch (error) {
    logger.error('Failed to obtain Graph API consent:', error);
    throw new Error('Failed to obtain consent for Microsoft Graph API');
  }
}

/**
 * Get authenticated Microsoft Graph client
 */
async function getGraphClient(): Promise<Client> {
  const accounts = msalInstance.getAllAccounts();

  if (accounts.length === 0) {
    throw new Error('No authenticated accounts found');
  }

  const _clientId = import.meta.env.VITE_AZURE_CLIENT_ID;

  try {
    const tokenResponse = await msalInstance.acquireTokenSilent({
      scopes: GRAPH_SCOPES,
      account: accounts[0],
    });

    return Client.init({
      authProvider: (done) => {
        done(null, tokenResponse.accessToken);
      },
    });
  } catch (error: any) {
    // Check if this is an interaction required error (consent needed)
    // AADSTS65001 = invalid_grant (no consent)
    const isConsentError =
      error?.errorCode === 'consent_required' ||
      error?.errorCode === 'interaction_required' ||
      error?.errorCode === 'invalid_grant' ||
      error?.errorMessage?.includes('AADSTS65001');

    if (isConsentError) {
      logger.warn('Interaction required for Graph API access. User needs to grant consent.');
      logger.warn('Error details:', error);
      // Re-throw with a more specific error type
      const consentError = new Error('CONSENT_REQUIRED');
      (consentError as any).originalError = error;
      throw consentError;
    }
    throw error;
  }
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
 * Cache for CTN app service principal ID
 * The resourceId in appRoleAssignments is the service principal Object ID, not the client ID
 */
let ctnServicePrincipalId: string | null = null;

/**
 * Get the service principal Object ID for the CTN application
 */
async function getCtnServicePrincipalId(client: Client): Promise<string> {
  if (ctnServicePrincipalId) {
    return ctnServicePrincipalId;
  }

  const clientId = import.meta.env.VITE_AZURE_CLIENT_ID;

  try {
    // Query for the service principal using the app's client ID
    const response = await client
      .api('/servicePrincipals')
      .filter(`appId eq '${clientId}'`)
      .select(['id', 'displayName'])
      .get();

    if (response.value && response.value.length > 0) {
      const spId = response.value[0].id;
      ctnServicePrincipalId = spId;
      logger.log(`CTN service principal ID: ${spId}`);
      return spId;
    }

    throw new Error('CTN application service principal not found');
  } catch (error) {
    logger.error('Failed to get CTN service principal ID:', error);
    throw error;
  }
}

/**
 * Extract roles from app role assignments (filtered to CTN app only)
 */
function extractRoles(appRoleAssignments: any[], ctnServicePrincipalId: string): UserRole[] {
  const roleMap: Record<string, UserRole> = {
    SystemAdmin: UserRole.SYSTEM_ADMIN,
    AssociationAdmin: UserRole.ASSOCIATION_ADMIN,
    Member: UserRole.MEMBER,
  };

  const roles: UserRole[] = [];

  logger.log(`[extractRoles] Processing ${appRoleAssignments.length} app role assignments for CTN SP ID: ${ctnServicePrincipalId}`);

  for (const assignment of appRoleAssignments) {
    logger.log(`[extractRoles] Assignment - resourceId: ${assignment.resourceId}, role: ${assignment.appRoleDisplayName || assignment.appRoleValue}`);

    // CRITICAL: Only include roles assigned for the CTN application
    // resourceId is the service principal Object ID of the app (not the client ID)
    if (assignment.resourceId !== ctnServicePrincipalId) {
      logger.log(`[extractRoles] Skipping - resourceId mismatch (${assignment.resourceId} !== ${ctnServicePrincipalId})`);
      continue; // Skip roles from other applications
    }

    const roleName = assignment.appRoleDisplayName || assignment.appRoleValue;
    if (roleName && roleMap[roleName]) {
      logger.log(`[extractRoles] ✅ Matched CTN role: ${roleName}`);
      roles.push(roleMap[roleName]);
    } else {
      logger.log(`[extractRoles] Unknown role name: ${roleName}`);
    }
  }

  logger.log(`[extractRoles] Extracted ${roles.length} CTN roles`);
  return roles;
}

/**
 * List all users assigned to the CTN application
 * Queries the service principal's appRoleAssignedTo endpoint directly
 * This is the correct approach - gets ONLY CTN-authorized users
 */
export async function listUsers(): Promise<User[]> {
  try {
    logger.log('Fetching CTN application users from Microsoft Graph...');
    const client = await getGraphClient();

    // Get the CTN app's service principal ID
    const ctnSpId = await getCtnServicePrincipalId(client);
    logger.log(`Querying users assigned to CTN service principal: ${ctnSpId}`);

    // Get the service principal's app roles to map appRoleId → role name
    const servicePrincipal = await client
      .api(`/servicePrincipals/${ctnSpId}`)
      .select(['appRoles'])
      .get();

    const appRoleMap = new Map<string, string>();
    for (const appRole of servicePrincipal.appRoles || []) {
      appRoleMap.set(appRole.id, appRole.value); // Map GUID → role name (e.g., "SystemAdmin")
    }

    logger.log(`Loaded ${appRoleMap.size} app role definitions from service principal`);

    // CORRECT APPROACH: Query users assigned to THIS service principal
    // This returns ONLY users who have app role assignments to the CTN app
    const assignmentsResponse = await client
      .api(`/servicePrincipals/${ctnSpId}/appRoleAssignedTo`)
      .select(['principalId', 'principalDisplayName', 'principalType', 'appRoleId'])
      .get();

    logger.log(`Found ${assignmentsResponse.value.length} app role assignments for CTN app`);

    // Build map of userId → assigned role names
    const userRoleMap = new Map<string, Set<string>>();

    for (const assignment of assignmentsResponse.value) {
      if (assignment.principalType === 'User') {
        const roleName = appRoleMap.get(assignment.appRoleId);

        if (roleName) {
          if (!userRoleMap.has(assignment.principalId)) {
            userRoleMap.set(assignment.principalId, new Set());
          }
          userRoleMap.get(assignment.principalId)!.add(roleName);
        }
      }
    }

    logger.log(`Found ${userRoleMap.size} unique users assigned to CTN app`);

    const users: User[] = [];
    const roleMap: Record<string, UserRole> = {
      SystemAdmin: UserRole.SYSTEM_ADMIN,
      AssociationAdmin: UserRole.ASSOCIATION_ADMIN,
      Member: UserRole.MEMBER,
    };

    // Fetch full user details for each assigned user
    for (const [userId, roleNames] of Array.from(userRoleMap.entries())) {
      try {
        const graphUser = await client
          .api(`/users/${userId}`)
          .select([
            'id',
            'displayName',
            'userPrincipalName',
            'mail',
            'accountEnabled',
            'createdDateTime',
            'signInActivity',
          ])
          .get();

        // Map role names to UserRole enum
        const roles: UserRole[] = [];
        for (const roleName of Array.from(roleNames)) {
          if (roleMap[roleName]) {
            roles.push(roleMap[roleName]);
          }
        }

        if (roles.length > 0) {
          users.push(mapGraphUser(graphUser, roles));
          logger.log(`✅ Added user: ${graphUser.userPrincipalName} with roles: ${Array.from(roleNames).join(', ')}`);
        } else {
          logger.warn(`⚠️  User ${graphUser.userPrincipalName} has assignment but no recognized roles`);
        }
      } catch (error) {
        logger.warn(`Failed to fetch user ${userId}:`, error);
      }
    }

    logger.log(`Fetched ${users.length} CTN-authorized users from Microsoft Graph`);
    return users;
  } catch (error: any) {
    logger.error('Failed to list users:', error);
    // Preserve consent errors so the UI can handle them
    if (error?.message === 'CONSENT_REQUIRED') {
      throw error;
    }
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
    const _userId = inviteResponse.invitedUser.id;

    // TODO: Implement role assignment once app permissions are configured
    // This requires:
    // 1. Application to have AppRoleAssignment.ReadWrite.All permission
    // 2. App roles defined in Azure AD app registration
    // 3. Service principal ID of the app

    logger.log('User invited successfully. Role assignment requires additional configuration.');

    return mapGraphUser(inviteResponse.invitedUser, roles);
  } catch (error: any) {
    logger.error('Failed to invite user:', error);
    // Preserve consent errors so the UI can handle them
    if (error?.message === 'CONSENT_REQUIRED') {
      throw error;
    }
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
  } catch (error: any) {
    logger.error('Failed to update user:', error);
    // Preserve consent errors so the UI can handle them
    if (error?.message === 'CONSENT_REQUIRED') {
      throw error;
    }
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
  } catch (error: any) {
    logger.error('Failed to delete user:', error);
    // Preserve consent errors so the UI can handle them
    if (error?.message === 'CONSENT_REQUIRED') {
      throw error;
    }
    throw new Error('Failed to delete user via Microsoft Graph');
  }
}
