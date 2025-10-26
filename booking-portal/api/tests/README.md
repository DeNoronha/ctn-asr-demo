# CTN DocuFlow - API Test Suite

Comprehensive API testing suite for the CTN DocuFlow booking portal backend.

## Overview

This test suite follows the **API-first testing approach**: test API endpoints with curl BEFORE testing UI with Playwright. This separation of concerns isolates issues faster and saves debugging time.

## Test Suites

### 1. Authentication & Security Tests
**File**: `auth-smoke-test.sh`

Tests authentication and authorization on API endpoints:
- Unauthenticated requests (should return 401)
- Invalid JWT tokens (should return 401)
- Malformed tokens (should return 401)
- JWKS endpoint accessibility
- Azure AD discovery endpoint

**Usage**:
```bash
./auth-smoke-test.sh
```

---

### 2. API Diagnostics & Health Tests
**File**: `api-diagnostics-test.sh`

Tests diagnostic and health check endpoints:
- `/api/v1/diagnostic` endpoint
- API root response
- CORS preflight requests
- Response time checks
- Production URL accessibility

**Usage**:
```bash
./api-diagnostics-test.sh
```

**Expected Output**:
- Environment variables status
- pdf-parse module status
- Anthropic SDK status
- Claude API connectivity
- Cosmos DB connection status

---

### 3. Bookings API Tests
**File**: `api-bookings-test.sh`

Tests bookings-related API endpoints:
- GET /api/v1/bookings (list all bookings)
- GET /api/v1/bookings/{id} (get booking by ID)
- Invalid ID handling
- Authentication requirements

**Usage**:
```bash
# Without authentication (limited tests)
./api-bookings-test.sh

# With authentication (full test coverage)
export ACCESS_TOKEN='your_jwt_token'
./api-bookings-test.sh
```

---

### 4. Document Upload API Tests
**File**: `api-upload-test.sh`

Tests document upload and processing endpoints:
- POST /api/v1/upload (document upload)
- GET /api/v1/document-sas-url/{id} (get SAS URL)
- File size validation
- Content type validation
- Invalid file handling

**Usage**:
```bash
# Without authentication
./api-upload-test.sh

# With authentication (full tests including actual uploads)
export ACCESS_TOKEN='your_jwt_token'
./api-upload-test.sh
```

**Note**: Creates temporary test PDF files automatically.

---

### 5. Booking Validation API Tests
**File**: `api-validation-test.sh`

Tests booking validation and update endpoints:
- PUT /api/v1/validate/{id} (validate/update booking)
- Empty body validation
- Invalid JSON handling
- Multi-leg journey data
- Missing required fields validation

**Usage**:
```bash
# Without authentication
./api-validation-test.sh

# With authentication
export ACCESS_TOKEN='your_jwt_token'
./api-validation-test.sh
```

---

## Master Test Runner

**File**: `run-all-api-tests.sh`

Runs all test suites in sequence and generates a comprehensive report.

**Usage**:
```bash
# Run all tests (unauthenticated)
./run-all-api-tests.sh

# Run all tests with authentication
export ACCESS_TOKEN='your_jwt_token'
./run-all-api-tests.sh
```

**Output**:
- Total test suites executed
- Pass/fail status for each suite
- Overall success rate
- Duration
- Troubleshooting guidance

---

## Getting Authentication Token

### Option 1: From Browser (Recommended)
1. Open the booking portal: https://kind-coast-017153103.1.azurestaticapps.net
2. Open browser DevTools (F12)
3. Go to Application/Storage → Local Storage
4. Look for authentication tokens or use Network tab to capture Authorization header
5. Copy the JWT token (starts with `eyJ...`)

### Option 2: Azure CLI
```bash
az account get-access-token --resource api://d3037c11-a541-4f21-8862-8079137a0cde
```

### Option 3: Use Existing Token Script
```bash
./auth-with-token-test.sh
# Follow prompts to enter token
```

---

## Configuration

Tests use environment variables for configuration:

```bash
# API Base URL (default: production)
export API_BASE_URL="https://func-ctn-booking-prod.azurewebsites.net"

# Azure AD Configuration
export CLIENT_ID="d3037c11-a541-4f21-8862-8079137a0cde"
export TENANT_ID="598664e7-725c-4daa-bd1f-89c4ada717ff"

# Authentication Token (for authenticated tests)
export ACCESS_TOKEN="eyJ..."
```

---

## Test Results

### Current Status (October 23, 2025)

| Suite | Tests | Pass | Fail | Warnings | Status |
|-------|-------|------|------|----------|--------|
| Authentication | 7 | 6 | 1 | 0 | ⚠ FAIL |
| Diagnostics | 6 | 6 | 0 | 1 | ✅ PASS |
| Bookings | 2 | 1 | 1 | 1 | ❌ FAIL |
| Upload | 3 | 3 | 0 | 2 | ✅ PASS |
| Validation | 1 | 1 | 0 | 1 | ✅ PASS |

**Overall**: 60% success rate (3/5 suites passed)

### Critical Issues
1. **SECURITY**: `/api/v1/bookings` returns data WITHOUT authentication
2. **MISSING MODULE**: `pdf-parse` not deployed to production
3. **MISSING ENDPOINTS**: `/upload`, `/validate`, `/document-sas-url` return 404

---

## Troubleshooting

### Issue: Tests fail with connection errors
**Solution**: Check if API is deployed and responding:
```bash
curl -I https://func-ctn-booking-prod.azurewebsites.net/api/v1/diagnostic
```

### Issue: Authentication tests fail
**Solution**: Verify Azure AD configuration:
```bash
curl -s https://login.microsoftonline.com/598664e7-725c-4daa-bd1f-89c4ada717ff/v2.0/.well-known/openid-configuration | jq .
```

### Issue: Slow response times
**Solution**: Check Application Insights for performance metrics:
https://portal.azure.com/#@/resource/.../microsoft.insights/components/appi-ctn-demo-asr-dev

### Issue: 404 errors on endpoints
**Solution**: Verify function app deployment:
```bash
func azure functionapp list-functions func-ctn-booking-prod
```

---

## Dependencies

Tests require:
- `bash` (v4.0+)
- `curl` (v7.0+)
- `jq` (optional, for JSON pretty-printing)

**Install jq** (optional but recommended):
```bash
# macOS
brew install jq

# Ubuntu/Debian
sudo apt-get install jq

# Windows (with Chocolatey)
choco install jq
```

---

## CI/CD Integration

To integrate these tests into Azure DevOps pipeline:

```yaml
# azure-pipelines.yml
- stage: APITests
  jobs:
  - job: RunAPITests
    pool:
      vmImage: 'ubuntu-latest'
    steps:
    - bash: |
        cd booking-portal/api/tests
        chmod +x *.sh
        ./run-all-api-tests.sh
      displayName: 'Run API Test Suite'
      env:
        API_BASE_URL: $(API_BASE_URL)
        ACCESS_TOKEN: $(ACCESS_TOKEN)
```

---

## Best Practices

1. **Always test API first** before testing UI
2. **Run tests after deployment** to verify changes
3. **Check diagnostics endpoint** before debugging issues
4. **Use authentication tokens** for complete test coverage
5. **Monitor response times** for performance regression
6. **Document test failures** with screenshots/logs

---

## Related Documentation

- **Test Coverage Report**: `/booking-portal/TEST_COVERAGE_REPORT.md`
- **E2E Tests**: `/booking-portal/e2e/`
- **Playwright Config**: `/booking-portal/playwright.config.ts`
- **Project Guide**: `/CLAUDE.md`

---

## Support

For issues or questions:
- Check test output for troubleshooting guidance
- Review Application Insights logs
- Check Azure Function logs: `func azure functionapp logstream func-ctn-booking-prod`
- Review Azure DevOps pipeline: https://dev.azure.com/ctn-demo/ASR/_build

---

**Last Updated**: October 23, 2025
**Test Suite Version**: 1.0.0
**Maintainer**: Test Engineer Agent (Claude)
