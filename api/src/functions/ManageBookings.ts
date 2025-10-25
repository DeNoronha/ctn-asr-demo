// ========================================
// Manage Bookings - M2M Endpoint
// ========================================
// Allows external systems to read/write booking information
// Requires: Booking.Read for GET, Booking.Write for POST/PUT

import { app, HttpRequest, HttpResponseInit, InvocationContext } from '@azure/functions';
import { authenticate, requireScopes } from '../middleware/auth';

/**
 * Get booking information
 *
 * Required scope: Booking.Read
 *
 * Query parameters:
 * - bookingRef: Booking reference (optional, returns all if not provided)
 *
 * Example request:
 * GET /api/v1/bookings?bookingRef=BK123456
 * Authorization: Bearer <M2M token with Booking.Read scope>
 */
export async function GetBookings(
  request: HttpRequest,
  context: InvocationContext
): Promise<HttpResponseInit> {
  // Step 1: Authenticate
  const authResult = await authenticate(request, context);
  if (!authResult.success) {
    return (authResult as { success: false; response: HttpResponseInit }).response;
  }

  const authRequest = (authResult as { success: true; request: any }).request;

  // Step 2: Require Booking.Read scope
  const scopeCheck = await requireScopes('Booking.Read')(authRequest, context);
  if (!scopeCheck.valid) {
    return (scopeCheck as { valid: false; response: HttpResponseInit }).response;
  }

  // Step 3: Extract query parameters
  const bookingRef = request.query.get('bookingRef');

  // Step 4: Log the request
  const identifier = authRequest.isM2M
    ? `M2M client ${authRequest.clientId}`
    : `User ${authRequest.userEmail}`;

  context.log(`Bookings requested by ${identifier}${bookingRef ? ` for ${bookingRef}` : ''}`);

  // Step 5: Return mock booking data (replace with actual database query)
  // TODO: Implement actual booking lookup from orchestration database
  const bookings = bookingRef ? [
    {
      bookingRef: bookingRef,
      containerNumber: 'CONT123456',
      carrier: 'Maersk',
      origin: 'Hamburg',
      destination: 'Rotterdam',
      departureDate: '2025-10-24T10:00:00Z',
      arrivalDate: '2025-11-01T14:30:00Z',
      status: 'CONFIRMED',
      createdAt: '2025-10-20T09:00:00Z',
    },
  ] : [
    {
      bookingRef: 'BK123456',
      containerNumber: 'CONT123456',
      carrier: 'Maersk',
      status: 'CONFIRMED',
    },
    {
      bookingRef: 'BK123457',
      containerNumber: 'CONT123457',
      carrier: 'MSC',
      status: 'PENDING',
    },
  ];

  return {
    status: 200,
    headers: {
      'Content-Type': 'application/json',
    },
    jsonBody: {
      success: true,
      data: bookings,
      count: bookings.length,
      requestedBy: authRequest.isM2M ? 'M2M' : 'User',
      timestamp: new Date().toISOString(),
    },
  };
}

/**
 * Create or update booking information
 *
 * Required scope: Booking.Write
 *
 * Request body:
 * {
 *   "bookingRef": "BK123456",
 *   "containerNumber": "CONT123456",
 *   "carrier": "Maersk",
 *   "origin": "Hamburg",
 *   "destination": "Rotterdam",
 *   "departureDate": "2025-10-24T10:00:00Z",
 *   "arrivalDate": "2025-11-01T14:30:00Z"
 * }
 *
 * Example request:
 * POST /api/v1/bookings
 * Authorization: Bearer <M2M token with Booking.Write scope>
 */
export async function CreateBooking(
  request: HttpRequest,
  context: InvocationContext
): Promise<HttpResponseInit> {
  // Step 1: Authenticate
  const authResult = await authenticate(request, context);
  if (!authResult.success) {
    return (authResult as { success: false; response: HttpResponseInit }).response;
  }

  const authRequest = (authResult as { success: true; request: any }).request;

  // Step 2: Require Booking.Write scope
  const scopeCheck = await requireScopes('Booking.Write')(authRequest, context);
  if (!scopeCheck.valid) {
    return (scopeCheck as { valid: false; response: HttpResponseInit }).response;
  }

  // Step 3: Parse request body
  let bookingData: any;
  try {
    bookingData = await authRequest.json!();
  } catch (error) {
    return {
      status: 400,
      jsonBody: {
        error: 'bad_request',
        error_description: 'Invalid JSON in request body',
      },
    };
  }

  // Step 4: Validate required fields
  const requiredFields = ['containerNumber', 'carrier', 'origin', 'destination'];
  const missingFields = requiredFields.filter(field => !bookingData[field]);

  if (missingFields.length > 0) {
    return {
      status: 400,
      jsonBody: {
        error: 'bad_request',
        error_description: `Missing required fields: ${missingFields.join(', ')}`,
        required_fields: requiredFields,
      },
    };
  }

  // Step 5: Log the request
  const identifier = authRequest.isM2M
    ? `M2M client ${authRequest.clientId}`
    : `User ${authRequest.userEmail}`;

  context.log(`Booking created for container ${bookingData.containerNumber} by ${identifier}`);

  // Step 6: Return mock response (replace with actual database insert)
  // TODO: Implement actual booking creation in orchestration database
  const createdBooking = {
    bookingRef: bookingData.bookingRef || `BK${Date.now()}`,
    ...bookingData,
    status: 'PENDING',
    createdAt: new Date().toISOString(),
    createdBy: identifier,
  };

  return {
    status: 201,
    headers: {
      'Content-Type': 'application/json',
    },
    jsonBody: {
      success: true,
      data: createdBooking,
      message: 'Booking created successfully',
      timestamp: new Date().toISOString(),
    },
  };
}

// Register Azure Functions
app.http('GetBookings', {
  methods: ['GET'],
  authLevel: 'anonymous', // Auth handled by middleware
  route: 'v1/bookings',
  handler: GetBookings,
});

app.http('CreateBooking', {
  methods: ['POST'],
  authLevel: 'anonymous', // Auth handled by middleware
  route: 'v1/bookings',
  handler: CreateBooking,
});
