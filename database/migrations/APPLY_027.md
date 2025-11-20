# How to Apply Migration 027

## Using TablePlus or SQLPro Studio

1. **Connect to the database:**
   - Host: `psql-ctn-demo-asr-dev.postgres.database.azure.com`
   - Port: `5432`
   - Database: `asr_dev`
   - User: `asradmin`
   - Password: (from your .credentials file)
   - SSL: Required

2. **Open the SQL file:**
   - Open `027_add_identifier_metadata_columns.sql` in TablePlus/SQLPro Studio

3. **Execute the migration:**
   - Select all text (Cmd+A)
   - Execute (Cmd+Enter or click Run button)

4. **Verify the migration:**
   ```sql
   -- Check that new columns exist
   SELECT column_name, data_type, column_default
   FROM information_schema.columns
   WHERE table_name = 'legal_entity_number'
   AND column_name IN ('issuing_authority', 'issued_at', 'expires_at', 'verification_status')
   ORDER BY column_name;

   -- Should return 4 rows showing the new columns
   ```

5. **Test with sample data (optional):**
   ```sql
   -- View current identifiers
   SELECT legal_entity_reference_id, identifier_type, identifier_value,
          verification_status, issuing_authority
   FROM legal_entity_number
   WHERE is_deleted = false
   LIMIT 5;
   ```

## Using psql (alternative)

```bash
# From the repository root
psql "host=psql-ctn-demo-asr-dev.postgres.database.azure.com \
      port=5432 dbname=asr_dev user=asradmin sslmode=require" \
      -f database/migrations/027_add_identifier_metadata_columns.sql
```

## Expected Result

After running the migration, the `legal_entity_number` table will have these additional columns:

| Column Name | Type | Default | Constraint |
|------------|------|---------|------------|
| `issuing_authority` | VARCHAR(255) | NULL | - |
| `issued_at` | TIMESTAMP | NULL | - |
| `expires_at` | TIMESTAMP | NULL | - |
| `verification_status` | VARCHAR(50) | 'PENDING' | CHECK constraint (PENDING/VERIFIED/FAILED/EXPIRED) |

All existing rows will have `verification_status = 'PENDING'`.

## After Migration

Once the migration is applied:
1. The identifier endpoints will work immediately (no code deployment needed)
2. Run the identifier tests to verify:
   ```bash
   cd tests/api/deployment
   export E2E_TEST_USER_PASSWORD=Madu5952
   node identifiers.test.js
   ```

## Rollback (if needed)

```sql
-- Remove the new columns
ALTER TABLE legal_entity_number DROP COLUMN IF EXISTS issuing_authority;
ALTER TABLE legal_entity_number DROP COLUMN IF EXISTS issued_at;
ALTER TABLE legal_entity_number DROP COLUMN IF EXISTS expires_at;
ALTER TABLE legal_entity_number DROP COLUMN IF EXISTS verification_status;
DROP INDEX IF EXISTS idx_legal_entity_number_verification_status;
```
