#!/bin/bash

# ========================================
# Create Test M2M Client App Registration
# ========================================
# Creates a test client for M2M authentication testing
# Usage: ./create-test-m2m-client.sh

set -e

echo "=== Creating Test M2M Client ==="

# Configuration
API_APP_ID="d3037c11-a541-4f21-8862-8079137a0cde"
TENANT_ID="598664e7-725c-4daa-bd1f-89c4ada717ff"
TEST_CLIENT_NAME="CTN-M2M-TestClient"
KEY_VAULT_NAME="kv-ctn-demo-asr-dev"

# Step 1: Check if app already exists
echo "1. Checking if test client already exists..."
EXISTING_APP=$(az ad app list --display-name "$TEST_CLIENT_NAME" --query "[0].appId" -o tsv)

if [ -n "$EXISTING_APP" ]; then
    echo "⚠️  Test client already exists: $EXISTING_APP"
    echo "Do you want to create a new client secret? (y/n)"
    read -r RESPONSE
    if [ "$RESPONSE" != "y" ]; then
        echo "Exiting..."
        exit 0
    fi
    TEST_CLIENT_ID="$EXISTING_APP"
else
    # Step 2: Create app registration
    echo "2. Creating app registration..."
    az ad app create \
      --display-name "$TEST_CLIENT_NAME" \
      --sign-in-audience AzureADMyOrg \
      --output none

    # Get the app ID
    TEST_CLIENT_ID=$(az ad app list --display-name "$TEST_CLIENT_NAME" --query "[0].appId" -o tsv)
    echo "✅ Created app registration: $TEST_CLIENT_ID"
fi

# Step 3: Create client secret
echo ""
echo "3. Creating client secret..."
CLIENT_SECRET=$(az ad app credential reset \
  --id "$TEST_CLIENT_ID" \
  --append \
  --display-name "M2M-Test-Secret-$(date +%Y%m%d)" \
  --query password -o tsv)

echo "✅ Client secret created"
echo ""
echo "⚠️  IMPORTANT: Save this secret - it won't be shown again!"
echo "Client ID: $TEST_CLIENT_ID"
echo "Client Secret: $CLIENT_SECRET"
echo ""

# Step 4: Store in Key Vault
echo "4. Storing secret in Azure Key Vault..."
az keyvault secret set \
  --vault-name "$KEY_VAULT_NAME" \
  --name "M2M-TestClient-Secret" \
  --value "$CLIENT_SECRET" \
  --output none

az keyvault secret set \
  --vault-name "$KEY_VAULT_NAME" \
  --name "M2M-TestClient-ID" \
  --value "$TEST_CLIENT_ID" \
  --output none

echo "✅ Secrets stored in Key Vault: $KEY_VAULT_NAME"

# Step 5: Create service principal if not exists
echo ""
echo "5. Creating service principal..."
SP_EXISTS=$(az ad sp list --filter "appId eq '$TEST_CLIENT_ID'" --query "[0].id" -o tsv)

if [ -z "$SP_EXISTS" ]; then
    az ad sp create --id "$TEST_CLIENT_ID" --output none
    echo "✅ Service principal created"
else
    echo "✅ Service principal already exists"
fi

# Step 6: Get API service principal object ID
echo ""
echo "6. Getting API service principal..."
API_SP_OBJECT_ID=$(az ad sp list --filter "appId eq '$API_APP_ID'" --query "[0].id" -o tsv)

if [ -z "$API_SP_OBJECT_ID" ]; then
    echo "❌ API service principal not found. Creating..."
    az ad sp create --id "$API_APP_ID" --output none
    API_SP_OBJECT_ID=$(az ad sp list --filter "appId eq '$API_APP_ID'" --query "[0].id" -o tsv)
fi

echo "API Service Principal ID: $API_SP_OBJECT_ID"

# Step 7: Get test client service principal object ID
TEST_SP_OBJECT_ID=$(az ad sp list --filter "appId eq '$TEST_CLIENT_ID'" --query "[0].id" -o tsv)
echo "Test Client Service Principal ID: $TEST_SP_OBJECT_ID"

# Step 8: Get app role IDs
echo ""
echo "7. Getting app role IDs..."
ETA_READ_ROLE_ID=$(az ad app show --id "$API_APP_ID" --query "appRoles[?value=='ETA.Read'].id" -o tsv)
CONTAINER_READ_ROLE_ID=$(az ad app show --id "$API_APP_ID" --query "appRoles[?value=='Container.Read'].id" -o tsv)

echo "ETA.Read role ID: $ETA_READ_ROLE_ID"
echo "Container.Read role ID: $CONTAINER_READ_ROLE_ID"

# Step 8: Assign app roles
echo ""
echo "8. Assigning app roles to test client..."

# Assign ETA.Read
echo "Assigning ETA.Read..."
az rest --method POST \
  --uri "https://graph.microsoft.com/v1.0/servicePrincipals/$TEST_SP_OBJECT_ID/appRoleAssignments" \
  --headers "Content-Type=application/json" \
  --body "{
    \"principalId\": \"$TEST_SP_OBJECT_ID\",
    \"resourceId\": \"$API_SP_OBJECT_ID\",
    \"appRoleId\": \"$ETA_READ_ROLE_ID\"
  }" \
  --output none 2>/dev/null || echo "⚠️  ETA.Read may already be assigned"

# Assign Container.Read
echo "Assigning Container.Read..."
az rest --method POST \
  --uri "https://graph.microsoft.com/v1.0/servicePrincipals/$TEST_SP_OBJECT_ID/appRoleAssignments" \
  --headers "Content-Type=application/json" \
  --body "{
    \"principalId\": \"$TEST_SP_OBJECT_ID\",
    \"resourceId\": \"$API_SP_OBJECT_ID\",
    \"appRoleId\": \"$CONTAINER_READ_ROLE_ID\"
  }" \
  --output none 2>/dev/null || echo "⚠️  Container.Read may already be assigned"

echo ""
echo "✅ Successfully configured test M2M client!"
echo ""
echo "================================================"
echo "CREDENTIALS (save these securely)"
echo "================================================"
echo "Tenant ID: $TENANT_ID"
echo "API App ID: $API_APP_ID"
echo "Test Client ID: $TEST_CLIENT_ID"
echo "Test Client Secret: $CLIENT_SECRET"
echo ""
echo "Key Vault Secrets:"
echo "  M2M-TestClient-ID"
echo "  M2M-TestClient-Secret"
echo ""
echo "Assigned Roles:"
echo "  - ETA.Read"
echo "  - Container.Read"
echo ""
echo "================================================"
echo ""
echo "Next steps:"
echo "1. Test token acquisition with client credentials flow"
echo "2. Verify token contains correct roles"
echo "3. Implement M2M token validation middleware"
