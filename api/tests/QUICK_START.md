# API Tests - Quick Start Guide

## 1-Minute Setup

### Prerequisites
```bash
# Install jq (if not already installed)
brew install jq  # macOS
# or
sudo apt-get install jq  # Linux
```

### Get Authentication Token

**Option A - Azure CLI (Fastest):**
```bash
az login
TOKEN=$(az account get-access-token --resource api://your-api-client-id --query accessToken -o tsv)
export AUTH_TOKEN="$TOKEN"
```

**Option B - From Browser:**
1. Open Admin Portal: https://calm-tree-03352ba03.1.azurestaticapps.net
2. Open DevTools (F12) → Network tab
3. Login and make any API request
4. Copy Authorization header (without "Bearer ")
5. `export AUTH_TOKEN="your-token-here"`

## Run Tests

### Quick Test (Recommended)
```bash
cd api/tests
export AUTH_TOKEN="your-token"
./run-all-tests.sh
```

### Individual Tests
```bash
# Identifier management
./identifier-crud-test.sh

# Contact management
./contact-crud-test.sh

# Address updates
./address-update-test.sh
```

## Expected Result

```
========================================
Test Suite Summary
========================================
Tests Run:    3
Tests Passed: 3
Tests Failed: 0

✓✓✓ ALL TESTS PASSED ✓✓✓

API is healthy and ready for UI testing!
```

## If Tests Fail

1. Check token is valid (expires after 1 hour)
2. Check API is running: https://func-ctn-demo-asr-dev.azurewebsites.net/api/v1
3. Check API logs: `func azure functionapp logstream func-ctn-demo-asr-dev`
4. Read full error message from test output

## Files Created During Tests

All test data is automatically cleaned up:
- Identifiers created → deleted
- Contacts created → deleted
- Addresses modified → restored

## Documentation

See `README.md` for:
- Detailed test descriptions
- Configuration options
- CI/CD integration examples
- Troubleshooting guide

---

**Remember:** Run these tests AFTER every API deployment and BEFORE UI testing!
