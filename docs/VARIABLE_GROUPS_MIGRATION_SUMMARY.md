# Variable Groups Migration Summary

**Task:** TASK-DG-VARS-001 - Centralize Environment Variables
**Date:** November 17, 2025
**Status:** Ready for Implementation

---

## Overview

This document summarizes the Variable Groups centralization effort for the CTN ASR monorepo Azure DevOps pipelines.

### Problem Statement

Environment variables were duplicated across 5 pipeline YAML files, leading to:
- Configuration drift (same value repeated 5 times)
- Tedious updates (change Azure Client ID → update 5 files)
- Increased risk of errors (typos, missing updates)
- No single source of truth

### Solution

Centralize shared configuration values into Azure DevOps Variable Groups while keeping portal-specific and secret values properly isolated.

---

## Files Delivered

### Documentation

1. **`docs/AZURE_DEVOPS_VARIABLE_GROUPS_SETUP.md`** (52 KB)
   - Complete implementation guide with step-by-step instructions
   - Variable classification (shared vs. portal-specific vs. secrets)
   - Proposed Variable Group structure
   - Azure DevOps UI walkthrough
   - Troubleshooting guide
   - Rollback procedures
   - Security best practices

### Updated Pipeline YAML Files

2. **`.azure-pipelines/admin-portal.yml.new`** (Updated admin portal pipeline)
   - References `ASR-Common-Variables` Variable Group
   - References `ctn-admin-portal-variables` Variable Group
   - Removed hardcoded values from build step
   - Added validation for Variable Group availability

3. **`.azure-pipelines/member-portal.yml.new`** (Updated member portal pipeline)
   - References `ASR-Common-Variables` Variable Group
   - References `ctn-member-portal-variables` Variable Group
   - Removed hardcoded values from build step
   - Added validation for Variable Group availability

4. **`.azure-pipelines/asr-api.yml.new`** (Updated ASR API pipeline)
   - References `ASR-Common-Variables` Variable Group
   - Uses shared `AZURE_SUBSCRIPTION` and `KEY_VAULT_NAME` variables
   - Keeps API-specific `functionAppName` inline

5. **`docs/VARIABLE_GROUPS_MIGRATION_SUMMARY.md`** (This file)
   - Migration summary and quick reference

---

## Variable Groups Strategy

### Variable Group 1: `ASR-Common-Variables` (NEW)

**Purpose:** Shared configuration across ALL ASR pipelines

**Variables:**
```
AZURE_CLIENT_ID = d3037c11-a541-4f21-8862-8079137a0cde
AZURE_TENANT_ID = 598664e7-725c-4daa-bd1f-89c4ada717ff
API_BASE_URL = https://func-ctn-demo-asr-dev.azurewebsites.net/api/v1
AZURE_SUBSCRIPTION = Azure-CTN-ASR-ServiceConnection
KEY_VAULT_NAME = kv-ctn-demo-asr-dev
NODE_VERSION = 20.x
```

**Used By:** Admin Portal, Member Portal, ASR API, Playwright Tests

---

### Variable Group 2: `ctn-admin-portal-variables` (EXISTING - POPULATE)

**Purpose:** Admin portal-specific configuration

**Variables:**
```
VITE_REDIRECT_URI = https://calm-tree-03352ba03.1.azurestaticapps.net
PORTAL_URL = https://calm-tree-03352ba03.1.azurestaticapps.net
FRONT_DOOR_URL = https://admin-ctn-dev-gma8fnethbetbjgj.z02.azurefd.net
```

**Used By:** Admin Portal pipeline only

---

### Variable Group 3: `ctn-member-portal-variables` (EXISTING - POPULATE)

**Purpose:** Member portal-specific configuration

**Variables:**
```
VITE_REDIRECT_URI = https://calm-pebble-043b2db03.1.azurestaticapps.net
PORTAL_URL = https://calm-pebble-043b2db03.1.azurestaticapps.net
FRONT_DOOR_URL = https://portal-ctn-dev-fdb5cpeagdendtck.z02.azurefd.net
```

**Used By:** Member Portal pipeline only

---

### Variable Group 4: `playwright-secrets` (EXISTING - NO CHANGES)

**Purpose:** E2E test configuration

**Variables:**
```
PlaywrightBaseURL = https://calm-tree-03352ba03.1.azurestaticapps.net
E2ETestUserEmail = test-e2@denoronha.consulting
E2ETestUserPassword = (Link to Key Vault)
```

**Used By:** Playwright tests pipeline

---

### Variable Group 5: `ctn-demo-variables` (EXISTING - NO CHANGES)

**Purpose:** Infrastructure deployment

**Variables:**
```
DATABASE_ADMIN_PASSWORD = (Link to Key Vault)
DATABASE_ADMIN_PASSWORD_PROD = (Link to Key Vault)
```

**Used By:** Bicep infrastructure pipeline

---

## What Changed

### Before (Hardcoded in YAML)

```yaml
# admin-portal.yml
- script: |
    npm run build -w admin-portal
  env:
    VITE_AZURE_CLIENT_ID: d3037c11-a541-4f21-8862-8079137a0cde
    VITE_AZURE_TENANT_ID: 598664e7-725c-4daa-bd1f-89c4ada717ff
    VITE_REDIRECT_URI: https://calm-tree-03352ba03.1.azurestaticapps.net
    VITE_API_URL: https://func-ctn-demo-asr-dev.azurewebsites.net/api/v1
```

### After (Using Variable Groups)

```yaml
# admin-portal.yml.new
variables:
  - group: ASR-Common-Variables
  - group: ctn-admin-portal-variables

steps:
  - script: |
      npm run build -w admin-portal
    env:
      VITE_AZURE_CLIENT_ID: $(AZURE_CLIENT_ID)
      VITE_AZURE_TENANT_ID: $(AZURE_TENANT_ID)
      VITE_REDIRECT_URI: $(VITE_REDIRECT_URI)
      VITE_API_URL: $(API_BASE_URL)
```

**Result:** Change Azure Client ID once in Variable Group → applies to all pipelines immediately.

---

## Benefits Achieved

### Maintenance

- **Before:** Update Azure Client ID → Edit 5 YAML files → Commit → Push
- **After:** Update Azure Client ID → Edit 1 Variable Group → Done (no code changes)

### Consistency

- **Before:** Risk of typos, different values across pipelines
- **After:** Single source of truth, guaranteed consistency

### Auditability

- **Before:** Git history for YAML changes
- **After:** Azure DevOps Variable Group audit log + Git history

### Time Savings

- **Change frequency:** ~10-15 times per year (new environments, client ID rotation)
- **Time saved per change:** ~15 minutes (no YAML editing, testing, committing)
- **Annual time savings:** ~2.5-4 hours

---

## Migration Steps (Quick Reference)

**Detailed steps in `docs/AZURE_DEVOPS_VARIABLE_GROUPS_SETUP.md`**

### Phase 1: Create Variable Groups (30 minutes)

1. Navigate to Azure DevOps → Pipelines → Library
2. Create `ASR-Common-Variables` Variable Group with 6 variables
3. Populate `ctn-admin-portal-variables` with 3 variables
4. Populate `ctn-member-portal-variables` with 3 variables
5. Grant pipeline access permissions

### Phase 2: Update Pipeline YAML Files (45 minutes)

1. Replace `.azure-pipelines/admin-portal.yml` with `admin-portal.yml.new`
2. Replace `.azure-pipelines/member-portal.yml` with `member-portal.yml.new`
3. Replace `.azure-pipelines/asr-api.yml` with `asr-api.yml.new`
4. Remove `.new` files after verification

### Phase 3: Testing (45 minutes)

1. Test Admin Portal pipeline → Verify Variable Group expansion
2. Test Member Portal pipeline → Verify Variable Group expansion
3. Test ASR API pipeline → Verify deployment succeeds
4. Verify deployed portals work correctly

### Phase 4: Cleanup (15 minutes)

1. Remove `.new` YAML files
2. Update `COMPLETED_ACTIONS.md` documentation
3. Notify team of Variable Group centralization

**Total Time:** ~2-3 hours

---

## Rollback Plan

If Variable Groups cause issues:

### Option 1: Revert YAML Files (2 minutes)

```bash
git revert <commit-hash>
git push origin main
```

### Option 2: Quick Fix - Hardcode Values Back (5 minutes)

Comment out Variable Group reference, add hardcoded values:

```yaml
variables:
  # - group: ASR-Common-Variables  # DISABLED
  - name: AZURE_CLIENT_ID
    value: 'd3037c11-a541-4f21-8862-8079137a0cde'
```

### Option 3: Fix Variable Group (10 minutes)

Check Variable Group configuration, add missing variables, grant permissions.

---

## Security Considerations

### What's in Variable Groups (Non-Secret)

- Azure Client ID (public, safe to expose)
- Azure Tenant ID (public, safe to expose)
- API URLs (public endpoints)
- Service Connection names (internal identifiers)
- Node.js versions (configuration)

### What's in Key Vault (Secrets)

- Static Web App deployment tokens (AZURE-STATIC-WEB-APPS-API-TOKEN-*)
- NVD API Key (NVD-API-KEY)
- Database passwords (DATABASE_ADMIN_PASSWORD)
- E2E test passwords (E2ETestUserPassword)

**Rule:** Variable Groups = Configuration, Key Vault = Secrets

---

## Testing Checklist

Before declaring migration complete:

- [ ] Variable Group `ASR-Common-Variables` created with 6 variables
- [ ] Variable Group `ctn-admin-portal-variables` populated with 3 variables
- [ ] Variable Group `ctn-member-portal-variables` populated with 3 variables
- [ ] Admin Portal pipeline runs successfully
- [ ] Member Portal pipeline runs successfully
- [ ] ASR API pipeline runs successfully
- [ ] Deployed Admin Portal accessible and functional
- [ ] Deployed Member Portal accessible and functional
- [ ] API health endpoint returns 200
- [ ] No hardcoded secrets in YAML files
- [ ] Pipeline logs show correct variable expansion

---

## Next Steps

1. **Review this summary and setup guide**
2. **Create Variable Groups in Azure DevOps** (Phase 1)
3. **Replace YAML files** (Phase 2)
4. **Test pipelines** (Phase 3)
5. **Monitor for issues** (24 hours post-migration)
6. **Update team documentation**

---

## Support

**Documentation:**
- Setup Guide: `docs/AZURE_DEVOPS_VARIABLE_GROUPS_SETUP.md`
- Project Context: `CLAUDE.md`

**Azure DevOps Resources:**
- Organization: https://dev.azure.com/ctn-demo
- Project: ASR
- Pipelines: https://dev.azure.com/ctn-demo/ASR/_build
- Library: https://dev.azure.com/ctn-demo/ASR/_library

**Key Contacts:**
- DevOps Guardian Agent: Documentation and implementation
- Team Lead: Final approval and rollout coordination

---

## Appendix: Variable Mapping

### Admin Portal Build Variables

| YAML Variable | Source Variable Group | Source Variable Name |
|---------------|----------------------|----------------------|
| `VITE_AZURE_CLIENT_ID` | ASR-Common-Variables | `AZURE_CLIENT_ID` |
| `VITE_AZURE_TENANT_ID` | ASR-Common-Variables | `AZURE_TENANT_ID` |
| `VITE_API_URL` | ASR-Common-Variables | `API_BASE_URL` |
| `VITE_REDIRECT_URI` | ctn-admin-portal-variables | `VITE_REDIRECT_URI` |

### Member Portal Build Variables

| YAML Variable | Source Variable Group | Source Variable Name |
|---------------|----------------------|----------------------|
| `VITE_AZURE_CLIENT_ID` | ASR-Common-Variables | `AZURE_CLIENT_ID` |
| `VITE_AZURE_TENANT_ID` | ASR-Common-Variables | `AZURE_TENANT_ID` |
| `VITE_API_BASE_URL` | ASR-Common-Variables | `API_BASE_URL` |
| `VITE_API_CLIENT_ID` | ASR-Common-Variables | `AZURE_CLIENT_ID` |
| `VITE_REDIRECT_URI` | ctn-member-portal-variables | `VITE_REDIRECT_URI` |
| `VITE_AAD_CLIENT_ID` | ASR-Common-Variables | `AZURE_CLIENT_ID` |
| `VITE_AAD_AUTHORITY` | Constructed from `AZURE_TENANT_ID` | |
| `VITE_AAD_REDIRECT_URI` | ctn-member-portal-variables | `VITE_REDIRECT_URI` |

### ASR API Variables

| Pipeline Variable | Source Variable Group | Source Variable Name |
|------------------|----------------------|----------------------|
| `azureSubscription` | ASR-Common-Variables | `AZURE_SUBSCRIPTION` |
| `KeyVaultName` | ASR-Common-Variables | `KEY_VAULT_NAME` |

---

**Document Version:** 1.0
**Generated By:** DevOps Guardian Agent (TASK-DG-VARS-001)
**Approved By:** Pending team review
**Next Review:** After successful migration
