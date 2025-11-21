#!/bin/bash
export PGPASSWORD='zw2IFN_(x1UaZzs-2JBkd{RhkWI#1VG4'

echo "Checking if v_members_full view exists and has data..."
psql "host=psql-ctn-demo-asr-dev.postgres.database.azure.com port=5432 dbname=asr_dev user=asradmin sslmode=require" << SQL
-- Check if view exists
SELECT COUNT(*) as view_exists 
FROM information_schema.views 
WHERE table_name = 'v_members_full';

-- Try to select from view
SELECT COUNT(*) as total_members FROM v_members_full;

-- Check members table
SELECT COUNT(*) as members_table_count FROM members;

-- Check legal_entity table  
SELECT COUNT(*) as legal_entity_count FROM legal_entity WHERE is_deleted = false;
SQL
