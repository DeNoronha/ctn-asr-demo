-- ============================================
-- Extract All Index Definitions
-- Run this query in SQLPro Studio to get CREATE INDEX statements
-- ============================================

SELECT
    schemaname,
    tablename,
    indexname,
    indexdef || ';' AS create_statement
FROM pg_indexes
WHERE schemaname = 'public'
  AND indexname NOT LIKE '%_pkey'  -- Exclude primary keys
ORDER BY tablename, indexname;

-- Alternative: Get indexes with more details
-- Uncomment and run this instead if you need the full DDL generation:

/*
SELECT
    'CREATE ' ||
    CASE WHEN i.indisunique THEN 'UNIQUE ' ELSE '' END ||
    'INDEX ' || quote_ident(idx.relname) ||
    ' ON ' || quote_ident(n.nspname) || '.' || quote_ident(t.relname) ||
    ' USING ' || am.amname ||
    ' (' ||
    array_to_string(
        ARRAY(
            SELECT quote_ident(a.attname)
            FROM pg_attribute a
            WHERE a.attrelid = t.oid
              AND a.attnum = ANY(i.indkey::int[])
            ORDER BY array_position(i.indkey::int[], a.attnum)
        ),
        ', '
    ) || ')' ||
    CASE
        WHEN pg_get_expr(i.indpred, i.indrelid) IS NOT NULL
        THEN ' WHERE ' || pg_get_expr(i.indpred, i.indrelid)
        ELSE ''
    END || ';' AS index_ddl
FROM pg_index i
JOIN pg_class idx ON idx.oid = i.indexrelid
JOIN pg_class t ON t.oid = i.indrelid
JOIN pg_namespace n ON n.oid = t.relnamespace
JOIN pg_am am ON am.oid = idx.relam
WHERE n.nspname = 'public'
  AND NOT i.indisprimary
ORDER BY t.relname, idx.relname;
*/
