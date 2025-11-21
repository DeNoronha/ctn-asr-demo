-- Migration 032: Drop Backup Tables
-- Date: 2025-11-21
-- Description: Remove backup tables created during Migration 027 (November 13, 2025).
--              These tables were safety backups during legal_entity schema migration.
--              Migration was successful and production verified stable.
--              Tables: legal_entity_backup_20251113, members_backup_20251113

-- Verify tables exist before dropping
DO $$
BEGIN
  -- Check legal_entity_backup_20251113
  IF EXISTS (
    SELECT 1 FROM information_schema.tables
    WHERE table_schema = 'public'
    AND table_name = 'legal_entity_backup_20251113'
  ) THEN
    RAISE NOTICE 'Found legal_entity_backup_20251113 - will drop';
  ELSE
    RAISE NOTICE 'legal_entity_backup_20251113 not found - skipping';
  END IF;

  -- Check members_backup_20251113
  IF EXISTS (
    SELECT 1 FROM information_schema.tables
    WHERE table_schema = 'public'
    AND table_name = 'members_backup_20251113'
  ) THEN
    RAISE NOTICE 'Found members_backup_20251113 - will drop';
  ELSE
    RAISE NOTICE 'members_backup_20251113 not found - skipping';
  END IF;
END $$;

-- Drop backup tables
DROP TABLE IF EXISTS public.legal_entity_backup_20251113 CASCADE;
DROP TABLE IF EXISTS public.members_backup_20251113 CASCADE;

-- Verify cleanup
DO $$
DECLARE
  backup_table_count INTEGER;
BEGIN
  SELECT COUNT(*) INTO backup_table_count
  FROM information_schema.tables
  WHERE table_schema = 'public'
  AND table_name LIKE '%backup%';

  IF backup_table_count > 0 THEN
    RAISE WARNING 'Still % backup tables remaining', backup_table_count;
  ELSE
    RAISE NOTICE 'All backup tables cleaned up successfully';
  END IF;
END $$;

-- Log migration completion
SELECT 'Migration 032 complete - Backup tables dropped' AS status;

-- Context for future reference
COMMENT ON SCHEMA public IS
'CTN ASR Database Schema
Last cleanup: 2025-11-21 - Removed backup tables from Migration 027
Backup tables are temporary and should be dropped after migration verification (typically 30-90 days)';
