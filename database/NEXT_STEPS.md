# Database Schema Extraction - Next Steps

**Date:** October 20, 2025
**Status:** Ready for schema extraction

---

## What Was Done ✅

1. **Cleared migrations directory**
   - All 16 migration files archived to `migrations/archive_2025-10-20/`
   - Migrations directory now empty and ready for DDL-based approach

2. **Created comprehensive documentation**
   - `database/README.md` - Complete guide with SQLPro Studio instructions
   - `database/extract_schema.sh` - Automated extraction script
   - `database/.gitignore` - Ignore temporary/backup files

3. **Committed changes to Git**
   - Commit: `8daa416`
   - Pushed to Azure DevOps

---

## What You Need to Do Now 📋

### Step 1: Extract Current Schema Using SQLPro Studio

1. **Open SQLPro Studio**
   - File → New Connection → PostgreSQL

2. **Enter Connection Details**
   ```
   Host: psql-ctn-demo-asr-dev.postgres.database.azure.com
   Port: 5432
   Database: asr_dev
   User: asradmin
   Password: <from .credentials file>
   SSL Mode: Required
   ```

3. **Export Database Structure**

   **Option A: Using Export Menu**
   - Database → Export → SQL Dump
   - Or: Right-click database → Export → SQL Dump

   **Settings:**
   - ✅ Schema Only (no data)
   - ✅ Include CREATE TABLE statements
   - ✅ Include CREATE INDEX statements
   - ✅ Include constraints (FK, PK, Unique)
   - ✅ Include sequences
   - ❌ Include INSERT statements
   - ❌ Include GRANT/REVOKE
   - ❌ Include ownership

   **Option B: Manual DDL Generation**
   - Expand database → Expand "Tables"
   - Select all tables (Cmd+Click or Ctrl+Click)
   - Right-click → Generate SQL → Create Statement
   - Copy output
   - Repeat for Indexes, Constraints, Sequences

4. **Save the File**
   - Save to: `/Users/ramondenoronha/Dev/DIL/ASR-full/database/schema/current_schema.sql`
   - Create the `schema` directory if it doesn't exist

5. **Clean Up the Export**

   Remove these if present:
   - `SET` statements for client settings
   - `ALTER TABLE ... OWNER TO ...` statements
   - `GRANT` and `REVOKE` statements
   - Any export tool version comments

   Add this header at the top:
   ```sql
   -- ============================================
   -- CTN Association Register Database Schema
   -- Database: asr_dev (psql-ctn-demo-asr-dev)
   -- Extracted: 2025-10-20
   -- Tool: SQLPro Studio
   -- ============================================

   ```

---

### Step 2: Commit the Schema to Git

```bash
cd /Users/ramondenoronha/Dev/DIL/ASR-full

# Add the schema file
git add database/schema/current_schema.sql

# Commit
git commit -m "chore: Add current database schema (extracted 2025-10-20)

Complete DDL export of asr_dev database including:
- All tables with columns and data types
- All indexes (primary keys, foreign keys, unique constraints)
- All sequences
- Timestamps standardized to TIMESTAMPTZ
- Azure AD authentication columns (AUTH-001)

Extracted from: psql-ctn-demo-asr-dev.postgres.database.azure.com
Tool: SQLPro Studio
Date: 2025-10-20"

# Push to remote
git push origin main
```

---

### Step 3: Verify the Schema (Optional)

Check that the schema file includes:

- ✅ CREATE TABLE statements for all tables
- ✅ CREATE INDEX statements for all indexes
- ✅ CONSTRAINT definitions (FK, PK, Unique)
- ✅ CREATE SEQUENCE statements
- ✅ All timestamp columns use `TIMESTAMP WITH TIME ZONE`
- ✅ `members.azure_ad_object_id` column exists (AUTH-001)
- ✅ `members.email` column exists (AUTH-001)

Expected tables (should all be present):
- party_reference
- legal_entity
- members
- contacts
- identifiers
- endpoints
- oauth_clients
- issued_tokens
- bvad_issued_tokens
- audit_logs
- admin_tasks
- vetting_records
- subscriptions
- newsletters

---

## Alternative: Use Automated Script

If you have `pg_dump` installed locally, you can use the automated script:

```bash
cd /Users/ramondenoronha/Dev/DIL/ASR-full/database

# Set password from .credentials file
export PGPASSWORD=value-from-credentials-file

# Run extraction script
./extract_schema.sh

# The script will create database/schema/current_schema.sql automatically
```

Then just commit the file as shown in Step 2.

---

## Why This Approach?

**Benefits of DDL-based schema management:**

1. **Single source of truth** - One file shows complete database state
2. **Easier reviews** - Can see entire schema in one file
3. **No migration conflicts** - No numbering issues like we had with 014
4. **Better for existing databases** - All 16 migrations already applied
5. **Simpler onboarding** - New developers see current state immediately
6. **Cleaner Git history** - Schema updates are clear changes

**When to update the schema file:**
- After database changes in development
- Before major releases
- Monthly schema reviews
- When adding new tables/columns

---

## Questions?

- **Can't find Export option?** Try right-clicking the database name
- **Missing tables?** Make sure you're connected to `asr_dev` database (not `postgres`)
- **Too many system objects?** Filter to only `public` schema
- **File too large?** Schema-only should be <500KB, if larger you may have data included

See `database/README.md` for detailed instructions with screenshots and troubleshooting.

---

## Summary

✅ Migrations directory cleared and archived
✅ Documentation created
✅ Changes committed to Git
⏳ **Next:** Extract schema using SQLPro Studio
⏳ **Then:** Commit schema file to Git

**Estimated time:** 10-15 minutes
