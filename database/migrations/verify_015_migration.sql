-- Verification Script for Migration 015
-- Run this to check if migration 015 was applied successfully

-- Check if azure_ad_object_id column exists
SELECT
    column_name,
    data_type,
    is_nullable,
    column_default
FROM information_schema.columns
WHERE table_name = 'members'
  AND column_name IN ('azure_ad_object_id', 'email')
ORDER BY column_name;

-- Check if indexes were created
SELECT
    indexname,
    indexdef
FROM pg_indexes
WHERE tablename = 'members'
  AND indexname IN (
      'idx_members_azure_ad_oid',
      'idx_members_email',
      'idx_members_azure_ad_oid_unique'
  )
ORDER BY indexname;

-- Show summary
DO $$
DECLARE
    has_oid_column BOOLEAN;
    has_email_column BOOLEAN;
    has_oid_index BOOLEAN;
    has_email_index BOOLEAN;
    has_unique_index BOOLEAN;
BEGIN
    -- Check columns
    SELECT EXISTS (
        SELECT 1 FROM information_schema.columns
        WHERE table_name = 'members' AND column_name = 'azure_ad_object_id'
    ) INTO has_oid_column;

    SELECT EXISTS (
        SELECT 1 FROM information_schema.columns
        WHERE table_name = 'members' AND column_name = 'email'
    ) INTO has_email_column;

    -- Check indexes
    SELECT EXISTS (
        SELECT 1 FROM pg_indexes
        WHERE tablename = 'members' AND indexname = 'idx_members_azure_ad_oid'
    ) INTO has_oid_index;

    SELECT EXISTS (
        SELECT 1 FROM pg_indexes
        WHERE tablename = 'members' AND indexname = 'idx_members_email'
    ) INTO has_email_index;

    SELECT EXISTS (
        SELECT 1 FROM pg_indexes
        WHERE tablename = 'members' AND indexname = 'idx_members_azure_ad_oid_unique'
    ) INTO has_unique_index;

    -- Report results
    RAISE NOTICE '';
    RAISE NOTICE '========================================';
    RAISE NOTICE 'Migration 015 Verification Results';
    RAISE NOTICE '========================================';

    IF has_oid_column THEN
        RAISE NOTICE '✅ Column azure_ad_object_id exists';
    ELSE
        RAISE NOTICE '❌ Column azure_ad_object_id MISSING';
    END IF;

    IF has_email_column THEN
        RAISE NOTICE '✅ Column email exists';
    ELSE
        RAISE NOTICE '❌ Column email MISSING';
    END IF;

    IF has_oid_index THEN
        RAISE NOTICE '✅ Index idx_members_azure_ad_oid exists';
    ELSE
        RAISE NOTICE '❌ Index idx_members_azure_ad_oid MISSING';
    END IF;

    IF has_email_index THEN
        RAISE NOTICE '✅ Index idx_members_email exists';
    ELSE
        RAISE NOTICE '❌ Index idx_members_email MISSING';
    END IF;

    IF has_unique_index THEN
        RAISE NOTICE '✅ Unique index idx_members_azure_ad_oid_unique exists';
    ELSE
        RAISE NOTICE '❌ Unique index idx_members_azure_ad_oid_unique MISSING';
    END IF;

    RAISE NOTICE '========================================';

    IF has_oid_column AND has_email_column AND has_oid_index AND has_email_index AND has_unique_index THEN
        RAISE NOTICE '✅ Migration 015 completed successfully!';
        RAISE NOTICE 'AUTH-001 is ready for production use.';
    ELSE
        RAISE NOTICE '⚠️  Migration 015 incomplete - some objects are missing';
    END IF;

    RAISE NOTICE '========================================';
END $$;
