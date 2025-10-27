# CTN Documentation Portal - Deployment Guide

Complete guide for deploying the CTN Documentation Portal to Azure.

---

## Prerequisites

### Required Tools

- **Azure CLI** - Version 2.50.0 or higher
- **Node.js** - Version 20.x LTS
- **npm** - Version 9.x or higher
- **Git** - For version control
- **Azure Functions Core Tools** - Version 4.x

### Azure Resources

- **Azure Subscription** - With contributor access
- **Azure DevOps Account** - For feedback integration
- **Azure DevOps PAT** - With work item write permissions

---

## Step 1: Prepare Azure Environment

### 1.1 Login to Azure

```bash
# Login to Azure
az login

# Set the correct subscription
az account set --subscription "<subscription-id>"

# Verify subscription
az account show
```

### 1.2 Create Resource Group

```bash
# Create resource group in West Europe
az group create \
  --name rg-ctn-docs-portal-prod \
  --location westeurope \
  --tags Environment=Production Project=CTN-Documentation
```

---

## Step 2: Deploy Infrastructure

### 2.1 Prepare Parameters File

Copy the template and update with your values:

```bash
cp infrastructure/parameters.prod.json.template infrastructure/parameters.prod.json
```

Edit `infrastructure/parameters.prod.json`:

```json
{
  "devOpsOrganization": "ctn-demo",
  "devOpsProject": "CTN-Documentation",
  "customDomainName": "docs.ctn.nl"
}
```

### 2.2 Deploy Bicep Template

```bash
# Deploy infrastructure
az deployment group create \
  --resource-group rg-ctn-docs-portal-prod \
  --template-file infrastructure/main.bicep \
  --parameters infrastructure/parameters.prod.json \
  --parameters devOpsPatToken="<your-pat-token>"
```

**Note:** Store PAT token securely. It will be stored in Key Vault automatically.

### 2.3 Capture Deployment Outputs

```bash
# Get deployment outputs
az deployment group show \
  --resource-group rg-ctn-docs-portal-prod \
  --name main \
  --query properties.outputs

# Save important values:
# - staticWebAppHostname
# - staticWebAppDeploymentToken
# - functionAppName
# - keyVaultName
```

---

## Step 3: Build the Static Site

### 3.1 Install Dependencies

```bash
# Install build dependencies
npm install
```

### 3.2 Build Documentation Site

```bash
# Run full build
npm run build

# This will:
# 1. Clean the public/ folder
# 2. Generate navigation structure
# 3. Convert all markdown files to HTML
# 4. Copy static assets (CSS, JS, images)
```

### 3.3 Verify Build Output

```bash
# Check build output
ls -la public/

# Should contain:
# - index.html
# - css/
# - js/
# - arc42/ (converted HTML files)
# - diagrams/
# - etc.
```

---

## Step 4: Deploy Static Web App

### 4.1 Deploy Using Azure CLI

```bash
# Get deployment token from outputs
DEPLOYMENT_TOKEN=$(az staticwebapp secrets list \
  --name swa-ctn-docs-prod \
  --resource-group rg-ctn-docs-portal-prod \
  --query properties.apiKey -o tsv)

# Deploy static site
npx @azure/static-web-apps-cli deploy \
  ./public \
  --deployment-token $DEPLOYMENT_TOKEN \
  --env production
```

### 4.2 Alternative: Deploy via Azure DevOps Pipeline

If using Azure DevOps pipeline (recommended):

```bash
# Push to main branch - pipeline will auto-deploy
git add .
git commit -m "deploy: Update documentation portal"
git push origin main

# Monitor pipeline:
# https://dev.azure.com/ctn-demo/CTN-Documentation/_build
```

---

## Step 5: Deploy Azure Function

### 5.1 Build Function App

```bash
cd functions

# Install dependencies
npm install

# Test locally (optional)
func start

# Test feedback endpoint
curl -X POST http://localhost:7071/api/SubmitFeedback \
  -H "Content-Type: application/json" \
  -d '{
    "name": "Test User",
    "email": "test@example.com",
    "commentType": "Idea",
    "page": "Test Page",
    "comment": "This is a test feedback"
  }'
```

### 5.2 Deploy to Azure

```bash
# Deploy function app
func azure functionapp publish func-ctn-docs-prod

# Verify deployment
func azure functionapp list-functions func-ctn-docs-prod
```

---

## Step 6: Configure Custom Domain (Optional)

### 6.1 Add Custom Domain to Static Web App

```bash
# Add custom domain
az staticwebapp hostname set \
  --name swa-ctn-docs-prod \
  --resource-group rg-ctn-docs-portal-prod \
  --hostname docs.ctn.nl
```

### 6.2 Configure DNS

Add CNAME record in your DNS provider:

```
Type: CNAME
Name: docs
Value: <staticWebAppHostname>
TTL: 3600
```

### 6.3 Verify SSL Certificate

```bash
# Check SSL certificate status
az staticwebapp hostname show \
  --name swa-ctn-docs-prod \
  --resource-group rg-ctn-docs-portal-prod \
  --hostname docs.ctn.nl
```

SSL certificate is automatically provisioned by Azure Static Web Apps.

---

## Step 7: Verify Deployment

### 7.1 Test Static Site

```bash
# Get URL
SITE_URL=$(az staticwebapp show \
  --name swa-ctn-docs-prod \
  --resource-group rg-ctn-docs-portal-prod \
  --query defaultHostname -o tsv)

# Test site availability
curl -I https://$SITE_URL

# Expected: HTTP 200 OK
```

### 7.2 Test Azure Function

```bash
# Get function app URL
FUNCTION_URL=$(az functionapp show \
  --name func-ctn-docs-prod \
  --resource-group rg-ctn-docs-portal-prod \
  --query defaultHostName -o tsv)

# Test feedback endpoint
curl -X POST https://$FUNCTION_URL/api/SubmitFeedback \
  -H "Content-Type: application/json" \
  -d '{
    "name": "Test User",
    "email": "test@example.com",
    "commentType": "Idea",
    "page": "Test Page",
    "comment": "Deployment verification test"
  }'

# Expected: { "success": true, "workItemId": ... }
```

### 7.3 Test Feedback Integration

1. Open the documentation site
2. Navigate to any page
3. Scroll to feedback section
4. Submit test feedback
5. Verify work item created in Azure DevOps

---

## Step 8: Configure Monitoring

### 8.1 Enable Application Insights Alerts

```bash
# Create alert for function failures
az monitor metrics alert create \
  --name "Function-Failures-Alert" \
  --resource-group rg-ctn-docs-portal-prod \
  --scopes $(az functionapp show --name func-ctn-docs-prod --resource-group rg-ctn-docs-portal-prod --query id -o tsv) \
  --condition "count requests/failed > 5" \
  --window-size 5m \
  --evaluation-frequency 1m \
  --action email <your-email>
```

### 8.2 Review Application Insights

```bash
# Open Application Insights in portal
az portal open \
  --resource-group rg-ctn-docs-portal-prod \
  --resource-name appi-ctn-docs-prod \
  --resource-type Microsoft.Insights/components
```

---

## Step 9: Azure DevOps Pipeline Setup

### 9.1 Create Variable Group

In Azure DevOps:

1. Go to **Pipelines → Library**
2. Create variable group: `ctn-docs-portal-variables`
3. Add variables:
   - `AZURE_SUBSCRIPTION_DEV` - Azure service connection name
   - `AZURE_SUBSCRIPTION_PROD` - Azure service connection name
   - `STATIC_WEB_APP_URL_DEV` - Dev site URL
   - `STATIC_WEB_APP_URL_PROD` - Prod site URL
   - `FUNCTION_APP_NAME_DEV` - Dev function app name
   - `FUNCTION_APP_NAME_PROD` - Prod function app name
   - `AZURE_STATIC_WEB_APPS_API_TOKEN_DEV` - Dev deployment token (secret)
   - `AZURE_STATIC_WEB_APPS_API_TOKEN_PROD` - Prod deployment token (secret)

### 9.2 Create Pipeline

1. Go to **Pipelines → Pipelines**
2. Click **New Pipeline**
3. Select **Azure Repos Git**
4. Select repository
5. Select **Existing Azure Pipelines YAML file**
6. Choose `/azure-pipelines.yml`
7. Run pipeline

---

## Updating Documentation

### Update Process

```bash
# 1. Edit markdown files
nano docs/arc42/01-introduction.md

# 2. Test locally
npm run dev

# 3. Commit and push
git add docs/
git commit -m "docs: Update introduction section"
git push origin main

# 4. Pipeline auto-deploys to dev → prod
# Monitor at: https://dev.azure.com/ctn-demo/CTN-Documentation/_build
```

### Manual Deployment

If pipeline is not set up:

```bash
# Build and deploy manually
npm run build

npx @azure/static-web-apps-cli deploy ./public \
  --deployment-token $DEPLOYMENT_TOKEN \
  --env production
```

---

## Rollback Procedure

### Rollback Static Web App

```bash
# List deployments
az staticwebapp deployment list \
  --name swa-ctn-docs-prod \
  --resource-group rg-ctn-docs-portal-prod

# Rollback to specific deployment
az staticwebapp deployment promote \
  --name swa-ctn-docs-prod \
  --resource-group rg-ctn-docs-portal-prod \
  --deployment-id <deployment-id>
```

### Rollback Azure Function

```bash
# List deployment slots
az functionapp deployment slot list \
  --name func-ctn-docs-prod \
  --resource-group rg-ctn-docs-portal-prod

# Swap slots
az functionapp deployment slot swap \
  --name func-ctn-docs-prod \
  --resource-group rg-ctn-docs-portal-prod \
  --slot staging
```

---

## Troubleshooting

### Build Failures

```bash
# Clear cache and rebuild
npm run clean
rm -rf node_modules package-lock.json
npm install
npm run build
```

### Function Not Receiving Requests

```bash
# Check CORS settings
az functionapp cors show \
  --name func-ctn-docs-prod \
  --resource-group rg-ctn-docs-portal-prod

# Add Static Web App domain
az functionapp cors add \
  --name func-ctn-docs-prod \
  --resource-group rg-ctn-docs-portal-prod \
  --allowed-origins https://docs.ctn.nl
```

### Key Vault Access Denied

```bash
# Grant function app access to Key Vault
az keyvault set-policy \
  --name kv-ctn-docs-prod \
  --object-id $(az functionapp identity show --name func-ctn-docs-prod --resource-group rg-ctn-docs-portal-prod --query principalId -o tsv) \
  --secret-permissions get list
```

---

## Security Checklist

- [ ] Azure DevOps PAT stored in Key Vault (not in code)
- [ ] Function app uses managed identity
- [ ] CORS configured for Static Web App domain only
- [ ] HTTPS enforced (HTTP redirects to HTTPS)
- [ ] CSP headers configured in staticwebapp.config.json
- [ ] Application Insights logging enabled
- [ ] No secrets in environment variables or code
- [ ] Custom domain SSL certificate active

---

## Support

For deployment issues:

- **Azure Support:** https://portal.azure.com/#blade/Microsoft_Azure_Support/HelpAndSupportBlade
- **Azure DevOps Support:** https://developercommunity.visualstudio.com/
- **Documentation:** https://docs.microsoft.com/azure/static-web-apps/

---

**Last Updated:** January 2025
