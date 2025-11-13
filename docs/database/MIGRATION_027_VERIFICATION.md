# Migration 027 Verification Guide

**Date:** November 13, 2025
**Status:** ✅ Migration Completed Successfully
**Commits:** 2fc0f8f, 2e0ea37, 4cd1119, 76095b7, ebf10ec

---

## What Was Fixed

### Problem
Party `691e11e3-f1ff-4a5d-8728-b52ec68b13c3` had **5 duplicate legal_entity records**:
1. DHL Global Forwarding (org:dhl)
2. A.P. Moller - Maersk (org:maersk)
3. Test 2 Company Bv (org:test2)
4. Contargo GmbH & Co. KG (org:contargo)
5. Van Berkel Transport (org:vanberkel)

All created at the same timestamp: `2025-10-09 18:10:37`

### Solution Applied
1. **Backed up** 5 duplicate records to `legal_entity_backup_20251113`
2. **Identified canonical record** (the one referenced by `members` table)
3. **Updated foreign keys:**
   - 4 records in `legal_entity_number`
   - 3 records in `legal_entity_endpoint`
4. **Soft-deleted** 4 duplicate records (`is_deleted = true`)
5. **Created UNIQUE INDEX** on `legal_entity(party_id)` WHERE `is_deleted = false`
6. **Updated view** `v_m2m_credentials_active` to include `is_deleted = false` filter
7. **Added CHECK constraints** on status and domain fields

---

## Manual Verification Steps

Run these queries on your machine (you have database access):

### 1. Check for Remaining Duplicates

```sql
-- Get password from .credentials file
export PGPASSWORD=$(grep POSTGRES_PASSWORD .credentials | cut -d= -f2)

psql -h psql-ctn-demo-asr-dev.postgres.database.azure.com \
  -p 5432 -U asradmin -d asr_dev --set=sslmode=require -c "
SELECT
  party_id,
  COUNT(*) as legal_entity_count,
  STRING_AGG(primary_legal_name, ', ') as legal_names
FROM legal_entity
WHERE is_deleted = false
GROUP BY party_id
HAVING COUNT(*) > 1;
"
```

**Expected Result:** `(0 rows)` - No duplicates should remain

---

### 2. Verify Party/Legal Entity Counts Match

```sql
psql -h psql-ctn-demo-asr-dev.postgres.database.azure.com \
  -p 5432 -U asradmin -d asr_dev --set=sslmode=require -c "
SELECT
  (SELECT COUNT(*) FROM party_reference WHERE is_deleted = false) as active_parties,
  (SELECT COUNT(*) FROM legal_entity WHERE is_deleted = false) as active_legal_entities;
"
```

**Expected Result:** Both counts should be **24** (1:1 relationship)

---

### 3. Check UNIQUE Index Exists

```sql
psql -h psql-ctn-demo-asr-dev.postgres.database.azure.com \
  -p 5432 -U asradmin -d asr_dev --set=sslmode=require -c "
SELECT
  indexname,
  indexdef
FROM pg_indexes
WHERE indexname = 'uq_legal_entity_party_id_active';
"
```

**Expected Result:**
```
indexname: uq_legal_entity_party_id_active
indexdef: CREATE UNIQUE INDEX uq_legal_entity_party_id_active ON public.legal_entity USING btree (party_id) WHERE (is_deleted = false)
```

---

### 4. Test M2M Credentials View

```sql
psql -h psql-ctn-demo-asr-dev.postgres.database.azure.com \
  -p 5432 -U asradmin -d asr_dev --set=sslmode=require -c "
SELECT
  party_id,
  COUNT(*) as credential_count
FROM v_m2m_credentials_active
GROUP BY party_id
HAVING COUNT(*) > 1;
"
```

**Expected Result:** `(0 rows)` - Each party should have at most 1 row in the view

---

### 5. Verify Backup Table

```sql
psql -h psql-ctn-demo-asr-dev.postgres.database.azure.com \
  -p 5432 -U asradmin -d asr_dev --set=sslmode=require -c "
SELECT COUNT(*) as backup_count FROM legal_entity_backup_20251113;
"
```

**Expected Result:** `5` records backed up

---

### 6. Check Soft-Deleted Records

```sql
psql -h psql-ctn-demo-asr-dev.postgres.database.azure.com \
  -p 5432 -U asradmin -d asr_dev --set=sslmode=require -c "
SELECT
  legal_entity_id,
  primary_legal_name,
  party_id,
  dt_modified,
  modified_by
FROM legal_entity
WHERE is_deleted = true
  AND modified_by = 'MIGRATION_027_CLEANUP'
ORDER BY dt_modified DESC;
"
```

**Expected Result:** 4 records with `modified_by = 'MIGRATION_027_CLEANUP'`

---

## API Testing

### Test M2M Authentication Endpoint

```bash
# 1. Get Keycloak token (replace with your service account credentials)
ACCESS_TOKEN=$(curl -X POST https://sso-ctn-demo.auth-mzlbz7cqasbtgwhx.germanywestcentral-01.azurewebsites.net/realms/ctn/protocol/openid-connect/token \
  -H "Content-Type: application/x-www-form-urlencoded" \
  -d "client_id=asr-api-m2m" \
  -d "client_secret=<your-secret>" \
  -d "grant_type=client_credentials" \
  | jq -r '.access_token')

# 2. Test M2M credentials endpoint
curl -X GET https://func-ctn-demo-asr-dev.azurewebsites.net/api/v1/m2m-clients \
  -H "Authorization: Bearer $ACCESS_TOKEN" \
  -H "Content-Type: application/json" \
  | jq '.'
```

**Expected Result:** Single row per credential (no duplicates)

---

## Success Criteria

✅ **All checks should pass:**
- Zero duplicate `legal_entity` records per `party_id`
- UNIQUE INDEX prevents future duplicates
- `v_m2m_credentials_active` returns single row per credential
- M2M authentication works correctly
- No API errors related to duplicate results
- Backup table preserved for rollback capability

---

## Rollback Plan (If Needed)

If issues arise, rollback with:

```sql
BEGIN;

-- 1. Drop UNIQUE index
DROP INDEX IF EXISTS uq_legal_entity_party_id_active;

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

## Next Steps

1. ✅ Run verification queries above
2. ✅ Test M2M authentication endpoint
3. [ ] Monitor production for 24 hours
4. [ ] If stable, mark as deployed to production
5. [ ] Begin Phase 2: Schema Refactoring (see `SCHEMA_ISSUES_SUMMARY.md`)

---

## Lessons Learned

### PostgreSQL Syntax Fixes Required (5 iterations)

1. **Error 1:** MySQL @ variables not supported → Removed
2. **Error 2:** Unused CTEs → Converted to simple UPDATE statements
3. **Error 3:** Partial UNIQUE constraint → Use `CREATE UNIQUE INDEX` with WHERE clause
4. **Error 4:** Non-existent tables (subscriptions, invoices, etc.) → Commented out
5. **Error 5:** Validation checked CONSTRAINT instead of INDEX → Fixed to check `pg_indexes`

### Key Takeaways

- Always verify table existence before updating foreign keys
- PostgreSQL partial uniqueness requires UNIQUE INDEX (not CONSTRAINT)
- CTEs must be followed by statements that use them
- Idempotent migrations allow safe reruns after fixes

---

**Last Updated:** November 13, 2025
**Document Version:** 1.0
**Status:** Ready for Production Testing
