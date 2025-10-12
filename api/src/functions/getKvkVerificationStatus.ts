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

export async function getKvkVerificationStatus(
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
    const legalEntityId = request.params.legalEntityId;

    const result = await pool.query(
      `SELECT 
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
        headers: { 'Access-Control-Allow-Origin': '*' },
      };
    }

    const data = result.rows[0];

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
      headers: { 'Access-Control-Allow-Origin': '*' },
    };

  } catch (error: any) {
    context.error('Error:', error);
    return {
      status: 500,
      jsonBody: { error: 'Failed to get verification status' },
      headers: { 'Access-Control-Allow-Origin': '*' },
    };
  }
}

app.http('getKvkVerificationStatus', {
  methods: ['GET', 'OPTIONS'],
  authLevel: 'anonymous',
  route: 'v1/legal-entities/{legalEntityId}/kvk-verification',
  handler: getKvkVerificationStatus,
});
