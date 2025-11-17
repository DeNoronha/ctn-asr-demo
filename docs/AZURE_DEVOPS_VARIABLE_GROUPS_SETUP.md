# Azure DevOps Variable Groups Setup Guide

**Last Updated:** November 17, 2025
**Task:** TASK-DG-VARS-001 - Centralize Environment Variables

---

## Executive Summary

This document provides a comprehensive guide to centralizing duplicated environment variables across Azure DevOps pipelines using Variable Groups. This reduces configuration drift, simplifies updates, and improves maintainability.

### Current Problem

Environment variables are duplicated across 5 pipeline YAML files:
- `admin-portal.yml` - Admin Portal deployment
- `member-portal.yml` - Member Portal deployment
- `asr-api.yml` - ASR API deployment
- `playwright-tests.yml` - E2E testing
- `bicep-infrastructure.yml` - Infrastructure deployment

**Result:** Configuration drift, tedious updates, increased risk of errors.

### Benefits of Variable Groups

- **Single Source of Truth** - Update once, apply everywhere
- **Reduced Drift** - No more inconsistent values across pipelines
- **Easier Maintenance** - Change Azure client ID once instead of 5 times
- **Better Security** - Clear separation between secrets and configuration
- **Audit Trail** - Track who changed what variable and when

---

## Current State Analysis

### 1. Admin Portal Pipeline (`admin-portal.yml`)

**Existing Variable Group:**
- `ctn-admin-portal-variables` (already referenced, but EMPTY or unused)

**Hardcoded Variables (Build Step):**
```yaml
env:
  VITE_AZURE_CLIENT_ID: d3037c11-a541-4f21-8862-8079137a0cde
  VITE_AZURE_TENANT_ID: 598664e7-725c-4daa-bd1f-89c4ada717ff
  VITE_REDIRECT_URI: https://calm-tree-03352ba03.1.azurestaticapps.net
  VITE_API_URL: https://func-ctn-demo-asr-dev.azurewebsites.net/api/v1
```

**Inline Variables:**
```yaml
- name: keyVaultName
  value: 'kv-ctn-demo-asr-dev'
- name: azureSubscription
  value: 'Azure-CTN-ASR-ServiceConnection'
```

**Key Vault Secrets:**
- `AZURE-STATIC-WEB-APPS-API-TOKEN-ADMIN` (from Key Vault)
- `NVD-API-KEY` (from Key Vault)

**Portal-Specific:**
- Static Web App deployment token (admin-specific)
- Redirect URI (admin-specific)
- Build output directory: `admin-portal/build`

---

### 2. Member Portal Pipeline (`member-portal.yml`)

**Existing Variable Group:**
- `ctn-member-portal-variables` (already referenced, but EMPTY or unused)

**Hardcoded Variables (Build Step):**
```yaml
env:
  # Azure AD Configuration
  VITE_AZURE_CLIENT_ID: d3037c11-a541-4f21-8862-8079137a0cde
  VITE_AZURE_TENANT_ID: 598664e7-725c-4daa-bd1f-89c4ada717ff
  VITE_REDIRECT_URI: https://calm-pebble-043b2db03.1.azurestaticapps.net

  # API Configuration
  VITE_API_CLIENT_ID: d3037c11-a541-4f21-8862-8079137a0cde
  VITE_API_BASE_URL: https://func-ctn-demo-asr-dev.azurewebsites.net/api/v1

  # Legacy variables (for backward compatibility)
  VITE_AAD_CLIENT_ID: d3037c11-a541-4f21-8862-8079137a0cde
  VITE_AAD_AUTHORITY: https://login.microsoftonline.com/598664e7-725c-4daa-bd1f-89c4ada717ff
  VITE_AAD_REDIRECT_URI: https://calm-pebble-043b2db03.1.azurestaticapps.net
```

**Inline Variables:**
```yaml
- name: keyVaultName
  value: 'kv-ctn-demo-asr-dev'
- name: azureSubscription
  value: 'Azure-CTN-ASR-ServiceConnection'
```

**Key Vault Secrets:**
- `AZURE-STATIC-WEB-APPS-API-TOKEN-MEMBER` (from Key Vault)
- `NVD-API-KEY` (from Key Vault)

**Portal-Specific:**
- Static Web App deployment token (member-specific)
- Redirect URI (member-specific)
- Build output directory: `member-portal/build`

---

### 3. ASR API Pipeline (`asr-api.yml`)

**No Variable Group** (relies entirely on inline variables)

**Inline Variables:**
```yaml
- name: azureSubscription
  value: 'Azure-CTN-ASR-ServiceConnection'
- name: functionAppName
  value: 'func-ctn-demo-asr-dev'
```

**Key Vault Secrets:**
- `NVD-API-KEY` (from Key Vault)

**API-Specific:**
- Function App name: `func-ctn-demo-asr-dev`
- No portal-specific environment variables in build step

---

### 4. Playwright Tests Pipeline (`playwright-tests.yml`)

**Existing Variable Group:**
- `playwright-secrets` (already referenced)

**Inline Variables:**
```yaml
- name: workingDirectory
  value: '.'
- name: nodeVersion
  value: '20.x'
```

**Expected Variables from Group:**
- `PlaywrightBaseURL` - Test target URL
- `E2ETestUserEmail` - Test user email
- `E2ETestUserPassword` - Test user password (from Key Vault)

**Test-Specific:**
- Auth state file: `playwright-auth.json` (Secure File)
- Base URL for tests (currently admin portal)

---

### 5. Bicep Infrastructure Pipeline (`bicep-infrastructure.yml`)

**Existing Variable Group:**
- `ctn-demo-variables` (already referenced)

**Inline Variables:**
```yaml
- name: workingDirectory
  value: '$(System.DefaultWorkingDirectory)/infrastructure/bicep'
- name: azureSubscription
  value: 'azure-ctn-demo'
- name: resourceGroupName
  value: 'rg-ctn-demo-asr-dev'
- name: location
  value: 'westeurope'
```

**Expected Variables from Group:**
- `DATABASE_ADMIN_PASSWORD` (for dev)
- `DATABASE_ADMIN_PASSWORD_PROD` (for prod)

**Infrastructure-Specific:**
- Resource group name
- Azure location
- Bicep template paths

---

## Variable Classification

### Category 1: SHARED AZURE CONFIGURATION (Candidates for Centralization)

These variables have the SAME value across ALL pipelines:

| Variable | Current Value | Used In |
|----------|---------------|---------|
| `VITE_AZURE_CLIENT_ID` | `d3037c11-a541-4f21-8862-8079137a0cde` | Admin Portal, Member Portal |
| `VITE_AZURE_TENANT_ID` | `598664e7-725c-4daa-bd1f-89c4ada717ff` | Admin Portal, Member Portal |
| `VITE_API_URL` / `VITE_API_BASE_URL` | `https://func-ctn-demo-asr-dev.azurewebsites.net/api/v1` | Admin Portal, Member Portal |
| `azureSubscription` | `Azure-CTN-ASR-ServiceConnection` | Admin Portal, Member Portal, ASR API |
| `keyVaultName` | `kv-ctn-demo-asr-dev` | Admin Portal, Member Portal, ASR API |
| `nodeVersion` | `20.x` | Playwright Tests (could be shared) |

**Recommendation:** Move to `ASR-Common-Variables` Variable Group

---

### Category 2: PORTAL-SPECIFIC (Keep in YAML)

These variables are UNIQUE per portal and should NOT be centralized:

| Variable | Admin Portal | Member Portal |
|----------|--------------|---------------|
| `VITE_REDIRECT_URI` | `https://calm-tree-03352ba03.1.azurestaticapps.net` | `https://calm-pebble-043b2db03.1.azurestaticapps.net` |
| SWA Deployment Token | `AZURE-STATIC-WEB-APPS-API-TOKEN-ADMIN` | `AZURE-STATIC-WEB-APPS-API-TOKEN-MEMBER` |
| Build Output Directory | `admin-portal/build` | `member-portal/build` |
| Portal URL | `https://calm-tree-03352ba03.1.azurestaticapps.net` | `https://calm-pebble-043b2db03.1.azurestaticapps.net` |

**Recommendation:** Keep in individual pipeline YAML files

---

### Category 3: SECRETS (Key Vault)

These are already properly stored in Azure Key Vault:

| Secret Name | Used In | Purpose |
|-------------|---------|---------|
| `NVD-API-KEY` | Admin Portal, Member Portal, ASR API | OWASP NVD database access |
| `AZURE-STATIC-WEB-APPS-API-TOKEN-ADMIN` | Admin Portal | SWA deployment authentication |
| `AZURE-STATIC-WEB-APPS-API-TOKEN-MEMBER` | Member Portal | SWA deployment authentication |
| `E2E-TEST-USER-PASSWORD` | Playwright Tests | Test user authentication |
| `DATABASE_ADMIN_PASSWORD` | Bicep Infrastructure | PostgreSQL admin password (dev) |
| `DATABASE_ADMIN_PASSWORD_PROD` | Bicep Infrastructure | PostgreSQL admin password (prod) |

**Recommendation:** Keep in Azure Key Vault (no changes needed)

---

### Category 4: INFRASTRUCTURE-SPECIFIC (Keep in YAML)

These variables are specific to infrastructure deployment:

| Variable | Value | Pipeline |
|----------|-------|----------|
| `functionAppName` | `func-ctn-demo-asr-dev` | ASR API |
| `resourceGroupName` | `rg-ctn-demo-asr-dev` | Bicep Infrastructure |
| `location` | `westeurope` | Bicep Infrastructure |
| `workingDirectory` | Various | Multiple |

**Recommendation:** Keep in individual pipeline YAML files

---

## Proposed Variable Groups Structure

### Variable Group 1: `ASR-Common-Variables`

**Purpose:** Shared configuration values used across multiple pipelines

**Variables:**

| Variable Name | Value | Description |
|---------------|-------|-------------|
| `AZURE_CLIENT_ID` | `d3037c11-a541-4f21-8862-8079137a0cde` | Azure AD Application Client ID |
| `AZURE_TENANT_ID` | `598664e7-725c-4daa-bd1f-89c4ada717ff` | Azure AD Tenant ID |
| `API_BASE_URL` | `https://func-ctn-demo-asr-dev.azurewebsites.net/api/v1` | ASR API Base URL |
| `AZURE_SUBSCRIPTION` | `Azure-CTN-ASR-ServiceConnection` | Azure DevOps Service Connection |
| `KEY_VAULT_NAME` | `kv-ctn-demo-asr-dev` | Azure Key Vault Name |
| `NODE_VERSION` | `20.x` | Node.js version for all pipelines |

**Used By:**
- Admin Portal Pipeline
- Member Portal Pipeline
- ASR API Pipeline
- Playwright Tests Pipeline

**Access:** All pipelines in ASR project

---

### Variable Group 2: `ctn-admin-portal-variables` (EXISTING - POPULATE)

**Purpose:** Admin portal-specific configuration (non-secret)

**Variables:**

| Variable Name | Value | Description |
|---------------|-------|-------------|
| `VITE_REDIRECT_URI` | `https://calm-tree-03352ba03.1.azurestaticapps.net` | Admin portal redirect URI |
| `PORTAL_URL` | `https://calm-tree-03352ba03.1.azurestaticapps.net` | Admin portal direct URL |
| `FRONT_DOOR_URL` | `https://admin-ctn-dev-gma8fnethbetbjgj.z02.azurefd.net` | Admin portal Front Door URL |

**Used By:** Admin Portal Pipeline only

**Access:** Restricted to admin-portal pipeline

---

### Variable Group 3: `ctn-member-portal-variables` (EXISTING - POPULATE)

**Purpose:** Member portal-specific configuration (non-secret)

**Variables:**

| Variable Name | Value | Description |
|---------------|-------|-------------|
| `VITE_REDIRECT_URI` | `https://calm-pebble-043b2db03.1.azurestaticapps.net` | Member portal redirect URI |
| `PORTAL_URL` | `https://calm-pebble-043b2db03.1.azurestaticapps.net` | Member portal direct URL |
| `FRONT_DOOR_URL` | `https://portal-ctn-dev-fdb5cpeagdendtck.z02.azurefd.net` | Member portal Front Door URL |

**Used By:** Member Portal Pipeline only

**Access:** Restricted to member-portal pipeline

---

### Variable Group 4: `playwright-secrets` (EXISTING - NO CHANGES)

**Purpose:** Playwright E2E test configuration

**Variables:**

| Variable Name | Value | Description |
|---------------|-------|-------------|
| `PlaywrightBaseURL` | `https://calm-tree-03352ba03.1.azurestaticapps.net` | Test target URL |
| `E2ETestUserEmail` | `test-e2@denoronha.consulting` | Test user email |
| `E2ETestUserPassword` | (Link to Key Vault) | Test user password |

**Used By:** Playwright Tests Pipeline only

**Access:** Restricted to playwright pipeline

---

### Variable Group 5: `ctn-demo-variables` (EXISTING - NO CHANGES)

**Purpose:** Infrastructure deployment variables

**Variables:**

| Variable Name | Value | Description |
|---------------|-------|-------------|
| `DATABASE_ADMIN_PASSWORD` | (Link to Key Vault) | PostgreSQL admin password (dev) |
| `DATABASE_ADMIN_PASSWORD_PROD` | (Link to Key Vault) | PostgreSQL admin password (prod) |

**Used By:** Bicep Infrastructure Pipeline only

**Access:** Restricted to infrastructure pipeline

---

## Implementation Guide

### Phase 1: Create New Variable Group

**Step 1: Create `ASR-Common-Variables` Variable Group**

1. Navigate to Azure DevOps
   - Organization: `https://dev.azure.com/ctn-demo`
   - Project: `ASR`

2. Go to Pipelines → Library
3. Click `+ Variable group`
4. Configure:
   - **Name:** `ASR-Common-Variables`
   - **Description:** `Shared configuration values for ASR pipelines (Azure AD, API URLs, service connections)`
   - **Allow access to all pipelines:** YES (or restrict to specific pipelines)

5. Add variables (click `+ Add`):

```
Variable Name: AZURE_CLIENT_ID
Value: d3037c11-a541-4f21-8862-8079137a0cde
Keep this value secret: NO
Description: Azure AD Application Client ID for ASR system

---

Variable Name: AZURE_TENANT_ID
Value: 598664e7-725c-4daa-bd1f-89c4ada717ff
Keep this value secret: NO
Description: Azure AD Tenant ID for CTN Demo

---

Variable Name: API_BASE_URL
Value: https://func-ctn-demo-asr-dev.azurewebsites.net/api/v1
Keep this value secret: NO
Description: ASR API base URL for all portals

---

Variable Name: AZURE_SUBSCRIPTION
Value: Azure-CTN-ASR-ServiceConnection
Keep this value secret: NO
Description: Azure DevOps Service Connection name

---

Variable Name: KEY_VAULT_NAME
Value: kv-ctn-demo-asr-dev
Keep this value secret: NO
Description: Azure Key Vault name for ASR secrets

---

Variable Name: NODE_VERSION
Value: 20.x
Keep this value secret: NO
Description: Node.js version for all pipelines
```

6. Click `Save`

**Screenshot Reference:**
```
┌─────────────────────────────────────────────────────────────┐
│ Variable group details                                      │
├─────────────────────────────────────────────────────────────┤
│ Name:                ASR-Common-Variables                   │
│ Description:         Shared configuration for ASR pipelines │
│                                                             │
│ Variables:                                                  │
│ ┌─────────────────────┬─────────────────────────┬─────┐   │
│ │ Name                │ Value                    │ 🔒  │   │
│ ├─────────────────────┼─────────────────────────┼─────┤   │
│ │ AZURE_CLIENT_ID     │ d3037c11-a541-4f21...   │  -  │   │
│ │ AZURE_TENANT_ID     │ 598664e7-725c-4daa...   │  -  │   │
│ │ API_BASE_URL        │ https://func-ctn-dem... │  -  │   │
│ │ AZURE_SUBSCRIPTION  │ Azure-CTN-ASR-Servi...  │  -  │   │
│ │ KEY_VAULT_NAME      │ kv-ctn-demo-asr-dev     │  -  │   │
│ │ NODE_VERSION        │ 20.x                    │  -  │   │
│ └─────────────────────┴─────────────────────────┴─────┘   │
│                                                             │
│ [Save] [Cancel]                                             │
└─────────────────────────────────────────────────────────────┘
```

---

### Phase 2: Populate Existing Portal-Specific Variable Groups

**Step 2: Populate `ctn-admin-portal-variables`**

1. Navigate to Pipelines → Library
2. Find and click `ctn-admin-portal-variables`
3. Add variables:

```
Variable Name: VITE_REDIRECT_URI
Value: https://calm-tree-03352ba03.1.azurestaticapps.net
Keep this value secret: NO
Description: Admin portal OAuth redirect URI

---

Variable Name: PORTAL_URL
Value: https://calm-tree-03352ba03.1.azurestaticapps.net
Keep this value secret: NO
Description: Admin portal direct Static Web App URL

---

Variable Name: FRONT_DOOR_URL
Value: https://admin-ctn-dev-gma8fnethbetbjgj.z02.azurefd.net
Keep this value secret: NO
Description: Admin portal Front Door URL (with WAF)
```

4. Click `Save`

---

**Step 3: Populate `ctn-member-portal-variables`**

1. Navigate to Pipelines → Library
2. Find and click `ctn-member-portal-variables`
3. Add variables:

```
Variable Name: VITE_REDIRECT_URI
Value: https://calm-pebble-043b2db03.1.azurestaticapps.net
Keep this value secret: NO
Description: Member portal OAuth redirect URI

---

Variable Name: PORTAL_URL
Value: https://calm-pebble-043b2db03.1.azurestaticapps.net
Keep this value secret: NO
Description: Member portal direct Static Web App URL

---

Variable Name: FRONT_DOOR_URL
Value: https://portal-ctn-dev-fdb5cpeagdendtck.z02.azurefd.net
Keep this value secret: NO
Description: Member portal Front Door URL (with WAF)
```

4. Click `Save`

---

### Phase 3: Update Pipeline YAML Files

See separate sections below for each pipeline's updated YAML.

---

### Phase 4: Validation Checklist

Before committing changes:

- [ ] Variable Group `ASR-Common-Variables` created with all 6 variables
- [ ] Variable Group `ctn-admin-portal-variables` populated with 3 variables
- [ ] Variable Group `ctn-member-portal-variables` populated with 3 variables
- [ ] All Variable Groups set to "Allow access to all pipelines" (or specific pipelines authorized)
- [ ] Pipeline YAML files updated to reference Variable Groups
- [ ] No hardcoded secrets in YAML files
- [ ] Key Vault secrets remain in Key Vault (not moved to Variable Groups)
- [ ] Portal-specific values remain in portal-specific groups (not in common group)

---

### Phase 5: Deployment & Testing

**Step 1: Test with Admin Portal First**

1. Commit updated `admin-portal.yml` to a test branch (if using feature branches) or main
2. Trigger Admin Portal pipeline manually
3. Verify build step environment variables are correctly populated:
   ```
   VITE_AZURE_CLIENT_ID: d3037c11-a541-4f21-8862-8079137a0cde
   VITE_AZURE_TENANT_ID: 598664e7-725c-4daa-bd1f-89c4ada717ff
   VITE_REDIRECT_URI: https://calm-tree-03352ba03.1.azurestaticapps.net
   VITE_API_URL: https://func-ctn-demo-asr-dev.azurewebsites.net/api/v1
   ```
4. Verify deployment succeeds
5. Test deployed portal functionality (login, API calls)

**Step 2: Roll Out to Member Portal**

1. Commit updated `member-portal.yml`
2. Trigger Member Portal pipeline
3. Verify variables and deployment
4. Test portal functionality

**Step 3: Roll Out to ASR API**

1. Commit updated `asr-api.yml`
2. Trigger API pipeline
3. Verify deployment
4. Test API health endpoint

**Step 4: Verify All Pipelines**

1. Run each pipeline once
2. Verify no failures related to missing variables
3. Check deployed applications function correctly

---

## Rollback Procedure

If Variable Groups cause issues:

**Option 1: Revert YAML Files**

```bash
# Revert pipeline files to previous commit
git revert <commit-hash>
git push origin main
```

**Option 2: Quick Fix - Add Variables Back to YAML**

Temporarily add hardcoded values back to YAML while troubleshooting Variable Groups.

**Option 3: Disable Variable Group Reference**

Comment out Variable Group reference in YAML:

```yaml
variables:
  # - group: ASR-Common-Variables  # DISABLED FOR TROUBLESHOOTING
  - name: AZURE_CLIENT_ID
    value: 'd3037c11-a541-4f21-8862-8079137a0cde'
```

---

## Maintenance Guide

### Updating a Shared Variable

**Example: Change Azure Tenant ID**

1. Navigate to Pipelines → Library → `ASR-Common-Variables`
2. Click on `AZURE_TENANT_ID` variable
3. Update value
4. Click `Save`
5. **Trigger affected pipelines:**
   - Admin Portal
   - Member Portal
   - ASR API (if applicable)
6. Verify deployments succeed with new value

**Time saved:** Update 1 place instead of 5 YAML files

---

### Adding a New Shared Variable

**Example: Add staging environment API URL**

1. Navigate to `ASR-Common-Variables`
2. Click `+ Add`
3. Configure:
   - Name: `API_BASE_URL_STAGING`
   - Value: `https://func-ctn-demo-asr-staging.azurewebsites.net/api/v1`
   - Secret: NO
4. Click `Save`
5. Update pipelines to use `$(API_BASE_URL_STAGING)` where needed

---

### Rotating Secrets

**Key Vault secrets are NOT in Variable Groups**, so rotation follows Azure Key Vault procedures:

1. Generate new secret in Azure Portal (Key Vault)
2. Update Key Vault secret value
3. Pipelines automatically fetch latest value on next run
4. No Variable Group changes needed

---

## Security Best Practices

### DO:
- ✅ Store secrets ONLY in Azure Key Vault
- ✅ Use Variable Groups for non-sensitive configuration
- ✅ Restrict Variable Group access to specific pipelines when possible
- ✅ Use descriptive variable names
- ✅ Document purpose of each variable

### DON'T:
- ❌ Store passwords/tokens in Variable Groups (use Key Vault)
- ❌ Make secrets visible (uncheck "Keep this value secret")
- ❌ Share Variable Groups across unrelated projects
- ❌ Use generic names like `VAR1`, `CONFIG`

---

## Troubleshooting

### Issue: Variable not available in pipeline

**Symptom:**
```
ERROR: Variable '$(AZURE_CLIENT_ID)' is not set
```

**Solutions:**
1. Verify Variable Group is referenced in pipeline YAML:
   ```yaml
   variables:
     - group: ASR-Common-Variables
   ```
2. Check Variable Group has correct variable name (case-sensitive)
3. Ensure pipeline has access to Variable Group:
   - Library → Variable Groups → ASR-Common-Variables → Pipeline permissions
4. Re-run pipeline (may need to clear cache)

---

### Issue: Variable has wrong value

**Symptom:**
```
Expected: https://func-ctn-demo-asr-dev.azurewebsites.net/api/v1
Got: $(API_BASE_URL)
```

**Solutions:**
1. Variable not expanded → Missing `$()` syntax in YAML
2. Check Variable Group spelling in YAML
3. Verify variable exists in correct Variable Group
4. Check pipeline has access to Variable Group

---

### Issue: Secret not available from Key Vault

**Symptom:**
```
ERROR: AZURE-STATIC-WEB-APPS-API-TOKEN-ADMIN is not set
```

**Solutions:**
1. Verify `AzureKeyVault@2` task runs BEFORE build step:
   ```yaml
   - task: AzureKeyVault@2
     inputs:
       SecretsFilter: 'AZURE-STATIC-WEB-APPS-API-TOKEN-ADMIN'
       RunAsPreJob: true
   ```
2. Check Key Vault name is correct
3. Verify service connection has Key Vault access
4. Ensure secret exists in Key Vault with exact name

---

## Migration Timeline

**Total Estimated Time:** 2-3 hours

| Phase | Duration | Risk |
|-------|----------|------|
| Create Variable Groups | 30 minutes | Low |
| Update YAML files | 45 minutes | Medium |
| Testing (Admin Portal) | 15 minutes | Medium |
| Testing (Member Portal) | 15 minutes | Medium |
| Testing (ASR API) | 15 minutes | Low |
| Validation & Documentation | 30 minutes | Low |

**Recommended Approach:** Implement during low-traffic period, test thoroughly before merging to main.

---

## Appendix: Variable Group vs. Key Vault Decision Matrix

| Scenario | Use Variable Group | Use Key Vault |
|----------|-------------------|---------------|
| Azure Client ID | ✅ YES | ❌ NO |
| Azure Tenant ID | ✅ YES | ❌ NO |
| API Base URL | ✅ YES | ❌ NO |
| Service Connection Name | ✅ YES | ❌ NO |
| Database Password | ❌ NO | ✅ YES |
| Static Web App Token | ❌ NO | ✅ YES |
| NVD API Key | ❌ NO | ✅ YES |
| E2E Test Password | ❌ NO | ✅ YES |
| Node.js Version | ✅ YES | ❌ NO |
| Resource Group Name | ✅ YES | ❌ NO |

**Rule of Thumb:**
- **Variable Groups:** Configuration, URLs, IDs, non-sensitive settings
- **Key Vault:** Passwords, tokens, API keys, certificates

---

## Support & Questions

**Issues with Variable Groups:**
- Check Azure DevOps documentation: https://learn.microsoft.com/en-us/azure/devops/pipelines/library/variable-groups
- Review pipeline logs for variable expansion errors
- Verify permissions in Library → Variable Groups → Security

**Questions about this implementation:**
- Review this document
- Check CLAUDE.md for project-specific context
- Consult with DevOps team for Azure access

---

**Document Version:** 1.0
**Author:** DevOps Guardian Agent
**Approved By:** (Pending team review)
**Next Review:** After successful migration
