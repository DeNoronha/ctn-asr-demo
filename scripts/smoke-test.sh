#!/bin/bash
# ==============================================
# CTN ASR Smoke Test Battery
# Run before commits and after deployments
# ==============================================

# Configuration
# API migrated from Azure Functions to Container Apps (November 2025)
API_BASE_URL="${API_BASE_URL:-https://ca-ctn-asr-api-dev.calmriver-700a8c55.westeurope.azurecontainerapps.io}"
ADMIN_PORTAL_URL="${ADMIN_PORTAL_URL:-https://calm-tree-03352ba03.1.azurestaticapps.net}"
MEMBER_PORTAL_URL="${MEMBER_PORTAL_URL:-https://calm-pebble-043b2db03.1.azurestaticapps.net}"
TIMEOUT=10

# Azure AD Configuration (E2E Test User - MFA excluded)
# Credentials from environment or .credentials file
TENANT_ID="${AZURE_AD_TENANT_ID:-598664e7-725c-4daa-bd1f-89c4ada717ff}"
CLIENT_ID="${AZURE_AD_CLIENT_ID:-d3037c11-a541-4f21-8862-8079137a0cde}"
TEST_USER_EMAIL="${E2E_TEST_USER_EMAIL:-test-e2@denoronha.consulting}"
TEST_USER_PASSWORD="${E2E_TEST_USER_PASSWORD}"
SCOPE="api://$CLIENT_ID/.default"

# Check if password is set
if [ -z "$TEST_USER_PASSWORD" ]; then
    echo "WARNING: E2E_TEST_USER_PASSWORD not set in environment"
    echo "Set it from .credentials: export E2E_TEST_USER_PASSWORD=<password>"
    echo "Skipping authenticated endpoint tests..."
    SKIP_AUTH_TESTS=true
fi

# Colors
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m'

# Counters
PASSED=0
FAILED=0

echo ""
echo "=============================================="
echo "  CTN ASR Smoke Test Battery"
echo "=============================================="
echo ""

# Function to test an endpoint
test_endpoint() {
    local name="$1"
    local url="$2"
    local expected_code="${3:-200}"

    http_code=$(curl -s -o /dev/null -w "%{http_code}" --connect-timeout $TIMEOUT "$url" 2>/dev/null || echo "000")

    if [ "$http_code" == "$expected_code" ]; then
        echo -e "${GREEN}[PASS]${NC} $name - HTTP $http_code"
        ((PASSED++))
    elif [ "$http_code" == "000" ]; then
        echo -e "${RED}[FAIL]${NC} $name - Connection timeout/failed"
        ((FAILED++))
    else
        echo -e "${RED}[FAIL]${NC} $name - Expected $expected_code, got $http_code"
        ((FAILED++))
    fi
}

echo "Testing Public API Endpoints..."
echo "-------------------------------"

# Critical public API endpoints
test_endpoint "API Health" "$API_BASE_URL/api/health" 200
test_endpoint "API Version" "$API_BASE_URL/api/v1/version" 200
test_endpoint "API Root" "$API_BASE_URL/" 200

echo ""
echo "Testing Portal Connectivity..."
echo "------------------------------"

# Portal health checks
test_endpoint "Admin Portal" "$ADMIN_PORTAL_URL" 200
test_endpoint "Member Portal" "$MEMBER_PORTAL_URL" 200

if [ "$SKIP_AUTH_TESTS" != "true" ]; then
    echo ""
    echo "Acquiring Access Token..."
    echo "-------------------------"

    # Get access token using ROPC flow (test user has MFA exclusion)
    TOKEN_RESPONSE=$(curl -s -X POST \
        "https://login.microsoftonline.com/$TENANT_ID/oauth2/v2.0/token" \
        -H "Content-Type: application/x-www-form-urlencoded" \
        -d "client_id=$CLIENT_ID" \
        -d "scope=$SCOPE" \
        -d "username=$TEST_USER_EMAIL" \
        -d "password=$TEST_USER_PASSWORD" \
        -d "grant_type=password" \
        2>/dev/null)

# Extract token using jq (more reliable than grep for JSON)
if command -v jq &> /dev/null; then
    ACCESS_TOKEN=$(echo "$TOKEN_RESPONSE" | jq -r '.access_token // empty')
else
    # Fallback to grep if jq not available
    ACCESS_TOKEN=$(echo "$TOKEN_RESPONSE" | grep -o '"access_token":"[^"]*' | cut -d'"' -f4)
fi

if [ -z "$ACCESS_TOKEN" ]; then
    echo -e "${RED}[FAIL]${NC} Token acquisition failed"
    ERROR_DESC=$(echo "$TOKEN_RESPONSE" | grep -o '"error_description":"[^"]*' | cut -d'"' -f4)
    if [ -n "$ERROR_DESC" ]; then
        echo "       Error: $ERROR_DESC"
    fi
    ((FAILED++))
else
    echo -e "${GREEN}[PASS]${NC} Token acquired successfully"
    ((PASSED++))

    echo ""
    echo "Testing Authenticated Endpoints..."
    echo "----------------------------------"

    # Function to test authenticated endpoint
    test_auth_endpoint() {
        local name="$1"
        local url="$2"
        local expected="${3:-200}"

        # Debug: show token length
        # echo "DEBUG: Token length: ${#ACCESS_TOKEN}, URL: $url"

        http_code=$(curl -s -o /dev/null -w "%{http_code}" --connect-timeout $TIMEOUT \
            -H "Authorization: Bearer $ACCESS_TOKEN" \
            "$url" 2>/dev/null || echo "000")

        if [ "$http_code" == "$expected" ]; then
            echo -e "${GREEN}[PASS]${NC} $name - HTTP $http_code"
            ((PASSED++))
        elif [ "$http_code" == "000" ]; then
            echo -e "${RED}[FAIL]${NC} $name - Connection timeout/failed"
            ((FAILED++))
        else
            echo -e "${RED}[FAIL]${NC} $name - Expected $expected, got $http_code"
            ((FAILED++))
        fi
    }

    # Test critical authenticated endpoints (Admin Portal - SystemAdmin user)
    # Updated endpoint paths for Container Apps migration (November 2025)
    test_auth_endpoint "Get All Members" "$API_BASE_URL/api/v1/members" 200
    test_auth_endpoint "Get Applications" "$API_BASE_URL/api/v1/applications" 200
    test_auth_endpoint "Get Tasks" "$API_BASE_URL/api/v1/tasks" 200
    test_auth_endpoint "Get Audit Logs" "$API_BASE_URL/api/v1/audit-logs" 200
fi
fi  # End of SKIP_AUTH_TESTS check

echo ""
echo "=============================================="
echo "  Results: $PASSED passed, $FAILED failed"
echo "=============================================="
echo ""

if [ $FAILED -gt 0 ]; then
    echo -e "${RED}SMOKE TESTS FAILED!${NC}"
    echo "Please fix the issues before committing."
    exit 1
else
    echo -e "${GREEN}ALL SMOKE TESTS PASSED!${NC}"
    exit 0
fi
