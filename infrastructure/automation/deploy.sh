#!/bin/bash
# Deploy Azure Automation for PostgreSQL scheduled start/stop
# This script deploys the automation account and configures the runbooks

set -e

# Configuration
RESOURCE_GROUP="rg-ctn-demo-asr-dev"
LOCATION="westeurope"
ENVIRONMENT="dev"
SUBSCRIPTION_ID="add6a89c-7fb9-4f8a-9d63-7611a617430e"
POSTGRES_SERVER="psql-ctn-demo-asr-dev"
AUTOMATION_ACCOUNT="aa-ctn-asr-$ENVIRONMENT"

echo "================================================"
echo "CTN PostgreSQL Automation Deployment"
echo "================================================"
echo ""
echo "Configuration:"
echo "  Resource Group: $RESOURCE_GROUP"
echo "  PostgreSQL Server: $POSTGRES_SERVER"
echo "  Automation Account: $AUTOMATION_ACCOUNT"
echo ""

# Step 1: Deploy the Automation Account and Runbooks
echo "Step 1: Deploying Automation Account and Runbooks..."
az deployment group create \
    --resource-group "$RESOURCE_GROUP" \
    --template-file automation-account.bicep \
    --parameters \
        environment="$ENVIRONMENT" \
        location="$LOCATION" \
        postgresServerName="$POSTGRES_SERVER" \
        postgresResourceGroup="$RESOURCE_GROUP" \
        subscriptionId="$SUBSCRIPTION_ID" \
    --name "automation-$(date +%Y%m%d-%H%M%S)" \
    --mode Incremental

echo ""
echo "Step 2: Getting Managed Identity Principal ID..."
PRINCIPAL_ID=$(az automation account show \
    --resource-group "$RESOURCE_GROUP" \
    --name "$AUTOMATION_ACCOUNT" \
    --query "identity.principalId" -o tsv)

echo "  Principal ID: $PRINCIPAL_ID"

echo ""
echo "Step 3: Assigning Contributor role to PostgreSQL server..."
az role assignment create \
    --assignee-object-id "$PRINCIPAL_ID" \
    --assignee-principal-type ServicePrincipal \
    --role "Contributor" \
    --scope "/subscriptions/$SUBSCRIPTION_ID/resourceGroups/$RESOURCE_GROUP/providers/Microsoft.DBforPostgreSQL/flexibleServers/$POSTGRES_SERVER" \
    2>/dev/null || echo "  Role assignment already exists (OK)"

echo ""
echo "Step 4: Importing PowerShell modules..."
echo "  Importing Az.Accounts..."
az automation module create \
    --resource-group "$RESOURCE_GROUP" \
    --automation-account-name "$AUTOMATION_ACCOUNT" \
    --name "Az.Accounts" \
    --content-link-uri "https://www.powershellgallery.com/api/v2/package/Az.Accounts" \
    2>/dev/null || echo "  Az.Accounts module already exists (OK)"

echo "  Waiting for Az.Accounts module to be ready (30s)..."
sleep 30

echo "  Importing Az.PostgreSql..."
az automation module create \
    --resource-group "$RESOURCE_GROUP" \
    --automation-account-name "$AUTOMATION_ACCOUNT" \
    --name "Az.PostgreSql" \
    --content-link-uri "https://www.powershellgallery.com/api/v2/package/Az.PostgreSql" \
    2>/dev/null || echo "  Az.PostgreSql module already exists (OK)"

echo ""
echo "Step 5: Uploading and publishing runbook scripts..."

echo "  Uploading Stop-PostgreSQL..."
az automation runbook replace-content \
    --resource-group "$RESOURCE_GROUP" \
    --automation-account-name "$AUTOMATION_ACCOUNT" \
    --name "Stop-PostgreSQL" \
    --content @Stop-PostgreSQL.ps1

echo "  Publishing Stop-PostgreSQL..."
az automation runbook publish \
    --resource-group "$RESOURCE_GROUP" \
    --automation-account-name "$AUTOMATION_ACCOUNT" \
    --name "Stop-PostgreSQL"

echo "  Uploading Start-PostgreSQL..."
az automation runbook replace-content \
    --resource-group "$RESOURCE_GROUP" \
    --automation-account-name "$AUTOMATION_ACCOUNT" \
    --name "Start-PostgreSQL" \
    --content @Start-PostgreSQL.ps1

echo "  Publishing Start-PostgreSQL..."
az automation runbook publish \
    --resource-group "$RESOURCE_GROUP" \
    --automation-account-name "$AUTOMATION_ACCOUNT" \
    --name "Start-PostgreSQL"

echo ""
echo "Step 6: Deploying schedules..."
az deployment group create \
    --resource-group "$RESOURCE_GROUP" \
    --template-file schedules.bicep \
    --parameters \
        environment="$ENVIRONMENT" \
    --name "schedules-$(date +%Y%m%d-%H%M%S)" \
    --mode Incremental

echo ""
echo "================================================"
echo "Deployment Complete!"
echo "================================================"
echo ""
echo "Configured:"
echo "  ✓ Automation Account: $AUTOMATION_ACCOUNT"
echo "  ✓ Stop-PostgreSQL runbook (daily at 20:00 CET)"
echo "  ✓ Start-PostgreSQL runbook (daily at 08:00 CET)"
echo "  ✓ Managed Identity with Contributor access"
echo ""
echo "IMPORTANT: Wait ~5 minutes for PowerShell modules to fully import"
echo ""
echo "Portal: https://portal.azure.com/#resource/subscriptions/$SUBSCRIPTION_ID/resourceGroups/$RESOURCE_GROUP/providers/Microsoft.Automation/automationAccounts/$AUTOMATION_ACCOUNT/runbooks"
echo ""
echo "Test commands:"
echo "  Stop:  az automation runbook start -g $RESOURCE_GROUP --automation-account-name $AUTOMATION_ACCOUNT -n Stop-PostgreSQL"
echo "  Start: az automation runbook start -g $RESOURCE_GROUP --automation-account-name $AUTOMATION_ACCOUNT -n Start-PostgreSQL"
echo ""
