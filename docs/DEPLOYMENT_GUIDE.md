# Deployment Guide

## Prerequisites

- Node.js 20.x
- Azure CLI installed and logged in
- Access to Azure subscription (CTN Demo)
- Git configured

## Environment Setup

### 1. Clone Repository

```bash
git clone https://dev.azure.com/ctn-demo/_git/ASR
cd ASR
```

### 2. Install Dependencies

**Frontend:**
```bash
cd web
npm install
```

**Backend:**
```bash
cd api
npm install
```

## Local Development

### 1. Configure Environment Variables

**Frontend** (`web/.env.local`):
```env
REACT_APP_AZURE_CLIENT_ID=d3037c11-a541-4f21-8862-8079137a0cde
REACT_APP_AZURE_TENANT_ID=598664e7-725c-4daa-bd1f-89c4ada717ff
REACT_APP_REDIRECT_URI=http://localhost:3000
REACT_APP_API_URL=http://localhost:7071/api/v1
```

**Backend** (`api/local.settings.json`):
```json
{
  "IsEncrypted": false,
  "Values": {
    "AzureWebJobsStorage": "",
    "FUNCTIONS_WORKER_RUNTIME": "node",
    "POSTGRES_HOST": "psql-ctn-demo-asr-dev.postgres.database.azure.com",
    "POSTGRES_PORT": "5432",
    "POSTGRES_DATABASE": "asr_dev",
    "POSTGRES_USER": "asradmin",
    "POSTGRES_PASSWORD": "[REDACTED]",
    "AZURE_STORAGE_CONNECTION_STRING": "<from Azure Portal>",
    "DOCUMENT_INTELLIGENCE_ENDPOINT": "<from Azure Portal>",
    "DOCUMENT_INTELLIGENCE_KEY": "<from Azure Portal>",
    "KVK_API_KEY": "<from KvK website>"
  }
}
```

### 2. Run Locally

**Terminal 1 - Backend:**
```bash
cd api
npm run start  # or: func start --cors http://localhost:3000
```

**Terminal 2 - Frontend:**
```bash
cd web
npm start
```

Access: http://localhost:3000

## Production Deployment

### Standard Workflow (Current)

**1. Commit and Push:**
```bash
cd /Users/ramondenoronha/Dev/DIL/ASR-full
git add .
git commit -m "Your changes"
git push
```

**2. Deploy API:**
```bash
cd /Users/ramondenoronha/Dev/DIL/ASR-full/api
func azure functionapp publish func-ctn-demo-asr-dev --typescript --build remote
```

**⚠️ CRITICAL:** Always use `--build remote` flag to build on Azure.

**3. Deploy Frontend:**
```bash
cd /Users/ramondenoronha/Dev/DIL/ASR-full/web

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

**4. Verify Deployment:**
- Frontend: https://calm-tree-03352ba03.1.azurestaticapps.net
- API: https://func-ctn-demo-asr-dev.azurewebsites.net/api/v1

### Future: Automatic Deployment (When Azure Pipeline Active)

Once Azure DevOps parallel jobs are enabled:
```bash
git add .
git commit -m "Your changes"
git push
# Pipeline automatically builds and deploys both API and Frontend
```

## Database Migrations

Apply migrations to database:

```bash
psql "host=psql-ctn-demo-asr-dev.postgres.database.azure.com port=5432 dbname=asr_dev user=asradmin password=[REDACTED] sslmode=require" -f database/migrations/XXX_migration_name.sql
```

Or use Azure Data Studio to run migration files.

## Configuration Management

### Azure Function App Settings

Configure via Azure Portal:
1. Go to Function App: `func-ctn-demo-asr-dev`
2. Settings → Configuration
3. Add/Update Application Settings:
   - `POSTGRES_HOST`
   - `POSTGRES_PASSWORD`
   - `AZURE_STORAGE_CONNECTION_STRING`
   - `DOCUMENT_INTELLIGENCE_ENDPOINT`
   - `DOCUMENT_INTELLIGENCE_KEY`
   - `KVK_API_KEY`
   - `EVENTGRID_TOPIC_ENDPOINT`
   - `EVENTGRID_TOPIC_KEY`

### Static Web App Configuration

File: `web/public/staticwebapp.config.json`

**⚠️ CRITICAL:** This file is required for React Router to work properly.

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

## Troubleshooting

### Issue: Production redirects to localhost
**Cause:** `.env.local` was present during build  
**Solution:** Always hide `.env.local` before building, or use `swa deploy` which builds on Azure

### Issue: 404 on direct URL navigation
**Cause:** Missing `staticwebapp.config.json`  
**Solution:** Ensure `web/public/staticwebapp.config.json` exists with correct configuration

### Issue: API CORS errors
**Cause:** Function not configured for frontend domain  
**Solution:** Add CORS configuration in Azure Function App settings

### Issue: New function not deploying
**Cause:** Function not imported in `api/src/index.ts`  
**Solution:** Add import statement: `import './functions/YourFunction';`

### Issue: Multipart upload fails
**Cause:** Wrong import syntax for `parse-multipart-data`  
**Solution:** Use `import * as multipart from 'parse-multipart-data';`

### Issue: Blob storage public access error
**Cause:** Public access disabled (security best practice)  
**Solution:** Don't set `access: 'blob'` when creating container. Use SAS tokens for viewing.

## Monitoring

### View API Logs
```bash
func azure functionapp logstream func-ctn-demo-asr-dev
```

Or via Azure Portal:
1. Go to Function App: `func-ctn-demo-asr-dev`
2. Monitoring → Log stream

### View Static Web App Logs
Azure Portal → Static Web Apps → `calm-tree-03352ba03` → Monitoring

### Database Queries
Use Azure Data Studio or psql to connect and query.

## Rollback

### Frontend Rollback
Redeploy previous version:
```bash
cd web
git checkout <previous-commit>
npm run build
npx @azure/static-web-apps-cli deploy ./build --deployment-token <token> --env production
git checkout main
```

### API Rollback
```bash
cd api
git checkout <previous-commit>
func azure functionapp publish func-ctn-demo-asr-dev --typescript --build remote
git checkout main
```

## Resources

- Azure Portal: https://portal.azure.com
- Azure DevOps: https://dev.azure.com/ctn-demo/ASR
- Static Web App: https://calm-tree-03352ba03.1.azurestaticapps.net
- Function App: https://func-ctn-demo-asr-dev.azurewebsites.net

---

**Last Updated:** October 12, 2025
