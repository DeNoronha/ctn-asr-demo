# Booking Portal - Deployment Architecture

**Last Updated**: October 20, 2025

## Overview

The CTN Booking Portal uses a **separate deployment model** with distinct Azure resources for frontend and backend.

⚠️ **CRITICAL**: This is NOT an Azure Static Web App with integrated API. The API is a separate Function App.

## Architecture Diagram

```
┌─────────────────────────────────────────────────────────────┐
│                    Users / Browsers                          │
└────────────────┬────────────────────────────────────────────┘
                 │
                 │ HTTPS
                 │
┌────────────────▼───────────────────────────────────────────┐
│  Azure Static Web App (Frontend)                           │
│  Resource: swa-ctn-booking-prod                            │
│  URL: https://[generated].azurestaticapps.net              │
│  Tech: React 18 + TypeScript + Kendo UI                    │
│  Build: npm run build → /web/build                         │
└────────────────┬───────────────────────────────────────────┘
                 │
                 │ Axios + JWT Bearer Token
                 │ VITE_API_URL=https://func-ctn-booking-prod.azurewebsites.net
                 │
┌────────────────▼───────────────────────────────────────────┐
│  Azure Function App (Backend API)                          │
│  Resource: func-ctn-booking-prod                           │
│  URL: https://func-ctn-booking-prod.azurewebsites.net      │
│  Tech: Node.js 20 + TypeScript + Azure Functions v3        │
│  Build: npm run build → compiled JS in each function/      │
│  Auth: JWT validation with JWKS (Azure AD)                 │
│  Identity: System-assigned managed identity                │
└─────────┬──────────────────┬─────────────────┬────────────┘
          │                  │                 │
          │                  │                 │
    ┌─────▼─────┐     ┌─────▼─────┐    ┌─────▼──────┐
    │  Cosmos   │     │   Blob    │    │   Form     │
    │    DB     │     │  Storage  │    │ Recognizer │
    │           │     │           │    │            │
    │ Bookings  │     │ Documents │    │   AI OCR   │
    │  Tenants  │     │  (PDFs)   │    │            │
    └───────────┘     └───────────┘    └────────────┘
```

## Deployment Resources

### Frontend (Static Web App)
- **Resource Name**: `swa-ctn-booking-prod`
- **Resource Group**: `rg-ctn-booking-prod`
- **Deployment Method**: Azure Static Web Apps CLI
- **Source**: `booking-portal/web/build` (pre-built React app)
- **Configuration**: `staticwebapp.config.json`
- **Environment Variables**: Set in Static Web App configuration
  - `VITE_API_URL`: Function App URL
  - `VITE_AZURE_CLIENT_ID`: Azure AD client ID
  - `VITE_AZURE_TENANT_ID`: Azure AD tenant ID

### Backend (Function App)
- **Resource Name**: `func-ctn-booking-prod`
- **Resource Group**: `rg-ctn-booking-prod`
- **Runtime**: Node.js 20
- **Deployment Method**: Zip Deploy from pipeline
- **Source**: `booking-portal/api` (compiled TypeScript)
- **Functions**:
  - `UploadDocument` - POST /api/v1/documents
  - `GetBookings` - GET /api/v1/bookings
  - `GetTenants` - GET /api/v1/tenants
  - `ValidateBooking` - PUT /api/v1/bookings/{id}/validate
  - `GetDocumentSasUrl` - GET /api/v1/documents/{id}/sas
- **Managed Identity**: System-assigned (for blob access, Cosmos DB)
- **App Settings**: Stored in Azure Function App configuration
  - Storage connection string
  - Cosmos DB endpoint/key
  - Form Recognizer endpoint/key
  - Azure AD tenant/client IDs

### Storage
- **Resource Name**: `stbookingprodieafkhcfkn4`
- **Container**: `documents` (private, SAS token access only)
- **Access**: Function App managed identity has "Storage Blob Data Contributor" role

### Database
- **Type**: Cosmos DB (NoSQL)
- **Containers**: `bookings`, `tenants`

## CI/CD Pipeline

### Main Pipeline (`azure-pipelines.yml`)
**Triggers**: Commits to `main` branch in `booking-portal/**`

**Stages**:
1. **Build**
   - Job: BuildAPI → Compiles TypeScript, creates zip artifact
   - Job: BuildFrontend → Builds React app, publishes artifact

2. **DeployDev** (Production)
   - Job: DeployFunctionApp → Deploys API zip to Function App
   - Job: DeployStaticWebApp → Deploys frontend to Static Web App

**Key Variables** (from variable group `ctn-booking-portal-variables`):
- `AZURE_STATIC_WEB_APPS_API_TOKEN_BOOKING`: Static Web App deployment token
- `Azure-Service-Connection`: Azure subscription service connection

### PR Validation Pipeline (`azure-pipelines-pr.yml`)
**Triggers**: Pull requests to `main` branch

**Purpose**: Validate changes BEFORE merging to prevent production failures

**Stages**:
1. **Validate** - YAML syntax, linting
2. **Build** - Test API & frontend builds
3. **SecurityScan** - npm audit for vulnerabilities
4. **PRSummary** - Display validation results

## Common Mistakes to Avoid

### ❌ DON'T: Add `api_location` to Static Web App deployment
```yaml
# WRONG - This tries to deploy an integrated API
- task: AzureStaticWebApp@0
  inputs:
    app_location: 'booking-portal/web/build'
    api_location: 'booking-portal/api'  # ❌ WRONG!
```

**Why**: Azure Static Web Apps integrated APIs only support specific function formats. Our TypeScript Azure Functions must be deployed separately.

### ✅ DO: Deploy frontend and API separately
```yaml
# CORRECT - Frontend deployment
- task: AzureStaticWebApp@0
  inputs:
    app_location: 'booking-portal/web/build'
    # No api_location!

# CORRECT - API deployment (separate job)
- task: AzureFunctionApp@2
  inputs:
    appName: 'func-ctn-booking-prod'
    package: '$(Pipeline.Workspace)/api/*.zip'
```

### ❌ DON'T: Push pipeline changes directly to main
Always test in a feature branch or PR first.

### ✅ DO: Use PR validation pipeline
1. Create feature branch: `git checkout -b fix/pipeline-improvement`
2. Make changes to `azure-pipelines.yml`
3. Create PR → PR pipeline validates changes
4. Merge only if PR pipeline succeeds

## Troubleshooting

### Pipeline fails with "function language detected is unsupported"
**Cause**: `api_location` is set in Static Web App deployment
**Fix**: Remove `api_location` parameter

### Function App deployment succeeds but endpoints return 404
**Cause**: Functions not registered in entry point
**Fix**: Check `api/src/functions/essential-index.ts` imports all functions

### Frontend can't reach API (CORS errors)
**Cause**: `VITE_API_URL` not set or incorrect
**Fix**: Verify Static Web App has correct environment variable

### Blob storage access denied (401/403)
**Cause**: Function App managed identity lacks permissions
**Fix**: Grant "Storage Blob Data Contributor" role:
```bash
az role assignment create \
  --assignee <function-app-principal-id> \
  --role "Storage Blob Data Contributor" \
  --scope /subscriptions/.../storageAccounts/stbookingprodieafkhcfkn4
```

## Best Practices

1. **Always use PR validation pipeline** before merging to main
2. **Test locally first**: `cd api && func start`, `cd web && npm run dev`
3. **Monitor deployments**: Watch Azure DevOps pipeline logs
4. **Check Function App logs**: `func azure functionapp logstream func-ctn-booking-prod`
5. **Version your APIs**: Use `/api/v1/` prefix for future compatibility
6. **Document architecture changes**: Update this file when making changes

## Related Documentation

- Pipeline configuration: `azure-pipelines.yml`
- PR validation: `azure-pipelines-pr.yml`
- Frontend config: `web/staticwebapp.config.json`
- API config: `api/host.json`
- Credentials: `.credentials` file (gitignored)
- Project instructions: `CLAUDE.md` in CTN ASR root

## Emergency Rollback

If a deployment breaks production:

1. **Identify last working commit**:
   ```bash
   git log --oneline -10
   ```

2. **Revert to working commit**:
   ```bash
   git revert <bad-commit-hash>
   git push origin main
   ```

3. **Or manually deploy previous version**:
   ```bash
   # API
   cd api && func azure functionapp publish func-ctn-booking-prod

   # Frontend
   cd web && npm run build
   npx @azure/static-web-apps-cli deploy ./build --deployment-token <token> --env production
   ```

4. **Monitor Azure DevOps**: Pipeline will redeploy from reverted commit
