# Database Schema Management

This directory contains the PostgreSQL schema for the CTN Association Register (ASR).

## Source of Truth

- **`asr_dev.sql`** — Complete DDL dump representing the current schema.
- **`schema/SCHEMA_REFERENCE.md`** — Human-readable schema reference (tables, views, conventions).
- **`seed-data.sql`** — Sample/test data.

The project uses a **DDL-based approach**: `asr_dev.sql` is the single source of truth, not a chain of incremental migrations. Apply it to spin up a new database, and re-export it after schema changes in the production database.

## Apply Schema to a New Database

```bash
# Create database
createdb -h <host> -U <user> <dbname>

# Apply schema
psql -h <host> -U <user> -d <dbname> -f database/asr_dev.sql

# Apply seed data (optional)
psql -h <host> -U <user> -d <dbname> -f database/seed-data.sql
```

## Refresh `asr_dev.sql` After Schema Changes

```bash
pg_dump \
  -h <host> -p 5432 -U <user> -d <dbname> \
  --schema-only --no-owner --no-privileges --no-tablespaces \
  -f database/asr_dev.sql
```

After exporting, strip out any `SET`, `ALTER ... OWNER TO`, `GRANT`, or `REVOKE` statements that pg_dump may emit despite the flags.

## Conventions

- All primary keys are UUIDs.
- All tables carry `dt_created` / `dt_modified` (or `created_at` / `updated_at`) timestamps in `TIMESTAMPTZ`.
- Soft deletes: filter `WHERE is_deleted = false` in queries.
- Enums are enforced via `CHECK` constraints on the column, not in application code.
- Foreign keys use appropriate `CASCADE` / `RESTRICT` behavior — review `asr_dev.sql` before changing FKs.

See `schema/SCHEMA_REFERENCE.md` for the full table list, views, and field-level conventions.
