-- =====================================================
-- PostgreSQL DDL Extraction Script (Standard SQL)
-- Run this in any SQL editor
-- =====================================================

-- SECTION 1: LIST ALL TABLES
SELECT '=== TABLES ===' as section;

SELECT
    tablename as table_name,
    schemaname as schema_name
FROM pg_tables
WHERE schemaname = 'public'
ORDER BY tablename;

-- SECTION 2: TABLE COLUMNS WITH DATA TYPES
SELECT '=== TABLE COLUMNS ===' as section;

SELECT
    table_name,
    column_name,
    data_type,
    character_maximum_length,
    is_nullable,
    column_default
FROM information_schema.columns
WHERE table_schema = 'public'
ORDER BY table_name, ordinal_position;

-- SECTION 3: PRIMARY KEYS
SELECT '=== PRIMARY KEYS ===' as section;

SELECT
    tc.table_name,
    tc.constraint_name,
    string_agg(kcu.column_name, ', ' ORDER BY kcu.ordinal_position) as primary_key_columns
FROM information_schema.table_constraints tc
JOIN information_schema.key_column_usage kcu
    ON tc.constraint_name = kcu.constraint_name
    AND tc.table_schema = kcu.table_schema
WHERE tc.constraint_type = 'PRIMARY KEY'
    AND tc.table_schema = 'public'
GROUP BY tc.table_name, tc.constraint_name
ORDER BY tc.table_name;

-- SECTION 4: FOREIGN KEYS
SELECT '=== FOREIGN KEYS ===' as section;

SELECT
    tc.table_name,
    tc.constraint_name,
    kcu.column_name,
    ccu.table_name AS foreign_table_name,
    ccu.column_name AS foreign_column_name
FROM information_schema.table_constraints AS tc
JOIN information_schema.key_column_usage AS kcu
    ON tc.constraint_name = kcu.constraint_name
    AND tc.table_schema = kcu.table_schema
JOIN information_schema.constraint_column_usage AS ccu
    ON ccu.constraint_name = tc.constraint_name
    AND ccu.table_schema = tc.table_schema
WHERE tc.constraint_type = 'FOREIGN KEY'
    AND tc.table_schema = 'public'
ORDER BY tc.table_name, tc.constraint_name;

-- SECTION 5: UNIQUE CONSTRAINTS
SELECT '=== UNIQUE CONSTRAINTS ===' as section;

SELECT
    tc.table_name,
    tc.constraint_name,
    string_agg(kcu.column_name, ', ' ORDER BY kcu.ordinal_position) as unique_columns
FROM information_schema.table_constraints tc
JOIN information_schema.key_column_usage kcu
    ON tc.constraint_name = kcu.constraint_name
    AND tc.table_schema = kcu.table_schema
WHERE tc.constraint_type = 'UNIQUE'
    AND tc.table_schema = 'public'
GROUP BY tc.table_name, tc.constraint_name
ORDER BY tc.table_name;

-- SECTION 6: INDEXES
SELECT '=== INDEXES ===' as section;

SELECT
    tablename as table_name,
    indexname as index_name,
    indexdef as index_definition
FROM pg_indexes
WHERE schemaname = 'public'
ORDER BY tablename, indexname;

-- SECTION 7: VIEWS
SELECT '=== VIEWS ===' as section;

SELECT
    table_name as view_name,
    LEFT(view_definition, 200) as view_definition_preview
FROM information_schema.views
WHERE table_schema = 'public'
ORDER BY table_name;

-- SECTION 8: CHECK CONSTRAINTS
SELECT '=== CHECK CONSTRAINTS ===' as section;

SELECT
    constraint_name,
    table_name,
    check_clause
FROM information_schema.check_constraints cc
JOIN information_schema.table_constraints tc
    ON cc.constraint_name = tc.constraint_name
WHERE tc.table_schema = 'public'
ORDER BY table_name, constraint_name;

-- SECTION 9: TRIGGERS
SELECT '=== TRIGGERS ===' as section;

SELECT
    trigger_name,
    event_manipulation as trigger_event,
    event_object_table as table_name,
    action_timing,
    LEFT(action_statement, 100) as action_statement_preview
FROM information_schema.triggers
WHERE trigger_schema = 'public'
ORDER BY event_object_table, trigger_name;

-- SECTION 10: ROW COUNTS
SELECT '=== TABLE ROW COUNTS ===' as section;

SELECT
    schemaname as schema_name,
    tablename as table_name,
    n_live_tup as estimated_row_count
FROM pg_stat_user_tables
WHERE schemaname = 'public'
ORDER BY tablename;
