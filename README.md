# CTN Association Register (ASR)

Full-stack application for managing CTN member organizations, endpoints, tokens, and KvK document verification.

## Quick Start

### Prerequisites
- Node.js 20.x
- Azure CLI
- Access to Azure subscription

### Deploy to Production

```bash
# API
cd api
func azure functionapp publish func-ctn-demo-asr-dev --typescript --build remote

# Frontend
cd web
mv .env.local .env.local.backup
npm run build
npx @azure/static-web-apps-cli deploy ./build \
  --deployment-token <token> \
  --env production
mv .env.local.backup .env.local
```

## Azure Resources

- **Admin Portal:** https://calm-tree-03352ba03.1.azurestaticapps.net
- **Member Portal:** https://calm-pebble-043b2db03.1.azurestaticapps.net
- **Documentation Portal:** https://ambitious-sky-098ea8e03.2.azurestaticapps.net
- **Orchestrator Portal:** https://blue-dune-0353f1303.1.azurestaticapps.net (October 2025 - Production)
- **API:** https://func-ctn-demo-asr-dev.azurewebsites.net/api/v1
- **Azure DevOps:** https://dev.azure.com/ctn-demo/ASR
- **Resource Group:** rg-ctn-demo-asr-dev
- **Database:** psql-ctn-demo-asr-dev.postgres.database.azure.com

## Essential Documentation

- **[~/Desktop/ROADMAP.md](~/Desktop/ROADMAP.md)** - Next actions and priorities (synced across devices)
- **[CLAUDE.md](./CLAUDE.md)** - Way of working, agent registry, lessons learned
- **[docs/COMPLETED_ACTIONS.md](./docs/COMPLETED_ACTIONS.md)** - Historical record of completed work
- **[docs/DEPLOYMENT_GUIDE.md](./docs/DEPLOYMENT_GUIDE.md)** - Deployment instructions
- **[docs/SECRET_ROTATION_GUIDE.md](./docs/SECRET_ROTATION_GUIDE.md)** - Security and secret management

## Common Commands

```bash
# View API logs
func azure functionapp logstream func-ctn-demo-asr-dev

# Apply database migration
psql "host=psql-ctn-demo-asr-dev.postgres.database.azure.com port=5432 \
  dbname=asr_dev user=asradmin sslmode=require" \
  -f database/migrations/XXX_migration.sql

# Build frontend
cd web && npm run build

# Build API
cd api && npm run build
```

## Project Structure

This repository contains four portals and supporting infrastructure:

- **`web/`** - Admin Portal (React 18 + TypeScript + Kendo React)
- **`portal/`** - Member Portal (React 18 + TypeScript + Kendo React)
- **`ctn-docs-portal/`** - Documentation Portal (Static site with markdown conversion)
- **`orchestrator-portal/`** - Orchestrator Portal (React 18 + TypeScript + Vite + Kendo React + TanStack Query)
- **`api/`** - Azure Functions API (Node.js 20 + TypeScript)
- **`database/`** - PostgreSQL schema and migrations
- **`infrastructure/`** - Azure infrastructure as code

## Technology Stack

- **Frontend:** React 18 + TypeScript + Kendo React UI
- **Build Tools:** Vite 7.1.10 (admin/member/orchestrator), Static HTML (documentation)
- **State Management:** TanStack Query + Zustand (orchestrator), React Context (admin/member)
- **Backend:** Azure Functions v4 (Node.js 20 + TypeScript)
- **Database:** PostgreSQL 14 (Azure Flexible Server)
- **Storage:** Azure Blob Storage
- **AI:** Azure Document Intelligence
- **Testing:** Playwright (E2E), Jest (unit)
- **CI/CD:** Azure DevOps Pipelines

## Support

See [docs/DEPLOYMENT_GUIDE.md](./docs/DEPLOYMENT_GUIDE.md) for troubleshooting.
