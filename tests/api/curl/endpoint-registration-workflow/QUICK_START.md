# Quick Start Guide - Endpoint Registration Workflow Tests

**5-Minute Quick Start**

---

## Step 1: Check Deployment

```bash
cd /Users/ramondenoronha/Dev/DIL/DEV-CTN-ASR/api/tests/endpoint-registration-workflow
./check-deployment.sh
```

**Expected:**
- ✅ 5/5 functions deployed → Proceed to Step 2
- ⏳ 0/5 functions deployed → Wait 2-3 minutes, try again

---

## Step 2: Run E2E Test

```bash
./00-comprehensive-e2e-test.sh
```

**What it tests:**
1. ✅ Create endpoint
2. ✅ Send verification email (mock)
3. ✅ Verify token
4. ✅ Test endpoint (mock)
5. ✅ Activate endpoint

**Duration:** 30-60 seconds

**When prompted to delete test endpoint:** Type `n` (No) to keep for inspection

---

## Step 3: Run Security Tests

```bash
./99-error-scenarios-test.sh
```

**What it tests:**
- ✅ IDOR protection
- ✅ Invalid tokens
- ✅ Missing authentication
- ✅ Input validation
- ✅ Workflow state enforcement

**Duration:** 1-2 minutes

---

## Success Criteria

All tests should show:
- ✅ Green checkmarks
- ✅ Correct HTTP status codes
- ✅ No red X marks

---

## Troubleshooting

### Problem: 404 Not Found

**Solution:** API not deployed yet. Run `./check-deployment.sh` and wait.

### Problem: 401 Unauthorized

**Solution:** Token expired. Run `./auth-helper.sh` to get new token.

### Problem: Test fails at Step X

**Solution:** Check error message, verify API response in console output.

---

## Full Documentation

- **Complete Guide:** `README.md`
- **Test Report:** `TEST_REPORT.md`
- **API Docs:** https://func-ctn-demo-asr-dev.azurewebsites.net/api/openapi.json

---

## Test Files Location

```
/Users/ramondenoronha/Dev/DIL/DEV-CTN-ASR/api/tests/endpoint-registration-workflow/
```

## Quick Commands

```bash
# Check deployment status
./check-deployment.sh

# Run all tests
./auth-helper.sh && ./00-comprehensive-e2e-test.sh && ./99-error-scenarios-test.sh

# Run individual step tests
./01-initiate-registration-test.sh
./02-send-verification-test.sh
./03-verify-token-test.sh
./04-test-endpoint-test.sh
./05-activate-endpoint-test.sh
```

---

**Questions?** See `README.md` for complete documentation.
