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

  try {
    const legalEntityId = request.params.legalentityid;
    
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

    // Parse multipart form data
    // Azure Functions v4 may lowercase header names - try all variations
    let contentType = request.headers.get('content-type');
    if (!contentType) contentType = request.headers.get('Content-Type');
    if (!contentType) contentType = request.headers.get('Content-type');
    if (!contentType) contentType = request.headers.get('CONTENT-TYPE');
    
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
      // Generate SAS URL for Document Intelligence to access the blob
      // (Container is private, so Document Intelligence needs a SAS token)
      const sasUrl = await blobService.getDocumentSasUrl(blobUrl, 60); // 60 minute expiry
      context.log('Generated SAS URL for document analysis');

      // Extract data from document using SAS URL
      const docIntelService = new DocumentIntelligenceService();
      const extractedData = await docIntelService.extractKvKData(sasUrl);

      context.log('Extracted data:', extractedData);

      // Update with extracted data
      await pool.query(
        `UPDATE legal_entity
         SET kvk_extracted_company_name = $1,
             kvk_extracted_number = $2
         WHERE legal_entity_id = $3`,
        [extractedData.companyName, extractedData.kvkNumber, legalEntityId]
      );

      // Compare extracted data with entered data
      const comparisonFlags: string[] = [];

      // Get entered company name from legal entity
      const enteredCompanyName = entityResult.rows[0].primary_legal_name;

      // Get entered KvK identifier (if any)
      const identifiersResult = await pool.query(
        `SELECT identifier_value
         FROM legal_entity_number
         WHERE legal_entity_id = $1
           AND identifier_type = 'KVK'
           AND (is_deleted IS NULL OR is_deleted = FALSE)`,
        [legalEntityId]
      );

      const enteredKvkNumber = identifiersResult.rows.length > 0 ? identifiersResult.rows[0].identifier_value : null;

      // Compare KvK numbers (if both exist)
      if (enteredKvkNumber && extractedData.kvkNumber) {
        // Normalize: remove spaces, hyphens, etc.
        const normalizedEntered = enteredKvkNumber.replace(/[\s-]/g, '');
        const normalizedExtracted = extractedData.kvkNumber.replace(/[\s-]/g, '');

        if (normalizedEntered !== normalizedExtracted) {
          comparisonFlags.push('entered_kvk_mismatch');
          context.warn(`KvK mismatch: entered=${enteredKvkNumber}, extracted=${extractedData.kvkNumber}`);
        } else {
          context.log(`KvK match: ${enteredKvkNumber} = ${extractedData.kvkNumber}`);
        }
      }

      // Compare company names (fuzzy match - case insensitive, ignore extra spaces)
      if (enteredCompanyName && extractedData.companyName) {
        const normalizeCompanyName = (name: string) => {
          return name
            .toLowerCase()
            .trim()
            .replace(/\s+/g, ' ')  // Normalize multiple spaces to single space
            .replace(/[.,\-]/g, ''); // Remove punctuation
        };

        const normalizedEntered = normalizeCompanyName(enteredCompanyName);
        const normalizedExtracted = normalizeCompanyName(extractedData.companyName);

        // Check if names are similar (exact match or one contains the other)
        const namesMatch = normalizedEntered === normalizedExtracted ||
                          normalizedEntered.includes(normalizedExtracted) ||
                          normalizedExtracted.includes(normalizedEntered);

        if (!namesMatch) {
          comparisonFlags.push('entered_name_mismatch');
          context.warn(`Company name mismatch: entered="${enteredCompanyName}", extracted="${extractedData.companyName}"`);
        } else {
          context.log(`Company name match: "${enteredCompanyName}" ≈ "${extractedData.companyName}"`);
        }
      }

      context.log('Comparison flags:', comparisonFlags);

      // Validate against KvK API if we have a number
      if (extractedData.kvkNumber) {
        const kvkService = new KvKService();
        const validation = await kvkService.validateCompany(
          extractedData.kvkNumber,
          extractedData.companyName || ''
        );

        context.log('KvK validation result:', validation);

        // Combine comparison flags with KvK API validation flags
        const allFlags = [...comparisonFlags, ...validation.flags];

        // Update verification status based on all flags
        // Priority: entered data mismatches are critical, so status is 'flagged' if present
        let newStatus: string;
        if (comparisonFlags.length > 0) {
          // Entered data mismatches = flagged for review
          newStatus = 'flagged';
        } else if (validation.isValid) {
          newStatus = 'verified';
        } else if (validation.flags.length > 0) {
          newStatus = 'flagged';
        } else {
          newStatus = 'failed';
        }

        await pool.query(
          `UPDATE legal_entity
           SET kvk_verification_status = $1,
               kvk_api_response = $2,
               kvk_mismatch_flags = $3,
               kvk_verified_at = NOW()
           WHERE legal_entity_id = $4`,
          [newStatus, JSON.stringify(validation.companyData), allFlags, legalEntityId]
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
        // No KvK number extracted - combine with comparison flags
        const allFlags = [...comparisonFlags, 'extraction_failed'];

        await pool.query(
          `UPDATE legal_entity
           SET kvk_verification_status = 'failed',
               kvk_mismatch_flags = $1
           WHERE legal_entity_id = $2`,
          [allFlags, legalEntityId]
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
  route: 'v1/legal-entities/{legalentityid}/kvk-document',
  handler: memberEndpoint(handler),
});
