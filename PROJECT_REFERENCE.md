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

**2. CI/CD Pipeline** (GitHub Actions)
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
- CI/CD: GitHub Actions

**Future (V2+):**
- Frontend: React (stays the same)
- Backend: ASP.NET Core Web API
- Containers: Docker + Kubernetes

---

## Azure Resources

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

### Frontend Deployment (Automatic via GitHub Actions - PREFERRED)
```bash
cd ~/Dev/DIL/repo/ASR
git add .
git commit -m "Your commit message"
git push origin main
# GitHub Actions automatically builds and deploys
```

### Frontend Deployment (Manual - Only if GitHub Actions fails)
```bash
cd ~/Dev/DIL/repo/ASR/web

# CRITICAL: Rename .env.local to prevent localhost override
mv .env.local .env.local.backup

# Build
npm run build

# Deploy using SWA CLI
npx @azure/static-web-apps-cli deploy ./build \
  --deployment-token d1ec51feb9c93a061372a5fa151c2aa371b799b058087937c62d031bdd1457af01-15d4bfd4-f72a-4eb0-82cc-051069db9ab1003172603352ba03 \
  --env production

# Restore .env.local for local development
mv .env.local.backup .env.local
```

### API Deployment
```bash
cd ~/Dev/DIL/repo/ASR/api
npm run build
func azure functionapp publish func-ctn-demo-asr-dev
```

### Database Migration
```bash
psql "host=$POSTGRES_HOST port=$POSTGRES_PORT dbname=$POSTGRES_DATABASE user=$POSTGRES_USER password=$POSTGRES_PASSWORD sslmode=require" -f <migration-file.sql>
```

## Environment Files - CRITICAL CONFIGURATION

### ⚠️ .env.local MUST NOT BE COMMITTED TO GIT
**Problem:** `.env.local` overrides `.env.production` during build, causing localhost redirects in production

**Solution:**
1. Keep `.env.local` in `.gitignore`
2. Before production builds, temporarily rename: `mv .env.local .env.local.backup`
3. After build, restore: `mv .env.local.backup .env.local`
4. GitHub Actions workflow handles this automatically

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
**Problem:** `.env.local` overrides `.env.production` during build

**Solution:**
```bash
cd ~/Dev/DIL/repo/ASR/web
mv .env.local .env.local.backup  # Temporarily hide
npm run build                     # Build for production
mv .env.local.backup .env.local   # Restore for local dev
```

**Prevention:** Use GitHub Actions for deployments (handles this automatically)

### Issue: 404 errors on direct URL navigation in production
**Problem:** Missing or incorrect `staticwebapp.config.json`

**Solution:** Ensure `web/public/staticwebapp.config.json` exists with correct navigationFallback configuration

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
├── .github/
│   └── workflows/
│       └── azure-static-web-apps.yml  # Auto-deployment
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
- ✅ Created GitHub Actions workflow for auto-deployment
- ✅ Updated PROJECT_REFERENCE with critical deployment gotchas

## Notes
- ⚠️ CHECK THIS FILE AT START OF EVERY NEW CONVERSATION
- Repository location: ~/Dev/DIL/repo/ASR (not in iCloud)
- Use MacStudio for builds and deployments
- `.env.local` MUST NOT be committed to git
- Always use GitHub Actions for production deployments
- Manual deployments require temporarily hiding .env.local
