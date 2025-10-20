# Database Schema Management Guide

**Last Updated:** October 20, 2025
**Status:** Active - DDL-based schema management
**Approach:** Single source of truth via Git-tracked schema file

---

## Overview

The CTN Association Register database uses a **DDL-based schema management** approach. Instead of maintaining incremental migration files, we track the complete database schema in a single authoritative SQL file that is version-controlled in Git.

**Key File:** `database/current_schema.sql`

---

## Schema Management Philosophy

### Why DDL-based Instead of Migrations?

We transitioned from incremental migrations (001.sql, 002.sql, etc.) to DDL-based schema management on October 20, 2025 because:

**Migration Approach (Previous):**
- ❌ 16 separate migration files (001-016)
- ❌ Numbering conflicts (had two 014 files)
- ❌ Hard to see complete schema at a glance
- ❌ New developers must run all migrations sequentially
- ❌ Difficult to understand current state

**DDL Approach (Current):**
- ✅ Single `current_schema.sql` file (1,127 lines)
- ✅ Complete database state in one place
- ✅ Easy to review in Git diffs
- ✅ Fresh databases: just run one file
- ✅ Clear documentation of all objects

---

## Current Schema File

### Location
```
database/current_schema.sql
```

### Contents
- **24 tables** with complete column definitions
- **6 views** (admin dashboard, subscriptions, legal entities, etc.)
- **24 foreign key constraints**
- **110 indexes** (B-tree, unique, partial)
- **Total:** 1,127 lines of SQL

### Key Features Verified
- ✅ Migration 015 (AUTH-001): Azure AD authentication columns
  - `members.azure_ad_object_id` UUID
  - `members.email` VARCHAR(255)
  - Indexes for quick lookup
- ✅ Migration 016: All timestamps use `TIMESTAMP WITH TIME ZONE` (82 columns)
- ✅ All tables have proper primary keys
- ✅ Foreign key relationships enforce referential integrity

---

## Tracking Schema Changes via Git

### Step 1: Understand Current State

**Before making changes**, check the current schema:

```bash
cd /Users/ramondenoronha/Dev/DIL/ASR-full/database

# View current schema
cat current_schema.sql

# Or search for specific objects
grep -i "CREATE TABLE members" current_schema.sql
grep -i "CREATE INDEX" current_schema.sql | wc -l
```

**Database Info:**
- **Host:** `psql-ctn-demo-asr-dev.postgres.database.azure.com`
- **Database:** `asr_dev`
- **Connection:** See `.credentials` file in project root

### Step 2: Make Schema Changes in Database

**⚠️ IMPORTANT:** Always make changes in the **development database first**, then extract the schema.

**Example: Adding a new column**

```bash
# Connect to database
export PGPASSWORD=<from-credentials-file>
psql -h psql-ctn-demo-asr-dev.postgres.database.azure.com \
     -p 5432 \
     -U asradmin \
     -d asr_dev \
     -c "ALTER TABLE members ADD COLUMN phone_number VARCHAR(50);"

# Verify change
psql -h psql-ctn-demo-asr-dev.postgres.database.azure.com \
     -p 5432 \
     -U asradmin \
     -d asr_dev \
     -c "\d members;"
```

**Example: Creating a new table**

```sql
CREATE TABLE IF NOT EXISTS public.new_feature_table (
    id BIGSERIAL PRIMARY KEY,
    name VARCHAR(255) NOT NULL,
    description TEXT,
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- Add indexes
CREATE INDEX idx_new_feature_name ON public.new_feature_table(name);
CREATE INDEX idx_new_feature_active ON public.new_feature_table(is_active) WHERE is_active = true;
```

### Step 3: Extract Updated Schema

**Using SQLPro Studio (Recommended):**

1. Open SQLPro Studio
2. Connect to `psql-ctn-demo-asr-dev`
3. Database → Export → SQL Dump
4. Settings:
   - ✅ Schema Only (no data)
   - ✅ Include CREATE TABLE statements
   - ✅ Include CREATE INDEX statements
   - ✅ Include constraints (FK, PK, Unique)
   - ❌ Include INSERT statements
   - ❌ Include ownership
5. Save to: `database/current_schema_new.sql`

**Extract Indexes Separately (SQLPro Studio doesn't include them):**

Run this query in SQLPro Studio:

```sql
SELECT
    schemaname,
    tablename,
    indexname,
    indexdef || ';' AS create_statement
FROM pg_indexes
WHERE schemaname = 'public'
  AND indexname NOT LIKE '%_pkey'
ORDER BY tablename, indexname;
```

Export results to CSV, then append to schema file.

**Using pg_dump (Command Line):**

```bash
export PGPASSWORD=<from-credentials-file>

pg_dump \
  -h psql-ctn-demo-asr-dev.postgres.database.azure.com \
  -p 5432 \
  -U asradmin \
  -d asr_dev \
  --schema-only \
  --no-owner \
  --no-privileges \
  > database/current_schema_new.sql
```

### Step 4: Review Changes

**Compare old and new schema:**

```bash
cd database

# Use Git diff to see what changed
diff current_schema.sql current_schema_new.sql

# Or use a visual diff tool
code --diff current_schema.sql current_schema_new.sql
```

**Check for:**
- ✅ Expected changes (new columns, tables, indexes)
- ❌ Unexpected changes (accidental deletions, type changes)
- ❌ Sensitive data accidentally included

### Step 5: Update Schema File

**Replace the old schema:**

```bash
mv current_schema_new.sql current_schema.sql
```

**Or manually merge changes** (if you want to preserve comments/formatting).

### Step 6: Commit to Git

**Commit with descriptive message:**

```bash
cd /Users/ramondenoronha/Dev/DIL/ASR-full

# Stage schema file
git add database/current_schema.sql

# Commit with detailed message
git commit -m "feat: Add phone_number column to members table

Database schema changes:
- Added members.phone_number VARCHAR(50) for contact information
- Added index idx_members_phone for quick lookups

Migration applied to asr_dev on October 20, 2025.
Schema extracted via SQLPro Studio.

Related to: Member contact enhancement feature

🤖 Generated with [Claude Code](https://claude.com/claude-code)

Co-Authored-By: Claude <noreply@anthropic.com>"

# Push to remote
git push origin main
```

---

## Best Practices

### DO ✅

1. **Always extract from live database** - Never manually edit `current_schema.sql`
2. **Test changes in development first** - Don't change production directly
3. **Include all indexes** - Don't forget the index extraction step
4. **Write descriptive commit messages** - Explain what changed and why
5. **Review diffs before committing** - Use `git diff` to catch mistakes
6. **Keep schema file clean** - Remove SET statements, OWNER TO, GRANT statements
7. **Document breaking changes** - Add notes in commit message
8. **Coordinate with team** - Announce schema changes in team chat

### DON'T ❌

1. **Don't manually edit current_schema.sql** - Always extract from database
2. **Don't commit without testing** - Verify changes work first
3. **Don't skip the index extraction** - SQLPro Studio doesn't export them automatically
4. **Don't commit sensitive data** - Check for passwords, API keys in comments
5. **Don't change production schema without backup** - Always backup first
6. **Don't skip commit messages** - Future you will thank you
7. **Don't forget to push** - Changes aren't shared until pushed to Git
8. **Don't modify multiple unrelated things** - Keep commits focused

---

## Schema File Structure

### Header
```sql
-- Database export via SQLPro (https://www.sqlprostudio.com/)
-- Exported by user at YYYY-MM-DD HH:MM.
-- Database: asr_dev
-- Schema: Complete DDL including tables, views, constraints, indexes
```

### Tables Section
All CREATE TABLE statements with:
- Column definitions
- Data types
- Constraints (NOT NULL, DEFAULT)
- Primary keys

### Views Section
CREATE VIEW statements for:
- `active_subscriptions_view`
- `admin_tasks_dashboard_view`
- `company_identifiers_with_registry`
- `legal_entity_full`
- `members_view`
- `newsletter_performance_view`

### Foreign Keys Section
ALTER TABLE statements adding foreign key constraints

### Indexes Section
CREATE INDEX statements for all 110 indexes

---

## Common Schema Changes

### Adding a Column

```sql
-- Add column to existing table
ALTER TABLE table_name ADD COLUMN column_name VARCHAR(255);

-- Add with default value
ALTER TABLE table_name ADD COLUMN is_active BOOLEAN DEFAULT true;

-- Add with NOT NULL (requires default or backfill)
ALTER TABLE table_name ADD COLUMN required_field VARCHAR(100) DEFAULT 'default';

-- Then extract schema and commit
```

### Creating a Table

```sql
CREATE TABLE IF NOT EXISTS public.new_table (
    id BIGSERIAL PRIMARY KEY,
    name VARCHAR(255) NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- Add indexes
CREATE INDEX idx_new_table_name ON public.new_table(name);

-- Then extract schema and commit
```

### Adding an Index

```sql
-- Regular index
CREATE INDEX idx_table_column ON table_name(column_name);

-- Unique index
CREATE UNIQUE INDEX uq_table_column ON table_name(column_name);

-- Partial index
CREATE INDEX idx_table_active ON table_name(status) WHERE status = 'active';

-- Then extract schema and commit
```

### Modifying a Column

```sql
-- Change data type
ALTER TABLE table_name ALTER COLUMN column_name TYPE BIGINT;

-- Add NOT NULL constraint
ALTER TABLE table_name ALTER COLUMN column_name SET NOT NULL;

-- Add default value
ALTER TABLE table_name ALTER COLUMN column_name SET DEFAULT 'value';

-- Then extract schema and commit
```

---

## Schema Migration to Other Environments

### Fresh Database Installation

**To create a new database from scratch:**

```bash
# Connect to PostgreSQL server
psql -h your-postgres-host -U admin -d postgres

# Create database
CREATE DATABASE new_database;

# Connect to new database
\c new_database

# Run schema file
\i /path/to/current_schema.sql

# Verify
\dt  # List tables
SELECT COUNT(*) FROM members;  # Should return 0 (no data yet)
```

### Staging/Production Deployment

**⚠️ WARNING:** Modifying production schema requires careful planning.

**Steps:**
1. **Backup production database first!**
   ```bash
   pg_dump -h prod-host -U admin -d prod_db -Fc > backup_$(date +%Y%m%d).dump
   ```

2. **Generate migration script** from schema diff:
   - Compare current production schema with new schema
   - Generate ALTER TABLE statements
   - Test on staging first

3. **Use database migration tools** (if needed):
   - `pgmigrate` - PostgreSQL migration tool
   - `liquibase` - Database change management
   - `flyway` - Database versioning

4. **Apply changes during maintenance window**

5. **Verify changes were applied**

6. **Extract production schema** and update `current_schema.sql`

---

## Rollback Procedures

### Immediate Rollback (if change just applied)

```sql
-- If using transaction (recommended)
BEGIN;
ALTER TABLE table_name ADD COLUMN new_column VARCHAR(255);
-- Test the change
ROLLBACK;  -- Undo if issues found

-- Or
COMMIT;  -- Apply if successful
```

### Rollback After Commit

```sql
-- Remove added column
ALTER TABLE table_name DROP COLUMN new_column;

-- Drop added table
DROP TABLE new_table CASCADE;  -- CASCADE removes dependent objects

-- Drop added index
DROP INDEX idx_table_column;

-- Then extract schema and commit the rollback
```

---

## Schema Documentation

### Documenting Changes

**When committing schema changes, include:**

1. **What changed:**
   - Tables added/modified/removed
   - Columns added/modified/removed
   - Indexes created/dropped
   - Constraints added/removed

2. **Why it changed:**
   - Feature requirement
   - Bug fix
   - Performance optimization
   - Data integrity improvement

3. **Impact:**
   - Breaking changes for API
   - Required data migration
   - Performance implications
   - Backward compatibility

4. **Testing:**
   - How it was tested
   - Test environment used
   - Any issues encountered

### Example Commit Message

```
feat: Add customer_tier to members table

Database schema changes:
- Added members.customer_tier VARCHAR(50) DEFAULT 'standard'
  - Values: 'standard', 'premium', 'enterprise'
- Added index idx_members_customer_tier for reporting queries
- Added CHECK constraint to validate tier values

Why:
- Support tiered membership pricing model
- Enable filtering by customer tier in admin portal
- Required for subscription renewal logic

Impact:
- API: No breaking changes (column is nullable with default)
- Existing members default to 'standard' tier
- New admin UI filter available immediately

Testing:
- Tested on asr_dev database (October 20, 2025)
- Verified existing members show 'standard' tier
- Tested INSERT/UPDATE with all tier values
- Confirmed index improves tier filtering query by 80%

Migration applied: October 20, 2025, 08:00 UTC
Schema extracted: SQLPro Studio
Lines changed: +15 (CREATE INDEX, ALTER TABLE)

Related: JIRA-1234 - Tiered Membership Pricing

🤖 Generated with [Claude Code](https://claude.com/claude-code)

Co-Authored-By: Claude <noreply@anthropic.com>
```

---

## Troubleshooting

### Problem: Schema extraction includes data

**Solution:** Use `--schema-only` flag with pg_dump or ensure "Data" is unchecked in SQLPro Studio export.

### Problem: Indexes not exported by SQLPro Studio

**Solution:** Export indexes separately using the query provided in Step 3, then append to schema file.

### Problem: Schema file has syntax errors

**Solution:**
1. Test the schema file on a clean database:
   ```bash
   psql -d test_db -f current_schema.sql
   ```
2. Fix errors
3. Re-extract if needed

### Problem: Git diff shows many unrelated changes

**Solution:**
- This can happen if SQLPro Studio formats differently
- Use `git diff --word-diff` for better comparison
- Consider using pg_dump for consistent formatting

### Problem: Schema change breaks production

**Solution:**
1. **Immediate:** Rollback using backup
   ```bash
   pg_restore -d prod_db backup_20251020.dump
   ```
2. **Document incident** in Git and team chat
3. **Analyze what went wrong**
4. **Test more thoroughly next time**
5. **Consider using database migration tools** for complex changes

---

## Archive of Old Migrations

**Location:** `database/migrations/archive_2025-10-20/`

All previous migration files (001-016) were archived on October 20, 2025 when we transitioned to DDL-based schema management. These are kept for historical reference but are **no longer applied to new databases**.

**Contents:**
- 15 numbered migrations (001.sql through 016.sql)
- Includes duplicate 014 files (naming conflict)
- All changes from these migrations are now in `current_schema.sql`

**DO NOT USE** these files for new databases. Use `current_schema.sql` instead.

---

## Summary

**Database schema changes are tracked via Git using these steps:**

1. 🔧 **Make changes in development database**
2. 📤 **Extract complete schema** (tables + indexes)
3. 🔍 **Review diff** to verify changes
4. 💾 **Replace current_schema.sql**
5. ✍️ **Commit with detailed message**
6. 🚀 **Push to Git repository**

**The schema file is the single source of truth for:**
- Fresh database installations
- Documentation of current state
- Change tracking via Git history
- Production deployment planning

---

## Related Documentation

- **[SCHEMA_REVIEW_2025-10-20.md](./SCHEMA_REVIEW_2025-10-20.md)** - Latest schema analysis
- **[MIGRATION_SESSION_2025-10-20.md](../docs/MIGRATION_SESSION_2025-10-20.md)** - Migration 015 & 016 details
- **[current_schema.sql](./current_schema.sql)** - Current database schema (1,127 lines)
- **[get_indexes.sql](./get_indexes.sql)** - Query to extract indexes
- **[schema_indexes.csv](./schema_indexes.csv)** - Latest index export

---

**Questions?** See the troubleshooting section or contact the development team.
