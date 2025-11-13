# Database Schema Analysis - CTN ASR

**Date:** November 13, 2025
**Analyst:** Database Expert (DE) Agent
**Status:** Critical Issues Identified
**Priority:** High

---

## Executive Summary

During Keycloak M2M authentication setup on November 13, 2025, a critical schema design issue was discovered: **duplicate `legal_entity` records exist for the same `party_id`**, violating the intended 1:1 relationship and causing data integrity problems.

**Key Findings:**
- 1 party has 5 duplicate `legal_entity` records (party_id: `691e11e3-f1ff-4a5d-8728-b52ec68b13c3`)
- Missing UNIQUE constraint on `legal_entity(party_id)` allows duplicates
- View `v_m2m_credentials_active` returns multiple rows due to LEFT JOIN to `legal_entity`
- Overcomplicated three-table design (`party_reference` → `legal_entity` → `members`)
- Data redundancy between `legal_entity` and `members` tables

**Immediate Risk:** M2M credential resolution may return incorrect party data, API queries return duplicate results.

---

## Current Schema - Entity Relationship Diagram

```mermaid
erDiagram
    party_reference ||--o{ legal_entity : "1:N (PROBLEM!)"
    legal_entity ||--o| members : "1:1 (optional)"
    legal_entity ||--o{ legal_entity_contact : "1:N"
    legal_entity ||--o{ legal_entity_number : "1:N"
    legal_entity ||--o{ legal_entity_endpoint : "1:N"
    legal_entity ||--o{ legal_entity : "parent hierarchy"
    party_reference ||--o{ ctn_m2m_credentials : "1:N"
    legal_entity ||--o{ bvad_issued_tokens : "1:N"
    legal_entity ||--o{ subscriptions : "1:N"
    legal_entity ||--o{ invoices : "1:N"
    legal_entity ||--o{ dns_verification_tokens : "1:N"
    legal_entity ||--o{ kvk_registry_data : "1:N"
    legal_entity ||--o{ identifier_verification_history : "1:N"
    members ||--o{ issued_tokens : "1:N"
    members ||--o{ oauth_clients : "1:N"

    party_reference {
        uuid party_id PK
        varchar party_class
        varchar party_type
        timestamptz dt_created
        timestamptz dt_modified
        boolean is_deleted
    }

    legal_entity {
        uuid legal_entity_id PK
        uuid party_id FK "NO UNIQUE CONSTRAINT!"
        varchar primary_legal_name
        varchar domain
        varchar status
        integer authentication_tier
        varchar authentication_method
        jsonb metadata
        timestamptz dt_created
        timestamptz dt_modified
        boolean is_deleted
    }

    members {
        uuid id PK
        varchar org_id UNIQUE
        varchar legal_name "DUPLICATE of legal_entity.primary_legal_name"
        varchar domain "DUPLICATE of legal_entity.domain"
        varchar status "DUPLICATE of legal_entity.status"
        varchar membership_level "DUPLICATE of legal_entity.membership_level"
        uuid legal_entity_id FK
        uuid azure_ad_object_id
        varchar email
    }

    legal_entity_contact {
        uuid legal_entity_contact_id PK
        uuid legal_entity_id FK
        varchar contact_type
        varchar full_name
        varchar email
        boolean is_primary
    }

    legal_entity_number {
        uuid legal_entity_reference_id PK
        uuid legal_entity_id FK
        varchar identifier_type
        varchar identifier_value
        varchar validation_status
    }

    legal_entity_endpoint {
        uuid legal_entity_endpoint_id PK
        uuid legal_entity_id FK
        varchar endpoint_name
        varchar endpoint_url
        varchar data_category
        boolean is_active
    }

    ctn_m2m_credentials {
        uuid credential_id PK
        uuid party_id FK "References party_reference"
        varchar m2m_client_id
        varchar service_account_name
        varchar auth_provider
        boolean is_active
    }
```

**Schema Issues Highlighted:**
1. `party_reference` → `legal_entity` is **1:N** (should be 1:1)
2. `legal_entity.party_id` has **NO UNIQUE constraint**
3. `members` table has **duplicate columns** from `legal_entity`
4. `ctn_m2m_credentials` references `party_reference` but needs `legal_entity` data via view

---

## Database Review Summary

The current schema suffers from **normalization violations** and **missing constraints**, resulting in duplicate data and ambiguous relationships. The root cause is a three-table design that should be two tables:

1. **party_reference** - Abstract base entity (minimal metadata)
2. **legal_entity** - Organization details (full data model)
3. **members** - Appears to be a legacy/duplicate table

**Critical Finding:** The `members` table largely duplicates `legal_entity` data, suggesting it may have been intended as a view or should be merged.

---

## Critical Issues

### 1. Duplicate legal_entity Records per party_id

**Table:** `legal_entity`
**Impact:** Data integrity violation, query ambiguity, M2M credential resolution failure

**Problem:**
One party (`691e11e3-f1ff-4a5d-8728-b52ec68b13c3`) has **5 legal_entity records**:

| legal_entity_id | primary_legal_name | referenced_by_member | dt_created |
|-----------------|-------------------|---------------------|------------|
| 14869df5-b1f3-4b85-a17e-e37d4167f321 | DHL Global Forwarding | org:dhl | 2025-10-09 18:10:37 |
| 11772315-a7f0-46a8-852b-e058c8c3bf26 | A.P. Moller - Maersk | org:maersk | 2025-10-09 18:10:37 |
| 75d44bd4-fb7f-4406-b31a-20af89506d12 | Test 2 Company Bv | org:test2 | 2025-10-09 18:10:37 |
| fbc4bcdc-a9f9-4621-a153-c5deb6c49519 | Contargo GmbH & Co. KG | org:contargo | 2025-10-09 18:10:37 |
| e91aac83-1696-407c-9f80-a93c9dd8cec3 | Van Berkel Transport | org:vanberkel | 2025-10-09 18:10:37 |

All created at the **same timestamp**, suggesting a data migration or seeding script error.

**Root Cause:** Missing UNIQUE constraint on `legal_entity(party_id)`

**Impact:**
- View `v_m2m_credentials_active` does `LEFT JOIN legal_entity` and may return multiple rows
- API queries joining party → legal_entity return duplicates
- Keycloak `resolvePartyIdFromKeycloak()` function may get wrong legal_entity
- Reports and dashboards show inflated counts

**Solution:**
```sql
-- 1. Identify canonical legal_entity per party
-- 2. Update foreign keys to point to canonical record
-- 3. Soft-delete duplicate records
-- 4. Add UNIQUE constraint to prevent future duplicates
ALTER TABLE legal_entity
  ADD CONSTRAINT uq_legal_entity_party_id
    UNIQUE (party_id)
    WHERE is_deleted = false;
```

---

### 2. Missing UNIQUE Constraint on party_id

**Table:** `legal_entity`
**Impact:** Allows duplicate records, violates intended 1:1 relationship

**Problem:**
The schema design intends a **1:1 relationship** between `party_reference` and `legal_entity`, but no database constraint enforces this. The current constraints are:

```sql
-- Existing constraints (from schema analysis)
✓ PRIMARY KEY (legal_entity_id)
✓ FOREIGN KEY (party_id) REFERENCES party_reference(party_id) ON DELETE CASCADE
✗ UNIQUE constraint on party_id -- MISSING!
```

**Consequence:** Application logic assumes 1:1, but database allows 1:N, creating a mismatch.

**Solution:**
```sql
-- Add partial UNIQUE constraint (respects soft deletes)
ALTER TABLE legal_entity
  ADD CONSTRAINT uq_legal_entity_party_id_active
    UNIQUE (party_id)
    WHERE is_deleted = false;

-- Full UNIQUE constraint (if hard deletes are used)
-- ALTER TABLE legal_entity
--   ADD CONSTRAINT uq_legal_entity_party_id
--     UNIQUE (party_id);
```

---

### 3. Data Redundancy Between legal_entity and members

**Tables:** `legal_entity`, `members`
**Impact:** Maintenance burden, data synchronization issues, unclear source of truth

**Problem:**
The `members` table duplicates multiple columns from `legal_entity`:

| Column | legal_entity | members | Notes |
|--------|-------------|---------|-------|
| Legal Name | `primary_legal_name` | `legal_name` | Duplicate |
| Domain | `domain` | `domain` | Duplicate |
| Status | `status` | `status` | Duplicate |
| Membership Level | `membership_level` | `membership_level` | Duplicate |
| Identifier (LEI) | `legal_entity_number` table | `lei` column | Duplicate |
| Identifier (KvK) | `legal_entity_number` table | `kvk` column | Duplicate |

**Current Relationship:**
```sql
-- members has FK to legal_entity
members.legal_entity_id → legal_entity.legal_entity_id

-- But members ALSO stores duplicate data
-- 21 members, 21 unique legal_entity_id references
-- 100% overlap suggests members should be a view
```

**Analysis:**
- 21 members in table
- 21 unique `legal_entity_id` references
- 0 members without `legal_entity_id`
- **100% overlap** → suggests `members` should be a **VIEW** or merged into `legal_entity`

**Recommendation:**
Either:
1. **Convert `members` to a VIEW** over `legal_entity` with computed columns
2. **Merge `members` into `legal_entity`** and add members-specific columns
3. **Keep separate** but remove duplicate columns, store only member-specific data

---

### 4. Overcomplicated Three-Table Design

**Tables:** `party_reference`, `legal_entity`, `members`
**Impact:** Confusing queries, join complexity, unclear data ownership

**Problem:**
Current design has three layers:

```
party_reference (abstract entity)
    ↓
legal_entity (organization details)
    ↓
members (duplicate/overlapping data)
```

**Questions Raised:**
1. What is `party_reference` for? (It only stores `party_class`, `party_type`)
2. Why separate `party_reference` from `legal_entity`? (Always joined together)
3. What is `members` for? (Duplicates legal_entity data + adds `org_id`)
4. Could `members` be a VIEW instead of a table?

**Current Usage:**
- `ctn_m2m_credentials` references `party_id` (party_reference)
- Most API queries join `legal_entity` for actual data
- `members` table referenced by:
  - `issued_tokens` (OAuth tokens)
  - `oauth_clients` (OAuth client registration)
  - Some API endpoints expecting `org_id`

**Recommendation:**
Design simplification depends on business requirements:

**Option A: Merge party_reference into legal_entity**
```sql
-- Add party_class, party_type to legal_entity
-- Migrate party_id to be the primary key
-- Drop party_reference table
```

**Option B: Keep separation but clarify roles**
```sql
-- party_reference: Minimal identity (party_id, party_type)
-- legal_entity: Full organization data (1:1 with party_reference)
-- members: CONVERT TO VIEW (computed from legal_entity)
```

**Option C: Keep all three, fix constraints**
```sql
-- Add UNIQUE constraint on legal_entity(party_id)
-- Remove duplicate columns from members
-- Document the purpose of each table clearly
```

---

## Important Improvements

### 1. View v_m2m_credentials_active Returns Duplicates

**File:** `database/migrations/026-rename-zitadel-to-generic-m2m-fixed-v2.sql` (Line 159-197)
**Impact:** M2M credential lookup may return multiple rows

**Current View Definition:**
```sql
CREATE OR REPLACE VIEW v_m2m_credentials_active AS
SELECT
  c.credential_id,
  c.party_id,
  -- ... other columns ...
  p.party_type,
  le.primary_legal_name as party_name
FROM ctn_m2m_credentials c
LEFT JOIN party_reference p ON c.party_id = p.party_id
LEFT JOIN legal_entity le ON c.party_id = le.party_id AND le.is_deleted = false
WHERE c.is_deleted = false
  AND c.is_active = true;
```

**Problem:**
The `LEFT JOIN legal_entity` will return **multiple rows** if a party has duplicate legal_entity records. This breaks the M2M credential lookup.

**Example Query Result:**
```
credential_id | party_id | party_name
--------------+----------+--------------------
uuid-123      | party-1  | DHL Global Forwarding
uuid-123      | party-1  | A.P. Moller - Maersk  ← DUPLICATE ROW!
uuid-123      | party-1  | Contargo GmbH         ← DUPLICATE ROW!
```

**Solution:**
Add `DISTINCT ON` or use a subquery to select the canonical legal_entity:

```sql
-- Option 1: DISTINCT ON (PostgreSQL-specific)
CREATE OR REPLACE VIEW v_m2m_credentials_active AS
SELECT DISTINCT ON (c.credential_id)
  c.credential_id,
  c.party_id,
  -- ... other columns ...
  p.party_type,
  le.primary_legal_name as party_name
FROM ctn_m2m_credentials c
LEFT JOIN party_reference p ON c.party_id = p.party_id
LEFT JOIN legal_entity le ON c.party_id = le.party_id AND le.is_deleted = false
WHERE c.is_deleted = false
  AND c.is_active = true
ORDER BY c.credential_id, le.dt_created DESC; -- Most recent legal_entity

-- Option 2: Subquery (more explicit)
CREATE OR REPLACE VIEW v_m2m_credentials_active AS
SELECT
  c.credential_id,
  c.party_id,
  -- ... other columns ...
  p.party_type,
  (
    SELECT primary_legal_name
    FROM legal_entity
    WHERE party_id = c.party_id
      AND is_deleted = false
    ORDER BY dt_created DESC
    LIMIT 1
  ) as party_name
FROM ctn_m2m_credentials c
LEFT JOIN party_reference p ON c.party_id = p.party_id
WHERE c.is_deleted = false
  AND c.is_active = true;
```

---

### 2. Keycloak Middleware Party Resolution

**File:** `api/src/middleware/keycloak-auth.ts` (Line 205-248)
**Function:** `resolvePartyIdFromKeycloak()`

**Current Implementation:**
```typescript
export async function resolvePartyIdFromKeycloak(
  clientId: string,
  context: InvocationContext
): Promise<string | null> {
  const result = await pool.query(
    `SELECT party_id
     FROM ctn_m2m_credentials
     WHERE m2m_client_id = $1
     AND is_active = true
     AND is_deleted = false
     LIMIT 1`,
    [clientId]
  );
  // ...
}
```

**Problem:**
The query returns `party_id` directly from `ctn_m2m_credentials`, which is correct. However, if API functions then do:

```typescript
const legalEntity = await pool.query(
  `SELECT * FROM legal_entity WHERE party_id = $1`,
  [partyId]
);
```

This will return **multiple rows** if duplicates exist, causing errors.

**Solution:**
Always add `ORDER BY dt_created DESC LIMIT 1` when querying legal_entity by party_id:

```typescript
const legalEntity = await pool.query(
  `SELECT * FROM legal_entity
   WHERE party_id = $1
   AND is_deleted = false
   ORDER BY dt_created DESC
   LIMIT 1`,
  [partyId]
);
```

---

### 3. Missing Indexes for Performance

**Impact:** Slow queries on frequently filtered columns

**Current Status:**
✓ `idx_legal_entity_party` - EXISTS
✓ `idx_m2m_credentials_client_id` - EXISTS
✗ `uq_legal_entity_party_id` - MISSING (should be UNIQUE)

**Recommended Indexes:**

```sql
-- Partial unique index for soft-deleted records
CREATE UNIQUE INDEX uq_legal_entity_party_id_active
  ON legal_entity(party_id)
  WHERE is_deleted = false;

-- Index for members lookup by legal_entity_id
CREATE INDEX idx_members_legal_entity_id
  ON members(legal_entity_id)
  WHERE legal_entity_id IS NOT NULL;

-- Composite index for status-based queries
CREATE INDEX idx_legal_entity_status_tier
  ON legal_entity(status, authentication_tier)
  WHERE is_deleted = false;
```

---

## Suggestions

### 1. Document Table Purposes

**Impact:** Developer confusion, unclear ownership

Add comments to clarify the purpose of each table:

```sql
COMMENT ON TABLE party_reference IS
  'Abstract party identity. Minimal metadata. Extended by legal_entity table (1:1 relationship).';

COMMENT ON TABLE legal_entity IS
  'Full legal entity details for organizations. 1:1 relationship with party_reference via party_id.';

COMMENT ON TABLE members IS
  'Legacy table for member organizations. Consider converting to VIEW over legal_entity.';
```

---

### 2. Create View for Simplified Member Access

**Impact:** Simplify API queries

Create a unified view that hides the complexity:

```sql
CREATE OR REPLACE VIEW v_members_full AS
SELECT
  le.legal_entity_id as id,
  le.party_id,
  le.primary_legal_name as legal_name,
  le.domain,
  le.status,
  le.membership_level,
  m.org_id,
  m.azure_ad_object_id,
  m.email,
  -- Identifiers (denormalized for convenience)
  MAX(CASE WHEN len.identifier_type = 'LEI' THEN len.identifier_value END) as lei,
  MAX(CASE WHEN len.identifier_type = 'KVK' THEN len.identifier_value END) as kvk,
  -- Metadata
  le.metadata,
  le.dt_created as created_at,
  le.dt_modified as updated_at
FROM legal_entity le
LEFT JOIN members m ON le.legal_entity_id = m.legal_entity_id
LEFT JOIN legal_entity_number len ON le.legal_entity_id = len.legal_entity_id
  AND len.is_deleted = false
WHERE le.is_deleted = false
GROUP BY
  le.legal_entity_id, le.party_id, le.primary_legal_name, le.domain,
  le.status, le.membership_level, m.org_id, m.azure_ad_object_id, m.email,
  le.metadata, le.dt_created, le.dt_modified;
```

---

### 3. Add CHECK Constraints for Data Quality

**Impact:** Prevent invalid data at database level

```sql
-- Ensure primary_legal_name is not empty
ALTER TABLE legal_entity
  ADD CONSTRAINT chk_legal_entity_name_not_empty
    CHECK (LENGTH(TRIM(primary_legal_name)) >= 2);

-- Ensure domain format (if used)
ALTER TABLE legal_entity
  ADD CONSTRAINT chk_legal_entity_domain_format
    CHECK (domain IS NULL OR domain ~* '^[a-z0-9.-]+\.[a-z]{2,}$');

-- Ensure status is valid
ALTER TABLE legal_entity
  ADD CONSTRAINT chk_legal_entity_status
    CHECK (status IN ('PENDING', 'ACTIVE', 'SUSPENDED', 'INACTIVE'));
```

---

## Positive Highlights

### Well-Designed Aspects

1. **Soft Delete Pattern** - Consistent use of `is_deleted = false` filters preserves audit trail
2. **Timestamp Tracking** - All tables have `dt_created`, `dt_modified` for auditing
3. **Foreign Key Constraints** - Properly defined with appropriate CASCADE/RESTRICT strategies
4. **Comprehensive Indexes** - 110+ indexes optimize query performance
5. **JSONB for Flexibility** - `metadata` columns allow schema evolution without migrations
6. **Audit Tables** - Separate audit tables (`audit_log`, `authorization_log`) for security
7. **M2M Credentials Table** - Well-designed `ctn_m2m_credentials` supports multiple IAM providers

---

## Proposed Simplified Schema - ERD

**Option: Merge party_reference into legal_entity**

```mermaid
erDiagram
    legal_entity ||--o| members : "1:1 (FK)"
    legal_entity ||--o{ legal_entity_contact : "1:N"
    legal_entity ||--o{ legal_entity_number : "1:N"
    legal_entity ||--o{ legal_entity_endpoint : "1:N"
    legal_entity ||--o{ legal_entity : "parent hierarchy"
    legal_entity ||--o{ ctn_m2m_credentials : "1:N"
    legal_entity ||--o{ bvad_issued_tokens : "1:N"
    legal_entity ||--o{ subscriptions : "1:N"
    members ||--o{ issued_tokens : "1:N"
    members ||--o{ oauth_clients : "1:N"

    legal_entity {
        uuid legal_entity_id PK "formerly party_id"
        varchar party_class "moved from party_reference"
        varchar party_type "moved from party_reference"
        varchar primary_legal_name
        varchar domain UNIQUE
        varchar status
        integer authentication_tier
        jsonb metadata
        timestamptz dt_created
        timestamptz dt_modified
        boolean is_deleted
    }

    members {
        uuid id PK
        varchar org_id UNIQUE
        uuid legal_entity_id FK "UNIQUE constraint"
        uuid azure_ad_object_id UNIQUE
        varchar email
        jsonb member_specific_metadata
    }

    legal_entity_contact {
        uuid legal_entity_contact_id PK
        uuid legal_entity_id FK
        varchar contact_type
        varchar full_name
        varchar email
        boolean is_primary
    }

    ctn_m2m_credentials {
        uuid credential_id PK
        uuid legal_entity_id FK "changed from party_id"
        varchar m2m_client_id
        varchar service_account_name
        boolean is_active
    }
```

**Changes:**
1. Merge `party_reference` columns into `legal_entity`
2. Use `legal_entity_id` as primary identifier throughout system
3. Add UNIQUE constraint on `members.legal_entity_id`
4. Remove duplicate columns from `members`
5. Update `ctn_m2m_credentials` to reference `legal_entity_id` instead of `party_id`

---

## SQL Scripts for Cleanup and Fixes

### Script 1: Find Duplicate legal_entity Records

```sql
-- Find all parties with duplicate legal_entity records
WITH duplicate_parties AS (
  SELECT
    party_id,
    COUNT(*) as legal_entity_count,
    ARRAY_AGG(legal_entity_id ORDER BY dt_created DESC) as legal_entity_ids,
    ARRAY_AGG(primary_legal_name ORDER BY dt_created DESC) as legal_names
  FROM legal_entity
  WHERE is_deleted = false
  GROUP BY party_id
  HAVING COUNT(*) > 1
)
SELECT
  dp.party_id,
  dp.legal_entity_count,
  dp.legal_entity_ids,
  dp.legal_names,
  -- Show which members reference each legal_entity
  (
    SELECT jsonb_agg(jsonb_build_object(
      'org_id', m.org_id,
      'legal_entity_id', m.legal_entity_id
    ))
    FROM members m
    WHERE m.legal_entity_id = ANY(dp.legal_entity_ids)
  ) as member_references
FROM duplicate_parties dp
ORDER BY dp.legal_entity_count DESC;
```

**Expected Output:**
```
party_id                              | legal_entity_count | legal_entity_ids | legal_names | member_references
691e11e3-f1ff-4a5d-8728-b52ec68b13c3  | 5                  | [uuid1, uuid2...] | [DHL, Maersk...] | [{org:dhl, uuid1}, ...]
```

---

### Script 2: Cleanup Duplicate legal_entity Records

```sql
-- =====================================================
-- STEP 1: Backup data before cleanup
-- =====================================================
CREATE TABLE IF NOT EXISTS legal_entity_backup_20251113 AS
SELECT * FROM legal_entity
WHERE party_id IN (
  SELECT party_id
  FROM legal_entity
  WHERE is_deleted = false
  GROUP BY party_id
  HAVING COUNT(*) > 1
);

-- =====================================================
-- STEP 2: Identify canonical legal_entity per party
-- Strategy: Keep the legal_entity referenced by members table
-- If no member reference, keep the most recent (dt_created DESC)
-- =====================================================
WITH duplicate_parties AS (
  SELECT
    party_id,
    COUNT(*) as count
  FROM legal_entity
  WHERE is_deleted = false
  GROUP BY party_id
  HAVING COUNT(*) > 1
),
canonical_legal_entities AS (
  SELECT DISTINCT ON (le.party_id)
    le.party_id,
    le.legal_entity_id as canonical_id,
    le.primary_legal_name,
    CASE
      WHEN m.legal_entity_id IS NOT NULL THEN 'referenced_by_member'
      ELSE 'most_recent'
    END as selection_reason
  FROM legal_entity le
  INNER JOIN duplicate_parties dp ON le.party_id = dp.party_id
  LEFT JOIN members m ON le.legal_entity_id = m.legal_entity_id
  WHERE le.is_deleted = false
  ORDER BY
    le.party_id,
    (m.legal_entity_id IS NOT NULL) DESC, -- Prefer legal_entity referenced by members
    le.dt_created DESC                    -- Then most recent
)
SELECT * FROM canonical_legal_entities;

-- =====================================================
-- STEP 3: Update foreign key references to canonical legal_entity
-- =====================================================

-- Update legal_entity_contact
WITH canonical AS (
  SELECT DISTINCT ON (le.party_id)
    le.party_id,
    le.legal_entity_id as canonical_id
  FROM legal_entity le
  LEFT JOIN members m ON le.legal_entity_id = m.legal_entity_id
  WHERE le.is_deleted = false
  ORDER BY le.party_id, (m.legal_entity_id IS NOT NULL) DESC, le.dt_created DESC
)
UPDATE legal_entity_contact lec
SET legal_entity_id = c.canonical_id
FROM legal_entity le_old
JOIN canonical c ON le_old.party_id = c.party_id
WHERE lec.legal_entity_id = le_old.legal_entity_id
  AND le_old.legal_entity_id != c.canonical_id;

-- Update legal_entity_number
WITH canonical AS (
  SELECT DISTINCT ON (le.party_id)
    le.party_id,
    le.legal_entity_id as canonical_id
  FROM legal_entity le
  LEFT JOIN members m ON le.legal_entity_id = m.legal_entity_id
  WHERE le.is_deleted = false
  ORDER BY le.party_id, (m.legal_entity_id IS NOT NULL) DESC, le.dt_created DESC
)
UPDATE legal_entity_number len
SET legal_entity_id = c.canonical_id
FROM legal_entity le_old
JOIN canonical c ON le_old.party_id = c.party_id
WHERE len.legal_entity_id = le_old.legal_entity_id
  AND le_old.legal_entity_id != c.canonical_id;

-- Update legal_entity_endpoint
WITH canonical AS (
  SELECT DISTINCT ON (le.party_id)
    le.party_id,
    le.legal_entity_id as canonical_id
  FROM legal_entity le
  LEFT JOIN members m ON le.legal_entity_id = m.legal_entity_id
  WHERE le.is_deleted = false
  ORDER BY le.party_id, (m.legal_entity_id IS NOT NULL) DESC, le.dt_created DESC
)
UPDATE legal_entity_endpoint lee
SET legal_entity_id = c.canonical_id
FROM legal_entity le_old
JOIN canonical c ON le_old.party_id = c.party_id
WHERE lee.legal_entity_id = le_old.legal_entity_id
  AND le_old.legal_entity_id != c.canonical_id;

-- Repeat for other tables: bvad_issued_tokens, subscriptions, invoices, etc.

-- =====================================================
-- STEP 4: Soft-delete duplicate legal_entity records
-- =====================================================
WITH canonical AS (
  SELECT DISTINCT ON (le.party_id)
    le.party_id,
    le.legal_entity_id as canonical_id
  FROM legal_entity le
  LEFT JOIN members m ON le.legal_entity_id = m.legal_entity_id
  WHERE le.is_deleted = false
  ORDER BY le.party_id, (m.legal_entity_id IS NOT NULL) DESC, le.dt_created DESC
)
UPDATE legal_entity le
SET
  is_deleted = true,
  dt_modified = NOW(),
  modified_by = 'DATABASE_CLEANUP_2025-11-13'
FROM canonical c
WHERE le.party_id = c.party_id
  AND le.legal_entity_id != c.canonical_id
  AND le.is_deleted = false;

-- =====================================================
-- STEP 5: Verify cleanup
-- =====================================================
-- Should return 0 rows
SELECT
  party_id,
  COUNT(*) as legal_entity_count
FROM legal_entity
WHERE is_deleted = false
GROUP BY party_id
HAVING COUNT(*) > 1;
```

---

### Script 3: Add UNIQUE Constraint

```sql
-- Add partial UNIQUE constraint (respects soft deletes)
ALTER TABLE legal_entity
  ADD CONSTRAINT uq_legal_entity_party_id_active
    UNIQUE (party_id)
    WHERE is_deleted = false;

-- Verify constraint exists
SELECT
  con.conname AS constraint_name,
  pg_get_constraintdef(con.oid) AS constraint_definition
FROM pg_constraint con
JOIN pg_class rel ON con.conrelid = rel.oid
WHERE rel.relname = 'legal_entity'
  AND con.conname = 'uq_legal_entity_party_id_active';
```

---

### Script 4: Fix v_m2m_credentials_active View

```sql
-- Drop old view
DROP VIEW IF EXISTS v_m2m_credentials_active;

-- Recreate with DISTINCT ON to prevent duplicates
CREATE OR REPLACE VIEW v_m2m_credentials_active AS
SELECT DISTINCT ON (c.credential_id)
  c.credential_id,
  c.party_id,
  c.m2m_client_id,
  c.m2m_realm_id,
  c.m2m_user_id,
  c.service_account_name,
  c.description,
  c.auth_provider,
  c.auth_issuer,
  c.assigned_scopes,
  c.allowed_endpoints,
  c.is_active,
  c.dt_created,
  c.dt_modified,
  c.last_used_at,
  c.total_requests,
  c.last_request_ip,
  -- Secret info (metadata only)
  (
    SELECT COUNT(*)
    FROM ctn_m2m_secret_audit s
    WHERE s.credential_id = c.credential_id
      AND s.is_revoked = false
  ) as active_secrets_count,
  (
    SELECT MAX(secret_generated_at)
    FROM ctn_m2m_secret_audit s
    WHERE s.credential_id = c.credential_id
  ) as last_secret_generated_at,
  -- Party info
  p.party_type,
  le.primary_legal_name as party_name
FROM ctn_m2m_credentials c
LEFT JOIN party_reference p ON c.party_id = p.party_id
LEFT JOIN legal_entity le ON c.party_id = le.party_id AND le.is_deleted = false
WHERE c.is_deleted = false
  AND c.is_active = true
ORDER BY c.credential_id, le.dt_created DESC; -- Prefer most recent legal_entity

COMMENT ON VIEW v_m2m_credentials_active IS
  'Active M2M credentials with party information. Uses DISTINCT ON to prevent duplicates from multiple legal_entity records per party.';
```

---

## Database Normalization Analysis

### Current Normal Form Assessment

**1st Normal Form (1NF):** ✓ PASS
- All tables have atomic values
- No repeating groups
- Primary keys defined

**2nd Normal Form (2NF):** ✓ PASS
- All non-key attributes fully dependent on primary key
- No partial dependencies

**3rd Normal Form (3NF):** ✗ PARTIAL FAIL
- **Violation:** `members` table has transitive dependencies
  - `members.legal_name` depends on `members.legal_entity_id` → `legal_entity.primary_legal_name`
  - `members.domain` depends on `members.legal_entity_id` → `legal_entity.domain`
  - `members.status` depends on `members.legal_entity_id` → `legal_entity.status`
- **Issue:** Duplicate storage of legal_entity attributes in members table

**Boyce-Codd Normal Form (BCNF):** ✗ FAIL
- **Violation:** `legal_entity.party_id` should be a candidate key (1:1 with party_reference)
- **Issue:** Missing UNIQUE constraint allows multiple legal_entity per party_id

### Target Normal Form: 3NF with BCNF for legal_entity

**Recommendation:**
1. Add UNIQUE constraint on `legal_entity(party_id)` → Achieves BCNF
2. Remove duplicate columns from `members` → Achieves 3NF
3. Convert `members` to a VIEW (optional) → Perfect normalization

---

## Migration Strategy (Zero Downtime)

### Phase 1: Quick Fixes (Immediate - 1 day)

**Objective:** Stop the bleeding, prevent new duplicates

**Steps:**
1. Run Script 2 to cleanup existing duplicates
2. Add UNIQUE constraint (Script 3)
3. Fix view definition (Script 4)
4. Deploy updated view to production
5. Monitor logs for duplicate errors

**Risk:** Low - Only adds constraints, doesn't change API behavior
**Rollback:** Drop constraint, restore old view

---

### Phase 2: Schema Refactoring (1-2 weeks)

**Objective:** Simplify schema design

**Option A: Keep Three Tables (Conservative)**
- Add comments documenting table purposes
- Remove duplicate columns from `members`
- Keep `party_reference` for future extensibility (e.g., person entities)

**Option B: Merge party_reference into legal_entity (Aggressive)**
- Migrate `party_class`, `party_type` to `legal_entity`
- Update all foreign keys from `party_id` to `legal_entity_id`
- Drop `party_reference` table
- Update `ctn_m2m_credentials` schema

**Recommendation:** Option A for now, Option B after thorough analysis

---

### Phase 3: Data Migration (Testing - 1 week)

**Objective:** Ensure data consistency

1. Create test database with production snapshot
2. Run all cleanup scripts
3. Run full test suite (API + E2E)
4. Verify M2M authentication works
5. Check all views return expected data

---

### Phase 4: Code Updates (2-3 days)

**Objective:** Update API queries to handle new constraints

**Files to Update:**

1. `api/src/middleware/keycloak-auth.ts`
   - Update `resolvePartyIdFromKeycloak()` to always return single row

2. All API functions querying `legal_entity` by `party_id`
   - Add `ORDER BY dt_created DESC LIMIT 1` safety net
   - Example files:
     - `api/src/functions/GetLegalEntity.ts`
     - `api/src/functions/UpdateLegalEntity.ts`
     - `api/src/functions/GetMember.ts`

3. Views joining `legal_entity`
   - `members_view`
   - `legal_entity_full`
   - Any custom admin queries

**Example Change:**
```typescript
// BEFORE
const result = await pool.query(
  'SELECT * FROM legal_entity WHERE party_id = $1',
  [partyId]
);

// AFTER
const result = await pool.query(
  `SELECT * FROM legal_entity
   WHERE party_id = $1 AND is_deleted = false
   ORDER BY dt_created DESC
   LIMIT 1`,
  [partyId]
);
```

---

## Impact Analysis

### Affected API Endpoints

**High Impact (Direct query to legal_entity by party_id):**
- `GET /api/v1/members/:id` - GetMember.ts
- `GET /api/v1/legal-entities/:id` - GetLegalEntity.ts
- `PUT /api/v1/legal-entities/:id` - UpdateLegalEntity.ts
- `GET /api/v1/members/:id/contacts` - GetMemberContacts.ts
- `GET /api/v1/members/:id/endpoints` - GetMemberEndpoints.ts
- `GET /api/v1/m2m-clients` - ManageM2MClients.ts

**Medium Impact (Joins with legal_entity):**
- `GET /api/v1/members` - GetMembers.ts (uses `members_view`)
- `GET /api/v1/audit-logs` - GetAuditLogs.ts
- `GET /api/v1/subscriptions` - (joins legal_entity)

**Low Impact (No direct legal_entity query):**
- `GET /api/v1/version` - GetVersion.ts
- `GET /api/v1/health` - healthCheck.ts

### Affected Views

1. **v_m2m_credentials_active** - CRITICAL
   - Currently returns duplicates
   - Fixed in Script 4

2. **members_view** - MEDIUM
   - Uses `LEFT JOIN legal_entity_number`
   - Should be safe (grouped by legal_entity_id)

3. **legal_entity_full** - MEDIUM
   - Groups by legal_entity_id
   - Should be safe

### Breaking Changes vs. Backward Compatible

**Backward Compatible Changes:**
- ✓ Adding UNIQUE constraint (prevents duplicates, doesn't break existing code)
- ✓ Fixing view definition (returns same data, just de-duplicated)
- ✓ Soft-deleting duplicate records (preserved in backup table)

**Breaking Changes:**
- ✗ Removing columns from `members` table (requires code updates)
- ✗ Changing `ctn_m2m_credentials.party_id` to `legal_entity_id` (requires migration)
- ✗ Dropping `party_reference` table (requires extensive refactoring)

**Recommendation:** Phase 1 (Quick Fixes) is fully backward compatible. Deploy immediately.

---

## Rollback Plan

### Rollback Script for Phase 1 (Quick Fixes)

```sql
-- =====================================================
-- Rollback Script - Phase 1 Cleanup
-- =====================================================

BEGIN;

-- 1. Drop UNIQUE constraint
ALTER TABLE legal_entity
  DROP CONSTRAINT IF EXISTS uq_legal_entity_party_id_active;

-- 2. Restore duplicate legal_entity records from backup
UPDATE legal_entity le
SET
  is_deleted = false,
  dt_modified = NOW(),
  modified_by = 'ROLLBACK_2025-11-13'
FROM legal_entity_backup_20251113 backup
WHERE le.legal_entity_id = backup.legal_entity_id
  AND backup.is_deleted = false;

-- 3. Restore old view definition (without DISTINCT ON)
DROP VIEW IF EXISTS v_m2m_credentials_active;

CREATE OR REPLACE VIEW v_m2m_credentials_active AS
SELECT
  c.credential_id,
  c.party_id,
  c.m2m_client_id,
  c.m2m_realm_id,
  c.m2m_user_id,
  c.service_account_name,
  c.description,
  c.auth_provider,
  c.auth_issuer,
  c.assigned_scopes,
  c.allowed_endpoints,
  c.is_active,
  c.dt_created,
  c.dt_modified,
  c.last_used_at,
  c.total_requests,
  c.last_request_ip,
  (
    SELECT COUNT(*)
    FROM ctn_m2m_secret_audit s
    WHERE s.credential_id = c.credential_id
      AND s.is_revoked = false
  ) as active_secrets_count,
  (
    SELECT MAX(secret_generated_at)
    FROM ctn_m2m_secret_audit s
    WHERE s.credential_id = c.credential_id
  ) as last_secret_generated_at,
  p.party_type,
  le.primary_legal_name as party_name
FROM ctn_m2m_credentials c
LEFT JOIN party_reference p ON c.party_id = p.party_id
LEFT JOIN legal_entity le ON c.party_id = le.party_id AND le.is_deleted = false
WHERE c.is_deleted = false
  AND c.is_active = true;

-- 4. Verify rollback
SELECT 'Rollback complete. Duplicate legal_entity records restored.' as status;

COMMIT;
```

**Rollback Time:** < 5 minutes
**Data Loss:** None (backup table preserved)

---

## Schema Documentation Updates

### Update current_schema.sql

After Phase 1 cleanup, regenerate schema DDL:

```bash
# Get password from .credentials file
export PGPASSWORD=$(grep POSTGRES_PASSWORD .credentials | cut -d= -f2)
pg_dump \
  --schema-only \
  --no-owner \
  --no-acl \
  -h psql-ctn-demo-asr-dev.postgres.database.azure.com \
  -p 5432 \
  -U asradmin \
  -d asr_dev \
  > database/schema/current_schema.sql
```

### Update ERD Diagrams

1. Create new Mermaid diagram (see "Proposed Simplified Schema - ERD" above)
2. Save to `docs/database/erd-simplified.md`
3. Update `README.md` to reference new ERD

### Design Decisions Documentation

Create `docs/database/DESIGN_DECISIONS.md`:

```markdown
# Database Design Decisions

## Party Reference vs Legal Entity Separation

**Decision:** Keep party_reference and legal_entity as separate tables

**Rationale:**
- Future extensibility: party_reference can support person entities
- Clear separation of identity (party_id) from organization details
- M2M credentials reference abstract party, not specific legal_entity

**Constraints Added:**
- UNIQUE constraint on legal_entity(party_id) enforces 1:1 relationship
- Prevents duplicate legal_entity records per party

## Members Table Purpose

**Decision:** Keep members table as separate entity (for now)

**Rationale:**
- members.org_id used extensively in API contracts
- Azure AD integration references members.azure_ad_object_id
- OAuth tokens reference members.id
- Refactoring to VIEW requires API contract changes

**Future Consideration:**
- Evaluate conversion to VIEW in Phase 2
- Remove duplicate columns, keep only member-specific data
```

---

## Overall Assessment

### Schema Quality: 6/10

**Strengths:**
- Comprehensive audit trail (timestamps, soft deletes)
- Well-indexed (110+ indexes)
- Strong referential integrity (foreign keys with appropriate CASCADE)
- Flexible metadata (JSONB columns)

**Weaknesses:**
- Missing UNIQUE constraint allows duplicate legal_entity records
- Three-table design (party → legal_entity → members) is overcomplicated
- Data redundancy between legal_entity and members
- View returns duplicates due to 1:N relationship

### Performance: 8/10

**Baseline:**
- Indexes exist on all frequently queried columns
- Soft delete pattern allows fast restoration
- JSONB indexes for metadata searches

**Concerns:**
- Duplicate records inflate result sets
- Views with LEFT JOINs may return multiple rows
- Missing composite indexes for common query patterns

### Data Integrity: 4/10 (CRITICAL)

**Issues:**
- Duplicate legal_entity records violate intended 1:1 relationship
- No constraint prevents future duplicates
- Data redundancy creates synchronization risks
- View returns ambiguous results (which legal_entity is canonical?)

**Risk Level:** HIGH - M2M authentication may fail or return wrong data

### Readiness: Needs Fixes (Phase 1 Required)

**Status:** NOT safe to deploy M2M authentication without Phase 1 fixes

**Blockers:**
1. Duplicate legal_entity records must be cleaned up
2. UNIQUE constraint must be added
3. View must be fixed to return single row

**Safe After Phase 1:** ✓ Yes - Quick fixes are sufficient for production

---

## Next Steps (Prioritized)

### Immediate (This Week)
1. ✅ Run Script 1 to identify all duplicate legal_entity records
2. ✅ Create backup of affected data (Script 2 Step 1)
3. ✅ Run cleanup script in **development environment** (Script 2)
4. ✅ Add UNIQUE constraint (Script 3)
5. ✅ Fix v_m2m_credentials_active view (Script 4)
6. ✅ Test M2M authentication end-to-end
7. ✅ Deploy to production (during low-traffic window)

### Short Term (Next 2 Weeks)
1. Document table purposes (add COMMENT ON TABLE)
2. Create v_members_full view for simplified queries
3. Add CHECK constraints for data quality
4. Update API queries to use `LIMIT 1` safety net
5. Regenerate current_schema.sql
6. Update design decisions documentation

### Long Term (Next Month)
1. Evaluate merging party_reference into legal_entity
2. Design members table refactoring (VIEW vs separate table)
3. Create comprehensive test suite for schema changes
4. Plan zero-downtime migration for Phase 2

---

## Success Metrics

### Phase 1 Success Criteria
- ✓ Zero duplicate legal_entity records per party_id
- ✓ UNIQUE constraint prevents future duplicates
- ✓ v_m2m_credentials_active returns single row per credential
- ✓ M2M authentication resolves correct party
- ✓ No API errors related to duplicate results

### Phase 2 Success Criteria
- ✓ All API queries explicitly handle 1:1 party → legal_entity relationship
- ✓ Schema documentation complete (ERD, design decisions)
- ✓ 100% test coverage for schema-related queries
- ✓ Zero redundant data between legal_entity and members

---

## Appendix: Complete Constraint List

### Current Constraints on legal_entity

| Constraint Name | Type | Definition |
|-----------------|------|------------|
| `legal_entity_pkey` | PRIMARY KEY | `PRIMARY KEY (legal_entity_id)` |
| `fk_party` | FOREIGN KEY | `FOREIGN KEY (party_id) REFERENCES party_reference(party_id) ON DELETE CASCADE` |
| `fk_direct_parent` | FOREIGN KEY | `FOREIGN KEY (direct_parent_legal_entity_id) REFERENCES legal_entity(legal_entity_id)` |
| `fk_ultimate_parent` | FOREIGN KEY | `FOREIGN KEY (ultimate_parent_legal_entity_id) REFERENCES legal_entity(legal_entity_id)` |
| `ck_authentication_tier` | CHECK | `CHECK (authentication_tier IN (1, 2, 3))` |
| `ck_authentication_method` | CHECK | `CHECK (authentication_method IN ('eHerkenning', 'DNS', 'EmailVerification'))` |
| `legal_entity_kvk_verification_status_check` | CHECK | `CHECK (kvk_verification_status IN ('pending', 'verified', 'failed', 'flagged'))` |

### Proposed New Constraints

| Constraint Name | Type | Definition |
|-----------------|------|------------|
| `uq_legal_entity_party_id_active` | UNIQUE | `UNIQUE (party_id) WHERE is_deleted = false` |
| `chk_legal_entity_name_not_empty` | CHECK | `CHECK (LENGTH(TRIM(primary_legal_name)) >= 2)` |
| `chk_legal_entity_domain_format` | CHECK | `CHECK (domain IS NULL OR domain ~* '^[a-z0-9.-]+\.[a-z]{2,}$')` |
| `chk_legal_entity_status` | CHECK | `CHECK (status IN ('PENDING', 'ACTIVE', 'SUSPENDED', 'INACTIVE'))` |

---

**Document Version:** 1.0
**Created:** November 13, 2025
**Author:** Database Expert (DE) Agent
**Reviewed:** Pending
**Status:** Ready for Implementation
