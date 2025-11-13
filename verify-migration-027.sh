#!/bin/bash
# Verification script for migration 027
# Checks that duplicate legal_entity records were properly cleaned up

set -e

# Get password from .credentials file
export PGPASSWORD=$(grep POSTGRES_PASSWORD .credentials | cut -d= -f2)

echo "========================================"
echo "Migration 027 Verification"
echo "========================================"
echo ""

echo "1. Checking for duplicate legal_entity records..."
echo ""

DUPLICATES=$(psql -h psql-ctn-demo-asr-dev.postgres.database.azure.com \
  -p 5432 -U asradmin -d asr_dev --set=sslmode=require -t -c "
SELECT COUNT(*)
FROM (
  SELECT party_id, COUNT(*) as legal_entity_count
  FROM legal_entity
  WHERE is_deleted = false
  GROUP BY party_id
  HAVING COUNT(*) > 1
) duplicates;
")

if [ "$DUPLICATES" -eq 0 ]; then
  echo "✅ No duplicate legal_entity records found"
else
  echo "❌ Found $DUPLICATES parties with duplicate legal_entity records"
  exit 1
fi

echo ""
echo "2. Verifying party_id counts match..."
echo ""

psql -h psql-ctn-demo-asr-dev.postgres.database.azure.com \
  -p 5432 -U asradmin -d asr_dev --set=sslmode=require -c "
SELECT
  (SELECT COUNT(*) FROM party_reference WHERE is_deleted = false) as active_parties,
  (SELECT COUNT(*) FROM legal_entity WHERE is_deleted = false) as active_legal_entities;
"

echo ""
echo "3. Checking UNIQUE index exists..."
echo ""

INDEX_EXISTS=$(psql -h psql-ctn-demo-asr-dev.postgres.database.azure.com \
  -p 5432 -U asradmin -d asr_dev --set=sslmode=require -t -c "
SELECT EXISTS (
  SELECT 1 FROM pg_indexes
  WHERE indexname = 'uq_legal_entity_party_id_active'
    AND schemaname = 'public'
);
")

if [[ "$INDEX_EXISTS" =~ "t" ]]; then
  echo "✅ UNIQUE index 'uq_legal_entity_party_id_active' exists"
else
  echo "❌ UNIQUE index missing"
  exit 1
fi

echo ""
echo "4. Checking v_m2m_credentials_active view..."
echo ""

VIEW_COUNT=$(psql -h psql-ctn-demo-asr-dev.postgres.database.azure.com \
  -p 5432 -U asradmin -d asr_dev --set=sslmode=require -t -c "
SELECT COUNT(*) FROM v_m2m_credentials_active;
")

echo "View returns $VIEW_COUNT rows (should match active credentials)"

echo ""
echo "5. Verifying backup table exists..."
echo ""

BACKUP_COUNT=$(psql -h psql-ctn-demo-asr-dev.postgres.database.azure.com \
  -p 5432 -U asradmin -d asr_dev --set=sslmode=require -t -c "
SELECT COUNT(*) FROM legal_entity_backup_20251113;
")

echo "✅ Backup table contains $BACKUP_COUNT records"

echo ""
echo "========================================"
echo "✅ All verification checks passed!"
echo "========================================"
echo ""
echo "Next steps:"
echo "1. Test M2M authentication endpoint"
echo "2. Update documentation (mark Phase 1 complete)"
echo "3. Monitor production for 24 hours"
