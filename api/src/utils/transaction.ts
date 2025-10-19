import { Pool, PoolClient } from 'pg';
import { InvocationContext } from '@azure/functions';

/**
 * Transaction manager for PostgreSQL database operations
 * Provides BEGIN/COMMIT/ROLLBACK support with automatic cleanup
 * and savepoint functionality for nested transaction-like behavior
 */
export class Transaction {
  private client: PoolClient | null = null;
  private pool: Pool;
  private context: InvocationContext;
  private savepointCounter = 0;

  constructor(pool: Pool, context: InvocationContext) {
    this.pool = pool;
    this.context = context;
  }

  /**
   * Begin a new transaction
   * Acquires a connection from the pool and executes BEGIN
   */
  async begin(): Promise<void> {
    try {
      this.client = await this.pool.connect();
      await this.client.query('BEGIN');
      this.context.log('Transaction started');
    } catch (error) {
      this.context.error('Failed to begin transaction:', error);
      if (this.client) {
        this.client.release();
        this.client = null;
      }
      throw error;
    }
  }

  /**
   * Execute a query within the transaction
   * @param sql SQL query text
   * @param params Query parameters
   * @returns Query result with rows and rowCount
   */
  async query<T = any>(sql: string, params?: any[]): Promise<{ rows: T[]; rowCount: number }> {
    if (!this.client) {
      throw new Error('Transaction not started. Call begin() first.');
    }

    try {
      const result = await this.client.query(sql, params);
      return {
        rows: result.rows as T[],
        rowCount: result.rowCount || 0
      };
    } catch (error) {
      this.context.error('Query failed within transaction:', error);
      throw error;
    }
  }

  /**
   * Commit the transaction
   * Persists all changes made during the transaction
   */
  async commit(): Promise<void> {
    if (!this.client) {
      throw new Error('No transaction to commit');
    }

    try {
      await this.client.query('COMMIT');
      this.context.log('Transaction committed');
    } catch (error) {
      this.context.error('Failed to commit transaction:', error);
      throw error;
    } finally {
      this.client.release();
      this.client = null;
    }
  }

  /**
   * Rollback the transaction
   * Undoes all changes made during the transaction
   */
  async rollback(): Promise<void> {
    if (!this.client) {
      return; // Already rolled back or never started
    }

    try {
      await this.client.query('ROLLBACK');
      this.context.log('Transaction rolled back');
    } catch (error) {
      this.context.error('Failed to rollback transaction:', error);
    } finally {
      this.client.release();
      this.client = null;
    }
  }

  /**
   * Create a savepoint within the transaction
   * Allows partial rollback without aborting the entire transaction
   * @param name Optional savepoint name (auto-generated if not provided)
   * @returns The savepoint name
   */
  async savepoint(name?: string): Promise<string> {
    if (!this.client) {
      throw new Error('No active transaction');
    }

    const savepointName = name || `sp_${++this.savepointCounter}`;
    await this.client.query(`SAVEPOINT ${savepointName}`);
    this.context.log(`Savepoint created: ${savepointName}`);
    return savepointName;
  }

  /**
   * Rollback to a specific savepoint
   * Undoes changes made after the savepoint was created
   * @param savepointName Name of the savepoint to rollback to
   */
  async rollbackTo(savepointName: string): Promise<void> {
    if (!this.client) {
      throw new Error('No active transaction');
    }

    await this.client.query(`ROLLBACK TO SAVEPOINT ${savepointName}`);
    this.context.log(`Rolled back to savepoint: ${savepointName}`);
  }

  /**
   * Release a savepoint
   * Removes the savepoint, keeping all changes made after it
   * @param savepointName Name of the savepoint to release
   */
  async releaseSavepoint(savepointName: string): Promise<void> {
    if (!this.client) {
      throw new Error('No active transaction');
    }

    await this.client.query(`RELEASE SAVEPOINT ${savepointName}`);
    this.context.log(`Savepoint released: ${savepointName}`);
  }

  /**
   * Execute a function within a transaction with automatic rollback on error
   * Static factory method for convenience
   * @param pool Database connection pool
   * @param context Azure Functions invocation context
   * @param fn Function to execute within the transaction
   * @returns Result from the function
   */
  static async execute<T>(
    pool: Pool,
    context: InvocationContext,
    fn: (tx: Transaction) => Promise<T>
  ): Promise<T> {
    const tx = new Transaction(pool, context);

    try {
      await tx.begin();
      const result = await fn(tx);
      await tx.commit();
      return result;
    } catch (error) {
      await tx.rollback();
      throw error;
    }
  }
}

/**
 * Convenience function for executing transactions
 * Automatically handles BEGIN/COMMIT/ROLLBACK
 *
 * @example
 * ```typescript
 * const result = await withTransaction(pool, context, async (tx) => {
 *   const { rows } = await tx.query('INSERT INTO users (name) VALUES ($1) RETURNING id', ['John']);
 *   const userId = rows[0].id;
 *   await tx.query('INSERT INTO profiles (user_id) VALUES ($1)', [userId]);
 *   return userId;
 * });
 * ```
 *
 * @param pool Database connection pool
 * @param context Azure Functions invocation context
 * @param fn Function to execute within the transaction
 * @returns Result from the function
 */
export async function withTransaction<T>(
  pool: Pool,
  context: InvocationContext,
  fn: (tx: Transaction) => Promise<T>
): Promise<T> {
  return Transaction.execute(pool, context, fn);
}
