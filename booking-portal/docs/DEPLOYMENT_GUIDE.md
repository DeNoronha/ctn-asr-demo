# CTN Booking Portal - Deployment Guide

## Prerequisites

Before deployment, ensure you have:
- Azure CLI installed and authenticated
- Azure subscription with appropriate permissions
- .NET 8 SDK (for backend)
- Node.js 20+ (for frontend)

## Deployment Modes

The CTN Booking Portal supports two deployment modes:

### 1. SaaS Multi-Tenant Mode (Recommended)
Centralized deployment managed by CTN team, serving multiple organizations.

### 2. Self-Hosted Mode
Deployed to partner's Azure subscription with full control over infrastructure and data.

---

## SaaS Deployment

### Step 1: Deploy Infrastructure

```bash
cd infrastructure

# Deploy to production
az deployment sub create \
  --name ctn-booking-prod \
  --location westeurope \
  --template-file main.bicep \
  --parameters mode=saas environment=prod
```

### Step 2: Configure Secrets

Store sensitive values in Azure Key Vault:

```bash
# Get Key Vault name from deployment outputs
KEYVAULT_NAME=$(az deployment sub show --name ctn-booking-prod --query properties.outputs.keyVaultName.value -o tsv)

# Store Cosmos DB credentials
COSMOS_ENDPOINT=$(az deployment sub show --name ctn-booking-prod --query properties.outputs.cosmosDbEndpoint.value -o tsv)
COSMOS_KEY=$(az cosmosdb keys list --name <cosmos-account-name> --resource-group <rg-name> --query primaryMasterKey -o tsv)

az keyvault secret set --vault-name $KEYVAULT_NAME --name COSMOS-DB-ENDPOINT --value $COSMOS_ENDPOINT
az keyvault secret set --vault-name $KEYVAULT_NAME --name COSMOS-DB-KEY --value $COSMOS_KEY

# Store Document Intelligence credentials
DOC_INTEL_ENDPOINT=$(az deployment sub show --name ctn-booking-prod --query properties.outputs.docIntelligenceEndpoint.value -o tsv)
DOC_INTEL_KEY=$(az cognitiveservices account keys list --name <doc-intel-name> --resource-group <rg-name> --query key1 -o tsv)

az keyvault secret set --vault-name $KEYVAULT_NAME --name DOCUMENT-INTELLIGENCE-ENDPOINT --value $DOC_INTEL_ENDPOINT
az keyvault secret set --vault-name $KEYVAULT_NAME --name DOCUMENT-INTELLIGENCE-KEY --value $DOC_INTEL_KEY
```

### Step 3: Deploy Backend (Azure Functions)

```bash
cd ../api

# Build
dotnet build

# Deploy
FUNCTION_APP_NAME=$(az deployment sub show --name ctn-booking-prod --query properties.outputs.functionAppName.value -o tsv)
func azure functionapp publish $FUNCTION_APP_NAME --dotnet
```

### Step 4: Deploy Frontend (Static Web App)

```bash
cd ../web

# Build
npm install
npm run build

# Deploy to Static Web App
SWA_DEPLOYMENT_TOKEN=$(az staticwebapp secrets list --name <swa-name> --query properties.apiKey -o tsv)
npx @azure/static-web-apps-cli deploy ./build --deployment-token $SWA_DEPLOYMENT_TOKEN --env production
```

### Step 5: Create Initial Tenant

```bash
# Use Azure Portal or API to create first tenant
curl -X POST https://<function-app-url>/api/v1/tenants \
  -H "Content-Type: application/json" \
  -d '{
    "organizationId": "itg",
    "organizationName": "ITG",
    "terminalCode": "hengelo",
    "terminalName": "ITG Hengelo",
    "subscription": {
      "type": "saas",
      "status": "trial",
      "monthlyFee": 499,
      "currency": "EUR"
    }
  }'
```

---

## Self-Hosted Deployment

### Step 1: Deploy Infrastructure to Partner Subscription

```bash
cd infrastructure

# Partner authenticates to their Azure subscription
az login --tenant <partner-tenant-id>

# Deploy with self-hosted mode
az deployment sub create \
  --name ctn-booking-itg-hengelo \
  --location westeurope \
  --template-file main.bicep \
  --parameters mode=self-hosted tenantId=itg-hengelo environment=prod
```

### Step 2: Configure Azure AD B2B

1. **In CTN's Azure AD:**
   - Create App Registration for "CTN Booking Portal"
   - Configure Redirect URIs
   - Enable "External Identities" and "Guest User Access"

2. **Invite Partner Users:**
```bash
az ad user create \
  --display-name "John Planner" \
  --user-principal-name john.planner_itg-hengelo.com#EXT#@ctn.onmicrosoft.com \
  --mail-nickname john.planner \
  --password <temp-password>
```

3. **Assign App Roles:**
```bash
az ad app permission grant \
  --id <app-id> \
  --api <api-id>
```

### Step 3: Deploy Application Code

Same as SaaS deployment (Steps 3-4 above), but to partner's resources.

### Step 4: Configure Tenant Settings

Update tenant configuration in Cosmos DB:

```json
{
  "id": "itg-hengelo",
  "tenantId": "itg-hengelo",
  "settings": {
    "emailIngestion": "bookings-hengelo@itg.com",
    "autoApproveThreshold": 0.90,
    "supportedCarriers": ["MAERSK", "OOCL", "MSC"],
    "orchestrationApiEndpoint": "https://api.itg.com/orchestration",
    "orchestrationApiKey": "vault:itg-hengelo-orch-key"
  },
  "features": {
    "emailIngestion": true,
    "bulkUpload": true,
    "apiAccess": true,
    "customModels": true
  }
}
```

---

## Train Custom AI Models

### Step 1: Label Training Documents

1. Navigate to Azure AI Document Intelligence Studio: https://formrecognizer.appliedai.azure.com/
2. Create new custom model project
3. Upload 20-30 sample documents per carrier (OOCL, Maersk, MSC)
4. Label fields matching DCSA-Plus schema
5. Train model

### Step 2: Update Model Configuration

```bash
# Update tenant config with custom model ID
az cosmosdb sql item update \
  --account-name <cosmos-account> \
  --database-name ctn-bookings-db \
  --container-name tenant-config \
  --partition-key-value itg-hengelo \
  --item-body '{
    "modelConfig": {
      "useSharedModel": false,
      "customModelId": "model-itg-oocl-v1"
    }
  }'
```

---

## Monitoring and Alerting

### Application Insights Queries

**Processing Failures:**
```kusto
traces
| where customDimensions.EventName == "DocumentProcessingFailed"
| summarize count() by bin(timestamp, 1h)
```

**Average Confidence Over Time:**
```kusto
customMetrics
| where name == "ExtractionConfidence"
| summarize avg(value) by bin(timestamp, 1d)
```

### Alerts

Create alerts for:
- Processing failures > 5% in 1 hour
- Average confidence < 80%
- Validation queue depth > 50

---

## CI/CD Pipeline Setup

### Azure DevOps

Create `azure-pipelines.yml`:

```yaml
trigger:
  branches:
    include:
      - main
  paths:
    include:
      - api/**
      - web/**

pool:
  vmImage: 'ubuntu-latest'

stages:
  - stage: Build
    jobs:
      - job: BuildBackend
        steps:
          - task: DotNetCoreCLI@2
            inputs:
              command: 'build'
              projects: 'api/BookingApi.csproj'

      - job: BuildFrontend
        steps:
          - task: Npm@1
            inputs:
              command: 'install'
              workingDir: 'web'
          - task: Npm@1
            inputs:
              command: 'custom'
              customCommand: 'run build'
              workingDir: 'web'

  - stage: Deploy
    jobs:
      - job: DeployBackend
        steps:
          - task: AzureFunctionApp@1
            inputs:
              azureSubscription: 'Azure-Subscription'
              appName: 'func-ctn-booking-prod'
              package: 'api/**/*.zip'

      - job: DeployFrontend
        steps:
          - task: AzureStaticWebApp@0
            inputs:
              app_location: 'web/build'
              api_location: ''
              output_location: ''
```

---

## Health Checks

### Backend Health Check
```bash
curl https://<function-app-url>/api/health
# Expected: {"status": "healthy", "version": "1.0.0"}
```

### Frontend Health Check
```bash
curl https://<static-web-app-url>
# Expected: HTTP 200 with portal loaded
```

### Database Connectivity
```bash
# Test Cosmos DB connection
az cosmosdb sql database show \
  --account-name <cosmos-account> \
  --name ctn-bookings-db
```

---

## Troubleshooting

### Issue: Document Processing Fails

**Symptoms:** Documents upload but status stays "processing"

**Solution:**
1. Check Document Intelligence credentials in Key Vault
2. Verify Function App has access to Key Vault
3. Check Application Insights for errors
4. Ensure Document Intelligence endpoint is accessible

### Issue: Authentication Fails

**Symptoms:** Users cannot log in or get 401 errors

**Solution:**
1. Verify Azure AD app registration configuration
2. Check redirect URIs match deployment URLs
3. Ensure users are invited as guest users
4. Verify API permissions are granted

### Issue: Slow Performance

**Symptoms:** Long processing times or timeouts

**Solution:**
1. Check Cosmos DB RU consumption
2. Scale Document Intelligence to higher tier
3. Enable caching for repeated queries
4. Consider Azure CDN for static assets

---

## Rollback Procedure

If deployment fails:

```bash
# Rollback to previous Function App deployment
az functionapp deployment source sync \
  --name <function-app-name> \
  --resource-group <rg-name>

# Rollback Static Web App to previous deployment
az staticwebapp deployment list --name <swa-name>
# Note deployment ID of previous version
az staticwebapp deployment show --name <swa-name> --deployment-id <previous-id>
```

---

## Security Checklist

Before going to production:

- [ ] All secrets stored in Key Vault
- [ ] HTTPS enforced on all endpoints
- [ ] Azure AD B2B configured
- [ ] RBAC roles assigned correctly
- [ ] Cosmos DB firewall enabled (if required)
- [ ] Application Insights configured
- [ ] Backup policy configured
- [ ] Disaster recovery plan documented
- [ ] Data retention policies configured
- [ ] GDPR compliance verified

---

## Support

For deployment issues, contact:
- **Technical Support:** support@ctninland.com
- **Documentation:** https://docs.ctninland.com
- **Status Page:** https://status.ctninland.com

