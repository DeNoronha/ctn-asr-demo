# CTN ASR Test Suite

This directory contains the **centralized test infrastructure** for the CTN Association Register system.

**Last Updated**: November 19, 2025

---

## Directory Structure

```
tests/
├── api/                              # Backend API tests
│   ├── unit/                         # Jest unit tests (TypeScript)
│   │   ├── middleware/               # Middleware unit tests
│   │   ├── utils/                    # Utility function tests
│   │   ├── validators/               # Validator tests
│   │   └── setup.ts                  # Jest setup file
│   ├── integration/                  # API integration tests (JavaScript)
│   │   ├── member-portal/            # Member portal API tests
│   │   ├── run-api-tests.js          # Test runner
│   │   ├── test-config.js            # Configuration
│   │   └── *.test.js                 # Integration test files
│   └── curl/                         # Bash curl scripts (deployment verification)
│       ├── scripts/                  # Curl test scripts
│       └── results/                  # Test reports
│
├── admin-portal/
│   ├── e2e/                          # Playwright E2E tests
│   │   ├── admin-portal/             # Admin-specific flows
│   │   └── *.spec.ts                 # E2E test files
│   └── unit/                         # Vitest component tests
│       └── *.test.tsx                # Component test files
│
├── member-portal/
│   ├── e2e/                          # Playwright E2E tests
│   │   ├── member-portal/            # Member-specific flows
│   │   └── *.spec.ts                 # E2E test files
│   └── unit/                         # (Future: component tests)
│
├── shared/
│   └── auth.setup.ts                 # Shared authentication setup
│
├── results/                          # All test results (gitignored)
│   ├── playwright/
│   │   ├── admin-portal/
│   │   └── member-portal/
│   ├── jest/
│   │   └── api/
│   └── curl/
│
└── README.md                         # This file
```

---

## Test Types

### 1. API Unit Tests (Jest)

**Location**: `tests/api/unit/`
**Framework**: Jest with ts-jest
**Run from**: `api/` directory

```bash
cd api

# Run all unit tests
npm test

# Run with coverage
npm run test:coverage

# Watch mode
npm run test:watch

# Verbose output
npm run test:verbose
```

**Test files**:
- `middleware/corsValidator.test.ts` - CORS validation
- `middleware/composeMiddleware.test.ts` - Middleware composition
- `utils/validators.test.ts` - Input validation
- `utils/errors.test.ts` - Error handling
- `utils/csrf.test.ts` - CSRF protection
- `utils/database.test.ts` - Database utilities
- `utils/circuitBreaker.test.ts` - Circuit breaker pattern
- `utils/pseudonymization.test.ts` - Data privacy
- `validators/m2mClientValidators.test.ts` - M2M authentication

### 2. API Integration Tests (Node.js)

**Location**: `tests/api/integration/`
**Framework**: Custom test runner
**Run from**: `api/` directory

```bash
cd api

# Run all integration tests
npm run test:api

# Run in CI mode
npm run test:api:ci
```

**Test files**:
- `members.test.js` - Member CRUD operations
- `legal-entities.test.js` - Legal entity operations
- `contacts.test.js` - Contact management
- `identifiers.test.js` - Identifier management
- `endpoints.test.js` - API endpoint testing
- `kvk.test.js` - KvK registry integration
- `audit.test.js` - Audit logging

**Member Portal specific**:
- `member-portal/member-profile.test.js`
- `member-portal/member-contacts.test.js`
- `member-portal/member-endpoints.test.js`
- `member-portal/member-authorization.test.js`

### 3. Admin Portal E2E Tests (Playwright)

**Location**: `tests/admin-portal/e2e/`
**Framework**: Playwright
**Run from**: `admin-portal/` directory

```bash
cd admin-portal

# Run all E2E tests
npm run test:e2e

# Run with browser visible
npm run test:e2e:headed

# Debug mode
npm run test:e2e:debug

# Playwright UI
npm run test:e2e:ui

# View HTML report
npm run test:e2e:report
```

**Test categories**:
- Authentication flows
- Critical user workflows
- Security header validation
- Accessibility (WCAG 2.1 AA)
- Grid/pagination
- Identifier CRUD

### 4. Admin Portal Unit Tests (Vitest)

**Location**: `tests/admin-portal/unit/`
**Framework**: Vitest
**Run from**: `admin-portal/` directory

```bash
cd admin-portal

# Run unit tests
npm test

# Watch mode
npm run test:ui

# Coverage
npm run test:coverage
```

**Component tests**:
- `MantineDataTable.test.tsx`
- `MantineModal.test.tsx`
- `MantineNotifications.test.tsx`
- `MantineSelect.test.tsx`
- `MantineStepper.test.tsx`

### 5. Member Portal E2E Tests (Playwright)

**Location**: `tests/member-portal/e2e/`
**Framework**: Playwright
**Run from**: `member-portal/` directory

```bash
cd member-portal

# Run all E2E tests
npm run test:e2e

# Run with browser visible
npm run test:e2e:headed

# Debug mode
npm run test:e2e:debug

# View report
npm run test:e2e:report
```

**Test categories**:
- Authentication
- Dashboard
- Profile management
- Contact management
- Endpoint configuration
- API access management
- DNS verification
- Accessibility
- Responsive design

### 6. Deployment Verification Tests (Node.js)

**Location**: `tests/api/deployment/`
**Framework**: Node.js (converted from bash curl scripts)
**Run from**: `api/` directory

```bash
cd api

# Run all deployment tests
npm run test:deploy

# Quick health check only
npm run test:deploy:quick

# Specific test suites
npm run test:deploy:health     # Health & endpoints
npm run test:deploy:security   # Security tests

# Direct execution
node ../tests/api/deployment/run-all.js --help
node ../tests/api/deployment/health.test.js
```

**Test suites**:
- `health.test.js` - Health, version, core endpoints
- `contacts.test.js` - Contact CRUD operations
- `identifiers.test.js` - Identifier CRUD operations
- `security.test.js` - IDOR, auth, input validation

### 7. Legacy Curl Scripts (Bash)

**Location**: `tests/api/curl/`
**Purpose**: Reference scripts (being migrated to Node.js)

```bash
# From tests/api/curl/
./get-token.sh                          # Acquire Azure AD token
./test-existing-endpoints.sh            # Verify API health
```

**Note**: These bash scripts are being replaced by the Node.js deployment tests above.

---

## Test User

**E2E Test Account (MFA Excluded)**:
- **Email**: test-e2@denoronha.consulting
- **Object ID**: 7e093589-f654-4e53-9522-898995d1201b
- **Role**: SystemAdmin

**Credentials**: See `.credentials` file (gitignored)

Set environment variables:
```bash
export AZURE_AD_TEST_USERNAME="test-e2@denoronha.consulting"
export AZURE_AD_TEST_PASSWORD="<from .credentials>"
```

---

## Authentication State

Playwright tests use saved authentication state to avoid logging in for each test.

**Auth state locations**:
- Admin Portal: `admin-portal/playwright/.auth/user.json`
- Member Portal: `member-portal/playwright/.auth/user.json`

**Refresh auth** (when tests fail due to expired tokens):
```bash
cd admin-portal
npm run test:e2e:auth
```

---

## Test Results

All test results are centralized in `tests/results/`:

| Test Type | Results Location |
|-----------|-----------------|
| Playwright (Admin) | `tests/results/playwright/admin-portal/` |
| Playwright (Member) | `tests/results/playwright/member-portal/` |
| Jest (API) | `tests/results/jest/api/` |
| Vitest (Admin) | `tests/results/vitest/admin-portal/` |
| Curl | `tests/api/curl/results/` |

---

## Test Execution Strategy

**IMPORTANT**: Always test API before UI.

### Recommended Order

1. **API Unit Tests** - Catch logic errors early
   ```bash
   cd api && npm test
   ```

2. **API Integration Tests** - Verify endpoints work
   ```bash
   cd api && npm run test:api
   ```

3. **Portal E2E Tests** - Verify UI after API confirms working
   ```bash
   cd admin-portal && npm run test:e2e
   cd member-portal && npm run test:e2e
   ```

### Quick Deployment Verification

After deployment, run curl tests first:
```bash
cd tests/api/curl
./test-existing-endpoints.sh
```

---

## Configuration Files

| Config | Location | Purpose |
|--------|----------|---------|
| Jest (API) | `api/jest.config.js` | API unit test config |
| Vitest (Admin) | `admin-portal/vitest.config.ts` | Admin unit test config |
| Playwright (Admin) | `admin-portal/playwright.config.ts` | Admin E2E config |
| Playwright (Member) | `member-portal/playwright.config.ts` | Member E2E config |

---

## CI/CD Integration

### Azure DevOps Pipeline

```yaml
# Unit tests
- script: cd api && npm test
  displayName: 'Run API unit tests'

# Integration tests
- script: cd api && npm run test:api:ci
  displayName: 'Run API integration tests'

# E2E tests (after deployment)
- script: |
    cd admin-portal
    npx playwright install --with-deps
    npm run test:e2e
  displayName: 'Run Admin Portal E2E tests'
```

---

## Common Issues

### Tests fail with 401 Unauthorized
1. Refresh auth state: `npm run test:e2e:auth`
2. Check token hasn't expired (1-hour lifetime)

### Tests fail with 404 Not Found
1. Verify API deployment succeeded
2. Run curl tests to isolate: `./test-existing-endpoints.sh`

### Jest can't find test files
1. Verify tests are in `tests/api/unit/`
2. Check `jest.config.js` roots configuration

### Playwright can't find tests
1. Verify tests are in `tests/{portal}/e2e/`
2. Check `playwright.config.ts` testDir setting

---

## Adding New Tests

### Add API Unit Test
1. Create `tests/api/unit/{category}/my-feature.test.ts`
2. Import from `../../api/src/...` (adjust path as needed)
3. Run: `cd api && npm test`

### Add API Integration Test
1. Create `tests/api/integration/my-feature.test.js`
2. Follow pattern in existing `.test.js` files
3. Run: `cd api && npm run test:api`

### Add E2E Test
1. Create `tests/{portal}/e2e/my-feature.spec.ts`
2. Use Playwright test syntax
3. Run: `cd {portal} && npm run test:e2e`

---

## Related Documentation

- [CLAUDE.md](/CLAUDE.md) - Project guidelines
- [docs/LESSONS_LEARNED.md](/docs/LESSONS_LEARNED.md) - Test-related lessons
- [api/README.md](/api/README.md) - API documentation
