/**
 * Generate Excel Test Catalog
 *
 * Creates an Excel spreadsheet with all API and E2E tests
 */

const XLSX = require('xlsx');
const path = require('path');

// API Tests Data
const apiTests = [
  // Members
  { module: 'Members', testName: 'Get all members', description: 'Retrieve paginated list of all members', expectedResult: '200 OK with data array', type: 'API', portal: 'Admin' },
  { module: 'Members', testName: 'Get members with pagination', description: 'Retrieve members with page=1&limit=5', expectedResult: '200 OK with pagination info', type: 'API', portal: 'Admin' },
  { module: 'Members', testName: 'Create member', description: 'Create new member with valid data (org_id, legal_name, domain, status, etc.)', expectedResult: '201 Created with org_id and legal_entity_id', type: 'API', portal: 'Admin' },
  { module: 'Members', testName: 'Get single member', description: 'Retrieve member by org_id', expectedResult: '200 OK with org_id and legal_name', type: 'API', portal: 'Admin' },
  { module: 'Members', testName: 'Get member - not found', description: 'Request non-existent member', expectedResult: '404 Not Found', type: 'API', portal: 'Admin' },
  { module: 'Members', testName: 'Update member status to ACTIVE', description: 'Activate a member', expectedResult: '200 OK with newStatus=ACTIVE', type: 'API', portal: 'Admin' },
  { module: 'Members', testName: 'Update member status to SUSPENDED', description: 'Suspend a member', expectedResult: '200 OK with newStatus=SUSPENDED', type: 'API', portal: 'Admin' },
  { module: 'Members', testName: 'Update member status - invalid value', description: 'Update with invalid status value', expectedResult: '400 Bad Request', type: 'API', portal: 'Admin' },
  { module: 'Members', testName: 'Create member - missing required fields', description: 'Create member with only org_id', expectedResult: '400 Bad Request', type: 'API', portal: 'Admin' },

  // Legal Entities
  { module: 'Legal Entities', testName: 'Get legal entity by ID', description: 'Retrieve legal entity by UUID', expectedResult: '200 OK with legal_entity_id and primary_legal_name', type: 'API', portal: 'Admin' },
  { module: 'Legal Entities', testName: 'Get legal entity with identifiers', description: 'Retrieve entity including identifiers array', expectedResult: '200 OK with identifiers array', type: 'API', portal: 'Admin' },
  { module: 'Legal Entities', testName: 'Get legal entity - not found', description: 'Request non-existent entity', expectedResult: '404 Not Found', type: 'API', portal: 'Admin' },
  { module: 'Legal Entities', testName: 'Get legal entity - invalid UUID', description: 'Request with malformed UUID', expectedResult: '400 Bad Request', type: 'API', portal: 'Admin' },
  { module: 'Legal Entities', testName: 'Update legal entity', description: 'Update address fields (address_line1, city, postal_code, country_code)', expectedResult: '200 OK', type: 'API', portal: 'Admin' },
  { module: 'Legal Entities', testName: 'Update legal entity - partial update', description: 'Update only city field', expectedResult: '200 OK', type: 'API', portal: 'Admin' },
  { module: 'Legal Entities', testName: 'Update legal entity - not found', description: 'Update non-existent entity', expectedResult: '404 Not Found', type: 'API', portal: 'Admin' },

  // Identifiers
  { module: 'Identifiers', testName: 'Get identifiers for entity', description: 'Retrieve all identifiers for a legal entity', expectedResult: '200 OK with identifiers data', type: 'API', portal: 'Admin' },
  { module: 'Identifiers', testName: 'Get identifiers - invalid UUID', description: 'Request with malformed UUID', expectedResult: '400 Bad Request', type: 'API', portal: 'Admin' },
  { module: 'Identifiers', testName: 'Create KVK identifier', description: 'Add KVK number (8 digits) with country_code, registry_name', expectedResult: '201 Created with legal_entity_reference_id', type: 'API', portal: 'Admin' },
  { module: 'Identifiers', testName: 'Create LEI identifier', description: 'Add LEI (20 alphanumeric chars) with issued_by', expectedResult: '201 Created with identifier ID', type: 'API', portal: 'Admin' },
  { module: 'Identifiers', testName: 'Create EORI identifier', description: 'Add EORI number (NL prefix + digits)', expectedResult: '201 Created with identifier ID', type: 'API', portal: 'Admin' },
  { module: 'Identifiers', testName: 'Create DUNS identifier', description: 'Add DUNS number (9 digits)', expectedResult: '201 Created with identifier ID', type: 'API', portal: 'Admin' },
  { module: 'Identifiers', testName: 'Create identifier - invalid type', description: 'Create with identifier_type=INVALID_TYPE', expectedResult: '400 Bad Request', type: 'API', portal: 'Admin' },
  { module: 'Identifiers', testName: 'Create identifier - missing required fields', description: 'Create without identifier_value', expectedResult: '400 Bad Request', type: 'API', portal: 'Admin' },
  { module: 'Identifiers', testName: 'Create identifier - entity not found', description: 'Create for non-existent entity', expectedResult: '404 Not Found', type: 'API', portal: 'Admin' },
  { module: 'Identifiers', testName: 'Update identifier', description: 'Update validation_status to VALIDATED', expectedResult: '200 OK with validation_status=VALIDATED', type: 'API', portal: 'Admin' },
  { module: 'Identifiers', testName: 'Update identifier - not found', description: 'Update non-existent identifier', expectedResult: '404 Not Found', type: 'API', portal: 'Admin' },
  { module: 'Identifiers', testName: 'Update identifier - invalid status', description: 'Update with invalid validation_status', expectedResult: '400 Bad Request', type: 'API', portal: 'Admin' },
  { module: 'Identifiers', testName: 'Delete identifier', description: 'Delete an identifier (soft delete)', expectedResult: '200 OK', type: 'API', portal: 'Admin' },
  { module: 'Identifiers', testName: 'Delete identifier - not found', description: 'Delete non-existent identifier', expectedResult: '404 Not Found', type: 'API', portal: 'Admin' },
  { module: 'Identifiers', testName: 'Delete identifier - invalid UUID', description: 'Delete with malformed UUID', expectedResult: '400 Bad Request', type: 'API', portal: 'Admin' },

  // Contacts
  { module: 'Contacts', testName: 'Get contacts for entity', description: 'Retrieve all contacts for a legal entity', expectedResult: '200 OK with contacts data', type: 'API', portal: 'Admin' },
  { module: 'Contacts', testName: 'Get contacts - invalid UUID', description: 'Request with malformed UUID', expectedResult: '400 Bad Request', type: 'API', portal: 'Admin' },
  { module: 'Contacts', testName: 'Create PRIMARY contact', description: 'Add primary contact with full_name, email, phone, job_title, is_primary=true', expectedResult: '201 Created with legal_entity_contact_id', type: 'API', portal: 'Admin' },
  { module: 'Contacts', testName: 'Create BILLING contact', description: 'Add billing contact with department=Finance', expectedResult: '201 Created with contact ID', type: 'API', portal: 'Admin' },
  { module: 'Contacts', testName: 'Create TECHNICAL contact', description: 'Add technical contact with department=IT', expectedResult: '201 Created with contact ID', type: 'API', portal: 'Admin' },
  { module: 'Contacts', testName: 'Create ADMIN contact', description: 'Add admin contact', expectedResult: '201 Created with contact ID', type: 'API', portal: 'Admin' },
  { module: 'Contacts', testName: 'Create contact - missing email', description: 'Create without email field', expectedResult: '400 Bad Request', type: 'API', portal: 'Admin' },
  { module: 'Contacts', testName: 'Update contact', description: 'Update job_title, department, phone', expectedResult: '200 OK with legal_entity_contact_id', type: 'API', portal: 'Admin' },
  { module: 'Contacts', testName: 'Update contact - change email', description: 'Update email address', expectedResult: '200 OK with new email', type: 'API', portal: 'Admin' },
  { module: 'Contacts', testName: 'Update contact - not found', description: 'Update non-existent contact', expectedResult: '404 Not Found', type: 'API', portal: 'Admin' },
  { module: 'Contacts', testName: 'Delete contact', description: 'Delete a contact', expectedResult: '204 No Content', type: 'API', portal: 'Admin' },
  { module: 'Contacts', testName: 'Delete contact - not found', description: 'Delete non-existent contact', expectedResult: '404 Not Found', type: 'API', portal: 'Admin' },

  // KvK Integration
  { module: 'KvK Integration', testName: 'Get KvK registry data', description: 'Fetch KvK data for entity (may not exist)', expectedResult: '200 OK with kvk_number OR 404 if not exists', type: 'API', portal: 'Admin' },
  { module: 'KvK Integration', testName: 'Get KvK registry data - invalid UUID', description: 'Request with malformed UUID', expectedResult: '400 Bad Request', type: 'API', portal: 'Admin' },
  { module: 'KvK Integration', testName: 'Get KvK registry data - entity not found', description: 'Request for non-existent entity', expectedResult: '404 Not Found', type: 'API', portal: 'Admin' },
  { module: 'KvK Integration', testName: 'Get KvK verification status', description: 'Check verification status for entity', expectedResult: '200 OK OR 404 if no verification', type: 'API', portal: 'Admin' },
  { module: 'KvK Integration', testName: 'Get flagged entities', description: 'Retrieve list of entities flagged for review', expectedResult: '200 OK with entities data', type: 'API', portal: 'Admin' },

  // Endpoints
  { module: 'Endpoints', testName: 'Get endpoints for entity', description: 'Retrieve all M2M endpoints for entity', expectedResult: '200 OK with array of endpoints', type: 'API', portal: 'Admin' },
  { module: 'Endpoints', testName: 'Get endpoints - invalid UUID', description: 'Request with malformed UUID', expectedResult: '400 Bad Request', type: 'API', portal: 'Admin' },
  { module: 'Endpoints', testName: 'Create REST API endpoint', description: 'Create endpoint with type=REST_API, auth=TOKEN', expectedResult: '201 Created with legal_entity_endpoint_id', type: 'API', portal: 'Admin' },
  { module: 'Endpoints', testName: 'Create webhook endpoint', description: 'Create endpoint with type=WEBHOOK, auth=HMAC', expectedResult: '201 Created with endpoint ID', type: 'API', portal: 'Admin' },
  { module: 'Endpoints', testName: 'Create endpoint - missing name', description: 'Create without endpoint_name', expectedResult: '400 Bad Request', type: 'API', portal: 'Admin' },
  { module: 'Endpoints', testName: 'Create endpoint - entity not found', description: 'Create for non-existent entity', expectedResult: '404 Not Found', type: 'API', portal: 'Admin' },
  { module: 'Endpoints', testName: 'Update endpoint', description: 'Update description, set is_active=false', expectedResult: '200 OK', type: 'API', portal: 'Admin' },
  { module: 'Endpoints', testName: 'Update endpoint - reactivate', description: 'Set is_active=true', expectedResult: '200 OK', type: 'API', portal: 'Admin' },
  { module: 'Endpoints', testName: 'Update endpoint - not found', description: 'Update non-existent endpoint', expectedResult: '404 Not Found', type: 'API', portal: 'Admin' },
  { module: 'Endpoints', testName: 'Issue endpoint token', description: 'Generate new access token for endpoint', expectedResult: '200 or 201 OK', type: 'API', portal: 'Admin' },
  { module: 'Endpoints', testName: 'Get endpoint tokens', description: 'Retrieve all tokens for an endpoint', expectedResult: '200 OK with tokens', type: 'API', portal: 'Admin' },

  // Audit Logs
  { module: 'Audit Logs', testName: 'Get audit logs', description: 'Retrieve paginated list of audit logs', expectedResult: '200 OK with data array', type: 'API', portal: 'Admin' },
  { module: 'Audit Logs', testName: 'Get audit logs with pagination', description: 'Retrieve logs with page=1&limit=10', expectedResult: '200 OK with pagination info', type: 'API', portal: 'Admin' },
  { module: 'Audit Logs', testName: 'Get audit logs by event type', description: 'Filter by event_type=MEMBER_CREATED', expectedResult: '200 OK with filtered results', type: 'API', portal: 'Admin' },
  { module: 'Audit Logs', testName: 'Get audit logs by severity', description: 'Filter by severity=INFO', expectedResult: '200 OK with filtered results', type: 'API', portal: 'Admin' },
  { module: 'Audit Logs', testName: 'Get audit logs by result', description: 'Filter by result=success', expectedResult: '200 OK with filtered results', type: 'API', portal: 'Admin' },
  { module: 'Audit Logs', testName: 'Get audit logs by resource type', description: 'Filter by resource_type=member', expectedResult: '200 OK with filtered results', type: 'API', portal: 'Admin' },
  { module: 'Audit Logs', testName: 'Get audit logs by action', description: 'Filter by action=create', expectedResult: '200 OK with filtered results', type: 'API', portal: 'Admin' },
  { module: 'Audit Logs', testName: 'Get audit logs by date range', description: 'Filter by start_date and end_date', expectedResult: '200 OK with filtered results', type: 'API', portal: 'Admin' },
  { module: 'Audit Logs', testName: 'Get audit logs - invalid event type', description: 'Filter with invalid event_type', expectedResult: '400 Bad Request', type: 'API', portal: 'Admin' },
  { module: 'Audit Logs', testName: 'Get audit logs - invalid severity', description: 'Filter with invalid severity', expectedResult: '400 Bad Request', type: 'API', portal: 'Admin' },
  { module: 'Audit Logs', testName: 'Get audit logs - invalid result', description: 'Filter with invalid result', expectedResult: '400 Bad Request', type: 'API', portal: 'Admin' },
  { module: 'Audit Logs', testName: 'Get audit logs - invalid resource type', description: 'Filter with invalid resource_type', expectedResult: '400 Bad Request', type: 'API', portal: 'Admin' },
  { module: 'Audit Logs', testName: 'Get audit logs - invalid date format', description: 'Filter with malformed date', expectedResult: '400 Bad Request', type: 'API', portal: 'Admin' },
  { module: 'Audit Logs', testName: 'Get audit logs - invalid date range', description: 'Filter where end_date < start_date', expectedResult: '400 Bad Request', type: 'API', portal: 'Admin' },
  { module: 'Audit Logs', testName: 'Get audit logs with multiple filters', description: 'Filter by resource_type + action + result', expectedResult: '200 OK with filtered results', type: 'API', portal: 'Admin' },

  // Member Portal - Member Profile
  { module: 'Member Profile', testName: 'Get authenticated member', description: 'Retrieve own profile via GET /member', expectedResult: '200 OK with legalEntityId, legalName', type: 'API', portal: 'Member' },
  { module: 'Member Profile', testName: 'Get member - no auth token', description: 'Request without authentication', expectedResult: '401 Unauthorized', type: 'API', portal: 'Member' },
  { module: 'Member Profile', testName: 'Get member - invalid token', description: 'Request with invalid/malformed token', expectedResult: '401 Unauthorized', type: 'API', portal: 'Member' },
  { module: 'Member Profile', testName: 'Profile contains required fields', description: 'Verify organizationId, legalName, status, legalEntityId', expectedResult: 'All fields present', type: 'API', portal: 'Member' },
  { module: 'Member Profile', testName: 'Profile includes registry identifiers', description: 'Verify identifierType, identifierValue in array', expectedResult: 'Array with proper structure', type: 'API', portal: 'Member' },
  { module: 'Member Profile', testName: 'Update profile - address fields', description: 'Update address_line1, postal_code, city, country_code', expectedResult: '200 OK with success message', type: 'API', portal: 'Member' },
  { module: 'Member Profile', testName: 'Update profile - domain', description: 'Update domain field', expectedResult: '200 OK', type: 'API', portal: 'Member' },
  { module: 'Member Profile', testName: 'Update profile - metadata', description: 'Update metadata object', expectedResult: '200 OK', type: 'API', portal: 'Member' },
  { module: 'Member Profile', testName: 'Update profile - empty body', description: 'Send empty update request', expectedResult: '200 OK (no changes)', type: 'API', portal: 'Member' },
  { module: 'Member Profile', testName: 'Update profile - no auth', description: 'Update without authentication', expectedResult: '401 Unauthorized', type: 'API', portal: 'Member' },

  // Member Portal - Member Contacts
  { module: 'Member Contacts', testName: 'Get own contacts', description: 'Retrieve contacts via GET /member-contacts', expectedResult: '200 OK with contacts array', type: 'API', portal: 'Member' },
  { module: 'Member Contacts', testName: 'Get contacts - no auth', description: 'Request without authentication', expectedResult: '401 Unauthorized', type: 'API', portal: 'Member' },
  { module: 'Member Contacts', testName: 'Get contacts - invalid token', description: 'Request with invalid token', expectedResult: '401 Unauthorized', type: 'API', portal: 'Member' },
  { module: 'Member Contacts', testName: 'Verify contact data structure', description: 'Check legal_entity_contact_id, legal_entity_id, email', expectedResult: 'Required fields present', type: 'API', portal: 'Member' },
  { module: 'Member Contacts', testName: 'Create TECHNICAL contact', description: 'POST /member/contacts with TECHNICAL type', expectedResult: '201 Created with contactId', type: 'API', portal: 'Member' },
  { module: 'Member Contacts', testName: 'Create BILLING contact', description: 'POST /member/contacts with BILLING type', expectedResult: '201 Created with contactId', type: 'API', portal: 'Member' },
  { module: 'Member Contacts', testName: 'Create ADMIN contact', description: 'POST /member/contacts with ADMIN type', expectedResult: '201 Created with contactId', type: 'API', portal: 'Member' },
  { module: 'Member Contacts', testName: 'Create contact - missing full_name', description: 'Create without full_name', expectedResult: '400 Bad Request', type: 'API', portal: 'Member' },
  { module: 'Member Contacts', testName: 'Create contact - missing email', description: 'Create without email', expectedResult: '400 or 500 (not-null constraint)', type: 'API', portal: 'Member' },
  { module: 'Member Contacts', testName: 'Create contact - no auth', description: 'Create without authentication', expectedResult: '401 Unauthorized', type: 'API', portal: 'Member' },
  { module: 'Member Contacts', testName: 'Verify created contacts in list', description: 'Check created contacts appear in GET', expectedResult: 'Contacts found in list', type: 'API', portal: 'Member' },
  { module: 'Member Contacts', testName: 'Update own contact', description: 'PUT /member/contacts/{id} with new data', expectedResult: '200 OK with success message', type: 'API', portal: 'Member' },
  { module: 'Member Contacts', testName: 'Update contact - change email', description: 'Update email address', expectedResult: '200 OK', type: 'API', portal: 'Member' },
  { module: 'Member Contacts', testName: 'Update contact - invalid UUID', description: 'Update with malformed UUID', expectedResult: '400 Bad Request', type: 'API', portal: 'Member' },
  { module: 'Member Contacts', testName: 'Update contact - not found (IDOR)', description: 'Update non-existent/other entity contact', expectedResult: '403 or 404', type: 'API', portal: 'Member' },
  { module: 'Member Contacts', testName: 'Contacts sorted by primary status', description: 'Primary contacts listed first', expectedResult: 'Proper ordering', type: 'API', portal: 'Member' },

  // Member Portal - Member Endpoints
  { module: 'Member Endpoints', testName: 'Get own endpoints', description: 'Retrieve endpoints via GET /member-endpoints', expectedResult: '200 OK with endpoints array', type: 'API', portal: 'Member' },
  { module: 'Member Endpoints', testName: 'Get endpoints - no auth', description: 'Request without authentication', expectedResult: '401 Unauthorized', type: 'API', portal: 'Member' },
  { module: 'Member Endpoints', testName: 'Get endpoints - invalid token', description: 'Request with invalid token', expectedResult: '401 Unauthorized', type: 'API', portal: 'Member' },
  { module: 'Member Endpoints', testName: 'Verify endpoint data structure', description: 'Check endpoint_id, legal_entity_id, name, url', expectedResult: 'Required fields present', type: 'API', portal: 'Member' },
  { module: 'Member Endpoints', testName: 'Create REST API endpoint', description: 'POST /member/endpoints with REST_API type', expectedResult: '201 Created with endpointId', type: 'API', portal: 'Member' },
  { module: 'Member Endpoints', testName: 'Create webhook endpoint', description: 'POST /member/endpoints with WEBHOOK type', expectedResult: '201 Created with endpointId', type: 'API', portal: 'Member' },
  { module: 'Member Endpoints', testName: 'Create GraphQL endpoint', description: 'POST /member/endpoints with GRAPHQL type', expectedResult: '201 Created with endpointId', type: 'API', portal: 'Member' },
  { module: 'Member Endpoints', testName: 'Create endpoint - missing name', description: 'Create without endpoint_name', expectedResult: '400 or 500', type: 'API', portal: 'Member' },
  { module: 'Member Endpoints', testName: 'Create endpoint - missing URL', description: 'Create without endpoint_url', expectedResult: '400 or 500', type: 'API', portal: 'Member' },
  { module: 'Member Endpoints', testName: 'Create endpoint - no auth', description: 'Create without authentication', expectedResult: '401 Unauthorized', type: 'API', portal: 'Member' },
  { module: 'Member Endpoints', testName: 'Verify created endpoints in list', description: 'Check created endpoints appear in GET', expectedResult: 'Endpoints found in list', type: 'API', portal: 'Member' },
  { module: 'Member Endpoints', testName: 'Get own tokens', description: 'Retrieve tokens via GET /member/tokens', expectedResult: '200 OK with tokens array', type: 'API', portal: 'Member' },
  { module: 'Member Endpoints', testName: 'Get tokens - no auth', description: 'Request without authentication', expectedResult: '401 Unauthorized', type: 'API', portal: 'Member' },
  { module: 'Member Endpoints', testName: 'All endpoints belong to same entity', description: 'IDOR check - all endpoints same legal_entity_id', expectedResult: 'No cross-entity data', type: 'API', portal: 'Member' },
  { module: 'Member Endpoints', testName: 'Only active endpoints returned', description: 'Verify is_deleted=false filter', expectedResult: 'No deleted endpoints', type: 'API', portal: 'Member' },

  // Member Portal - Authorization & IDOR Protection
  { module: 'Member Auth', testName: 'Get profile requires auth', description: 'GET /member without token', expectedResult: '401 Unauthorized', type: 'API', portal: 'Member' },
  { module: 'Member Auth', testName: 'Update profile requires auth', description: 'PUT /member/profile without token', expectedResult: '401 Unauthorized', type: 'API', portal: 'Member' },
  { module: 'Member Auth', testName: 'Get contacts requires auth', description: 'GET /member-contacts without token', expectedResult: '401 Unauthorized', type: 'API', portal: 'Member' },
  { module: 'Member Auth', testName: 'Create contact requires auth', description: 'POST /member/contacts without token', expectedResult: '401 Unauthorized', type: 'API', portal: 'Member' },
  { module: 'Member Auth', testName: 'Get endpoints requires auth', description: 'GET /member-endpoints without token', expectedResult: '401 Unauthorized', type: 'API', portal: 'Member' },
  { module: 'Member Auth', testName: 'Create endpoint requires auth', description: 'POST /member/endpoints without token', expectedResult: '401 Unauthorized', type: 'API', portal: 'Member' },
  { module: 'Member Auth', testName: 'Get tokens requires auth', description: 'GET /member/tokens without token', expectedResult: '401 Unauthorized', type: 'API', portal: 'Member' },
  { module: 'Member Auth', testName: 'Invalid token format rejected', description: 'Request with invalid JWT', expectedResult: '401 Unauthorized', type: 'API', portal: 'Member' },
  { module: 'Member Auth', testName: 'Malformed JWT rejected', description: 'Request with malformed JWT', expectedResult: '401 Unauthorized', type: 'API', portal: 'Member' },
  { module: 'Member IDOR', testName: 'Cannot update other entity contact', description: 'PUT with fake contact UUID', expectedResult: '403 or 404', type: 'API', portal: 'Member' },
  { module: 'Member IDOR', testName: 'Contacts scoped to own entity', description: 'Verify all contacts same legal_entity_id', expectedResult: 'No cross-entity data', type: 'API', portal: 'Member' },
  { module: 'Member IDOR', testName: 'Endpoints scoped to own entity', description: 'Verify all endpoints same legal_entity_id', expectedResult: 'No cross-entity data', type: 'API', portal: 'Member' },
  { module: 'Member IDOR', testName: 'Cannot list all members', description: 'GET /members with member token', expectedResult: 'Filtered or 403', type: 'API', portal: 'Member' },
  { module: 'Member Admin Only', testName: 'Cannot access audit logs', description: 'GET /audit-logs with member token', expectedResult: '403 or filtered', type: 'API', portal: 'Member' },
  { module: 'Member Admin Only', testName: 'Cannot create member', description: 'POST /members with member token', expectedResult: '403', type: 'API', portal: 'Member' },
  { module: 'Member Admin Only', testName: 'Cannot get applications', description: 'GET /applications with member token', expectedResult: '403 or filtered', type: 'API', portal: 'Member' },
  { module: 'Member Admin Only', testName: 'Cannot get arbitrary legal entity', description: 'GET /legal-entities/{fakeId}', expectedResult: '403 or 404', type: 'API', portal: 'Member' },
  { module: 'Member Admin Only', testName: 'Cannot update arbitrary legal entity', description: 'PUT /legal-entities/{fakeId}', expectedResult: '403 or 404', type: 'API', portal: 'Member' },
  { module: 'Member Admin Only', testName: 'Cannot delete arbitrary contact', description: 'DELETE /contacts/{fakeId}', expectedResult: '403 or 404', type: 'API', portal: 'Member' },
  { module: 'Member Admin Only', testName: 'Cannot delete arbitrary identifier', description: 'DELETE /identifiers/{fakeId}', expectedResult: '403 or 404', type: 'API', portal: 'Member' },
  { module: 'Member Validation', testName: 'Invalid UUID rejected - contacts', description: 'PUT /member/contacts/not-a-uuid', expectedResult: '400 Bad Request', type: 'API', portal: 'Member' },
  { module: 'Member Validation', testName: 'SQL injection in UUID rejected', description: 'PUT with SQL injection in UUID', expectedResult: '400 or 404', type: 'API', portal: 'Member' },
  { module: 'Member Validation', testName: 'XSS in profile data sanitized', description: 'PUT with XSS payload', expectedResult: '200 OK (sanitized)', type: 'API', portal: 'Member' },
  { module: 'Member Permissions', testName: 'Cannot self-escalate to admin', description: 'PUT /member/profile with role=SystemAdmin', expectedResult: '200 or 400 (field ignored)', type: 'API', portal: 'Member' },
  { module: 'Member Permissions', testName: 'Cannot approve applications', description: 'POST /applications/{id}/approve', expectedResult: '403 or 404', type: 'API', portal: 'Member' },
  { module: 'Member Permissions', testName: 'Cannot update member status', description: 'PUT /members/{id}/status', expectedResult: '403 or 404', type: 'API', portal: 'Member' },
  { module: 'Member Cross-Entity', testName: 'Cannot specify other entity for contact', description: 'POST with different legal_entity_id', expectedResult: '201 (own entity) or 400/403', type: 'API', portal: 'Member' },
  { module: 'Member Cross-Entity', testName: 'Cannot specify other entity for endpoint', description: 'POST with different legal_entity_id', expectedResult: '201 (own entity) or 400/403', type: 'API', portal: 'Member' },
  { module: 'Member Abuse', testName: 'Multiple rapid requests handled', description: '5 concurrent GET /member requests', expectedResult: 'All 200 OK', type: 'API', portal: 'Member' },
];

// E2E Tests Data
const e2eTests = [
  // Member Management
  { module: 'Member Management', testName: 'Display members grid with data', description: 'Navigate to Members page and verify grid loads', expectedResult: 'Grid visible with >0 rows', type: 'E2E', portal: 'Admin', file: 'member-management.spec.ts' },
  { module: 'Member Management', testName: 'Correct column headers', description: 'Verify grid has Legal Name, Status, Country, Type columns', expectedResult: 'Columns visible', type: 'E2E', portal: 'Admin', file: 'member-management.spec.ts' },
  { module: 'Member Management', testName: 'Call GetMembers API endpoint', description: 'Monitor network for successful API call', expectedResult: '200 OK on /all-members', type: 'E2E', portal: 'Admin', file: 'member-management.spec.ts' },
  { module: 'Member Management', testName: 'Display member count statistics', description: 'Check for pagination info', expectedResult: 'Pager info visible', type: 'E2E', portal: 'Admin', file: 'member-management.spec.ts' },
  { module: 'Member Management', testName: 'Handle empty search results', description: 'Search for non-existent member', expectedResult: 'Empty state or no results message', type: 'E2E', portal: 'Admin', file: 'member-management.spec.ts' },
  { module: 'Member Management', testName: 'Open member details on row click', description: 'Click grid row', expectedResult: 'Details view/dialog opens', type: 'E2E', portal: 'Admin', file: 'member-management.spec.ts' },
  { module: 'Member Management', testName: 'Call GetMember API endpoint', description: 'Monitor network for member fetch', expectedResult: 'API call for specific member', type: 'E2E', portal: 'Admin', file: 'member-management.spec.ts' },
  { module: 'Member Management', testName: 'Display member identifiers', description: 'View identifiers section in details', expectedResult: 'Identifiers section visible', type: 'E2E', portal: 'Admin', file: 'member-management.spec.ts' },
  { module: 'Member Management', testName: 'Display member contacts', description: 'View contacts section in details', expectedResult: 'Contacts section visible', type: 'E2E', portal: 'Admin', file: 'member-management.spec.ts' },
  { module: 'Member Management', testName: 'Display member endpoints', description: 'View endpoints section in details', expectedResult: 'Endpoints section visible', type: 'E2E', portal: 'Admin', file: 'member-management.spec.ts' },
  { module: 'Member Management', testName: 'Open new member registration form', description: 'Click Register New Member button', expectedResult: 'Form/dialog opens', type: 'E2E', portal: 'Admin', file: 'member-management.spec.ts' },
  { module: 'Member Management', testName: 'Required fields in registration form', description: 'Check for Legal Name, Country, Type, Email fields', expectedResult: 'Fields present', type: 'E2E', portal: 'Admin', file: 'member-management.spec.ts' },
  { module: 'Member Management', testName: 'Validate required fields on submit', description: 'Submit empty form', expectedResult: 'Validation errors shown', type: 'E2E', portal: 'Admin', file: 'member-management.spec.ts' },
  { module: 'Member Management', testName: 'Allow closing the form', description: 'Click Cancel/Close button', expectedResult: 'Form closes', type: 'E2E', portal: 'Admin', file: 'member-management.spec.ts' },
  { module: 'Member Management', testName: 'Open edit form for existing member', description: 'Click Edit button in details', expectedResult: 'Edit form opens', type: 'E2E', portal: 'Admin', file: 'member-management.spec.ts' },
  { module: 'Member Management', testName: 'Pre-populate form with existing data', description: 'Open edit form', expectedResult: 'Inputs have existing values', type: 'E2E', portal: 'Admin', file: 'member-management.spec.ts' },
  { module: 'Member Management', testName: 'Display member status badges', description: 'View grid', expectedResult: 'Status badges visible', type: 'E2E', portal: 'Admin', file: 'member-management.spec.ts' },
  { module: 'Member Management', testName: 'Filter members by status', description: 'Use status filter dropdown', expectedResult: 'Grid filtered by status', type: 'E2E', portal: 'Admin', file: 'member-management.spec.ts' },
  { module: 'Member Management', testName: 'Allow changing member status', description: 'Access status change control', expectedResult: 'Status dropdown/buttons available', type: 'E2E', portal: 'Admin', file: 'member-management.spec.ts' },
  { module: 'Member Management', testName: 'Handle 404 errors gracefully', description: 'Monitor for API errors', expectedResult: 'No 404 errors during navigation', type: 'E2E', portal: 'Admin', file: 'member-management.spec.ts' },
  { module: 'Member Management', testName: 'Handle 500 errors gracefully', description: 'Monitor for server errors', expectedResult: 'No 500 errors during navigation', type: 'E2E', portal: 'Admin', file: 'member-management.spec.ts' },
  { module: 'Member Management', testName: 'Display error toast for failed operations', description: 'Monitor for toast notifications', expectedResult: 'Toast shown on error', type: 'E2E', portal: 'Admin', file: 'member-management.spec.ts' },

  // Contacts Manager
  { module: 'Contacts Manager', testName: 'Display contacts grid', description: 'View contacts section', expectedResult: 'Grid visible', type: 'E2E', portal: 'Admin', file: 'managers-crud.spec.ts' },
  { module: 'Contacts Manager', testName: 'Contact role types', description: 'Check for PRIMARY, TECHNICAL, BILLING, SUPPORT', expectedResult: 'Roles available in dropdown', type: 'E2E', portal: 'Admin', file: 'managers-crud.spec.ts' },
  { module: 'Contacts Manager', testName: 'Empty state when no contacts', description: 'New entity without contacts', expectedResult: 'Empty state message', type: 'E2E', portal: 'Admin', file: 'managers-crud.spec.ts' },
  { module: 'Contacts Manager', testName: 'ConfirmDialog for deletions', description: 'Click delete button', expectedResult: 'Confirmation dialog appears', type: 'E2E', portal: 'Admin', file: 'managers-crud.spec.ts' },
  { module: 'Contacts Manager', testName: 'Validate required fields', description: 'Submit empty contact form', expectedResult: 'Validation errors shown', type: 'E2E', portal: 'Admin', file: 'managers-crud.spec.ts' },

  // Endpoints Manager
  { module: 'Endpoints Manager', testName: 'Display endpoints grid', description: 'View endpoints section', expectedResult: 'Grid visible', type: 'E2E', portal: 'Admin', file: 'managers-crud.spec.ts' },
  { module: 'Endpoints Manager', testName: 'Open create endpoint dialog', description: 'Click Add Endpoint', expectedResult: 'Dialog opens', type: 'E2E', portal: 'Admin', file: 'managers-crud.spec.ts' },
  { module: 'Endpoints Manager', testName: 'Token association with endpoints', description: 'Check for token field', expectedResult: 'Token association field visible', type: 'E2E', portal: 'Admin', file: 'managers-crud.spec.ts' },
  { module: 'Endpoints Manager', testName: 'Validate endpoint URL format', description: 'Enter invalid URL', expectedResult: 'Validation error shown', type: 'E2E', portal: 'Admin', file: 'managers-crud.spec.ts' },

  // Tokens Manager
  { module: 'Tokens Manager', testName: 'Display tokens grid', description: 'View tokens section', expectedResult: 'Grid visible', type: 'E2E', portal: 'Admin', file: 'managers-crud.spec.ts' },
  { module: 'Tokens Manager', testName: 'Status badges', description: 'Check for Active, Expiring, Expired, Revoked', expectedResult: 'Status badges present', type: 'E2E', portal: 'Admin', file: 'managers-crud.spec.ts' },
  { module: 'Tokens Manager', testName: 'Copy token to clipboard', description: 'Find copy button', expectedResult: 'Copy button available', type: 'E2E', portal: 'Admin', file: 'managers-crud.spec.ts' },
  { module: 'Tokens Manager', testName: 'Filter tokens by endpoint', description: 'Find filter dropdown', expectedResult: 'Filter available', type: 'E2E', portal: 'Admin', file: 'managers-crud.spec.ts' },
  { module: 'Tokens Manager', testName: 'Revoke tokens', description: 'Click revoke button', expectedResult: 'Confirmation dialog appears', type: 'E2E', portal: 'Admin', file: 'managers-crud.spec.ts' },
  { module: 'Tokens Manager', testName: 'Issue new tokens', description: 'Click Issue/Generate button', expectedResult: 'Issue dialog opens', type: 'E2E', portal: 'Admin', file: 'managers-crud.spec.ts' },

  // Accessibility
  { module: 'Accessibility', testName: 'Navigate using Tab key', description: 'Press Tab multiple times', expectedResult: 'Focus moves between elements', type: 'E2E', portal: 'Admin', file: 'accessibility.spec.ts' },
  { module: 'Accessibility', testName: 'Activate buttons with Enter', description: 'Press Enter on focused button', expectedResult: 'Button action triggered', type: 'E2E', portal: 'Admin', file: 'accessibility.spec.ts' },
  { module: 'Accessibility', testName: 'Activate buttons with Space', description: 'Press Space on focused button', expectedResult: 'Button action triggered', type: 'E2E', portal: 'Admin', file: 'accessibility.spec.ts' },
  { module: 'Accessibility', testName: 'Visible focus indicators', description: 'Tab to element', expectedResult: 'Focus ring visible', type: 'E2E', portal: 'Admin', file: 'accessibility.spec.ts' },
  { module: 'Accessibility', testName: 'ARIA labels on interactive elements', description: 'Check buttons', expectedResult: 'aria-label attributes present', type: 'E2E', portal: 'Admin', file: 'accessibility.spec.ts' },
  { module: 'Accessibility', testName: 'Semantic HTML roles', description: 'Check for grid, button, dialog, etc.', expectedResult: 'Semantic roles present', type: 'E2E', portal: 'Admin', file: 'accessibility.spec.ts' },
  { module: 'Accessibility', testName: 'Descriptive page title', description: 'Check document title', expectedResult: 'Title present', type: 'E2E', portal: 'Admin', file: 'accessibility.spec.ts' },
  { module: 'Accessibility', testName: 'Landmark regions', description: 'Check for main, nav, etc.', expectedResult: 'Landmarks present', type: 'E2E', portal: 'Admin', file: 'accessibility.spec.ts' },
  { module: 'Accessibility', testName: 'Heading hierarchy', description: 'Check h1-h6 structure', expectedResult: 'Proper heading levels', type: 'E2E', portal: 'Admin', file: 'accessibility.spec.ts' },
  { module: 'Accessibility', testName: 'Badge contrast (4.5:1 minimum)', description: 'Check badge colors', expectedResult: 'Sufficient contrast', type: 'E2E', portal: 'Admin', file: 'accessibility.spec.ts' },
  { module: 'Accessibility', testName: 'WCAG 2.1 Level AA summary', description: 'Overall compliance check', expectedResult: 'Summary logged', type: 'E2E', portal: 'Admin', file: 'accessibility.spec.ts' },

  // Grid Pagination
  { module: 'Grid Pagination', testName: 'Persist page number in URL', description: 'Change to page 2', expectedResult: 'URL contains page=2', type: 'E2E', portal: 'Admin', file: 'grid-pagination.spec.ts' },
  { module: 'Grid Pagination', testName: 'Persist page size in URL', description: 'Change page size to 50', expectedResult: 'URL contains pageSize=50', type: 'E2E', portal: 'Admin', file: 'grid-pagination.spec.ts' },
  { module: 'Grid Pagination', testName: 'Preserve state across navigation', description: 'Navigate away and return', expectedResult: 'State maintained', type: 'E2E', portal: 'Admin', file: 'grid-pagination.spec.ts' },
  { module: 'Grid Pagination', testName: 'Load correct page from URL', description: 'Direct URL with ?page=2', expectedResult: 'Page 2 displayed', type: 'E2E', portal: 'Admin', file: 'grid-pagination.spec.ts' },
  { module: 'Grid Pagination', testName: 'Page number exceeds total', description: 'Navigate to page 9999', expectedResult: 'Handles gracefully', type: 'E2E', portal: 'Admin', file: 'grid-pagination.spec.ts' },

  // KvK Verification
  { module: 'KvK Verification', testName: 'GET verification status', description: 'Fetch KvK verification for entity', expectedResult: '200 OK with legal_entity_id', type: 'E2E', portal: 'Admin', file: 'kvk-verification.spec.ts' },
  { module: 'KvK Verification', testName: 'GET flagged entities', description: 'Admin review endpoint', expectedResult: '200 OK with array', type: 'E2E', portal: 'Admin', file: 'kvk-verification.spec.ts' },
  { module: 'KvK Verification', testName: 'Return 401 unauthenticated', description: 'Request without auth', expectedResult: '401 Unauthorized', type: 'E2E', portal: 'Admin', file: 'kvk-verification.spec.ts' },
  { module: 'KvK Verification', testName: 'Navigate to KvK Review Queue', description: 'Find and click navigation', expectedResult: 'Queue page loads', type: 'E2E', portal: 'Admin', file: 'kvk-verification.spec.ts' },
  { module: 'KvK Verification', testName: 'Display flag badges with colors', description: 'Check badge styling', expectedResult: 'Badges visible with colors', type: 'E2E', portal: 'Admin', file: 'kvk-verification.spec.ts' },
  { module: 'KvK Verification', testName: 'Compare KvK numbers', description: 'Entered vs extracted', expectedResult: 'Mismatch flagged correctly', type: 'E2E', portal: 'Admin', file: 'kvk-verification.spec.ts' },
  { module: 'KvK Verification', testName: 'No JavaScript errors', description: 'Monitor console', expectedResult: 'No console errors', type: 'E2E', portal: 'Admin', file: 'kvk-verification.spec.ts' },
  { module: 'KvK Verification', testName: 'Red badges for entered mismatches', description: 'Check badge colors', expectedResult: 'Red background', type: 'E2E', portal: 'Admin', file: 'kvk-verification.spec.ts' },

  // Basic Authentication - Admin
  { module: 'Authentication', testName: 'Load with authenticated state', description: 'Navigate to /', expectedResult: 'Not redirected to Azure AD', type: 'E2E', portal: 'Admin', file: 'basic-authentication.spec.ts' },
  { module: 'Authentication', testName: 'Display dashboard navigation', description: 'Check sidebar elements', expectedResult: 'Dashboard, Members, Settings visible', type: 'E2E', portal: 'Admin', file: 'basic-authentication.spec.ts' },
  { module: 'Authentication', testName: 'Navigate to Members page', description: 'Click Members link', expectedResult: 'Content loads', type: 'E2E', portal: 'Admin', file: 'basic-authentication.spec.ts' },
  { module: 'Authentication', testName: 'Valid MSAL tokens in sessionStorage', description: 'Check for msal keys', expectedResult: 'Tokens present', type: 'E2E', portal: 'Admin', file: 'basic-authentication.spec.ts' },
  { module: 'Authentication', testName: 'No critical console errors', description: 'Monitor console', expectedResult: '<10 critical errors', type: 'E2E', portal: 'Admin', file: 'basic-authentication.spec.ts' },

  // Portal Smoke Test
  { module: 'Smoke Test', testName: 'Admin Portal loads without white page', description: 'Check page content', expectedResult: '>100 chars content, buttons present', type: 'E2E', portal: 'Admin', file: 'portal-smoke-test.spec.ts' },
  { module: 'Smoke Test', testName: 'Member Portal loads without white page', description: 'Check page content', expectedResult: '>100 chars content, buttons present', type: 'E2E', portal: 'Member', file: 'portal-smoke-test.spec.ts' },
  { module: 'Smoke Test', testName: 'Admin Portal i18n initialized', description: 'Check window object', expectedResult: 'No Suspense indicators stuck', type: 'E2E', portal: 'Admin', file: 'portal-smoke-test.spec.ts' },
  { module: 'Smoke Test', testName: 'Member Portal i18n initialized', description: 'Check window object', expectedResult: 'No Suspense indicators stuck', type: 'E2E', portal: 'Member', file: 'portal-smoke-test.spec.ts' },

  // Member Portal - Authentication (11 tests)
  { module: 'Member Auth', testName: 'Load with authenticated state', description: 'Navigate to /', expectedResult: 'Not redirected to Azure AD', type: 'E2E', portal: 'Member', file: 'authentication.spec.ts' },
  { module: 'Member Auth', testName: 'Display CTN branding', description: 'Check for branding elements', expectedResult: 'CTN visible', type: 'E2E', portal: 'Member', file: 'authentication.spec.ts' },
  { module: 'Member Auth', testName: 'Bearer token in API requests', description: 'Monitor network requests', expectedResult: 'Authorization header present', type: 'E2E', portal: 'Member', file: 'authentication.spec.ts' },
  { module: 'Member Auth', testName: 'Session persistence on reload', description: 'Reload page', expectedResult: 'Session maintained', type: 'E2E', portal: 'Member', file: 'authentication.spec.ts' },
  { module: 'Member Auth', testName: 'MSAL tokens in sessionStorage', description: 'Check storage', expectedResult: 'Token keys present', type: 'E2E', portal: 'Member', file: 'authentication.spec.ts' },
  { module: 'Member Auth', testName: 'Access token not exposed in URL', description: 'Check URL', expectedResult: 'No token in URL', type: 'E2E', portal: 'Member', file: 'authentication.spec.ts' },
  { module: 'Member Auth', testName: 'Sign out button visible', description: 'Check UI', expectedResult: 'Sign out available', type: 'E2E', portal: 'Member', file: 'authentication.spec.ts' },
  { module: 'Member Auth', testName: 'No critical console errors', description: 'Monitor console', expectedResult: '<10 critical errors', type: 'E2E', portal: 'Member', file: 'authentication.spec.ts' },

  // Member Portal - Dashboard (19 tests)
  { module: 'Member Dashboard', testName: 'Display dashboard on load', description: 'Navigate to /', expectedResult: 'Dashboard visible', type: 'E2E', portal: 'Member', file: 'dashboard.spec.ts' },
  { module: 'Member Dashboard', testName: 'Organization name visible', description: 'Check header', expectedResult: 'Org name displayed', type: 'E2E', portal: 'Member', file: 'dashboard.spec.ts' },
  { module: 'Member Dashboard', testName: 'Status badge visible', description: 'Check status indicator', expectedResult: 'Status badge present', type: 'E2E', portal: 'Member', file: 'dashboard.spec.ts' },
  { module: 'Member Dashboard', testName: 'Membership tier display', description: 'Check tier info', expectedResult: 'Tier displayed', type: 'E2E', portal: 'Member', file: 'dashboard.spec.ts' },
  { module: 'Member Dashboard', testName: 'Stats cards - contacts count', description: 'Check contacts stat', expectedResult: 'Count displayed', type: 'E2E', portal: 'Member', file: 'dashboard.spec.ts' },
  { module: 'Member Dashboard', testName: 'Stats cards - endpoints count', description: 'Check endpoints stat', expectedResult: 'Count displayed', type: 'E2E', portal: 'Member', file: 'dashboard.spec.ts' },
  { module: 'Member Dashboard', testName: 'Registry identifiers section', description: 'Check identifiers', expectedResult: 'Identifiers visible', type: 'E2E', portal: 'Member', file: 'dashboard.spec.ts' },
  { module: 'Member Dashboard', testName: 'Navigation sidebar visible', description: 'Check sidebar', expectedResult: 'Nav items present', type: 'E2E', portal: 'Member', file: 'dashboard.spec.ts' },

  // Member Portal - Profile (19 tests)
  { module: 'Member Profile', testName: 'Display organization details', description: 'View profile section', expectedResult: 'Details visible', type: 'E2E', portal: 'Member', file: 'profile.spec.ts' },
  { module: 'Member Profile', testName: 'Edit button opens modal', description: 'Click Edit', expectedResult: 'Modal opens', type: 'E2E', portal: 'Member', file: 'profile.spec.ts' },
  { module: 'Member Profile', testName: 'Form pre-populated', description: 'Open edit modal', expectedResult: 'Existing values shown', type: 'E2E', portal: 'Member', file: 'profile.spec.ts' },
  { module: 'Member Profile', testName: 'Update address fields', description: 'Edit address', expectedResult: 'Changes saved', type: 'E2E', portal: 'Member', file: 'profile.spec.ts' },
  { module: 'Member Profile', testName: 'Cancel closes modal', description: 'Click Cancel', expectedResult: 'Modal closes, no changes', type: 'E2E', portal: 'Member', file: 'profile.spec.ts' },
  { module: 'Member Profile', testName: 'Validation - required fields', description: 'Submit empty', expectedResult: 'Errors shown', type: 'E2E', portal: 'Member', file: 'profile.spec.ts' },
  { module: 'Member Profile', testName: 'Success notification', description: 'Save changes', expectedResult: 'Toast shown', type: 'E2E', portal: 'Member', file: 'profile.spec.ts' },
  { module: 'Member Profile', testName: 'Country code dropdown', description: 'Check dropdown', expectedResult: 'Country codes available', type: 'E2E', portal: 'Member', file: 'profile.spec.ts' },

  // Member Portal - Contacts (22 tests)
  { module: 'Member Contacts', testName: 'Display contacts table', description: 'Navigate to contacts', expectedResult: 'Table visible', type: 'E2E', portal: 'Member', file: 'contacts.spec.ts' },
  { module: 'Member Contacts', testName: 'Table columns', description: 'Check headers', expectedResult: 'Name, Type, Email, Phone, Primary', type: 'E2E', portal: 'Member', file: 'contacts.spec.ts' },
  { module: 'Member Contacts', testName: 'Add contact button', description: 'Check UI', expectedResult: 'Button visible', type: 'E2E', portal: 'Member', file: 'contacts.spec.ts' },
  { module: 'Member Contacts', testName: 'Add contact modal', description: 'Click Add', expectedResult: 'Modal opens', type: 'E2E', portal: 'Member', file: 'contacts.spec.ts' },
  { module: 'Member Contacts', testName: 'Contact type dropdown', description: 'Check options', expectedResult: 'PRIMARY, TECHNICAL, BILLING, ADMIN', type: 'E2E', portal: 'Member', file: 'contacts.spec.ts' },
  { module: 'Member Contacts', testName: 'Create TECHNICAL contact', description: 'Fill form and save', expectedResult: 'Contact created', type: 'E2E', portal: 'Member', file: 'contacts.spec.ts' },
  { module: 'Member Contacts', testName: 'Edit contact', description: 'Click edit row', expectedResult: 'Edit modal opens', type: 'E2E', portal: 'Member', file: 'contacts.spec.ts' },
  { module: 'Member Contacts', testName: 'Delete with confirmation', description: 'Click delete', expectedResult: 'Confirm dialog shown', type: 'E2E', portal: 'Member', file: 'contacts.spec.ts' },
  { module: 'Member Contacts', testName: 'Validation - email format', description: 'Enter invalid email', expectedResult: 'Error shown', type: 'E2E', portal: 'Member', file: 'contacts.spec.ts' },
  { module: 'Member Contacts', testName: 'Empty state', description: 'No contacts', expectedResult: 'Empty message shown', type: 'E2E', portal: 'Member', file: 'contacts.spec.ts' },

  // Member Portal - Endpoints (16 tests)
  { module: 'Member Endpoints', testName: 'Display endpoints table', description: 'Navigate to endpoints', expectedResult: 'Table visible', type: 'E2E', portal: 'Member', file: 'endpoints.spec.ts' },
  { module: 'Member Endpoints', testName: 'Register endpoint button', description: 'Check UI', expectedResult: 'Button visible', type: 'E2E', portal: 'Member', file: 'endpoints.spec.ts' },
  { module: 'Member Endpoints', testName: 'Registration wizard', description: 'Click Register', expectedResult: 'Wizard opens', type: 'E2E', portal: 'Member', file: 'endpoints.spec.ts' },
  { module: 'Member Endpoints', testName: 'Endpoint type selection', description: 'Check options', expectedResult: 'REST_API, WEBHOOK, GRAPHQL', type: 'E2E', portal: 'Member', file: 'endpoints.spec.ts' },
  { module: 'Member Endpoints', testName: 'Create REST API endpoint', description: 'Complete wizard', expectedResult: 'Endpoint created', type: 'E2E', portal: 'Member', file: 'endpoints.spec.ts' },
  { module: 'Member Endpoints', testName: 'Status badges', description: 'Check indicators', expectedResult: 'Active/Inactive badges', type: 'E2E', portal: 'Member', file: 'endpoints.spec.ts' },
  { module: 'Member Endpoints', testName: 'Edit endpoint', description: 'Click edit', expectedResult: 'Edit form opens', type: 'E2E', portal: 'Member', file: 'endpoints.spec.ts' },

  // Member Portal - API Access (17 tests)
  { module: 'Member API Access', testName: 'Display API access page', description: 'Navigate to API', expectedResult: 'Page visible', type: 'E2E', portal: 'Member', file: 'api-access.spec.ts' },
  { module: 'Member API Access', testName: 'M2M clients section', description: 'Check section', expectedResult: 'Clients listed', type: 'E2E', portal: 'Member', file: 'api-access.spec.ts' },
  { module: 'Member API Access', testName: 'Legacy tokens section', description: 'Check section', expectedResult: 'Tokens listed', type: 'E2E', portal: 'Member', file: 'api-access.spec.ts' },
  { module: 'Member API Access', testName: 'OAuth 2.0 configuration', description: 'Check info', expectedResult: 'Client ID, scopes displayed', type: 'E2E', portal: 'Member', file: 'api-access.spec.ts' },
  { module: 'Member API Access', testName: 'Token status badges', description: 'Check indicators', expectedResult: 'Active/Expired badges', type: 'E2E', portal: 'Member', file: 'api-access.spec.ts' },

  // Member Portal - DNS Verification (21 tests)
  { module: 'Member DNS', testName: 'Display DNS verification page', description: 'Navigate to DNS', expectedResult: 'Page visible', type: 'E2E', portal: 'Member', file: 'dns-verification.spec.ts' },
  { module: 'Member DNS', testName: 'Token generation form', description: 'Check form', expectedResult: 'Domain input, generate button', type: 'E2E', portal: 'Member', file: 'dns-verification.spec.ts' },
  { module: 'Member DNS', testName: 'Generate verification token', description: 'Enter domain', expectedResult: 'Token generated', type: 'E2E', portal: 'Member', file: 'dns-verification.spec.ts' },
  { module: 'Member DNS', testName: 'TXT record instructions', description: 'Check display', expectedResult: 'DNS record shown', type: 'E2E', portal: 'Member', file: 'dns-verification.spec.ts' },
  { module: 'Member DNS', testName: 'Copy verification token', description: 'Click copy', expectedResult: 'Copied to clipboard', type: 'E2E', portal: 'Member', file: 'dns-verification.spec.ts' },

  // Member Portal - Support (21 tests)
  { module: 'Member Support', testName: 'Display support page', description: 'Navigate to support', expectedResult: 'Page visible', type: 'E2E', portal: 'Member', file: 'support.spec.ts' },
  { module: 'Member Support', testName: 'Contact support info', description: 'Check section', expectedResult: 'Email, phone visible', type: 'E2E', portal: 'Member', file: 'support.spec.ts' },
  { module: 'Member Support', testName: 'Documentation links', description: 'Check links', expectedResult: 'Docs links work', type: 'E2E', portal: 'Member', file: 'support.spec.ts' },
  { module: 'Member Support', testName: 'System status indicator', description: 'Check status', expectedResult: 'Status badge visible', type: 'E2E', portal: 'Member', file: 'support.spec.ts' },
  { module: 'Member Support', testName: 'FAQ section', description: 'Check FAQs', expectedResult: 'Questions visible', type: 'E2E', portal: 'Member', file: 'support.spec.ts' },

  // Member Portal - Accessibility (19 tests)
  { module: 'Member A11y', testName: 'Landmark regions', description: 'Check main, header, nav, footer', expectedResult: 'Landmarks present', type: 'E2E', portal: 'Member', file: 'accessibility.spec.ts' },
  { module: 'Member A11y', testName: 'Focus indicators visible', description: 'Tab through page', expectedResult: 'Focus rings visible', type: 'E2E', portal: 'Member', file: 'accessibility.spec.ts' },
  { module: 'Member A11y', testName: 'Images have alt text', description: 'Check img elements', expectedResult: 'Alt attributes present', type: 'E2E', portal: 'Member', file: 'accessibility.spec.ts' },
  { module: 'Member A11y', testName: 'Form inputs have labels', description: 'Check inputs', expectedResult: 'Labels associated', type: 'E2E', portal: 'Member', file: 'accessibility.spec.ts' },
  { module: 'Member A11y', testName: 'Heading hierarchy', description: 'Check h1-h6', expectedResult: 'Proper structure', type: 'E2E', portal: 'Member', file: 'accessibility.spec.ts' },
  { module: 'Member A11y', testName: 'Keyboard navigation', description: 'Tab through UI', expectedResult: 'All interactive reachable', type: 'E2E', portal: 'Member', file: 'accessibility.spec.ts' },
  { module: 'Member A11y', testName: 'Escape closes modals', description: 'Open modal, press Esc', expectedResult: 'Modal closes', type: 'E2E', portal: 'Member', file: 'accessibility.spec.ts' },

  // Member Portal - Error Handling (16 tests)
  { module: 'Member Errors', testName: 'No JavaScript errors', description: 'Monitor console', expectedResult: 'No critical errors', type: 'E2E', portal: 'Member', file: 'error-handling.spec.ts' },
  { module: 'Member Errors', testName: 'API 500 error display', description: 'Intercept with 500', expectedResult: 'Error message shown', type: 'E2E', portal: 'Member', file: 'error-handling.spec.ts' },
  { module: 'Member Errors', testName: 'API 404 error handling', description: 'Intercept with 404', expectedResult: 'Graceful handling', type: 'E2E', portal: 'Member', file: 'error-handling.spec.ts' },
  { module: 'Member Errors', testName: 'Form validation errors', description: 'Submit invalid', expectedResult: 'Field errors shown', type: 'E2E', portal: 'Member', file: 'error-handling.spec.ts' },
  { module: 'Member Errors', testName: 'Empty states', description: 'No data', expectedResult: 'Empty message shown', type: 'E2E', portal: 'Member', file: 'error-handling.spec.ts' },

  // Member Portal - Responsive (25 tests)
  { module: 'Member Responsive', testName: 'Mobile 375px - layout', description: 'iPhone SE viewport', expectedResult: 'Content fits, no overflow', type: 'E2E', portal: 'Member', file: 'responsive.spec.ts' },
  { module: 'Member Responsive', testName: 'Mobile 375px - navigation', description: 'Check nav', expectedResult: 'Hamburger menu', type: 'E2E', portal: 'Member', file: 'responsive.spec.ts' },
  { module: 'Member Responsive', testName: 'Mobile 375px - touch targets', description: 'Check buttons', expectedResult: 'Min 44px', type: 'E2E', portal: 'Member', file: 'responsive.spec.ts' },
  { module: 'Member Responsive', testName: 'Tablet 768px - layout', description: 'iPad viewport', expectedResult: 'Responsive grid', type: 'E2E', portal: 'Member', file: 'responsive.spec.ts' },
  { module: 'Member Responsive', testName: 'Desktop 1920px - layout', description: 'Full HD', expectedResult: 'Full width utilized', type: 'E2E', portal: 'Member', file: 'responsive.spec.ts' },
];

// Create workbook
const workbook = XLSX.utils.book_new();

// Create API Tests sheet
const apiSheet = XLSX.utils.json_to_sheet(apiTests.map((test, index) => ({
  '#': index + 1,
  'Module': test.module,
  'Test Name': test.testName,
  'Description': test.description,
  'Expected Result': test.expectedResult,
  'Type': test.type,
  'Portal': test.portal
})));

// Set column widths for API sheet
apiSheet['!cols'] = [
  { wch: 5 },   // #
  { wch: 18 },  // Module
  { wch: 40 },  // Test Name
  { wch: 60 },  // Description
  { wch: 45 },  // Expected Result
  { wch: 8 },   // Type
  { wch: 8 }    // Portal
];

XLSX.utils.book_append_sheet(workbook, apiSheet, 'API Tests');

// Create E2E Tests sheet
const e2eSheet = XLSX.utils.json_to_sheet(e2eTests.map((test, index) => ({
  '#': index + 1,
  'Module': test.module,
  'Test Name': test.testName,
  'Description': test.description,
  'Expected Result': test.expectedResult,
  'Type': test.type,
  'Portal': test.portal,
  'File': test.file
})));

// Set column widths for E2E sheet
e2eSheet['!cols'] = [
  { wch: 5 },   // #
  { wch: 20 },  // Module
  { wch: 40 },  // Test Name
  { wch: 50 },  // Description
  { wch: 40 },  // Expected Result
  { wch: 8 },   // Type
  { wch: 8 },   // Portal
  { wch: 30 }   // File
];

XLSX.utils.book_append_sheet(workbook, e2eSheet, 'E2E Tests');

// Create Summary sheet
const summaryData = [
  { 'Category': 'API Tests', 'Count': apiTests.length },
  { 'Category': 'E2E Tests', 'Count': e2eTests.length },
  { 'Category': 'Total Tests', 'Count': apiTests.length + e2eTests.length },
  { 'Category': '', 'Count': '' },
  { 'Category': 'API Tests by Module', 'Count': '' },
  ...['Members', 'Legal Entities', 'Identifiers', 'Contacts', 'KvK Integration', 'Endpoints', 'Audit Logs'].map(module => ({
    'Category': `  ${module}`,
    'Count': apiTests.filter(t => t.module === module).length
  })),
  { 'Category': '', 'Count': '' },
  { 'Category': 'E2E Tests by Portal', 'Count': '' },
  { 'Category': '  Admin Portal', 'Count': e2eTests.filter(t => t.portal === 'Admin').length },
  { 'Category': '  Member Portal', 'Count': e2eTests.filter(t => t.portal === 'Member').length },
];

const summarySheet = XLSX.utils.json_to_sheet(summaryData);
summarySheet['!cols'] = [
  { wch: 30 },
  { wch: 10 }
];

XLSX.utils.book_append_sheet(workbook, summarySheet, 'Summary');

// Write the file
const outputPath = path.join(__dirname, 'CTN_ASR_Test_Catalog.xlsx');
XLSX.writeFile(workbook, outputPath);

console.log(`\n✅ Excel test catalog generated: ${outputPath}`);
console.log(`   - API Tests: ${apiTests.length}`);
console.log(`   - E2E Tests: ${e2eTests.length}`);
console.log(`   - Total: ${apiTests.length + e2eTests.length}`);
