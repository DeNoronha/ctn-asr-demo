# CTN Documentation Portal - Transfer Guide

Complete guide for transferring the CTN Documentation Portal between Azure subscriptions or tenants.

**Use Cases:**
- Moving from development to production subscription
- Transferring to different Azure AD tenant
- Migrating to customer's Azure environment
- Creating isolated environment for testing

---

## Pre-Transfer Checklist

### Information to Gather

- [ ] **Source subscription ID**
- [ ] **Target subscription ID**
- [ ] **Target tenant ID** (if different tenant)
- [ ] **Target resource group name**
- [ ] **Target Azure DevOps organization**
- [ ] **Target Azure DevOps project**
- [ ] **Custom domain name** (if applicable)
- [ ] **Azure AD app registrations** (if using custom auth)

### Access Requirements

- [ ] **Owner** role on source subscription
- [ ] **Owner** or **Contributor** role on target subscription
- [ ] **Global Administrator** on target Azure AD (if different tenant)
- [ ] **Project Administrator** on target Azure DevOps

---

## Step 1: Export Current Configuration

### 1.1 Export Infrastructure Parameters

```bash
# Set source subscription
az account set --subscription "<source-subscription-id>"

# Export deployment parameters
az deployment group show \
  --resource-group rg-ctn-docs-portal-prod \
  --name main \
  --query properties.parameters > exported-params.json

# Review exported parameters
cat exported-params.json
```

### 1.2 Export Secrets from Key Vault

```bash
# List all secrets
az keyvault secret list \
  --vault-name kv-ctn-docs-prod \
  --query "[].name" -o tsv > secret-names.txt

# Export secret values (SECURE THIS FILE!)
while read secret; do
    value=$(az keyvault secret show --vault-name kv-ctn-docs-prod --name $secret --query value -o tsv)
    echo "$secret=$value" >> secrets-export.txt
done < secret-names.txt

# Encrypt the secrets file
gpg -c secrets-export.txt

# Delete plaintext version
rm secrets-export.txt
```

⚠️ **IMPORTANT:** Store `secrets-export.txt.gpg` securely. Never commit to Git.

### 1.3 Export Application Settings

```bash
# Export Function App settings
az functionapp config appsettings list \
  --name func-ctn-docs-prod \
  --resource-group rg-ctn-docs-portal-prod \
  --query "[?name!='FUNCTIONS_WORKER_RUNTIME' && name!='FUNCTIONS_EXTENSION_VERSION'].{name:name, value:value}" \
  > function-app-settings.json

# Review settings (DO NOT commit secrets)
cat function-app-settings.json
```

### 1.4 Export Static Web App Configuration

```bash
# Get Static Web App configuration
az staticwebapp show \
  --name swa-ctn-docs-prod \
  --resource-group rg-ctn-docs-portal-prod \
  > static-web-app-config.json
```

### 1.5 Document Custom Domain Configuration

```bash
# List custom domains
az staticwebapp hostname list \
  --name swa-ctn-docs-prod \
  --resource-group rg-ctn-docs-portal-prod \
  > custom-domains.json

# Document DNS settings (manual step)
# - CNAME records
# - TXT records for validation
# - SSL certificate details
```

---

## Step 2: Prepare Target Environment

### 2.1 Login to Target Subscription

```bash
# If same tenant:
az account set --subscription "<target-subscription-id>"

# If different tenant:
az login --tenant "<target-tenant-id>"
az account set --subscription "<target-subscription-id>"

# Verify correct context
az account show
```

### 2.2 Create Azure DevOps Project (if needed)

```bash
# Login to Azure DevOps
az devops login

# Set default organization
az devops configure --defaults organization=https://dev.azure.com/<target-org>

# Create project (if doesn't exist)
az devops project create \
  --name "CTN-Documentation" \
  --description "CTN Documentation Portal" \
  --visibility private
```

### 2.3 Create Personal Access Token

1. Go to Azure DevOps: https://dev.azure.com/<target-org>
2. Click **User Settings → Personal Access Tokens**
3. Click **+ New Token**
4. Configure:
   - Name: `CTN-Docs-Portal-Feedback`
   - Organization: Target organization
   - Expiration: 90 days (or custom)
   - Scopes: **Work Items** → **Read & write**
5. Copy token immediately (shown only once)

---

## Step 3: Update Parameters File

### 3.1 Create Target Parameters File

```bash
cd infrastructure

# Copy template
cp parameters.prod.json.template parameters-target.json
```

### 3.2 Update Parameters

Edit `infrastructure/parameters-target.json`:

```json
{
  "$schema": "https://schema.management.azure.com/schemas/2019-04-01/deploymentParameters.json#",
  "contentVersion": "1.0.0.0",
  "parameters": {
    "environmentName": {
      "value": "prod"
    },
    "location": {
      "value": "westeurope"
    },
    "namePrefix": {
      "value": "ctn-docs"
    },
    "devOpsOrganization": {
      "value": "<TARGET-DEVOPS-ORG>"
    },
    "devOpsProject": {
      "value": "CTN-Documentation"
    },
    "devOpsAreaPath": {
      "value": "CTN-Documentation\\Feedback"
    },
    "customDomainName": {
      "value": "<TARGET-CUSTOM-DOMAIN>"
    },
    "tags": {
      "value": {
        "Environment": "Production",
        "Project": "CTN-Documentation-Portal",
        "ManagedBy": "Bicep",
        "CostCenter": "<TARGET-COST-CENTER>",
        "Owner": "<TARGET-OWNER>",
        "TransferredFrom": "Source Subscription",
        "TransferDate": "2025-01-XX"
      }
    },
    "enableMonitoring": {
      "value": true
    }
  }
}
```

**Key Changes:**
- `devOpsOrganization` - Target Azure DevOps org
- `devOpsProject` - Target project name
- `customDomainName` - Target domain (if different)
- `tags` - Update cost center, owner, etc.

---

## Step 4: Deploy to Target Subscription

### 4.1 Create Resource Group

```bash
# Create resource group in target subscription
az group create \
  --name rg-ctn-docs-portal-target \
  --location westeurope \
  --tags Environment=Production Project=CTN-Documentation TransferredFrom=Source
```

### 4.2 Deploy Infrastructure

```bash
# Deploy Bicep template
az deployment group create \
  --resource-group rg-ctn-docs-portal-target \
  --template-file infrastructure/main.bicep \
  --parameters infrastructure/parameters-target.json \
  --parameters devOpsPatToken="<TARGET-PAT-TOKEN>"

# Monitor deployment
az deployment group show \
  --resource-group rg-ctn-docs-portal-target \
  --name main \
  --query properties.provisioningState
```

### 4.3 Capture New Resource Names

```bash
# Get deployment outputs
az deployment group show \
  --resource-group rg-ctn-docs-portal-target \
  --name main \
  --query properties.outputs > target-outputs.json

# Extract important values
STATIC_WEB_APP_NAME=$(jq -r '.staticWebAppHostname.value' target-outputs.json | cut -d'.' -f1)
FUNCTION_APP_NAME=$(jq -r '.functionAppName.value' target-outputs.json)
KEY_VAULT_NAME=$(jq -r '.keyVaultName.value' target-outputs.json)

echo "Static Web App: $STATIC_WEB_APP_NAME"
echo "Function App: $FUNCTION_APP_NAME"
echo "Key Vault: $KEY_VAULT_NAME"
```

---

## Step 5: Migrate Secrets

### 5.1 Decrypt Exported Secrets

```bash
# Decrypt secrets file
gpg -d secrets-export.txt.gpg > secrets-export.txt

# Review secrets
cat secrets-export.txt
```

### 5.2 Import Secrets to Target Key Vault

```bash
# Import DevOps PAT
az keyvault secret set \
  --vault-name $KEY_VAULT_NAME \
  --name DevOpsPatToken \
  --value "<TARGET-PAT-TOKEN>"

# Import any other secrets
while IFS='=' read -r name value; do
    if [ ! -z "$name" ] && [ ! -z "$value" ]; then
        az keyvault secret set \
          --vault-name $KEY_VAULT_NAME \
          --name "$name" \
          --value "$value"
    fi
done < secrets-export.txt

# Secure cleanup
shred -u secrets-export.txt
```

### 5.3 Grant Function App Access to Key Vault

```bash
# This should already be done by Bicep, but verify:
az keyvault set-policy \
  --name $KEY_VAULT_NAME \
  --object-id $(az functionapp identity show --name $FUNCTION_APP_NAME --resource-group rg-ctn-docs-portal-target --query principalId -o tsv) \
  --secret-permissions get list
```

---

## Step 6: Deploy Application

### 6.1 Build Documentation Site

```bash
# From project root
npm install
npm run build
```

### 6.2 Deploy Static Web App

```bash
# Get deployment token
DEPLOYMENT_TOKEN=$(az staticwebapp secrets list \
  --name $STATIC_WEB_APP_NAME \
  --resource-group rg-ctn-docs-portal-target \
  --query properties.apiKey -o tsv)

# Deploy
npx @azure/static-web-apps-cli deploy ./public \
  --deployment-token $DEPLOYMENT_TOKEN \
  --env production
```

### 6.3 Deploy Azure Function

```bash
# Deploy function app
cd functions
npm install
func azure functionapp publish $FUNCTION_APP_NAME

# Verify deployment
func azure functionapp list-functions $FUNCTION_APP_NAME
```

---

## Step 7: Configure Custom Domain (if applicable)

### 7.1 Add Custom Domain to Static Web App

```bash
# Add custom domain
az staticwebapp hostname set \
  --name $STATIC_WEB_APP_NAME \
  --resource-group rg-ctn-docs-portal-target \
  --hostname <TARGET-CUSTOM-DOMAIN>
```

### 7.2 Update DNS Records

In your DNS provider, update:

**CNAME Record:**
```
Type: CNAME
Name: docs
Value: <new-static-web-app-hostname>
TTL: 3600
```

**TXT Record (for validation):**
```
Type: TXT
Name: _dnsauth.docs
Value: <validation-code-from-azure>
TTL: 3600
```

### 7.3 Wait for SSL Certificate

```bash
# Check certificate status
az staticwebapp hostname show \
  --name $STATIC_WEB_APP_NAME \
  --resource-group rg-ctn-docs-portal-target \
  --hostname <TARGET-CUSTOM-DOMAIN>

# Status should be: "Ready"
```

---

## Step 8: Configure Azure DevOps Pipeline

### 8.1 Create Service Connection

1. Go to Azure DevOps project
2. **Project Settings → Service connections**
3. Click **+ New service connection**
4. Select **Azure Resource Manager**
5. Authentication method: **Service principal (automatic)**
6. Subscription: Target subscription
7. Resource group: `rg-ctn-docs-portal-target`
8. Service connection name: `Azure-CTN-Docs-Target`
9. Save

### 8.2 Update Variable Group

1. **Pipelines → Library**
2. Create/update variable group: `ctn-docs-portal-variables`
3. Add variables:
   - `AZURE_SUBSCRIPTION_PROD` = `Azure-CTN-Docs-Target`
   - `FUNCTION_APP_NAME_PROD` = `<FUNCTION_APP_NAME>`
   - `STATIC_WEB_APP_URL_PROD` = `https://<TARGET-CUSTOM-DOMAIN>`
   - `AZURE_STATIC_WEB_APPS_API_TOKEN_PROD` = `<DEPLOYMENT_TOKEN>` (secret)

### 8.3 Create Pipeline

1. **Pipelines → Pipelines → New Pipeline**
2. Select repository
3. Choose **Existing Azure Pipelines YAML file**
4. Select `/azure-pipelines.yml`
5. Run pipeline

---

## Step 9: Verification

### 9.1 Test Static Site

```bash
# Get site URL
TARGET_URL=$(az staticwebapp show \
  --name $STATIC_WEB_APP_NAME \
  --resource-group rg-ctn-docs-portal-target \
  --query defaultHostname -o tsv)

# Test availability
curl -I https://$TARGET_URL

# Expected: HTTP 200 OK
```

### 9.2 Test Feedback Function

```bash
# Test feedback submission
curl -X POST https://$TARGET_URL/api/SubmitFeedback \
  -H "Content-Type: application/json" \
  -d '{
    "name": "Transfer Test",
    "email": "test@ctn.nl",
    "commentType": "Idea",
    "page": "Transfer Verification",
    "comment": "Testing feedback system after transfer"
  }'

# Expected: { "success": true, "workItemId": ... }
```

### 9.3 Verify Work Item in Azure DevOps

1. Go to Azure DevOps project
2. **Boards → Work Items**
3. Verify feedback created as work item
4. Check tags: `documentation-feedback`

### 9.4 Full Functionality Test

- [ ] Navigate to documentation site
- [ ] Verify all pages load
- [ ] Check Mermaid diagrams render
- [ ] Test search functionality
- [ ] Submit feedback via form
- [ ] Verify work item created in target Azure DevOps
- [ ] Check Application Insights logging

---

## Step 10: Cutover and Decommission

### 10.1 Update DNS (if using custom domain)

```bash
# Update DNS to point to new Static Web App
# Wait for TTL to expire (usually 1-24 hours)

# Verify DNS propagation
nslookup <TARGET-CUSTOM-DOMAIN>
```

### 10.2 Monitor Traffic

```bash
# Monitor Application Insights
az portal open \
  --resource-group rg-ctn-docs-portal-target \
  --resource-name appi-ctn-docs-target \
  --resource-type Microsoft.Insights/components
```

### 10.3 Decommission Source Resources (after verification)

```bash
# WAIT AT LEAST 7 DAYS BEFORE DECOMMISSIONING

# Delete source resource group
az group delete \
  --name rg-ctn-docs-portal-prod \
  --yes --no-wait

# Verify deletion
az group show --name rg-ctn-docs-portal-prod
# Expected: ResourceGroupNotFound error
```

---

## Post-Transfer Checklist

- [ ] All infrastructure deployed successfully
- [ ] Secrets migrated to target Key Vault
- [ ] Static site deployed and accessible
- [ ] Azure Function deployed and functional
- [ ] Custom domain configured (if applicable)
- [ ] SSL certificate active
- [ ] DNS updated and propagated
- [ ] Feedback form creates work items in target Azure DevOps
- [ ] Azure DevOps pipeline configured
- [ ] Application Insights logging enabled
- [ ] Documentation updated with new URLs
- [ ] Team notified of new environment
- [ ] Source resources decommissioned (after validation period)

---

## Rollback Plan

If transfer fails, rollback steps:

### 1. Revert DNS

```bash
# Update DNS back to source Static Web App
# CNAME: docs -> <source-static-web-app-hostname>
```

### 2. Delete Target Resources

```bash
# Delete target resource group
az group delete \
  --name rg-ctn-docs-portal-target \
  --yes

# This removes:
# - Static Web App
# - Function App
# - Key Vault
# - Storage Account
# - Application Insights
```

### 3. Verify Source Environment

```bash
# Verify source still working
curl -I https://<source-custom-domain>

# Test feedback still works
curl -X POST https://<source-custom-domain>/api/SubmitFeedback \
  -H "Content-Type: application/json" \
  -d '{"name":"Rollback Test","email":"test@ctn.nl","commentType":"Idea","page":"Test","comment":"Rollback verification"}'
```

---

## Cost Comparison

Before and after transfer, compare costs:

```bash
# Get cost analysis for source
az consumption usage list \
  --resource-group rg-ctn-docs-portal-prod \
  --start-date 2025-01-01 \
  --end-date 2025-01-31

# Get cost analysis for target
az consumption usage list \
  --resource-group rg-ctn-docs-portal-target \
  --start-date 2025-01-01 \
  --end-date 2025-01-31
```

**Expected Monthly Costs:**
- Static Web App: €0 (Free tier)
- Function App (Consumption): €10-20
- PostgreSQL (if applicable): €50-100
- Key Vault: €1-5
- Application Insights: €5-20
- **Total:** ~€66-145/month

---

## Support During Transfer

For assistance during transfer:

- **Azure Support:** https://portal.azure.com/#blade/Microsoft_Azure_Support/HelpAndSupportBlade
- **Bicep Issues:** https://github.com/Azure/bicep/issues
- **Static Web Apps Forum:** https://github.com/Azure/static-web-apps/discussions

---

**Last Updated:** January 2025
