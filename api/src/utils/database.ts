import { Pool, PoolClient } from 'pg';

let pool: Pool | null = null;

/**
 * Get or create a shared database connection pool
 * This ensures proper connection management and SSL certificate validation
 */
export function getPool(): Pool {
  if (!pool) {
    // Query timeout in milliseconds (default: 30 seconds)
    const queryTimeout = parseInt(process.env.DATABASE_QUERY_TIMEOUT_MS || '30000');

    pool = new Pool({
      host: process.env.POSTGRES_HOST,
      port: parseInt(process.env.POSTGRES_PORT || '5432'),
      database: process.env.POSTGRES_DATABASE,
      user: process.env.POSTGRES_USER,
      password: process.env.POSTGRES_PASSWORD,
      ssl: {
        rejectUnauthorized: true,  // ✅ SECURITY FIX: Validate SSL certificates
      },
      // Connection pool optimization
      max: 20, // Maximum pool size
      min: 5, // Minimum pool size
      idleTimeoutMillis: 30000,
      connectionTimeoutMillis: 10000,
      allowExitOnIdle: false,
      // Query timeout - prevent long-running queries from hanging
      statement_timeout: queryTimeout,
      query_timeout: queryTimeout,
    });

    // Handle pool errors
    pool.on('error', (err) => {
      console.error('Unexpected database pool error:', err);
    });

    console.log('✅ Database connection pool initialized with SSL validation enabled');
  }

  return pool;
}

/**
 * Execute a query with automatic connection handling
 * @param text SQL query text
 * @param params Query parameters
 * @returns Query result
 */
export async function query(text: string, params?: any[]) {
  const pool = getPool();
  return pool.query(text, params);
}

/**
 * Get a client for transaction support
 * Remember to release the client after use!
 * @returns Pool client
 */
export async function getClient(): Promise<PoolClient> {
  const pool = getPool();
  return pool.connect();
}

/**
 * Graceful shutdown - close all database connections
 */
export async function closePool(): Promise<void> {
  if (pool) {
    await pool.end();
    pool = null;
    console.log('✅ Database connection pool closed');
  }
}

/**
 * Execute a function within a database transaction
 * @param callback Function to execute within transaction
 * @returns Result from callback
 */
export async function withTransaction<T>(
  callback: (client: PoolClient) => Promise<T>
): Promise<T> {
  const client = await getClient();

  try {
    await client.query('BEGIN');
    const result = await callback(client);
    await client.query('COMMIT');
    return result;
  } catch (error) {
    await client.query('ROLLBACK');
    throw error;
  } finally {
    client.release();
  }
}

/**
 * Escapes SQL wildcard characters in user input for LIKE/ILIKE queries
 *
 * **Security Rationale:**
 * Without escaping, attackers can inject wildcard characters (%, _) to bypass
 * search filters and enumerate data. For example:
 * - Searching for "%" returns all records
 * - Searching for "test_%" finds patterns matching "test" + any character + any suffix
 * - Searching for "\_" escapes the literal underscore
 *
 * This function prevents wildcard injection attacks by escaping:
 * - Backslash (\) → Double backslash (\\) [must be escaped first]
 * - Percent (%) → Backslash + percent (\%)
 * - Underscore (_) → Backslash + underscore (\_)
 *
 * **Usage Example:**
 * ```typescript
 * const userInput = "test%"; // Malicious input attempting to match all "test*"
 * const escaped = escapeSqlWildcards(userInput); // Returns "test\\%"
 * const query = `SELECT * FROM users WHERE email ILIKE $1`;
 * const params = [`%${escaped}%`]; // Safe: searches for literal "test%" substring
 * ```
 *
 * **PostgreSQL LIKE Escape Behavior:**
 * By default, PostgreSQL uses backslash as the escape character in LIKE/ILIKE.
 * After escaping, the query treats %, _, and \ as literal characters, not wildcards.
 *
 * **CVSS 4.3 (MEDIUM) - CWE-89: SQL Injection (Wildcard Injection)**
 * Impact: Data enumeration, bypass of search filtering
 *
 * @param input User-provided string to be used in LIKE/ILIKE queries
 * @returns Escaped string safe for use in LIKE/ILIKE patterns
 */
export function escapeSqlWildcards(input: string): string {
  if (!input || typeof input !== 'string') {
    return input;
  }

  return input
    .replace(/\\/g, '\\\\')  // Escape backslash first (\ → \\)
    .replace(/%/g, '\\%')    // Escape percent (% → \%)
    .replace(/_/g, '\\_');   // Escape underscore (_ → \_)
}
