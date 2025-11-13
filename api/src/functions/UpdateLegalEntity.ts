import { app, HttpRequest, HttpResponseInit, InvocationContext } from "@azure/functions";
import { wrapEndpoint, AuthenticatedRequest } from '../middleware/endpointWrapper';
import { Permission, hasAnyRole, UserRole } from '../middleware/rbac';
import { logAuditEvent, AuditEventType, AuditSeverity } from '../middleware/auditLog';
import { getPool } from '../utils/database';
import { withTransaction } from '../utils/transaction';
import { isValidUUID } from '../utils/validators';

async function handler(request: AuthenticatedRequest, context: InvocationContext): Promise<HttpResponseInit> {
  const pool = getPool();
  const legalEntityId = request.params.legalentityid;

  if (!legalEntityId) {
    return {
      status: 400,
      jsonBody: { error: 'legal_entity_id parameter is required' }
    };
  }

  // Validate UUID format
  const isUUID = isValidUUID(legalEntityId);
  if (!isUUID) {
    return {
      status: 400,
      jsonBody: { error: 'Invalid UUID format' }
    };
  }

  try {
    const body = await request.json() as any;
    const userEmail = request.userEmail;
    const userRoles = request.userRoles || [];

    // Admin can update any entity
    if (hasAnyRole(request, [UserRole.SYSTEM_ADMIN, UserRole.ASSOCIATION_ADMIN])) {
      const result = await withTransaction(pool, context, async (tx) => {
        // 1. Update legal entity
        const { rows: entityRows } = await tx.query(
          `UPDATE legal_entity
           SET primary_legal_name = COALESCE($1, primary_legal_name),
               address_line1 = COALESCE($2, address_line1),
               address_line2 = COALESCE($3, address_line2),
               postal_code = COALESCE($4, postal_code),
               city = COALESCE($5, city),
               province = COALESCE($6, province),
               country_code = COALESCE($7, country_code),
               entity_legal_form = COALESCE($8, entity_legal_form),
               registered_at = COALESCE($9, registered_at),
               dt_modified = CURRENT_TIMESTAMP,
               modified_by = $10
           WHERE legal_entity_id = $11 AND (is_deleted IS NULL OR is_deleted = FALSE)
           RETURNING *`,
          [
            body.primary_legal_name,
            body.address_line1,
            body.address_line2,
            body.postal_code,
            body.city,
            body.province,
            body.country_code,
            body.entity_legal_form,
            body.registered_at,
            userEmail,
            legalEntityId
          ]
        );

        if (entityRows.length === 0) {
          throw new Error('Legal entity not found');
        }

        // 2. Update contacts if provided
        if (body.contacts && Array.isArray(body.contacts)) {
          // Use savepoint for contacts update - allow partial failure
          const sp = await tx.savepoint('contacts_update');

          try {
            // Deactivate existing contacts (soft delete)
            await tx.query(
              `UPDATE legal_entity_contact
               SET is_active = false, dt_modified = CURRENT_TIMESTAMP
               WHERE legal_entity_id = $1`,
              [legalEntityId]
            );

            // Insert new/updated contacts
            for (const contact of body.contacts) {
              if (contact.email && contact.full_name) {
                await tx.query(
                  `INSERT INTO legal_entity_contact (
                     legal_entity_id, email, full_name, first_name, last_name,
                     contact_type, phone, job_title, is_primary, is_active
                   )
                   VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, true)
                   ON CONFLICT (legal_entity_id, email)
                   DO UPDATE SET
                     full_name = EXCLUDED.full_name,
                     first_name = EXCLUDED.first_name,
                     last_name = EXCLUDED.last_name,
                     contact_type = EXCLUDED.contact_type,
                     phone = EXCLUDED.phone,
                     job_title = EXCLUDED.job_title,
                     is_primary = EXCLUDED.is_primary,
                     is_active = true,
                     dt_modified = CURRENT_TIMESTAMP`,
                  [
                    legalEntityId,
                    contact.email,
                    contact.full_name,
                    contact.first_name || null,
                    contact.last_name || null,
                    contact.contact_type || 'Primary',
                    contact.phone || null,
                    contact.job_title || null,
                    contact.is_primary || false
                  ]
                );
              }
            }

            await tx.releaseSavepoint(sp);
          } catch (error) {
            // Rollback just the contact updates, keep entity changes
            await tx.rollbackTo(sp);
            context.warn('Failed to update contacts, continuing with entity update only:', error);
          }
        }

        // 3. Update identifiers if provided
        if (body.identifiers && Array.isArray(body.identifiers)) {
          const sp = await tx.savepoint('identifiers_update');

          try {
            for (const identifier of body.identifiers) {
              if (identifier.identifier_value && identifier.identifier_scheme) {
                await tx.query(
                  `INSERT INTO legal_entity_identifier (
                     legal_entity_id, identifier_value, identifier_scheme
                   )
                   VALUES ($1, $2, $3)
                   ON CONFLICT (legal_entity_id, identifier_scheme)
                   DO UPDATE SET
                     identifier_value = EXCLUDED.identifier_value,
                     dt_modified = CURRENT_TIMESTAMP`,
                  [
                    legalEntityId,
                    identifier.identifier_value,
                    identifier.identifier_scheme
                  ]
                );
              }
            }

            await tx.releaseSavepoint(sp);
          } catch (error) {
            await tx.rollbackTo(sp);
            context.warn('Failed to update identifiers, continuing with entity update only:', error);
          }
        }

        return entityRows[0];
      });

      // Log successful update
      await logAuditEvent({
        event_type: AuditEventType.MEMBER_UPDATED,
        severity: AuditSeverity.INFO,
        result: 'success',
        user_id: request.userId,
        user_email: request.userEmail,
        ip_address: request.headers.get('x-forwarded-for') || request.headers.get('x-real-ip') || undefined,
        user_agent: request.headers.get('user-agent') || undefined,
        request_path: request.url,
        request_method: request.method,
        resource_type: 'legal_entity',
        resource_id: legalEntityId,
        action: 'update',
        details: { admin_access: true, changes: body }
      }, context);

      return {
        status: 200,
        jsonBody: result
      };
    }

    // Regular user: verify ownership before update
    const ownershipCheck = await pool.query(
      `SELECT le.legal_entity_id
       FROM legal_entity le
       JOIN legal_entity_contact c ON le.legal_entity_id = c.legal_entity_id
       WHERE le.legal_entity_id = $1
         AND c.email = $2
         AND c.is_active = true
         AND (le.is_deleted IS NULL OR le.is_deleted = FALSE)`,
      [legalEntityId, userEmail]
    );

    if (ownershipCheck.rows.length === 0) {
      // Log unauthorized update attempt
      await logAuditEvent({
        event_type: AuditEventType.ACCESS_DENIED,
        severity: AuditSeverity.WARNING,
        result: 'failure',
        user_id: request.userId,
        user_email: request.userEmail,
        ip_address: request.headers.get('x-forwarded-for') || request.headers.get('x-real-ip') || undefined,
        user_agent: request.headers.get('user-agent') || undefined,
        request_path: request.url,
        request_method: request.method,
        resource_type: 'legal_entity',
        resource_id: legalEntityId,
        action: 'update',
        details: { reason: 'ownership_check_failed' },
        error_message: 'User does not have permission to update this entity'
      }, context);

      context.warn(`IDOR attempt: User ${userEmail} tried to update entity ${legalEntityId}`);

      return {
        status: 403,
        jsonBody: { error: 'You do not have permission to update this entity' }
      };
    }

    // Perform the update in a transaction
    const result = await withTransaction(pool, context, async (tx) => {
      // 1. Update legal entity
      const { rows: entityRows } = await tx.query(
        `UPDATE legal_entity
         SET primary_legal_name = COALESCE($1, primary_legal_name),
             address_line1 = COALESCE($2, address_line1),
             address_line2 = COALESCE($3, address_line2),
             postal_code = COALESCE($4, postal_code),
             city = COALESCE($5, city),
             province = COALESCE($6, province),
             country_code = COALESCE($7, country_code),
             entity_legal_form = COALESCE($8, entity_legal_form),
             registered_at = COALESCE($9, registered_at),
             dt_modified = CURRENT_TIMESTAMP,
             modified_by = $10
         WHERE legal_entity_id = $11 AND (is_deleted IS NULL OR is_deleted = FALSE)
         RETURNING *`,
        [
          body.primary_legal_name,
          body.address_line1,
          body.address_line2,
          body.postal_code,
          body.city,
          body.province,
          body.country_code,
          body.entity_legal_form,
          body.registered_at,
          userEmail,
          legalEntityId
        ]
      );

      if (entityRows.length === 0) {
        throw new Error('Legal entity not found');
      }

      // 2. Update contacts if provided (with savepoint for partial failure tolerance)
      if (body.contacts && Array.isArray(body.contacts)) {
        const sp = await tx.savepoint('contacts_update');

        try {
          await tx.query(
            `UPDATE legal_entity_contact
             SET is_active = false, dt_modified = CURRENT_TIMESTAMP
             WHERE legal_entity_id = $1`,
            [legalEntityId]
          );

          for (const contact of body.contacts) {
            if (contact.email && contact.full_name) {
              await tx.query(
                `INSERT INTO legal_entity_contact (
                   legal_entity_id, email, full_name, first_name, last_name,
                   contact_type, phone, job_title, is_primary, is_active
                 )
                 VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, true)
                 ON CONFLICT (legal_entity_id, email)
                 DO UPDATE SET
                   full_name = EXCLUDED.full_name,
                   first_name = EXCLUDED.first_name,
                   last_name = EXCLUDED.last_name,
                   contact_type = EXCLUDED.contact_type,
                   phone = EXCLUDED.phone,
                   job_title = EXCLUDED.job_title,
                   is_primary = EXCLUDED.is_primary,
                   is_active = true,
                   dt_modified = CURRENT_TIMESTAMP`,
                [
                  legalEntityId,
                  contact.email,
                  contact.full_name,
                  contact.first_name || null,
                  contact.last_name || null,
                  contact.contact_type || 'Primary',
                  contact.phone || null,
                  contact.job_title || null,
                  contact.is_primary || false
                ]
              );
            }
          }

          await tx.releaseSavepoint(sp);
        } catch (error) {
          await tx.rollbackTo(sp);
          context.warn('Failed to update contacts, continuing with entity update only:', error);
        }
      }

      return entityRows[0];
    });

    // Log successful update
    await logAuditEvent({
      event_type: AuditEventType.MEMBER_UPDATED,
      severity: AuditSeverity.INFO,
      result: 'success',
      user_id: request.userId,
      user_email: request.userEmail,
      ip_address: request.headers.get('x-forwarded-for') || request.headers.get('x-real-ip') || undefined,
      user_agent: request.headers.get('user-agent') || undefined,
      request_path: request.url,
      request_method: request.method,
      resource_type: 'legal_entity',
      resource_id: legalEntityId,
      action: 'update',
      details: { changes: body }
    }, context);

    return {
      status: 200,
      jsonBody: result
    };
  } catch (error) {
    context.error('Error updating legal entity:', error);

    // Log error
    await logAuditEvent({
      event_type: AuditEventType.MEMBER_UPDATED,
      severity: AuditSeverity.ERROR,
      result: 'failure',
      user_id: request.userId,
      user_email: request.userEmail,
      ip_address: request.headers.get('x-forwarded-for') || request.headers.get('x-real-ip') || undefined,
      user_agent: request.headers.get('user-agent') || undefined,
      request_path: request.url,
      request_method: request.method,
      resource_type: 'legal_entity',
      resource_id: legalEntityId,
      action: 'update',
      error_message: error instanceof Error ? error.message : 'Unknown error',
      details: { error: error instanceof Error ? error.message : 'Unknown error' }
    }, context);

    return {
      status: 500,
      jsonBody: { error: 'Failed to update legal entity' }
    };
  }
}

app.http('UpdateLegalEntity', {
  methods: ['PUT'],
  route: 'v1/legal-entities/{legalentityid}',
  authLevel: 'anonymous',
  handler: wrapEndpoint(handler, {
    requireAuth: true,
    requiredPermissions: [Permission.UPDATE_OWN_ENTITY, Permission.UPDATE_ALL_ENTITIES],
    requireAllPermissions: false // Either UPDATE_ALL or UPDATE_OWN
  })
});
