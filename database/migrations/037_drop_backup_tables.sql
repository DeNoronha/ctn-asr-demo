-- Migration: 037_drop_backup_tables.sql
-- Description: Drop obsolete backup tables from November 2025 migration
-- Author: Claude Code
-- Date: 2025-12-12

-- ============================================================================
-- These backup tables were created during migration 032 and are no longer needed
-- ============================================================================

DROP TABLE IF EXISTS legal_entity_backup_20251113;
DROP TABLE IF EXISTS members_backup_20251113;

-- ============================================================================
-- Verify migration
-- ============================================================================

DO $$
BEGIN
    RAISE NOTICE 'Migration 037_drop_backup_tables completed successfully';
    RAISE NOTICE 'Dropped: legal_entity_backup_20251113, members_backup_20251113';
END $$;
