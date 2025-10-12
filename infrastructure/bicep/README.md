# Bicep Infrastructure as Code - CTN ASR

## Overview

This directory contains Bicep templates for deploying the complete infrastructure for the CTN Association Register system on Azure. The infrastructure is modular, environment-aware, and follows Azure best practices.

## Architecture

The infrastructure is organized into the following modules:

1. **Core Infrastructure** (`modules/core-infrastructure.bicep`)
   - Storage Account with blob containers
   - App Service Plan
   - Application Insights
   - Log Analytics Workspace
   - Azure Key Vault

2. **Function App** (`modules/function-app.bicep`)
   - Azure Functions (Node.js 20)
   - Backend API with CORS configuration
   - Managed identity enabled

3. **Static Web Apps** (`modules/static-web-apps.bicep`)
   - Admin Portal
   - Member Portal
   - Custom domains (prod only)

4. **Database** (`modules/database.bicep`)
   - Azure Database for PostgreSQL Flexible Server
   - Automated backups
   - High availability (prod)
   - Firewall rules

5. **AI Services** (`modules/ai-services.bicep`)
   - Azure AI Document Intelligence
   - Cognitive Services (multi-service)

6. **Messaging** (`modules/messaging.bicep`)
   - Event Grid Topic
   - Azure Communication Services
   - Email Service

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

### 1. Configure Function App Environment Variables

After deployment, add these additional environment variables to the Function App:

```bash
FUNCTION_APP_NAME="fa-ctn-asr-dev"
RESOURCE_GROUP="rg-ctn-asr-dev"

# Get output values from deployment
POSTGRES_HOST=$(az deployment group show \
  --resource-group ${RESOURCE_GROUP} \
  --name database-deployment \
  --query properties.outputs.serverFqdn.value -o tsv)

POSTGRES_DB=$(az deployment group show \
  --resource-group ${RESOURCE_GROUP} \
  --name database-deployment \
  --query properties.outputs.databaseName.value -o tsv)

DOCUMENT_INTELLIGENCE_ENDPOINT=$(az deployment group show \
  --resource-group ${RESOURCE_GROUP} \
  --name ai-services-deployment \
  --query properties.outputs.documentIntelligenceEndpoint.value -o tsv)

DOCUMENT_INTELLIGENCE_KEY=$(az deployment group show \
  --resource-group ${RESOURCE_GROUP} \
  --name ai-services-deployment \
  --query properties.outputs.documentIntelligenceKey.value -o tsv)

EVENT_GRID_ENDPOINT=$(az deployment group show \
  --resource-group ${RESOURCE_GROUP} \
  --name messaging-deployment \
  --query properties.outputs.eventGridTopicEndpoint.value -o tsv)

EVENT_GRID_KEY=$(az deployment group show \
  --resource-group ${RESOURCE_GROUP} \
  --name messaging-deployment \
  --query properties.outputs.eventGridTopicKey.value -o tsv)

COMMUNICATION_SERVICES_CONNECTION=$(az deployment group show \
  --resource-group ${RESOURCE_GROUP} \
  --name messaging-deployment \
  --query properties.outputs.communicationServicesConnectionString.value -o tsv)

EMAIL_SENDER_ADDRESS=$(az deployment group show \
  --resource-group ${RESOURCE_GROUP} \
  --name messaging-deployment \
  --query properties.outputs.emailSenderAddress.value -o tsv)

# Update Function App settings
az functionapp config appsettings set \
  --name ${FUNCTION_APP_NAME} \
  --resource-group ${RESOURCE_GROUP} \
  --settings \
    POSTGRES_HOST="${POSTGRES_HOST}" \
    POSTGRES_PORT="5432" \
    POSTGRES_DATABASE="${POSTGRES_DB}" \
    POSTGRES_USER="ctnadmin" \
    POSTGRES_PASSWORD="${DB_ADMIN_PASSWORD}" \
    DOCUMENT_INTELLIGENCE_ENDPOINT="${DOCUMENT_INTELLIGENCE_ENDPOINT}" \
    DOCUMENT_INTELLIGENCE_KEY="${DOCUMENT_INTELLIGENCE_KEY}" \
    EVENT_GRID_TOPIC_ENDPOINT="${EVENT_GRID_ENDPOINT}" \
    EVENT_GRID_TOPIC_KEY="${EVENT_GRID_KEY}" \
    COMMUNICATION_SERVICES_CONNECTION_STRING="${COMMUNICATION_SERVICES_CONNECTION}" \
    EMAIL_SENDER_ADDRESS="${EMAIL_SENDER_ADDRESS}" \
    MEMBER_PORTAL_URL="https://calm-pebble-0b2ffb603-12.westeurope.5.azurestaticapps.net"
```

### 2. Configure Static Web Apps

Get deployment tokens:

```bash
# Admin Portal deployment token
az staticwebapp secrets list \
  --name ctn-admin-portal \
  --resource-group rg-ctn-asr-dev \
  --query properties.apiKey -o tsv

# Member Portal deployment token
az staticwebapp secrets list \
  --name ctn-member-portal \
  --resource-group rg-ctn-asr-dev \
  --query properties.apiKey -o tsv
```

Add these tokens to your CI/CD pipeline (Azure DevOps).

### 3. Initialize Database Schema

```bash
# Connect to PostgreSQL
psql "host=${POSTGRES_HOST} port=5432 dbname=${POSTGRES_DB} user=ctnadmin password=${DB_ADMIN_PASSWORD} sslmode=require"

# Run schema initialization script
\i api/database/schema.sql
```

### 4. Configure Event Grid Subscriptions

```bash
# Get EventGridHandler webhook URL from Function App
WEBHOOK_URL="https://fa-ctn-asr-dev.azurewebsites.net/api/EventGridHandler"

# Create Event Grid subscription
az eventgrid event-subscription create \
  --name event-handler-subscription \
  --source-resource-id $(az eventgrid topic show \
    --name egt-ctn-asr-dev \
    --resource-group rg-ctn-asr-dev \
    --query id -o tsv) \
  --endpoint ${WEBHOOK_URL} \
  --endpoint-type webhook \
  --included-event-types \
    Member.Application.Created \
    Member.Activated \
    Member.Suspended \
    Member.Terminated \
    Token.Issued
```

## Environment-Specific Configurations

### Development (dev)

- **Cost-optimized** for development
- SKUs: B1 App Service Plan, F0 AI Services, Burstable PostgreSQL
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
- SKUs: P1v3 App Service Plan, S0 AI Services, General Purpose PostgreSQL
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
| Function App | `fa-{prefix}-{env}` | `fa-ctn-asr-dev` |
| PostgreSQL | `psql-{prefix}-{env}` | `psql-ctn-asr-dev` |
| Static Web App | `{portal-name}` | `ctn-admin-portal` |
| Document Intelligence | `di-{prefix}-{env}` | `di-ctn-asr-dev` |
| Event Grid Topic | `egt-{prefix}-{env}` | `egt-ctn-asr-dev` |
| Key Vault | `kv{prefix}{env}` | `kvctnasrdev` |

## Cost Estimation

### Development Environment (~€50-100/month)

- App Service Plan (B1): ~€12/month
- PostgreSQL (Burstable B2s): ~€20/month
- Storage Account: ~€5/month
- AI Services (F0 Free tier): €0
- Communication Services: Pay-per-use
- Static Web Apps (Free): €0

### Production Environment (~€300-500/month)

- App Service Plan (P1v3): ~€120/month
- PostgreSQL (General Purpose D4s): ~€200/month
- Storage Account: ~€10/month
- AI Services (S0): ~€50/month
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

### Azure DevOps Pipeline

```yaml
# azure-pipelines-infrastructure.yml
trigger:
  branches:
    include:
      - main
  paths:
    include:
      - infrastructure/bicep/**

variables:
  azureSubscription: 'CTN-Azure-Subscription'
  location: 'westeurope'
  resourcePrefix: 'ctn-asr'

stages:
  - stage: DeployDev
    displayName: 'Deploy to Development'
    jobs:
      - job: DeployInfrastructure
        displayName: 'Deploy Bicep Templates'
        pool:
          vmImage: 'ubuntu-latest'
        steps:
          - task: AzureCLI@2
            displayName: 'Deploy Infrastructure'
            inputs:
              azureSubscription: $(azureSubscription)
              scriptType: 'bash'
              scriptLocation: 'inlineScript'
              inlineScript: |
                az deployment sub create \
                  --name "ctn-asr-dev-$(Build.BuildId)" \
                  --location $(location) \
                  --template-file infrastructure/bicep/main.bicep \
                  --parameters \
                    environment=dev \
                    location=$(location) \
                    resourcePrefix=$(resourcePrefix) \
                    databaseAdminPassword="$(DB_ADMIN_PASSWORD)"
```

## Security Best Practices

1. **Store secrets in Azure Key Vault**
   - Never commit passwords to Git
   - Reference Key Vault in parameters file

2. **Enable Managed Identities**
   - Function App uses managed identity
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
