import { app, HttpResponseInit, InvocationContext } from '@azure/functions';
import { BlobStorageService } from '../services/blobStorageService';
import { memberEndpoint, AuthenticatedRequest } from '../middleware/endpointWrapper';
import { getPool } from '../utils/database';
import { handleError } from '../utils/errors';

const blobService = new BlobStorageService();

async function handler(
  request: AuthenticatedRequest,
  context: InvocationContext
): Promise<HttpResponseInit> {

  try {
    const pool = getPool();
    const legalEntityId = request.params.legalentityid;

    const result = await pool.query(
      `SELECT
        primary_legal_name,
        kvk_document_url,
        kvk_verification_status,
        kvk_verified_at,
        kvk_verified_by,
        kvk_verification_notes,
        kvk_extracted_company_name,
        kvk_extracted_number,
        kvk_api_response,
        kvk_mismatch_flags,
        document_uploaded_at
       FROM legal_entity
       WHERE legal_entity_id = $1`,
      [legalEntityId]
    );

    if (result.rows.length === 0) {
      return {
        status: 404,
        jsonBody: { error: 'Legal entity not found' },
      };
    }

    const data = result.rows[0];

    // Get entered KvK number from identifiers table
    const kvkIdentifierResult = await pool.query(
      `SELECT identifier_value
       FROM legal_entity_number
       WHERE legal_entity_id = $1
         AND identifier_type = 'KVK'
         AND (is_deleted IS NULL OR is_deleted = FALSE)
       LIMIT 1`,
      [legalEntityId]
    );

    // Add entered values to response
    data.entered_company_name = data.primary_legal_name;
    data.entered_kvk_number = kvkIdentifierResult.rows.length > 0 ? kvkIdentifierResult.rows[0].identifier_value : null;

    // Generate SAS URL for document if it exists
    if (data.kvk_document_url) {
      try {
        data.kvk_document_url = await blobService.getDocumentSasUrl(data.kvk_document_url, 60);
      } catch (error) {
        context.warn('Failed to generate SAS URL for document:', error);
        // Keep original URL if SAS generation fails
      }
    }

    return {
      status: 200,
      jsonBody: data,
    };

  } catch (error: any) {
    context.error('Error:', error);
    return {
      status: 500,
      jsonBody: { error: 'Failed to get verification status' },
    };
  }
}

app.http('getKvkVerificationStatus', {
  methods: ['GET', 'OPTIONS'],
  authLevel: 'anonymous',
  route: 'v1/legal-entities/{legalentityid}/kvk-verification',
  handler: memberEndpoint(handler),
});
