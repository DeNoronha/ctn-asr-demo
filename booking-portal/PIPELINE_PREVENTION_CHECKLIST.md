# Pipeline Prevention Checklist

**Purpose**: Prevent recurring pipeline failures by following this checklist before committing changes.

## Before Committing Any Code

### 1. Local Build Test ✅
```bash
# Test API build
cd booking-portal/api
npm ci
npm run build

# Verify all functions compiled
ls -la UploadDocument/index.js GetBookings/index.js GetTenants/index.js ValidateBooking/index.js GetDocumentSasUrl/index.js

# Test Frontend build
cd ../web
npm ci
npm run build

# Verify build output
ls -la build/index.html build/static/
```

**Pass criteria**: Both builds succeed with no errors

### 2. Local Function Test ✅
```bash
# Start Functions locally
cd booking-portal/api
func start --port 7072

# In another terminal, test endpoints
curl http://localhost:7072/api/v1/tenants
curl http://localhost:7072/api/v1/bookings

# Ctrl+C to stop
```

**Pass criteria**: Functions start without errors, endpoints respond

### 3. Lint & Type Check ✅
```bash
# API
cd booking-portal/api
npm run lint

# Frontend
cd booking-portal/web
npm run lint
```

**Pass criteria**: No linting errors (warnings OK)

### 4. Check for Secrets ✅
```bash
# Run from repo root
git diff --cached | grep -iE "(password|secret|key|token|credential)" | grep -vE "(KeyCredential|SecretClient|KEY_VAULT)"

# Should return nothing
```

**Pass criteria**: No secrets in staged changes

## Before Modifying Pipeline YAML

### 5. Validate YAML Syntax ✅
```bash
# Install validator if needed
npm install -g yaml-validator

# Validate syntax
yaml-validator booking-portal/azure-pipelines.yml
```

**Pass criteria**: YAML is valid

### 5a. Verify Service Connection Names & Scope ✅
```bash
# IMPORTANT: Don't guess service connection names!
# Query Azure DevOps for actual names:
az devops service-endpoint list \
  --org https://dev.azure.com/ctn-demo \
  --project ASR \
  --query "[].{name:name, type:type}" -o table

# Available service connections:
# - azure-ctn-demo (subscription-wide access)
# - Azure-CTN-ASR-ServiceConnection (scoped to rg-ctn-demo-asr-dev only)

# Check service connection subscription:
az devops service-endpoint show \
  --org https://dev.azure.com/ctn-demo \
  --project ASR \
  --id <service-connection-id> \
  --query "data.subscriptionId"

# Verify target resources exist and are accessible:
az functionapp list --query "[?name=='func-ctn-booking-prod'].{name:name, rg:resourceGroup}"
az staticwebapp list --query "[?name=='swa-ctn-booking-prod'].{name:name, rg:resourceGroup}"
```

**Pass criteria**:
- Service connection exists in Azure DevOps
- Service connection has access to target resource group
- Target resources exist in Azure

### 6. Review Deployment Architecture ✅

Read `DEPLOYMENT_ARCHITECTURE.md` and confirm:

- [ ] Do you understand the separate deployment model?
- [ ] Is the change aligned with the architecture?
- [ ] Are you adding `api_location` to Static Web App? (DON'T!)
- [ ] Are you modifying service connections correctly?
- [ ] Are you changing variable references correctly?

### 7. Test in Feature Branch FIRST ✅
```bash
# ALWAYS create a feature branch for pipeline changes
git checkout -b fix/pipeline-improvement
git add azure-pipelines.yml
git commit -m "fix: improve pipeline deployment"
git push origin fix/pipeline-improvement

# Create PR → PR validation pipeline runs
# Only merge if PR pipeline succeeds
```

**Pass criteria**: PR validation pipeline succeeds

## Before Merging to Main

### 8. PR Validation Pipeline Check ✅

In Azure DevOps:
- [ ] PR validation pipeline completed successfully
- [ ] All stages passed (Validate, Build, SecurityScan)
- [ ] No errors in logs
- [ ] Reviewer approved the changes

### 9. Deployment Impact Assessment ✅

Answer these questions:
- [ ] Will this change affect production immediately?
- [ ] Do I need to coordinate with users?
- [ ] Is there a rollback plan?
- [ ] Are environment variables updated in Azure?
- [ ] Are service connections configured?

### 10. Final Sanity Check ✅
```bash
# Review your changes one more time
git diff main...HEAD

# Check commit messages are descriptive
git log --oneline -5

# Ensure no accidental changes
git status
```

## After Merging to Main

### 11. Monitor Pipeline ✅

**Immediately after merge**:
1. Open Azure DevOps: https://dev.azure.com/ctn-demo/ASR/_build
2. Find your build (should start within 30 seconds)
3. Watch stages: Build → DeployDev
4. Check for errors in real-time

**Set a timer**: Don't walk away! Stay for 5-10 minutes until deployment completes.

### 12. Verify Deployment ✅

**API**:
```bash
# Check API health
curl https://func-ctn-booking-prod.azurewebsites.net/api/health

# Check function logs
func azure functionapp logstream func-ctn-booking-prod --timeout 20
```

**Frontend**:
- Open browser: https://[static-web-app-url]
- Check console for errors
- Test authentication flow
- Test key functionality

### 13. Smoke Test ✅

Perform basic user flow:
1. Login with Azure AD
2. Navigate to Upload page
3. Upload a test document
4. Verify document appears in Bookings list
5. Open validation page
6. Verify PDF displays

**Pass criteria**: All steps complete without errors

## Emergency Response

### If Pipeline Fails

1. **Don't panic** - Most failures are recoverable
2. **Read the error logs carefully** in Azure DevOps
3. **Check recent commits** - Did something change?
4. **Revert if needed**:
   ```bash
   git revert HEAD
   git push origin main
   ```
5. **Fix in feature branch**, test with PR pipeline
6. **Merge fix** only after PR validation succeeds

### If Deployment Succeeds but App Broken

1. **Check Function App logs**:
   ```bash
   func azure functionapp logstream func-ctn-booking-prod
   ```
2. **Check browser console** for frontend errors
3. **Verify environment variables** in Azure Portal
4. **Rollback if critical**:
   ```bash
   git revert HEAD
   git push origin main
   ```
5. **Investigate root cause** before attempting fix

## Pipeline Failure Patterns

### Pattern: "function language detected is unsupported"
- **Cause**: Added `api_location` to Static Web App deployment
- **Fix**: Remove `api_location`, deploy API separately
- **Prevention**: Read DEPLOYMENT_ARCHITECTURE.md before changing pipeline

### Pattern: "Service connection not found"
- **Cause**: Incorrect `azureSubscription` name
- **Fix**: Use exact service connection name from Azure DevOps
- **Prevention**: Check Azure DevOps → Project Settings → Service Connections

### Pattern: "Variable group not found"
- **Cause**: Variable group name doesn't exist or wrong scope
- **Fix**: Create variable group or use correct name
- **Prevention**: Check Azure DevOps → Pipelines → Library

### Pattern: "Function deployment succeeds but 404 errors"
- **Cause**: Functions not registered in entry point
- **Fix**: Check `api/src/functions/essential-index.ts` imports
- **Prevention**: Run `func start` locally before committing

### Pattern: "TypeScript compilation errors"
- **Cause**: Type mismatches, missing dependencies
- **Fix**: Run `npm run build` locally, fix errors
- **Prevention**: Always build locally before committing

## Quick Reference Commands

```bash
# Build everything locally
cd booking-portal/api && npm ci && npm run build && cd ../web && npm ci && npm run build

# Test API locally
cd booking-portal/api && func start --port 7072

# Test Frontend locally
cd booking-portal/web && npm run dev

# Check git status
git status

# Create feature branch
git checkout -b fix/your-feature-name

# Push and create PR
git push origin fix/your-feature-name

# Monitor Azure pipeline
open https://dev.azure.com/ctn-demo/ASR/_build

# Check Function App logs
func azure functionapp logstream func-ctn-booking-prod --timeout 20

# Emergency revert
git revert HEAD && git push origin main
```

## Lessons Learned Database

When you encounter a new pipeline failure:

1. **Document it** in this section
2. **Add prevention step** to checklist
3. **Update DEPLOYMENT_ARCHITECTURE.md** if architecture-related

### Lesson #1: Never test pipeline changes on main
**Date**: October 20, 2025
**Cost**: 10+ failed builds
**Root cause**: Added `api_location` without understanding architecture
**Prevention**: Always use PR validation pipeline

### Lesson #2: Azure Static Web Apps != Integrated Functions
**Date**: October 20, 2025
**Learning**: TypeScript Azure Functions must be deployed separately
**Prevention**: Read DEPLOYMENT_ARCHITECTURE.md before making changes

### Lesson #3: Managed Identity requires role assignments
**Date**: October 20, 2025
**Learning**: Function App couldn't access blob storage without "Storage Blob Data Contributor" role
**Prevention**: Document all Azure RBAC requirements in DEPLOYMENT_ARCHITECTURE.md

### Lesson #4: Service connection scope matters
**Date**: October 20, 2025
**Learning**: Azure-CTN-ASR-ServiceConnection is scoped to rg-ctn-demo-asr-dev only, can't access rg-ctn-booking-prod
**Root cause**: Different service connections have different scopes (resource group vs subscription-wide)
**Prevention**: Always verify service connection scope matches target resources before using it in pipeline
**Solution**: Use azure-ctn-demo (subscription-wide) for booking portal resources

### Lesson #5: Never include node_modules in deployment packages
**Date**: October 20, 2025
**Learning**: Deployment package was 560MB (with node_modules), exceeded Function App disk space (500MB)
**Root cause**: ArchiveFiles@2 task included entire api directory with node_modules
**Prevention**: Always remove node_modules before packaging, enable remote build in Azure Functions
**Solution**:
```yaml
- script: rm -rf booking-portal/api/node_modules
- task: AzureFunctionApp@2
  inputs:
    appSettings: '-SCM_DO_BUILD_DURING_DEPLOYMENT true -ENABLE_ORYX_BUILD true'
```
**Result**: Package size reduced from 560MB to ~5-10MB

---

**Remember**: 5 minutes of checklist review > 2 hours of debugging failed pipelines
