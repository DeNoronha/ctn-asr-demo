/**
 * M2M Client Management Endpoints
 *
 * HTTP endpoints for managing Machine-to-Machine authentication clients.
 * Refactored to follow SOLID principles and maintainability guidelines.
 *
 * Endpoints:
 * - GET    /api/v1/legal-entities/{legal_entity_id}/m2m-clients - List M2M clients
 * - POST   /api/v1/legal-entities/{legal_entity_id}/m2m-clients - Create M2M client
 * - POST   /api/v1/m2m-clients/{client_id}/generate-secret - Generate client secret
 * - PATCH  /api/v1/m2m-clients/{client_id}/scopes - Update client scopes
 * - DELETE /api/v1/m2m-clients/{client_id} - Deactivate client
 */

import { app, HttpRequest, HttpResponseInit, InvocationContext } from '@azure/functions';
import { wrapEndpoint, AuthenticatedRequest } from '../middleware/endpointWrapper';
import { Permission } from '../middleware/rbac';
import { getPool } from '../utils/database';
import {
  listM2MClients,
  createM2MClient,
  generateSecret,
  updateScopes,
  deactivateM2MClient
} from '../services/m2mClientService';

/**
 * List M2M Clients for a Legal Entity
 * GET /api/v1/legal-entities/{legal_entity_id}/m2m-clients
 */
async function listM2MClientsHandler(
  request: AuthenticatedRequest,
  context: InvocationContext
): Promise<HttpResponseInit> {
  const pool = getPool();
  return await listM2MClients(request, context, pool);
}

/**
 * Create M2M Client
 * POST /api/v1/legal-entities/{legal_entity_id}/m2m-clients
 */
async function createM2MClientHandler(
  request: AuthenticatedRequest,
  context: InvocationContext
): Promise<HttpResponseInit> {
  const pool = getPool();
  return await createM2MClient(request, context, pool);
}

/**
 * Generate Secret for M2M Client
 * POST /api/v1/m2m-clients/{client_id}/generate-secret
 */
async function generateSecretHandler(
  request: AuthenticatedRequest,
  context: InvocationContext
): Promise<HttpResponseInit> {
  const pool = getPool();
  return await generateSecret(request, context, pool);
}

/**
 * Update M2M Client Scopes
 * PATCH /api/v1/m2m-clients/{client_id}/scopes
 */
async function updateScopesHandler(
  request: AuthenticatedRequest,
  context: InvocationContext
): Promise<HttpResponseInit> {
  const pool = getPool();
  return await updateScopes(request, context, pool);
}

/**
 * Deactivate M2M Client
 * DELETE /api/v1/m2m-clients/{client_id}
 */
async function deactivateClientHandler(
  request: AuthenticatedRequest,
  context: InvocationContext
): Promise<HttpResponseInit> {
  const pool = getPool();
  return await deactivateM2MClient(request, context, pool);
}

// =====================================================
// Register HTTP endpoints
// =====================================================

app.http('ListM2MClients', {
  methods: ['GET'],
  route: 'v1/legal-entities/{legal_entity_id}/m2m-clients',
  authLevel: 'anonymous',
  handler: wrapEndpoint(listM2MClientsHandler, {
    requireAuth: true,
    requiredPermissions: [Permission.READ_OWN_ENTITY, Permission.READ_ALL_ENTITIES],
    requireAllPermissions: false
  })
});

app.http('CreateM2MClient', {
  methods: ['POST'],
  route: 'v1/legal-entities/{legal_entity_id}/m2m-clients',
  authLevel: 'anonymous',
  handler: wrapEndpoint(createM2MClientHandler, {
    requireAuth: true,
    requiredPermissions: [Permission.UPDATE_OWN_ENTITY, Permission.UPDATE_ALL_ENTITIES],
    requireAllPermissions: false
  })
});

app.http('GenerateM2MSecret', {
  methods: ['POST'],
  route: 'v1/m2m-clients/{client_id}/generate-secret',
  authLevel: 'anonymous',
  handler: wrapEndpoint(generateSecretHandler, {
    requireAuth: true,
    requiredPermissions: [Permission.UPDATE_OWN_ENTITY, Permission.UPDATE_ALL_ENTITIES],
    requireAllPermissions: false
  })
});

app.http('UpdateM2MClientScopes', {
  methods: ['PATCH'],
  route: 'v1/m2m-clients/{client_id}/scopes',
  authLevel: 'anonymous',
  handler: wrapEndpoint(updateScopesHandler, {
    requireAuth: true,
    requiredPermissions: [Permission.UPDATE_OWN_ENTITY, Permission.UPDATE_ALL_ENTITIES],
    requireAllPermissions: false
  })
});

app.http('DeactivateM2MClient', {
  methods: ['DELETE'],
  route: 'v1/m2m-clients/{client_id}',
  authLevel: 'anonymous',
  handler: wrapEndpoint(deactivateClientHandler, {
    requireAuth: true,
    requiredPermissions: [Permission.DELETE_ENTITIES],
    requireAllPermissions: false
  })
});
