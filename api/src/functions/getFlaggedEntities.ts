import { app, HttpRequest, HttpResponseInit, InvocationContext } from '@azure/functions';
import { Pool } from 'pg';
import { BlobStorageService } from '../services/blobStorageService';

const pool = new Pool({
  host: process.env.POSTGRES_HOST,
  port: parseInt(process.env.POSTGRES_PORT || '5432'),
  database: process.env.POSTGRES_DATABASE,
  user: process.env.POSTGRES_USER,
  password: process.env.POSTGRES_PASSWORD,
  ssl: { rejectUnauthorized: false },
});

const blobService = new BlobStorageService();

export async function getFlaggedEntities(
  request: HttpRequest,
  context: InvocationContext
): Promise<HttpResponseInit> {
  
  if (request.method === 'OPTIONS') {
    return {
      status: 204,
      headers: {
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Methods': 'GET, OPTIONS',
        'Access-Control-Allow-Headers': 'Content-Type, Authorization',
      },
    };
  }

  try {
    const result = await pool.query(
      `SELECT
        legal_entity_id,
        primary_legal_name,
        kvk_extracted_company_name,
        kvk_extracted_number,
        kvk_mismatch_flags,
        kvk_document_url,
        document_uploaded_at
       FROM legal_entity
       WHERE kvk_verification_status = 'flagged'
         AND is_deleted = false
       ORDER BY document_uploaded_at DESC`
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
      headers: { 'Access-Control-Allow-Origin': '*' },
    };

  } catch (error: any) {
    context.error('Error:', error);
    return {
      status: 500,
      jsonBody: { error: 'Failed to fetch flagged entities' },
      headers: { 'Access-Control-Allow-Origin': '*' },
    };
  }
}

app.http('getFlaggedEntities', {
  methods: ['GET', 'OPTIONS'],
  authLevel: 'anonymous',
  route: 'v1/kvk-verification/flagged',
  handler: getFlaggedEntities,
});
