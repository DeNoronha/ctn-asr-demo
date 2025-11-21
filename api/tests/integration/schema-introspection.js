/**
 * Database Schema Introspection Utility
 *
 * Queries PostgreSQL information_schema to extract:
 * - Table columns and types
 * - View definitions
 * - Foreign key relationships
 *
 * Used by contract tests to validate API queries against actual schema.
 */

const { Client } = require('pg');

class SchemaIntrospector {
  constructor(connectionConfig) {
    this.client = new Client(connectionConfig);
  }

  async connect() {
    await this.client.connect();
  }

  async disconnect() {
    await this.client.end();
  }

  /**
   * Get all columns for a table or view
   * @param {string} tableName - Table or view name
   * @returns {Promise<Array>} Array of column metadata
   */
  async getTableColumns(tableName) {
    const query = `
      SELECT
        column_name,
        data_type,
        is_nullable,
        column_default,
        character_maximum_length,
        numeric_precision,
        numeric_scale
      FROM information_schema.columns
      WHERE table_schema = 'public'
        AND table_name = $1
      ORDER BY ordinal_position;
    `;

    const result = await this.client.query(query, [tableName]);
    return result.rows;
  }

  /**
   * Get all tables in public schema
   * @returns {Promise<Array<string>>} Array of table names
   */
  async getAllTables() {
    const query = `
      SELECT table_name
      FROM information_schema.tables
      WHERE table_schema = 'public'
        AND table_type = 'BASE TABLE'
      ORDER BY table_name;
    `;

    const result = await this.client.query(query);
    return result.rows.map(row => row.table_name);
  }

  /**
   * Get all views in public schema
   * @returns {Promise<Array<string>>} Array of view names
   */
  async getAllViews() {
    const query = `
      SELECT table_name
      FROM information_schema.views
      WHERE table_schema = 'public'
      ORDER BY table_name;
    `;

    const result = await this.client.query(query);
    return result.rows.map(row => row.table_name);
  }

  /**
   * Get view definition (SQL that creates the view)
   * @param {string} viewName - View name
   * @returns {Promise<string>} View definition SQL
   */
  async getViewDefinition(viewName) {
    const query = `
      SELECT definition
      FROM pg_views
      WHERE schemaname = 'public'
        AND viewname = $1;
    `;

    const result = await this.client.query(query, [viewName]);
    return result.rows[0]?.definition || null;
  }

  /**
   * Check if a column exists in a table/view
   * @param {string} tableName - Table or view name
   * @param {string} columnName - Column name
   * @returns {Promise<boolean>}
   */
  async columnExists(tableName, columnName) {
    const query = `
      SELECT 1
      FROM information_schema.columns
      WHERE table_schema = 'public'
        AND table_name = $1
        AND column_name = $2;
    `;

    const result = await this.client.query(query, [tableName, columnName]);
    return result.rows.length > 0;
  }

  /**
   * Get column data type
   * @param {string} tableName - Table or view name
   * @param {string} columnName - Column name
   * @returns {Promise<string|null>} Data type or null
   */
  async getColumnType(tableName, columnName) {
    const query = `
      SELECT data_type, udt_name
      FROM information_schema.columns
      WHERE table_schema = 'public'
        AND table_name = $1
        AND column_name = $2;
    `;

    const result = await this.client.query(query, [tableName, columnName]);
    if (result.rows.length === 0) return null;

    const row = result.rows[0];
    // For user-defined types (like enums), return the udt_name
    return row.data_type === 'USER-DEFINED' ? row.udt_name : row.data_type;
  }

  /**
   * Get foreign key relationships for a table
   * @param {string} tableName - Table name
   * @returns {Promise<Array>} Foreign key metadata
   */
  async getForeignKeys(tableName) {
    const query = `
      SELECT
        kcu.column_name,
        ccu.table_name AS foreign_table_name,
        ccu.column_name AS foreign_column_name,
        rc.update_rule,
        rc.delete_rule
      FROM information_schema.table_constraints AS tc
      JOIN information_schema.key_column_usage AS kcu
        ON tc.constraint_name = kcu.constraint_name
        AND tc.table_schema = kcu.table_schema
      JOIN information_schema.constraint_column_usage AS ccu
        ON ccu.constraint_name = tc.constraint_name
        AND ccu.table_schema = tc.table_schema
      JOIN information_schema.referential_constraints AS rc
        ON rc.constraint_name = tc.constraint_name
        AND rc.constraint_schema = tc.table_schema
      WHERE tc.constraint_type = 'FOREIGN KEY'
        AND tc.table_schema = 'public'
        AND tc.table_name = $1;
    `;

    const result = await this.client.query(query, [tableName]);
    return result.rows;
  }

  /**
   * Validate multiple columns exist in a table
   * @param {string} tableName - Table or view name
   * @param {Array<string>} columnNames - Array of column names
   * @returns {Promise<Object>} {valid: boolean, missing: Array<string>}
   */
  async validateColumns(tableName, columnNames) {
    const missing = [];

    for (const column of columnNames) {
      const exists = await this.columnExists(tableName, column);
      if (!exists) {
        missing.push(column);
      }
    }

    return {
      valid: missing.length === 0,
      missing
    };
  }

  /**
   * Get schema summary for debugging
   * @returns {Promise<Object>} Schema summary
   */
  async getSchemaSummary() {
    const tables = await this.getAllTables();
    const views = await this.getAllViews();

    const summary = {
      tables: [],
      views: []
    };

    for (const table of tables) {
      const columns = await this.getTableColumns(table);
      summary.tables.push({
        name: table,
        columnCount: columns.length,
        columns: columns.map(c => c.column_name)
      });
    }

    for (const view of views) {
      const columns = await this.getTableColumns(view);
      summary.views.push({
        name: view,
        columnCount: columns.length,
        columns: columns.map(c => c.column_name)
      });
    }

    return summary;
  }
}

module.exports = { SchemaIntrospector };
