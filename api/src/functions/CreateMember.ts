import { app, HttpResponseInit, InvocationContext } from "@azure/functions";
import { adminEndpoint, AuthenticatedRequest } from '../middleware/endpointWrapper';
import { addVersionHeaders, logApiRequest } from '../middleware/versioning';
import { getPool } from '../utils/database';
import { withTransaction } from '../utils/transaction';
import { logAuditEvent, AuditEventType, AuditSeverity } from '../middleware/auditLog';
import { trackEvent, trackMetric, trackException, trackDependency } from '../utils/telemetry';
import { handleError } from '../utils/errors';

async function handler(
  request: AuthenticatedRequest,
  context: InvocationContext
): Promise<HttpResponseInit> {
  const startTime = Date.now();
  const pool = getPool();

  try {
    const body = await request.json() as any;

    // Track request
    trackEvent('create_member_request', {
      user_id: request.userId || 'anonymous',
      org_id: body.org_id
    }, undefined, context);

    // Validate required fields
    if (!body.org_id || !body.legal_name || !body.domain) {
      return {
        status: 400,
        body: JSON.stringify({
          error: 'Missing required fields: org_id, legal_name, domain'
        })
      };
    }

    // Execute all operations in a single transaction
    const dbStart = Date.now();
    const result = await withTransaction(pool, context, async (tx) => {
      // 1. Create a party reference if needed (or use existing logic)
      const { rows: partyRows } = await tx.query(
        `INSERT INTO party_reference (party_id, party_class, party_type)
         VALUES (gen_random_uuid(), 'ORGANIZATION', 'MEMBER')
         RETURNING party_id`,
        []
      );
      const partyId = partyRows[0].party_id;

      // 2. Create legal entity
      const { rows: legalEntityRows } = await tx.query(
        `INSERT INTO legal_entity (
           legal_entity_id, party_id, primary_legal_name,
           address_line1, postal_code, city, country_code,
           entity_legal_form, registered_at,
           authentication_tier, authentication_method
         )
         VALUES (gen_random_uuid(), $1, $2, $3, $4, $5, $6, $7, $8, $9, $10)
         RETURNING legal_entity_id, party_id`,
        [
          partyId,
          body.legal_name,
          body.address_line1 || null,
          body.postal_code || null,
          body.city || null,
          body.country_code || 'NL',
          body.entity_legal_form || 'BV',
          body.kvk || null,
          body.authentication_tier || 3, // Default to Tier 3
          body.authentication_method || 'EmailVerification'
        ]
      );
      const legalEntityId = legalEntityRows[0].legal_entity_id;

      // 3. Insert member with legal_entity_id
      const { rows: memberRows } = await tx.query(
        `INSERT INTO members (
           org_id, legal_name, lei, kvk, domain, status,
           membership_level, metadata, legal_entity_id
         )
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
         RETURNING org_id, legal_name, lei, kvk, domain, status,
                   membership_level, created_at, legal_entity_id`,
        [
          body.org_id,
          body.legal_name,
          body.lei || null,
          body.kvk || null,
          body.domain,
          body.status || 'PENDING',
          body.membership_level || 'BASIC',
          body.metadata ? JSON.stringify(body.metadata) : null,
          legalEntityId
        ]
      );
      const member = memberRows[0];

      // 4. Create primary contact if provided
      if (body.contact_email && body.contact_name) {
        await tx.query(
          `INSERT INTO legal_entity_contact (
             legal_entity_id, email, full_name, contact_type, is_primary
           )
           VALUES ($1, $2, $3, $4, true)`,
          [
            legalEntityId,
            body.contact_email,
            body.contact_name,
            body.contact_type || 'Primary'
          ]
        );
      }

      // 5. Create additional contacts if provided
      if (body.contacts && Array.isArray(body.contacts)) {
        for (const contact of body.contacts) {
          if (contact.email && contact.name) {
            await tx.query(
              `INSERT INTO legal_entity_contact (
                 legal_entity_id, email, full_name, first_name, last_name,
                 contact_type, phone, job_title, is_primary
               )
               VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)`,
              [
                legalEntityId,
                contact.email,
                contact.name,
                contact.first_name || null,
                contact.last_name || null,
                contact.type || 'Secondary',
                contact.phone || null,
                contact.job_title || null,
                contact.is_primary || false
              ]
            );
          }
        }
      }

      return {
        ...member,
        party_id: partyId
      };
    });

    const dbDuration = Date.now() - dbStart;
    trackDependency('PostgreSQL:CreateMember', 'SQL', dbDuration, true, {
      table: 'members',
      operation: 'INSERT'
    });

    // Track success
    const totalDuration = Date.now() - startTime;
    trackEvent('create_member_success', {
      status: 'success',
      org_id: result.org_id
    }, { duration: totalDuration }, context);

    trackMetric('create_member_duration', totalDuration, {
      operation: 'create_member'
    });

    // Log successful member creation
    await logAuditEvent({
      event_type: AuditEventType.MEMBER_CREATED,
      severity: AuditSeverity.INFO,
      result: 'success',
      user_id: request.userId,
      user_email: request.userEmail,
      ip_address: request.headers.get('x-forwarded-for') || request.headers.get('x-real-ip') || undefined,
      user_agent: request.headers.get('user-agent') || undefined,
      request_path: request.url,
      request_method: request.method,
      resource_type: 'member',
      resource_id: result.org_id,
      action: 'create',
      details: {
        org_id: result.org_id,
        legal_name: result.legal_name,
        domain: body.domain
      }
    }, context);

    // Log API request with version info
    logApiRequest(context, 'v1', '/members', request as any);

    // Build response with version headers
    const response: HttpResponseInit = {
      status: 201,
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(result)
    };

    return addVersionHeaders(response, 'v1');
  } catch (error: any) {
    const totalDuration = Date.now() - startTime;
    context.error('Error creating member:', error);

    // Track failure
    trackException(error, {
      operation: 'create_member',
      user_id: request.userId || 'anonymous'
    });

    trackEvent('create_member_failure', {
      status: 'failure',
      error: error.message
    }, { duration: totalDuration }, context);

    // Log failed member creation
    await logAuditEvent({
      event_type: AuditEventType.MEMBER_CREATED,
      severity: AuditSeverity.ERROR,
      result: 'failure',
      user_id: request.userId,
      user_email: request.userEmail,
      ip_address: request.headers.get('x-forwarded-for') || request.headers.get('x-real-ip') || undefined,
      user_agent: request.headers.get('user-agent') || undefined,
      request_path: request.url,
      request_method: request.method,
      resource_type: 'member',
      action: 'create',
      error_message: error.message,
      details: { error: error.message }
    }, context);

    // Handle duplicate org_id
    if (error.code === '23505') {
      return {
        status: 409,
        body: JSON.stringify({ error: 'Member with this org_id already exists' })
      };
    }

    return {
      status: 500,
      body: JSON.stringify({ error: 'Failed to create member' })
    };
  }
}

app.http('CreateMember', {
  methods: ['POST', 'OPTIONS'],
  route: 'v1/members',
  authLevel: 'anonymous',
  handler: adminEndpoint(handler)
});
