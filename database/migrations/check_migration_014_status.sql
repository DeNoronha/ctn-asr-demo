-- Check which tables were affected by the failed migration 014
-- This shows which timestamp columns have been converted and which haven't

SELECT
    table_name,
    column_name,
    data_type,
    CASE
        WHEN data_type = 'timestamp with time zone' THEN '✅ Converted'
        WHEN data_type = 'timestamp without time zone' THEN '❌ Not converted'
        ELSE '⚠️  Other type'
    END as status
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
      'newsletters',
      'legal_entity',
      'party_reference',
      'contacts',
      'identifiers',
      'endpoints'
  )
  AND data_type LIKE '%timestamp%'
ORDER BY
    CASE
        WHEN data_type = 'timestamp without time zone' THEN 1
        WHEN data_type = 'timestamp with time zone' THEN 2
        ELSE 3
    END,
    table_name,
    column_name;

-- Summary
DO $$
DECLARE
    v_tables_partial INTEGER := 0;
    v_tables_complete INTEGER := 0;
    v_tables_untouched INTEGER := 0;
    v_total_with_tz INTEGER;
    v_total_without_tz INTEGER;
BEGIN
    -- Count columns by type
    SELECT COUNT(*) INTO v_total_with_tz
    FROM information_schema.columns
    WHERE table_schema = 'public'
      AND data_type = 'timestamp with time zone';

    SELECT COUNT(*) INTO v_total_without_tz
    FROM information_schema.columns
    WHERE table_schema = 'public'
      AND data_type = 'timestamp without time zone';

    RAISE NOTICE '';
    RAISE NOTICE '========================================';
    RAISE NOTICE 'Migration 014 Status Report';
    RAISE NOTICE '========================================';
    RAISE NOTICE 'Total timestamp WITH time zone: %', v_total_with_tz;
    RAISE NOTICE 'Total timestamp WITHOUT time zone: %', v_total_without_tz;
    RAISE NOTICE '';

    IF v_total_without_tz = 0 THEN
        RAISE NOTICE '✅ Migration 014 completed successfully';
        RAISE NOTICE '   All timestamp columns have been converted';
    ELSIF v_total_with_tz > 0 AND v_total_without_tz > 0 THEN
        RAISE NOTICE '⚠️  Migration 014 partially completed';
        RAISE NOTICE '   Some columns converted, some failed';
        RAISE NOTICE '   Run migration 016_standardize_timestamp_types_FIXED.sql';
    ELSE
        RAISE NOTICE '❌ Migration 014 did not run';
        RAISE NOTICE '   No columns have been converted';
        RAISE NOTICE '   Run migration 016_standardize_timestamp_types_FIXED.sql';
    END IF;
    RAISE NOTICE '========================================';
END $$;
