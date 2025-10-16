import { app, HttpResponseInit, InvocationContext } from '@azure/functions';
import { BlobStorageService } from '../services/blobStorageService';
import { adminEndpoint, AuthenticatedRequest } from '../middleware/endpointWrapper';
import { getPool } from '../utils/database';

const blobService = new BlobStorageService();

async function handler(
  request: AuthenticatedRequest,
  context: InvocationContext
): Promise<HttpResponseInit> {

  try {
    const pool = getPool();
    // Get flagged entities with entered legal identifiers
    const result = await pool.query(
      `SELECT
        le.legal_entity_id,
        le.primary_legal_name as entered_company_name,
        le.country_code,
        le.kvk_extracted_company_name as extracted_company_name,
        le.kvk_extracted_number as extracted_legal_id,
        le.kvk_mismatch_flags,
        le.kvk_document_url,
        le.document_uploaded_at,
        len.identifier_value as entered_legal_id,
        len.identifier_type as registry_type
       FROM legal_entity le
       LEFT JOIN legal_entity_number len ON le.legal_entity_id = len.legal_entity_id
         AND len.identifier_type = 'KVK'
         AND (len.is_deleted IS NULL OR len.is_deleted = FALSE)
       WHERE le.kvk_verification_status = 'flagged'
         AND le.is_deleted = false
       ORDER BY le.document_uploaded_at DESC`
    );

    // Generate SAS URLs for all documents
    const entitiesWithSasUrls = await Promise.all(
      result.rows.map(async (entity) => {
        if (entity.kvk_document_url) {
          try {
            entity.kvk_document_url = await blobService.getDocumentSasUrl(entity.kvk_document_url, 60);
          } catch (error) {
            context.warn(`Failed to generate SAS URL for entity ${entity.legal_entity_id}:`, error);
            // Keep original URL if SAS generation fails
          }
        }
        return entity;
      })
    );

    return {
      status: 200,
      jsonBody: entitiesWithSasUrls,
    };

  } catch (error: any) {
    context.error('Error:', error);
    return {
      status: 500,
      jsonBody: { error: 'Failed to fetch flagged entities' },
    };
  }
}

app.http('getFlaggedEntities', {
  methods: ['GET', 'OPTIONS'],
  authLevel: 'anonymous',
  route: 'v1/kvk-verification/flagged',
  handler: adminEndpoint(handler),
});
