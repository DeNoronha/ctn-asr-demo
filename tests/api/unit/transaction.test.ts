import { describe, it, expect, beforeEach, afterEach, jest } from '@jest/globals';
import { Transaction, withTransaction } from '../src/utils/transaction';
import { getPool } from '../src/utils/database';
import { InvocationContext } from '@azure/functions';

/**
 * Unit tests for the Transaction utility
 * Tests BEGIN/COMMIT/ROLLBACK and savepoint functionality
 */
describe('Transaction Utility', () => {
  let context: InvocationContext;
  const pool = getPool();

  beforeEach(() => {
    // Mock Azure Functions InvocationContext
    context = {
      log: jest.fn(),
      error: jest.fn(),
      warn: jest.fn(),
      trace: jest.fn(),
      debug: jest.fn(),
      invocationId: 'test-invocation-id',
      functionName: 'test-function',
      extraInputs: {},
      extraOutputs: {},
      options: {},
      bindingData: {},
      bindingDefinitions: [],
      traceContext: {
        traceparent: '',
        tracestate: '',
        attributes: {}
      }
    } as unknown as InvocationContext;
  });

  afterEach(async () => {
    // Clean up any test tables
    try {
      await pool.query('DROP TABLE IF EXISTS test_tx CASCADE');
      await pool.query('DROP TABLE IF EXISTS test_rollback CASCADE');
      await pool.query('DROP TABLE IF EXISTS test_parent CASCADE');
      await pool.query('DROP TABLE IF EXISTS test_child CASCADE');
      await pool.query('DROP TABLE IF EXISTS test_savepoint CASCADE');
    } catch (error) {
      // Ignore cleanup errors
    }
  });

  describe('withTransaction - Basic Operations', () => {
    it('should commit a successful transaction', async () => {
      const result = await withTransaction(pool, context, async (tx) => {
        await tx.query('CREATE TEMP TABLE test_tx (id INT, value TEXT)');
        await tx.query('INSERT INTO test_tx (id, value) VALUES (1, $1)', ['test']);

        const { rows } = await tx.query('SELECT * FROM test_tx WHERE id = 1');
        return rows[0];
      });

      expect(result).toEqual({ id: 1, value: 'test' });
      expect(context.log).toHaveBeenCalledWith('Transaction started');
      expect(context.log).toHaveBeenCalledWith('Transaction committed');
    });

    it('should rollback on error', async () => {
      try {
        await withTransaction(pool, context, async (tx) => {
          await tx.query('CREATE TEMP TABLE test_rollback (id INT UNIQUE)');
          await tx.query('INSERT INTO test_rollback (id) VALUES (1)');

          // This should cause the transaction to fail
          throw new Error('Forced error for testing');
        });

        fail('Should have thrown an error');
      } catch (error: any) {
        expect(error.message).toBe('Forced error for testing');
        expect(context.log).toHaveBeenCalledWith('Transaction started');
        expect(context.log).toHaveBeenCalledWith('Transaction rolled back');
      }

      // Verify the table doesn't exist (was rolled back)
      const { rows } = await pool.query(
        `SELECT tablename FROM pg_tables WHERE tablename = 'test_rollback' AND schemaname = 'pg_temp'`
      );
      expect(rows.length).toBe(0);
    });

    it('should handle nested operations within a transaction', async () => {
      const result = await withTransaction(pool, context, async (tx) => {
        // Create parent table
        await tx.query('CREATE TEMP TABLE test_parent (id INT PRIMARY KEY)');
        await tx.query('INSERT INTO test_parent (id) VALUES (1)');

        // Create child table with FK
        await tx.query(`
          CREATE TEMP TABLE test_child (
            id INT PRIMARY KEY,
            parent_id INT REFERENCES test_parent(id)
          )
        `);
        await tx.query('INSERT INTO test_child (id, parent_id) VALUES (100, 1)');

        const { rows } = await tx.query(`
          SELECT c.id, c.parent_id, p.id as parent_exists
          FROM test_child c
          JOIN test_parent p ON c.parent_id = p.id
        `);

        return { insertedRows: 2, childData: rows[0] };
      });

      expect(result.insertedRows).toBe(2);
      expect(result.childData).toEqual({ id: 100, parent_id: 1, parent_exists: 1 });
    });

    it('should throw error if query executed before begin', async () => {
      const tx = new Transaction(pool, context);

      await expect(
        tx.query('SELECT 1')
      ).rejects.toThrow('Transaction not started. Call begin() first.');
    });
  });

  describe('Savepoint Operations', () => {
    it('should create and release a savepoint', async () => {
      const result = await withTransaction(pool, context, async (tx) => {
        await tx.query('CREATE TEMP TABLE test_savepoint (id INT, status TEXT)');
        await tx.query('INSERT INTO test_savepoint (id, status) VALUES (1, $1)', ['initial']);

        const sp = await tx.savepoint('test_sp');
        await tx.query('UPDATE test_savepoint SET status = $1 WHERE id = 1', ['updated']);
        await tx.releaseSavepoint(sp);

        const { rows } = await tx.query('SELECT * FROM test_savepoint');
        return rows[0];
      });

      expect(result).toEqual({ id: 1, status: 'updated' });
      expect(context.log).toHaveBeenCalledWith('Savepoint created: test_sp');
      expect(context.log).toHaveBeenCalledWith('Savepoint released: test_sp');
    });

    it('should rollback to a savepoint on partial failure', async () => {
      const result = await withTransaction(pool, context, async (tx) => {
        await tx.query('CREATE TEMP TABLE test_savepoint (id INT UNIQUE, value TEXT)');
        await tx.query('INSERT INTO test_savepoint (id, value) VALUES (1, $1)', ['original']);

        // Create savepoint before risky operation
        const sp = await tx.savepoint('before_update');

        try {
          await tx.query('INSERT INTO test_savepoint (id, value) VALUES (2, $1)', ['new']);
          // This will fail due to unique constraint
          await tx.query('INSERT INTO test_savepoint (id, value) VALUES (1, $1)', ['duplicate']);
          await tx.releaseSavepoint(sp);
        } catch (error) {
          // Rollback to savepoint - keep original data, discard failed inserts
          await tx.rollbackTo(sp);
        }

        const { rows } = await tx.query('SELECT * FROM test_savepoint ORDER BY id');
        return rows;
      });

      // Should only have the original row
      expect(result.length).toBe(1);
      expect(result[0]).toEqual({ id: 1, value: 'original' });
      expect(context.log).toHaveBeenCalledWith('Savepoint created: before_update');
      expect(context.log).toHaveBeenCalledWith('Rolled back to savepoint: before_update');
    });

    it('should auto-generate savepoint names', async () => {
      await withTransaction(pool, context, async (tx) => {
        const sp1 = await tx.savepoint();
        const sp2 = await tx.savepoint();
        const sp3 = await tx.savepoint();

        expect(sp1).toBe('sp_1');
        expect(sp2).toBe('sp_2');
        expect(sp3).toBe('sp_3');
      });
    });

    it('should throw error if savepoint used without active transaction', async () => {
      const tx = new Transaction(pool, context);

      await expect(
        tx.savepoint('test')
      ).rejects.toThrow('No active transaction');
    });
  });

  describe('Error Handling', () => {
    it('should handle database constraint violations', async () => {
      try {
        await withTransaction(pool, context, async (tx) => {
          await tx.query('CREATE TEMP TABLE test_constraint (id INT PRIMARY KEY)');
          await tx.query('INSERT INTO test_constraint (id) VALUES (1)');
          // Duplicate primary key violation
          await tx.query('INSERT INTO test_constraint (id) VALUES (1)');
        });

        fail('Should have thrown constraint violation error');
      } catch (error: any) {
        expect(error.code).toBe('23505'); // Unique violation
        expect(context.log).toHaveBeenCalledWith('Transaction rolled back');
      }
    });

    it('should handle query syntax errors', async () => {
      try {
        await withTransaction(pool, context, async (tx) => {
          await tx.query('INVALID SQL SYNTAX');
        });

        fail('Should have thrown syntax error');
      } catch (error: any) {
        expect(error.code).toBe('42601'); // Syntax error
        expect(context.log).toHaveBeenCalledWith('Transaction rolled back');
      }
    });

    it('should cleanup connection on begin failure', async () => {
      // Mock a pool that fails to connect
      const badPool = {
        connect: jest.fn().mockRejectedValue(new Error('Connection failed'))
      } as any;

      const tx = new Transaction(badPool, context);

      await expect(
        tx.begin()
      ).rejects.toThrow('Connection failed');

      expect(context.error).toHaveBeenCalledWith(
        'Failed to begin transaction:',
        expect.any(Error)
      );
    });
  });

  describe('Transaction Class - Direct Usage', () => {
    it('should allow manual transaction control', async () => {
      const tx = new Transaction(pool, context);

      try {
        await tx.begin();

        await tx.query('CREATE TEMP TABLE test_manual (id INT)');
        await tx.query('INSERT INTO test_manual (id) VALUES (1), (2), (3)');

        const { rows, rowCount } = await tx.query('SELECT COUNT(*) as count FROM test_manual');
        expect(rows[0].count).toBe('3');
        expect(rowCount).toBe(1);

        await tx.commit();
      } catch (error) {
        await tx.rollback();
        throw error;
      }

      expect(context.log).toHaveBeenCalledWith('Transaction started');
      expect(context.log).toHaveBeenCalledWith('Transaction committed');
    });

    it('should return rowCount from queries', async () => {
      const result = await withTransaction(pool, context, async (tx) => {
        await tx.query('CREATE TEMP TABLE test_rowcount (id INT)');
        const insertResult = await tx.query(
          'INSERT INTO test_rowcount (id) VALUES (1), (2), (3)'
        );

        return insertResult.rowCount;
      });

      expect(result).toBe(3);
    });
  });

  describe('Complex Scenarios', () => {
    it('should handle multiple savepoints in sequence', async () => {
      const result = await withTransaction(pool, context, async (tx) => {
        await tx.query('CREATE TEMP TABLE test_multi (id INT, stage TEXT)');

        // Stage 1
        await tx.query('INSERT INTO test_multi VALUES (1, $1)', ['stage1']);
        const sp1 = await tx.savepoint('stage1');

        // Stage 2
        await tx.query('INSERT INTO test_multi VALUES (2, $1)', ['stage2']);
        const sp2 = await tx.savepoint('stage2');

        // Stage 3 (fails)
        try {
          await tx.query('INSERT INTO invalid_table VALUES (3)');
        } catch (error) {
          // Rollback stage 3, keep stage 1 and 2
          await tx.rollbackTo(sp2);
        }

        // Stage 4
        await tx.query('INSERT INTO test_multi VALUES (3, $1)', ['stage4']);

        const { rows } = await tx.query('SELECT * FROM test_multi ORDER BY id');
        return rows;
      });

      expect(result).toEqual([
        { id: 1, stage: 'stage1' },
        { id: 2, stage: 'stage2' },
        { id: 3, stage: 'stage4' }
      ]);
    });
  });
});
