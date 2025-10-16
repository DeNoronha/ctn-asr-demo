-- Query to check if Contargo has KvK number 95944192
-- This queries the database directly to verify if the identifier exists
--
-- Usage:
--   psql "host=psql-ctn-demo-asr-dev.postgres.database.azure.com port=5432 \
--     dbname=asr_dev user=asradmin sslmode=require" \
--     -f database/queries/check-contargo-kvk.sql

-- Step 1: Find Contargo legal entity
SELECT
  id AS legal_entity_id,
  legal_name,
  created_at
FROM legal_entities
WHERE legal_name ILIKE '%Contargo%'
ORDER BY created_at DESC;

-- Step 2: Check all identifiers for Contargo
WITH contargo AS (
  SELECT id AS entity_id
  FROM legal_entities
  WHERE legal_name ILIKE '%Contargo%'
  LIMIT 1
)
SELECT
  ler.legal_entity_reference_id AS identifier_id,
  ler.identifier_type,
  ler.identifier_value,
  ler.country_code,
  ler.validation_status,
  ler.is_primary,
  ler.created_at,
  ler.updated_at
FROM legal_entity_references ler
JOIN contargo c ON ler.legal_entity_id = c.entity_id
ORDER BY ler.created_at DESC;

-- Step 3: Specifically check for KvK 95944192
WITH contargo AS (
  SELECT id AS entity_id
  FROM legal_entities
  WHERE legal_name ILIKE '%Contargo%'
  LIMIT 1
)
SELECT
  CASE
    WHEN EXISTS (
      SELECT 1
      FROM legal_entity_references ler
      JOIN contargo c ON ler.legal_entity_id = c.entity_id
      WHERE ler.identifier_value = '95944192'
        AND ler.identifier_type ILIKE '%KVK%'
    ) THEN '✅ YES - KvK 95944192 EXISTS in database'
    ELSE '❌ NO - KvK 95944192 NOT FOUND in database'
  END AS result;

-- Step 4: Show all KvK numbers in the system (for comparison)
SELECT
  le.legal_name,
  ler.identifier_value AS kvk_number,
  ler.validation_status,
  ler.created_at
FROM legal_entity_references ler
JOIN legal_entities le ON ler.legal_entity_id = le.id
WHERE ler.identifier_type ILIKE '%KVK%'
ORDER BY ler.created_at DESC;
