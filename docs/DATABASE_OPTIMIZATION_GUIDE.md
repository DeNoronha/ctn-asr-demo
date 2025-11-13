# Database Optimization Guide

## Current State Analysis

**Database:** PostgreSQL 14 (Azure Flexible Server)
**Connection Pool:** 5-20 connections, SSL required
**Primary Tables:** party_reference, legal_entity, legal_entity_contact, legal_entity_number, legal_entity_endpoint

## Priority Optimizations

### 1. Add Missing Indexes (HIGH PRIORITY)

**Recommended Indexes:**

```sql
-- Foreign key indexes (for JOIN performance)
CREATE INDEX CONCURRENTLY idx_legal_entity_party_ref
  ON legal_entity(party_reference_id) WHERE is_deleted = false;

CREATE INDEX CONCURRENTLY idx_legal_entity_contact_entity
  ON legal_entity_contact(legal_entity_id) WHERE is_deleted = false;

CREATE INDEX CONCURRENTLY idx_legal_entity_number_entity
  ON legal_entity_number(legal_entity_id) WHERE is_deleted = false;

CREATE INDEX CONCURRENTLY idx_legal_entity_endpoint_entity
  ON legal_entity_endpoint(legal_entity_id) WHERE is_deleted = false;

-- Common query patterns
CREATE INDEX CONCURRENTLY idx_members_status
  ON v_members_full(status);

CREATE INDEX CONCURRENTLY idx_members_domain
  ON v_members_full(domain);

CREATE INDEX CONCURRENTLY idx_legal_entity_kvk
  ON legal_entity_number(identifier_value)
  WHERE identifier_type = 'KVK' AND is_deleted = false;

CREATE INDEX CONCURRENTLY idx_legal_entity_lei
  ON legal_entity_number(identifier_value)
  WHERE identifier_type = 'LEI' AND is_deleted = false;

-- Audit log performance
CREATE INDEX CONCURRENTLY idx_audit_logs_created
  ON audit_logs(dt_created DESC);

CREATE INDEX CONCURRENTLY idx_audit_logs_entity
  ON audit_logs(actor_org_id, dt_created DESC);
```

**Impact:** 50-80% query performance improvement

### 2. Optimize N+1 Query Patterns (MEDIUM PRIORITY)

**Current Issue:** Multiple files fetch related data in loops

**Example Fix in GetMembers.ts:**

```typescript
// BEFORE (N+1 queries)
const members = await pool.query('SELECT * FROM v_members_full');
for (const member of members.rows) {
  const identifiers = await pool.query(
    'SELECT * FROM legal_entity_number WHERE legal_entity_id = $1',
    [member.legal_entity_id]
  );
  member.identifiers = identifiers.rows;
}

// AFTER (Single query with JOIN)
const members = await pool.query(`
  SELECT
    m.*,
    json_agg(json_build_object(
      'identifier_type', len.identifier_type,
      'identifier_value', len.identifier_value,
      'validation_status', len.validation_status
    )) as identifiers
  FROM v_members_full m
  LEFT JOIN legal_entity_number len ON m.legal_entity_id = len.legal_entity_id
    AND (len.is_deleted IS NULL OR len.is_deleted = false)
  GROUP BY m.org_id, m.legal_name -- include all m.* columns
`);
```

**Files to Review:**
- GetAuthenticatedMember.ts (line 72-99)
- generateBvad.ts (line 124-171)
- GetMembers.ts (if identifiers added)

### 3. Add Query Performance Monitoring (LOW PRIORITY)

**Add Slow Query Logging:**

```typescript
// api/src/utils/database.ts
export async function executeQuery(
  pool: Pool,
  query: string,
  params?: any[],
  context?: InvocationContext
): Promise<QueryResult> {
  const start = Date.now();
  try {
    const result = await pool.query(query, params);
    const duration = Date.now() - start;

    // Log slow queries (>1000ms)
    if (duration > 1000 && context) {
      context.warn(`Slow query detected (${duration}ms):`, {
        query: query.substring(0, 100),
        params: params?.length
      });
    }

    return result;
  } catch (error) {
    const duration = Date.now() - start;
    context?.error(`Query failed after ${duration}ms:`, error);
    throw error;
  }
}
```

### 4. Optimize Soft Deletes (MEDIUM PRIORITY)

**Current Pattern:** `WHERE is_deleted = false` in all queries

**Optimization:** Use partial indexes

```sql
CREATE INDEX CONCURRENTLY idx_legal_entity_active
  ON legal_entity(legal_entity_id, party_reference_id)
  WHERE is_deleted = false;
```

**Impact:** Faster scans on large tables with many soft-deleted records

### 5. Connection Pool Tuning (LOW PRIORITY)

**Current:** 5-20 connections

**Recommended Adjustments:**

```typescript
// api/src/utils/database.ts
const pool = new Pool({
  host: process.env.POSTGRES_HOST,
  port: parseInt(process.env.POSTGRES_PORT || '5432'),
  database: process.env.POSTGRES_DB,
  user: process.env.POSTGRES_USER,
  password: process.env.POSTGRES_PASSWORD,

  // Optimized settings
  min: 5,          // Minimum idle connections
  max: 20,         // Maximum connections (based on Azure tier)
  idleTimeoutMillis: 30000,  // Close idle connections after 30s
  connectionTimeoutMillis: 5000,  // Fail fast if no connection available

  // Connection health
  keepAlive: true,
  keepAliveInitialDelayMillis: 10000,

  ssl: {
    rejectUnauthorized: true
  }
});
```

## Monitoring Queries

**Check Index Usage:**

```sql
SELECT
  schemaname,
  tablename,
  indexname,
  idx_scan,
  idx_tup_read,
  idx_tup_fetch
FROM pg_stat_user_indexes
ORDER BY idx_scan ASC;
```

**Find Missing Indexes:**

```sql
SELECT
  schemaname,
  tablename,
  seq_scan,
  seq_tup_read,
  idx_scan,
  seq_tup_read / seq_scan as avg_seq_read
FROM pg_stat_user_tables
WHERE seq_scan > 0
ORDER BY seq_tup_read DESC
LIMIT 20;
```

**Slow Query Analysis:**

```sql
SELECT
  query,
  calls,
  total_exec_time,
  mean_exec_time,
  max_exec_time
FROM pg_stat_statements
ORDER BY mean_exec_time DESC
LIMIT 20;
```

## Implementation Priority

1. **Week 1:** Add foreign key indexes (1 hour)
2. **Week 2:** Optimize N+1 patterns in GetAuthenticatedMember (2 hours)
3. **Week 3:** Add query performance monitoring (3 hours)
4. **Week 4:** Review and optimize other N+1 patterns (4 hours)

**Total Estimated:** 10 hours for 80% of performance gains
