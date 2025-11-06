#!/bin/bash

# ============================================
# Zitadel M2M Authentication Setup Script
# ============================================
# This script automates the setup of:
# 1. Zitadel project for CTN ASR API
# 2. API application for token validation
# 3. Service accounts for M2M authentication
# 4. Client credentials for external organizations
#
# Prerequisites:
# - Zitadel running (docker-compose -f docker-compose.zitadel.yml up -d)
# - Admin credentials configured in .env.zitadel
# - jq installed (brew install jq)
#
# Usage: ./scripts/setup-zitadel-m2m.sh
# ============================================

set -e  # Exit on error

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Load environment variables
if [ -f .env.zitadel ]; then
    echo -e "${BLUE}Loading configuration from .env.zitadel${NC}"
    export $(cat .env.zitadel | grep -v '^#' | xargs)
else
    echo -e "${RED}Error: .env.zitadel not found${NC}"
    echo "Please copy .env.zitadel.example to .env.zitadel and configure it"
    exit 1
fi

# Configuration
ZITADEL_URL="${ZITADEL_ISSUER:-http://localhost:8080}"
ADMIN_USERNAME="${ZITADEL_ADMIN_USERNAME:-admin}"
# Read admin password from environment (fallback to example default - change in .env.zitadel!)
ADMIN_PASSWORD="${ZITADEL_ADMIN_PASSWORD}"
if [ -z "$ADMIN_PASSWORD" ]; then
  ADMIN_PASSWORD="Admin123!"
fi
PROJECT_NAME="CTN ASR API"
API_APP_NAME="CTN ASR Backend"

# Output file for generated credentials
OUTPUT_FILE="zitadel-credentials.json"

echo -e "${GREEN}======================================${NC}"
echo -e "${GREEN}Zitadel M2M Setup for CTN ASR${NC}"
echo -e "${GREEN}======================================${NC}"
echo ""

# Check if jq is installed
if ! command -v jq &> /dev/null; then
    echo -e "${RED}Error: jq is not installed${NC}"
    echo "Install with: brew install jq"
    exit 1
fi

# Check if Zitadel is running
echo -e "${BLUE}Checking Zitadel availability...${NC}"
if ! curl -s -f "${ZITADEL_URL}/debug/healthz" > /dev/null; then
    echo -e "${RED}Error: Zitadel is not accessible at ${ZITADEL_URL}${NC}"
    echo "Start Zitadel with: docker-compose -f docker-compose.zitadel.yml up -d"
    exit 1
fi
echo -e "${GREEN}✓ Zitadel is running${NC}"
echo ""

# Function to get access token for admin user
get_admin_token() {
    echo -e "${BLUE}Authenticating as admin user...${NC}"

    local response=$(curl -s -X POST "${ZITADEL_URL}/oauth/v2/token" \
        -H "Content-Type: application/x-www-form-urlencoded" \
        -d "grant_type=password" \
        -d "username=${ADMIN_USERNAME}" \
        -d "password=${ADMIN_PASSWORD}" \
        -d "scope=openid profile email urn:zitadel:iam:org:project:id:zitadel:aud")

    local token=$(echo "$response" | jq -r '.access_token')

    if [ "$token" == "null" ] || [ -z "$token" ]; then
        echo -e "${RED}Error: Failed to get admin access token${NC}"
        echo "Response: $response"
        exit 1
    fi

    echo -e "${GREEN}✓ Admin authentication successful${NC}"
    echo "$token"
}

# Get admin access token
ADMIN_TOKEN=$(get_admin_token)
echo ""

# Function to create project
create_project() {
    echo -e "${BLUE}Creating project: ${PROJECT_NAME}${NC}"

    local response=$(curl -s -X POST "${ZITADEL_URL}/management/v1/projects" \
        -H "Authorization: Bearer ${ADMIN_TOKEN}" \
        -H "Content-Type: application/json" \
        -d "{
            \"name\": \"${PROJECT_NAME}\",
            \"projectRoleAssertion\": true,
            \"projectRoleCheck\": true
        }")

    local project_id=$(echo "$response" | jq -r '.id')

    if [ "$project_id" == "null" ] || [ -z "$project_id" ]; then
        echo -e "${RED}Error: Failed to create project${NC}"
        echo "Response: $response"
        exit 1
    fi

    echo -e "${GREEN}✓ Project created with ID: ${project_id}${NC}"
    echo "$project_id"
}

# Function to create API application
create_api_application() {
    local project_id=$1
    echo -e "${BLUE}Creating API application: ${API_APP_NAME}${NC}"

    local response=$(curl -s -X POST "${ZITADEL_URL}/management/v1/projects/${project_id}/apps/api" \
        -H "Authorization: Bearer ${ADMIN_TOKEN}" \
        -H "Content-Type: application/json" \
        -d "{
            \"name\": \"${API_APP_NAME}\",
            \"authMethodType\": \"API_AUTH_METHOD_TYPE_BASIC\"
        }")

    local app_id=$(echo "$response" | jq -r '.appId')
    local client_id=$(echo "$response" | jq -r '.clientId')
    local client_secret=$(echo "$response" | jq -r '.clientSecret')

    if [ "$app_id" == "null" ] || [ -z "$app_id" ]; then
        echo -e "${RED}Error: Failed to create API application${NC}"
        echo "Response: $response"
        exit 1
    fi

    echo -e "${GREEN}✓ API application created${NC}"
    echo -e "  App ID: ${app_id}"
    echo -e "  Client ID: ${client_id}"

    echo "{\"app_id\":\"$app_id\",\"client_id\":\"$client_id\",\"client_secret\":\"$client_secret\"}"
}

# Function to create service user (machine user)
create_service_user() {
    local name=$1
    local description=$2

    echo -e "${BLUE}Creating service user: ${name}${NC}"

    local response=$(curl -s -X POST "${ZITADEL_URL}/management/v1/users/machine" \
        -H "Authorization: Bearer ${ADMIN_TOKEN}" \
        -H "Content-Type: application/json" \
        -d "{
            \"userName\": \"${name}\",
            \"name\": \"${name}\",
            \"description\": \"${description}\",
            \"accessTokenType\": \"ACCESS_TOKEN_TYPE_JWT\"
        }")

    local user_id=$(echo "$response" | jq -r '.userId')

    if [ "$user_id" == "null" ] || [ -z "$user_id" ]; then
        echo -e "${RED}Error: Failed to create service user${NC}"
        echo "Response: $response"
        exit 1
    fi

    echo -e "${GREEN}✓ Service user created with ID: ${user_id}${NC}"
    echo "$user_id"
}

# Function to create client credentials for service user
create_client_secret() {
    local user_id=$1
    local name=$2

    echo -e "${BLUE}Generating client secret for: ${name}${NC}"

    local response=$(curl -s -X PUT "${ZITADEL_URL}/management/v1/users/${user_id}/secret" \
        -H "Authorization: Bearer ${ADMIN_TOKEN}" \
        -H "Content-Type: application/json" \
        -d "{}")

    local client_id=$(echo "$response" | jq -r '.clientId')
    local client_secret=$(echo "$response" | jq -r '.clientSecret')

    if [ "$client_id" == "null" ] || [ -z "$client_id" ]; then
        echo -e "${RED}Error: Failed to generate client secret${NC}"
        echo "Response: $response"
        exit 1
    fi

    echo -e "${GREEN}✓ Client credentials generated${NC}"
    echo -e "  Client ID: ${client_id}"

    echo "{\"client_id\":\"$client_id\",\"client_secret\":\"$client_secret\"}"
}

# Function to grant project role to service user
grant_project_role() {
    local project_id=$1
    local user_id=$2
    local role_key=$3

    echo -e "${BLUE}Granting role '${role_key}' to service user${NC}"

    # First, create the role if it doesn't exist
    curl -s -X POST "${ZITADEL_URL}/management/v1/projects/${project_id}/roles" \
        -H "Authorization: Bearer ${ADMIN_TOKEN}" \
        -H "Content-Type: application/json" \
        -d "{
            \"roleKey\": \"${role_key}\",
            \"displayName\": \"${role_key}\",
            \"group\": \"api\"
        }" > /dev/null

    # Grant the role to the user
    local response=$(curl -s -X POST "${ZITADEL_URL}/management/v1/projects/${project_id}/users/${user_id}/roles" \
        -H "Authorization: Bearer ${ADMIN_TOKEN}" \
        -H "Content-Type: application/json" \
        -d "{
            \"roleKeys\": [\"${role_key}\"]
        }")

    echo -e "${GREEN}✓ Role granted${NC}"
}

# Main execution
echo -e "${YELLOW}Step 1: Creating Project${NC}"
PROJECT_ID=$(create_project)
echo ""

echo -e "${YELLOW}Step 2: Creating API Application${NC}"
API_APP=$(create_api_application "$PROJECT_ID")
API_CLIENT_ID=$(echo "$API_APP" | jq -r '.client_id')
API_CLIENT_SECRET=$(echo "$API_APP" | jq -r '.client_secret')
echo ""

echo -e "${YELLOW}Step 3: Creating Service Users${NC}"
echo ""

# Create service users for different organization types
declare -A SERVICE_USERS=(
    ["terminal-operator"]="Terminal Operator M2M Client"
    ["carrier"]="Carrier M2M Client"
    ["portal-integration"]="Portal Integration M2M Client"
    ["test-client"]="Test M2M Client"
)

# Initialize credentials JSON
CREDENTIALS_JSON="{\"project_id\":\"$PROJECT_ID\",\"api_client_id\":\"$API_CLIENT_ID\",\"api_client_secret\":\"$API_CLIENT_SECRET\",\"service_accounts\":[]}"

for username in "${!SERVICE_USERS[@]}"; do
    description="${SERVICE_USERS[$username]}"

    echo -e "${BLUE}Setting up: ${description}${NC}"

    # Create service user
    USER_ID=$(create_service_user "$username" "$description")

    # Generate client credentials
    CREDENTIALS=$(create_client_secret "$USER_ID" "$username")
    CLIENT_ID=$(echo "$CREDENTIALS" | jq -r '.client_id')
    CLIENT_SECRET=$(echo "$CREDENTIALS" | jq -r '.client_secret')

    # Grant API access role
    grant_project_role "$PROJECT_ID" "$USER_ID" "api.access"

    # Add to credentials JSON
    CREDENTIALS_JSON=$(echo "$CREDENTIALS_JSON" | jq \
        --arg name "$username" \
        --arg desc "$description" \
        --arg uid "$USER_ID" \
        --arg cid "$CLIENT_ID" \
        --arg secret "$CLIENT_SECRET" \
        '.service_accounts += [{
            "name": $name,
            "description": $desc,
            "user_id": $uid,
            "client_id": $cid,
            "client_secret": $secret
        }]')

    echo ""
done

# Save credentials to file
echo "$CREDENTIALS_JSON" | jq '.' > "$OUTPUT_FILE"

echo -e "${GREEN}======================================${NC}"
echo -e "${GREEN}Setup Complete!${NC}"
echo -e "${GREEN}======================================${NC}"
echo ""
echo -e "${YELLOW}Credentials saved to: ${OUTPUT_FILE}${NC}"
echo ""
echo -e "${BLUE}Project Information:${NC}"
echo -e "  Project ID: ${PROJECT_ID}"
echo -e "  API Client ID: ${API_CLIENT_ID}"
echo ""
echo -e "${BLUE}Service Accounts Created:${NC}"
for username in "${!SERVICE_USERS[@]}"; do
    echo -e "  - ${username}: ${SERVICE_USERS[$username]}"
done
echo ""
echo -e "${YELLOW}Next Steps:${NC}"
echo -e "1. Update .env.zitadel with the Project ID and API Client ID"
echo -e "2. Store service account credentials in Azure Key Vault"
echo -e "3. Test M2M authentication flow: node examples/m2m-auth-flow.js"
echo -e "4. Configure Azure Functions middleware for token validation"
echo ""
echo -e "${RED}IMPORTANT: Keep ${OUTPUT_FILE} secure and do not commit to version control${NC}"
echo ""
