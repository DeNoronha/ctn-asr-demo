import { app, HttpResponseInit, InvocationContext } from '@azure/functions';
import * as multipart from 'parse-multipart-data';
import { BlobStorageService } from '../services/blobStorageService';
import { DocumentIntelligenceService } from '../services/documentIntelligenceService';
import { KvKService } from '../services/kvkService';
import { getPool } from '../utils/database';
import { getRequestId } from '../utils/requestId';
import { memberEndpoint, AuthenticatedRequest } from '../middleware/endpointWrapper';

const pool = getPool(); // ✅ SECURITY FIX: Use shared pool with SSL validation

async function handler(
  request: AuthenticatedRequest,
  context: InvocationContext
): Promise<HttpResponseInit> {
  context.log('KvK Document Upload requested');

  // Extract headers safely at the beginning (lessons learned from Headers bug)
  let contentType: string | null = null;
  try {
    contentType = request.headers.get('content-type') ||
                 request.headers.get('Content-Type') ||
                 request.headers.get('Content-type') ||
                 request.headers.get('CONTENT-TYPE');
  } catch (error) {
    context.warn('Failed to extract content-type header:', error);
  }

  try {
    const legalEntityId = request.params.legalEntityId;

    if (!legalEntityId) {
      return {
        status: 400,
        jsonBody: { error: 'Legal entity ID is required' },
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
        jsonBody: { error: 'Legal entity not found' },
        headers: { 'Access-Control-Allow-Origin': '*' },
      };
    }

    // Parse multipart form data (contentType already extracted safely at function start)
    context.log('Content-Type:', contentType, 'File upload requested');
    
    if (!contentType) {
      context.error('No content-type header found');
      return {
        status: 400,
        jsonBody: { 
          error: 'Content-Type header is missing',
          receivedHeaders: Object.fromEntries(request.headers.entries())
        },
        headers: { 'Access-Control-Allow-Origin': '*' },
      };
    }
    
    if (!contentType.includes('multipart/form-data')) {
      context.error('Invalid content-type:', contentType);
      return {
        status: 400,
        jsonBody: { error: 'Content-Type must be multipart/form-data', received: contentType },
        headers: { 'Access-Control-Allow-Origin': '*' },
      };
    }

    const bodyBuffer = await request.arrayBuffer();

    // ✅ SECURITY FIX: Validate file size on backend (10MB max)
    const MAX_FILE_SIZE = 10 * 1024 * 1024; // 10MB
    if (bodyBuffer.byteLength > MAX_FILE_SIZE) {
      context.warn(`File size ${bodyBuffer.byteLength} exceeds maximum ${MAX_FILE_SIZE}`);
      return {
        status: 413,
        jsonBody: { error: 'File size exceeds maximum allowed size of 10MB' },
        headers: { 'Access-Control-Allow-Origin': '*' },
      };
    }

    // Extra safety check before calling getBoundary
    if (!contentType || typeof contentType !== 'string') {
      context.error('contentType is invalid:', { contentType, type: typeof contentType });
      return {
        status: 400,
        jsonBody: { 
          error: 'Invalid Content-Type header',
          contentType: contentType,
          typeOf: typeof contentType,
          allHeaders: Object.fromEntries(request.headers.entries())
        },
        headers: { 'Access-Control-Allow-Origin': '*' },
      };
    }
    
    let boundary: string;
    try {
      boundary = multipart.getBoundary(contentType);
    } catch (boundaryError: any) {
      context.error('getBoundary failed:', boundaryError);
      return {
        status: 400,
        jsonBody: { 
          error: 'Failed to parse multipart boundary',
          contentType: contentType,
          details: boundaryError.message 
        },
        headers: { 'Access-Control-Allow-Origin': '*' },
      };
    }
    
    if (!boundary) {
      context.error('No boundary found in content-type:', contentType);
      return {
        status: 400,
        jsonBody: { error: 'Invalid multipart boundary', contentType },
        headers: { 'Access-Control-Allow-Origin': '*' },
      };
    }

    const parts = multipart.parse(Buffer.from(bodyBuffer), boundary);

    const filePart = parts.find(part => part.name === 'file');

    if (!filePart || !filePart.data) {
      return {
        status: 400,
        jsonBody: { error: 'No file uploaded' },
        headers: { 'Access-Control-Allow-Origin': '*' },
      };
    }

    // ✅ SECURITY FIX: Validate file size again (multipart data)
    if (filePart.data.length > MAX_FILE_SIZE) {
      context.warn(`File part size ${filePart.data.length} exceeds maximum ${MAX_FILE_SIZE}`);
      return {
        status: 413,
        jsonBody: { error: 'File size exceeds maximum allowed size of 10MB' },
        headers: { 'Access-Control-Allow-Origin': '*' },
      };
    }

    // ✅ SECURITY FIX: Validate file type with magic number check (not just MIME type)
    const isPdf = filePart.data[0] === 0x25 && // %
                  filePart.data[1] === 0x50 && // P
                  filePart.data[2] === 0x44 && // D
                  filePart.data[3] === 0x46;   // F

    if (!isPdf) {
      return {
        status: 400,
        jsonBody: { error: 'Invalid file format. Only PDF files are allowed.' },
        headers: { 'Access-Control-Allow-Origin': '*' },
      };
    }

    // Also check MIME type
    if (filePart.type !== 'application/pdf') {
      context.warn(`File MIME type is ${filePart.type}, expected application/pdf`);
      return {
        status: 400,
        jsonBody: { error: 'Only PDF files are allowed' },
        headers: { 'Access-Control-Allow-Origin': '*' },
      };
    }

    // Upload to blob storage
    const blobService = new BlobStorageService();
    const blobUrl = await blobService.uploadDocument(
      legalEntityId,
      filePart.filename || 'kvk-document.pdf',
      filePart.data,
      filePart.type
    );

    // Update database with document URL
    await pool.query(
      `UPDATE legal_entity 
       SET kvk_document_url = $1, 
           document_uploaded_at = NOW(),
           kvk_verification_status = 'pending'
       WHERE legal_entity_id = $2`,
      [blobUrl, legalEntityId]
    );

    // Start async verification process
    context.log('Starting document verification...');
    
    try {
      // Extract data from document
      const docIntelService = new DocumentIntelligenceService();
      const extractedData = await docIntelService.extractKvKData(blobUrl);

      context.log('Extracted data:', extractedData);

      // Get the entered KvK identifier and company name for comparison
      const enteredDataQuery = await pool.query(
        `SELECT
          len.identifier_value as entered_kvk_number,
          le.primary_legal_name as entered_company_name
         FROM legal_entity le
         LEFT JOIN legal_entity_number len ON le.legal_entity_id = len.legal_entity_id
           AND len.identifier_type = 'KVK'
           AND (len.is_deleted = false OR len.is_deleted IS NULL)
         WHERE le.legal_entity_id = $1`,
        [legalEntityId]
      );

      const enteredData = enteredDataQuery.rows[0] || {
        entered_kvk_number: null,
        entered_company_name: null
      };

      context.log('Entered data:', enteredData);

      // Compare entered vs extracted data
      const mismatchFlags: string[] = [];

      // Compare KvK numbers if both exist
      if (enteredData.entered_kvk_number && extractedData.kvkNumber) {
        if (enteredData.entered_kvk_number !== extractedData.kvkNumber) {
          mismatchFlags.push('entered_kvk_mismatch');
          context.warn(`KvK number mismatch: entered=${enteredData.entered_kvk_number}, extracted=${extractedData.kvkNumber}`);
        }
      }

      // Compare company names if both exist (case-insensitive, trimmed)
      if (enteredData.entered_company_name && extractedData.companyName) {
        const enteredName = enteredData.entered_company_name.trim().toLowerCase();
        const extractedName = extractedData.companyName.trim().toLowerCase();

        // Allow partial match (extracted name contains entered name or vice versa)
        const isMatch = enteredName.includes(extractedName) || extractedName.includes(enteredName);

        if (!isMatch) {
          mismatchFlags.push('entered_name_mismatch');
          context.warn(`Company name mismatch: entered="${enteredData.entered_company_name}", extracted="${extractedData.companyName}"`);
        }
      }

      // Update with extracted data and comparison results
      await pool.query(
        `UPDATE legal_entity
         SET kvk_extracted_company_name = $1,
             kvk_extracted_number = $2,
             kvk_mismatch_flags = ARRAY(
               SELECT DISTINCT unnest(
                 COALESCE(kvk_mismatch_flags, ARRAY[]::text[]) || $3::text[]
               )
             )
         WHERE legal_entity_id = $4`,
        [extractedData.companyName, extractedData.kvkNumber, mismatchFlags, legalEntityId]
      );

      // Validate against KvK API if we have a number
      if (extractedData.kvkNumber) {
        const kvkService = new KvKService();
        const validation = await kvkService.validateCompany(
          extractedData.kvkNumber,
          extractedData.companyName || ''
        );

        context.log('KvK validation result:', validation);

        // Merge all mismatch flags: entered data comparison + KvK API validation
        const allMismatchFlags = [...new Set([...mismatchFlags, ...validation.flags])];

        // Determine verification status based on all flags
        let newStatus: string;
        if (allMismatchFlags.length === 0) {
          newStatus = 'verified'; // No issues found
        } else if (allMismatchFlags.some(f => f === 'entered_kvk_mismatch' || f === 'entered_name_mismatch')) {
          newStatus = 'flagged'; // Entered data doesn't match extracted data - needs review
        } else if (validation.isValid) {
          newStatus = 'verified'; // KvK API validated, ignore minor flags
        } else {
          newStatus = validation.flags.length > 0 ? 'flagged' : 'failed';
        }

        await pool.query(
          `UPDATE legal_entity
           SET kvk_verification_status = $1,
               kvk_api_response = $2,
               kvk_mismatch_flags = $3,
               kvk_verified_at = NOW()
           WHERE legal_entity_id = $4`,
          [newStatus, JSON.stringify(validation.companyData), allMismatchFlags, legalEntityId]
        );

        // Log audit event
        await pool.query(
          `INSERT INTO audit_logs (event_type, actor_org_id, resource_type, resource_id, action, result, metadata)
           VALUES ($1, $2, $3, $4, $5, $6, $7)`,
          [
            'KVK_VERIFICATION',
            'SYSTEM',
            'legal_entity',
            legalEntityId,
            'VERIFY',
            newStatus.toUpperCase(),
            JSON.stringify({ flags: validation.flags, message: validation.message })
          ]
        );
      } else {
        // No KvK number extracted - flag for manual review
        await pool.query(
          `UPDATE legal_entity 
           SET kvk_verification_status = 'failed',
               kvk_mismatch_flags = ARRAY['extraction_failed']
           WHERE legal_entity_id = $1`,
          [legalEntityId]
        );
      }
    } catch (verificationError) {
      context.error('Verification error:', verificationError);
      // Document uploaded but verification failed - mark as pending
      await pool.query(
        `UPDATE legal_entity 
         SET kvk_verification_status = 'failed',
             kvk_mismatch_flags = ARRAY['processing_error']
         WHERE legal_entity_id = $1`,
        [legalEntityId]
      );
    }

    return {
      status: 200,
      jsonBody: {
        message: 'Document uploaded and verification started',
        documentUrl: blobUrl,
        legalEntityId,
      },
    };

  } catch (error: any) {
    context.error('Upload error:', error);
    return {
      status: 500,
      jsonBody: { error: 'Failed to upload document', details: error.message },
    };
  }
}

app.http('uploadKvkDocument', {
  methods: ['POST', 'OPTIONS'],
  authLevel: 'anonymous',
  route: 'v1/legal-entities/{legalEntityId}/kvk-document',
  handler: memberEndpoint(handler),
});
