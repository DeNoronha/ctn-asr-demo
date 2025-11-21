-- Migration 027: Backfill identifier_verification_history for existing approved applications
-- This creates verification history records for members who were approved with KvK documents
-- before the verification history tracking was implemented.

-- Insert verification records for all legal entities that have KvK documents
-- but no verification history records yet
INSERT INTO identifier_verification_history (
  verification_id,
  legal_entity_id,
  identifier_id,
  identifier_type,
  identifier_value,
  verification_method,
  verification_status,
  document_blob_url,
  document_filename,
  document_mime_type,
  verified_by,
  verified_at,
  created_at,
  updated_at
)
SELECT
  gen_random_uuid() as verification_id,
  le.legal_entity_id,
  len.legal_entity_reference_id as identifier_id,
  'KVK' as identifier_type,
  len.identifier_value,
  'APPLICATION_UPLOAD' as verification_method,
  COALESCE(le.kvk_verification_status, 'PENDING') as verification_status,
  le.kvk_document_url as document_blob_url,
  'kvk-document.pdf' as document_filename,
  'application/pdf' as document_mime_type,
  'system' as verified_by,
  le.dt_created as verified_at,
  le.dt_created as created_at,
  NOW() as updated_at
FROM legal_entity le
JOIN legal_entity_number len
  ON le.legal_entity_id = len.legal_entity_id
  AND len.identifier_type = 'KVK'
  AND len.is_deleted = false
WHERE le.kvk_document_url IS NOT NULL
  AND le.is_deleted = false
  AND NOT EXISTS (
    SELECT 1 FROM identifier_verification_history ivh
    WHERE ivh.legal_entity_id = le.legal_entity_id
      AND ivh.identifier_type = 'KVK'
  );

-- Display results
SELECT
  le.primary_legal_name,
  len.identifier_value as kvk_number,
  ivh.verification_status,
  ivh.document_filename,
  ivh.created_at
FROM identifier_verification_history ivh
JOIN legal_entity le ON ivh.legal_entity_id = le.legal_entity_id
JOIN legal_entity_number len
  ON ivh.identifier_id = len.legal_entity_reference_id
WHERE ivh.verification_method = 'APPLICATION_UPLOAD'
ORDER BY ivh.created_at DESC;
