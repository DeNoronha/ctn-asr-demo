# Database Schema Management

**Database:** psql-ctn-demo-asr-dev.postgres.database.azure.com
**Current as of:** October 20, 2025

---

## Directory Structure

```
database/
├── README.md                           # This file
├── schema/
│   └── current_schema.sql             # Full DDL dump of current database schema
├── migrations/
│   └── archive_2025-10-20/            # Historical migration files (reference only)
└── seed-data.sql                       # Sample/test data
```

---

## Schema Management Approach

We maintain a **single source of truth** DDL file (`schema/current_schema.sql`) that represents the complete current state of the database, rather than maintaining incremental migration files.

### When to Update the Schema File

Update `schema/current_schema.sql` after:
- Applying database changes in development
- Major feature releases
- Before deploying to production
- Monthly schema reviews

---

## How to Extract DDL Schema

### Method 1: Using SQLPro Studio (Current Tool)

1. **Connect to Database**
   - File → New Connection → PostgreSQL
   - Host: `psql-ctn-demo-asr-dev.postgres.database.azure.com`
   - Port: `5432`
   - Database: `asr_dev`
   - User: `asradmin`
   - Password: (from `.credentials` file)
   - SSL Mode: Required

2. **Export Database Structure**

   **Option A: Using Export Function**
   - Database → Export → SQL Dump
   - Or: Right-click database name → Export → SQL Dump

   **Option B: Using pg_dump (Recommended)**
   - Tools → Terminal/Console
   - Run the pg_dump command (see Method 4 below)

   **Option C: Manual DDL Generation**
   - Expand database in sidebar
   - Expand "Tables" section
   - Select all tables (Cmd+Click)
   - Right-click → Generate SQL → Create Statement
   - Copy output to `current_schema.sql`
   - Repeat for Indexes, Constraints, Sequences

3. **Export Settings (if using SQL Dump)**
   - ✅ Schema Only (no data)
   - ✅ Include CREATE TABLE statements
   - ✅ Include CREATE INDEX statements
   - ✅ Include constraints (FK, PK, Unique)
   - ✅ Include sequences
   - ❌ Include INSERT statements
   - ❌ Include GRANT/REVOKE
   - ❌ Include ownership

4. **Save Location**
   - File → Save As
   - Location: `/Users/ramondenoronha/Dev/DIL/ASR-full/database/schema/current_schema.sql`

5. **Clean Up Export**
   - Remove any `SET` statements for client settings
   - Remove `ALTER TABLE ... OWNER TO ...` statements
   - Remove `GRANT` and `REVOKE` statements
   - Add header comment with date and description:
   ```sql
   -- ============================================
   -- CTN Association Register Database Schema
   -- Database: asr_dev (psql-ctn-demo-asr-dev)
   -- Extracted: 2025-10-20
   -- Tool: SQLPro Studio
   -- ============================================
   ```

---

### Method 2: Using TablePlus (Alternative GUI)

1. **Connect to Database**
   - Create New → PostgreSQL
   - Enter connection details (same as above)

2. **Export DDL**
   - Select database → Export → Structure
   - Or: Cmd+E → Export → Structure to SQL

3. **Save to:** `database/schema/current_schema.sql`

---

### Method 3: Using pgAdmin 4 (Free Alternative)

1. **Connect to Database**
   - Add new server connection with credentials above

2. **Extract DDL**
   - Right-click database → **Backup...**
   - Format: **Plain** (not Custom or Tar)
   - Filename: `current_schema.sql`

3. **Dump Options**
   - **Sections:** Schema only
   - **Do not save:** Owner, Privileges, Tablespaces
   - **Queries:** Use column inserts, Use insert commands (both unchecked)

4. **Save**
   - Save to: `database/schema/current_schema.sql`

---

### Method 4: Using DBeaver (Free Alternative)

1. **Connect to Database**
   - Create new PostgreSQL connection

2. **Export DDL**
   - Right-click database → **Generate SQL** → **DDL**
   - Or: Database → **Export Data** → **DDL**

3. **Options**
   - Source: Select all tables
   - ✅ Generate DROP statements (optional)
   - ✅ Generate CREATE statements
   - ✅ Include indexes
   - ✅ Include constraints

4. **Save**
   - Target: File
   - Location: `database/schema/current_schema.sql`

---

### Method 5: Using psql Command Line (Recommended for Automation)

```bash
# Set PGPASSWORD environment variable from .credentials file
# export PGPASSWORD=<value-from-credentials-file>

# Extract schema only (no data)
pg_dump \
  -h psql-ctn-demo-asr-dev.postgres.database.azure.com \
  -p 5432 \
  -U asradmin \
  -d asr_dev \
  --schema-only \
  --no-owner \
  --no-privileges \
  --no-tablespaces \
  -f database/schema/current_schema.sql
```

**Additional Options:**
```bash
# Include sequences
--no-acl

# Exclude specific tables
--exclude-table=temp_*

# Clean format (with DROP statements)
--clean

# Verbose output
--verbose
```

---

### Method 6: Using Azure Data Studio

1. **Install PostgreSQL Extension**
   - Extensions → Search "PostgreSQL" → Install

2. **Connect to Database**
   - New Connection → PostgreSQL
   - Enter connection details

3. **Generate Script**
   - Right-click database → **Generate Script**
   - Select: Schema only
   - Save to: `database/schema/current_schema.sql`

---

## Schema File Format

The `current_schema.sql` file should include:

```sql
-- ============================================
-- CTN Association Register Database Schema
-- Database: asr_dev (psql-ctn-demo-asr-dev)
-- Last Updated: 2025-10-20
-- Description: Complete DDL for CTN ASR platform
-- ============================================

-- Drop existing objects (optional, for clean reinstall)
-- DROP TABLE IF EXISTS ...

-- Extensions
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- Tables (in dependency order)
CREATE TABLE party_reference (
    party_id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    -- ... columns
);

CREATE TABLE legal_entity (
    legal_entity_id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    party_id UUID REFERENCES party_reference(party_id),
    -- ... columns
);

-- ... all other tables

-- Indexes
CREATE INDEX idx_members_legal_entity_id ON members(legal_entity_id);
-- ... all other indexes

-- Constraints (if not inline)
ALTER TABLE members ADD CONSTRAINT fk_members_legal_entity
    FOREIGN KEY (legal_entity_id) REFERENCES legal_entity(legal_entity_id);

-- Functions/Triggers (if any)

-- Views (if any)

-- Comments on tables/columns
COMMENT ON TABLE members IS 'Member organizations in the CTN network';
COMMENT ON COLUMN members.azure_ad_object_id IS 'Azure AD object ID for user authentication';
```

---

## Applying Schema to New Database

### Fresh Install
```bash
# Set PGPASSWORD from credentials file first
# export PGPASSWORD=<your-password>

# Create database
createdb -h <host> -U <user> <dbname>

# Apply schema
psql -h <host> -U <user> -d <dbname> -f database/schema/current_schema.sql

# Apply seed data (if needed)
psql -h <host> -U <user> -d <dbname> -f database/seed-data.sql
```

### Verify Schema
```bash
psql -h <host> -U <user> -d <dbname> -c "\dt"  # List tables
psql -h <host> -U <user> -d <dbname> -c "\di"  # List indexes
```

---

## Current Schema Summary (as of 2025-10-20)

### Core Tables
- `party_reference` - Party registry (organizations, individuals)
- `legal_entity` - Legal entities linked to parties
- `members` - CTN member organizations
- `contacts` - Contact persons for members
- `identifiers` - Organization identifiers (SCAC, SMDG, etc.)
- `endpoints` - API endpoints for member systems

### Security & Authentication
- `oauth_clients` - OAuth 2.0 clients
- `issued_tokens` - Issued JWT tokens (BDI)
- `bvad_issued_tokens` - BVAD-specific tokens
- `members.azure_ad_object_id` - Azure AD user mapping (AUTH-001)

### Admin & Audit
- `audit_logs` - System audit trail
- `admin_tasks` - Admin task tracking
- `vetting_records` - Member vetting history
- `subscriptions` - Membership subscriptions
- `newsletters` - Newsletter management

### Key Features
- ✅ All timestamp columns use `TIMESTAMPTZ` (UTC with timezone)
- ✅ Azure AD authentication support (AUTH-001)
- ✅ Multi-tenant data isolation via party_id
- ✅ Comprehensive audit logging
- ✅ Performance indexes on all foreign keys
- ✅ UUID primary keys throughout

---

## Migration History

See `migrations/archive_2025-10-20/README_MIGRATIONS.md` for historical migration information.

**Key Milestones:**
- **2025-10-20:** Migration 015 & 016 applied
  - Added Azure AD object ID mapping
  - Standardized all timestamps to TIMESTAMPTZ
  - Archived incremental migrations, moved to DDL-based approach

---

## Notes

- **Schema changes:** Always test in development before production
- **Backup before applying:** Always backup production database before schema changes
- **Version control:** Commit schema changes to Git with descriptive messages
- **Documentation:** Update this README when schema structure changes significantly
