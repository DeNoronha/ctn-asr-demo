# ⚠️ READ THIS FIRST IN EVERY NEW CONVERSATION ⚠️

# CTN ASR Project - Quick Reference

---

## 🎯 V1 PRODUCTION STRATEGY

**Goal:** Production-ready deployment with Infrastructure as Code (IaC)

### Current Phase: Building V1 Features
- Focus on functionality, not documentation
- Documentation comes later during handover (V2+)
- Prepare for eventual .NET conversion (backend only, keep React frontend)

### V1 Deliverables (Infrastructure as Code)

**1. Bicep Infrastructure Template** (`infrastructure/main.bicep`)
- Single command deploys entire Azure infrastructure

**2. CI/CD Pipeline** (Azure DevOps Pipelines)
- Automatic build & deploy on `git push`
- Zero manual deployment steps

**3. Minimal README**
```
# CTN Solution V1
Deploy: az deployment sub create --template-file infrastructure/main.bicep
Access: https://calm-tree-03352ba03.1.azurestaticapps.net
```

### Technology Stack
**Current (V1):**
- Frontend: React + TypeScript
- Backend: Python (Azure Functions)
- Database: PostgreSQL
- IaC: Bicep
- CI/CD: Azure DevOps Pipelines
- Source Control: Azure DevOps Repos

**Future (V2+):**
- Frontend: React (stays the same)
- Backend: ASP.NET Core Web API
- Containers: Docker + Kubernetes

---

## Azure Resources

### Azure DevOps
- **Organization:** ctn-demo
- **Project:** ASR
- **Repository:** https://dev.azure.com/ctn-demo/_git/ASR
- **Pipelines:** https://dev.azure.com/ctn-demo/ASR/_build

### Resource Groups
- **Dev Environment:** rg-ctn-demo-asr-dev
- **Terraform State:** rg-ctn-demo-tfstate

### Services
- **Function App:** func-ctn-demo-asr-dev
- **Static Web App:** calm-tree-03352ba03
  - URL: https://calm-tree-03352ba03.1.azurestaticapps.net
  - Deployment Token: d1ec51feb9c93a061372a5fa151c2aa371b799b058087937c62d031bdd1457af01-15d4bfd4-f72a-4eb0-82cc-051069db9ab1003172603352ba03
- **Database:** psql-ctn-demo-asr-dev.postgres.database.azure.com
- **API Base URL (Production):** https://func-ctn-demo-asr-dev.azurewebsites.net/api/v1
- **API Base URL (Local):** http://localhost:7071/api/v1

### Azure Entra ID
- **App Registration:** CTN Association Register
- **Client ID:** d3037c11-a541-4f21-8862-8079137a0cde
- **Tenant ID:** 598664e7-725c-4daa-bd1f-89c4ada717ff
- **Redirect URI (Production):** https://calm-tree-03352ba03.1.azurestaticapps.net
- **Redirect URI (Local):** http://localhost:3000

## Database Credentials
```bash
export POSTGRES_HOST=psql-ctn-demo-asr-dev.postgres.database.azure.com
export POSTGRES_PORT=5432
export POSTGRES_DATABASE=asr_dev
export POSTGRES_USER=asradmin
export POSTGRES_PASSWORD='[REDACTED]'
```

## Deployment Commands

### 🚀 PERSISTENT DEPLOYMENT WORKFLOW

**⚠️ CRITICAL: Build and Deploy ONLY on Azure - No Local Builds**

**Why Azure-Only:**
- ✅ Consistent build environment (Azure Pipelines)
- ✅ No manual .env juggling (Azure Pipelines)
- ⚠️ Azure Pipelines parallel jobs NOT yet activated (awaiting Microsoft)
- ⚠️ Use Azure DevOps (NOT GitHub Actions)
- ⚠️ **Temporary:** Manual SWA deployments require local builds until pipelines active

### Standard Workflow (Until Azure Pipeline Activated)

**⚠️ NOTE:** SWA CLI manual deployments require local builds. True "build on Azure" only works with Azure Pipelines.

**1. Commit and Push to Azure DevOps:**
```bash
cd /Users/ramondenoronha/Dev/DIL/repo/ASR
git add .
git commit -m "Your changes"
git push
```

**2. Deploy API to Azure:**
```bash
cd /Users/ramondenoronha/Dev/DIL/repo/ASR/api
func azure functionapp publish func-ctn-demo-asr-dev
```

**3. Deploy Frontend (Temporary Local Build):**
```bash
cd /Users/ramondenoronha/Dev/DIL/repo/ASR/web

# Hide .env.local to prevent override
mv .env.local .env.local.backup

# Build for production
npm run build

# Deploy to Azure Static Web Apps
npx @azure/static-web-apps-cli deploy ./build \
  --deployment-token d1ec51feb9c93a061372a5fa151c2aa371b799b058087937c62d031bdd1457af01-15d4bfd4-f72a-4eb0-82cc-051069db9ab1003172603352ba03 \
  --env production

# Restore .env.local
mv .env.local.backup .env.local
```

**Verify Deployment:**
- Frontend: https://calm-tree-03352ba03.1.azurestaticapps.net
- API: https://func-ctn-demo-asr-dev.azurewebsites.net/api/v1

### ⚠️ FUTURE: Automatic Deployment (When Azure Pipeline Activated)
Once parallel jobs enabled:
```bash
cd /Users/ramondenoronha/Dev/DIL/repo/ASR
git add .
git commit -m "Your changes"
git push
# Azure Pipeline automatically builds and deploys both API and Frontend
```

---

### Frontend Deployment (Automatic via Azure Pipeline - NOT YET AVAILABLE)
```bash
cd ~/Dev/DIL/repo/ASR
git add .
git commit -m "Your commit message"
git push origin main
# Azure Pipeline automatically builds and deploys
```

**Monitor deployment:**
- Pipeline: https://dev.azure.com/ctn-demo/ASR/_build
- Static Web App: Azure Portal → rg-ctn-demo-asr-dev → calm-tree-03352ba03 → Deployments

### ⚠️ DEPRECATED: Direct swa deploy from source
**DO NOT USE - SWA CLI cannot build on Azure for manual deployments**

The command `swa deploy --app-location .` was attempted but SWA CLI requires pre-built files for manual deployments. Building on Azure only works with Azure Pipelines.

### API Deployment (Part of Standard Workflow)
```bash
cd ~/Dev/DIL/repo/ASR/api
func azure functionapp publish func-ctn-demo-asr-dev
```

**Note:** This deploys directly to Azure Function App. The local `npm run build` is automatic.

### Database Migration
```bash
psql "host=$POSTGRES_HOST port=$POSTGRES_PORT dbname=$POSTGRES_DATABASE user=$POSTGRES_USER password=$POSTGRES_PASSWORD sslmode=require" -f <migration-file.sql>
```

## Azure DevOps Pipeline Setup

### First-Time Pipeline Configuration
1. Go to: https://dev.azure.com/ctn-demo/ASR/_build
2. Click **New pipeline**
3. Select **Azure Repos Git**
4. Select **ASR** repository
5. Select **Existing Azure Pipelines YAML file**
6. Path: `/azure-pipelines.yml`
7. Click **Continue**
8. Click **Variables** → **New variable**
   - Name: `AZURE_STATIC_WEB_APPS_API_TOKEN`
   - Value: `d1ec51feb9c93a061372a5fa151c2aa371b799b058087937c62d031bdd1457af01-15d4bfd4-f72a-4eb0-82cc-051069db9ab1003172603352ba03`
   - ✅ Check "Keep this value secret"
   - Click **OK**
9. Click **Save and run**

### Testing the Pipeline
```bash
# Make a small change to test
cd ~/Dev/DIL/repo/ASR
echo "# Test deployment" >> web/README.md
git add .
git commit -m "Test: trigger Azure Pipeline deployment"
git push origin main

# Monitor pipeline execution:
# https://dev.azure.com/ctn-demo/ASR/_build

# After pipeline completes (2-5 minutes), verify:
# https://calm-tree-03352ba03.1.azurestaticapps.net
```

## Environment Files - CRITICAL CONFIGURATION

### ⚠️ .env.local MUST NOT BE COMMITTED TO GIT
**Problem:** `.env.local` overrides `.env.production` during build, causing localhost redirects in production

**Solution:**
1. Keep `.env.local` in `.gitignore` (already configured)
2. Azure Pipeline uses environment variables, not .env files
3. For manual builds, temporarily rename: `mv .env.local .env.local.backup`

### Local Development (.env.local) - NOT IN GIT
```
REACT_APP_AZURE_CLIENT_ID=d3037c11-a541-4f21-8862-8079137a0cde
REACT_APP_AZURE_TENANT_ID=598664e7-725c-4daa-bd1f-89c4ada717ff
REACT_APP_REDIRECT_URI=http://localhost:3000
REACT_APP_API_URL=http://localhost:7071/api/v1
```

### Production (.env.production) - COMMITTED TO GIT
```
REACT_APP_AZURE_CLIENT_ID=d3037c11-a541-4f21-8862-8079137a0cde
REACT_APP_AZURE_TENANT_ID=598664e7-725c-4daa-bd1f-89c4ada717ff
REACT_APP_REDIRECT_URI=https://calm-tree-03352ba03.1.azurestaticapps.net
REACT_APP_API_URL=https://func-ctn-demo-asr-dev.azurewebsites.net/api/v1
```

### Static Web App Configuration
**File:** `web/public/staticwebapp.config.json` (MUST exist for React Router to work)
```json
{
  "navigationFallback": {
    "rewrite": "/index.html",
    "exclude": ["/static/*", "/*.{css,js,json,png,jpg,jpeg,gif,svg,ico,woff,woff2,ttf,eot}"]
  },
  "routes": [],
  "responseOverrides": {
    "404": {
      "rewrite": "/index.html",
      "statusCode": 200
    }
  }
}
```

## Current API Endpoints

### Members
- GET /api/v1/members
- GET /api/v1/members/{orgId}
- POST /api/v1/members

### Legal Entities (Companies)
- GET /api/v1/legal-entities/{legalEntityId}
- PUT /api/v1/legal-entities/{legalEntityId}

### Contacts
- GET /api/v1/legal-entities/{legalEntityId}/contacts
- POST /api/v1/contacts
- PUT /api/v1/contacts/{contactId}
- DELETE /api/v1/contacts/{contactId}

### Endpoints
- GET /api/v1/entities/{legal_entity_id}/endpoints
- POST /api/v1/entities/{legal_entity_id}/endpoints
- POST /api/v1/endpoints/{endpoint_id}/tokens

### OAuth
- POST /api/v1/oauth/token

## Common Issues & Solutions

### Issue: Production build redirects to localhost
**Problem:** `.env.local` was present during a local build

**Solution:**
- **DO NOT build locally** - always deploy using `swa deploy` which builds on Azure
- If you accidentally did a local build, redeploy using the Standard Workflow

**Prevention:** Follow the Azure-only deployment workflow (builds happen on Azure, not locally)

### Issue: 404 errors on direct URL navigation in production
**Problem:** Missing or incorrect `staticwebapp.config.json`

**Solution:** Ensure `web/public/staticwebapp.config.json` exists with correct navigationFallback configuration

### Issue: Azure Pipeline fails with "permission denied"
**Problem:** Missing deployment token in pipeline variables

**Solution:** Add `AZURE_STATIC_WEB_APPS_API_TOKEN` as secret variable in Azure Pipeline

### Issue: New Azure Functions not deploying
**Problem:** Function not imported in index.ts

**Solution:**
```bash
cd ~/Dev/DIL/repo/ASR/api
# Edit src/index.ts and add: import './functions/NewFunctionName';
npm run build
func azure functionapp publish func-ctn-demo-asr-dev
```

### Issue: CORS errors when running locally
**Solution:**
```bash
cd ~/Dev/DIL/repo/ASR/api
func start --cors http://localhost:3000
```

## Project Structure
```
repo/ASR/
├── azure-pipelines.yml     # Auto-deployment configuration
├── api/                    # Azure Functions (TypeScript)
│   ├── src/
│   │   ├── functions/      # Function handlers
│   │   └── index.ts        # ⚠️ MUST import all functions
│   └── dist/               # Built output
├── web/                    # React frontend
│   ├── public/
│   │   └── staticwebapp.config.json  # ⚠️ REQUIRED for routing
│   ├── .env.local          # ⚠️ NOT in git, for local dev only
│   ├── .env.production     # ✅ In git, for production
│   └── src/
│       ├── auth/           # Azure Entra ID authentication
│       └── components/     # React components
├── database/
│   └── migrations/         # SQL migration scripts
└── infrastructure/         # Bicep templates
```

## Recent Changes (2025-10-10)
- ✅ Moved repository to ~/Dev/DIL/repo/ASR (no iCloud sync)
- ✅ Fixed authentication redirect loop (.env.local override issue)
- ✅ Added staticwebapp.config.json for React Router support
- ✅ Created Azure Pipeline for auto-deployment (NOT GitHub Actions)
- ✅ Updated PROJECT_REFERENCE with Azure DevOps information
- ✅ Documented pipeline setup and testing procedures
- ✅ **PERSISTENT: Azure-only deployment workflow (no local builds)**

## Notes
- ⚠️ CHECK THIS FILE AT START OF EVERY NEW CONVERSATION
- ⚠️ **CRITICAL: Build ONLY on Azure - NO local npm run build**
- ⚠️ Source control: Azure DevOps (NOT GitHub Actions)
- ⚠️ Azure Pipelines NOT yet activated (awaiting parallel jobs)
- Repository location: ~/Dev/DIL/repo/ASR (not in iCloud)
- Use MacStudio for deployments
- `.env.local` for local dev only - never committed to git
- Frontend deployment: Use `swa deploy` (builds on Azure)
- API deployment: Use `func azure functionapp publish`
