# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

CTN Association Register (ASR) - A full-stack Azure-based web application for managing CTN member organizations, KvK document verification, and BVAD access tokens. Two portals: Admin Portal (member management) and Member Portal (self-service).

**Live URLs:**
- Admin Portal: https://calm-tree-03352ba03.1.azurestaticapps.net
- Member Portal: https://calm-pebble-043b2db03.1.azurestaticapps.net
- API: https://func-ctn-demo-asr-dev.azurewebsites.net/api/v1

## Technology Stack

**Frontend:** React 18 + TypeScript + Kendo React UI components + Azure Static Web Apps
**Backend:** Azure Functions (Node.js 20 + TypeScript) + PostgreSQL + Azure Blob Storage + Azure AI Document Intelligence
**Source Control:** Azure DevOps (https://dev.azure.com/ctn-demo/ASR)

## Essential Commands

### Development

```bash
# Install dependencies
cd api && npm install
cd web && npm install

# Run locally (2 terminals)
# Terminal 1 - API
cd api
func start --cors http://localhost:3000

# Terminal 2 - Frontend
cd web
npm start
# Access at http://localhost:3000
```

### Testing

```bash
# Frontend tests
cd web
npm test

# API build verification
cd api
npm run build
```

### Deployment (Production)

```bash
# 1. Commit and push
git add .
git commit -m "Description"
git push

# 2. Deploy API (MUST use --build remote)
cd api
func azure functionapp publish func-ctn-demo-asr-dev --typescript --build remote

# 3a. Deploy Frontend - Admin Portal
cd web
mv .env.local .env.local.backup  # Hide local env
npm run build
npx @azure/static-web-apps-cli deploy ./build \
  --deployment-token d1ec51feb9c93a061372a5fa151c2aa371b799b058087937c62d031bdd1457af01-15d4bfd4-f72a-4eb0-82cc-051069db9ab1003172603352ba03 \
  --env production
mv .env.local.backup .env.local  # Restore local env

# 3b. Deploy Frontend - Member Portal
cd web
mv .env.local .env.local.backup  # Hide local env
npm run build
npx @azure/static-web-apps-cli deploy ./build \
  --deployment-token e597cda7728ed30e397d3301a18abcc4d89ab6a67b6ac6477835faf3261b183f01-4dec1d69-71a6-4c4d-9091-bae5673f9ab60031717043b2db03 \
  --env production
mv .env.local.backup .env.local  # Restore local env
```

### Database Migrations

```bash
psql "host=psql-ctn-demo-asr-dev.postgres.database.azure.com port=5432 dbname=asr_dev user=asradmin password=[REDACTED] sslmode=require" -f database/migrations/XXX_migration.sql
```

## Architecture Highlights

### Project Structure

```
api/src/
├── functions/       # HTTP-triggered Azure Functions (28+ endpoints)
├── services/        # Business logic (blobStorageService, documentIntelligenceService, kvkService)
└── index.ts        # ⚠️ ALL functions MUST be imported here to register with runtime

web/src/
├── components/      # React components (35+ components)
├── services/        # API client layer
├── auth/           # Azure Entra ID (MSAL) authentication
└── contexts/       # React contexts

web/public/
└── staticwebapp.config.json  # ⚠️ REQUIRED for React Router to work on Azure Static Web Apps

database/migrations/ # SQL migration scripts (numbered sequentially)
```

### Database Schema

**Core Tables:**
- `legal_entity` - Member organizations (11 additional columns for KvK verification workflow)
- `contact` - Contact persons
- `endpoint` - API endpoints per organization
- `token` - BVAD access tokens
- `user_account` - System users
- `audit_logs` - System action tracking

**Views:**
- `member_overview` - Aggregated member data
- `token_overview` - Token statistics

### Key API Patterns

**Authentication:** Azure Entra ID (OAuth2/OIDC) for UI, JWT validation for API
**CORS:** Configured for both localhost and production domains
**File Upload:** Uses `parse-multipart-data` package (see critical notes below)

### KvK Document Verification Flow

1. Member uploads PDF KvK statement via web UI
2. Azure Function receives multipart form data
3. File stored in Azure Blob Storage (private container)
4. Azure AI Document Intelligence extracts company data
5. System validates against KvK API
6. Auto-flags suspicious cases (bankrupt, dissolved, mismatches)
7. Admin reviews flagged cases
8. Event Grid triggers email notifications

## Critical Implementation Notes

### Adding New Azure Functions

When creating a new function:
1. Create function file in `api/src/functions/`
2. **MUST import in `api/src/index.ts`** or it won't deploy
3. Use `methods: ['GET']` NOT `['GET', 'OPTIONS']` in function definition
4. Handle OPTIONS requests inside function code if needed

### Multipart Form Data Parsing

```typescript
// CORRECT import (note the * as syntax)
import * as multipart from 'parse-multipart-data';

// Check multiple header variations (Azure inconsistency)
let contentType = request.headers.get('content-type');
if (!contentType) contentType = request.headers.get('Content-Type');
```

### Azure Blob Storage

```typescript
// CORRECT - containers are private (no public access)
await containerClient.createIfNotExists();
// Do NOT use: { access: 'blob' }

// TODO: Use SAS tokens for secure document viewing
// Implement: async getDocumentSasUrl(blobUrl: string, expiryMinutes: number = 60)
```

### Environment Configuration

**Frontend:**
- `.env.local` - Local dev only (NOT in git, contains localhost URLs)
- `.env.production` - Production config (IN git, contains Azure URLs)
- **⚠️ CRITICAL:** Must hide `.env.local` before building for production or it overrides production config

**Backend:**
- `api/local.settings.json` - Local dev (NOT in git)
- Production secrets in Azure Function App Settings (Azure Portal)

### Static Web App Routing

`web/public/staticwebapp.config.json` is **REQUIRED** for React Router to work. Without it, direct URL navigation results in 404 errors.

### Deployment Build Process

**API:** ALWAYS use `--build remote` flag. Local builds may fail due to environment differences.
**Frontend:** Hide `.env.local` before building to prevent localhost URLs in production build.

## Common Issues & Solutions

**Issue:** New function not deploying
**Solution:** Import function in `api/src/index.ts`

**Issue:** Production redirects to localhost
**Solution:** `.env.local` was present during build - hide it before `npm run build`

**Issue:** 404 on direct URL navigation
**Solution:** Verify `web/public/staticwebapp.config.json` exists

**Issue:** Multipart upload fails
**Solution:** Use `import * as multipart from 'parse-multipart-data'` syntax

**Issue:** Blob storage public access error
**Solution:** Don't set `access: 'blob'` on container creation

## Azure Resources

**Resource Group:** rg-ctn-demo-asr-dev
**Function App:** func-ctn-demo-asr-dev
**Database:** psql-ctn-demo-asr-dev.postgres.database.azure.com (port 5432, db: asr_dev)
**Storage Account:** stctnasrdev96858 (KvK documents)
**Document Intelligence:** doc-intel-ctn-asr-dev

**Static Web App (Admin):** calm-tree-03352ba03
- Deployment Token: d1ec51feb9c93a061372a5fa151c2aa371b799b058087937c62d031bdd1457af01-15d4bfd4-f72a-4eb0-82cc-051069db9ab1003172603352ba03

**Static Web App (Member):** ctn-member-portal
- Deployment Token: e597cda7728ed30e397d3301a18abcc4d89ab6a67b6ac6477835faf3261b183f01-4dec1d69-71a6-4c4d-9091-bae5673f9ab60031717043b2db03

## Additional Documentation

For detailed information, see:
- `README.md` - Project overview and quick links
- `PROJECT_REFERENCE.md` - Azure credentials and Ramon's preferences (for Claude assistant, not Claude Code)
- `docs/ARCHITECTURE.md` - Full system design
- `docs/DEPLOYMENT_GUIDE.md` - Detailed deployment procedures
- `docs/TESTING_GUIDE.md` - Testing procedures
- `docs/ROADMAP.md` - Current status and future plans

## Current Status

**Admin Portal:** ✅ Production-ready
**Member Portal:** ✅ Infrastructure complete, authentication working
**Database:** ✅ 11 tables + 2 views deployed
**API:** ✅ 28+ endpoints operational
**Email Notifications:** ✅ Configured and tested
**KvK Verification:** 🟡 85% complete (awaiting KvK API key and SAS token implementation)

**Target Production Date:** November 1, 2025
