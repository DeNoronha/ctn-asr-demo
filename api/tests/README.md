# API Test Scripts

Comprehensive curl-based test scripts for testing API CRUD operations.

## Overview

These test scripts validate the core API functionality by testing:
- **Identifier Management** - Create, read, update, delete identifiers
- **Contact Management** - Full CRUD operations for contacts
- **Address Updates** - Legal entity address modification and persistence

All scripts are designed to:
- ✅ Create test data
- ✅ Verify operations work correctly
- ✅ Clean up all test data automatically
- ✅ Restore original state when needed

## Prerequisites

### 1. Install jq (JSON processor)

**macOS:**
```bash
brew install jq
```

**Linux (Ubuntu/Debian):**
```bash
sudo apt-get update
sudo apt-get install jq
```

**Linux (RHEL/CentOS):**
```bash
sudo yum install jq
```

**Verify installation:**
```bash
jq --version
```

### 2. Get Azure AD Authentication Token

You need a valid Azure AD bearer token to run these tests.

**Option A: Use Azure CLI**
```bash
az login
TOKEN=$(az account get-access-token --resource api://your-api-client-id --query accessToken -o tsv)
export AUTH_TOKEN="$TOKEN"
```

**Option B: Get from Browser (Admin Portal)**
1. Open browser developer tools (F12)
2. Login to Admin Portal: https://calm-tree-03352ba03.1.azurestaticapps.net
3. Go to Network tab
4. Make any API request
5. Copy the Authorization header value (without "Bearer ")
6. Export: `export AUTH_TOKEN="your-token-here"`

**Token expires after 1 hour** - you'll need to refresh it.

## Usage

### Quick Start - Run All Tests (Recommended)

Use the test runner to execute all tests in sequence:

```bash
# Set your auth token
export AUTH_TOKEN="your-azure-ad-token-here"

# Run all tests with comprehensive reporting
./run-all-tests.sh
```

**Output:**
```
========================================
API Test Suite - Running All Tests
========================================
Started at: Wed Oct 15 22:30:00 CEST 2025

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
Running: Identifier CRUD Test
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
[... test output ...]
✓ Identifier CRUD Test: PASSED

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
Running: Contact CRUD Test
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
[... test output ...]
✓ Contact CRUD Test: PASSED

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
Running: Address Update Test
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
[... test output ...]
✓ Address Update Test: PASSED

========================================
Test Suite Summary
========================================
Completed at: Wed Oct 15 22:32:15 CEST 2025
Duration: 135s

Tests Run:    3
Tests Passed: 3
Tests Failed: 0

✓✓✓ ALL TESTS PASSED ✓✓✓

API is healthy and ready for UI testing!
```

**Alternative - Run Tests Individually:**

```bash
# Set your auth token
export AUTH_TOKEN="your-azure-ad-token-here"

# Run individual tests
./identifier-crud-test.sh
./contact-crud-test.sh
./address-update-test.sh
```

### Individual Test Scripts

#### 1. Identifier CRUD Test

Tests identifier management (KvK numbers, EUID, etc.)

```bash
export AUTH_TOKEN="your-token"
./identifier-crud-test.sh
```

**What it tests:**
- ✓ Create identifier (KvK number 12345678)
- ✓ Retrieve identifiers for entity
- ✓ Update validation status (PENDING → VALIDATED)
- ✓ Verify update persistence
- ✓ Delete identifier (cleanup)

**Expected output:**
```
========================================
Identifier CRUD Test
========================================
API URL: https://func-ctn-demo-asr-dev.azurewebsites.net/api/v1
Entity ID: fbc4bcdc-a9f9-4621-a153-c5deb6c49519

Test 1: Creating identifier (KvK number 12345678)...
✓ Created identifier (ID: abc-123-def)

Test 2: Retrieving identifiers for entity...
✓ Retrieved identifiers successfully (found 2 identifier(s))
  Created identifier is present in list

Test 3: Updating identifier validation status to VALIDATED...
✓ Updated identifier validation status to VALIDATED

Test 4: Verifying update by retrieving identifier again...
✓ Verified identifier update (status: VALIDATED)

========================================
✓ All identifier CRUD tests passed!
========================================
```

#### 2. Contact CRUD Test

Tests contact management operations.

```bash
export AUTH_TOKEN="your-token"
./contact-crud-test.sh
```

**What it tests:**
- ✓ Create contact (Test Contact)
- ✓ Retrieve contacts for legal entity
- ✓ Update email and phone number
- ✓ Verify update persistence
- ✓ Delete contact (cleanup)

**Expected output:**
```
========================================
Contact CRUD Test
========================================
API URL: https://func-ctn-demo-asr-dev.azurewebsites.net/api/v1
Entity ID: fbc4bcdc-a9f9-4621-a153-c5deb6c49519

Test 1: Creating contact for legal entity...
✓ Created contact (ID: xyz-789-abc)
  Name: Test Contact
  Email: test.contact@example.com

Test 2: Retrieving contacts for entity...
✓ Retrieved contacts successfully (found 3 contact(s))
  Created contact is present in list

Test 3: Updating contact email address...
✓ Updated contact successfully
  New email: updated.test@example.com
  New phone: +31687654321

Test 4: Verifying update by retrieving contact again...
✓ Verified contact update
  Email: updated.test@example.com
  Phone: +31687654321

========================================
✓ All contact CRUD tests passed!
========================================
```

#### 3. Address Update Test

Tests legal entity address modification.

```bash
export AUTH_TOKEN="your-token"
./address-update-test.sh
```

**What it tests:**
- ✓ Retrieve current address
- ✓ Update street address
- ✓ Verify update persistence
- ✓ Update multiple address fields
- ✓ Restore original address (cleanup)

**Expected output:**
```
========================================
Address Update Test
========================================
API URL: https://func-ctn-demo-asr-dev.azurewebsites.net/api/v1
Entity ID: fbc4bcdc-a9f9-4621-a153-c5deb6c49519

Test 1: Retrieving current legal entity address...
✓ Retrieved current address for: Test Company BV
  Street: Original Street 1
  City: Rotterdam
  Postal Code: 3011AB
  Country: Netherlands

Test 2: Updating street address to test value...
✓ Updated address successfully
  New street: 123 Test API Street

Test 3: Verifying address update persisted...
✓ Verified address update persisted
  Street: 123 Test API Street
  City: Rotterdam
  Postal Code: 3011AB
  Country: Netherlands

Test 4: Updating multiple address fields...
✓ Updated multiple fields successfully
  New street: 456 Multi-Field Test Avenue
  New postal code: 9999XX

========================================
✓ All address update tests passed!
========================================
```

## Configuration

All scripts support environment variable configuration:

```bash
# Required: Azure AD bearer token
export AUTH_TOKEN="your-token-here"

# Optional: Override API URL (defaults to production)
export API_URL="https://your-api-url.azurewebsites.net/api/v1"

# Optional: Override test entity ID (defaults to existing entity)
export ENTITY_ID="your-entity-id-here"
```

### Default Configuration

- **API URL:** `https://func-ctn-demo-asr-dev.azurewebsites.net/api/v1`
- **Test Entity:** `fbc4bcdc-a9f9-4621-a153-c5deb6c49519`
- **Auth Token:** None (must be provided)

## Cleanup Behavior

All scripts include automatic cleanup:

- **identifier-crud-test.sh:** Deletes created identifier
- **contact-crud-test.sh:** Deletes created contact
- **address-update-test.sh:** Restores original address

Cleanup runs automatically even if tests fail (using bash `trap` on EXIT).

## Error Handling

Scripts exit immediately on first error (`set -e`).

**Common errors:**

### Token Expired
```
✗ Failed to create identifier (HTTP 401)
Response: {"error": "Unauthorized"}
```
**Solution:** Refresh your auth token

### Missing jq
```
✗ Error: jq is required but not installed
  Install with: brew install jq (macOS) or apt-get install jq (Linux)
```
**Solution:** Install jq (see Prerequisites)

### API Error
```
✗ Failed to create contact (HTTP 400)
Response: {"error": "Invalid email address"}
```
**Solution:** Check API logs and request payload

### Network Error
```
curl: (6) Could not resolve host
```
**Solution:** Check internet connection and API_URL

## Troubleshooting

### Getting Help
```bash
# Run script without auth token to see usage
./identifier-crud-test.sh
```

### Verbose Output
```bash
# Add -v to curl commands for debugging
# Edit script and add -v flag to curl calls
curl -v -X GET ...
```

### Manual Cleanup
If cleanup fails, you can manually delete resources:

```bash
# Delete identifier
curl -X DELETE \
  -H "Authorization: Bearer $AUTH_TOKEN" \
  https://func-ctn-demo-asr-dev.azurewebsites.net/api/v1/identifiers/{id}

# Delete contact
curl -X DELETE \
  -H "Authorization: Bearer $AUTH_TOKEN" \
  https://func-ctn-demo-asr-dev.azurewebsites.net/api/v1/contacts/{id}
```

## CI/CD Integration

These scripts can be used in CI/CD pipelines:

### Azure DevOps Pipeline Example

```yaml
- task: Bash@3
  displayName: 'Run API Tests'
  inputs:
    targetType: 'inline'
    script: |
      # Get token from service principal
      export AUTH_TOKEN=$(az account get-access-token --resource api://$(API_CLIENT_ID) --query accessToken -o tsv)

      # Run all tests using test runner
      cd api/tests
      ./run-all-tests.sh
```

**Alternative (individual tests):**
```yaml
- task: Bash@3
  displayName: 'Run API Tests'
  inputs:
    targetType: 'inline'
    script: |
      # Get token from service principal
      export AUTH_TOKEN=$(az account get-access-token --resource api://$(API_CLIENT_ID) --query accessToken -o tsv)

      # Run tests individually
      cd api/tests
      ./identifier-crud-test.sh
      ./contact-crud-test.sh
      ./address-update-test.sh
```

### GitHub Actions Example

```yaml
- name: Run API Tests
  run: |
    export AUTH_TOKEN=${{ secrets.API_AUTH_TOKEN }}
    cd api/tests
    ./run-all-tests.sh
```

## When to Run These Tests

**Critical scenarios:**

1. ✅ **After every API deployment** - Verify CRUD operations still work
2. ✅ **Before UI testing** - If these fail, don't bother testing UI
3. ✅ **After database migrations** - Ensure schema changes don't break API
4. ✅ **After authentication changes** - Verify token flow works
5. ✅ **Before major releases** - Smoke test for core functionality

**Test order:**
```
1. Deploy API to Azure
2. Run identifier-crud-test.sh (core identifier management)
3. Run contact-crud-test.sh (contact management)
4. Run address-update-test.sh (entity updates)
5. If ALL pass → proceed to UI testing
6. If ANY fail → investigate API logs, don't proceed
```

## Success Criteria

All tests should pass with exit code 0:

```bash
echo $?  # Should output: 0
```

If any test fails:
- Exit code will be non-zero
- Error message will indicate which test failed
- Response body will show API error details
- Script will attempt cleanup before exiting

## Support

- **API Documentation:** See main `README.md`
- **API Logs:** `func azure functionapp logstream func-ctn-demo-asr-dev`
- **Azure Portal:** https://portal.azure.com
- **Issue Tracking:** Azure DevOps work items

---

**Remember:** These are the **FIRST** tests to run after deployment. If these fail, the API has fundamental issues that need to be fixed before proceeding with UI testing or user acceptance testing.
