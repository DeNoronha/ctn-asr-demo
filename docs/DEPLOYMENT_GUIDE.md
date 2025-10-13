# Deployment Guide

## Prerequisites

- Node.js 20.x
- Azure CLI (logged in)
- Access to Azure subscription

## Local Development

### 1. Install Dependencies

```bash
cd api && npm install
cd ../web && npm install
```

### 2. Configure Environment

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
    "FUNCTIONS_WORKER_RUNTIME": "node",
    "POSTGRES_HOST": "psql-ctn-demo-asr-dev.postgres.database.azure.com",
    "POSTGRES_PORT": "5432",
    "POSTGRES_DATABASE": "asr_dev",
    "POSTGRES_USER": "asradmin",
    "POSTGRES_PASSWORD": "<YOUR_PASSWORD>"
  }
}
```

### 3. Run Locally

```bash
# Terminal 1 - Backend
cd api
func start --cors http://localhost:3000

# Terminal 2 - Frontend
cd web
npm start
```

Access: http://localhost:3000

## Production Deployment

### Deploy API

```bash
cd api
func azure functionapp publish func-ctn-demo-asr-dev --typescript --build remote
```

**CRITICAL:** Always use `--build remote` flag.

### Deploy Frontend

```bash
cd web

# Hide .env.local to prevent override
mv .env.local .env.local.backup

# Build and deploy
npm run build
npx @azure/static-web-apps-cli deploy ./build \
  --deployment-token <token> \
  --env production

# Restore .env.local
mv .env.local.backup .env.local
```

### Verify Deployment

- Frontend: https://calm-tree-03352ba03.1.azurestaticapps.net
- API: https://func-ctn-demo-asr-dev.azurewebsites.net/api/v1

## Database Migrations

```bash
psql "host=psql-ctn-demo-asr-dev.postgres.database.azure.com port=5432 \
  dbname=asr_dev user=asradmin sslmode=require" \
  -f database/migrations/XXX_migration.sql
```

## Configuration

### Function App Settings

Configure via Azure Portal:
1. Go to Function App: `func-ctn-demo-asr-dev`
2. Settings → Configuration
3. Add/Update: `POSTGRES_PASSWORD`, `AZURE_STORAGE_CONNECTION_STRING`, etc.

### Static Web App Configuration

File: `web/public/staticwebapp.config.json` (required for React Router)

```json
{
  "navigationFallback": {
    "rewrite": "/index.html"
  },
  "responseOverrides": {
    "404": {
      "rewrite": "/index.html",
      "statusCode": 200
    }
  }
}
```

## Troubleshooting

### Production redirects to localhost
**Solution:** Hide `.env.local` before building

### 404 on direct URL navigation
**Solution:** Ensure `staticwebapp.config.json` exists in `web/public/`

### New function not deploying
**Solution:** Import function in `api/src/index.ts`

### Multipart upload fails
**Solution:** Use `import * as multipart from 'parse-multipart-data';`

## Monitoring

```bash
# View API logs
func azure functionapp logstream func-ctn-demo-asr-dev
```

Or via Azure Portal: Function App → Monitoring → Log stream

## Rollback

```bash
# Frontend
cd web
git checkout <previous-commit>
npm run build
npx @azure/static-web-apps-cli deploy ./build --deployment-token <token>
git checkout main

# API
cd api
git checkout <previous-commit>
func azure functionapp publish func-ctn-demo-asr-dev --typescript --build remote
git checkout main
```
