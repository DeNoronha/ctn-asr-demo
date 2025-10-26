#!/bin/bash

#===============================================================================
# Create Dummy M2M Clients for Existing Members
#
# Purpose: Generate realistic M2M client registrations for testing
# Date: October 26, 2025
#===============================================================================

set -e

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Configuration
TENANT_ID="598664e7-725c-4daa-bd1f-89c4ada717ff"
API_APP_ID="d3037c11-a541-4f21-8862-8079137a0cde"
KEY_VAULT="kv-ctn-demo-asr-dev"
DB_HOST="psql-ctn-demo-asr-dev.postgres.database.azure.com"
DB_NAME="ctnregister"
DB_USER="psqladmin"

echo -e "${BLUE}═══════════════════════════════════════════════════════${NC}"
echo -e "${BLUE}  Create Dummy M2M Clients for Existing Members${NC}"
echo -e "${BLUE}═══════════════════════════════════════════════════════${NC}"
echo ""

# Check prerequisites
echo -e "${YELLOW}Checking prerequisites...${NC}"
command -v az >/dev/null 2>&1 || { echo -e "${RED}Error: Azure CLI not installed${NC}"; exit 1; }
command -v psql >/dev/null 2>&1 || { echo -e "${RED}Error: psql not installed${NC}"; exit 1; }
command -v jq >/dev/null 2>&1 || { echo -e "${RED}Error: jq not installed${NC}"; exit 1; }
echo -e "${GREEN}✓ Prerequisites OK${NC}"
echo ""

# Get database password from Key Vault
echo -e "${YELLOW}Getting database password from Key Vault...${NC}"
DB_PASSWORD=$(az keyvault secret show --vault-name $KEY_VAULT --name "PostgreSQL-Password" --query value -o tsv)
if [ -z "$DB_PASSWORD" ]; then
    echo -e "${RED}Error: Failed to get database password${NC}"
    exit 1
fi
echo -e "${GREEN}✓ Database credentials retrieved${NC}"
echo ""

# Get existing members with legal entities
echo -e "${YELLOW}Fetching existing members...${NC}"
PGPASSWORD=$DB_PASSWORD psql "host=$DB_HOST port=5432 dbname=$DB_NAME user=$DB_USER sslmode=require" \
  -t -A -F"," -c "
    SELECT
      le.legal_entity_id,
      le.primary_legal_name,
      m.membership_level
    FROM legal_entities le
    JOIN members m ON m.legal_entity_id = le.legal_entity_id
    WHERE le.is_active = true
    ORDER BY le.primary_legal_name
    LIMIT 10
  " > /tmp/members.csv

MEMBER_COUNT=$(wc -l < /tmp/members.csv | tr -d ' ')
echo -e "${GREEN}✓ Found $MEMBER_COUNT members${NC}"
echo ""

if [ "$MEMBER_COUNT" -eq 0 ]; then
    echo -e "${YELLOW}No members found. Exiting.${NC}"
    exit 0
fi

# M2M client templates by industry
declare -A CLIENT_TEMPLATES=(
    ["Transport"]="Transport Management System|Container.Read,ETA.Read|Automated container tracking and ETA updates"
    ["Logistics"]="Logistics Platform|Container.Read,Booking.Read|Real-time logistics visibility"
    ["Terminal"]="Terminal Operating System|Container.Read,Booking.Write|Terminal operations integration"
    ["Customs"]="Customs Broker System|Booking.Read,Container.Read|Customs clearance automation"
    ["Freight"]="Freight Forwarding Platform|Booking.Read,Booking.Write,ETA.Read|End-to-end freight management"
)

# Function to create M2M client in Azure AD
create_azure_app() {
    local client_name="$1"
    local legal_entity_name="$2"
    local scopes="$3"

    local full_name="CTN-M2M-${legal_entity_name}-${client_name// /-}"

    echo -e "${YELLOW}  Creating Azure AD app: $full_name${NC}"

    # Create app registration
    local app_id=$(az ad app create \
        --display-name "$full_name" \
        --sign-in-audience AzureADMyOrg \
        --query appId -o tsv)

    if [ -z "$app_id" ]; then
        echo -e "${RED}  ✗ Failed to create app${NC}"
        return 1
    fi

    # Create service principal
    az ad sp create --id $app_id >/dev/null 2>&1 || true

    # Generate client secret
    local secret=$(az ad app credential reset \
        --id $app_id \
        --append \
        --query password -o tsv)

    # Store secret in Key Vault
    local secret_name="M2M-${legal_entity_name// /-}-${client_name// /-}-Secret"
    az keyvault secret set \
        --vault-name $KEY_VAULT \
        --name "$secret_name" \
        --value "$secret" \
        >/dev/null 2>&1

    # Assign roles based on scopes
    local sp_object_id=$(az ad sp show --id $app_id --query id -o tsv)
    local api_sp_id=$(az ad sp list --filter "appId eq '$API_APP_ID'" --query "[0].id" -o tsv)

    IFS=',' read -ra SCOPE_ARRAY <<< "$scopes"
    for scope in "${SCOPE_ARRAY[@]}"; do
        local role_id=$(az ad app show --id $API_APP_ID \
            --query "appRoles[?value=='$scope'].id" -o tsv | head -1)

        if [ -n "$role_id" ]; then
            az rest --method POST \
                --uri "https://graph.microsoft.com/v1.0/servicePrincipals/$api_sp_id/appRoleAssignments" \
                --headers "Content-Type=application/json" \
                --body "{
                    \"principalId\": \"$sp_object_id\",
                    \"resourceId\": \"$api_sp_id\",
                    \"appRoleId\": \"$role_id\"
                }" >/dev/null 2>&1 || true
        fi
    done

    echo -e "${GREEN}  ✓ Azure AD app created: $app_id${NC}"
    echo "$app_id"
}

# Function to insert M2M client into database
insert_m2m_client() {
    local legal_entity_id="$1"
    local client_name="$2"
    local azure_client_id="$3"
    local description="$4"
    local scopes="$5"

    # Convert comma-separated scopes to PostgreSQL array format
    local scope_array="{${scopes}}"

    PGPASSWORD=$DB_PASSWORD psql "host=$DB_HOST port=5432 dbname=$DB_NAME user=$DB_USER sslmode=require" \
      -c "
        INSERT INTO m2m_clients (
          legal_entity_id,
          client_name,
          azure_client_id,
          description,
          assigned_scopes,
          is_active
        ) VALUES (
          '$legal_entity_id',
          '$client_name',
          '$azure_client_id',
          '$description',
          '$scope_array',
          true
        )
      " >/dev/null 2>&1

    echo -e "${GREEN}  ✓ Database record created${NC}"
}

# Process each member
COUNTER=0
while IFS=',' read -r legal_entity_id legal_name membership_level; do
    COUNTER=$((COUNTER + 1))

    echo -e "${BLUE}[$COUNTER/$MEMBER_COUNT] Processing: $legal_name${NC}"

    # Select 1-2 random client types
    NUM_CLIENTS=$((1 + RANDOM % 2))

    # Get random templates
    TEMPLATE_KEYS=(${!CLIENT_TEMPLATES[@]})
    SELECTED_TEMPLATES=()

    for i in $(seq 1 $NUM_CLIENTS); do
        RANDOM_INDEX=$((RANDOM % ${#TEMPLATE_KEYS[@]}))
        SELECTED_TEMPLATES+=("${TEMPLATE_KEYS[$RANDOM_INDEX]}")
    done

    for template_key in "${SELECTED_TEMPLATES[@]}"; do
        IFS='|' read -r client_name scopes description <<< "${CLIENT_TEMPLATES[$template_key]}"

        # Create Azure AD app
        azure_client_id=$(create_azure_app "$client_name" "$legal_name" "$scopes")

        if [ -n "$azure_client_id" ]; then
            # Insert into database
            insert_m2m_client "$legal_entity_id" "$client_name" "$azure_client_id" "$description" "$scopes"
        fi

        # Small delay to avoid rate limiting
        sleep 2
    done

    echo ""
done < /tmp/members.csv

# Cleanup
rm -f /tmp/members.csv

echo -e "${GREEN}═══════════════════════════════════════════════════════${NC}"
echo -e "${GREEN}  Dummy M2M Clients Created Successfully!${NC}"
echo -e "${GREEN}═══════════════════════════════════════════════════════${NC}"
echo ""
echo -e "${YELLOW}Summary:${NC}"
echo -e "  - Members processed: $MEMBER_COUNT"
echo -e "  - M2M clients created: ~$((MEMBER_COUNT * 3 / 2))"
echo -e "  - Secrets stored in Key Vault: $KEY_VAULT"
echo ""
echo -e "${BLUE}To view M2M clients in admin portal:${NC}"
echo -e "  1. Login to https://calm-tree-03352ba03.1.azurestaticapps.net"
echo -e "  2. Navigate to Members → Select a member → API Clients tab"
echo ""
