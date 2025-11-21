// ========================================
// Get Container Status - M2M Endpoint
// ========================================
// Allows external systems to retrieve container status
// Requires: Container.Read scope
// Authentication: Azure AD or Keycloak (M2M)

import { app, HttpRequest, HttpResponseInit, InvocationContext } from '@azure/functions';
import { requireScopes, AuthenticatedRequest } from '../middleware/auth';
import { authenticateDual } from '../middleware/keycloak-auth';

/**
 * Get container status information
 *
 * Required scope: Container.Read
 *
 * Query parameters:
 * - containerNumber: Container number (required)
 *
 * Example request:
 * GET /api/v1/containers/status?containerNumber=CONT123456
 * Authorization: Bearer <M2M token with Container.Read scope>
 */
export async function GetContainerStatus(
  request: HttpRequest,
  context: InvocationContext
): Promise<HttpResponseInit> {
  // Step 1: Authenticate (supports both Azure AD and Keycloak M2M)
  const authResult = await authenticateDual(request, context);
  if ('status' in authResult) {
    // Authentication failed
    return authResult;
  }

  const authRequest = (authResult as { request: AuthenticatedRequest }).request;

  // Step 2: Require Container.Read scope
  const scopeCheck = await requireScopes('Container.Read')(authRequest, context);
  if (!scopeCheck.valid) {
    return (scopeCheck as { valid: false; response: HttpResponseInit }).response;
  }

  // Step 3: Extract query parameters
  const containerNumber = request.query.get('containerNumber');

  if (!containerNumber) {
    return {
      status: 400,
      jsonBody: {
        error: 'bad_request',
        error_description: 'Missing required parameter: containerNumber',
      },
    };
  }

  // Step 4: Log the request
  const identifier = authRequest.isM2M
    ? `M2M client ${authRequest.clientId}`
    : `User ${authRequest.userEmail}`;

  context.log(`Container status requested for ${containerNumber} by ${identifier}`);

  // Step 5: Return mock container data (replace with actual database query)
  // TODO: Implement actual container lookup from orchestration database
  const containerStatus = {
    containerNumber: containerNumber,
    type: '20FT_STANDARD',
    status: 'LOADED',
    location: {
      terminal: 'Rotterdam Terminal',
      position: 'Block A, Row 12, Bay 5',
      lastSeen: '2025-10-25T08:30:00Z',
    },
    booking: {
      bookingRef: 'BK123456',
      carrier: 'Maersk',
      voyage: 'MAE001',
    },
    cargo: {
      weight: 18500, // kg
      commodity: 'Electronics',
      dangerousGoods: false,
    },
    lastUpdated: new Date().toISOString(),
  };

  return {
    status: 200,
    headers: {
      'Content-Type': 'application/json',
      'Cache-Control': 'no-cache, no-store, must-revalidate',
    },
    jsonBody: {
      success: true,
      data: containerStatus,
      requestedBy: authRequest.isM2M ? 'M2M' : 'User',
      timestamp: new Date().toISOString(),
    },
  };
}

// Register the Azure Function
app.http('GetContainerStatus', {
  methods: ['GET'],
  authLevel: 'anonymous', // Auth handled by middleware
  route: 'v1/containers/status',
  handler: GetContainerStatus,
});
