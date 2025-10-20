# Portal Status Report - October 20, 2025

## Overview

This report documents the current status of all CTN portals, including issues identified and remediation steps.

---

## Portal Status Summary

| Portal | URL | Status | Issue | Remediation |
|--------|-----|--------|-------|-------------|
| **Admin Portal** | https://calm-tree-03352ba03.1.azurestaticapps.net | ✅ Working | None | N/A |
| **Member Portal** | https://calm-pebble-043b2db03.1.azurestaticapps.net | ✅ Working | None | N/A |
| **Orchestrator Portal** | https://blue-dune-0353f1303.1.azurestaticapps.net | ⚠️ Empty Page | Backend API not deployed | Deploy orchestration endpoints |
| **Booking Portal** | https://polite-cliff-007b74703.5.azurestaticapps.net | ❌ 404 Error | Not deployed or misconfigured | Deploy or reconfigure Static Web App |
| **Documentation Portal** | https://delightful-desert-0e783ed03.1.azurestaticapps.net | ✅ Working | Mobile responsiveness needed | Implement responsive sidebar |

---

## 1. Orchestrator Portal (Empty Page) 🟡

### Issue Description
- **URL:** https://blue-dune-0353f1303.1.azurestaticapps.net
- **Current State:** Portal loads but shows empty/no data
- **Root Cause:** Frontend is deployed but backend API endpoints are missing

### Technical Details

**Frontend Status:** ✅ Deployed
- React app built and deployed successfully
- `dist/` folder contains all assets
- Static Web App is configured correctly

**Backend Status:** ❌ Not Implemented
The portal requires these API endpoints which don't exist in production:
- `GET /api/v1/orchestrations` - List orchestrations
- `GET /api/v1/orchestrations/:id` - Get orchestration details
- `GET /api/v1/events` - List events
- `GET /api/v1/webhooks` - List webhooks

**Expected Behavior:**
When these endpoints are missing, the portal shows an empty state because there's no data to display.

### Solution Options

#### Option 1: Implement Production API (Recommended)
**Timeline:** 8 hours
**Steps:**
1. Create Azure Functions for orchestration endpoints
2. Implement business logic for container transport orchestrations
3. Deploy to `func-ctn-demo-asr-dev`
4. Test with Orchestrator Portal

**Benefits:**
- Full production functionality
- Real data from database
- Multi-tenant support

#### Option 2: Use Mock API (Development Only)
**Timeline:** 5 minutes
**Steps:**
```bash
cd orchestrator-portal
npm run mock-api:dev  # Starts mock API on http://localhost:3001
npm run dev           # Starts portal on http://localhost:5173
```

**Benefits:**
- Immediate testing capability
- 45 mock orchestrations with realistic data
- 72 Playwright E2E tests all passing

**Limitations:**
- Local development only
- Not suitable for production

### Verification

Once backend endpoints are deployed, verify:
1. Portal loads with data in dashboard
2. Orchestrations grid shows records
3. Event feed displays recent events
4. No console errors related to API calls

---

## 2. Booking Portal (404 Error) 🔴

### Issue Description
- **URL:** https://polite-cliff-007b74703.5.azurestaticapps.net
- **Current State:** Microsoft 404 page
- **Root Cause:** Static Web App not deployed or misconfigured

### Technical Details

**Build Status:** ✅ Build artifacts exist
- Located: `booking-portal/web/build/`
- Contains: `index.html` and `assets/` folder
- Build process: Working

**Deployment Status:** ❌ Not deployed or misconfigured

**Azure Pipeline Configuration:**
- Pipeline file: `booking-portal/azure-pipelines.yml`
- Variable group: `ctn-booking-portal-variables`
- Static Web App name: `swa-ctn-booking-prod`
- Deployment token variable: `$(AZURE_STATIC_WEB_APPS_API_TOKEN_BOOKING)`

### Possible Causes

1. **Static Web App doesn't exist**
   - The Azure resource `swa-ctn-booking-prod` may not be created
   - URL points to a different or non-existent resource

2. **Pipeline never ran**
   - Check Azure DevOps pipeline history
   - Variable group may be missing deployment token

3. **Deployment token incorrect**
   - Token may be expired or invalid
   - Token may be for wrong Static Web App

4. **Build artifacts not uploaded**
   - Deployment step may have failed
   - App location may be incorrect in pipeline

### Solution Steps

#### Step 1: Verify Azure Resource Exists
```bash
az staticwebapp list --query "[?name=='swa-ctn-booking-prod']"
```

If it doesn't exist, check the actual URL in Azure Portal:
1. Go to https://portal.azure.com
2. Search for "polite-cliff-007b74703"
3. Note the actual Static Web App name

#### Step 2: Check Pipeline Status
1. Go to Azure DevOps: https://dev.azure.com/ctn-demo/ASR/_build
2. Look for booking-portal pipeline
3. Check last run status and logs

#### Step 3: Verify Deployment Token
The deployment token should be stored in:
- Variable group: `ctn-booking-portal-variables`
- Variable name: `AZURE_STATIC_WEB_APPS_API_TOKEN_BOOKING`

To get correct token from Azure Portal:
1. Open the Static Web App resource
2. Click "Manage deployment token"
3. Copy the token
4. Update variable group in Azure DevOps

#### Step 4: Trigger Deployment
```bash
cd booking-portal/web
npm run build
npx @azure/static-web-apps-cli deploy ./build \
  --deployment-token <token-from-credentials> \
  --env production
```

Or trigger via git push (if pipeline is configured):
```bash
git commit --allow-empty -m "trigger: Redeploy booking portal"
git push origin main
```

### Verification

Once deployed successfully:
1. Navigate to https://polite-cliff-007b74703.5.azurestaticapps.net
2. Should see booking portal login page
3. No 404 errors
4. Check browser console for any errors

---

## 3. Documentation Portal (Mobile Responsiveness) 🟡

### Issue Description
- **URL:** https://delightful-desert-0e783ed03.1.azurestaticapps.net
- **Current State:** Working on desktop, not usable on mobile
- **Impact:** Poor UX on iPhone and other mobile devices

### Technical Details

**Current Implementation:**
- Sidebar: Fixed/static sidebar (likely always visible)
- Not responsive: Sidebar doesn't collapse on mobile
- Suggested: Replace with Kendo collapsible sidebar component

### Required Changes

1. **Replace sidebar with Kendo Drawer component**
   - Use `@progress/kendo-react-layout` Drawer
   - Make it responsive (collapsed on mobile, expanded on desktop)
   - Add hamburger menu button for mobile

2. **Add recent documents cards**
   - Card 1: 5 most recently added arc42 documents
   - Card 2: 5 most recently updated arc42 documents
   - Remove old "Recent Documentation" and "Recent Updates" sections

3. **Relocate Azure DevOps link**
   - Remove icon from top right
   - Add "Azure DevOps" to top menu

4. **Create new pages**
   - Architecture Diagram page with embedded IcePanel
   - How To document for updating Arc42 docs

**Status:** ✅ In progress (tasks 5-9 being implemented by CA agent)

---

## Action Items

### Immediate (Do Now)
1. ⏳ Document portal issues (this file) - **DONE**
2. ⏳ Implement responsive sidebar for docs portal (CA agent)
3. ⏳ Add recent documents cards (CA agent)
4. ⏳ Create Architecture Diagram page (CA agent)

### Short-term (This Week)
1. ⏳ Investigate booking portal deployment status
2. ⏳ Deploy booking portal if not deployed
3. ⏳ Implement orchestration API endpoints (8 hours)
4. ⏳ Test Orchestrator Portal with real API

### Medium-term (Next Sprint)
1. ⏳ Complete booking portal backend (.NET API)
2. ⏳ Set up Cosmos DB for booking data
3. ⏳ Configure Azure Document Intelligence
4. ⏳ E2E testing for all portals

---

## Quick Reference

### Deployment Commands

**Orchestrator Portal:**
```bash
cd orchestrator-portal
npm run build
npx @azure/static-web-apps-cli deploy ./dist \
  --deployment-token $ORCHESTRATOR_PORTAL_DEPLOYMENT_TOKEN \
  --env production
```

**Booking Portal:**
```bash
cd booking-portal/web
npm run build
npx @azure/static-web-apps-cli deploy ./build \
  --deployment-token <booking-portal-token> \
  --env production
```

**Documentation Portal:**
```bash
cd ctn-docs-portal
npm run build
npx @azure/static-web-apps-cli deploy ./public \
  --deployment-token $DOCS_PORTAL_DEPLOYMENT_TOKEN \
  --env production
```

### Azure DevOps Pipelines

- **Admin Portal:** https://dev.azure.com/ctn-demo/ASR/_build?definitionId=1
- **Member Portal:** https://dev.azure.com/ctn-demo/ASR/_build?definitionId=2
- **Orchestrator Portal:** https://dev.azure.com/ctn-demo/ASR/_build?definitionId=7
- **Booking Portal:** Check Azure DevOps for pipeline
- **Documentation Portal:** Submodule deployment

---

## Summary

**Working:** 3 portals (Admin, Member, Documentation)
**Issues:** 2 portals (Orchestrator - empty, Booking - 404)
**Root Causes:** Missing backend APIs, possible deployment failures
**Solution:** Implement orchestration API, investigate/redeploy booking portal

All issues are solvable with clear action paths documented above.
