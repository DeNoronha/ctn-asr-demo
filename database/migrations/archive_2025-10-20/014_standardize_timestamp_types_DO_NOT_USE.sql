-- Migration 014: Standardize Timestamp Types
-- Purpose: Convert all TIMESTAMP WITHOUT TIME ZONE to TIMESTAMP WITH TIME ZONE
-- Rationale: Prevent timezone bugs by storing all timestamps in UTC with timezone info
-- Date: 2025-10-16

BEGIN;

-- Members table
ALTER TABLE members
  ALTER COLUMN created_at TYPE TIMESTAMP WITH TIME ZONE USING created_at AT TIME ZONE 'UTC',
  ALTER COLUMN updated_at TYPE TIMESTAMP WITH TIME ZONE USING updated_at AT TIME ZONE 'UTC';

-- Issued tokens table
ALTER TABLE issued_tokens
  ALTER COLUMN issued_at TYPE TIMESTAMP WITH TIME ZONE USING issued_at AT TIME ZONE 'UTC',
  ALTER COLUMN expires_at TYPE TIMESTAMP WITH TIME ZONE USING expires_at AT TIME ZONE 'UTC';

-- OAuth clients table (if exists)
ALTER TABLE oauth_clients
  ALTER COLUMN created_at TYPE TIMESTAMP WITH TIME ZONE USING created_at AT TIME ZONE 'UTC',
  ALTER COLUMN updated_at TYPE TIMESTAMP WITH TIME ZONE USING updated_at AT TIME ZONE 'UTC';

-- Audit logs table
ALTER TABLE audit_logs
  ALTER COLUMN event_time TYPE TIMESTAMP WITH TIME ZONE USING event_time AT TIME ZONE 'UTC';

-- Vetting records table
ALTER TABLE vetting_records
  ALTER COLUMN completed_at TYPE TIMESTAMP WITH TIME ZONE USING completed_at AT TIME ZONE 'UTC',
  ALTER COLUMN expires_at TYPE TIMESTAMP WITH TIME ZONE USING expires_at AT TIME ZONE 'UTC',
  ALTER COLUMN created_at TYPE TIMESTAMP WITH TIME ZONE USING created_at AT TIME ZONE 'UTC';

-- BVAD issued tokens table (if exists)
ALTER TABLE bvad_issued_tokens
  ALTER COLUMN issued_at TYPE TIMESTAMP WITH TIME ZONE USING issued_at AT TIME ZONE 'UTC',
  ALTER COLUMN expires_at TYPE TIMESTAMP WITH TIME ZONE USING expires_at AT TIME ZONE 'UTC',
  ALTER COLUMN revoked_at TYPE TIMESTAMP WITH TIME ZONE USING revoked_at AT TIME ZONE 'UTC',
  ALTER COLUMN created_at TYPE TIMESTAMP WITH TIME ZONE USING created_at AT TIME ZONE 'UTC';

-- Admin tasks table
ALTER TABLE admin_tasks
  ALTER COLUMN due_date TYPE TIMESTAMP WITH TIME ZONE USING due_date AT TIME ZONE 'UTC',
  ALTER COLUMN completed_at TYPE TIMESTAMP WITH TIME ZONE USING completed_at AT TIME ZONE 'UTC',
  ALTER COLUMN created_at TYPE TIMESTAMP WITH TIME ZONE USING created_at AT TIME ZONE 'UTC';

-- Subscriptions table
ALTER TABLE subscriptions
  ALTER COLUMN start_date TYPE TIMESTAMP WITH TIME ZONE USING start_date AT TIME ZONE 'UTC',
  ALTER COLUMN end_date TYPE TIMESTAMP WITH TIME ZONE USING end_date AT TIME ZONE 'UTC',
  ALTER COLUMN created_at TYPE TIMESTAMP WITH TIME ZONE USING created_at AT TIME ZONE 'UTC',
  ALTER COLUMN updated_at TYPE TIMESTAMP WITH TIME ZONE USING updated_at AT TIME ZONE 'UTC';

-- Newsletters table
ALTER TABLE newsletters
  ALTER COLUMN scheduled_send_date TYPE TIMESTAMP WITH TIME ZONE USING scheduled_send_date AT TIME ZONE 'UTC',
  ALTER COLUMN actual_send_date TYPE TIMESTAMP WITH TIME ZONE USING actual_send_date AT TIME ZONE 'UTC',
  ALTER COLUMN created_at TYPE TIMESTAMP WITH TIME ZONE USING created_at AT TIME ZONE 'UTC';

COMMIT;

-- Verification queries (run after migration to verify changes)
/*
SELECT
  table_name,
  column_name,
  data_type,
  udt_name
FROM information_schema.columns
WHERE table_schema = 'public'
  AND data_type LIKE '%timestamp%'
ORDER BY table_name, ordinal_position;

Expected result: All timestamp columns should show 'timestamp with time zone' or 'timestamptz'
*/
