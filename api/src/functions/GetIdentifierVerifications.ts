/**
 * Get Identifier Verifications
 * Returns verification history for a legal entity's identifiers
 */

import { app, HttpResponseInit, InvocationContext } from '@azure/functions';
import { adminEndpoint, type AuthenticatedRequest } from '../middleware/endpointWrapper';
import { query } from '../utils/database';

interface IdentifierVerification {
  verification_id: string;
  legal_entity_id: string;
  identifier_id: string;
  identifier_type: string;
  identifier_value: string;
  verification_method: string;
  verification_status: string;
  document_blob_url?: string;
  document_filename?: string;
  document_mime_type?: string;
  extracted_data?: Record<string, unknown>;
  verified_by?: string;
  verified_at?: string;
  verification_notes?: string;
  created_at: string;
  updated_at: string;
}

async function handler(
  request: AuthenticatedRequest,
  context: InvocationContext
): Promise<HttpResponseInit> {
  try {
    const legalEntityId = request.params.legalEntityId;

    if (!legalEntityId) {
      return {
        status: 400,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          error: 'Missing legal_entity_id parameter',
        }),
      };
    }

    context.log(`Fetching identifier verifications for legal entity: ${legalEntityId}`);

    const result = await query(
      `SELECT * FROM identifier_verification_history
       WHERE legal_entity_id = $1
       ORDER BY created_at DESC`,
      [legalEntityId]
    );

    context.log(`Found ${result.rows.length} verification records`);

    return {
      status: 200,
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        verifications: result.rows,
        count: result.rows.length,
      }),
    };
  } catch (error) {
    context.error('Error fetching identifier verifications:', error);

    return {
      status: 500,
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        error: 'Failed to fetch identifier verifications',
        message: error instanceof Error ? error.message : 'Unknown error',
      }),
    };
  }
}

app.http('getIdentifierVerifications', {
  methods: ['GET'],
  route: 'v1/legal-entities/{legalEntityId}/verifications',
  handler: adminEndpoint(handler),
});
