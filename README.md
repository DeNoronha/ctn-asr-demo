# CTN Association Register (ASR)

Full-stack application for managing CTN member organizations, endpoints, tokens, and KvK document verification.

## Quick Start

### Prerequisites
- Node.js 20.x
- Azure CLI
- Access to Azure subscription

### Deploy to Production

```bash
# API - Deployed via GitHub Actions workflow: .github/workflows/api.yml
# Push to main branch triggers automatic deployment to Container Apps

# Frontend - Deployed via GitHub Actions workflows
# Admin Portal: .github/workflows/admin-portal.yml
# Member Portal: .github/workflows/member-portal.yml

# Check workflow status:
gh run list --branch main --limit 5
```

## Azure Resources

### Front Door URLs (with WAF Protection)
- **Admin Portal:** https://admin-ctn-dev-gma8fnethbetbjgj.z02.azurefd.net
- **Member Portal:** https://portal-ctn-dev-fdb5cpeagdendtck.z02.azurefd.net

### Direct URLs (Static Web Apps)
- **Admin Portal:** https://calm-tree-03352ba03.1.azurestaticapps.net
- **Member Portal:** https://calm-pebble-043b2db03.1.azurestaticapps.net

### Backend & Infrastructure
- **API:** https://ca-ctn-asr-api-dev.calmriver-700a8c55.westeurope.azurecontainerapps.io/api/v1
- **GitHub Repository:** https://github.com/DeNoronha/ctn-asr-demo
- **GitHub Actions:** https://github.com/DeNoronha/ctn-asr-demo/actions
- **Resource Group:** rg-ctn-demo-asr-dev
- **Database:** psql-ctn-demo-asr-dev.postgres.database.azure.com

**Note:** Front Door endpoints may show `DeploymentStatus: NotStarted`. Use Direct URLs if Front Door returns 404.

## Essential Documentation

- **[docs/THREE_TIER_AUTHENTICATION.md](./docs/THREE_TIER_AUTHENTICATION.md)** - Authentication architecture (Azure AD + Keycloak M2M + RBAC)
- **[docs/KEYCLOAK_M2M_AUTHENTICATION.md](./docs/KEYCLOAK_M2M_AUTHENTICATION.md)** - Machine-to-machine OAuth2 client credentials flow
- **[docs/CLOUD_IAM_SETUP_GUIDE.md](./docs/CLOUD_IAM_SETUP_GUIDE.md)** - Cloud IAM (Keycloak) provider setup
- **[docs/FRONT_DOOR_WAF_SETUP.md](./docs/FRONT_DOOR_WAF_SETUP.md)** - Azure Front Door + WAF configuration
- **[docs/ENRICHMENT_ARCHITECTURE.md](./docs/ENRICHMENT_ARCHITECTURE.md)** - Data enrichment & verification flows
- **[docs/OPERATIONAL_RUNBOOK.md](./docs/OPERATIONAL_RUNBOOK.md)** - Day-2 operations and troubleshooting
- **[docs/CODING_STANDARDS.md](./docs/CODING_STANDARDS.md)** - Coding standards and conventions
- **[database/asr_dev.sql](./database/asr_dev.sql)** - Database schema (source of truth)

## Common Commands

```bash
# View API logs
az containerapp logs show --name ca-ctn-asr-api-dev --resource-group rg-ctn-demo-asr-dev --type console --follow

# Apply database migration
psql "host=psql-ctn-demo-asr-dev.postgres.database.azure.com port=5432 \
  dbname=asr_dev user=asradmin sslmode=require" \
  -f database/migrations/XXX_migration.sql

# Build admin portal
cd admin-portal && npm run build

# Build member portal
cd member-portal && npm run build

# Build API
cd api && npm run build
```

## Project Structure

This repository contains the **Association Register (ASR)** portals and supporting infrastructure:

- **`admin-portal/`** - Admin Portal (React 18 + TypeScript + Mantine v8)
- **`member-portal/`** - Member Portal (React 18 + TypeScript + Mantine v8)
- **`api/`** - Express.js API on Azure Container Apps (Node.js 20 + TypeScript)
- **`database/`** - PostgreSQL schema and migrations
- **`packages/`** - Shared packages (api-client, vite-config-base)
- **`infrastructure/`** - Azure infrastructure as code (Bicep)
- **`.github/workflows/`** - GitHub Actions CI/CD workflows

### Related Repositories

These systems have been extracted into separate repositories:

- **[DocuFlow (Booking System)](https://dev.azure.com/ctn-demo/DocuFlow/_git/DocuFlow)** - Document submission and approval workflows with Cosmos DB backend
- **[Orchestration Register](https://dev.azure.com/ctn-demo/Orchestrator%20Portal/_git/Orchestrator%20Portal)** - Cross-system workflow orchestration and monitoring

## Technology Stack

- **Frontend:** React 18.3.1 + TypeScript 5.9.3 + Mantine v8.3.6
- **Build Tools:** Vite 7.1.10
- **Authentication:** Azure AD (MSAL) with RBAC
- **API Client:** Shared TypeScript client package with retry logic
- **Backend:** Azure Container Apps (Express.js + Node.js 20 + TypeScript)
- **Database:** PostgreSQL 15 (Azure Flexible Server)
- **Testing:** Playwright (E2E), Vitest (unit tests)
- **CI/CD:** GitHub Actions
- **Security:** Aikido scanning, Content Security Policy, rate limiting

## Support

See [docs/OPERATIONAL_RUNBOOK.md](./docs/OPERATIONAL_RUNBOOK.md) for troubleshooting and day-2 operations.
