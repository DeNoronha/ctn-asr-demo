// ========================================
// Get ETA Updates - M2M Endpoint
// ========================================
// Allows external systems to retrieve ETA updates for bookings
// Requires: ETA.Read scope
// Authentication: Azure AD or Zitadel (M2M)

import { app, HttpRequest, HttpResponseInit, InvocationContext } from '@azure/functions';
import { requireScopes } from '../middleware/auth';
import { authenticateDual } from '../middleware/zitadel-auth';

/**
 * Get ETA updates for a booking reference
 *
 * Required scope: ETA.Read
 *
 * Query parameters:
 * - bookingRef: Booking reference number (required)
 *
 * Example request:
 * GET /api/v1/eta/updates?bookingRef=BK123456
 * Authorization: Bearer <M2M token with ETA.Read scope>
 */
export async function GetETAUpdates(
  request: HttpRequest,
  context: InvocationContext
): Promise<HttpResponseInit> {
  // Step 1: Authenticate (supports both Azure AD and Zitadel M2M)
  const authResult = await authenticateDual(request, context);
  if ('status' in authResult) {
    // Authentication failed
    return authResult;
  }

  const authRequest = authResult.request;

  // Step 2: Require ETA.Read scope
  const scopeCheck = await requireScopes('ETA.Read')(authRequest, context);
  if (!scopeCheck.valid) {
    return (scopeCheck as { valid: false; response: HttpResponseInit }).response;
  }

  // Step 3: Extract query parameters
  const bookingRef = request.query.get('bookingRef');

  if (!bookingRef) {
    return {
      status: 400,
      jsonBody: {
        error: 'bad_request',
        error_description: 'Missing required parameter: bookingRef',
      },
    };
  }

  // Step 4: Log the request
  const identifier = authRequest.isM2M
    ? `M2M client ${authRequest.clientId}`
    : `User ${authRequest.userEmail}`;

  context.log(`ETA updates requested for booking ${bookingRef} by ${identifier}`);

  // Step 5: Return mock ETA data (replace with actual database query)
  // TODO: Implement actual ETA lookup from orchestration database
  const etaUpdates = {
    bookingRef: bookingRef,
    containerNumber: 'CONT123456',
    currentLocation: 'Rotterdam Terminal',
    estimatedArrival: '2025-11-01T14:30:00Z',
    actualArrival: null,
    status: 'IN_TRANSIT',
    lastUpdated: new Date().toISOString(),
    updates: [
      {
        timestamp: '2025-10-24T10:00:00Z',
        location: 'Hamburg Port',
        event: 'DEPARTED',
        eta: '2025-11-01T14:30:00Z',
      },
      {
        timestamp: '2025-10-25T08:00:00Z',
        location: 'Rotterdam Terminal',
        event: 'ARRIVED',
        eta: '2025-11-01T14:30:00Z',
      },
    ],
  };

  return {
    status: 200,
    headers: {
      'Content-Type': 'application/json',
      'Cache-Control': 'no-cache, no-store, must-revalidate',
    },
    jsonBody: {
      success: true,
      data: etaUpdates,
      requestedBy: authRequest.isM2M ? 'M2M' : 'User',
      timestamp: new Date().toISOString(),
    },
  };
}

// Register the Azure Function
app.http('GetETAUpdates', {
  methods: ['GET'],
  authLevel: 'anonymous', // Auth handled by middleware
  route: 'v1/eta/updates',
  handler: GetETAUpdates,
});
