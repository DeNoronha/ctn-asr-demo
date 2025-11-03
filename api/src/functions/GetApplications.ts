/**
 * Get Applications Function
 * GET /api/v1/applications
 * Returns list of membership applications (admin only)
 */

import { app, HttpResponseInit, InvocationContext } from "@azure/functions";
import { getPool } from '../utils/database';
import { adminEndpoint, AuthenticatedRequest } from '../middleware/endpointWrapper';
import { addVersionHeaders } from '../middleware/versioning';

async function handler(
  request: AuthenticatedRequest,
  context: InvocationContext
): Promise<HttpResponseInit> {
  const pool = getPool();
  
  try {
    // Get query parameters for filtering
    const status = request.query.get('status') || 'pending';
    const limit = parseInt(request.query.get('limit') || '100', 10);
    const offset = parseInt(request.query.get('offset') || '0', 10);

    // Build query based on status filter
    let query = `
      SELECT 
        application_id,
        legal_name,
        kvk_number,
        company_address,
        postal_code,
        city,
        country,
        applicant_name,
        applicant_email,
        applicant_phone,
        job_title,
        membership_type,
        status,
        submitted_at,
        reviewed_at,
        reviewed_by,
        review_notes
      FROM applications
      WHERE 1=1
    `;
    
    const params: any[] = [];
    let paramCount = 1;

    // Filter by status
    if (status && status !== 'all') {
      query += ` AND status = $${paramCount}`;
      params.push(status);
      paramCount++;
    }

    // Add ordering and pagination
    query += ` ORDER BY submitted_at DESC LIMIT $${paramCount} OFFSET $${paramCount + 1}`;
    params.push(limit, offset);

    // Execute query
    const result = await pool.query(query, params);

    // Get total count for pagination
    let countQuery = 'SELECT COUNT(*) as total FROM applications WHERE 1=1';
    const countParams: any[] = [];
    
    if (status && status !== 'all') {
      countQuery += ' AND status = $1';
      countParams.push(status);
    }

    const countResult = await pool.query(countQuery, countParams);
    const total = parseInt(countResult.rows[0].total, 10);

    context.log(`Retrieved ${result.rows.length} applications (status: ${status})`);

    return addVersionHeaders({
      status: 200,
      jsonBody: {
        data: result.rows,
        total: total,
        limit: limit,
        offset: offset
      }
    }, 'v1');

  } catch (error: any) {
    context.error('Error fetching applications:', error);
    return addVersionHeaders({
      status: 500,
      jsonBody: {
        error: 'Failed to fetch applications',
        message: error.message
      }
    }, 'v1');
  }
}

app.http('GetApplications', {
  methods: ['GET', 'OPTIONS'],
  route: 'v1/applications',
  authLevel: 'anonymous',
  handler: adminEndpoint(handler)
});
