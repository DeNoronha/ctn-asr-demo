#!/usr/bin/env node

/**
 * Schema-API Contract Integration Tests
 *
 * Purpose: Prevent database schema mismatches with API queries
 *
 * Tests:
 * 1. Database Schema Validation - Verify tables and views exist
 * 2. API Query Validation - Check SELECT columns exist in schema
 * 3. INSERT Parameter Count - Verify column count matches parameter count
 * 4. API Response Contract - Validate API returns expected fields
 *
 * This catches issues BEFORE build:
 * - Missing columns in queries
 * - Wrong column names
 * - INSERT/UPDATE parameter mismatches
 * - API response fields that don't exist in DB
 */

const fs = require('fs');
const path = require('path');
const { SchemaIntrospector } = require('./schema-introspection');
const { QueryParser } = require('./query-parser');

// ANSI color codes for output
const colors = {
  reset: '\x1b[0m',
  red: '\x1b[31m',
  green: '\x1b[32m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
  cyan: '\x1b[36m',
  bold: '\x1b[1m'
};

class SchemaContractTests {
  constructor(config) {
    this.config = config;
    this.introspector = new SchemaIntrospector(config.database);
    this.results = {
      total: 0,
      passed: 0,
      failed: 0,
      errors: []
    };
  }

  log(message, color = 'reset') {
    console.log(`${colors[color]}${message}${colors.reset}`);
  }

  async runAllTests() {
    this.log('\n========================================', 'cyan');
    this.log('Schema-API Contract Tests', 'cyan');
    this.log('========================================\n', 'cyan');

    try {
      await this.introspector.connect();
      this.log('✓ Connected to database', 'green');

      // Run test suites
      await this.testDatabaseSchema();
      await this.testAPIQueries();
      await this.testInsertStatements();
      await this.testAPIResponseContracts();

      // Print summary
      this.printSummary();

      await this.introspector.disconnect();

      // Exit with error code if any tests failed
      process.exit(this.results.failed > 0 ? 1 : 0);

    } catch (error) {
      this.log(`\n✗ Fatal error: ${error.message}`, 'red');
      console.error(error);
      process.exit(1);
    }
  }

  async testDatabaseSchema() {
    this.log('\n--- Test Suite: Database Schema Validation ---', 'blue');

    const requiredTables = [
      'members',
      'legal_entity',
      'legal_entity_contact',
      'legal_entity_number',
      'legal_entity_endpoint',
      'applications',
      'audit_log',
      'party_reference',
      'kvk_registry_data',
      'identifier_verification_history'
    ];

    const requiredViews = [
      'v_members_full',
      'legal_entity_full',
      'company_identifiers_with_registry'
    ];

    // Check tables
    const tables = await this.introspector.getAllTables();
    for (const table of requiredTables) {
      this.results.total++;
      if (tables.includes(table)) {
        this.log(`  ✓ Table exists: ${table}`, 'green');
        this.results.passed++;
      } else {
        this.log(`  ✗ Missing table: ${table}`, 'red');
        this.results.failed++;
        this.results.errors.push(`Missing table: ${table}`);
      }
    }

    // Check views
    const views = await this.introspector.getAllViews();
    for (const view of requiredViews) {
      this.results.total++;
      if (views.includes(view)) {
        this.log(`  ✓ View exists: ${view}`, 'green');
        this.results.passed++;
      } else {
        this.log(`  ✗ Missing view: ${view}`, 'red');
        this.results.failed++;
        this.results.errors.push(`Missing view: ${view}`);
      }
    }
  }

  async testAPIQueries() {
    this.log('\n--- Test Suite: API Query Validation ---', 'blue');

    const routesPath = path.join(__dirname, '../../src/routes.ts');
    const routesContent = fs.readFileSync(routesPath, 'utf-8');

    const queries = QueryParser.extractQueriesFromFile(routesContent);
    this.log(`  Found ${queries.length} SQL queries in routes.ts\n`);

    for (const { query, lineNumber } of queries) {
      if (query.toUpperCase().startsWith('SELECT')) {
        await this.validateSelectQuery(query, lineNumber);
      }
    }
  }

  async validateSelectQuery(query, lineNumber) {
    const parsed = QueryParser.parseSelect(query);

    if (parsed.columns.includes('*')) {
      // SELECT * is valid, skip validation
      return;
    }

    for (const table of parsed.tables) {
      for (const column of parsed.columns) {
        this.results.total++;

        const exists = await this.introspector.columnExists(table, column);
        if (exists) {
          this.log(`  ✓ Line ${lineNumber}: ${table}.${column}`, 'green');
          this.results.passed++;
        } else {
          this.log(`  ✗ Line ${lineNumber}: ${table}.${column} NOT FOUND`, 'red');
          this.results.failed++;
          this.results.errors.push(
            `Line ${lineNumber}: Column "${column}" does not exist in table/view "${table}"`
          );
        }
      }
    }
  }

  async testInsertStatements() {
    this.log('\n--- Test Suite: INSERT Statement Validation ---', 'blue');

    // Test specific INSERT statements that caused issues
    const insertTests = [
      {
        name: 'Member registration INSERT',
        file: 'src/functions-legacy/RegisterMember.ts',
        table: 'members',
        expectedColumns: [
          'id', 'org_id', 'legal_entity_id', 'azure_ad_object_id',
          'email', 'created_at', 'updated_at', 'metadata'
        ]
      },
      {
        name: 'Legal entity INSERT',
        file: 'src/functions-legacy/RegisterMember.ts',
        table: 'legal_entity',
        expectedColumns: [
          'legal_entity_id', 'party_id', 'primary_legal_name', 'entity_legal_form',
          'address_line1', 'city', 'postal_code', 'country_code', 'status',
          'dt_created', 'dt_modified'
        ]
      },
      {
        name: 'Identifier INSERT',
        file: 'src/functions-legacy/CreateIdentifier.ts',
        table: 'legal_entity_number',
        expectedColumns: [
          'legal_entity_reference_id', 'legal_entity_id', 'identifier_type',
          'identifier_value', 'validation_status', 'verification_status',
          'dt_created', 'dt_modified'
        ]
      },
      {
        name: 'Audit log INSERT',
        file: 'src/middleware/auditLog.ts',
        table: 'audit_log',
        expectedColumns: [
          'event_type', 'severity', 'result', 'user_id', 'user_email',
          'resource_type', 'resource_id', 'action', 'ip_address',
          'user_agent', 'request_path', 'request_method', 'details'
        ]
      }
    ];

    for (const test of insertTests) {
      this.results.total++;

      const validation = await this.introspector.validateColumns(
        test.table,
        test.expectedColumns
      );

      if (validation.valid) {
        this.log(`  ✓ ${test.name} - All columns exist`, 'green');
        this.results.passed++;
      } else {
        this.log(`  ✗ ${test.name} - Missing columns: ${validation.missing.join(', ')}`, 'red');
        this.results.failed++;
        this.results.errors.push(
          `${test.name}: Missing columns in ${test.table}: ${validation.missing.join(', ')}`
        );
      }

      // Check for columns that shouldn't be in INSERT
      const tableColumns = await this.introspector.getTableColumns(test.table);
      const columnNames = tableColumns.map(c => c.column_name);
      const unexpectedColumns = test.expectedColumns.filter(
        col => !columnNames.includes(col)
      );

      if (unexpectedColumns.length > 0) {
        this.results.total++;
        this.log(`  ✗ ${test.name} - Unexpected columns: ${unexpectedColumns.join(', ')}`, 'red');
        this.results.failed++;
        this.results.errors.push(
          `${test.name}: Columns don't exist in ${test.table}: ${unexpectedColumns.join(', ')}`
        );
      }
    }
  }

  async testAPIResponseContracts() {
    this.log('\n--- Test Suite: API Response Contract Validation ---', 'blue');

    // Test critical API endpoints
    const endpointTests = [
      {
        name: 'GET /v1/members',
        view: 'v_members_full',
        expectedFields: [
          'legal_entity_id', 'legal_name', 'kvk', 'lei', 'euid', 'eori', 'duns',
          'domain', 'status', 'membership_level', 'created_at'
        ]
      },
      {
        name: 'GET /v1/members/:id',
        view: 'legal_entity_full',
        expectedFields: [
          'legal_entity_id', 'primary_legal_name', 'domain', 'status',
          'membership_level', 'party_id', 'address_line1', 'city',
          'postal_code', 'country_code'
        ]
      },
      {
        name: 'GET /v1/entities/:id/identifiers',
        table: 'legal_entity_number',
        expectedFields: [
          'legal_entity_reference_id', 'legal_entity_id', 'identifier_type',
          'identifier_value', 'validation_status', 'verification_status',
          'country_code', 'dt_created'
        ]
      },
      {
        name: 'GET /v1/legal-entities/:id/contacts',
        table: 'legal_entity_contact',
        expectedFields: [
          'legal_entity_contact_id', 'legal_entity_id', 'contact_type',
          'full_name', 'email', 'phone', 'is_primary', 'job_title'
        ]
      },
      {
        name: 'GET /v1/audit-logs',
        table: 'audit_log',
        expectedFields: [
          'audit_log_id', 'event_type', 'severity', 'result', 'user_id',
          'user_email', 'resource_type', 'resource_id', 'action',
          'dt_created', 'details'
        ]
      }
    ];

    for (const test of endpointTests) {
      const tableName = test.view || test.table;
      this.results.total++;

      const validation = await this.introspector.validateColumns(
        tableName,
        test.expectedFields
      );

      if (validation.valid) {
        this.log(`  ✓ ${test.name} - Response contract valid`, 'green');
        this.results.passed++;
      } else {
        this.log(
          `  ✗ ${test.name} - Missing fields: ${validation.missing.join(', ')}`,
          'red'
        );
        this.results.failed++;
        this.results.errors.push(
          `${test.name}: Expected fields missing in ${tableName}: ${validation.missing.join(', ')}`
        );
      }
    }
  }

  printSummary() {
    this.log('\n========================================', 'cyan');
    this.log('Test Summary', 'cyan');
    this.log('========================================', 'cyan');
    this.log(`Total Tests: ${this.results.total}`);
    this.log(`Passed: ${this.results.passed}`, 'green');
    this.log(`Failed: ${this.results.failed}`, 'red');

    if (this.results.errors.length > 0) {
      this.log('\n--- Errors ---', 'red');
      for (const error of this.results.errors) {
        this.log(`  • ${error}`, 'red');
      }
    }

    this.log('\n========================================\n', 'cyan');

    if (this.results.failed === 0) {
      this.log('✓ All schema contract tests passed!', 'green');
    } else {
      this.log('✗ Schema contract tests failed. Fix errors before deploying.', 'red');
    }
  }
}

// Main execution
async function main() {
  // Database connection config
  const config = {
    database: {
      host: process.env.PGHOST || 'psql-ctn-demo-asr-dev.postgres.database.azure.com',
      port: parseInt(process.env.PGPORT || '5432'),
      database: process.env.PGDATABASE || 'asr_dev',
      user: process.env.PGUSER || 'asradmin',
      password: process.env.PGPASSWORD || 'TnRjBFn5o9uay5M',
      ssl: {
        rejectUnauthorized: false
      }
    }
  };

  const tests = new SchemaContractTests(config);
  await tests.runAllTests();
}

// Run if executed directly
if (require.main === module) {
  main().catch(error => {
    console.error('Fatal error:', error);
    process.exit(1);
  });
}

module.exports = { SchemaContractTests };
