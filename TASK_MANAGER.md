# Task Manager

**Purpose:** Track important tasks, refactoring needs, and technical debt that require attention.

**Last Updated:** November 13, 2025 (Updated post-Keycloak migration)

---

## 🔴 High Priority

### Database Schema Refactoring

**Issue Identified:** November 13, 2025 during Keycloak M2M setup
**Status:** Not Started
**Priority:** High
**Estimated Effort:** 2-3 days

**Problem:**
The current schema has overcomplicated relationships with redundancy between:
- `party_reference` (base entity)
- `legal_entity` (organization details)
- `members` (duplicate/overlapping data?)

**Symptoms:**
- Duplicate `legal_entity` rows for same `party_id` found during M2M credential mapping
- View `v_m2m_credentials_active` returns duplicate rows due to multiple legal_entity records
- Unclear separation of concerns between tables
- Data redundancy causing maintenance issues

**Tasks:**

1. **Invoke DE (Database Expert) Agent for Analysis**
   - [ ] Analyze current schema relationships
   - [ ] Identify duplicate data patterns
   - [ ] Document redundancies and inconsistencies
   - [ ] Recommend normalized schema structure

2. **Remove Duplicate Legal Entities**
   - [ ] Query to find all duplicate legal_entity records per party_id
   - [ ] Create cleanup script to remove duplicates (keeping most recent)
   - [ ] Add UNIQUE constraint: `(party_id) WHERE is_deleted = false`
   - [ ] Update views to handle edge cases

3. **Schema Simplification Proposal**
   - [ ] Evaluate if `members` table is still needed
   - [ ] Determine proper relationship: party_reference → legal_entity
   - [ ] Identify which columns are truly needed vs redundant
   - [ ] Design migration path with zero downtime

4. **Implementation Plan**
   - [ ] Create migration scripts (with rollback)
   - [ ] Test in development environment
   - [ ] Update all API queries and views
   - [ ] Update Keycloak middleware (resolvePartyIdFromKeycloak)
   - [ ] Deploy to production

**Impact:**
- **Medium Risk:** Changes affect core data model
- **High Reward:** Cleaner schema, fewer bugs, easier maintenance
- **Breaking Changes:** Potentially affects all party/entity queries

**Related Files:**
- `database/current_schema.sql`
- `database/migrations/026-rename-zitadel-to-generic-m2m-fixed-v2.sql` (view definition)
- `api/src/middleware/keycloak-auth.ts` (party resolution)

**Notes:**
- Current workaround: View uses `LEFT JOIN legal_entity ... AND le.is_deleted = false`
- This masks the underlying duplicate issue but doesn't fix it
- Need proper UNIQUE constraints to prevent future duplicates

---

## 🟡 Medium Priority

### Add Database Constraints for Data Integrity

**Status:** Not Started
**Priority:** Medium

**Tasks:**
- [ ] Add UNIQUE constraint on `legal_entity(party_id)` WHERE is_deleted = false
- [ ] Add CHECK constraint to prevent NULL in critical fields
- [ ] Review all foreign key constraints for CASCADE vs RESTRICT
- [ ] Add partial indexes for soft-deleted records

---

## 🟢 Low Priority / Future Enhancements

### Keycloak M2M Authentication - Production Readiness

**Status:** ✅ Core Implementation Complete (November 13, 2025)

**Completed:**
- ✅ Database migration to generic M2M naming (migration 026)
- ✅ Keycloak middleware created (`keycloak-auth.ts`)
- ✅ Cloud IAM instance configured (France, EU)
- ✅ Test service account mapped to database
- ✅ Azure Functions environment variables configured
- ✅ API functions updated to use Keycloak middleware
- ✅ Deployed and tested end-to-end (all M2M endpoints working)
- ✅ Documentation created (`docs/KEYCLOAK_M2M_AUTHENTICATION.md`)
- ✅ Removed Zitadel remnants

**Remaining Production Tasks:**
- [ ] Create additional service accounts for production partners
- [ ] Implement per-client rate limiting (Azure APIM or custom middleware)
- [ ] Set up monitoring dashboard for M2M usage metrics
- [ ] Configure alerting for failed authentication attempts
- [ ] Implement secret rotation policy (90-day cycle)
- [ ] Create partner onboarding documentation/portal
- [ ] Load testing with concurrent M2M requests (TE agent)

---

## 📋 Backlog

### Documentation
- [x] Update API documentation with Keycloak authentication examples
- [x] Create partner onboarding guide for M2M access (`docs/KEYCLOAK_M2M_AUTHENTICATION.md`)
- [ ] Document schema relationships in Arc42 format
- [ ] Create visual architecture diagrams (Mermaid) for M2M flow

### Testing
- [ ] Add unit tests for Keycloak middleware (Vitest)
- [ ] Create integration tests for M2M authentication flows (Playwright)
- [ ] Load test M2M endpoints with concurrent requests
- [ ] Add negative test cases (expired tokens, invalid scopes, etc.)

### Security
- [ ] Implement rate limiting per M2M client (Azure APIM or custom middleware)
- [ ] Add monitoring/alerting for failed authentication attempts
- [ ] Regular secret rotation policy for service accounts (90-day cycle)
- [ ] Security audit of Keycloak configuration (SA agent)
- [ ] Penetration testing of M2M endpoints

---

## 🔧 How to Use This File

1. **Adding Tasks:**
   - Use clear, actionable task descriptions
   - Include priority, status, and estimated effort
   - Link to relevant files and documentation

2. **Updating Status:**
   - Change checkboxes from `[ ]` to `[x]` when complete
   - Update "Last Updated" date at top
   - Move completed tasks to COMPLETED_ACTIONS.md

3. **Invoking Agents:**
   - **DE (Database Expert):** Schema analysis, migrations, performance
   - **SA (Security Analyst):** Security reviews, vulnerability scanning
   - **CR (Code Reviewer):** Code quality, best practices
   - **TE (Test Engineer):** Test creation, E2E testing

---

## 🎯 Next Actions

**Immediate (This Week):**
1. ✅ ~~Complete Keycloak M2M setup~~ (DONE - November 13, 2025)
2. ✅ ~~Test M2M authentication end-to-end~~ (DONE)
3. Invoke DE (Database Expert) agent to analyze schema redundancy
4. Create duplicate legal_entity cleanup script

**Short Term (Next 2 Weeks):**
1. Fix duplicate legal_entity records issue
2. Add UNIQUE constraint on legal_entity(party_id)
3. Create production service accounts for partners
4. Set up M2M usage monitoring dashboard

**Long Term (Next Month):**
1. Design and implement schema simplification (party/legal_entity/members)
2. Add unit tests for Keycloak middleware
3. Implement per-client rate limiting
4. Secret rotation policy implementation

---

**Document Version:** 1.0
**Created:** November 13, 2025
**Owner:** Development Team
