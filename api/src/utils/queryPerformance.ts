import { InvocationContext } from '@azure/functions';
import { Pool, QueryResult } from 'pg';

/**
 * Query Performance Monitoring Utility
 *
 * Tracks database query execution times and logs slow queries.
 * Helps identify performance bottlenecks and optimization opportunities.
 *
 * Part of Phase 3.3: Add Query Performance Monitoring
 * See: docs/DATABASE_OPTIMIZATION_GUIDE.md (lines 93-124)
 */

const SLOW_QUERY_THRESHOLD_MS = 1000; // Log queries slower than 1 second

interface QueryMetrics {
  query: string;
  duration: number;
  params?: any[];
  timestamp: string;
}

/**
 * Execute a database query with performance monitoring
 *
 * @param pool - PostgreSQL connection pool
 * @param query - SQL query string
 * @param params - Query parameters
 * @param context - Azure Functions invocation context for logging
 * @returns Query result
 *
 * @example
 * ```typescript
 * const result = await executeQuery(
 *   pool,
 *   'SELECT * FROM members WHERE org_id = $1',
 *   [orgId],
 *   context
 * );
 * ```
 */
export async function executeQuery<T = any>(
  pool: Pool,
  query: string,
  params?: any[],
  context?: InvocationContext
): Promise<QueryResult<T>> {
  const start = Date.now();
  const timestamp = new Date().toISOString();

  try {
    const result = await pool.query<T>(query, params);
    const duration = Date.now() - start;

    // Log slow queries (>1000ms)
    if (duration > SLOW_QUERY_THRESHOLD_MS && context) {
      const metrics: QueryMetrics = {
        query: query.substring(0, 200), // Truncate long queries
        duration,
        params: params?.length ? ['[REDACTED]'] : undefined, // Redact param values for security
        timestamp,
      };

      context.warn(`🐌 Slow query detected (${duration}ms):`, metrics);

      // Log to Application Insights custom metrics
      if (context.traceContext) {
        context.log({
          customMetrics: {
            name: 'DatabaseQueryDuration',
            value: duration,
          },
          customDimensions: {
            queryType: extractQueryType(query),
            isSlow: true,
            threshold: SLOW_QUERY_THRESHOLD_MS,
          },
        });
      }
    } else if (context && duration > 500) {
      // Log moderately slow queries (500-1000ms) as info
      context.info(`⚠️ Moderate query time (${duration}ms): ${query.substring(0, 100)}...`);
    } else if (context && duration > 100) {
      // Trace fast queries for debugging
      context.trace(`✅ Query completed (${duration}ms)`);
    }

    return result;
  } catch (error) {
    const duration = Date.now() - start;

    if (context) {
      context.error(`❌ Query failed after ${duration}ms:`, {
        error: error instanceof Error ? error.message : String(error),
        query: query.substring(0, 200),
        duration,
        timestamp,
      });
    }

    throw error;
  }
}

/**
 * Extract the query type (SELECT, INSERT, UPDATE, DELETE) from SQL
 */
function extractQueryType(query: string): string {
  const trimmed = query.trim().toUpperCase();
  if (trimmed.startsWith('SELECT')) return 'SELECT';
  if (trimmed.startsWith('INSERT')) return 'INSERT';
  if (trimmed.startsWith('UPDATE')) return 'UPDATE';
  if (trimmed.startsWith('DELETE')) return 'DELETE';
  if (trimmed.startsWith('WITH')) return 'CTE';
  return 'OTHER';
}

/**
 * Track query performance metrics for a function
 *
 * @example
 * ```typescript
 * const tracker = new QueryPerformanceTracker(context);
 * tracker.start();
 * // ... execute queries ...
 * tracker.end();
 * // Logs: "Function completed 3 queries in 245ms (avg: 82ms)"
 * ```
 */
export class QueryPerformanceTracker {
  private queryCount = 0;
  private totalDuration = 0;
  private startTime: number;

  constructor(private context?: InvocationContext) {
    this.startTime = Date.now();
  }

  recordQuery(duration: number): void {
    this.queryCount++;
    this.totalDuration += duration;
  }

  end(): void {
    const functionDuration = Date.now() - this.startTime;
    const avgQueryTime = this.queryCount > 0 ? Math.round(this.totalDuration / this.queryCount) : 0;

    if (this.context) {
      this.context.info(
        `📊 Function completed ${this.queryCount} queries in ${functionDuration}ms (avg: ${avgQueryTime}ms)`
      );

      // Log to Application Insights
      if (this.context.traceContext) {
        this.context.log({
          customMetrics: {
            name: 'FunctionQueryCount',
            value: this.queryCount,
          },
          customDimensions: {
            totalDuration: this.totalDuration,
            avgDuration: avgQueryTime,
            functionDuration,
          },
        });
      }
    }
  }
}
