# PostgreSQL Schema Reference - ASR Database

**Database:** asr_dev
**Server:** psql-ctn-demo-asr-dev.postgres.database.azure.com
**Last Updated:** November 3, 2025

---

## Table of Contents

1. [Core Tables](#core-tables)
2. [Naming Conventions](#naming-conventions)
3. [Common Patterns](#common-patterns)
4. [Primary Keys](#primary-keys)
5. [Foreign Key Relationships](#foreign-key-relationships)
6. [Timestamp Conventions](#timestamp-conventions)
7. [Audit Trail Fields](#audit-trail-fields)
8. [Soft Delete Pattern](#soft-delete-pattern)
9. [Quick Reference by Table](#quick-reference-by-table)

---

## Core Tables

### 1. party_reference
**Purpose:** Root entity for all parties in the system (organizations, individuals)

**Primary Key:** `party_id` (UUID)

**Columns:**
```sql
party_id    | uuid                     | NOT NULL | gen_random_uuid()
dt_created  | timestamp with time zone |          | now()
dt_modified | timestamp with time zone |          | now()
created_by  | character varying(100)   |          |
modified_by | character varying(100)   |          |
is_deleted  | boolean                  |          | false
party_class | character varying(255)   |          | (e.g., 'ORGANIZATION', 'INDIVIDUAL')
party_type  | character varying(255)   |          | (e.g., 'MEMBER', 'PARTNER')
```

**Indexes:**
- PRIMARY KEY: `party_reference_pkey` (party_id)
- `idx_party_reference_created` (dt_created)
- `idx_party_reference_deleted` (is_deleted) WHERE is_deleted = false

**Triggers:**
- `trg_party_reference_modified` - Auto-updates dt_modified on UPDATE

**Referenced By:**
- legal_entity.party_id
- m2m_clients.created_by
- m2m_clients.modified_by

**Common Pitfall:** Cannot self-reference in created_by/modified_by (use VARCHAR email instead)

---

### 2. legal_entity
**Purpose:** Legal entities (companies, organizations) with address and status

**Primary Key:** `legal_entity_id` (UUID)
**Foreign Keys:** `party_id` → party_reference.party_id

**Key Columns:**
```sql
legal_entity_id    | uuid                     | NOT NULL | gen_random_uuid()
party_id           | uuid                     | NOT NULL | (FK to party_reference)
dt_created         | timestamp with time zone |          | now()
dt_modified        | timestamp with time zone |          | now()
created_by         | character varying(100)   |          |
modified_by        | character varying(100)   |          |
is_deleted         | boolean                  |          | false
primary_legal_name | character varying(255)   | NOT NULL |
address_line1      | character varying(255)   |          |
address_line2      | character varying(255)   |          |
postal_code        | character varying(255)   |          |
city               | character varying(255)   |          |
province           | character varying(255)   |          |
country_code       | character varying(2)     |          |
status             | character varying(20)    |          | 'PENDING'
membership_level   | character varying(20)    |          | 'BASIC'
authentication_tier| integer                  | NOT NULL | 3
authentication_method | character varying(50) |          | 'EmailVerification'
domain             | character varying(255)   |          |
metadata           | jsonb                    |          |
```

**Indexes:**
- PRIMARY KEY: `legal_entity_pkey` (legal_entity_id)
- `idx_legal_entity_party` (party_id)
- `idx_legal_entity_name` (primary_legal_name)
- `idx_legal_entity_status` (status)
- `idx_legal_entity_deleted` (is_deleted) WHERE is_deleted = false

**Triggers:**
- `trg_legal_entity_modified` - Auto-updates dt_modified on UPDATE

**Referenced By:**
- legal_entity_contact.legal_entity_id
- legal_entity_number.legal_entity_id
- legal_entity_endpoint.legal_entity_id
- m2m_clients.legal_entity_id
- members.legal_entity_id

**Common Pitfall:** Must create party_reference FIRST, then use party_id in legal_entity

---

### 3. legal_entity_contact
**Purpose:** Contact persons for legal entities

**Primary Key:** `legal_entity_contact_id` (UUID)
**Foreign Keys:** `legal_entity_id` → legal_entity.legal_entity_id

**Key Columns:**
```sql
legal_entity_contact_id | uuid                     | NOT NULL | gen_random_uuid()
legal_entity_id         | uuid                     | NOT NULL | (FK to legal_entity)
dt_created              | timestamp with time zone |          | now()
dt_modified             | timestamp with time zone |          | now()
created_by              | character varying(100)   |          |
modified_by             | character varying(100)   |          |
is_deleted              | boolean                  |          | false
contact_type            | character varying(50)    | NOT NULL | (PRIMARY, BILLING, TECHNICAL, etc.)
full_name               | character varying(255)   | NOT NULL |
first_name              | character varying(100)   |          |
last_name               | character varying(100)   |          |
email                   | character varying(255)   | NOT NULL |
phone                   | character varying(50)    |          |
mobile                  | character varying(50)    |          |
job_title               | character varying(100)   |          |
department              | character varying(100)   |          |
is_primary              | boolean                  |          | false
is_active               | boolean                  |          | true
```

**Indexes:**
- PRIMARY KEY: `legal_entity_contact_pkey` (legal_entity_contact_id)
- `idx_legal_entity_contact_entity` (legal_entity_id)
- `idx_legal_entity_contact_email` (email)
- `idx_legal_entity_contact_type` (contact_type)
- `idx_legal_entity_contact_primary` (is_primary) WHERE is_primary = true
- `idx_legal_entity_contact_deleted` (is_deleted) WHERE is_deleted = false

**Triggers:**
- `trg_legal_entity_contact_modified` - Auto-updates dt_modified on UPDATE

**Common Pitfalls:**
- ❌ Don't use `name` column (doesn't exist) → Use `full_name`
- ❌ Don't use `contacts` table (doesn't exist) → Use `legal_entity_contact`
- ✓ All 3 fields required: contact_type, full_name, email

---

### 4. legal_entity_number
**Purpose:** Identifiers for legal entities (KVK, LEI, EUID, EORI, etc.)

**Primary Key:** `legal_entity_reference_id` (UUID)
**Foreign Keys:** `legal_entity_id` → legal_entity.legal_entity_id

**Key Columns:**
```sql
legal_entity_reference_id | uuid                     | NOT NULL | gen_random_uuid()
legal_entity_id           | uuid                     | NOT NULL | (FK to legal_entity)
dt_created                | timestamp with time zone |          | now()
dt_modified               | timestamp with time zone |          | now()
created_by                | character varying(100)   |          |
modified_by               | character varying(100)   |          |
is_deleted                | boolean                  |          | false
identifier_type           | character varying(100)   | NOT NULL | (KVK, LEI, EUID, EORI, VAT, etc.)
identifier_value          | character varying(100)   | NOT NULL |
country_code              | character varying(2)     |          |
registry_name             | character varying(255)   |          | (e.g., "IHK Berlin", "KvK")
registry_url              | character varying(500)   |          |
valid_from                | timestamp with time zone |          |
valid_to                  | timestamp with time zone |          |
validation_status         | character varying(50)    |          | 'PENDING'
validation_date           | timestamp with time zone |          |
```

**Indexes:**
- PRIMARY KEY: `legal_entity_number_pkey` (legal_entity_reference_id)
- `idx_legal_entity_number_entity` (legal_entity_id)
- `idx_legal_entity_number_type` (identifier_type)
- `idx_legal_entity_number_value` (identifier_value)
- `uq_identifier` UNIQUE (legal_entity_id, identifier_type, identifier_value)

**Triggers:**
- `trg_legal_entity_number_modified` - Auto-updates dt_modified on UPDATE

**Common Identifier Types:**
- `KVK` - Dutch Chamber of Commerce (8 digits)
- `EUID` - European Unique Identifier (EU-wide)
- `LEI` - Legal Entity Identifier (20 characters, global)
- `EORI` - Economic Operators Registration (EU customs)
- `HRB` - Handelsregister B (Germany - corporations)
- `SIREN` - French company identifier (9 digits)
- `CRN` - Company Registration Number (UK)

**Common Pitfall:** Unique constraint exists on (legal_entity_id, identifier_type, identifier_value) - cannot insert duplicate

---

### 5. legal_entity_endpoint
**Purpose:** API endpoints exposed by legal entities

**Primary Key:** `legal_entity_endpoint_id` (UUID)
**Foreign Keys:** `legal_entity_id` → legal_entity.legal_entity_id

**Key Columns:**
```sql
legal_entity_endpoint_id | uuid                     | NOT NULL | gen_random_uuid()
legal_entity_id          | uuid                     | NOT NULL | (FK to legal_entity)
dt_created               | timestamp with time zone |          | now()
dt_modified              | timestamp with time zone |          | now()
created_by               | character varying(100)   |          |
modified_by              | character varying(100)   |          |
is_deleted               | boolean                  |          | false
endpoint_name            | character varying(255)   | NOT NULL |
endpoint_url             | character varying(500)   |          |
endpoint_description     | text                     |          |
data_category            | character varying(100)   |          |
endpoint_type            | character varying(50)    |          | 'REST_API'
authentication_method    | character varying(50)    |          |
is_active                | boolean                  |          | true
```

**Indexes:**
- PRIMARY KEY: `legal_entity_endpoint_pkey` (legal_entity_endpoint_id)
- `idx_legal_entity_endpoint_entity` (legal_entity_id)
- `idx_legal_entity_endpoint_category` (data_category)
- `idx_legal_entity_endpoint_deleted` (is_deleted) WHERE is_deleted = false

**Triggers:**
- `trg_legal_entity_endpoint_modified` - Auto-updates dt_modified on UPDATE

---

### 6. m2m_clients
**Purpose:** Machine-to-machine OAuth2 clients

**Primary Key:** `m2m_client_id` (UUID)
**Foreign Keys:**
- `legal_entity_id` → legal_entity.legal_entity_id
- `created_by` → party_reference.party_id (UUID, not VARCHAR!)
- `modified_by` → party_reference.party_id (UUID, not VARCHAR!)

**Key Columns:**
```sql
m2m_client_id   | uuid                     | NOT NULL | gen_random_uuid()
legal_entity_id | uuid                     | NOT NULL | (FK to legal_entity)
dt_created      | timestamp with time zone |          | now()
dt_modified     | timestamp with time zone |          | now()
created_by      | uuid                     |          | (FK to party_reference.party_id)
modified_by     | uuid                     |          | (FK to party_reference.party_id)
is_deleted      | boolean                  |          | false
client_name     | character varying(255)   | NOT NULL |
azure_client_id | uuid                     | NOT NULL | (Azure AD application ID)
azure_object_id | uuid                     |          |
description     | text                     |          |
assigned_scopes | text[]                   | NOT NULL | (array of scopes)
is_active       | boolean                  |          | true
```

**Valid Scopes:**
- `ETA.Read` - Read ETA updates
- `Container.Read` - Read container status
- `Booking.Read` - Read booking data
- `Booking.Write` - Create/update bookings
- `Orchestration.Read` - Read orchestration data

**Indexes:**
- PRIMARY KEY: `m2m_clients_pkey` (m2m_client_id)
- `idx_m2m_clients_legal_entity` (legal_entity_id) WHERE is_deleted = false
- `idx_m2m_clients_azure_client_id` (azure_client_id) WHERE is_deleted = false
- `m2m_clients_azure_client_id_key` UNIQUE (azure_client_id)

**Common Pitfall:** created_by/modified_by are UUID (FK to party_id), not VARCHAR email!

---

### 7. members (Legacy Table)
**Purpose:** Member organizations (single-tenant view)

**Primary Key:** `id` (UUID)
**Foreign Keys:** `legal_entity_id` → legal_entity.legal_entity_id

**Key Columns:**
```sql
id                 | uuid                     | NOT NULL | gen_random_uuid()
org_id             | character varying(100)   | NOT NULL | UNIQUE
legal_name         | character varying(255)   | NOT NULL |
lei                | character varying(20)    |          |
kvk                | character varying(20)    |          |
domain             | character varying(255)   | NOT NULL |
status             | character varying(20)    | NOT NULL | 'PENDING'
membership_level   | character varying(20)    |          | 'BASIC'
created_at         | timestamp with time zone |          | now()
updated_at         | timestamp with time zone |          | now()
metadata           | jsonb                    |          |
legal_entity_id    | uuid                     |          | (FK to legal_entity)
azure_ad_object_id | uuid                     |          |
email              | character varying(255)   |          |
```

**Indexes:**
- PRIMARY KEY: `members_pkey` (id)
- `members_org_id_key` UNIQUE (org_id)
- `idx_members_org_id` (org_id)
- `idx_members_status` (status)
- `idx_members_lei` (lei) WHERE lei IS NOT NULL
- `idx_members_azure_ad_oid_unique` UNIQUE (azure_ad_object_id) WHERE azure_ad_object_id IS NOT NULL

**IMPORTANT:** Uses `created_at/updated_at` (legacy convention), NOT `dt_created/dt_modified`

---

### 8. applications
**Purpose:** Membership applications awaiting approval

**Primary Key:** `application_id` (UUID)

**Key Columns:**
```sql
application_id      | uuid                        | NOT NULL | gen_random_uuid()
applicant_email     | character varying(255)      | NOT NULL |
applicant_name      | character varying(255)      | NOT NULL |
applicant_job_title | character varying(255)      |          |
applicant_phone     | character varying(50)       |          |
legal_name          | character varying(255)      | NOT NULL |
kvk_number          | character varying(50)       | NOT NULL |
lei                 | character varying(20)       |          |
company_address     | text                        |          |
postal_code         | character varying(20)       |          |
city                | character varying(100)      |          |
country             | character varying(100)      |          | 'Netherlands'
status              | character varying(50)       |          | 'pending'
submitted_at        | timestamp without time zone |          | now()
reviewed_at         | timestamp without time zone |          |
reviewed_by         | uuid                        |          |
dt_created          | timestamp without time zone |          | now()
dt_updated          | timestamp without time zone |          | now()
```

**Indexes:**
- PRIMARY KEY: `applications_pkey` (application_id)
- `idx_applications_status` (status)
- `idx_applications_email` (applicant_email)
- `idx_applications_kvk` (kvk_number)

**Check Constraints:**
- `applications_status_check` - status IN ('pending', 'under_review', 'approved', 'rejected')

**IMPORTANT:** Uses `submitted_at`, `dt_created`, `dt_updated` (mixed conventions)

---

## Naming Conventions

### Table Names
- **Pattern:** `<entity>` or `<entity>_<subtype>`
- **Examples:**
  - Single word: `members`, `applications`
  - Compound: `legal_entity`, `party_reference`
  - With subtype: `legal_entity_contact`, `legal_entity_number`, `legal_entity_endpoint`

### Column Names
- **Pattern:** `snake_case`
- **Boolean:** `is_<property>` (e.g., `is_deleted`, `is_primary`, `is_active`)
- **Timestamps:** `dt_<event>` or `<event>_at` (see Timestamp Conventions)
- **Foreign Keys:** `<referenced_table>_id` (e.g., `legal_entity_id`, `party_id`)

### Constraint Names
- **Primary Key:** `<table>_pkey`
- **Foreign Key:** `fk_<referenced_table>` or `fk_<descriptive_name>`
- **Unique:** `uq_<column>` or `<table>_<column>_key`
- **Check:** `<table>_<column>_check` or `ck_<descriptive_name>`
- **Index:** `idx_<table>_<column>`

---

## Common Patterns

### 1. Soft Delete Pattern
**All main tables support soft delete:**
```sql
is_deleted | boolean | default false
```

**Usage:**
```sql
-- Mark as deleted (preserve data for audit)
UPDATE legal_entity_contact
SET is_deleted = TRUE, dt_modified = CURRENT_TIMESTAMP
WHERE legal_entity_contact_id = $1;

-- Query active records only
SELECT * FROM legal_entity_contact
WHERE is_deleted IS FALSE OR is_deleted IS NULL;
```

### 2. Audit Trail Pattern
**All main tables include:**
```sql
dt_created  | timestamp with time zone | default now()
dt_modified | timestamp with time zone | default now()
created_by  | character varying(100) OR uuid
modified_by | character varying(100) OR uuid
```

**Usage:**
```sql
-- INSERT: Let defaults handle dt_created, set created_by
INSERT INTO legal_entity_contact (legal_entity_id, email, full_name, created_by)
VALUES ($1, $2, $3, $4);

-- UPDATE: Set dt_modified explicitly (or let trigger handle it)
UPDATE legal_entity_contact
SET full_name = $1, dt_modified = CURRENT_TIMESTAMP, modified_by = $2
WHERE legal_entity_contact_id = $3;
```

### 3. Primary Key Pattern
**All main tables use UUID primary keys:**
```sql
<table>_id | uuid | NOT NULL | default gen_random_uuid()
```

**Benefits:**
- Globally unique (no collisions across tables/databases)
- Security (non-sequential, unpredictable)
- Distributed system friendly

### 4. Partial Update Pattern (COALESCE)
**Most UPDATE APIs use COALESCE for optional fields:**
```sql
UPDATE legal_entity_contact
SET full_name = COALESCE($1, full_name),
    email = COALESCE($2, email),
    phone = COALESCE($3, phone),
    dt_modified = CURRENT_TIMESTAMP
WHERE legal_entity_contact_id = $4;
```

**Benefit:** Client can send partial updates (only changed fields)

---

## Primary Keys

### UUID vs SERIAL
**All main tables use UUID (gen_random_uuid()):**
- ✓ Globally unique
- ✓ Non-sequential (security benefit)
- ✓ Can be generated client-side
- ✓ No collision risk in distributed systems

**Legacy tables (members) use UUID but with different naming:**
- `members.id` (not `members.member_id`)
- `applications.application_id` (not `applications.id`)

---

## Foreign Key Relationships

### Core Entity Hierarchy
```
party_reference (party_id)
    ↓
legal_entity (legal_entity_id, FK: party_id)
    ↓
    ├── legal_entity_contact (FK: legal_entity_id)
    ├── legal_entity_number (FK: legal_entity_id)
    ├── legal_entity_endpoint (FK: legal_entity_id)
    ├── m2m_clients (FK: legal_entity_id, created_by, modified_by)
    └── members (FK: legal_entity_id) [legacy]
```

### Cascade Behavior

**ON DELETE CASCADE (default for most FKs):**
```sql
CONSTRAINT fk_legal_entity
  FOREIGN KEY (legal_entity_id)
  REFERENCES legal_entity(legal_entity_id)
  ON DELETE CASCADE
```
**Effect:** Deleting legal_entity deletes all related contacts, identifiers, endpoints, m2m_clients

**ON DELETE RESTRICT (members table):**
```sql
CONSTRAINT members_legal_entity_id_fkey
  FOREIGN KEY (legal_entity_id)
  REFERENCES legal_entity(legal_entity_id)
  ON UPDATE CASCADE
  ON DELETE RESTRICT
```
**Effect:** Cannot delete legal_entity if members record exists (must delete member first)

**Common Pitfall:** Must create parent records before children
```typescript
// WRONG: Try to create contact before legal_entity exists
INSERT INTO legal_entity_contact (legal_entity_id, ...)
VALUES ('non-existent-uuid', ...); -- ERROR: FK violation (23503)

// RIGHT: Create legal_entity first
1. INSERT INTO party_reference (...) RETURNING party_id;
2. INSERT INTO legal_entity (party_id, ...) RETURNING legal_entity_id;
3. INSERT INTO legal_entity_contact (legal_entity_id, ...);
```

---

## Timestamp Conventions

### Two Conventions Coexist

#### New Convention (Recommended)
**Used by:** party_reference, legal_entity, legal_entity_contact, legal_entity_number, legal_entity_endpoint, m2m_clients

```sql
dt_created  | timestamp with time zone | default now()
dt_modified | timestamp with time zone | default now()
```

**Triggers:** Most tables have `trg_<table>_modified` trigger that auto-updates `dt_modified` on UPDATE

**Usage:**
```sql
-- INSERT: Let default handle dt_created, dt_modified
INSERT INTO legal_entity_contact (legal_entity_id, email, full_name)
VALUES ($1, $2, $3);
-- dt_created and dt_modified both set to now() automatically

-- UPDATE: Trigger handles dt_modified
UPDATE legal_entity_contact
SET full_name = $1
WHERE legal_entity_contact_id = $2;
-- dt_modified automatically updated by trigger
```

#### Legacy Convention
**Used by:** members, applications

```sql
created_at | timestamp with time zone | default now()
updated_at | timestamp with time zone | default now()
```

**No triggers** - Must explicitly set `updated_at` on UPDATE:
```sql
UPDATE members
SET domain = $1, updated_at = now()
WHERE org_id = $2;
```

### Best Practice
- **New tables:** Use `dt_created/dt_modified` with trigger
- **Updates:** Let trigger handle `dt_modified` (don't set explicitly unless needed)
- **Queries:** Both conventions work the same (just different column names)

---

## Audit Trail Fields

### created_by / modified_by

**Two Data Types Used:**

#### VARCHAR(100) - Most Tables
**Used by:** party_reference, legal_entity, legal_entity_contact, legal_entity_number, legal_entity_endpoint

```sql
created_by  | character varying(100)
modified_by | character varying(100)
```

**Typical Values:**
- Email address: `user@example.com`
- System user: `system`, `SYSTEM`
- User ID: `azure-ad-object-id`

**Usage:**
```typescript
const userEmail = request.userEmail || 'system';
await pool.query(
  `INSERT INTO legal_entity_contact (..., created_by) VALUES (..., $1)`,
  [..., userEmail]
);
```

#### UUID - m2m_clients Only
**Used by:** m2m_clients

```sql
created_by  | uuid  -- FK to party_reference.party_id
modified_by | uuid  -- FK to party_reference.party_id
```

**Usage:**
```typescript
const partyId = request.userId; // Must be UUID (party_id)
await pool.query(
  `INSERT INTO m2m_clients (..., created_by) VALUES (..., $1)`,
  [..., partyId]
);
```

**Common Pitfall:** Don't mix types - m2m_clients requires UUID, others require VARCHAR

---

## Soft Delete Pattern

### Implementation
```sql
is_deleted | boolean | default false
```

### Usage Pattern

**Mark as Deleted (Soft Delete):**
```sql
UPDATE legal_entity_contact
SET is_deleted = TRUE, dt_modified = CURRENT_TIMESTAMP
WHERE legal_entity_contact_id = $1;
```

**Query Active Records:**
```sql
SELECT * FROM legal_entity_contact
WHERE is_deleted IS FALSE  -- or: is_deleted = FALSE
   OR is_deleted IS NULL;  -- handle NULLs from old data
```

**Indexes Support Soft Delete:**
```sql
idx_legal_entity_contact_deleted btree (is_deleted) WHERE is_deleted = false
```

### Benefits
- Preserve audit trail
- Undo accidental deletes
- Regulatory compliance (data retention)
- Performance: partial indexes exclude deleted records

### Common Pitfall
Always filter by `is_deleted`:
```sql
-- WRONG: Returns deleted records
SELECT * FROM legal_entity_contact WHERE legal_entity_id = $1;

-- RIGHT: Only active records
SELECT * FROM legal_entity_contact
WHERE legal_entity_id = $1 AND (is_deleted IS NULL OR is_deleted = FALSE);
```

---

## Quick Reference by Table

### party_reference
- **PK:** party_id (UUID)
- **Timestamps:** dt_created, dt_modified
- **Audit:** created_by (VARCHAR), modified_by (VARCHAR)
- **Soft Delete:** is_deleted
- **Trigger:** trg_party_reference_modified

### legal_entity
- **PK:** legal_entity_id (UUID)
- **FK:** party_id → party_reference
- **Timestamps:** dt_created, dt_modified
- **Audit:** created_by (VARCHAR), modified_by (VARCHAR)
- **Soft Delete:** is_deleted
- **Trigger:** trg_legal_entity_modified
- **NOT NULL:** party_id, primary_legal_name, authentication_tier

### legal_entity_contact
- **PK:** legal_entity_contact_id (UUID)
- **FK:** legal_entity_id → legal_entity
- **Timestamps:** dt_created, dt_modified
- **Audit:** created_by (VARCHAR), modified_by (VARCHAR)
- **Soft Delete:** is_deleted
- **Trigger:** trg_legal_entity_contact_modified
- **NOT NULL:** legal_entity_id, contact_type, full_name, email

### legal_entity_number
- **PK:** legal_entity_reference_id (UUID)
- **FK:** legal_entity_id → legal_entity
- **Timestamps:** dt_created, dt_modified
- **Audit:** created_by (VARCHAR), modified_by (VARCHAR)
- **Soft Delete:** is_deleted
- **Trigger:** trg_legal_entity_number_modified
- **NOT NULL:** legal_entity_id, identifier_type, identifier_value
- **Unique:** (legal_entity_id, identifier_type, identifier_value)

### legal_entity_endpoint
- **PK:** legal_entity_endpoint_id (UUID)
- **FK:** legal_entity_id → legal_entity
- **Timestamps:** dt_created, dt_modified
- **Audit:** created_by (VARCHAR), modified_by (VARCHAR)
- **Soft Delete:** is_deleted
- **Trigger:** trg_legal_entity_endpoint_modified
- **NOT NULL:** legal_entity_id, endpoint_name

### m2m_clients
- **PK:** m2m_client_id (UUID)
- **FK:** legal_entity_id → legal_entity, created_by → party_reference, modified_by → party_reference
- **Timestamps:** dt_created, dt_modified
- **Audit:** created_by (UUID!), modified_by (UUID!)
- **Soft Delete:** is_deleted
- **NOT NULL:** legal_entity_id, client_name, azure_client_id, assigned_scopes
- **Unique:** azure_client_id

### members (Legacy)
- **PK:** id (UUID)
- **FK:** legal_entity_id → legal_entity
- **Timestamps:** created_at, updated_at (legacy convention)
- **Audit:** No created_by/modified_by
- **Soft Delete:** No is_deleted (hard deletes)
- **NOT NULL:** org_id, legal_name, domain, status
- **Unique:** org_id

### applications
- **PK:** application_id (UUID)
- **FK:** None (independent table)
- **Timestamps:** submitted_at, reviewed_at, dt_created, dt_updated (mixed)
- **Audit:** reviewed_by (UUID), created_by (VARCHAR)
- **Soft Delete:** No is_deleted
- **NOT NULL:** applicant_email, applicant_name, legal_name, kvk_number
- **Check:** status IN ('pending', 'under_review', 'approved', 'rejected')

---

## Common Pitfalls & Solutions

### 1. Wrong Table Name
**❌ WRONG:**
```sql
INSERT INTO contacts (name, email) VALUES (...);
```
**✓ CORRECT:**
```sql
INSERT INTO legal_entity_contact (full_name, email) VALUES (...);
```

### 2. Wrong Column Name
**❌ WRONG:**
```sql
INSERT INTO legal_entity_contact (name, created_at) VALUES (...);
```
**✓ CORRECT:**
```sql
INSERT INTO legal_entity_contact (full_name, dt_created) VALUES (...);
```

### 3. Missing NOT NULL Fields
**❌ WRONG:**
```sql
INSERT INTO legal_entity_contact (legal_entity_id, email)
VALUES (...);  -- Missing contact_type, full_name
```
**✓ CORRECT:**
```sql
INSERT INTO legal_entity_contact (legal_entity_id, contact_type, full_name, email)
VALUES ($1, 'PRIMARY', $2, $3);
```

### 4. Wrong Timestamp Convention
**❌ WRONG (for legal_entity_contact):**
```sql
UPDATE legal_entity_contact SET name = $1, updated_at = NOW() WHERE id = $2;
```
**✓ CORRECT:**
```sql
UPDATE legal_entity_contact SET full_name = $1, dt_modified = NOW()
WHERE legal_entity_contact_id = $2;
```

### 5. Missing FK Parent Record
**❌ WRONG:**
```sql
-- Create contact without creating legal_entity first
INSERT INTO legal_entity_contact (legal_entity_id, ...)
VALUES ('non-existent-uuid', ...);  -- ERROR: FK violation
```
**✓ CORRECT:**
```typescript
// 1. Create party_reference
const { rows: partyRows } = await pool.query(
  `INSERT INTO party_reference (party_class, party_type)
   VALUES ('ORGANIZATION', 'MEMBER') RETURNING party_id`
);
const partyId = partyRows[0].party_id;

// 2. Create legal_entity
const { rows: leRows } = await pool.query(
  `INSERT INTO legal_entity (party_id, primary_legal_name, ...)
   VALUES ($1, $2, ...) RETURNING legal_entity_id`,
  [partyId, ...]
);
const legalEntityId = leRows[0].legal_entity_id;

// 3. NOW create contact
await pool.query(
  `INSERT INTO legal_entity_contact (legal_entity_id, ...)
   VALUES ($1, ...)`,
  [legalEntityId, ...]
);
```

### 6. Forgetting is_deleted Filter
**❌ WRONG:**
```sql
SELECT * FROM legal_entity_contact WHERE legal_entity_id = $1;
-- Returns deleted contacts too!
```
**✓ CORRECT:**
```sql
SELECT * FROM legal_entity_contact
WHERE legal_entity_id = $1
  AND (is_deleted IS NULL OR is_deleted = FALSE);
```

### 7. Mixed created_by Data Types
**❌ WRONG (m2m_clients):**
```typescript
await pool.query(
  `INSERT INTO m2m_clients (..., created_by) VALUES (..., $1)`,
  [..., userEmail]  // ERROR: Expects UUID, got VARCHAR
);
```
**✓ CORRECT:**
```typescript
await pool.query(
  `INSERT INTO m2m_clients (..., created_by) VALUES (..., $1)`,
  [..., partyId]  // UUID (FK to party_reference.party_id)
);
```

---

## Performance Tips

### 1. Use Existing Indexes
**Tables with good index coverage:**
- legal_entity_contact: legal_entity_id, email, is_primary
- legal_entity_number: legal_entity_id, identifier_type, identifier_value
- legal_entity: party_id, primary_legal_name, status
- m2m_clients: legal_entity_id, azure_client_id

**Query pattern (uses index):**
```sql
SELECT * FROM legal_entity_contact
WHERE legal_entity_id = $1  -- Uses idx_legal_entity_contact_entity
  AND is_deleted = FALSE;   -- Uses idx_legal_entity_contact_deleted
```

### 2. Filter Soft Deletes Early
**Indexes are partial (WHERE is_deleted = false):**
```sql
-- Uses partial index efficiently
SELECT * FROM legal_entity_contact
WHERE legal_entity_id = $1 AND is_deleted = FALSE;

-- Doesn't use partial index (includes deleted records)
SELECT * FROM legal_entity_contact WHERE legal_entity_id = $1;
```

### 3. Use Transactions for Multi-Table Inserts
```typescript
const client = await pool.connect();
try {
  await client.query('BEGIN');
  // Insert parent
  const { rows } = await client.query('INSERT INTO legal_entity (...) RETURNING legal_entity_id');
  const legalEntityId = rows[0].legal_entity_id;
  // Insert children
  await client.query('INSERT INTO legal_entity_contact (legal_entity_id, ...) VALUES ($1, ...)', [legalEntityId, ...]);
  await client.query('COMMIT');
} catch (error) {
  await client.query('ROLLBACK');
  throw error;
} finally {
  client.release();
}
```

---

## Migration Best Practices

### 1. Always Add Migrations to /database/migrations/
```sql
-- XXX_add_new_field.sql
ALTER TABLE legal_entity_contact
ADD COLUMN new_field VARCHAR(255);

CREATE INDEX idx_legal_entity_contact_new_field
ON legal_entity_contact(new_field);
```

### 2. Never Change Column Names Without Migration
**❌ WRONG:** Rename column in schema docs, update APIs
**✓ CORRECT:**
1. Create migration: `ALTER TABLE ... RENAME COLUMN old_name TO new_name;`
2. Update APIs
3. Deploy migration BEFORE deploying API changes

### 3. Test Migrations on Dev Database First
```bash
# Test on dev
psql "host=psql-ctn-demo-asr-dev.postgres.database.azure.com ..." \
  -f database/migrations/XXX_migration.sql

# Verify
psql "..." -c "\d+ table_name"
```

---

## Tool Reference

### Inspect Schema
```bash
# Full table structure
\d+ legal_entity_contact

# List all tables
\dt

# List indexes
\di+

# List foreign keys
SELECT * FROM information_schema.table_constraints
WHERE table_name = 'legal_entity_contact';
```

### Query Metadata
```sql
-- List all columns in a table
SELECT column_name, data_type, is_nullable, column_default
FROM information_schema.columns
WHERE table_name = 'legal_entity_contact';

-- List all foreign keys
SELECT tc.constraint_name, tc.table_name, kcu.column_name,
       ccu.table_name AS foreign_table_name,
       ccu.column_name AS foreign_column_name
FROM information_schema.table_constraints AS tc
JOIN information_schema.key_column_usage AS kcu
  ON tc.constraint_name = kcu.constraint_name
JOIN information_schema.constraint_column_usage AS ccu
  ON ccu.constraint_name = tc.constraint_name
WHERE tc.constraint_type = 'FOREIGN KEY'
  AND tc.table_name = 'legal_entity_contact';
```

---

## Related Documentation

- **Schema Validation Report:** `/database/schema/SCHEMA_VALIDATION_REPORT.md`
- **Migrations:** `/database/migrations/`
- **Current DDL:** `/database/schema/current_schema.sql`
- **API Functions:** `/api/src/functions/`

---

**Last Updated:** November 3, 2025
**Validated Against:** asr_dev database (psql-ctn-demo-asr-dev)
**Status:** Production Ready
