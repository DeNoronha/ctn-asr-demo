# Bicep Infrastructure as Code - CTN ASR

## Overview

This directory contains Bicep templates for deploying the complete infrastructure for the CTN Association Register system on Azure. The infrastructure is modular, environment-aware, and follows Azure best practices.

> **Important — this is a greenfield/reference definition, not 1:1 with the running dev
> environment.** The live `dev` environment (`rg-ctn-demo-asr-dev`) was built up over time with
> inconsistent resource names (e.g. `psql-ctn-demo-asr-dev`, `doc-intel-ctn-asr-dev`,
> `log-ctn-demo`), so this template does **not** reproduce those exact names. Because of that
> the **Deploy Infrastructure** job in `.github/workflows/bicep-infrastructure.yml` is
> `workflow_dispatch`-only: every push runs `what-if` validation, but an actual deploy is
> manual. **Always review the `what-if` output before deploying** — against the live RG it
> would update existing resources, and against a fresh RG it provisions a clean parallel stack.

## Architecture

The infrastructure is organized into the following modules:

1. **Core Infrastructure** (`modules/core-infrastructure.bicep`)
   - Storage Account with blob containers
   - Application Insights
   - Log Analytics Workspace
   - Azure Key Vault

2. **Static Web Apps** (`modules/static-web-apps.bicep`)
   - Admin Portal
   - Member Portal
   - Custom domains (prod only)

3. **Database** (`modules/database.bicep`)
   - Azure Database for PostgreSQL Flexible Server
   - Automated backups
   - High availability (prod)
   - Firewall rules

4. **AI Services** (`modules/ai-services.bicep`)
   - Azure AI Document Intelligence

5. **Messaging** (`modules/messaging.bicep`)
   - Azure Communication Services
   - Email Service

> The API runs on **Azure Container Apps** (`container-app.bicep`), deployed by
> `.github/workflows/api.yml` — the former Azure Functions app was retired. An Event Grid
> topic and a multi-service Cognitive Services account were also removed (unused).

## Prerequisites

### Required Tools

```bash
# Install Azure CLI
curl -sL https://aka.ms/InstallAzureCLIDeb | sudo bash

# Install Bicep CLI
az bicep install

# Verify installation
az bicep version
```

### Azure Setup

1. **Azure Subscription** with appropriate permissions
2. **Service Principal** or user account with Contributor role
3. **Azure CLI authentication**:

```bash
az login
az account set --subscription "{subscription-id}"
```

## Deployment

### Environment Variables

Set these environment variables before deployment:

```bash
export ENVIRONMENT="dev"  # or "staging", "prod"
export LOCATION="westeurope"
export RESOURCE_PREFIX="ctn-asr"
export DB_ADMIN_PASSWORD="YourSecurePassword123!"  # Use Azure Key Vault in production
```

### Quick Deployment (All Resources)

Deploy all infrastructure with a single command:

```bash
az deployment sub create \
  --name "ctn-asr-${ENVIRONMENT}-deployment" \
  --location ${LOCATION} \
  --template-file main.bicep \
  --parameters \
    environment=${ENVIRONMENT} \
    location=${LOCATION} \
    resourcePrefix=${RESOURCE_PREFIX} \
    databaseAdminPassword="${DB_ADMIN_PASSWORD}"
```

### Using Parameters File

Create a parameters file for your environment:

**parameters.dev.json**:
```json
{
  "$schema": "https://schema.management.azure.com/schemas/2019-04-01/deploymentParameters.json#",
  "contentVersion": "1.0.0.0",
  "parameters": {
    "environment": {
      "value": "dev"
    },
    "location": {
      "value": "westeurope"
    },
    "resourcePrefix": {
      "value": "ctn-asr"
    },
    "databaseAdminPassword": {
      "reference": {
        "keyVault": {
          "id": "/subscriptions/{subscription-id}/resourceGroups/rg-shared/providers/Microsoft.KeyVault/vaults/kv-shared"
        },
        "secretName": "db-admin-password"
      }
    }
  }
}
```

Deploy using parameters file:

```bash
az deployment sub create \
  --name "ctn-asr-${ENVIRONMENT}-deployment" \
  --location ${LOCATION} \
  --template-file main.bicep \
  --parameters @parameters.${ENVIRONMENT}.json
```

### Modular Deployment

Deploy individual modules:

#### 1. Resource Group Only

```bash
az group create \
  --name rg-ctn-asr-dev \
  --location westeurope \
  --tags Environment=dev Project=CTN-ASR ManagedBy=Bicep
```

#### 2. Core Infrastructure

```bash
az deployment group create \
  --resource-group rg-ctn-asr-dev \
  --template-file modules/core-infrastructure.bicep \
  --parameters \
    environment=dev \
    location=westeurope \
    resourcePrefix=ctn-asr \
    tags='{"Environment":"dev","Project":"CTN-ASR"}'
```

#### 3. Database

```bash
az deployment group create \
  --resource-group rg-ctn-asr-dev \
  --template-file modules/database.bicep \
  --parameters \
    environment=dev \
    location=westeurope \
    resourcePrefix=ctn-asr \
    adminPassword="${DB_ADMIN_PASSWORD}" \
    tags='{"Environment":"dev","Project":"CTN-ASR"}'
```

## Post-Deployment Configuration

The API runs on **Azure Container Apps** and is configured by `.github/workflows/api.yml`
(image build + `az containerapp` deploy). Its connection strings and keys (Postgres, storage,
Document Intelligence, App Insights) live as **Container App secrets/env vars**, not in this
template. The steps below are the one-off, out-of-band configuration after a fresh infra deploy.

### 1. Static Web App deployment tokens

```bash
az staticwebapp secrets list \
  --name <static-web-app-name> \
  --resource-group rg-ctn-demo-asr-dev \
  --query properties.apiKey -o tsv
```

Store the tokens as **GitHub Actions secrets** (consumed by `admin-portal.yml` / `member-portal.yml`).

### 2. Initialize the database schema

```bash
psql "host=<postgres-fqdn> port=5432 dbname=<db> user=<admin> sslmode=require" \
  -f database/schema/<schema>.sql
```

### 3. Container App secrets

The API reads its credentials from Container App secrets (`postgres-password`,
`azure-storage-connection-string`, `doc-intelligence-key`, ...). Set or rotate them with
`az containerapp secret set`, then reference them from the app's environment variables.

## Environment-Specific Configurations

### Development (dev)

- **Cost-optimized** for development
- SKUs: F0 Document Intelligence, Burstable PostgreSQL (B-series), Container Apps consumption
- Public network access enabled
- Relaxed firewall rules
- 30-day retention periods

### Staging (staging)

- **Production-like** for testing
- SKUs: B1-B2 tier
- Some production features enabled
- 60-day retention periods

### Production (prod)

- **High availability and performance**
- SKUs: S0 Document Intelligence, General Purpose PostgreSQL, Container Apps (dedicated workload profile)
- Zone-redundant PostgreSQL
- Geo-redundant backups
- Custom domains enabled
- 90-day retention periods
- Restricted network access

## Resource Naming Convention

| Resource Type | Naming Pattern | Example (dev) |
|--------------|----------------|---------------|
| Resource Group | `rg-{prefix}-{env}` | `rg-ctn-asr-dev` |
| Storage Account | `st{prefix}{env}` | `stctnasrdev` |
| Container App | `ca-{prefix}-api-{env}` | `ca-ctn-asr-api-dev` |
| PostgreSQL | `psql-{prefix}-{env}` | `psql-ctn-asr-dev` |
| Static Web App | `{portal-name}` | `ctn-admin-portal` |
| Document Intelligence | `di-{prefix}-{env}` | `di-ctn-asr-dev` |
| Key Vault | `kv{prefix}{env}` | `kvctnasrdev` |

> Note: the patterns above describe this template's naming. The live `dev` environment uses
> some different names (see the greenfield note at the top).

## Cost Estimation

### Development Environment (~€15-25/month)

- Container Apps (consumption, scales low): ~€0-5/month
- Container Registry (Basic): ~€4/month
- PostgreSQL (Burstable B1ms, auto-stopped nights + weekends): ~€5-7/month
- Storage Account: ~€1-5/month
- Document Intelligence (F0 Free tier): €0
- Communication Services / Email: Pay-per-use
- Static Web Apps (Free): €0

### Production Environment (~€300-500/month)

- Container Apps (dedicated workload profile): ~€100/month
- PostgreSQL (General Purpose D4s): ~€200/month
- Storage Account: ~€10/month
- Document Intelligence (S0): ~€50/month
- Communication Services: Pay-per-use
- Static Web Apps (Free): €0
- Zone redundancy costs

## Monitoring and Maintenance

### View Deployment Status

```bash
az deployment sub show \
  --name ctn-asr-dev-deployment \
  --query properties.provisioningState
```

### Check Resource Health

```bash
az resource list \
  --resource-group rg-ctn-asr-dev \
  --output table
```

### View Application Insights

```bash
az monitor app-insights component show \
  --app ai-ctn-asr-dev \
  --resource-group rg-ctn-asr-dev
```

## Troubleshooting

### Common Deployment Issues

1. **Bicep validation errors**
   ```bash
   az bicep build --file main.bicep
   ```

2. **Insufficient permissions**
   - Ensure you have Contributor role on subscription
   - Check RBAC assignments

3. **Name conflicts**
   - Storage account names must be globally unique
   - Use different resource prefix

4. **Quota limits**
   - Check subscription quotas for region
   - Request quota increase if needed

### Rollback Deployment

```bash
# Delete resource group (WARNING: Destructive!)
az group delete \
  --name rg-ctn-asr-dev \
  --yes --no-wait
```

## CI/CD Integration

Infrastructure is deployed via GitHub Actions. The workflow
`.github/workflows/bicep-infrastructure.yml` runs `what-if` on every push that touches
`infrastructure/bicep/**` and deploys `main.bicep` at subscription scope on `main`. It
authenticates with the `AZURE_CREDENTIALS` secret and reads the database password from the
`DATABASE_ADMIN_PASSWORD` secret — see that workflow for the authoritative configuration.

## Security Best Practices

1. **Store secrets in Azure Key Vault**
   - Never commit passwords to Git
   - Reference Key Vault in parameters file

2. **Enable Managed Identities**
   - Container App uses managed identity
   - Grant least-privilege access

3. **Network Security**
   - Use Private Endpoints in production
   - Restrict storage account access
   - Configure NSGs and firewalls

4. **Enable Azure Defender**
   ```bash
   az security pricing create \
     --name VirtualMachines \
     --tier Standard
   ```

5. **Regular Security Audits**
   - Use Azure Advisor recommendations
   - Enable Azure Policy compliance

## Backup and Disaster Recovery

### PostgreSQL Backups

- Automatic backups enabled
- Point-in-time restore capability
- Geo-redundant backups (prod)

### Restore Database

```bash
az postgres flexible-server restore \
  --resource-group rg-ctn-asr-prod \
  --name psql-ctn-asr-prod-restored \
  --source-server psql-ctn-asr-prod \
  --restore-time "2025-10-12T14:00:00Z"
```

## Additional Resources

- [Bicep Documentation](https://docs.microsoft.com/azure/azure-resource-manager/bicep/)
- [Azure Functions Best Practices](https://docs.microsoft.com/azure/azure-functions/functions-best-practices)
- [PostgreSQL Flexible Server](https://docs.microsoft.com/azure/postgresql/flexible-server/)
- [Azure Static Web Apps](https://docs.microsoft.com/azure/static-web-apps/)
- [Azure AI Document Intelligence](https://docs.microsoft.com/azure/ai-services/document-intelligence/)

---

**Version:** 1.0.0
**Last Updated:** October 12, 2025
**Maintained by:** CTN Development Team
