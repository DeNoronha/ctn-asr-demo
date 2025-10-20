# Database Migration Guide

## Current Migration Status (October 20, 2025)

### Completed Migrations ✅
- `001-enhanced-schema.sql` - Base schema
- `002_add_contact_fields.sql` - Contact fields
- `003_link_members_to_legal_entities.sql` - Member-legal entity linking
- `004-migrate-members-data.sql` - Data migration
- `007_kvk_verification.sql` - KVK verification
- `008_admin_portal_expansion.sql` - Admin portal features
- `009_create_audit_log_table.sql` - Audit logging
- `010_performance_indexes.sql` - Performance indexes
- `011_bdi_orchestration_support.sql` - BDI integration
- `012_international_registry_support.sql` - International registry support
- `013_ensure_legal_entities_exist_FIXED.sql` - ⚠️ Verify if applied
- `014_fix_members_without_legal_entity_id.sql` - ⚠️ Verify if applied
- `015_add_azure_ad_object_id.sql` - ✅ Applied (October 20, 2025)

### Failed/Broken Migrations ❌
- `014_standardize_timestamp_types_DO_NOT_USE.sql` - **DO NOT RUN**
  - Failed on line 38 (bvad_issued_tokens.created_at does not exist)
  - Partially applied - some tables converted, some failed
  - Use `check_migration_014_status.sql` to see current state
  - Use `016_standardize_timestamp_types_FIXED.sql` instead

### Pending Migrations ⏳
- `016_standardize_timestamp_types_FIXED.sql` - **READY TO RUN**
  - Fixed version of 014 with proper column existence checks
  - Safe to run even if 014 partially succeeded
  - Idempotent - can be run multiple times safely

---

## Migration 014 Issue Explanation

**What Happened:**
The original `014_standardize_timestamp_types.sql` attempted to convert all TIMESTAMP WITHOUT TIME ZONE columns to TIMESTAMP WITH TIME ZONE. However, it failed because:

1. It assumed certain columns existed in all tables
2. The `bvad_issued_tokens` table doesn't have a `created_at` column
3. Migration used a transaction (BEGIN/COMMIT), so partial success occurred before rollback

**Current State:**
Run `check_migration_014_status.sql` to see which tables were successfully converted before the failure.

**Solution:**
Run `016_standardize_timestamp_types_FIXED.sql` which:
- ✅ Checks if each column exists before altering it
- ✅ Skips columns that don't exist
- ✅ Only converts timestamp without timezone → timestamp with timezone
- ✅ Idempotent (safe to re-run)

---

## Verification Scripts

### Check Migration 014 Status
```bash
psql -h psql-ctn-demo-asr-dev.postgres.database.azure.com \
     -p 5432 -U asradmin -d asr_dev \
     -f check_migration_014_status.sql
```

### Verify Migration 015 Applied
```bash
psql -h psql-ctn-demo-asr-dev.postgres.database.azure.com \
     -p 5432 -U asradmin -d asr_dev \
     -f verify_015_migration.sql
```

### Check All Timestamp Column Types
```bash
psql -h psql-ctn-demo-asr-dev.postgres.database.azure.com \
     -p 5432 -U asradmin -d asr_dev \
     -f check_table_columns.sql
```

---

## To-Do for Next Database Access Session

1. ✅ **Verify Migration 015** (azure_ad_object_id)
   ```bash
   psql ... -f verify_015_migration.sql
   ```

2. ⏳ **Check Migration 014 Status**
   ```bash
   psql ... -f check_migration_014_status.sql
   ```

3. ⏳ **Apply Migration 016** (timestamp standardization)
   ```bash
   psql ... -f 016_standardize_timestamp_types_FIXED.sql
   ```

4. ⏳ **Verify Migration 013** (legal entities)
   ```sql
   SELECT COUNT(*) FROM members m
   WHERE m.legal_entity_id IS NOT NULL
   AND NOT EXISTS (
       SELECT 1 FROM legal_entity le
       WHERE le.legal_entity_id = m.legal_entity_id
   );
   -- Should return 0 if migration 013 was applied
   ```

5. ⏳ **Verify Migration 014** (members without legal_entity_id)
   ```sql
   SELECT COUNT(*) FROM members WHERE legal_entity_id IS NULL;
   -- Should return 0 if migration applied
   ```

---

## Connection Command

```bash
# Set PGPASSWORD environment variable from .credentials file before connecting
psql -h psql-ctn-demo-asr-dev.postgres.database.azure.com \
     -p 5432 -U asradmin -d asr_dev
```

**Note:** Database credentials are stored in `.credentials` file (gitignored).
Set the `PGPASSWORD` environment variable from that file before running psql.

---

## Notes

- Migration numbering has conflicts (two migrations numbered 014)
- Future migrations should start at 017
- Always verify column existence before ALTER TABLE operations
- Use DO blocks with dynamic SQL for defensive migrations
- Test migrations on non-production database first when possible
