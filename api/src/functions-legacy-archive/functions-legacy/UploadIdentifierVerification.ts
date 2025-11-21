/**
 * Upload Identifier Verification Document
 * Generic endpoint for uploading verification documents for LEI, EORI, DUNS, etc.
 */

import { app, HttpResponseInit, InvocationContext } from '@azure/functions';
import * as multipart from 'parse-multipart-data';
import { BlobStorageService } from '../services/blobStorageService';
import { DocumentIntelligenceService } from '../services/documentIntelligenceService';
import { getPool } from '../utils/database';
import { wrapEndpoint, type AuthenticatedRequest } from '../middleware/endpointWrapper';
import { UserRole } from '../middleware/rbac';
import { randomUUID } from 'crypto';
import { handleError } from '../utils/errors';

const pool = getPool();
const MAX_FILE_SIZE = 10 * 1024 * 1024; // 10MB

async function handler(
  request: AuthenticatedRequest,
  context: InvocationContext
): Promise<HttpResponseInit> {
  const requestId = randomUUID();
  context.log(`[${requestId}] Identifier verification upload requested`);

  try {
    const legalEntityId = request.params.legalEntityId;

    if (!legalEntityId) {
      return {
        status: 400,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ error: 'Legal entity ID is required' }),
      };
    }

    // Verify legal entity exists
    const entityResult = await pool.query(
      'SELECT legal_entity_id, primary_legal_name FROM legal_entity WHERE legal_entity_id = $1 AND is_deleted = false',
      [legalEntityId]
    );

    if (entityResult.rows.length === 0) {
      return {
        status: 404,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ error: 'Legal entity not found' }),
      };
    }

    // Parse multipart form data
    let contentType = request.headers.get('content-type') ||
                      request.headers.get('Content-Type');

    if (!contentType || !contentType.includes('multipart/form-data')) {
      return {
        status: 400,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ error: 'Content-Type must be multipart/form-data' }),
      };
    }

    const bodyBuffer = await request.arrayBuffer();

    // Validate file size
    if (bodyBuffer.byteLength > MAX_FILE_SIZE) {
      return {
        status: 413,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ error: 'File size exceeds maximum allowed size of 10MB' }),
      };
    }

    const boundary = multipart.getBoundary(contentType);
    const parts = multipart.parse(Buffer.from(bodyBuffer), boundary);

    const filePart = parts.find(part => part.name === 'file');
    const identifierTypePart = parts.find(part => part.name === 'identifier_type');
    const identifierValuePart = parts.find(part => part.name === 'identifier_value');
    const identifierIdPart = parts.find(part => part.name === 'identifier_id');

    if (!filePart || !filePart.data) {
      return {
        status: 400,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ error: 'No file uploaded' }),
      };
    }

    if (!identifierTypePart || !identifierValuePart || !identifierIdPart) {
      return {
        status: 400,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          error: 'Missing required fields: identifier_type, identifier_value, identifier_id'
        }),
      };
    }

    const identifierType = identifierTypePart.data.toString();
    const identifierValue = identifierValuePart.data.toString();
    const identifierId = identifierIdPart.data.toString();

    // Validate file type (PDF or image)
    const isPdf = filePart.data[0] === 0x25 && filePart.data[1] === 0x50 &&
                  filePart.data[2] === 0x44 && filePart.data[3] === 0x46;
    const isPng = filePart.data[0] === 0x89 && filePart.data[1] === 0x50 &&
                  filePart.data[2] === 0x4E && filePart.data[3] === 0x47;
    const isJpeg = filePart.data[0] === 0xFF && filePart.data[1] === 0xD8 &&
                   filePart.data[2] === 0xFF;

    if (!isPdf && !isPng && !isJpeg) {
      return {
        status: 400,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          error: 'Invalid file type. Only PDF, PNG, and JPEG files are allowed'
        }),
      };
    }

    context.log(`[${requestId}] Uploading ${identifierType} document for entity ${legalEntityId}`);

    // Upload to Blob Storage
    const blobService = new BlobStorageService();
    const filename = `${identifierType}/${Date.now()}-${filePart.filename || 'document'}`;
    const blobUrl = await blobService.uploadDocument(
      legalEntityId,
      filename,
      filePart.data,
      filePart.type || 'application/pdf'
    );

    context.log(`[${requestId}] Document uploaded to: ${blobUrl}`);

    // Extract data using Document Intelligence (if PDF and KvK)
    let extractedData: Record<string, unknown> = {};
    if (isPdf && identifierType.toUpperCase() === 'KVK') {
      try {
        const docService = new DocumentIntelligenceService();
        const kvkData = await docService.extractKvKData(blobUrl);
        extractedData = kvkData as unknown as Record<string, unknown>;
        context.log(`[${requestId}] Document Intelligence extraction complete`);
      } catch (error) {
        context.warn(`[${requestId}] Document Intelligence extraction failed:`, error);
        // Continue anyway - manual review can handle it
      }
    }
    // For non-KvK identifiers, manual review will be required

    // Insert verification record
    const verificationId = randomUUID();
    const insertResult = await pool.query(
      `INSERT INTO identifier_verification_history (
        verification_id,
        legal_entity_id,
        identifier_id,
        identifier_type,
        identifier_value,
        verification_method,
        verification_status,
        document_blob_url,
        document_filename,
        document_mime_type,
        extracted_data
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11)
      RETURNING *`,
      [
        verificationId,
        legalEntityId,
        identifierId,
        identifierType,
        identifierValue,
        'document_upload',
        'pending', // Will require manual review
        blobUrl,
        filePart.filename || 'document',
        filePart.type || 'application/pdf',
        JSON.stringify(extractedData),
      ]
    );

    context.log(`[${requestId}] Verification record created: ${verificationId}`);

    return {
      status: 201,
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        message: 'Verification document uploaded successfully',
        verification: insertResult.rows[0],
      }),
    };
  } catch (error) {
    context.error(`[${requestId}] Error uploading identifier verification:`, error);

    return {
      status: 500,
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        error: 'Failed to upload verification document',
        message: error instanceof Error ? error.message : 'Unknown error',
      }),
    };
  }
}

app.http('uploadIdentifierVerification', {
  methods: ['POST'],
  route: 'v1/legal-entities/{legalEntityId}/verifications',
  handler: wrapEndpoint(handler, {
    requireAuth: true,
    requiredRoles: [UserRole.SYSTEM_ADMIN, UserRole.ASSOCIATION_ADMIN],
    enableContentTypeValidation: false,
  }),
});
