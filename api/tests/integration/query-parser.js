/**
 * SQL Query Parser for Contract Testing
 *
 * Extracts column names from SQL queries to validate against schema.
 * Handles:
 * - SELECT statements (columns, aliases)
 * - INSERT statements (columns, parameter counts)
 * - UPDATE statements (columns)
 * - Common PostgreSQL patterns (RETURNING, CTEs, etc.)
 */

class QueryParser {
  /**
   * Extract columns from SELECT statement
   * @param {string} sql - SQL query
   * @returns {Object} {columns: Array<string>, tables: Array<string>}
   */
  static parseSelect(sql) {
    const columns = [];
    const tables = [];

    // Normalize whitespace
    const normalized = sql.replace(/\s+/g, ' ').trim();

    // Extract SELECT clause (between SELECT and FROM)
    const selectMatch = normalized.match(/SELECT\s+(.*?)\s+FROM/i);
    if (!selectMatch) {
      return { columns, tables };
    }

    const selectClause = selectMatch[1];

    // Handle SELECT *
    if (selectClause.trim() === '*') {
      return { columns: ['*'], tables };
    }

    // Split by comma, but ignore commas inside functions
    const columnParts = this.splitByComma(selectClause);

    for (const part of columnParts) {
      const trimmed = part.trim();

      // Skip aggregate functions that don't reference specific columns
      if (trimmed.match(/^COUNT\(\*\)/i)) {
        continue;
      }

      // Extract column name (before AS or end)
      let columnName = trimmed.split(/\s+AS\s+/i)[0].trim();

      // Remove function wrappers (e.g., COALESCE(col), TRIM(col))
      columnName = this.extractBaseColumn(columnName);

      // Remove table prefix (e.g., t.column_name -> column_name)
      if (columnName.includes('.')) {
        columnName = columnName.split('.').pop();
      }

      if (columnName && columnName !== '*') {
        columns.push(columnName);
      }
    }

    // Extract tables from FROM clause
    const fromMatch = normalized.match(/FROM\s+([a-z_][a-z0-9_]*)/i);
    if (fromMatch) {
      tables.push(fromMatch[1]);
    }

    // Extract tables from JOIN clauses
    const joinMatches = normalized.matchAll(/JOIN\s+([a-z_][a-z0-9_]*)/gi);
    for (const match of joinMatches) {
      tables.push(match[1]);
    }

    return { columns: this.dedupeColumns(columns), tables };
  }

  /**
   * Extract columns from INSERT statement
   * @param {string} sql - INSERT SQL
   * @returns {Object} {table: string, columns: Array<string>, parameterCount: number}
   */
  static parseInsert(sql) {
    const normalized = sql.replace(/\s+/g, ' ').trim();

    // Extract table name
    const tableMatch = normalized.match(/INSERT\s+INTO\s+([a-z_][a-z0-9_]*)/i);
    const table = tableMatch ? tableMatch[1] : null;

    // Extract column list
    const columnsMatch = normalized.match(/\(([^)]+)\)\s+VALUES/i);
    if (!columnsMatch) {
      return { table, columns: [], parameterCount: 0 };
    }

    const columnList = columnsMatch[1];
    const columns = columnList.split(',').map(c => c.trim());

    // Count parameters ($1, $2, etc.)
    const paramMatches = normalized.match(/\$\d+/g) || [];
    const parameterCount = paramMatches.length;

    return { table, columns, parameterCount };
  }

  /**
   * Extract columns from UPDATE statement
   * @param {string} sql - UPDATE SQL
   * @returns {Object} {table: string, columns: Array<string>}
   */
  static parseUpdate(sql) {
    const normalized = sql.replace(/\s+/g, ' ').trim();

    // Extract table name
    const tableMatch = normalized.match(/UPDATE\s+([a-z_][a-z0-9_]*)/i);
    const table = tableMatch ? tableMatch[1] : null;

    // Extract SET clause
    const setMatch = normalized.match(/SET\s+(.*?)\s+WHERE/i);
    if (!setMatch) {
      return { table, columns: [] };
    }

    const setClause = setMatch[1];
    const assignments = this.splitByComma(setClause);

    const columns = assignments.map(assignment => {
      const columnMatch = assignment.match(/^([a-z_][a-z0-9_]*)\s*=/i);
      return columnMatch ? columnMatch[1] : null;
    }).filter(Boolean);

    return { table, columns };
  }

  /**
   * Validate INSERT parameter count matches column count
   * @param {string} sql - INSERT SQL
   * @returns {Object} {valid: boolean, columns: number, parameters: number}
   */
  static validateInsertParameterCount(sql) {
    const parsed = this.parseInsert(sql);

    return {
      valid: parsed.columns.length === parsed.parameterCount,
      columns: parsed.columns.length,
      parameters: parsed.parameterCount,
      columnList: parsed.columns
    };
  }

  /**
   * Extract base column name from function wrappers
   * @param {string} expr - SQL expression
   * @returns {string} Base column name
   */
  static extractBaseColumn(expr) {
    // Remove common function wrappers
    const functions = [
      'COALESCE', 'NULLIF', 'TRIM', 'LOWER', 'UPPER',
      'TO_CHAR', 'TO_DATE', 'CAST', 'ARRAY_AGG', 'STRING_AGG',
      'COUNT', 'SUM', 'AVG', 'MIN', 'MAX', 'JSON_AGG', 'JSONB_AGG'
    ];

    let cleaned = expr;

    for (const func of functions) {
      const regex = new RegExp(`${func}\\s*\\((.*)\\)`, 'i');
      const match = cleaned.match(regex);
      if (match) {
        // Recursively extract (handle nested functions)
        cleaned = match[1].split(',')[0].trim(); // Take first argument
        return this.extractBaseColumn(cleaned);
      }
    }

    // Remove quotes
    cleaned = cleaned.replace(/['"]/g, '');

    // Remove :: type casts (e.g., column::text)
    cleaned = cleaned.split('::')[0];

    return cleaned;
  }

  /**
   * Split string by comma, respecting parentheses
   * @param {string} str - String to split
   * @returns {Array<string>}
   */
  static splitByComma(str) {
    const parts = [];
    let current = '';
    let depth = 0;

    for (let i = 0; i < str.length; i++) {
      const char = str[i];

      if (char === '(') {
        depth++;
      } else if (char === ')') {
        depth--;
      }

      if (char === ',' && depth === 0) {
        parts.push(current);
        current = '';
      } else {
        current += char;
      }
    }

    if (current) {
      parts.push(current);
    }

    return parts;
  }

  /**
   * Deduplicate column list
   * @param {Array<string>} columns
   * @returns {Array<string>}
   */
  static dedupeColumns(columns) {
    return [...new Set(columns)];
  }

  /**
   * Extract all queries from a TypeScript/JavaScript file
   * @param {string} fileContent - File content
   * @returns {Array<Object>} Array of {query: string, lineNumber: number}
   */
  static extractQueriesFromFile(fileContent) {
    const queries = [];
    const lines = fileContent.split('\n');

    let inQuery = false;
    let currentQuery = '';
    let startLine = 0;

    for (let i = 0; i < lines.length; i++) {
      const line = lines[i];

      // Detect SQL query start (backtick string with SELECT/INSERT/UPDATE)
      if (line.match(/`\s*(SELECT|INSERT|UPDATE)/i)) {
        inQuery = true;
        startLine = i + 1;
        currentQuery = line;
        continue;
      }

      if (inQuery) {
        currentQuery += '\n' + line;

        // Detect query end (closing backtick)
        if (line.includes('`')) {
          // Extract SQL from backticks
          const sqlMatch = currentQuery.match(/`([^`]+)`/s);
          if (sqlMatch) {
            queries.push({
              query: sqlMatch[1].trim(),
              lineNumber: startLine
            });
          }
          inQuery = false;
          currentQuery = '';
        }
      }
    }

    return queries;
  }
}

module.exports = { QueryParser };
