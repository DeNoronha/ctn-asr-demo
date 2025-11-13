# Phase 2 Schema Refactoring - Deployment Guide

**Date:** November 13, 2025
**Migration:** 028_phase2_schema_refactoring.sql
**Status:** Ready for Testing

---

## Overview

Phase 2 removes duplicate columns from the `members` table and adds constraints to enforce data integrity. This migration is **backward compatible** through the use of views.

**Changes:**
1. Removed 6 duplicate columns from `members` table
2. Added UNIQUE constraint on `members.legal_entity_id`
3. Created `v_members_full` view for backward compatibility
4. Created `v_members_list` view for performance
5. Added CHECK constraints for data validation
6. Documented all table purposes with COMMENT statements

---

## Prerequisites

**Before running migration 028:**
1. ✓ Migration 027 must be complete (UNIQUE constraint on `legal_entity.party_id`)
2. ✓ No duplicate legal_entity records per party_id
3. ✓ All members have valid `legal_entity_id` (NOT NULL)
4. ✓ Database backup created

**Verify migration 027:**
```bash
# Check no duplicate legal_entity records
export PGPASSWORD=$(grep POSTGRES_PASSWORD .credentials | cut -d= -f2)
psql -h psql-ctn-demo-asr-dev.postgres.database.azure.com \
  -p 5432 -U asradmin -d asr_dev --set=sslmode=require -c "
SELECT party_id, COUNT(*) as cnt
FROM legal_entity
WHERE is_deleted = false
GROUP BY party_id
HAVING COUNT(*) > 1;
"

# Should return 0 rows
```

---

## Step 1: Run Migration in Development

```bash
# Navigate to project root
cd /Users/ramondenoronha/Dev/DIL/DEV-CTN-ASR

# Get database password
export PGPASSWORD=$(grep POSTGRES_PASSWORD .credentials | cut -d= -f2)

# Run migration 028
psql -h psql-ctn-demo-asr-dev.postgres.database.azure.com \
  -p 5432 -U asradmin -d asr_dev --set=sslmode=require \
  -f database/migrations/028_phase2_schema_refactoring.sql

# Expected output:
# NOTICE:  Step 1: Creating backup of members table...
# NOTICE:  Backed up 21 members records
# NOTICE:  Step 2: Verifying data consistency...
# NOTICE:  All members have valid legal_entity_id ✓
# NOTICE:  All member data matches legal_entity ✓
# ...
# NOTICE:  ✓ Migration 028 completed successfully!
# COMMIT
```

**Runtime:** ~10-15 seconds

---

## Step 2: Verify Migration

```bash
# Run verification script
chmod +x database/migrations/verify_028_phase2.sh
./database/migrations/verify_028_phase2.sh

# Expected output:
# =============================================
# Migration 028 Verification Script
# =============================================
#
# Test 1: Members table has 8 columns (duplicate columns removed)
# ✓ PASSED
#
# Test 2: Members table does NOT have legal_name column
# ✓ PASSED
# ...
# =============================================
# Verification Summary
# =============================================
# Total Tests:  23
# Passed:       23
# Failed:       0
#
# =============================================
# ✓ ALL TESTS PASSED!
# Migration 028 completed successfully.
# =============================================
```

---

## Step 3: Test API Endpoints

### Test v_members_full View

```bash
# Test view returns data
export PGPASSWORD=$(grep POSTGRES_PASSWORD .credentials | cut -d= -f2)
psql -h psql-ctn-demo-asr-dev.postgres.database.azure.com \
  -p 5432 -U asradmin -d asr_dev --set=sslmode=require -c "
SELECT id, org_id, legal_name, domain, status, lei, kvk
FROM v_members_full
LIMIT 5;
"

# Should return member data with all columns
```

### Test API Endpoints

```bash
# Test member list endpoint
curl -X GET https://func-ctn-demo-asr-dev.azurewebsites.net/api/v1/members \
  -H "Authorization: Bearer <azure-ad-token>"

# Test member detail endpoint
curl -X GET https://func-ctn-demo-asr-dev.azurewebsites.net/api/v1/members/<member-id> \
  -H "Authorization: Bearer <azure-ad-token>"

# Test legal entity endpoint
curl -X GET https://func-ctn-demo-asr-dev.azurewebsites.net/api/v1/legal-entities/<legal-entity-id> \
  -H "Authorization: Bearer <azure-ad-token>"
```

**Expected:** All endpoints return data successfully (no errors).

---

## Step 4: Test Frontend Portals

### Admin Portal
1. Navigate to https://admin-ctn-dev-gma8fnethbetbjgj.z02.azurefd.net
2. Login as SystemAdmin (test-e2@denoronha.consulting)
3. Go to Members list page
4. Click on a member to view details
5. Verify all fields display correctly (legal_name, domain, status, lei, kvk)

### Member Portal
1. Navigate to https://portal-ctn-dev-fdb5cpeagdendtck.z02.azurefd.net
2. Login as MemberAdmin
3. View profile page
4. Verify all fields display correctly

**Expected:** No errors, all data displays correctly.

---

## Rollback Plan

If migration 028 causes issues:

```bash
# Rollback to previous schema
export PGPASSWORD=$(grep POSTGRES_PASSWORD .credentials | cut -d= -f2)
psql -h psql-ctn-demo-asr-dev.postgres.database.azure.com \
  -p 5432 -U asradmin -d asr_dev --set=sslmode=require << 'EOF'

BEGIN;

-- 1. Drop views
DROP VIEW IF EXISTS v_members_full CASCADE;
DROP VIEW IF EXISTS v_members_list CASCADE;

-- 2. Drop UNIQUE constraint
DROP INDEX IF EXISTS uq_members_legal_entity_id;

-- 3. Restore members table from backup
DROP TABLE IF EXISTS members CASCADE;
CREATE TABLE members AS SELECT * FROM members_backup_20251113;

-- 4. Restore primary key and indexes
ALTER TABLE members ADD PRIMARY KEY (id);
CREATE UNIQUE INDEX members_org_id_key ON members(org_id);

-- 5. Restore foreign key constraint
ALTER TABLE members
  ADD CONSTRAINT members_legal_entity_id_fkey
    FOREIGN KEY (legal_entity_id)
    REFERENCES legal_entity(legal_entity_id)
    ON DELETE CASCADE;

COMMIT;
EOF

# Verify rollback
psql -h psql-ctn-demo-asr-dev.postgres.database.azure.com \
  -p 5432 -U asradmin -d asr_dev --set=sslmode=require -c "
SELECT COUNT(*) FROM information_schema.columns
WHERE table_schema = 'public' AND table_name = 'members';
"

# Should return 14 (original column count)
```

**Rollback Time:** < 2 minutes
**Data Loss:** None (backup table preserved)

---

## Post-Migration Tasks

### 1. Regenerate Schema DDL

```bash
# Export updated schema
export PGPASSWORD=$(grep POSTGRES_PASSWORD .credentials | cut -d= -f2)
pg_dump --schema-only --no-owner --no-acl \
  -h psql-ctn-demo-asr-dev.postgres.database.azure.com \
  -p 5432 -U asradmin -d asr_dev \
  > database/current_schema.sql

# Commit updated schema
git add database/current_schema.sql
git commit -m "chore(database): update schema DDL after migration 028"
```

### 2. Update COMPLETED_ACTIONS.md

```bash
# Document migration completion
echo "
## November 13, 2025 - Phase 2 Schema Refactoring

**Migration 028 Complete:**
- Removed 6 duplicate columns from members table
- Added UNIQUE constraint on members.legal_entity_id
- Created v_members_full and v_members_list views
- Added CHECK constraints for data integrity
- Documented all table purposes

**Files Changed:**
- /database/migrations/028_phase2_schema_refactoring.sql (new)
- /database/migrations/verify_028_phase2.sh (new)
- /docs/database/API_QUERY_REVIEW_PHASE2.md (new)
- /docs/database/SCHEMA_ISSUES_SUMMARY.md (updated)
" >> docs/COMPLETED_ACTIONS.md

git add docs/COMPLETED_ACTIONS.md
git commit -m "docs: document Phase 2 migration completion"
```

---

## API Query Compatibility

**Good News:** No API query changes required!

All API queries are safe after migration 028:
- Queries using `legal_entity_id` (PRIMARY KEY) - ✓ SAFE
- Queries using `party_id` with LIMIT 1 - ✓ SAFE
- Views with DISTINCT ON - ✓ SAFE

**See full analysis:** `/docs/database/API_QUERY_REVIEW_PHASE2.md`

---

## Troubleshooting

### Issue: View returns no data

**Symptom:**
```sql
SELECT * FROM v_members_full;
-- Returns 0 rows
```

**Fix:**
```bash
# Check if members table has data
psql ... -c "SELECT COUNT(*) FROM members;"

# Check if legal_entity has data
psql ... -c "SELECT COUNT(*) FROM legal_entity WHERE is_deleted = false;"

# Check JOIN condition
psql ... -c "
SELECT COUNT(*)
FROM members m
JOIN legal_entity le ON m.legal_entity_id = le.legal_entity_id
WHERE le.is_deleted = false;
"
```

### Issue: API returns 500 error

**Symptom:** API endpoints return "Failed to fetch members"

**Fix:**
```bash
# Check API function logs
func azure functionapp logstream func-ctn-demo-asr-dev --timeout 20

# Check if API is selecting removed columns
# Search for: SELECT ... legal_name ... FROM members
# Should use: v_members_full or JOIN legal_entity
```

### Issue: CHECK constraint violation

**Symptom:** INSERT fails with "CHECK constraint violation"

**Example:**
```sql
INSERT INTO members (org_id, ...) VALUES ('ORG:invalid', ...);
-- ERROR:  new row violates check constraint "chk_members_org_id_format"
```

**Fix:** Ensure org_id follows format: `org:lowercase-alphanumeric`
```sql
-- Correct format
INSERT INTO members (org_id, ...) VALUES ('org:dhl', ...);
```

---

## Production Deployment Checklist

Before deploying to production:

- [ ] Migration 028 tested in development
- [ ] Verification script passes all tests
- [ ] API endpoints tested (no errors)
- [ ] Frontend portals tested (no errors)
- [ ] Backup created (members_backup_20251113 exists)
- [ ] Rollback script tested
- [ ] Schema DDL regenerated
- [ ] Documentation updated
- [ ] Deployment window scheduled (low-traffic period)

**Deployment Steps:**
1. Create production database backup
2. Run migration 028
3. Run verification script
4. Test critical API endpoints
5. Monitor logs for errors
6. If errors: Execute rollback plan

---

## Success Metrics

After migration 028:

**Schema Quality:**
- ✓ Members table has 8 columns (down from 14)
- ✓ No duplicate data between members and legal_entity
- ✓ 1:1 relationships enforced (UNIQUE constraints)
- ✓ Data integrity enforced (CHECK constraints)
- ✓ Schema fully documented (COMMENT ON TABLE/COLUMN)

**Performance:**
- ✓ v_members_list view faster than v_members_full (no identifiers JOIN)
- ✓ Queries use indexes (legal_entity_id PRIMARY KEY)

**Maintainability:**
- ✓ Single source of truth (legal_entity)
- ✓ Backward compatibility (v_members_full)
- ✓ Clear documentation (table comments)

---

**Questions?** See `/docs/database/API_QUERY_REVIEW_PHASE2.md` or invoke Database Expert agent.

**Last Updated:** November 13, 2025
**Status:** Ready for Testing
