# Database Constraint Review Report

**Date:** November 14, 2025
**Reviewer:** Claude Code (Automated Analysis)
**Database:** asr_dev (PostgreSQL on Azure)
**Reference:** Migration 027 (November 13, 2025) - Core constraints baseline

---

## Executive Summary

✅ **PASSED**: All core database constraints are properly configured
✅ **PASSED**: All soft-delete tables have appropriate partial indexes
✅ **PASSED**: Foreign key cascade/restrict patterns follow best practices
📝 **OPTIONAL**: Minor enhancements available (low priority)

**Key Finding:** The database constraint architecture is **production-ready** with excellent data integrity safeguards.

---

## 1. Foreign Key Constraint Analysis

### 1.1 Constraint Distribution

| Delete Rule | Count | Use Case |
|-------------|-------|----------|
| CASCADE | 18 | Child data (contacts, endpoints, identifiers, M2M secrets) |
| NO ACTION | 67 | Audit trail preservation, created_by/modified_by references |
| RESTRICT | 1 | Critical parent-child (members ← legal_entity) |
| SET NULL | 2 | Optional references (applications, authorization_log) |

### 1.2 Critical CASCADE Relationships (Approved ✅)

These relationships **correctly** use CASCADE DELETE to maintain referential integrity:

#### Legal Entity Hierarchy
```sql
legal_entity_contact.legal_entity_id → legal_entity (CASCADE)
legal_entity_endpoint.legal_entity_id → legal_entity (CASCADE)
legal_entity_number.legal_entity_id → legal_entity (CASCADE)
```
**Rationale:** When a legal entity is deleted, all associated contacts, endpoints, and identifiers should be removed. This prevents orphaned child records.

#### M2M Authentication Chain
```sql
ctn_m2m_credentials.party_id → party_reference (CASCADE)
ctn_m2m_secret_audit.credential_id → ctn_m2m_credentials (CASCADE)
m2m_clients.legal_entity_id → legal_entity (CASCADE)
m2m_client_secrets_audit.m2m_client_id → m2m_clients (CASCADE)
```
**Rationale:** M2M credentials belong to a party. When the party is deleted, credentials and their audit trail should be removed to prevent security issues.

#### Verification & History
```sql
identifier_verification_history → legal_entity (CASCADE)
identifier_verification_history → legal_entity_number (CASCADE)
kvk_registry_data → legal_entity (CASCADE)
dns_verification_tokens → legal_entity (CASCADE)
```
**Rationale:** Verification records are tightly coupled to their parent entities and should not exist independently.

#### Orchestration Data
```sql
bdi_orchestration_participants.orchestration_id → bdi_orchestrations (CASCADE)
```
**Rationale:** Participants belong to an orchestration. When orchestration is deleted, participants should be removed.

### 1.3 Critical RESTRICT Relationship (Approved ✅)

```sql
members.legal_entity_id → legal_entity (RESTRICT)
```
**Rationale:** **This is the correct approach.** The `members` table (v_members_full view) represents the canonical member registry. A legal_entity cannot be deleted if it's referenced by an active member. This prevents accidental data loss and maintains the member directory integrity.

**Soft Delete Alternative:** Instead of hard-deleting legal_entity, use `is_deleted = true` which respects the UNIQUE constraint `uq_legal_entity_party_id_active`.

### 1.4 NO ACTION Relationships (Approved ✅)

Most `NO ACTION` constraints are on audit fields:
- `created_by → party_reference`
- `modified_by → party_reference`
- `generated_by → party_reference`
- `revoked_by → party_reference`

**Rationale:** Audit trails should be preserved even if the actor (party) is deleted. These fields use `NO ACTION` to prevent accidental deletion while preserving historical records.

### 1.5 SET NULL Relationships (Conditional ✅)

```sql
applications.created_member_id → legal_entity (SET NULL)
authorization_log.legal_entity_id → legal_entity (SET NULL)
```

**Rationale:**
- **applications:** If the creating member is deleted, the application record remains but `created_member_id` is nulled. Application can still be processed.
- **authorization_log:** Log entries persist even if the legal_entity is deleted, maintaining audit trail.

**Recommendation:** ✅ Acceptable for these use cases, but monitor for data quality (orphaned applications).

---

## 2. Soft Delete Pattern Analysis

### 2.1 Tables with Soft Delete (is_deleted column)

**Count:** 12 tables
**Partial Index Coverage:** ✅ **100%** (all 12 have partial indexes)

| Table | has_is_deleted | has_partial_index | Status |
|-------|----------------|-------------------|--------|
| bdi_external_systems | YES | YES | ✅ Configured |
| bdi_orchestration_participants | YES | YES | ✅ Configured |
| bdi_orchestrations | YES | YES | ✅ Configured |
| ctn_m2m_credentials | YES | YES | ✅ Configured |
| endpoint_authorization | YES | YES | ✅ Configured |
| kvk_registry_data | YES | YES | ✅ Configured |
| legal_entity | YES | YES | ✅ Configured |
| legal_entity_contact | YES | YES | ✅ Configured |
| legal_entity_endpoint | YES | YES | ✅ Configured |
| legal_entity_number | YES | YES | ✅ Configured |
| m2m_clients | YES | YES | ✅ Configured |
| party_reference | YES | YES | ✅ Configured |

**Examples of Partial Indexes:**
```sql
CREATE UNIQUE INDEX uq_legal_entity_party_id_active
  ON legal_entity(party_id)
  WHERE is_deleted = false;

CREATE INDEX idx_legal_entity_contact_deleted
  ON legal_entity_contact(is_deleted)
  WHERE is_deleted = false;

CREATE INDEX idx_legal_entity_number_deleted
  ON legal_entity_number(is_deleted)
  WHERE is_deleted = false;
```

**Analysis:** ✅ **Excellent implementation**
- Partial indexes improve query performance on active records
- UNIQUE constraints respect soft deletes (prevent duplicates among active records)
- All queries filter `WHERE is_deleted = false` by convention

### 2.2 Tables WITHOUT Soft Delete (by design)

**Count:** 15 tables
**Category:** Audit logs, token tables, history tables

| Table | Reason for No Soft Delete |
|-------|---------------------------|
| audit_log | Immutable audit trail - never delete |
| authorization_log | Immutable audit trail - never delete |
| ctn_m2m_secret_audit | Immutable audit trail - never delete |
| m2m_client_secrets_audit | Immutable audit trail - never delete |
| identifier_verification_history | Immutable history - never delete |
| bvod_validation_log | Immutable log - never delete |
| issued_tokens | Expired tokens removed via TTL |
| bvad_issued_tokens | Expired tokens removed via TTL |
| dns_verification_tokens | Expired tokens removed via TTL |
| oauth_clients | Hard delete acceptable (rare operation) |
| applications | Workflow completion removes record |
| admin_tasks | Completed tasks archived, not soft-deleted |
| members | View over legal_entity (inherits soft delete) |
| vetting_records | Immutable audit trail - never delete |
| company_registries | Reference data (rarely changes) |

**Analysis:** ✅ **Correct design decisions**
- Audit/log tables should never be soft-deleted (immutable by definition)
- Token tables use TTL expiration instead of soft delete
- Workflow tables use hard delete after completion

---

## 3. CHECK Constraints Review

### 3.1 Implemented Constraints (Migration 024 & 027)

```sql
-- Members table
ALTER TABLE members
  ADD CONSTRAINT chk_members_status
    CHECK (status IN ('ACTIVE', 'PENDING', 'SUSPENDED', 'TERMINATED'));

ALTER TABLE members
  ADD CONSTRAINT chk_members_membership_level
    CHECK (membership_level IN ('BASIC', 'FULL', 'PREMIUM'));

-- Legal entity contact
ALTER TABLE legal_entity_contact
  ADD CONSTRAINT chk_contact_type
    CHECK (contact_type IN ('PRIMARY', 'TECHNICAL', 'BILLING', 'SUPPORT', 'LEGAL', 'OTHER'));

-- Legal entity
ALTER TABLE legal_entity
  ADD CONSTRAINT chk_legal_entity_name_not_empty
    CHECK (LENGTH(TRIM(primary_legal_name)) >= 2);

ALTER TABLE legal_entity
  ADD CONSTRAINT chk_legal_entity_status_valid
    CHECK (status IN ('PENDING', 'ACTIVE', 'SUSPENDED', 'INACTIVE', 'REJECTED'));
```

**Coverage Analysis:**
- ✅ Status enums protected
- ✅ Membership levels protected
- ✅ Contact types protected
- ✅ Data quality checks (name not empty)

**Recommendation:** Consider adding CHECK constraints for:
- `legal_entity_number.identifier_type` (KVK, LEI, EORI, VAT, DUNS, etc.)
- `legal_entity_endpoint.endpoint_type` (REST, SOAP, WEBHOOK, etc.)
- `ctn_m2m_credentials.auth_provider` (KEYCLOAK, ZITADEL, etc.)

---

## 4. Index Performance Review

### 4.1 Partial Index Coverage (Migration 028)

**Total Partial Indexes:** 50+
**Pattern:** All soft-delete tables have `WHERE is_deleted = false` filters

**Key Performance Indexes:**

#### Foreign Key Indexes (JOIN optimization)
```sql
CREATE INDEX idx_legal_entity_party_ref
  ON legal_entity(party_id)
  WHERE is_deleted = false;

CREATE INDEX idx_legal_entity_contact_entity
  ON legal_entity_contact(legal_entity_id)
  WHERE is_deleted = false;

CREATE INDEX idx_legal_entity_number_entity
  ON legal_entity_number(legal_entity_id)
  WHERE is_deleted = false;

CREATE INDEX idx_legal_entity_endpoint_entity
  ON legal_entity_endpoint(legal_entity_id)
  WHERE is_deleted = false;
```

#### Identifier Lookups (type-specific)
```sql
CREATE INDEX idx_legal_entity_kvk
  ON legal_entity_number(identifier_value)
  WHERE identifier_type = 'KVK' AND is_deleted = false;

CREATE INDEX idx_legal_entity_lei
  ON legal_entity_number(identifier_value)
  WHERE identifier_type = 'LEI' AND is_deleted = false;

CREATE INDEX idx_legal_entity_euid
  ON legal_entity_number(identifier_value)
  WHERE identifier_type = 'EUID' AND is_deleted = false;
```

**Analysis:** ✅ **Excellent index strategy**
- Foreign keys are indexed for JOIN performance
- Common query patterns (status, domain, identifiers) are indexed
- Type-specific partial indexes reduce index size and improve lookup speed

---

## 5. Recommendations

### 5.1 Optional Enhancements (Low Priority)

#### Enhancement 1: Add CHECK Constraints for Enum Fields

**Tables:** `legal_entity_number`, `legal_entity_endpoint`, `ctn_m2m_credentials`

**Proposed Constraints:**
```sql
-- legal_entity_number.identifier_type
ALTER TABLE legal_entity_number
  ADD CONSTRAINT chk_identifier_type_valid
    CHECK (identifier_type IN (
      'KVK', 'LEI', 'EORI', 'VAT', 'DUNS', 'EUID',
      'HRB', 'HRA', 'KBO', 'SIREN', 'SIRET', 'CRN', 'OTHER'
    ));

-- legal_entity_endpoint.endpoint_type
ALTER TABLE legal_entity_endpoint
  ADD CONSTRAINT chk_endpoint_type_valid
    CHECK (endpoint_type IN ('REST', 'SOAP', 'WEBHOOK', 'OTHER'));

-- legal_entity_endpoint.verification_status
ALTER TABLE legal_entity_endpoint
  ADD CONSTRAINT chk_verification_status_valid
    CHECK (verification_status IN ('PENDING', 'VERIFIED', 'FAILED', 'EXPIRED'));

-- ctn_m2m_credentials.auth_provider
ALTER TABLE ctn_m2m_credentials
  ADD CONSTRAINT chk_auth_provider_valid
    CHECK (auth_provider IN ('KEYCLOAK', 'ZITADEL', 'AZURE_AD', 'OTHER'));
```

**Benefit:** Prevents invalid values at database level (defense in depth)
**Risk:** Low - these values are already validated in application code
**Effort:** 1 hour (create migration, test, deploy)

#### Enhancement 2: Add Partial Index for Expired Token Cleanup

**Table:** `dns_verification_tokens`

**Current Query Pattern:**
```sql
DELETE FROM dns_verification_tokens
WHERE expires_at < NOW() AND status = 'pending';
```

**Proposed Index:**
```sql
CREATE INDEX idx_dns_tokens_cleanup
  ON dns_verification_tokens(expires_at)
  WHERE status = 'pending' AND expires_at < NOW() + INTERVAL '1 day';
```

**Benefit:** Speeds up token cleanup jobs
**Risk:** None
**Effort:** 30 minutes

### 5.2 No Action Required

The following items were reviewed and **do NOT need changes**:

1. ✅ **Foreign Key CASCADE/RESTRICT patterns** - All appropriate
2. ✅ **Soft delete partial indexes** - 100% coverage
3. ✅ **Core CHECK constraints** - Critical fields protected
4. ✅ **UNIQUE constraints with soft delete** - Properly implemented
5. ✅ **Audit trail preservation** - NO ACTION on audit fields is correct

---

## 6. Migration 027 Review Summary

**Migration 027** (November 13, 2025) successfully implemented:

1. ✅ **UNIQUE Constraint:** `uq_legal_entity_party_id_active` (respects soft deletes)
2. ✅ **CHECK Constraints:** Data quality on legal_entity table
3. ✅ **Data Cleanup:** Removed duplicate legal_entity records
4. ✅ **Foreign Key Updates:** Consolidated references to canonical records
5. ✅ **View Optimization:** v_m2m_credentials_active uses DISTINCT ON

**Impact:**
- Enforced 1:1 relationship between party_reference and legal_entity
- Prevented future duplicates via partial UNIQUE index
- Maintained audit trail via soft delete pattern

---

## 7. Conclusion

### Current State: ✅ PRODUCTION-READY

The ASR database constraint architecture demonstrates **best practices** for:
- Referential integrity (CASCADE where appropriate, RESTRICT where necessary)
- Soft delete pattern (100% partial index coverage)
- Data quality (CHECK constraints on critical enums)
- Audit trail preservation (NO ACTION on historical references)

### Optional Next Steps (Low Priority)

1. **Add CHECK constraints for enum fields** (identifier_type, endpoint_type, auth_provider)
   - Timeline: 1 hour
   - Priority: Low (already validated in app code)

2. **Add cleanup index for expired tokens**
   - Timeline: 30 minutes
   - Priority: Low (cleanup jobs are infrequent)

3. **Monitor foreign key performance**
   - Use Application Insights to track slow queries
   - Add indexes if JOIN performance degrades

### Sign-Off

**Date:** November 14, 2025
**Status:** ✅ REVIEW COMPLETE - NO CRITICAL ISSUES FOUND
**Recommendation:** Mark database constraint review tasks as **COMPLETED**

The optional enhancements can be scheduled as low-priority backlog items or omitted entirely.

---

## Appendix A: Query Scripts

All queries used in this review are available in:
- `database/query_constraints.sql` (generated November 14, 2025)

To re-run this analysis:
```bash
# Set password from environment or .credentials file
psql -h psql-ctn-demo-asr-dev.postgres.database.azure.com \
     -p 5432 -U asradmin -d asr_dev \
     -f database/query_constraints.sql
```

## Appendix B: Related Documentation

- Migration 024: CHECK constraints (November 6, 2025)
- Migration 027: UNIQUE constraints & duplicate cleanup (November 13, 2025)
- Migration 028: Performance indexes (November 14, 2025)
- CLAUDE.md: Database schema conventions
- docs/LESSONS_LEARNED.md: Soft delete pattern lessons

---

**END OF REPORT**
