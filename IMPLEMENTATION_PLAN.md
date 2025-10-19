# Implementation Plan: AUTH-001 - Azure AD User → Party ID Resolution

## Overview
**Goal**: Enable Azure AD users to be mapped to their party_id in the database for multi-tenant data isolation
**Estimated Stages**: 5
**Security Impact**: CRITICAL - Resolves IDOR vulnerabilities in Orchestrator Portal

---

## Stage 1: Database Schema Migration
**Goal**: Add Azure AD object ID mapping to members table
**Success Criteria**:
- [ ] Migration file created with azure_ad_object_id UUID column
- [ ] Email column added for fallback lookup
- [ ] Index created for fast oid lookups
- [ ] Migration tested on database
- [ ] Schema documentation updated

**Tests**:
- Migration executes without errors
- Index created successfully
- Columns queryable

**Status**: In Progress

**Implementation Notes**:
- Use ALTER TABLE with IF NOT EXISTS for idempotency
- Create partial index (WHERE azure_ad_object_id IS NOT NULL)
- Add column comments for documentation

---

## Stage 2: Party Resolution API Function
**Goal**: Create GET /api/v1/auth/resolve-party endpoint
**Success Criteria**:
- [ ] ResolveParty.ts function created
- [ ] Extracts oid claim from JWT via middleware
- [ ] Queries members → legal_entity → party_reference
- [ ] Returns party_id, party_name, legal_entity_id
- [ ] Returns 404 if no party association found
- [ ] Proper error handling and logging

**Tests**:
- Valid user with party → 200 OK with party data
- Valid user without party → 404 Not Found
- Invalid token → 401 Unauthorized
- Missing oid claim → 403 Forbidden

**Status**: Pending

**Implementation Notes**:
- Follow GetLegalEntities.ts pattern
- Use parameterized queries only
- Include CORS support
- Use existing db connection pool

---

## Stage 3: Middleware Enhancement
**Goal**: Add party resolution helper to auth middleware
**Success Criteria**:
- [ ] resolvePartyId() helper function added
- [ ] AuthenticatedRequest.user includes partyId
- [ ] Graceful handling if party not found
- [ ] TypeScript types updated
- [ ] Backward compatible with existing code

**Tests**:
- Middleware correctly populates partyId
- Functions using middleware receive partyId
- No breaking changes to existing endpoints

**Status**: Pending

**Implementation Notes**:
- Add optional partyId field to avoid breaking changes
- Cache party resolution result in request context
- Log when party resolution fails

---

## Stage 4: Update Orchestration Functions
**Goal**: Replace "TBD" party IDs with real party filtering
**Success Criteria**:
- [ ] GetOrchestrations.ts uses user.partyId
- [ ] GetOrchestrationDetails.ts uses user.partyId
- [ ] GetEvents.ts uses user.partyId
- [ ] Gremlin queries filter by actual party
- [ ] No "TBD" placeholders remain
- [ ] Multi-tenant isolation verified

**Tests**:
- User only sees their party's orchestrations
- Cross-party access blocked (404, not 403)
- IDOR vulnerability tests pass

**Status**: Pending

**Implementation Notes**:
- Use parameterized Gremlin queries
- Return 404 if partyId missing (security)
- Update query filters: .has('partyId', partyId)

---

## Stage 5: Testing, Deployment & Documentation
**Goal**: Comprehensive testing and production deployment
**Success Criteria**:
- [ ] API curl tests created (test-resolve-party.sh)
- [ ] All test scenarios pass
- [ ] Function registered in essential-index.ts
- [ ] Deployed to Azure
- [ ] Documentation updated (orchestrator-portal-security.md)
- [ ] Security review confirms IDOR resolution
- [ ] IMPLEMENTATION_PLAN.md removed

**Tests**:
- End-to-end party resolution flow
- Multi-tenant isolation verification
- Performance acceptable (<200ms)
- No security vulnerabilities

**Status**: Pending

**Implementation Notes**:
- Deploy API function first
- Test with real Azure AD tokens
- Verify Application Insights logging
- Get security sign-off before marking complete

---

## Progress Tracking
- [ ] Stage 1 complete (Database Migration)
- [ ] Stage 2 complete (Party Resolution API)
- [ ] Stage 3 complete (Middleware Enhancement)
- [ ] Stage 4 complete (Orchestration Functions Update)
- [ ] Stage 5 complete (Testing & Deployment)
- [ ] All tests passing
- [ ] Documentation updated
- [ ] Security review approved
