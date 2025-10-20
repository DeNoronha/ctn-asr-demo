-- Check what timestamp columns actually exist in each table
-- This will help us fix migration 014

SELECT
    table_name,
    column_name,
    data_type,
    udt_name
FROM information_schema.columns
WHERE table_schema = 'public'
  AND table_name IN (
      'members',
      'issued_tokens',
      'oauth_clients',
      'audit_logs',
      'vetting_records',
      'bvad_issued_tokens',
      'admin_tasks',
      'subscriptions',
      'newsletters'
  )
  AND data_type LIKE '%timestamp%'
ORDER BY table_name, ordinal_position;
