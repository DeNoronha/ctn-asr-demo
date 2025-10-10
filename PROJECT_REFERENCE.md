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
- Single command deploys entire Azure infrastructure:
  - Azure SQL Database
  - Azure Functions (API)
  - Azure Static Web App (Frontend)
  - Azure Entra ID App Registration
  - Application Insights
  - Key Vault (secrets)
  - Networking & Security

**2. CI/CD Pipeline** (GitHub Actions or Azure DevOps)
- Automatic build & deploy on `git push`
- Separate environments: dev, staging, prod
- Zero manual deployment steps

**3. Minimal README**
```
# CTN Solution V1

Deploy: az deployment sub create --template-file infrastructure/main.bicep
Access: https://ctn-prod.azurestaticapps.net
```

### What We DON'T Need for V1
- ❌ Extensive documentation (add at handover)
- ❌ Manual deployment guides (automation replaces this)
- ❌ Deep architecture docs (Arc42 comes later)

### Post V1 Handover Preparation
When ready to hand over to .NET team:
1. Convert Python backend → ASP.NET Core Web API
2. Keep React frontend (unchanged - most .NET devs prefer React)
3. Add Docker/Kubernetes manifests
4. Add comprehensive documentation

### Technology Stack
**Current (V1):**
- Frontend: React + TypeScript
- Backend: Python (Azure Functions)
- Database: Azure SQL
- IaC: Bicep
- CI/CD: GitHub Actions

**Future (V2+):**
- Frontend: React (stays the same)
- Backend: ASP.NET Core Web API
- Database: Azure SQL
- Containers: Docker + Kubernetes
- IaC: Bicep + Helm charts

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

## Database Credentials
```bash
export POSTGRES_HOST=psql-ctn-demo-asr-dev.postgres.database.azure.com
export POSTGRES_PORT=5432
export POSTGRES_DATABASE=asr_dev
export POSTGRES_USER=asradmin
export POSTGRES_PASSWORD='[REDACTED]'
```

## Deployment Commands

### Frontend Deployment (Manual)
```bash
# Build
cd ~/Dev/DIL/repo/ASR/web
npm run build

# Deploy using SWA CLI
npx @azure/static-web-apps-cli deploy ./build \
  --deployment-token d1ec51feb9c93a061372a5fa151c2aa371b799b058087937c62d031bdd1457af01-15d4bfd4-f72a-4eb0-82cc-051069db9ab1003172603352ba03 \
  --env production
```

### Frontend Deployment (Automatic via GitHub)
```bash
cd ~/Dev/DIL/repo/ASR
git add .
git commit -m "Your commit message"
git push origin main
# GitHub Actions automatically builds and deploys
```

### API Deployment
```bash
# Build
cd ~/Dev/DIL/repo/ASR/api
npm run build

# Deploy to Azure Functions
func azure functionapp publish func-ctn-demo-asr-dev
```

### Database Migration
```bash
psql "host=$POSTGRES_HOST port=$POSTGRES_PORT dbname=$POSTGRES_DATABASE user=$POSTGRES_USER password=$POSTGRES_PASSWORD sslmode=require" -f <migration-file.sql>
```

## Current API Endpoints

### Members
- GET /api/v1/members (includes legal_entity_id)
- GET /api/v1/members/{orgId} (includes legal_entity_id)
- POST /api/v1/members

### Legal Entities (Companies) ✅ DEPLOYED
- GET /api/v1/legal-entities/{legalEntityId}
- PUT /api/v1/legal-entities/{legalEntityId}

### Contacts ✅ DEPLOYED
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

### Issue: New Azure Functions not deploying
**Problem:** Added new function files but they don't appear after deployment

**Solution:** Always update `/api/src/index.ts` to import new functions:
```typescript
import './functions/NewFunctionName';
```

Then rebuild and deploy:
```bash
cd ~/Dev/DIL/repo/ASR/api
npm run build
func azure functionapp publish func-ctn-demo-asr-dev
```

### Issue: GetMembers not returning legal_entity_id
**Problem:** Frontend shows "No company linked" even though member has legal_entity_id

**Solution:** Ensure GetMembers.ts selects the field:
```typescript
'SELECT org_id, legal_name, lei, kvk, domain, status, membership_level, created_at, legal_entity_id FROM members...'
```

### Issue: CORS errors when running locally
**Solution:** Start API with CORS flag:
```bash
func start --cors http://localhost:3000
```

### Issue: Node modules with spaces causing deployment errors
**Solution:**
```bash
cd ~/Dev/DIL/repo/ASR/api
rm -rf node_modules package-lock.json
npm install
npm run build
func azure functionapp publish func-ctn-demo-asr-dev
```

## Project Structure
```
repo/ASR/
├── api/                    # Azure Functions (TypeScript)
│   ├── src/
│   │   ├── functions/      # Function handlers
│   │   └── index.ts        # ⚠️ MUST import all functions here
│   ├── host.json           # CORS configuration
│   └── dist/               # Built output
├── web/                    # React frontend
│   ├── build/              # Production build output
│   └── src/
│       ├── components/     # React components
│       │   ├── MemberDetailView.tsx  # Main detail view with tabs
│       │   ├── CompanyDetails.tsx    # Company info display
│       │   ├── CompanyForm.tsx       # Company edit form
│       │   └── ContactsManager.tsx   # Contact management
│       ├── auth/           # Azure Entra ID authentication
│       └── services/       # API client
├── database/
│   └── migrations/         # SQL migration scripts
│       ├── 002_add_contact_fields.sql
│       └── 003_link_members_to_legal_entities.sql
└── infrastructure/         # Azure resources (Bicep templates)
    └── main.bicep          # Main infrastructure template
```

## Environment Variables

### Local Development (.env.development.local)
```
REACT_APP_AZURE_CLIENT_ID=d3037c11-a541-4f21-8862-8079137a0cde
REACT_APP_AZURE_TENANT_ID=598664e7-725c-4daa-bd1f-89c4ada717ff
REACT_APP_REDIRECT_URI=http://localhost:3000
REACT_APP_API_URL=http://localhost:7071/api/v1
```

### Production (.env.production)
```
REACT_APP_AZURE_CLIENT_ID=d3037c11-a541-4f21-8862-8079137a0cde
REACT_APP_AZURE_TENANT_ID=598664e7-725c-4daa-bd1f-89c4ada717ff
REACT_APP_REDIRECT_URI=https://calm-tree-03352ba03.1.azurestaticapps.net
REACT_APP_API_URL=https://func-ctn-demo-asr-dev.azurewebsites.net/api/v1
```

## Recent Changes (2025-10-10)
- ✅ Moved repository to ~/Dev/DIL/repo/ASR (no iCloud sync)
- ✅ Updated Azure Entra ID redirect URI to root URL
- ✅ Fixed authentication redirect loop issue
- ✅ Added Azure resource group information to documentation
- ✅ Added Static Web App deployment token to PROJECT_REFERENCE.md

## Production Deployment Steps

1. Build frontend: `cd ~/Dev/DIL/repo/ASR/web && npm run build`
2. Deploy frontend: Use SWA CLI command (see Deployment Commands section)
3. Build API: `cd ~/Dev/DIL/repo/ASR/api && npm run build`
4. Deploy API: `func azure functionapp publish func-ctn-demo-asr-dev`
5. Verify CORS settings in Azure Portal

## Notes
- ⚠️ CHECK THIS FILE AT START OF EVERY NEW CONVERSATION
- Repository location: ~/Dev/DIL/repo/ASR (not in iCloud)
- Use MacStudio for builds and deployments
- When adding new Azure Functions, ALWAYS update index.ts first
- Local API must be started with CORS flag: `func start --cors http://localhost:3000`
- Deployment token stored in this file for manual deployments (prefer GitHub Actions for prod)
