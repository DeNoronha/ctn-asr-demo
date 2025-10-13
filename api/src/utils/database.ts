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
