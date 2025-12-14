#!/bin/bash
# ==============================================
# Test New Endpoints (December 2025)
# Tests for endpoints added during codebase alignment:
# - POST /v1/endpoints/:id/test
# - PATCH /v1/endpoints/:id/toggle
# - POST /v1/identifiers/:id/validate
# ==============================================

set -e

# Configuration
API_BASE_URL="${API_BASE_URL:-https://ca-ctn-asr-api-dev.calmriver-700a8c55.westeurope.azurecontainerapps.io}"
TENANT_ID="${AZURE_AD_TENANT_ID:-598664e7-725c-4daa-bd1f-89c4ada717ff}"
CLIENT_ID="${AZURE_AD_CLIENT_ID:-d3037c11-a541-4f21-8862-8079137a0cde}"
TEST_USER_EMAIL="${E2E_TEST_USER_EMAIL:-test-e2@denoronha.consulting}"
# shellcheck disable=SC2153 - Credential from environment variable (not hardcoded)
TEST_USER_CRED="${E2E_TEST_USER_PASSWORD:?E2E_TEST_USER_PASSWORD environment variable required}"
SCOPE="api://$CLIENT_ID/.default"

# Colors
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m'

# Counters
PASSED=0
FAILED=0

echo ""
echo "=============================================="
echo "  New Endpoints Test Suite (December 2025)"
echo "=============================================="
echo ""

# Password is already validated by the :? syntax above

# Acquire token
echo -e "${BLUE}Acquiring access token...${NC}"
TOKEN_RESPONSE=$(curl -s -X POST \
    "https://login.microsoftonline.com/$TENANT_ID/oauth2/v2.0/token" \
    -H "Content-Type: application/x-www-form-urlencoded" \
    -d "client_id=$CLIENT_ID" \
    -d "scope=$SCOPE" \
    -d "username=$TEST_USER_EMAIL" \
    -d "password=$TEST_USER_CRED" \
    -d "grant_type=password")

ACCESS_TOKEN=$(echo "$TOKEN_RESPONSE" | jq -r '.access_token // empty')

if [ -z "$ACCESS_TOKEN" ]; then
    echo -e "${RED}Failed to acquire token${NC}"
    echo "$TOKEN_RESPONSE" | jq '.error_description // .error'
    exit 1
fi
echo -e "${GREEN}Token acquired successfully${NC}"
echo ""

# Helper function
test_endpoint() {
    local name="$1"
    local method="$2"
    local url="$3"
    local data="$4"
    local expected="${5:-200}"

    echo -n "Testing $name... "

    if [ "$method" == "GET" ]; then
        response=$(curl -s -w "\n%{http_code}" \
            -H "Authorization: Bearer $ACCESS_TOKEN" \
            "$url")
    else
        response=$(curl -s -w "\n%{http_code}" \
            -X "$method" \
            -H "Authorization: Bearer $ACCESS_TOKEN" \
            -H "Content-Type: application/json" \
            -d "$data" \
            "$url")
    fi

    http_code=$(echo "$response" | tail -1)
    body=$(echo "$response" | sed '$d')

    if [ "$http_code" == "$expected" ]; then
        echo -e "${GREEN}PASS${NC} (HTTP $http_code)"
        ((PASSED++))
        return 0
    else
        echo -e "${RED}FAIL${NC} (Expected $expected, got $http_code)"
        echo "Response: $body" | head -3
        ((FAILED++))
        return 1
    fi
}

# ============================================
# Test Setup: Get a legal entity with endpoints
# ============================================
echo "-------------------------------------------"
echo "Setup: Finding test data"
echo "-------------------------------------------"

# Get members to find a legal entity
MEMBERS_RESPONSE=$(curl -s \
    -H "Authorization: Bearer $ACCESS_TOKEN" \
    "$API_BASE_URL/api/v1/members?page=1&pageSize=1")

LEGAL_ENTITY_ID=$(echo "$MEMBERS_RESPONSE" | jq -r '.data[0].legal_entity_id // empty')

if [ -z "$LEGAL_ENTITY_ID" ]; then
    echo -e "${RED}No members found to test with${NC}"
    exit 1
fi
echo "Using legal_entity_id: $LEGAL_ENTITY_ID"

# Get endpoints for this legal entity
ENDPOINTS_RESPONSE=$(curl -s \
    -H "Authorization: Bearer $ACCESS_TOKEN" \
    "$API_BASE_URL/api/v1/legal-entities/$LEGAL_ENTITY_ID/endpoints")

ENDPOINT_ID=$(echo "$ENDPOINTS_RESPONSE" | jq -r '.data[0].legal_entity_endpoint_id // empty')

# Get identifiers for this legal entity
IDENTIFIERS_RESPONSE=$(curl -s \
    -H "Authorization: Bearer $ACCESS_TOKEN" \
    "$API_BASE_URL/api/v1/entities/$LEGAL_ENTITY_ID/identifiers")

IDENTIFIER_ID=$(echo "$IDENTIFIERS_RESPONSE" | jq -r '.data[0].legal_entity_reference_id // empty')

echo "Found endpoint_id: ${ENDPOINT_ID:-none}"
echo "Found identifier_id: ${IDENTIFIER_ID:-none}"
echo ""

# ============================================
# Test 1: POST /v1/endpoints/:id/test
# ============================================
echo "-------------------------------------------"
echo "Test 1: Endpoint Connection Test"
echo "-------------------------------------------"

if [ -n "$ENDPOINT_ID" ]; then
    test_endpoint "POST /endpoints/:id/test" "POST" \
        "$API_BASE_URL/api/v1/endpoints/$ENDPOINT_ID/test" \
        "{}" \
        "200"

    # Verify response structure
    RESPONSE=$(curl -s \
        -X POST \
        -H "Authorization: Bearer $ACCESS_TOKEN" \
        -H "Content-Type: application/json" \
        "$API_BASE_URL/api/v1/endpoints/$ENDPOINT_ID/test")

    HAS_SUCCESS=$(echo "$RESPONSE" | jq 'has("success")')
    HAS_DETAILS=$(echo "$RESPONSE" | jq 'has("details")')

    if [ "$HAS_SUCCESS" == "true" ] && [ "$HAS_DETAILS" == "true" ]; then
        echo -e "  ${GREEN}Response structure valid${NC} (has success, details)"
        ((PASSED++))
    else
        echo -e "  ${RED}Response structure invalid${NC}"
        echo "  Response: $RESPONSE"
        ((FAILED++))
    fi
else
    echo -e "${YELLOW}SKIP: No endpoint found to test${NC}"
fi

# Test with invalid ID
test_endpoint "POST /endpoints/:id/test (404)" "POST" \
    "$API_BASE_URL/api/v1/endpoints/00000000-0000-0000-0000-000000000000/test" \
    "{}" \
    "404"

echo ""

# ============================================
# Test 2: PATCH /v1/endpoints/:id/toggle
# ============================================
echo "-------------------------------------------"
echo "Test 2: Endpoint Toggle"
echo "-------------------------------------------"

if [ -n "$ENDPOINT_ID" ]; then
    # Toggle to inactive
    test_endpoint "PATCH /endpoints/:id/toggle (deactivate)" "PATCH" \
        "$API_BASE_URL/api/v1/endpoints/$ENDPOINT_ID/toggle" \
        '{"is_active": false}' \
        "200"

    # Toggle back to active
    test_endpoint "PATCH /endpoints/:id/toggle (activate)" "PATCH" \
        "$API_BASE_URL/api/v1/endpoints/$ENDPOINT_ID/toggle" \
        '{"is_active": true}' \
        "200"
else
    echo -e "${YELLOW}SKIP: No endpoint found to test${NC}"
fi

# Test with invalid body (only if we have a valid endpoint to test against)
if [ -n "$ENDPOINT_ID" ]; then
    test_endpoint "PATCH /endpoints/:id/toggle (bad request)" "PATCH" \
        "$API_BASE_URL/api/v1/endpoints/$ENDPOINT_ID/toggle" \
        '{"is_active": "not-boolean"}' \
        "400"
fi

# Test with invalid ID
test_endpoint "PATCH /endpoints/:id/toggle (404)" "PATCH" \
    "$API_BASE_URL/api/v1/endpoints/00000000-0000-0000-0000-000000000000/toggle" \
    '{"is_active": true}' \
    "404"

echo ""

# ============================================
# Test 3: POST /v1/identifiers/:id/validate
# ============================================
echo "-------------------------------------------"
echo "Test 3: Identifier Validation"
echo "-------------------------------------------"

if [ -n "$IDENTIFIER_ID" ]; then
    test_endpoint "POST /identifiers/:id/validate" "POST" \
        "$API_BASE_URL/api/v1/identifiers/$IDENTIFIER_ID/validate" \
        "{}" \
        "200"

    # Verify response structure
    RESPONSE=$(curl -s \
        -X POST \
        -H "Authorization: Bearer $ACCESS_TOKEN" \
        -H "Content-Type: application/json" \
        "$API_BASE_URL/api/v1/identifiers/$IDENTIFIER_ID/validate")

    HAS_VALID=$(echo "$RESPONSE" | jq 'has("valid")')
    HAS_DETAILS=$(echo "$RESPONSE" | jq 'has("details")')

    if [ "$HAS_VALID" == "true" ] && [ "$HAS_DETAILS" == "true" ]; then
        echo -e "  ${GREEN}Response structure valid${NC} (has valid, details)"
        ((PASSED++))
    else
        echo -e "  ${RED}Response structure invalid${NC}"
        echo "  Response: $RESPONSE"
        ((FAILED++))
    fi
else
    echo -e "${YELLOW}SKIP: No identifier found to test${NC}"
fi

# Test with invalid ID
test_endpoint "POST /identifiers/:id/validate (404)" "POST" \
    "$API_BASE_URL/api/v1/identifiers/00000000-0000-0000-0000-000000000000/validate" \
    "{}" \
    "404"

echo ""

# ============================================
# Results
# ============================================
echo "=============================================="
echo "  Results: $PASSED passed, $FAILED failed"
echo "=============================================="
echo ""

if [ $FAILED -gt 0 ]; then
    echo -e "${RED}SOME TESTS FAILED!${NC}"
    exit 1
else
    echo -e "${GREEN}ALL TESTS PASSED!${NC}"
    exit 0
fi
