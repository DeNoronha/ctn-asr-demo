# CTN Association Register (ASR)

Full-stack application for managing CTN member organizations, endpoints, tokens, and KvK document verification.

## Quick Start

### Prerequisites
- Node.js 20.x
- Azure CLI
- Access to Azure subscription

### Local Development

```bash
# Install dependencies
cd api && npm install
cd ../web && npm install

# Terminal 1 - API
cd api
func start --cors http://localhost:3000

# Terminal 2 - Frontend
cd web
npm start
```

Access: http://localhost:3000

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
- **API:** https://func-ctn-demo-asr-dev.azurewebsites.net/api/v1
- **Azure DevOps:** https://dev.azure.com/ctn-demo/ASR
- **Resource Group:** rg-ctn-demo-asr-dev
- **Database:** psql-ctn-demo-asr-dev.postgres.database.azure.com

## Essential Documentation

- **[docs/DEPLOYMENT_GUIDE.md](./docs/DEPLOYMENT_GUIDE.md)** - Deployment instructions
- **[docs/SECRET_ROTATION_GUIDE.md](./docs/SECRET_ROTATION_GUIDE.md)** - Security and secret management
- **[docs/ROADMAP.md](./docs/ROADMAP.md)** - Remaining tasks

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

## Technology Stack

- **Frontend:** React 18 + TypeScript + Kendo React
- **Backend:** Azure Functions (Node.js 20)
- **Database:** PostgreSQL (Azure)
- **Storage:** Azure Blob Storage
- **AI:** Azure Document Intelligence

## Support

See [docs/DEPLOYMENT_GUIDE.md](./docs/DEPLOYMENT_GUIDE.md) for troubleshooting.
