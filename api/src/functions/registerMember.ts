import { app, HttpResponseInit, HttpRequest, InvocationContext } from "@azure/functions";
import * as multipart from 'parse-multipart-data';
import { wrapEndpoint, AuthenticatedRequest } from '../middleware/endpointWrapper';
import { addVersionHeaders, logApiRequest } from '../middleware/versioning';
import { getPool } from '../utils/database';
import { withTransaction } from '../utils/transaction';
import { logAuditEvent, AuditEventType, AuditSeverity } from '../middleware/auditLog';
import { trackEvent, trackMetric, trackException } from '../utils/telemetry';
import { createApplicationCreatedEvent, publishEvent } from '../utils/eventGrid';
import { BlobStorageService } from '../services/blobStorageService';
import { DocumentIntelligenceService } from '../services/documentIntelligenceService';
import { KvKService } from '../services/kvkService';

/**
 * Member Registration Endpoint
 * POST /api/v1/register-member
 *
 * Public endpoint for self-service member registration.
 * Creates a pending application for admin review.
 *
 * Related: docs/MEMBER_REGISTRATION_IMPLEMENTATION_PLAN.md
 */

interface RegistrationData {
  // Company Information
  legalName: string;
  kvkNumber: string;
  lei?: string;
  companyAddress: string;
  postalCode: string;
  city: string;
  country: string;

  // Contact Information
  contactName: string;
  contactEmail: string;
  contactPhone: string;
  jobTitle: string;

  // Membership
  membershipType: string;

  // Documents (will be handled separately via blob upload)
  kvkDocument?: {
    filename: string;
    size: number;
    mimeType: string;
  };

  // Legal
  termsAccepted: boolean;
  gdprConsent: boolean;
}

function validateEmail(email: string): boolean {
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return emailRegex.test(email);
}

function validateKvK(kvk: string): boolean {
  // Dutch KvK number is 8 digits
  const kvkRegex = /^\d{8}$/;
  return kvkRegex.test(kvk);
}

function validateLEI(lei: string): boolean {
  // LEI is 20 alphanumeric characters
  const leiRegex = /^[A-Z0-9]{20}$/;
  return leiRegex.test(lei);
}

function validatePhone(phone: string): boolean {
  // Basic phone validation - allow digits, spaces, +, -, ()
  const phoneRegex = /^[\d\s\+\-\(\)]+$/;
  return phoneRegex.test(phone) && phone.length >= 7;
}

async function handler(
  request: AuthenticatedRequest,
  context: InvocationContext
): Promise<HttpResponseInit> {
  const startTime = Date.now();
  const pool = getPool();

  try {
    // ========================================================================
    // PARSE MULTIPART/FORM-DATA
    // ========================================================================

    let contentType = request.headers.get('content-type') ||
                      request.headers.get('Content-Type') ||
                      request.headers.get('CONTENT-TYPE');

    if (!contentType || !contentType.includes('multipart/form-data')) {
      return {
        status: 400,
        body: JSON.stringify({
          error: 'Content-Type must be multipart/form-data',
          received: contentType || 'none'
        })
      };
    }

    const bodyBuffer = await request.arrayBuffer();
    const MAX_FILE_SIZE = 10 * 1024 * 1024; // 10MB

    if (bodyBuffer.byteLength > MAX_FILE_SIZE) {
      return {
        status: 413,
        body: JSON.stringify({ error: 'Request size exceeds maximum allowed size of 10MB' })
      };
    }

    let boundary: string;
    try {
      boundary = multipart.getBoundary(contentType);
    } catch (error: any) {
      return {
        status: 400,
        body: JSON.stringify({
          error: 'Failed to parse multipart boundary',
          details: error.message
        })
      };
    }

    const parts = multipart.parse(Buffer.from(bodyBuffer), boundary);

    // Extract form fields
    const getField = (name: string): string | undefined => {
      const part = parts.find(p => p.name === name);
      return part ? part.data.toString('utf8') : undefined;
    };

    const body = {
      legalName: getField('legalName'),
      kvkNumber: getField('kvkNumber'),
      lei: getField('lei'),
      companyAddress: getField('companyAddress'),
      postalCode: getField('postalCode'),
      city: getField('city'),
      country: getField('country'),
      contactName: getField('contactName'),
      contactEmail: getField('contactEmail'),
      contactPhone: getField('contactPhone'),
      jobTitle: getField('jobTitle'),
      membershipType: getField('membershipType'),
      termsAccepted: getField('termsAccepted') === 'true',
      gdprConsent: getField('gdprConsent') === 'true'
    };

    // Extract file
    const filePart = parts.find(part => part.name === 'kvkDocument');

    // Track request
    trackEvent('member_registration_request', {
      email: body.contactEmail,
      kvk: body.kvkNumber,
      membership_type: body.membershipType,
      has_document: String(!!filePart)
    }, undefined, context);

    // ========================================================================
    // VALIDATION
    // ========================================================================

    // Validate required fields
    const requiredFields = [
      'legalName', 'kvkNumber', 'companyAddress', 'postalCode', 'city', 'country',
      'contactName', 'contactEmail', 'contactPhone', 'jobTitle',
      'membershipType', 'termsAccepted', 'gdprConsent'
    ];

    const missingFields = requiredFields.filter(field => !body[field as keyof typeof body]);

    if (missingFields.length > 0) {
      return {
        status: 400,
        body: JSON.stringify({
          error: 'Missing required fields',
          missingFields
        })
      };
    }

    // Validate email format
    if (!validateEmail(body.contactEmail!)) {
      return {
        status: 400,
        body: JSON.stringify({ error: 'Invalid email address format' })
      };
    }

    // Validate KvK number format
    if (!validateKvK(body.kvkNumber!)) {
      return {
        status: 400,
        body: JSON.stringify({ error: 'KvK number must be 8 digits' })
      };
    }

    // Validate LEI if provided
    if (body.lei && !validateLEI(body.lei)) {
      return {
        status: 400,
        body: JSON.stringify({ error: 'LEI must be 20 alphanumeric characters' })
      };
    }

    // Validate phone format
    if (!validatePhone(body.contactPhone!)) {
      return {
        status: 400,
        body: JSON.stringify({ error: 'Invalid phone number format' })
      };
    }

    // Validate legal acceptance
    if (!body.termsAccepted || !body.gdprConsent) {
      return {
        status: 400,
        body: JSON.stringify({ error: 'Terms and GDPR consent must be accepted' })
      };
    }

    // Validate membership type
    const validMembershipTypes = ['basic', 'standard', 'premium', 'enterprise'];
    if (!validMembershipTypes.includes(body.membershipType!.toLowerCase())) {
      return {
        status: 400,
        body: JSON.stringify({
          error: 'Invalid membership type',
          validTypes: validMembershipTypes
        })
      };
    }

    // Validate KvK document (required)
    if (!filePart || !filePart.data) {
      return {
        status: 400,
        body: JSON.stringify({ error: 'KvK document is required' })
      };
    }

    if (filePart.data.length > MAX_FILE_SIZE) {
      return {
        status: 413,
        body: JSON.stringify({ error: 'File size exceeds maximum allowed size of 10MB' })
      };
    }

    // Validate file type (PDF only) with magic number check
    const isPdf = filePart.data[0] === 0x25 && // %
                  filePart.data[1] === 0x50 && // P
                  filePart.data[2] === 0x44 && // D
                  filePart.data[3] === 0x46;   // F

    if (!isPdf || filePart.type !== 'application/pdf') {
      return {
        status: 400,
        body: JSON.stringify({ error: 'KvK document must be a PDF file' })
      };
    }

    // ========================================================================
    // CHECK FOR DUPLICATES
    // ========================================================================

    const dbStart = Date.now();

    // Check if email already exists in pending applications
    const { rows: existingApplications } = await pool.query(
      `SELECT application_id, status
       FROM applications
       WHERE applicant_email = $1
       AND status IN ('pending', 'under_review')
       ORDER BY submitted_at DESC
       LIMIT 1`,
      [body.contactEmail]
    );

    if (existingApplications.length > 0) {
      return {
        status: 409,
        body: JSON.stringify({
          error: 'Application already exists',
          message: 'An application with this email address is already pending review',
          applicationId: existingApplications[0].application_id,
          status: existingApplications[0].status
        })
      };
    }

    // Check if KvK number already exists
    const { rows: existingKvK } = await pool.query(
      `SELECT org_id, legal_name
       FROM members
       WHERE kvk = $1
       LIMIT 1`,
      [body.kvkNumber]
    );

    if (existingKvK.length > 0) {
      return {
        status: 409,
        body: JSON.stringify({
          error: 'KvK number already registered',
          message: 'This KvK number is already associated with a member organization',
          existingMember: {
            orgId: existingKvK[0].org_id,
            legalName: existingKvK[0].legal_name
          }
        })
      };
    }

    // ========================================================================
    // UPLOAD DOCUMENT & EXTRACT DATA
    // ========================================================================

    context.log('Uploading KvK document to blob storage...');

    // Generate temporary application ID for blob path
    const tempApplicationId = crypto.randomUUID();

    // Upload to blob storage with applications prefix
    const blobService = new BlobStorageService();
    const blobUrl = await blobService.uploadDocument(
      `applications/${tempApplicationId}`,
      filePart.filename || 'kvk-document.pdf',
      filePart.data,
      filePart.type
    );

    context.log('Document uploaded:', blobUrl);

    // Initialize verification data
    let extractedData: any = { companyName: null, kvkNumber: null };
    let kvkValidation: any = { isValid: false, flags: [], companyData: null, message: 'Not validated' };
    let verificationStatus = 'pending';
    let verificationFlags: string[] = [];

    // Extract data using Document Intelligence (same as admin portal)
    try {
      context.log('Starting document verification with Document Intelligence...');

      const sasUrl = await blobService.getDocumentSasUrl(blobUrl, 60);
      const docIntelService = new DocumentIntelligenceService();
      extractedData = await docIntelService.extractKvKData(sasUrl);

      context.log('Extracted data:', extractedData);

      // Compare extracted data with entered data
      if (body.kvkNumber && extractedData.kvkNumber) {
        const normalizedEntered = body.kvkNumber.replace(/[\s-]/g, '');
        const normalizedExtracted = extractedData.kvkNumber.replace(/[\s-]/g, '');

        if (normalizedEntered !== normalizedExtracted) {
          verificationFlags.push('entered_kvk_mismatch');
          context.warn(`KvK mismatch: entered=${body.kvkNumber}, extracted=${extractedData.kvkNumber}`);
        }
      }

      // Compare company names (fuzzy match)
      if (body.legalName && extractedData.companyName) {
        const normalize = (name: string) => name.toLowerCase().trim().replace(/\s+/g, ' ').replace(/[.,\-]/g, '');
        const normalizedEntered = normalize(body.legalName);
        const normalizedExtracted = normalize(extractedData.companyName);

        const namesMatch = normalizedEntered === normalizedExtracted ||
                          normalizedEntered.includes(normalizedExtracted) ||
                          normalizedExtracted.includes(normalizedEntered);

        if (!namesMatch) {
          verificationFlags.push('entered_name_mismatch');
          context.warn(`Name mismatch: entered="${body.legalName}", extracted="${extractedData.companyName}"`);
        }
      }

      // Validate against KvK API (same as admin portal)
      if (extractedData.kvkNumber) {
        context.log('Validating with KvK API...');
        const kvkService = new KvKService();
        kvkValidation = await kvkService.validateCompany(
          extractedData.kvkNumber,
          extractedData.companyName || ''
        );

        context.log('KvK validation result:', kvkValidation);

        // Combine all flags
        verificationFlags = [...verificationFlags, ...kvkValidation.flags];

        // Determine verification status
        if (verificationFlags.filter(f => f.includes('entered_')).length > 0) {
          verificationStatus = 'flagged';
        } else if (kvkValidation.isValid) {
          verificationStatus = 'verified';
        } else if (kvkValidation.flags.length > 0) {
          verificationStatus = 'flagged';
        } else {
          verificationStatus = 'failed';
        }

        context.log('Verification status:', verificationStatus, 'flags:', verificationFlags);
      } else {
        verificationFlags.push('extraction_failed');
        verificationStatus = 'failed';
      }

    } catch (verificationError: any) {
      context.error('Verification error:', verificationError);

      // Determine error type
      if (verificationError.message?.includes('KvK') ||
          verificationError.message?.includes('API') ||
          verificationError.code === 'ENOTFOUND') {
        verificationFlags.push('api_error');
      } else if (verificationError.message?.includes('extract') ||
                 verificationError.message?.includes('Document Intelligence')) {
        verificationFlags.push('extraction_failed');
      } else {
        verificationFlags.push('processing_error');
      }

      verificationStatus = 'failed';
    }

    // ========================================================================
    // CREATE APPLICATION RECORD WITH VERIFICATION DATA
    // ========================================================================

    const result = await withTransaction(pool, context, async (tx) => {
      const { rows: applicationRows } = await tx.query(
        `INSERT INTO applications (
           application_id,
           applicant_email,
           applicant_name,
           applicant_job_title,
           applicant_phone,
           legal_name,
           kvk_number,
           lei,
           company_address,
           postal_code,
           city,
           country,
           membership_type,
           terms_accepted,
           gdpr_consent,
           status,
           submitted_at,
           kvk_document_url,
           kvk_verification_status,
           kvk_verification_notes,
           kvk_extracted_data
         )
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16, NOW(), $17, $18, $19, $20)
         RETURNING
           application_id,
           applicant_email,
           legal_name,
           kvk_number,
           membership_type,
           status,
           submitted_at,
           kvk_verification_status`,
        [
          tempApplicationId,
          body.contactEmail,
          body.contactName,
          body.jobTitle,
          body.contactPhone,
          body.legalName,
          body.kvkNumber,
          body.lei || null,
          body.companyAddress,
          body.postalCode,
          body.city,
          body.country,
          body.membershipType!.toLowerCase(),
          body.termsAccepted,
          body.gdprConsent,
          'pending',
          blobUrl,
          verificationStatus,
          JSON.stringify({ flags: verificationFlags, extractedData, kvkValidation: kvkValidation.message }),
          JSON.stringify(kvkValidation.companyData)
        ]
      );

      return applicationRows[0];
    });

    const duration = Date.now() - dbStart;
    // TODO: Fix telemetry call signature after security update
    // trackMetric('database_query_duration', duration, 'ms', { operation: 'create_application' }, context);

    // ========================================================================
    // AUDIT LOG
    // ========================================================================

    // TODO: Fix audit log call signature after security update
    // await logAuditEvent(
    //   context,
    //   AuditEventType.APPLICATION_SUBMITTED,
    //   AuditSeverity.INFO,
    //   'system',
    //   `New member application submitted: ${body.legalName} (${body.kvkNumber})`,
    //   {
    //     application_id: result.application_id,
    //     legal_name: body.legalName,
    //     kvk_number: body.kvkNumber,
    //     applicant_email: body.contactEmail,
    //     membership_type: body.membershipType
    //   }
    // );

    // ========================================================================
    // RETURN SUCCESS RESPONSE
    // ========================================================================

    // TODO: Fix telemetry call signatures after security update
    // trackEvent('member_registration_success', {
    //   application_id: result.application_id,
    //   membership_type: body.membershipType,
    //   verification_status: result.kvk_verification_status
    // }, undefined, context);

    // trackMetric('registration_duration', Date.now() - startTime, 'ms', {}, context);

    // ========================================================================
    // PUBLISH EVENT GRID EVENT FOR EMAIL NOTIFICATION
    // ========================================================================

    const applicationCreatedEvent = createApplicationCreatedEvent({
      applicationId: result.application_id,
      applicantEmail: body.contactEmail!,
      applicantName: body.contactName!,
      legalName: body.legalName!,
      kvkNumber: body.kvkNumber!,
      membershipType: body.membershipType!
    });

    // Publish event asynchronously - don't block response on email sending
    context.log('Publishing Event Grid event for application:', result.application_id);
    publishEvent(applicationCreatedEvent, context)
      .then(success => {
        if (success) {
          context.log('✓ Event Grid event published successfully for application:', result.application_id);
        } else {
          context.warn('⚠ Event Grid not configured - email notification skipped');
        }
      })
      .catch(error => {
        context.error('✗ Failed to publish application created event:', error);
        // Don't fail the request if event publishing fails - email is non-critical
      });

    // Prepare user-friendly message based on verification status
    let verificationMessage = '';
    if (verificationStatus === 'verified') {
      verificationMessage = 'Your KvK document has been verified successfully.';
    } else if (verificationStatus === 'flagged') {
      verificationMessage = 'Your KvK document has been uploaded. Our team will review it for verification.';
    } else {
      verificationMessage = 'Your KvK document has been uploaded. Our team will review it manually.';
    }

    return {
      status: 201,
      body: JSON.stringify({
        message: 'Application submitted successfully',
        applicationId: result.application_id,
        status: result.status,
        submittedAt: result.submitted_at,
        verificationStatus: result.kvk_verification_status,
        verificationMessage,
        nextSteps: [
          verificationMessage,
          'You will receive a confirmation email shortly',
          'Our admin team will review your application within 2-3 business days',
          'You will be notified by email once your application is approved',
          'After approval, you will receive an Azure AD invitation to access the member portal'
        ]
      })
    };

  } catch (error: unknown) {
    context.error('Registration error:', error);

    // TODO: Fix trackException call signature after security update
    // trackException(error instanceof Error ? error : new Error(String(error)), {
    //   operation: 'member_registration'
    // }, context);

    return {
      status: 500,
      body: JSON.stringify({
        error: 'Registration failed',
        message: 'An error occurred while processing your registration. Please try again later or contact support.',
        errorId: context.invocationId
      })
    };
  }
}

// Register the function with public endpoint wrapper
// NOTE: Content-Type validation is disabled because this endpoint accepts multipart/form-data
// The handler performs its own Content-Type validation at line 90-102
app.http('registerMember', {
  methods: ['POST'],
  route: 'v1/register-member',
  authLevel: 'anonymous',
  handler: wrapEndpoint(handler, {
    requireAuth: false,
    enableContentTypeValidation: false // Multipart/form-data endpoint
  })
});
