# URGENT: Security Credential Rotation Required

**Date:** October 18, 2025
**Severity:** CRITICAL
**Status:** ⚠️ IMMEDIATE ACTION REQUIRED

---

## Summary

Sensitive credentials were found committed to Git in `.env` files. These files have been removed from the repository and Git history, but **you must manually rotate all exposed credentials immediately**.

---

## Exposed Credentials

### 1. Azure AD Test User Password ⚠️

**Location:** `web/.env` (line 2)
**User:** ramon@denoronha.consulting
**Exposed Password:** `riqbok-9Fejce-zamziv`

**Impact:**
- Anyone with access to the Git repository can authenticate as this test user
- Potential unauthorized access to Azure resources
- Compromised test environment

**Action Required:**
1. Open Azure Portal: https://portal.azure.com
2. Navigate to: Azure Active Directory → Users
3. Search for: ramon@denoronha.consulting
4. Click "Reset password"
5. Generate a new strong password
6. **DO NOT** commit the new password to Git
7. Store in Azure Key Vault or password manager only

**Timeline:** 5 minutes
**Priority:** IMMEDIATE

---

### 2. Aikido Security API Keys ⚠️

**Location:** `portal/.env` (lines 5, 9)

**Exposed Keys:**
- **CI API Key:** `AIK_CI_jj7tAGgEs3tNuMZmVUL2hKi9IP039aIR6yio4JxK9k4zrKznkmTdk6rX76zDRQ9r`
- **Secret Key:** `AIK_SECRET_MEFh76gfcq2KlyeeANIRbBsfFaS6n1n1IdC90ZUCh6IS5FT9Od9uhcwsJdCxXCGZ`

**Impact:**
- Unauthorized access to Aikido security scanning services
- Potential manipulation of security scan results
- Access to vulnerability reports

**Action Required:**
1. Log in to Aikido Console: https://app.aikido.dev
2. Navigate to: Settings → API Keys
3. **Revoke** both exposed keys:
   - AIK_CI_jj7tAGgEs3tNuMZmVUL2hKi9IP039aIR6yio4JxK9k4zrKznkmTdk6rX76zDRQ9r
   - AIK_SECRET_MEFh76gfcq2KlyeeANIRbBsfFaS6n1n1IdC90ZUCh6IS5FT9Od9uhcwsJdCxXCGZ
4. **Generate** new API keys
5. Update in Azure DevOps variable groups (NOT in .env files)
6. Update in Azure Key Vault

**Timeline:** 10 minutes
**Priority:** IMMEDIATE

---

## What Has Been Done Automatically

✅ **Completed:**
1. `.env` files removed from Git index (no longer tracked)
2. `.env` files removed from Git history using `git filter-branch`
3. Security headers added to Admin and Member portals
4. Orchestrator Portal CSP fixed (removed 'unsafe-eval')
5. Pre-commit hook added to prevent future credential commits
6. Force-pushed cleaned history to remote repository

⚠️ **Still Required (Manual):**
1. Rotate Azure AD password (5 min)
2. Rotate Aikido API keys (10 min)
3. Update Azure DevOps variable groups with new credentials
4. Update Azure Key Vault secrets

---

## Post-Rotation Checklist

After rotating credentials, update them in these locations:

### Azure DevOps Variable Groups
```bash
# Update admin portal variable group
az pipelines variable-group variable update \
  --group-id <group-id> \
  --name AZURE_AD_TEST_PASSWORD \
  --value "<new-password>" \
  --organization https://dev.azure.com/ctn-demo \
  --project ASR

# Update member portal variable group
az pipelines variable-group variable update \
  --group-id <group-id> \
  --name AIKIDO_CI_API_KEY \
  --value "<new-key>" \
  --organization https://dev.azure.com/ctn-demo \
  --project ASR
```

### Azure Key Vault
```bash
# Update Azure AD password
az keyvault secret set \
  --vault-name <vault-name> \
  --name "AZURE-AD-TEST-PASSWORD" \
  --value "<new-password>"

# Update Aikido keys
az keyvault secret set \
  --vault-name <vault-name> \
  --name "AIKIDO-CI-API-KEY" \
  --value "<new-key>"

az keyvault secret set \
  --vault-name <vault-name> \
  --name "AIKIDO-SECRET-KEY" \
  --value "<new-key>"
```

### Local Environment Files (NOT committed to Git)
Update your local `.env` files with new credentials:
- `web/.env` - Update AZURE_AD_TEST_PASSWORD
- `portal/.env` - Update AIKIDO_CI_API_KEY and AIKIDO_SECRET_KEY

**IMPORTANT:** Never commit these files to Git again!

---

## Prevention Measures Implemented

✅ **Pre-commit Hook Installed:**
- Located at: `.git/hooks/pre-commit`
- Scans for common secret patterns before each commit
- Blocks commits containing potential secrets

✅ **Git History Cleaned:**
- Removed `web/.env` and `portal/.env` from entire Git history
- Force-pushed cleaned history to Azure DevOps

✅ **Documentation Updated:**
- Added to .gitignore (already present, but verified)
- Created this security rotation guide

---

## Verification Steps

After completing manual rotation:

1. **Verify Azure AD password changed:**
   ```bash
   # Try logging in with old password (should fail)
   # Try logging in with new password (should succeed)
   ```

2. **Verify Aikido keys revoked:**
   ```bash
   # Test old key (should return 401 Unauthorized)
   curl -H "Authorization: Bearer AIK_CI_jj7tAGgEs3tNuMZmVUL2hKi9IP039aIR6yio4JxK9k4zrKznkmTdk6rX76zDRQ9r" \
     https://api.aikido.dev/v1/repositories

   # Test new key (should return 200 OK)
   curl -H "Authorization: Bearer <new-key>" \
     https://api.aikido.dev/v1/repositories
   ```

3. **Verify Git history clean:**
   ```bash
   # Should return no results
   git log --all --full-history --source --pretty=format: --name-only | \
     grep -E "web/.env|portal/.env"
   ```

4. **Verify pre-commit hook works:**
   ```bash
   # Try committing a file with "password=secret123" (should block)
   echo "password=secret123" > test.txt
   git add test.txt
   git commit -m "test" # Should be blocked
   rm test.txt
   ```

---

## Timeline

**Total Manual Effort:** 15 minutes
**Total Automated:** Already completed

**Priority Order:**
1. ⚠️ **NOW (5 min):** Rotate Azure AD password
2. ⚠️ **NOW (10 min):** Rotate Aikido API keys
3. ✅ **DONE:** Git history cleaned (automated)
4. ✅ **DONE:** Security headers added (automated)
5. ✅ **DONE:** Pre-commit hook installed (automated)

---

## Support

If you need assistance:
- **Azure AD:** Azure Portal → Help + support
- **Aikido:** support@aikido.dev
- **Git Issues:** Check `.git/hooks/pre-commit` for hook configuration

---

**This file will be deleted after credentials are rotated and verified.**
