# Infrastructure Bicep Mapping - Azure Reality vs IaC

**Last Updated:** October 27, 2025
**Status:** 69% Infrastructure Drift Detected

---

## Executive Summary

This document maps the current Azure infrastructure against Bicep templates to identify drift and missing IaC definitions.

**Key Findings:**
- **Matched Resources:** 8 out of 26 (31%)
- **Not in Bicep:** 18 resources (69%)
- **Multiple Bicep Structures:** Inconsistent organization

---

## Bicep Structure Overview

### 1. Root Infrastructure (`infrastructure/`)
**Purpose:** Legacy ASR infrastructure
**Target Scope:** Subscription
**Resources Defined:**
- SQL Server (Azure SQL Database)
- Function App (ASR API)
- Single Static Web App
- Storage Account
- Application Insights
- Key Vault
- App Service Plan
- Communication Services
- Event Grid

**Issues:**
- Only defines ONE Static Web App (doesn't differentiate admin vs member)
- Uses Azure SQL instead of PostgreSQL (current reality)
- Missing member portal, orchestrator portal

---

### 2. Modern Infrastructure (`infrastructure/bicep/`)
**Purpose:** Updated modular structure
**Target Scope:** Subscription
**Resources Defined:**
- Core Infrastructure (storage, Key Vault, App Insights)
- Function App (ASR API)
- Static Web Apps module (admin + member portals)
- PostgreSQL Database
- AI Services
- Messaging (Event Grid, Communication Services)
- API Management

**Status:** ✅ More aligned with current Azure reality
**Issues:**
- Still missing orchestrator portal
- Missing automation account
- Missing secondary storage account

---

### 3. Booking Portal (`booking-portal/infrastructure/`)
**Purpose:** DocuFlow (multi-tenant booking system)
**Target Scope:** Resource group `rg-ctn-booking-prod`
**Resources Defined:**
- Function App (booking API)
- Cosmos DB (optimized config)
- Document Intelligence Service ✅
- Static Web App
- Storage Account
- Application Insights
- Key Vault

**Status:** ✅ Complete for DocuFlow
**Deployment:** Independent from ASR

---

### 4. CTN Docs Portal (`ctn-docs-portal/infrastructure/`)
**Purpose:** Documentation portal
**Target Scope:** Resource group (separate)
**Resources Defined:**
- Static Web App
- Function App
- Key Vault
- Monitoring (App Insights)

**Status:** ✅ Complete for docs portal
**Deployment:** Independent

---

## Azure Resources NOT in Bicep Templates

### Critical Missing Resources

#### 1. Member Portal Static Web App
**Azure Name:** `calm-pebble-043b2db03`
**Resource Group:** `rg-ctn-demo-asr-dev`
**URL:** https://calm-pebble-043b2db03.1.azurestaticapps.net
**Status:** 🔴 Manually created, not in Bicep
**Action Required:** Add to `infrastructure/bicep/modules/static-web-apps.bicep`

**Proposed Fix:**
```bicep
// infrastructure/bicep/modules/static-web-apps.bicep
resource memberPortal 'Microsoft.Web/staticSites@2022-03-01' = {
  name: 'calm-pebble-043b2db03'
  location: 'West Europe'
  sku: {
    name: 'Free'
    tier: 'Free'
  }
  properties: {
    repositoryUrl: 'https://github.com/your-org/ASR-full'
    branch: 'main'
    buildProperties: {
      appLocation: 'member-portal'
      outputLocation: 'dist'
    }
  }
}
```

---

#### 2. Orchestrator Portal Static Web App
**Azure Name:** `nice-coast-0e5c01303`
**Resource Group:** `rg-ctn-orchestrator-dev`
**URL:** https://nice-coast-0e5c01303.1.azurestaticapps.net
**Status:** 🔴 No Bicep template exists for orchestrator
**Action Required:** Create `orchestrator-portal/infrastructure/main.bicep`

---

#### 3. Orchestrator Cosmos DB
**Azure Name:** `cosmos-ctn-orchestrator-dev`
**Resource Group:** `rg-ctn-orchestrator-dev`
**Endpoint:** https://cosmos-ctn-orchestrator-dev.documents.azure.com:443/
**Status:** 🔴 Not in Bicep
**Action Required:** Add to orchestrator infrastructure template

---

#### 4. PostgreSQL Automation Account
**Azure Name:** `aa-psql-start-stop`
**Resource Group:** `rg-ctn-demo-asr-dev`
**Purpose:** Auto-start/stop PostgreSQL server to save costs
**Status:** 🔴 Not in Bicep
**Action Required:** Create `infrastructure/bicep/modules/automation-account.bicep`

**Runbooks:**
- Start PostgreSQL server (scheduled for business hours)
- Stop PostgreSQL server (scheduled for off-hours)

---

#### 5. Secondary Storage Account
**Azure Name:** `stctnasrdev96858`
**Resource Group:** `rg-ctn-demo-asr-dev`
**Purpose:** ⚠️ Unknown - requires investigation
**Status:** 🔴 Not in Bicep
**Action Required:** Investigate purpose, document, then add to Bicep or remove if unused

---

### Lower Priority Missing Resources

#### 6. Admin Portal Deployment Token (Key Vault Secret)
**Secret Name:** `admin-portal-deployment-token`
**Status:** ⚠️ Not in `infrastructure/bicep/modules/key-vault-secrets.bicep`

#### 7. Member Portal Deployment Token (Key Vault Secret)
**Secret Name:** `member-portal-deployment-token`
**Status:** ⚠️ Not in key-vault-secrets module

#### 8. Orchestrator Deployment Token (Key Vault Secret)
**Secret Name:** Not yet created
**Status:** 🔴 Missing from Key Vault AND Bicep

#### 9. KVK API Key (Key Vault Secret)
**Secret Name:** `KVK-API-KEY`
**Status:** ⚠️ Manually added, not in Bicep

#### 10. Document Intelligence Key (Key Vault Secret)
**Secret Name:** `DOC-INTELLIGENCE-KEY`
**Status:** ⚠️ Manually added, not in Bicep

#### 11. Anthropic API Key (Key Vault Secret)
**Secret Name:** `ANTHROPIC-API-KEY`
**Vault:** `kv-booking-prod`
**Status:** ⚠️ Manually added, not in Bicep

---

## Matched Resources (In Bicep AND Azure) ✅

| Resource | Bicep Template | Azure Resource | Status |
|----------|---------------|----------------|---------|
| ASR Function App | `infrastructure/bicep/modules/function-app.bicep` | `func-ctn-demo-asr-dev` | ✅ Matched |
| Admin Portal | `infrastructure/bicep/modules/static-web-apps.bicep` | `calm-tree-03352ba03` | ✅ Matched |
| PostgreSQL Server | `infrastructure/bicep/modules/database.bicep` | `psql-ctn-demo-asr-dev` | ✅ Matched |
| Storage Account (ASR) | `infrastructure/bicep/modules/core-infrastructure.bicep` | `stctndemov1asrdev` | ✅ Matched |
| Key Vault (ASR) | `infrastructure/bicep/modules/core-infrastructure.bicep` | `kv-ctn-demo-asr-dev` | ✅ Matched |
| App Insights (ASR) | `infrastructure/bicep/modules/core-infrastructure.bicep` | `appi-ctn-demo-asr-dev` | ✅ Matched |
| Booking Function App | `booking-portal/infrastructure/main.bicep` | `func-ctn-booking-prod` | ✅ Matched |
| Booking Cosmos DB | `booking-portal/infrastructure/modules/cosmosdb-optimized.bicep` | `cosmos-ctn-booking-prod` | ✅ Matched |

---

## Recommended Actions

### Priority 1: Critical Infrastructure Drift (Week 1)

1. **Add Member Portal to Bicep**
   - Update `infrastructure/bicep/modules/static-web-apps.bicep`
   - Include deployment token parameter
   - Document GitHub Actions integration

2. **Create Orchestrator Infrastructure**
   - Create `orchestrator-portal/infrastructure/main.bicep`
   - Define: Static Web App, Cosmos DB, Key Vault, App Insights
   - Separate resource group: `rg-ctn-orchestrator-dev`

3. **Add Automation Account**
   - Create `infrastructure/bicep/modules/automation-account.bicep`
   - Define runbooks for PostgreSQL start/stop
   - Configure schedules

4. **Investigate Secondary Storage Account**
   - Query Azure: `az storage account show --name stctnasrdev96858 --resource-group rg-ctn-demo-asr-dev`
   - Document purpose
   - Add to Bicep or mark for deletion

---

### Priority 2: Secrets Management (Week 2)

5. **Expand Key Vault Secrets Module**
   - Add missing secrets to `infrastructure/bicep/modules/key-vault-secrets.bicep`
   - Include: KVK API Key, Document Intelligence Key, deployment tokens
   - Use secure parameters for sensitive values

6. **Booking Portal Key Vault Secrets**
   - Update `booking-portal/infrastructure/modules/keyvault.bicep`
   - Add Anthropic API Key as secure parameter

---

### Priority 3: Documentation & Consolidation (Week 3)

7. **Deprecate Legacy Infrastructure**
   - Archive `infrastructure/main.bicep` and old modules
   - Use only `infrastructure/bicep/` structure going forward
   - Update pipeline references

8. **Create Deployment Guide**
   - Document Bicep deployment procedures
   - Explain parameter files
   - Include troubleshooting steps

---

## Deployment Commands

### ASR Infrastructure
```bash
# Deploy ASR infrastructure (admin + member portals + API + database)
az deployment sub create \
  --location westeurope \
  --template-file infrastructure/bicep/main.bicep \
  --parameters \
    environment=dev \
    databaseAdminPassword="<secure-password>" \
    enableSecretsDeployment=true \
    aikidoCiApiKey="<key>" \
    adminPortalDeployToken="<token>" \
    memberPortalDeployToken="<token>"
```

### Booking Portal (DocuFlow)
```bash
# Deploy booking portal infrastructure (separate)
az deployment group create \
  --resource-group rg-ctn-booking-prod \
  --template-file booking-portal/infrastructure/main.bicep \
  --parameters \
    environment=prod \
    cosmosDbAccountName=cosmos-ctn-booking-prod
```

### Orchestrator Portal
```bash
# TODO: Create orchestrator-portal/infrastructure/main.bicep first
az deployment group create \
  --resource-group rg-ctn-orchestrator-dev \
  --template-file orchestrator-portal/infrastructure/main.bicep \
  --parameters environment=dev
```

---

## Bicep Best Practices to Implement

1. **Modular Structure** ✅ Already using modules
2. **Parameter Files** ⚠️ Not using .bicepparam files yet
3. **Outputs** ✅ Good output definitions
4. **Dependencies** ✅ Using `dependsOn` correctly
5. **Naming Conventions** ✅ Consistent naming
6. **Secrets Management** ⚠️ Some secrets manually added
7. **RBAC Assignments** ✅ Key Vault access properly configured
8. **Tagging Strategy** ✅ Common tags applied

---

## Related Documents

- **DevOps Infrastructure Audit:** `docs/DEVOPS_INFRASTRUCTURE_AUDIT_2025-10-27.md`
- **Deployment Architecture (Booking):** `docs/DEPLOYMENT_ARCHITECTURE_BOOKING_PORTAL.md`
- **Pipeline Architecture:** CLAUDE.md lines 19-80

---

## Changelog

| Date | Author | Changes |
|------|--------|---------|
| 2025-10-27 | Claude Code (CR + DG agents) | Initial infrastructure audit and mapping |
