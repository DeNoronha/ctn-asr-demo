/**
 * Example: How to use structured logging with correlation IDs in graphService
 *
 * This file demonstrates the enhanced logging patterns for the graphService.
 * Copy these patterns into graphService.ts to enable structured logging.
 *
 * TASK-CR-010: Improved Logging - Structured Logging with Correlation IDs
 */

import type { Client } from '@microsoft/microsoft-graph-client';
import type { User as GraphUser } from '@microsoft/microsoft-graph-types';
import { msalInstance } from '../auth/AuthContext';
import type { UserRole } from '../auth/authConfig';
import { createLogger } from '../utils/logger';

/**
 * Example 1: Request admin consent with correlation ID
 */
export async function requestGraphConsentExample(): Promise<void> {
  const logger = createLogger({ operation: 'requestGraphConsent' });

  try {
    logger.info('Requesting Graph API consent', {
      scopes: ['User.Read.All', 'User.ReadWrite.All'],
    });
    // ... actual consent logic
    logger.info('Graph API consent granted successfully');
  } catch (error) {
    logger.error('Failed to obtain Graph API consent', error);
    throw new Error('Failed to obtain consent for Microsoft Graph API');
  }
}

/**
 * Example 2: Get service principal ID with correlation ID
 */
async function getCtnServicePrincipalIdExample(client: Client): Promise<string> {
  const logger = createLogger({ operation: 'getCtnServicePrincipalId' });

  const ctnServicePrincipalId = 'cached-value';
  if (ctnServicePrincipalId) {
    logger.debug('Using cached CTN service principal ID', { spId: ctnServicePrincipalId });
    return ctnServicePrincipalId;
  }

  const clientId = import.meta.env.VITE_AZURE_CLIENT_ID;

  try {
    logger.debug('Querying service principal', { clientId });

    const response = await client
      .api('/servicePrincipals')
      .filter(`appId eq '${clientId}'`)
      .select(['id', 'displayName'])
      .get();

    if (response.value && response.value.length > 0) {
      const spId = response.value[0].id;
      logger.info('CTN service principal ID retrieved', {
        spId,
        displayName: response.value[0].displayName,
      });
      return spId;
    }

    logger.error('CTN application service principal not found', undefined, { clientId });
    throw new Error('CTN application service principal not found');
  } catch (error) {
    logger.error('Failed to get CTN service principal ID', error, { clientId });
    throw error;
  }
}

/**
 * Example 3: List users with correlation ID and metadata
 */
export async function listUsersExample(): Promise<any[]> {
  const logger = createLogger({ operation: 'listUsers' });

  try {
    logger.info('Fetching CTN application users from Microsoft Graph');
    const client = {} as Client; // Mock

    const ctnSpId = await getCtnServicePrincipalIdExample(client);
    logger.debug('Querying users assigned to CTN service principal', { ctnSpId });

    // Get app role definitions
    const servicePrincipal = await client
      .api(`/servicePrincipals/${ctnSpId}`)
      .select(['appRoles'])
      .get();

    logger.debug('Loaded app role definitions', {
      roleCount: servicePrincipal.appRoles?.length || 0,
    });

    // Query users
    const assignmentsResponse = await client
      .api(`/servicePrincipals/${ctnSpId}/appRoleAssignedTo`)
      .select(['principalId', 'principalDisplayName', 'principalType', 'appRoleId'])
      .get();

    logger.debug('Found app role assignments', {
      assignmentCount: assignmentsResponse.value.length,
    });

    // Process users...
    const users: any[] = [];

    // Log each user being added
    for (const user of users) {
      logger.debug('Added user', {
        userPrincipalName: user.email,
        roles: user.roles,
      });
    }

    // Final summary with correlation ID
    logger.info('Fetched CTN-authorized users', {
      userCount: users.length,
      correlationId: logger.getCorrelationId(), // Include in metadata for tracing
    });

    return users;
  } catch (error: any) {
    logger.error('Failed to list users', error);
    throw new Error('Failed to fetch users from Microsoft Graph');
  }
}

/**
 * Example 4: Invite user with correlation ID
 */
export async function inviteUserExample(
  email: string,
  displayName: string,
  roles: UserRole[]
): Promise<void> {
  const logger = createLogger({ operation: 'inviteUser', email });

  try {
    logger.info('Inviting user via Microsoft Graph', { email, displayName, roles });
    const client = {} as Client; // Mock

    const invitation = {
      invitedUserEmailAddress: email,
      invitedUserDisplayName: displayName,
      inviteRedirectUrl: window.location.origin,
      sendInvitationMessage: true,
    };

    const inviteResponse = await client.api('/invitations').post(invitation);

    logger.info('User invitation created', {
      userId: inviteResponse.invitedUser.id,
      email,
    });

    logger.warn('User invited successfully but role assignment requires additional configuration', {
      userId: inviteResponse.invitedUser.id,
      requestedRoles: roles,
    });
  } catch (error: any) {
    logger.error('Failed to invite user', error, { email, displayName });
    throw new Error('Failed to invite user via Microsoft Graph');
  }
}

/**
 * Example 5: Update user with correlation ID
 */
export async function updateUserExample(
  userId: string,
  updates: { displayName?: string; accountEnabled?: boolean }
): Promise<void> {
  const logger = createLogger({ operation: 'updateUser', userId });

  try {
    logger.info('Updating user via Microsoft Graph', { userId, updates });
    const client = {} as Client; // Mock

    await client.api(`/users/${userId}`).patch(updates);

    logger.info('User updated successfully', { userId, updates });
  } catch (error: any) {
    logger.error('Failed to update user', error, { userId, updates });
    throw new Error('Failed to update user via Microsoft Graph');
  }
}

/**
 * Example 6: Delete user with correlation ID
 */
export async function deleteUserExample(userId: string): Promise<void> {
  const logger = createLogger({ operation: 'deleteUser', userId });

  try {
    logger.info('Deleting user via Microsoft Graph', { userId });
    const client = {} as Client; // Mock

    await client.api(`/users/${userId}`).delete();

    logger.info('User deleted successfully', { userId });
  } catch (error: any) {
    logger.error('Failed to delete user', error, { userId });
    throw new Error('Failed to delete user via Microsoft Graph');
  }
}

/**
 * Example 7: Using child loggers to preserve correlation ID
 */
export async function complexOperationExample(): Promise<void> {
  const rootLogger = createLogger({ operation: 'complexOperation' });

  rootLogger.info('Starting complex operation');

  // Create child logger with additional context (preserves correlation ID)
  const step1Logger = rootLogger.child({ step: 'fetchData' });
  step1Logger.info('Fetching data from API');

  // Another child logger (same correlation ID)
  const step2Logger = rootLogger.child({ step: 'processData' });
  step2Logger.info('Processing fetched data', { recordCount: 100 });

  // All logs share the same correlation ID for tracing
  rootLogger.info('Complex operation completed', {
    correlationId: rootLogger.getCorrelationId(),
  });
}

/**
 * Example 8: Extracting correlation ID from HTTP response
 * Use this to correlate frontend logs with backend logs
 */
export function handleApiResponseExample(headers: Headers): void {
  const logger = createLogger({ operation: 'handleApiResponse' });

  // Extract correlation ID from backend response
  const backendCorrelationId = headers.get('x-correlation-id');

  if (backendCorrelationId) {
    // Create logger with backend correlation ID for tracing
    const correlatedLogger = createLogger({
      operation: 'handleApiResponse',
      correlationId: backendCorrelationId,
    });

    correlatedLogger.info('Processing API response', {
      backendCorrelationId,
      status: 200,
    });
  } else {
    logger.warn('No correlation ID in response headers');
  }
}
