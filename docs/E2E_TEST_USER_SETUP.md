# E2E Test User Setup

**Last Updated:** November 1, 2025

## Overview

This document describes the E2E test user configuration for Playwright automated testing in the CTN ASR project.

---

## Test User Details

- **Email:** test-e2@denoronha.consulting
- **Object ID:** 7e093589-f654-4e53-9522-898995d1201b
- **Purpose:** Automated Playwright E2E testing without MFA interruption
- **Status:** ⚠️ **MFA STILL ENFORCED - REQUIRES MANUAL FIX**

---

## 🚨 Current Issue: MFA Still Required

Despite creating the test user, **MFA is still being enforced via Conditional Access policies**. Authentication test returned:

```
AADSTS50079: Due to a configuration change made by your administrator, 
or because you moved to a new location, you must enroll in multi-factor 
authentication to access 'api://d3037c11-a541-4f21-8862-8079137a0cde'
```

---

## ✅ What Has Been Configured

### 1. Credentials Stored in `.credentials` File

```bash
E2E_TEST_USER_EMAIL=test-e2@denoronha.consulting
E2E_TEST_USER_PASSWORD=Daha318799
E2E_TEST_USER_OBJECT_ID=7e093589-f654-4e53-9522-898995d1201b
```

Location: `/Users/ramondenoronha/Dev/DIL/ASR-full/.credentials` (lines 197-199)

### 2. Azure Key Vault Secrets

Credentials stored in Key Vault: `kv-ctn-demo-asr-dev`

```bash
# Verify with:
az keyvault secret show --vault-name kv-ctn-demo-asr-dev --name E2E-TEST-USER-EMAIL
az keyvault secret show --vault-name kv-ctn-demo-asr-dev --name E2E-TEST-USER-PASSWORD
```

Secrets:
- `E2E-TEST-USER-EMAIL`: test-e2@denoronha.consulting
- `E2E-TEST-USER-PASSWORD`: Daha318799

### 3. Playwright Configuration Files

**Admin Portal:** `/admin-portal/.env`
```bash
E2E_TEST_USER_EMAIL=test-e2@denoronha.consulting
E2E_TEST_USER_PASSWORD=Daha318799
PLAYWRIGHT_BASE_URL=https://calm-tree-03352ba03.1.azurestaticapps.net
```

**Member Portal:** `/member-portal/.env`
```bash
E2E_TEST_USER_EMAIL=test-e2@denoronha.consulting
E2E_TEST_USER_PASSWORD=Daha318799
BASE_URL=https://calm-pebble-043b2db03.1.azurestaticapps.net
```

Both files added to `.gitignore` to prevent accidental commits.

### 4. Azure DevOps Pipeline Variables

Pipeline updated: `.azure-pipelines/playwright-tests.yml`

Environment variables added:
```yaml
env:
  CI: true
  PLAYWRIGHT_BASE_URL: $(PlaywrightBaseURL)
  E2E_TEST_USER_EMAIL: $(E2ETestUserEmail)
  E2E_TEST_USER_PASSWORD: $(E2ETestUserPassword)
```

---

## 🔧 Manual Steps Required

### Step 1: Exclude Test User from MFA via Conditional Access

**Option A: Create Exclusion Group (Recommended)**

1. Go to **Entra ID** → **Groups** → **New Group**
   - **Group type:** Security
   - **Group name:** `Exclude-MFA-E2E-Tests`
   - **Members:** Add `test-e2@denoronha.consulting`

2. Go to **Entra ID** → **Security** → **Conditional Access** → [Your MFA Policy]
   - **Exclude** → **Users and groups** → Select `Exclude-MFA-E2E-Tests`
   - **Save**

**Option B: Configure Security Defaults**

If using Security Defaults instead of Conditional Access:

1. Go to **Entra ID** → **Properties** → **Manage security defaults**
2. Set to **Disabled** (not recommended for production)
3. Configure custom Conditional Access policy with exclusions

### Step 2: Configure Azure DevOps Variable Group

1. Go to **Azure DevOps** → **Pipelines** → **Library** → **Variable groups**
2. Find or create variable group: `playwright-secrets`
3. Add variables:
   - `PlaywrightBaseURL`: `https://calm-tree-03352ba03.1.azurestaticapps.net`
   - `E2ETestUserEmail`: `test-e2@denoronha.consulting`
4. Link Key Vault secret:
   - Click **Link secrets from an Azure key vault as variables**
   - Select Key Vault: `kv-ctn-demo-asr-dev`
   - Add secret: `E2E-TEST-USER-PASSWORD` → Variable name: `E2ETestUserPassword`

### Step 3: Verify Authentication

After MFA exclusion is configured, test with:

```bash
curl -X POST https://login.microsoftonline.com/598664e7-725c-4daa-bd1f-89c4ada717ff/oauth2/v2.0/token \
  -H "Content-Type: application/x-www-form-urlencoded" \
  -d "client_id=d3037c11-a541-4f21-8862-8079137a0cde" \
  -d "scope=api://d3037c11-a541-4f21-8862-8079137a0cde/.default" \
  -d "username=test-e2@denoronha.consulting" \
  -d "password=Daha318799" \
  -d "grant_type=password"
```

Expected response: `{"access_token": "...", "expires_in": 3599, ...}`

### Step 4: Capture Playwright Auth State

Once MFA is excluded and authentication works:

```bash
cd admin-portal
node playwright/scripts/capture-auth-final.js
```

This will:
1. Authenticate with test user credentials
2. Save auth state to `playwright/.auth/user.json`
3. Upload to Azure DevOps Secure Files as `playwright-auth.json`

---

## Alternative: Device Code Flow

If MFA cannot be excluded (e.g., compliance requirements), use **device code flow** instead of ROPC (Resource Owner Password Credentials):

1. Update Playwright tests to use device code flow
2. Manually authenticate once per test session
3. Cache tokens for subsequent tests

See: [Microsoft Authentication Library (MSAL) Device Code Flow](https://learn.microsoft.com/en-us/azure/active-directory/develop/v2-oauth2-device-code)

---

## Testing Locally

```bash
# Admin Portal
cd admin-portal
npm run test:e2e

# Member Portal
cd member-portal
npm run test:e2e
```

---

## Security Notes

1. **DO NOT commit `.env` files** - Already added to `.gitignore`
2. **Rotate password periodically** - Update in Key Vault and variable groups
3. **Limit test user permissions** - Assign minimal RBAC roles required for testing
4. **Monitor usage** - Check Application Insights for unexpected logins
5. **Document exemption** - MFA exclusion should be documented in security compliance records

---

## Troubleshooting

### "AADSTS50079: MFA required"
- **Cause:** Conditional Access policy still enforces MFA
- **Fix:** Follow Step 1 above to exclude test user

### "AADSTS50126: Invalid username or password"
- **Cause:** Credentials incorrect or expired
- **Fix:** Verify password in Key Vault, reset if needed

### "Authentication state not found"
- **Cause:** Missing `playwright/.auth/user.json`
- **Fix:** Run `capture-auth-final.js` script after MFA exclusion

---

## Related Documentation

- [Playwright Configuration](../admin-portal/playwright.config.ts)
- [Azure DevOps Pipeline](../.azure-pipelines/playwright-tests.yml)
- [MFA Workaround Guide](../admin-portal/e2e/MFA_WORKAROUND.md)

---

## Checklist

- [x] Test user created in Entra ID
- [x] Credentials stored in `.credentials` file
- [x] Credentials stored in Azure Key Vault
- [x] Playwright `.env` files created (admin + member portals)
- [x] `.env` added to `.gitignore`
- [x] Pipeline environment variables configured
- [ ] **MFA exclusion configured in Conditional Access** ⚠️ **REQUIRED**
- [ ] **Azure DevOps variable group configured** ⚠️ **REQUIRED**
- [ ] **Authentication test passed** ⚠️ **BLOCKED BY MFA**
- [ ] **Playwright auth state captured** ⚠️ **BLOCKED BY MFA**
