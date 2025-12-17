-- Migration: 056_add_gleif_unique_constraint
-- Description: Add unique constraint on gleif_registry_data.legal_entity_id for ON CONFLICT upsert
-- Date: 2024-12-17
-- Author: Claude Code
--
-- This migration:
-- 1. Adds a partial unique index on legal_entity_id for upsert operations
-- 2. Fixes the "no unique or exclusion constraint matching the ON CONFLICT specification" error

-- ============================================
-- 1. Check for duplicate legal_entity_id entries (if any)
-- ============================================

DO $$
DECLARE
  v_duplicate_count INTEGER;
BEGIN
  SELECT COUNT(*) INTO v_duplicate_count FROM (
    SELECT legal_entity_id, COUNT(*)
    FROM gleif_registry_data
    WHERE legal_entity_id IS NOT NULL
    GROUP BY legal_entity_id
    HAVING COUNT(*) > 1
  ) AS duplicates;

  IF v_duplicate_count > 0 THEN
    RAISE NOTICE 'Found % duplicate legal_entity_id entries in gleif_registry_data. Cleaning up...', v_duplicate_count;

    -- Keep only the most recent entry for each legal_entity_id
    DELETE FROM gleif_registry_data a
    USING gleif_registry_data b
    WHERE a.legal_entity_id = b.legal_entity_id
      AND a.registry_data_id != b.registry_data_id
      AND a.fetched_at < b.fetched_at;
  END IF;
END $$;

-- ============================================
-- 2. Add unique partial index for ON CONFLICT
-- ============================================

-- Drop existing index if it exists (in case migration runs twice)
DROP INDEX IF EXISTS idx_gleif_registry_unique_legal_entity;

-- Create unique partial index (only where legal_entity_id IS NOT NULL)
CREATE UNIQUE INDEX idx_gleif_registry_unique_legal_entity
ON gleif_registry_data (legal_entity_id)
WHERE legal_entity_id IS NOT NULL;

-- ============================================
-- 3. Verify
-- ============================================

DO $$
DECLARE
  v_index_exists BOOLEAN;
BEGIN
  SELECT EXISTS (
    SELECT 1 FROM pg_indexes
    WHERE indexname = 'idx_gleif_registry_unique_legal_entity'
  ) INTO v_index_exists;

  IF v_index_exists THEN
    RAISE NOTICE 'Unique index idx_gleif_registry_unique_legal_entity created successfully';
  ELSE
    RAISE EXCEPTION 'Failed to create unique index';
  END IF;
END $$;
