-- Migration 016: Standardize Timestamp Types (FIXED)
-- Purpose: Convert all TIMESTAMP WITHOUT TIME ZONE to TIMESTAMP WITH TIME ZONE
-- Rationale: Prevent timezone bugs by storing all timestamps in UTC with timezone info
-- Date: 2025-10-20
-- Note: This is a fixed version of 014 that checks for column existence

BEGIN;

-- Helper function to alter timestamp column if it exists
CREATE OR REPLACE FUNCTION alter_timestamp_column(
    p_table_name TEXT,
    p_column_name TEXT
) RETURNS VOID AS $$
DECLARE
    v_exists BOOLEAN;
    v_current_type TEXT;
BEGIN
    -- Check if column exists and get its type
    SELECT EXISTS (
        SELECT 1
        FROM information_schema.columns
        WHERE table_schema = 'public'
          AND table_name = p_table_name
          AND column_name = p_column_name
    ) INTO v_exists;

    IF v_exists THEN
        -- Get current data type
        SELECT data_type INTO v_current_type
        FROM information_schema.columns
        WHERE table_schema = 'public'
          AND table_name = p_table_name
          AND column_name = p_column_name;

        -- Only alter if it's currently timestamp without time zone
        IF v_current_type = 'timestamp without time zone' THEN
            EXECUTE format(
                'ALTER TABLE %I ALTER COLUMN %I TYPE TIMESTAMP WITH TIME ZONE USING %I AT TIME ZONE ''UTC''',
                p_table_name,
                p_column_name,
                p_column_name
            );
            RAISE NOTICE 'Converted %.% to TIMESTAMPTZ', p_table_name, p_column_name;
        ELSE
            RAISE NOTICE 'Skipped %.% (already %)', p_table_name, p_column_name, v_current_type;
        END IF;
    ELSE
        RAISE NOTICE 'Skipped %.% (column does not exist)', p_table_name, p_column_name;
    END IF;
END;
$$ LANGUAGE plpgsql;

-- Members table
SELECT alter_timestamp_column('members', 'created_at');
SELECT alter_timestamp_column('members', 'updated_at');

-- Issued tokens table
SELECT alter_timestamp_column('issued_tokens', 'issued_at');
SELECT alter_timestamp_column('issued_tokens', 'expires_at');

-- OAuth clients table
SELECT alter_timestamp_column('oauth_clients', 'created_at');
SELECT alter_timestamp_column('oauth_clients', 'updated_at');

-- Audit logs table
SELECT alter_timestamp_column('audit_logs', 'event_time');

-- Vetting records table
SELECT alter_timestamp_column('vetting_records', 'completed_at');
SELECT alter_timestamp_column('vetting_records', 'expires_at');
SELECT alter_timestamp_column('vetting_records', 'created_at');

-- BVAD issued tokens table
SELECT alter_timestamp_column('bvad_issued_tokens', 'issued_at');
SELECT alter_timestamp_column('bvad_issued_tokens', 'expires_at');
SELECT alter_timestamp_column('bvad_issued_tokens', 'revoked_at');
SELECT alter_timestamp_column('bvad_issued_tokens', 'created_at');

-- Admin tasks table
SELECT alter_timestamp_column('admin_tasks', 'due_date');
SELECT alter_timestamp_column('admin_tasks', 'completed_at');
SELECT alter_timestamp_column('admin_tasks', 'created_at');

-- Subscriptions table
SELECT alter_timestamp_column('subscriptions', 'start_date');
SELECT alter_timestamp_column('subscriptions', 'end_date');
SELECT alter_timestamp_column('subscriptions', 'created_at');
SELECT alter_timestamp_column('subscriptions', 'updated_at');

-- Newsletters table
SELECT alter_timestamp_column('newsletters', 'scheduled_send_date');
SELECT alter_timestamp_column('newsletters', 'actual_send_date');
SELECT alter_timestamp_column('newsletters', 'created_at');

-- Legal entity table
SELECT alter_timestamp_column('legal_entity', 'dt_created');
SELECT alter_timestamp_column('legal_entity', 'dt_modified');

-- Party reference table
SELECT alter_timestamp_column('party_reference', 'dt_created');
SELECT alter_timestamp_column('party_reference', 'dt_modified');

-- Contacts table
SELECT alter_timestamp_column('contacts', 'created_at');
SELECT alter_timestamp_column('contacts', 'updated_at');

-- Identifiers table
SELECT alter_timestamp_column('identifiers', 'created_at');
SELECT alter_timestamp_column('identifiers', 'updated_at');

-- Endpoints table
SELECT alter_timestamp_column('endpoints', 'created_at');
SELECT alter_timestamp_column('endpoints', 'updated_at');

-- Drop helper function
DROP FUNCTION alter_timestamp_column(TEXT, TEXT);

COMMIT;

-- Verification query
SELECT
    table_name,
    column_name,
    data_type,
    udt_name
FROM information_schema.columns
WHERE table_schema = 'public'
  AND data_type LIKE '%timestamp%'
ORDER BY table_name, column_name;

-- Summary
DO $$
DECLARE
    v_without_tz INTEGER;
    v_with_tz INTEGER;
BEGIN
    -- Count remaining timestamp without time zone columns
    SELECT COUNT(*) INTO v_without_tz
    FROM information_schema.columns
    WHERE table_schema = 'public'
      AND data_type = 'timestamp without time zone';

    -- Count timestamp with time zone columns
    SELECT COUNT(*) INTO v_with_tz
    FROM information_schema.columns
    WHERE table_schema = 'public'
      AND data_type = 'timestamp with time zone';

    RAISE NOTICE '';
    RAISE NOTICE '========================================';
    RAISE NOTICE 'Migration 016 Summary';
    RAISE NOTICE '========================================';
    RAISE NOTICE 'Timestamp columns WITH time zone: %', v_with_tz;
    RAISE NOTICE 'Timestamp columns WITHOUT time zone: %', v_without_tz;

    IF v_without_tz = 0 THEN
        RAISE NOTICE '✅ All timestamp columns standardized to TIMESTAMPTZ';
    ELSE
        RAISE NOTICE '⚠️  Some timestamp columns remain without time zone';
    END IF;
    RAISE NOTICE '========================================';
END $$;
