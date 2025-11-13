# Database Schema Issues - Quick Summary

**Date:** November 13, 2025
**Status:** Critical Issues Identified - Fix Ready
**Related Docs:**
- Full Analysis: `/docs/database/DATABASE_SCHEMA_ANALYSIS_2025-11-13.md`
- Migration Script: `/database/migrations/027_fix_duplicate_legal_entities.sql`

---

## The Problem (TL;DR)

**One party has 5 duplicate legal_entity records** - discovered during Keycloak M2M setup.

**Impact:**
- View `v_m2m_credentials_active` returns multiple rows
- API queries return duplicates
- M2M credential resolution may fail

**Root Cause:** Missing UNIQUE constraint on `legal_entity(party_id)`

---

## Affected Party

```
Party ID: 691e11e3-f1ff-4a5d-8728-b52ec68b13c3

Duplicate legal_entity records:
1. DHL Global Forwarding (org:dhl)
2. A.P. Moller - Maersk (org:maersk)
3. Test 2 Company Bv (org:test2)
4. Contargo GmbH & Co. KG (org:contargo)
5. Van Berkel Transport (org:vanberkel)

All created: 2025-10-09 18:10:37 (same timestamp)
```

**Likely Cause:** Data seeding script error creating multiple organizations under one party_id.

---

## The Fix (3 Steps)

### 1. Run Cleanup Script

```bash
# Get password from .credentials file
export PGPASSWORD=$(grep POSTGRES_PASSWORD .credentials | cut -d= -f2)
psql -h psql-ctn-demo-asr-dev.postgres.database.azure.com \
  -p 5432 -U asradmin -d asr_dev --set=sslmode=require \
  -f database/migrations/027_fix_duplicate_legal_entities.sql
```

**What it does:**
1. Creates backup table
2. Identifies canonical legal_entity (the one referenced by members)
3. Updates all foreign keys to point to canonical record
4. Soft-deletes duplicates
5. Adds UNIQUE constraint
6. Fixes view definition

**Runtime:** ~30 seconds

---

### 2. Verify Fix

```bash
# Check no duplicates remain
# Get password from .credentials file
export PGPASSWORD=$(grep POSTGRES_PASSWORD .credentials | cut -d= -f2)
psql -h psql-ctn-demo-asr-dev.postgres.database.azure.com \
  -p 5432 -U asradmin -d asr_dev --set=sslmode=require -c "
SELECT
  party_id,
  COUNT(*) as legal_entity_count
FROM legal_entity
WHERE is_deleted = false
GROUP BY party_id
HAVING COUNT(*) > 1;
"

# Should return 0 rows
```

---

### 3. Test M2M Authentication

```bash
# Test Keycloak M2M endpoint
curl -X GET https://func-ctn-demo-asr-dev.azurewebsites.net/api/v1/m2m-clients \
  -H "Authorization: Bearer <keycloak-token>"

# Should return single row per credential (no duplicates)
```

---

## Schema Design Issues

### Current (Overcomplicated)

```
party_reference (24 records)
    ↓ 1:N (PROBLEM!)
legal_entity (28 records, 5 duplicates)
    ↓ 1:1
members (21 records)
```

### After Fix (Proper 1:1)

```
party_reference (24 records)
    ↓ 1:1 (UNIQUE constraint)
legal_entity (24 records, no duplicates)
    ↓ 1:1
members (21 records)
```

---

## Data Redundancy

`members` table duplicates `legal_entity` columns:

| Column | legal_entity | members | Fix |
|--------|-------------|---------|-----|
| Legal Name | `primary_legal_name` | `legal_name` | Remove from members |
| Domain | `domain` | `domain` | Remove from members |
| Status | `status` | `status` | Remove from members |
| LEI | `legal_entity_number` table | `lei` column | Remove from members |
| KvK | `legal_entity_number` table | `kvk` column | Remove from members |

**Recommendation:** Convert `members` to VIEW in Phase 2.

---

## API Impact

**Affected Endpoints:**
- `GET /api/v1/members/:id` - May return multiple legal_entity records
- `GET /api/v1/legal-entities/:id` - Same issue
- `GET /api/v1/m2m-clients` - View returns duplicates

**Fix Required in Code:**
Always add `LIMIT 1` when querying legal_entity by party_id:

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

## Rollback Plan

If migration fails:

```sql
BEGIN;

-- 1. Drop UNIQUE constraint
ALTER TABLE legal_entity
  DROP CONSTRAINT IF EXISTS uq_legal_entity_party_id_active;

-- 2. Restore duplicate records from backup
UPDATE legal_entity le
SET
  is_deleted = false,
  dt_modified = NOW(),
  modified_by = 'ROLLBACK_027'
FROM legal_entity_backup_20251113 backup
WHERE le.legal_entity_id = backup.legal_entity_id
  AND backup.is_deleted = false
  AND le.modified_by = 'MIGRATION_027_CLEANUP';

COMMIT;
```

**Rollback Time:** < 5 minutes
**Data Loss:** None (backup table preserved)

---

## Timeline

### Phase 1: Quick Fixes (TODAY)
- [x] Analysis complete
- [x] Migration script written
- [ ] Run in development
- [ ] Test M2M authentication
- [ ] Deploy to production

**Risk:** Low
**Effort:** 1 hour
**Reward:** Fixes critical M2M issue

### Phase 2: Schema Refactoring (2 weeks)
- [ ] Remove duplicate columns from members
- [ ] Document table purposes
- [ ] Add CHECK constraints
- [ ] Update API queries with LIMIT 1

**Risk:** Medium
**Effort:** 1 week
**Reward:** Cleaner schema, easier maintenance

### Phase 3: Full Simplification (1 month)
- [ ] Evaluate merging party_reference into legal_entity
- [ ] Convert members to VIEW
- [ ] Update all API queries
- [ ] Comprehensive testing

**Risk:** High (breaking changes)
**Effort:** 2-3 weeks
**Reward:** Simplified schema, no redundancy

---

## Success Criteria

After Phase 1:
- ✓ Zero duplicate legal_entity records per party_id
- ✓ UNIQUE constraint prevents future duplicates
- ✓ v_m2m_credentials_active returns single row per credential
- ✓ M2M authentication works correctly
- ✓ No API errors related to duplicate results

---

## Quick Reference: Key Files

**Schema:**
- Current DDL: `/database/schema/current_schema.sql`
- Migration: `/database/migrations/027_fix_duplicate_legal_entities.sql`

**Middleware:**
- Keycloak Auth: `/api/src/middleware/keycloak-auth.ts` (Line 205-248)

**Views:**
- M2M Credentials: Migration 026 (Line 159-197)

**Documentation:**
- Full Analysis: `/docs/database/DATABASE_SCHEMA_ANALYSIS_2025-11-13.md`
- Task Manager: `/TASK_MANAGER.md` (High Priority section)

---

## Contact

**Questions?** Review the full analysis document:
`/docs/database/DATABASE_SCHEMA_ANALYSIS_2025-11-13.md`

**Need Help?** Invoke Database Expert (DE) agent:
```bash
# Claude Code agent invocation
@DE "Review migration 027 execution results"
```

---

**Last Updated:** November 13, 2025
**Document Version:** 1.0
**Status:** Ready for Implementation
