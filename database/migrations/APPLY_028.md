# Migration 028: Fix members_view to use legal_entity_id

## Problem
The `members_view` was returning `org_id` (aliased from `legal_entity_id`), causing confusion and requiring API endpoints to create additional aliases. This led to 4 weeks of recurring bugs where code expected `legal_entity_id` but got undefined.

## Solution
Recreate the view to return `legal_entity_id` directly instead of aliasing it as `org_id`.

## Apply Migration

### Using SQLPro Studio / TablePlus
1. Connect to database
2. Open `028_fix_members_view_use_legal_entity_id.sql`
3. Execute the script

### Using psql
```bash
psql "host=psql-ctn-demo-asr-dev.postgres.database.azure.com \
      port=5432 dbname=asr_dev user=asradmin sslmode=require" \
      -f database/migrations/028_fix_members_view_use_legal_entity_id.sql
```

## Verify
```sql
-- Check view structure
SELECT column_name, data_type
FROM information_schema.columns
WHERE table_name = 'members_view'
ORDER BY ordinal_position;

-- Should show legal_entity_id (not org_id)

-- Test query
SELECT legal_entity_id, legal_name, status
FROM members_view
LIMIT 5;
```

## API Changes Needed After Migration
Once this migration is applied, update `api/src/routes.ts`:

```typescript
// Remove the alias - view now returns legal_entity_id directly
let query = `
  SELECT legal_entity_id, legal_name, kvk, lei, domain, status, membership_level,
         created_at, metadata
  FROM members_view
  WHERE 1=1
`;
```

Remove the `org_id as legal_entity_id` alias since the view will already return `legal_entity_id`.

## Rollback (if needed)
```sql
DROP VIEW IF EXISTS members_view;

-- Recreate old version with org_id
CREATE VIEW members_view AS
SELECT
    le.legal_entity_id::text AS org_id,  -- Old version used org_id
    le.primary_legal_name AS legal_name,
    MAX(CASE WHEN len.identifier_type = 'LEI' THEN len.identifier_value ELSE NULL END) AS lei,
    MAX(CASE WHEN len.identifier_type = 'KVK' THEN len.identifier_value ELSE NULL END) AS kvk,
    le.domain,
    le.status,
    le.membership_level,
    le.dt_created AS created_at,
    le.metadata
FROM legal_entity le
LEFT JOIN legal_entity_number len ON le.legal_entity_id = len.legal_entity_id
WHERE le.is_deleted = false
GROUP BY
    le.legal_entity_id,
    le.primary_legal_name,
    le.domain,
    le.status,
    le.membership_level,
    le.dt_created,
    le.metadata;
```
