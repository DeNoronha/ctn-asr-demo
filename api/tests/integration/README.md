# Schema-API Contract Integration Tests

**Purpose:** Prevent database schema mismatches with API and frontend code BEFORE deployment.

## Problem Statement

We repeatedly encountered production issues where:
- API queries reference non-existent database columns → 500 errors
- Frontend expects fields that APIs don't return → broken UI
- INSERT statements have parameter count mismatches → database errors
- Database schema changes aren't reflected in code → runtime failures

**Recent Issues Fixed:**
1. Member registration had 20 placeholders but 19 values
2. Audit log used wrong column names (entity_id vs resource_id)
3. Members table insert was missing in approval flow
4. Identifier fields (EUID, EORI) were missing from API responses
5. EURI was in schema but not a real identifier (just removed)

## Solution

**Schema Contract Tests** run BEFORE every build to catch these issues at compile-time, not runtime.

## Test Suites

### 1. Database Schema Validation
Verifies required tables and views exist:
- Tables: `members`, `legal_entity`, `legal_entity_contact`, `legal_entity_number`, etc.
- Views: `v_members_full`, `legal_entity_full`, `v_identifiers_with_type`

### 2. API Query Validation
Parses SQL queries from `src/routes.ts` and validates:
- All SELECT columns exist in the target table/view
- Column names are spelled correctly
- Views are used instead of complex joins

### 3. INSERT Statement Validation
Validates INSERT statements:
- Column count matches parameter count ($1, $2, $3...)
- All columns exist in target table
- No columns are missing or misspelled

Tested operations:
- Member registration INSERT (members table)
- Legal entity INSERT (legal_entity table)
- Identifier INSERT (legal_entity_number table)
- Audit log INSERT (audit_log table)

### 4. API Response Contract Validation
Validates API endpoints return expected fields:
- `GET /v1/members` → Returns kvk, lei, euid, eori, duns
- `GET /v1/members/:id` → Returns complete member details
- `GET /v1/entities/:id/identifiers` → Returns all identifier fields
- `GET /v1/legal-entities/:id/contacts` → Returns contact details
- `GET /v1/audit-logs` → Returns audit log fields

## Usage

### Run Tests Manually

```bash
cd api

# Run schema contract tests
npm run test:schema-contracts

# Skip tests (for local development only)
npm run test:schema-contracts:skip
```

### Run Tests in CI/CD

Tests automatically run BEFORE build via `prebuild` hook:

```bash
npm run build  # Automatically runs schema tests first
```

**CI Pipeline Integration:**
```yaml
- script: |
    cd api
    npm run build  # Fails if schema tests fail
  displayName: 'Build API (with schema tests)'
```

### Environment Variables

Tests use PostgreSQL connection from environment:

```bash
export PGHOST=psql-ctn-demo-asr-dev.postgres.database.azure.com
export PGPORT=5432
export PGDATABASE=asr_dev
export PGUSER=asradmin
export PGPASSWORD=TnRjBFn5o9uay5M
```

**Defaults:** If not set, tests use hardcoded dev database credentials.

## Test Output

### Success Example

```
========================================
Schema-API Contract Tests
========================================

✓ Connected to database

--- Test Suite: Database Schema Validation ---
  ✓ Table exists: members
  ✓ Table exists: legal_entity
  ✓ View exists: v_members_full
  ✓ View exists: legal_entity_full

--- Test Suite: API Query Validation ---
  Found 18 SQL queries in routes.ts

  ✓ Line 91: v_members_full.legal_entity_id
  ✓ Line 91: v_members_full.kvk
  ✓ Line 91: v_members_full.lei

--- Test Suite: INSERT Statement Validation ---
  ✓ Member registration INSERT - All columns exist
  ✓ Audit log INSERT - All columns exist

--- Test Suite: API Response Contract Validation ---
  ✓ GET /v1/members - Response contract valid
  ✓ GET /v1/members/:id - Response contract valid

========================================
Test Summary
========================================
Total Tests: 42
Passed: 42
Failed: 0

✓ All schema contract tests passed!
```

### Failure Example

```
========================================
Schema-API Contract Tests
========================================

✓ Connected to database

--- Test Suite: API Query Validation ---
  ✗ Line 91: v_members_full.euri NOT FOUND

--- Test Suite: INSERT Statement Validation ---
  ✗ Audit log INSERT - Missing columns: resource_id

========================================
Test Summary
========================================
Total Tests: 42
Passed: 40
Failed: 2

--- Errors ---
  • Line 91: Column "euri" does not exist in view "v_members_full"
  • Audit log INSERT: Missing columns in audit_log: resource_id

✗ Schema contract tests failed. Fix errors before deploying.
```

**Exit Code:** Tests exit with code `1` if any test fails, stopping the build.

## Architecture

### Components

1. **schema-introspection.js** - Database schema queries
   - Connects to PostgreSQL
   - Queries `information_schema.columns`
   - Validates table/view columns exist
   - Checks data types and foreign keys

2. **query-parser.js** - SQL query parsing
   - Extracts columns from SELECT statements
   - Parses INSERT parameter counts
   - Handles PostgreSQL functions (COALESCE, etc.)
   - Extracts queries from TypeScript files

3. **schema-contract-tests.js** - Main test orchestrator
   - Runs all test suites
   - Colorized output
   - Exit code for CI/CD integration
   - Comprehensive error reporting

### Data Flow

```
┌─────────────────────────────────────────────────────────────┐
│ CI/CD Pipeline                                              │
│  1. npm run build                                           │
│  2. prebuild hook → npm run test:schema-contracts           │
└──────────────────────┬──────────────────────────────────────┘
                       │
                       ↓
┌─────────────────────────────────────────────────────────────┐
│ schema-contract-tests.js (Main Orchestrator)               │
│  - Connects to PostgreSQL database                          │
│  - Runs 4 test suites                                       │
│  - Aggregates results                                       │
│  - Exits with code 0 (pass) or 1 (fail)                    │
└──────────────┬────────────────────┬─────────────────────────┘
               │                    │
               ↓                    ↓
┌─────────────────────────┐  ┌─────────────────────────┐
│ schema-introspection.js │  │ query-parser.js         │
│  - Query DB schema      │  │  - Parse SELECT columns │
│  - Validate columns     │  │  - Parse INSERT params  │
│  - Check foreign keys   │  │  - Extract SQL from TS  │
└─────────────────────────┘  └─────────────────────────┘
```

## Adding New Tests

### Add a New Endpoint Test

Edit `schema-contract-tests.js`:

```javascript
// In testAPIResponseContracts() method
const endpointTests = [
  {
    name: 'GET /v1/your-endpoint',
    table: 'your_table',
    expectedFields: [
      'field1', 'field2', 'field3'
    ]
  },
  // ... existing tests
];
```

### Add a New INSERT Test

Edit `schema-contract-tests.js`:

```javascript
// In testInsertStatements() method
const insertTests = [
  {
    name: 'Your operation INSERT',
    file: 'src/functions-legacy/YourFile.ts',
    table: 'your_table',
    expectedColumns: [
      'column1', 'column2', 'column3'
    ]
  },
  // ... existing tests
];
```

## Troubleshooting

### Tests fail with "connection refused"

**Cause:** Can't connect to PostgreSQL database.

**Solution:**
1. Check network connectivity to Azure
2. Verify firewall allows your IP
3. Confirm database credentials in environment variables

### Tests fail with "column not found"

**Cause:** API queries reference non-existent columns.

**Solution:**
1. Check `database/asr_dev.sql` for correct column names
2. Update API queries to match schema
3. Run migration if column should exist

### Tests fail with "parameter count mismatch"

**Cause:** INSERT has wrong number of parameters.

**Solution:**
1. Count columns in INSERT statement
2. Count $1, $2, $3... parameters
3. Add/remove parameters to match column count

### False positives (tests fail but code is correct)

**Cause:** Test expectations outdated.

**Solution:**
1. Review schema changes in `database/asr_dev.sql`
2. Update test expectations in `schema-contract-tests.js`
3. Ensure views are refreshed (DROP/CREATE VIEW)

## CI/CD Integration

### Azure DevOps Pipeline

```yaml
- task: Npm@1
  displayName: 'Build API with Schema Tests'
  inputs:
    command: 'custom'
    workingDir: 'api'
    customCommand: 'run build'
  env:
    PGHOST: $(POSTGRES_HOST)
    PGPORT: $(POSTGRES_PORT)
    PGDATABASE: $(POSTGRES_DATABASE)
    PGUSER: $(POSTGRES_USER)
    PGPASSWORD: $(POSTGRES_PASSWORD)
```

**Required Pipeline Variables:**
- `POSTGRES_HOST` - Database hostname
- `POSTGRES_PORT` - Database port (5432)
- `POSTGRES_DATABASE` - Database name (asr_dev)
- `POSTGRES_USER` - Database username
- `POSTGRES_PASSWORD` - Database password (secret)

### GitHub Actions

```yaml
- name: Build API with Schema Tests
  run: |
    cd api
    npm run build
  env:
    PGHOST: ${{ secrets.POSTGRES_HOST }}
    PGPORT: 5432
    PGDATABASE: asr_dev
    PGUSER: ${{ secrets.POSTGRES_USER }}
    PGPASSWORD: ${{ secrets.POSTGRES_PASSWORD }}
```

## Benefits

1. **Catch errors at compile-time** - Not runtime in production
2. **Prevent deployment of broken code** - Build fails immediately
3. **Document API contracts** - Tests serve as living documentation
4. **Confidence in refactoring** - Schema changes caught instantly
5. **Faster debugging** - Clear error messages with line numbers

## Maintenance

### When to Update Tests

Update tests when:
- Adding new API endpoints
- Changing database schema
- Modifying API response structures
- Adding new INSERT/UPDATE operations

### Test Coverage Goals

- **100% critical endpoints** - All GET/POST/PUT endpoints tested
- **100% INSERT statements** - All data modifications validated
- **100% database views** - All views used by API validated

## Related Documentation

- [Database Schema](../../database/asr_dev.sql) - Source of truth
- [API Routes](../../src/routes.ts) - API endpoint definitions
- [CLAUDE.md](../../CLAUDE.md) - Development guidelines

## Support

**Issues:** Report in Azure DevOps or create GitHub issue

**Maintainer:** Ramon de Noronha (ramon@denoronha.consulting)

**Last Updated:** November 21, 2025
