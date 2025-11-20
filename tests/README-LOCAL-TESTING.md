# Local Testing Guide

This guide explains how to run all tests against **local** or **deployed** environments using environment variables.

## Overview

All test configurations support environment variable overrides:
- **API Tests (curl/Node.js)**: Use `API_URL` to target Container Apps
- **E2E Tests (Playwright)**: Use `PLAYWRIGHT_BASE_URL` to target portals

## Environment Variables

### API Tests (tests/api/deployment/)

```bash
# Target local Express server
export API_URL=http://localhost:8080/api/v1

# Target deployed Container App
export API_URL=https://ca-ctn-asr-api-dev.calmriver-700a8c55.westeurope.azurecontainerapps.io/api/v1

# Run tests
cd tests/api/deployment
npm test
```

### Playwright E2E Tests

#### Admin Portal

```bash
# Target local dev server
export PLAYWRIGHT_BASE_URL=http://localhost:3000

# Target deployed Static Web App (direct)
export PLAYWRIGHT_BASE_URL=https://calm-tree-03352ba03.1.azurestaticapps.net

# Target Front Door (with WAF)
export PLAYWRIGHT_BASE_URL=https://admin-ctn-dev-gma8fnethbetbjgj.z02.azurefd.net

# Run tests
cd admin-portal
npm run test:e2e
```

#### Member Portal

```bash
# Target local dev server
export PLAYWRIGHT_BASE_URL=http://localhost:3001

# Target deployed Static Web App (direct)
export PLAYWRIGHT_BASE_URL=https://calm-pebble-043b2db03.1.azurestaticapps.net

# Target Front Door (with WAF)
export PLAYWRIGHT_BASE_URL=https://portal-ctn-dev-fdb5cpeagdendtck.z02.azurefd.net

# Run tests
cd member-portal
npm run test:e2e
```

## Common Workflows

### 1. Full Local Testing (Development)

```bash
# Terminal 1: Start API
cd api
npm start  # Runs on http://localhost:8080

# Terminal 2: Start Admin Portal
cd admin-portal
npm start  # Runs on http://localhost:3000

# Terminal 3: Start Member Portal
cd member-portal
npm start  # Runs on http://localhost:3001

# Terminal 4: Run API tests against local
cd tests/api/deployment
export API_URL=http://localhost:8080/api/v1
npm test

# Terminal 5: Run E2E tests against local
cd admin-portal
export PLAYWRIGHT_BASE_URL=http://localhost:3000
npm run test:e2e
```

### 2. Hybrid Testing (Local Portal + Deployed API)

```bash
# Terminal 1: Start Admin Portal locally
cd admin-portal
npm start  # Runs on http://localhost:3000
# Ensure .env has: VITE_API_URL=https://ca-ctn-asr-api-dev.calmriver-700a8c55.westeurope.azurecontainerapps.io/api/v1

# Terminal 2: Run E2E tests against local portal (which calls deployed API)
cd admin-portal
export PLAYWRIGHT_BASE_URL=http://localhost:3000
npm run test:e2e
```

### 3. Full Deployed Testing (Post-Deployment Verification)

```bash
# Test deployed API
cd tests/api/deployment
export API_URL=https://ca-ctn-asr-api-dev.calmriver-700a8c55.westeurope.azurecontainerapps.io/api/v1
npm test

# Test deployed Admin Portal
cd admin-portal
export PLAYWRIGHT_BASE_URL=https://calm-tree-03352ba03.1.azurestaticapps.net
npm run test:e2e

# Test deployed Member Portal
cd member-portal
export PLAYWRIGHT_BASE_URL=https://calm-pebble-043b2db03.1.azurestaticapps.net
npm run test:e2e
```

## Configuration Files

### API Tests
- **Config**: `tests/api/deployment/config.js`
- **Default**: Container Apps dev environment
- **Override**: `API_URL` environment variable

### Playwright Tests
- **Admin Config**: `admin-portal/playwright.config.ts`
- **Member Config**: `member-portal/playwright.config.ts`
- **Default**: Static Web App direct URLs
- **Override**: `PLAYWRIGHT_BASE_URL` environment variable

## Using .env Files

Instead of exporting environment variables manually, you can create `.env` files:

### admin-portal/.env
```bash
VITE_API_URL=http://localhost:8080/api/v1
PLAYWRIGHT_BASE_URL=http://localhost:3000
```

### member-portal/.env
```bash
VITE_API_BASE_URL=http://localhost:8080/api/v1
PLAYWRIGHT_BASE_URL=http://localhost:3001
```

### tests/api/deployment/.env (if you create one)
```bash
API_URL=http://localhost:8080/api/v1
E2E_TEST_USER_PASSWORD=your-test-password
```

**Note**: `.env` files are gitignored. Use `.env.example` as a template.

## Troubleshooting

### Tests fail with connection errors
- **Local**: Ensure services are running (`npm start`)
- **Deployed**: Check Container App status: `az containerapp show --name ca-ctn-asr-api-dev --resource-group rg-ctn-demo-dev`

### Authentication errors in E2E tests
- Verify auth state exists: `ls -la admin-portal/playwright/.auth/user.json`
- Re-authenticate if needed (check Playwright global-setup)

### API tests return 404
- **Local**: Verify Express routes in `api/src/routes.ts`
- **Deployed**: Check latest Container App revision is active

### Environment variable not picked up
- Playwright: Ensure `dotenv.config()` is at top of `playwright.config.ts`
- API tests: Check `config.js` uses `process.env.API_URL`
- Try explicit export: `export PLAYWRIGHT_BASE_URL=...`

## CI/CD Pipeline Usage

Azure DevOps pipelines set environment variables automatically:
- `API_URL`: Set to deployed Container App FQDN
- `PLAYWRIGHT_BASE_URL`: Set to deployed Static Web App URL

See `.azure-pipelines/*.yml` for pipeline-specific configurations.
