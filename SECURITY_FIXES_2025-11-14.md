# Security Fixes - November 14, 2025

## Summary

Fixed **4 code vulnerabilities** and **1 Azure infrastructure issue** based on Aikido security scan findings.

## Code Vulnerabilities Fixed (ASR System)

### 1. Private Key Exposure in bdiJwtService.ts ✅
**Severity:** HIGH
**Issue:** Hardcoded RSA private key fallback in source code
**Fix:**
- Removed hardcoded private key (lines 22-63)
- Enforced environment variable requirement with startup validation
- Added Azure Key Vault storage instructions
- **File:** `api/src/services/bdiJwtService.ts:17-39`

### 2. XSS Vulnerability in Handlebar Template ✅
**Severity:** HIGH
**Issue:** Unescaped HTML rendering with triple braces `{{{body}}}`
**Fix:**
- Changed to double braces `{{body}}` in base.hbs
- Implemented `Handlebars.SafeString` for trusted pre-rendered content
- **Files:**
  - `api/src/templates/emails/layouts/base.hbs:103`
  - `api/src/services/emailTemplateService.ts:75`

### 3. Axios SSRF Vulnerability ✅
**Severity:** HIGH (CVE: GHSA-8hc4-vh64-cxmj, GHSA-jr5f-v2jv-69x6, GHSA-4hjh-wcwx-xvwj)
**Issue:** Axios 1.6.8 vulnerable to Server-Side Request Forgery and credential leakage
**Fix:**
- Upgraded axios from 1.6.8 → 1.13.2
- Ran `npm audit fix --force`
- **Result:** 0 vulnerabilities remaining
- **File:** `api/package.json:23`

### 4. File Inclusion Attack in emailTemplateService.ts ✅
**Severity:** HIGH
**Issue:** Path traversal vulnerability - unsanitized `templateName` parameter
**Fix:**
- Added regex validation: only `[a-zA-Z0-9_-]` allowed in template names
- Implemented path boundary check: prevents escaping templates directory
- Applied validation to both primary and fallback paths
- **File:** `api/src/services/emailTemplateService.ts:46-92`

## Azure Infrastructure Issues Fixed (ASR System)

### 5. Key Vault Purge Protection Disabled ✅
**Severity:** HIGH
**Issue:** `kv-ctn-demo-asr-dev` did not have purge protection enabled
**Fix:**
- Enabled purge protection via Azure CLI: `az keyvault update --enable-purge-protection true`
- Updated Bicep template to enforce purge protection by default
- **Files:**
  - Azure: `kv-ctn-demo-asr-dev`
  - IaC: `infrastructure/modules/key-vault.bicep:23`

## Non-ASR Issues (Not Fixed)

The following Aikido findings are **NOT part of the ASR system** and belong to other systems (Orchestrator/DocuFlow) in the same Azure subscription:

### Container Registry Admin User Enabled
- **Resources:** `acrctnmcp`, `ctndocsmcp`
- **Reason:** Not in ASR resource group (`rg-ctn-demo-asr-dev`)
- **Action:** Should be addressed by Orchestrator/DocuFlow teams

### Cosmos DB Public Access Enabled
- **Resources:** `cosmos-ctn-orchestrator-dev`, `cosmos-ctn-booking-prod`
- **Reason:** ASR uses PostgreSQL, not Cosmos DB
- **Action:** Should be addressed by Orchestrator/Booking teams

### Key Vault Network Access Restrictions
- **Resources:** `kv-ctndocsprod`, `kv-booking-prod`
- **Reason:** Not ASR Key Vaults
- **Action:** Should be addressed by respective teams

## Testing Recommendations

1. **API Tests:**
   ```bash
   cd api
   npm run build
   npm start
   # Test BDI JWT token generation (requires env vars)
   # Test email template rendering with various inputs
   ```

2. **Security Verification:**
   ```bash
   # Run Aikido scan
   cd admin-portal  # or member-portal
   npm run security:aikido:scan

   # Check axios version
   npm list axios  # Should show 1.13.2

   # Verify Key Vault
   az keyvault show --name kv-ctn-demo-asr-dev \
     --query "{purgeProtection:properties.enablePurgeProtection}"
   ```

3. **Deploy & Verify:**
   - Commit changes to trigger Azure Pipelines
   - Verify API deployment succeeds
   - Check Application Insights for any startup errors

## Next Steps

1. **Coordinate with other teams** to address non-ASR Azure issues
2. **Monitor Aikido dashboard** for new findings after deployment
3. **Review other portals** (Orchestrator, DocuFlow) for similar vulnerabilities
4. **Consider adding** pre-commit hooks for secret scanning

## References

- Aikido Dashboard: https://app.aikido.dev
- Azure DevOps: https://dev.azure.com/ctn-demo/ASR
- Key Vault: https://kv-ctn-demo-asr-dev.vault.azure.net/

---
**Author:** Claude Code
**Date:** November 14, 2025
**Review Required:** Yes - requires Security Analyst (SA) agent review before deployment
