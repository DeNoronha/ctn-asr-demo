# Database Schema Review - October 20, 2025

**File:** `database/current_schema.sql`
**Extracted:** 2025-10-20 07:35
**Tool:** SQLPro Studio
**Lines:** 1,008
**Overall Status:** ✅ Good with minor issues

---

## Summary

✅ **PASS** - Schema successfully extracted and includes all required components
⚠️ **WARNING** - Missing indexes (needs additional export)
⚠️ **WARNING** - Duplicate audit log tables detected

---

## What's Correct ✅

### 1. Migration 015 (AUTH-001) - VERIFIED ✅
The Azure AD authentication columns are present in the `members` table:

```sql
-- Line 521-522
azure_ad_object_id uuid,
email character varying(255),
```

**Status:** Migration 015 successfully applied and exported.

---

### 2. Migration 016 (Timestamp Standardization) - VERIFIED ✅

**All timestamp columns use `TIMESTAMP WITH TIME ZONE`:**
- ✅ Found: **82 columns** with `timestamp with time zone`
- ✅ Found: **0 columns** with `timestamp without time zone`

**Sample verification:**
```sql
-- admin_tasks table
assigned_at timestamp with time zone,
due_date timestamp with time zone,
completed_at timestamp with time zone,
created_at timestamp with time zone DEFAULT now() NOT NULL,
updated_at timestamp with time zone DEFAULT now() NOT NULL,

-- members table
created_at timestamp with time zone DEFAULT now(),
updated_at timestamp with time zone DEFAULT now(),

-- oauth_clients table
created_at timestamp with time zone DEFAULT now(),
updated_at timestamp with time zone DEFAULT now(),
```

**Status:** Migration 016 successfully applied. All timestamps are timezone-safe.

---

### 3. Table Count - CORRECT ✅

**Found: 24 tables**

**Core Tables (6):**
1. `party_reference` - Party registry
2. `legal_entity` - Legal entities
3. `members` - Member organizations
4. `legal_entity_contact` - Contact persons
5. `legal_entity_number` - Organization identifiers
6. `legal_entity_endpoint` - API endpoints

**BDI/Orchestration Tables (6):**
7. `bdi_external_systems` - External system registry
8. `bdi_orchestrations` - Orchestration instances
9. `bdi_orchestration_participants` - Orchestration parties
10. `bvad_issued_tokens` - BVAD tokens
11. `bvod_validation_log` - BVOD validation logs
12. `endpoint_authorization` - Endpoint authorization tokens

**Admin/Management Tables (8):**
13. `admin_tasks` - Admin task tracking
14. `subscriptions` - Membership subscriptions
15. `subscription_history` - Subscription changes
16. `invoices` - Billing invoices
17. `newsletters` - Newsletter campaigns
18. `newsletter_recipients` - Newsletter delivery tracking
19. `vetting_records` - Member vetting
20. `company_registries` - International registry list

**Authentication/Security Tables (4):**
21. `oauth_clients` - OAuth 2.0 clients
22. `issued_tokens` - JWT tokens
23. `audit_log` - Audit trail (old format)
24. `audit_logs` - Audit trail (new format)

---

### 4. Views - CORRECT ✅

**Found: 6 views**
1. `active_subscriptions_view` - Active subscriptions with renewal info
2. `admin_tasks_dashboard_view` - Task dashboard with overdue flags
3. `company_identifiers_with_registry` - Identifiers linked to registries
4. `legal_entity_full` - Complete legal entity details
5. `members_view` - Simplified member listing
6. `newsletter_performance_view` - Newsletter analytics

**Status:** Views correctly exported with proper joins and aggregations.

---

### 5. Foreign Keys - CORRECT ✅

**Found: 24 foreign key constraints**

All relationships properly defined:
- ✅ Cascade deletes where appropriate
- ✅ SET NULL for optional references
- ✅ Proper referential integrity

**Sample:**
```sql
ALTER TABLE IF EXISTS public.legal_entity
  ADD CONSTRAINT fk_party
  FOREIGN KEY (party_id)
  REFERENCES public.party_reference (party_id)
  ON DELETE CASCADE;

ALTER TABLE IF EXISTS public.members
  ADD CONSTRAINT members_legal_entity_id_fkey
  FOREIGN KEY (legal_entity_id)
  REFERENCES public.legal_entity (legal_entity_id);
```

---

## Issues Found ⚠️

### Issue 1: Missing Indexes - CRITICAL ⚠️

**Problem:** The schema export contains **0 CREATE INDEX statements**.

**Expected indexes missing:**
- `idx_members_azure_ad_oid` (from migration 015)
- `idx_members_email` (from migration 015)
- `idx_members_azure_ad_oid_unique` (from migration 015)
- All performance indexes from migration 010

**Impact:**
- Schema file is incomplete for fresh database installations
- Performance will be poor without indexes
- AUTH-001 lookups will be slow

**Root Cause:** SQLPro Studio may not export indexes in the "SQL Dump" export option.

**Solution Options:**

#### Option A: Export Indexes Separately in SQLPro Studio
1. In SQLPro Studio, expand database → Expand "Indexes"
2. Select all indexes (Cmd+Click)
3. Right-click → Generate SQL → Create Statement
4. Append to `current_schema.sql`

#### Option B: Use pg_dump Command Line
```bash
# Export indexes only
export PGPASSWORD=value-from-credentials-file
pg_dump \
  -h psql-ctn-demo-asr-dev.postgres.database.azure.com \
  -p 5432 \
  -U asradmin \
  -d asr_dev \
  --schema-only \
  --no-owner \
  --section=post-data \
  -t members \
  >> database/current_schema.sql
```

#### Option C: Query Database for Index DDL
```sql
-- Run this query in SQLPro Studio to get all index definitions
SELECT
    'CREATE ' ||
    CASE WHEN i.indisunique THEN 'UNIQUE ' ELSE '' END ||
    'INDEX ' || quote_ident(idx.relname) ||
    ' ON ' || quote_ident(t.relname) ||
    ' USING ' || am.amname ||
    ' (' || array_to_string(array_agg(quote_ident(a.attname) ORDER BY array_position(i.indkey::int[], a.attnum)), ', ') || ')' ||
    CASE WHEN pg_get_expr(i.indpred, i.indrelid) IS NOT NULL
         THEN ' WHERE ' || pg_get_expr(i.indpred, i.indrelid)
         ELSE ''
    END || ';' AS index_ddl
FROM pg_index i
JOIN pg_class idx ON idx.oid = i.indexrelid
JOIN pg_class t ON t.oid = i.indrelid
JOIN pg_am am ON am.oid = idx.relam
JOIN pg_attribute a ON a.attrelid = t.oid AND a.attnum = ANY(i.indkey)
WHERE t.relnamespace = 'public'::regnamespace
  AND NOT i.indisprimary
GROUP BY idx.relname, t.relname, am.amname, i.indisunique, i.indpred, i.indrelid
ORDER BY t.relname, idx.relname;
```

---

### Issue 2: Duplicate Audit Log Tables - MEDIUM ⚠️

**Problem:** Two audit log tables exist with different schemas:

**Table 1: `audit_log`** (Lines 48-73)
```sql
CREATE TABLE IF NOT EXISTS public.audit_log (
  audit_log_id integer DEFAULT nextval('audit_log_audit_log_id_seq'::regclass),
  event_type character varying(100),
  severity character varying(20),
  result character varying(20),
  user_id character varying(255),
  user_email character varying(255),
  resource_type character varying(100),
  resource_id character varying(255),
  ...
  dt_created timestamp with time zone DEFAULT now()
);
```

**Table 2: `audit_logs`** (Lines 76-94)
```sql
CREATE TABLE IF NOT EXISTS public.audit_logs (
  id bigint DEFAULT nextval('audit_logs_id_seq'::regclass),
  event_time timestamp with time zone DEFAULT now(),
  event_type character varying(50),
  actor_org_id character varying(100),
  resource_type character varying(50),
  resource_id character varying(255),
  ...
  metadata jsonb
);
```

**Analysis:**
- Different primary key types (integer vs bigint)
- Different column names (dt_created vs event_time)
- Different field lengths (varchar(100) vs varchar(50))
- Different audit fields

**Likely Cause:** Migration 009 created `audit_logs` but old `audit_log` table wasn't dropped.

**Recommendation:**
1. Check which table is actually being used by the API
2. Verify data in both tables (which has more records?)
3. Migrate data from old table to new table if needed
4. Drop the unused table

**SQL to check usage:**
```sql
-- Check record counts
SELECT 'audit_log' as table_name, COUNT(*) as records FROM audit_log
UNION ALL
SELECT 'audit_logs', COUNT(*) FROM audit_logs;

-- Check most recent records
SELECT 'audit_log' as table_name, MAX(dt_created) as latest FROM audit_log
UNION ALL
SELECT 'audit_logs', MAX(event_time) FROM audit_logs;
```

---

### Issue 3: Schema Header - MINOR ⚠️

**Current header:**
```sql
-- Database export via SQLPro (https://www.sqlprostudio.com/)
-- Exported by ramondenoronha at 20-10-2025 07:35.
-- WARNING: This file may contain descructive statements such as DROPs.
-- Please ensure that you are running the script at the proper location.
```

**Improvement:** Add more context about the schema:
```sql
-- ============================================
-- CTN Association Register Database Schema
-- Database: asr_dev (psql-ctn-demo-asr-dev)
-- Extracted: 2025-10-20 07:35
-- Tool: SQLPro Studio
-- ============================================
--
-- IMPORTANT NOTES:
-- - All timestamps use TIMESTAMP WITH TIME ZONE (UTC)
-- - Azure AD authentication enabled (azure_ad_object_id column)
-- - Includes BDI orchestration support
-- - Includes admin task management and subscription billing
--
-- REQUIREMENTS:
-- - PostgreSQL 12+ (uses gen_random_uuid())
-- - UUID extension (automatically created)
--
-- USAGE:
-- psql -h <host> -U <user> -d <dbname> -f current_schema.sql
-- ============================================
```

---

## Recommended Actions

### Priority 1: Add Missing Indexes (CRITICAL)
**Timeline:** Before next deployment
**Action:** Export indexes and append to schema file

### Priority 2: Resolve Duplicate Audit Tables (MEDIUM)
**Timeline:** Next database maintenance window
**Action:**
1. Identify active table
2. Migrate data if needed
3. Drop unused table
4. Update schema file

### Priority 3: Improve Schema Header (LOW)
**Timeline:** Next schema update
**Action:** Add comprehensive header comments

---

## Verification Checklist

✅ Schema file created
✅ All 24 tables exported
✅ All 6 views exported
✅ All foreign keys exported
✅ Migration 015 verified (Azure AD columns present)
✅ Migration 016 verified (all timestamps TIMESTAMPTZ)
❌ Indexes NOT exported (needs correction)
⚠️ Duplicate audit tables (needs investigation)

---

## File Statistics

- **File size:** ~50KB
- **Lines:** 1,008
- **Tables:** 24
- **Views:** 6
- **Foreign Keys:** 24
- **Indexes:** 0 (ISSUE!)
- **Sequences:** Implicit (via DEFAULT nextval)
- **Timestamp columns:** 82 (all TIMESTAMPTZ)

---

## Next Steps

1. **Export indexes** using one of the methods above
2. **Append indexes** to current_schema.sql
3. **Investigate** duplicate audit log tables
4. **Test** schema on clean database to verify completeness
5. **Commit** to Git once indexes are added

---

## Summary

**Overall:** The schema export is **90% complete** and accurately reflects the current database state including migrations 015 and 016. The main issue is missing indexes which need to be added separately. The duplicate audit log tables should be investigated and resolved in the next maintenance window.

**Ready for Git:** ⏳ After adding indexes
**Ready for Production:** ⏳ After resolving duplicate audit tables and adding indexes
