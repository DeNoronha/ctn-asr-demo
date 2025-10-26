# Implementation Plan: M2M Client Management

## Overview
**Goal**: Integrate M2M (Machine-to-Machine) authentication management into admin portal
**Estimated Stages**: 5
**Branch**: feature/m2m-authentication

---

## Stage 1: Database Schema
**Goal**: Create M2M client tables with audit logging
**Success Criteria**:
- [ ] m2m_clients table created with FK to legal_entities
- [ ] m2m_client_secrets_audit table created
- [ ] Indexes added for performance
- [ ] Migration tested in dev environment

**Tests**:
- Migration runs without errors
- Tables created with correct schema
- Foreign key constraints work

**Status**: Completed

**Implementation Notes**:
- Follow existing migration pattern from 001-enhanced-schema.sql
- Use UUID for primary keys
- Store Azure AD client IDs and object IDs
- NEVER store actual secrets, only audit metadata
- Support scope arrays: ['ETA.Read', 'Container.Read', etc.]

---

## Stage 2: Backend API Endpoints
**Goal**: Create ManageM2MClients.ts with CRUD operations
**Success Criteria**:
- [x] GET /api/v1/legal-entities/{id}/m2m-clients - List clients
- [x] POST /api/v1/legal-entities/{id}/m2m-clients - Create client
- [x] POST /api/v1/m2m-clients/{id}/generate-secret - Generate secret
- [x] DELETE /api/v1/m2m-clients/{id} - Deactivate client
- [x] PATCH /api/v1/m2m-clients/{id}/scopes - Update scopes
- [x] All endpoints authenticated and authorized
- [x] Audit logging for all operations

**Tests**:
- curl tests for each endpoint (API tests FIRST)
- Test authentication/authorization
- Test Azure AD integration
- Test error handling

**Status**: Completed

**Implementation Notes**:
- Follow pattern from CreateIdentifier.ts for auth/audit
- Use endpointWrapper for consistent auth
- Integrate with Azure CLI for app registration creation
- Store client_id and object_id in database
- Return secrets only once (never store in DB)
- Follow IDOR prevention (security lesson #18)

---

## Stage 3: Admin Portal UI Component
**Goal**: Create M2MClientsManager.tsx component
**Success Criteria**:
- [ ] Grid showing M2M clients with all details
- [ ] "Add M2M Client" dialog with form
- [ ] Scope selection checkboxes
- [ ] "Generate Secret" with one-time display
- [ ] "Revoke" button for deactivation
- [ ] Proper error handling and notifications
- [ ] Loading states

**Tests**:
- Playwright E2E tests for full workflow
- Test create → generate secret → revoke
- Test scope selection
- Test error scenarios

**Status**: Pending

**Implementation Notes**:
- Follow pattern from IdentifiersManager.tsx
- Use Kendo UI Grid and Dialog components
- Add tab to MemberDetailView.tsx
- Update apiV2.ts with M2M client methods
- Show warning: "Save this secret - it won't be shown again"
- Copy-to-clipboard functionality

---

## Stage 4: Dummy Data Generation
**Goal**: Create realistic M2M clients for existing members
**Success Criteria**:
- [ ] Script creates 1-2 M2M clients per member
- [ ] Realistic client names and descriptions
- [ ] Appropriate scopes based on member type
- [ ] Data stored in database
- [ ] Script idempotent (can run multiple times)

**Tests**:
- Script runs without errors
- M2M clients visible in admin portal
- Scopes assigned correctly

**Status**: Pending

**Implementation Notes**:
- Create bash script in api/scripts/
- Query existing members from database
- Use Azure CLI to create app registrations
- Store metadata in m2m_clients table
- Examples: "Contargo ETA Service", "Van Berkel Container Tracker"

---

## Stage 5: Integration & Testing
**Goal**: End-to-end testing and documentation
**Success Criteria**:
- [ ] All API tests passing (curl)
- [ ] All E2E tests passing (Playwright)
- [ ] TE agent validates all workflows
- [ ] Documentation updated
- [ ] Feature branch ready for merge

**Tests**:
- Full workflow: Create member → Create M2M client → Generate secret → Use token → Revoke
- Test all error scenarios
- Test concurrent access
- Test IDOR prevention

**Status**: Pending

**Implementation Notes**:
- Invoke TE agent for comprehensive testing
- Update docs/M2M_IMPLEMENTATION_GUIDE.md
- Verify security lessons #18-20 compliance
- Test with different user roles
- Performance check for large client lists

---

## Progress Tracking
- [ ] Stage 1 complete (Database Schema)
- [ ] Stage 2 complete (Backend API)
- [ ] Stage 3 complete (Admin Portal UI)
- [ ] Stage 4 complete (Dummy Data)
- [ ] Stage 5 complete (Integration & Testing)
- [ ] All tests passing
- [ ] Documentation updated
- [ ] Feature ready for merge
