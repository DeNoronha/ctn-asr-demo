#!/bin/bash

#===============================================================================
# M2M Clients CRUD Test Suite
#
# Purpose: Test M2M client management API endpoints (CRUD operations)
# Date: October 26, 2025
# Tests:
#   1. List M2M clients (empty)
#   2. Create M2M client
#   3. List M2M clients (with data)
#   4. Generate secret
#   5. Update scopes
#   6. Deactivate client
#   7. IDOR protection tests
#   8. Validation tests
#===============================================================================

set -e

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
CYAN='\033[0;36m'
NC='\033[0m' # No Color

# Configuration
TENANT_ID="598664e7-725c-4daa-bd1f-89c4ada717ff"
API_APP_ID="d3037c11-a541-4f21-8862-8079137a0cde"
API_BASE_URL="https://func-ctn-demo-asr-dev.azurewebsites.net/api/v1"

# Test counters
TOTAL_TESTS=0
PASSED_TESTS=0
FAILED_TESTS=0

echo -e "${BLUE}═══════════════════════════════════════════════════════${NC}"
echo -e "${BLUE}  M2M Clients CRUD Test Suite${NC}"
echo -e "${BLUE}═══════════════════════════════════════════════════════${NC}"
echo ""
echo -e "API Base URL: $API_BASE_URL"
echo ""

# Check prerequisites
echo -e "${YELLOW}Checking prerequisites...${NC}"
command -v jq >/dev/null 2>&1 || { echo -e "${RED}Error: jq not installed${NC}"; exit 1; }
command -v az >/dev/null 2>&1 || { echo -e "${RED}Error: Azure CLI not installed${NC}"; exit 1; }
echo -e "${GREEN}✓ Prerequisites OK${NC}"
echo ""

# =====================================================
# Helper Functions
# =====================================================

run_test() {
  local test_name="$1"
  local method="$2"
  local endpoint="$3"
  local expected_status="$4"
  local auth_token="$5"
  local body="$6"

  TOTAL_TESTS=$((TOTAL_TESTS + 1))

  echo -e "${CYAN}Test $TOTAL_TESTS: $test_name${NC}"

  # Build curl command
  if [ -n "$body" ]; then
    RESPONSE=$(curl -s -w "\nHTTP_CODE:%{http_code}" \
      -X $method "$API_BASE_URL$endpoint" \
      -H "Authorization: Bearer $auth_token" \
      -H "Content-Type: application/json" \
      -d "$body" 2>/dev/null)
  else
    RESPONSE=$(curl -s -w "\nHTTP_CODE:%{http_code}" \
      -X $method "$API_BASE_URL$endpoint" \
      -H "Authorization: Bearer $auth_token" \
      -H "Content-Type: application/json" 2>/dev/null)
  fi

  HTTP_CODE=$(echo "$RESPONSE" | grep "HTTP_CODE:" | cut -d':' -f2)
  BODY=$(echo "$RESPONSE" | sed '/HTTP_CODE:/d')

  if [ "$HTTP_CODE" = "$expected_status" ]; then
    echo -e "${GREEN}✅ PASS - Got expected status $HTTP_CODE${NC}"
    PASSED_TESTS=$((PASSED_TESTS + 1))

    # Store response for later use
    LAST_RESPONSE="$BODY"
  else
    echo -e "${RED}❌ FAIL - Expected $expected_status but got $HTTP_CODE${NC}"
    echo -e "${YELLOW}Response:${NC}"
    echo "$BODY" | jq '.' 2>/dev/null || echo "$BODY"
    FAILED_TESTS=$((FAILED_TESTS + 1))
    LAST_RESPONSE=""
  fi

  echo ""
}

# =====================================================
# Step 1: Get Authentication Token
# =====================================================

echo -e "${BLUE}Step 1: Get authentication token${NC}"
echo -e "${YELLOW}Acquiring Azure AD access token...${NC}"

# Get test user credentials from environment or use hardcoded for testing
# For admin portal testing, we need to use interactive auth or service principal
# For this test, we'll use the admin portal's client ID with delegated permissions

TOKEN_RESPONSE=$(az account get-access-token \
  --resource "api://$API_APP_ID" \
  --query accessToken -o tsv 2>/dev/null)

if [ -z "$TOKEN_RESPONSE" ] || [ "$TOKEN_RESPONSE" = "null" ]; then
  echo -e "${RED}❌ Failed to acquire access token${NC}"
  echo -e "${YELLOW}Please login with: az login${NC}"
  exit 1
fi

ACCESS_TOKEN="$TOKEN_RESPONSE"
echo -e "${GREEN}✓ Access token acquired${NC}"
echo ""

# =====================================================
# Step 2: Get Test Legal Entity
# =====================================================

echo -e "${BLUE}Step 2: Get test legal entity${NC}"
echo -e "${YELLOW}Fetching legal entities to use for testing...${NC}"

# Get first legal entity from members endpoint
MEMBERS_RESPONSE=$(curl -s \
  "$API_BASE_URL/members?page=1&limit=1" \
  -H "Authorization: Bearer $ACCESS_TOKEN" \
  -H "Content-Type: application/json")

LEGAL_ENTITY_ID=$(echo "$MEMBERS_RESPONSE" | jq -r '.data[0].legal_entity_id // empty')

if [ -z "$LEGAL_ENTITY_ID" ]; then
  echo -e "${RED}❌ Failed to get test legal entity${NC}"
  echo -e "${YELLOW}Response: $MEMBERS_RESPONSE${NC}"
  exit 1
fi

echo -e "${GREEN}✓ Using legal entity: $LEGAL_ENTITY_ID${NC}"
echo ""

# Get a second legal entity for IDOR testing
LEGAL_ENTITY_ID_2=$(echo "$MEMBERS_RESPONSE" | jq -r '.data[1].legal_entity_id // empty')
if [ -n "$LEGAL_ENTITY_ID_2" ]; then
  echo -e "${GREEN}✓ Second legal entity for IDOR tests: $LEGAL_ENTITY_ID_2${NC}"
else
  echo -e "${YELLOW}⚠ Only one legal entity available, skipping IDOR tests${NC}"
fi
echo ""

# =====================================================
# Phase 1: List M2M Clients (Should be empty initially)
# =====================================================

echo -e "${BLUE}═══════════════════════════════════════════════════════${NC}"
echo -e "${BLUE}Phase 1: List M2M Clients${NC}"
echo -e "${BLUE}═══════════════════════════════════════════════════════${NC}"
echo ""

run_test \
  "List M2M clients for legal entity (expect empty or existing)" \
  "GET" \
  "/legal-entities/$LEGAL_ENTITY_ID/m2m-clients" \
  "200" \
  "$ACCESS_TOKEN"

# Check if response is paginated
INITIAL_COUNT=$(echo "$LAST_RESPONSE" | jq -r '.data | length // 0')
echo -e "${CYAN}Initial M2M client count: $INITIAL_COUNT${NC}"
echo ""

# =====================================================
# Phase 2: Create M2M Client
# =====================================================

echo -e "${BLUE}═══════════════════════════════════════════════════════${NC}"
echo -e "${BLUE}Phase 2: Create M2M Client${NC}"
echo -e "${BLUE}═══════════════════════════════════════════════════════${NC}"
echo ""

# Test: Create M2M client with valid data
CREATE_PAYLOAD=$(cat <<EOF
{
  "client_name": "Test API Client",
  "description": "Automated test client for E2E testing",
  "assigned_scopes": ["ETA.Read", "Container.Read"]
}
EOF
)

run_test \
  "Create M2M client with valid data" \
  "POST" \
  "/legal-entities/$LEGAL_ENTITY_ID/m2m-clients" \
  "201" \
  "$ACCESS_TOKEN" \
  "$CREATE_PAYLOAD"

# Extract created client ID
M2M_CLIENT_ID=$(echo "$LAST_RESPONSE" | jq -r '.m2m_client_id // empty')
AZURE_CLIENT_ID=$(echo "$LAST_RESPONSE" | jq -r '.azure_client_id // empty')

if [ -z "$M2M_CLIENT_ID" ]; then
  echo -e "${RED}❌ Failed to extract M2M client ID from response${NC}"
  exit 1
fi

echo -e "${GREEN}✓ Created M2M client: $M2M_CLIENT_ID${NC}"
echo -e "${GREEN}✓ Azure client ID: $AZURE_CLIENT_ID${NC}"
echo ""

# Test: Create M2M client with missing required fields
INVALID_CREATE_PAYLOAD=$(cat <<EOF
{
  "description": "Missing client_name and assigned_scopes"
}
EOF
)

run_test \
  "Create M2M client with missing required fields (expect 400)" \
  "POST" \
  "/legal-entities/$LEGAL_ENTITY_ID/m2m-clients" \
  "400" \
  "$ACCESS_TOKEN" \
  "$INVALID_CREATE_PAYLOAD"

# Test: Create M2M client with invalid scopes
INVALID_SCOPES_PAYLOAD=$(cat <<EOF
{
  "client_name": "Invalid Scopes Client",
  "assigned_scopes": ["InvalidScope", "ETA.Read"]
}
EOF
)

run_test \
  "Create M2M client with invalid scopes (expect 400)" \
  "POST" \
  "/legal-entities/$LEGAL_ENTITY_ID/m2m-clients" \
  "400" \
  "$ACCESS_TOKEN" \
  "$INVALID_SCOPES_PAYLOAD"

# Test: Create M2M client with empty scopes array
EMPTY_SCOPES_PAYLOAD=$(cat <<EOF
{
  "client_name": "Empty Scopes Client",
  "assigned_scopes": []
}
EOF
)

run_test \
  "Create M2M client with empty scopes array (expect 400)" \
  "POST" \
  "/legal-entities/$LEGAL_ENTITY_ID/m2m-clients" \
  "400" \
  "$ACCESS_TOKEN" \
  "$EMPTY_SCOPES_PAYLOAD"

# =====================================================
# Phase 3: List M2M Clients (Should now have data)
# =====================================================

echo -e "${BLUE}═══════════════════════════════════════════════════════${NC}"
echo -e "${BLUE}Phase 3: List M2M Clients (After Creation)${NC}"
echo -e "${BLUE}═══════════════════════════════════════════════════════${NC}"
echo ""

run_test \
  "List M2M clients for legal entity (expect at least 1)" \
  "GET" \
  "/legal-entities/$LEGAL_ENTITY_ID/m2m-clients" \
  "200" \
  "$ACCESS_TOKEN"

NEW_COUNT=$(echo "$LAST_RESPONSE" | jq -r '.data | length // 0')
echo -e "${CYAN}M2M client count after creation: $NEW_COUNT${NC}"
echo ""

# Verify the created client is in the list
CLIENT_IN_LIST=$(echo "$LAST_RESPONSE" | jq -r ".data[] | select(.m2m_client_id == \"$M2M_CLIENT_ID\") | .m2m_client_id")

if [ "$CLIENT_IN_LIST" = "$M2M_CLIENT_ID" ]; then
  echo -e "${GREEN}✓ Created client found in list${NC}"
else
  echo -e "${RED}❌ Created client NOT found in list${NC}"
  FAILED_TESTS=$((FAILED_TESTS + 1))
fi
echo ""

# =====================================================
# Phase 4: Generate Secret
# =====================================================

echo -e "${BLUE}═══════════════════════════════════════════════════════${NC}"
echo -e "${BLUE}Phase 4: Generate Secret${NC}"
echo -e "${BLUE}═══════════════════════════════════════════════════════${NC}"
echo ""

# Test: Generate secret for M2M client
GENERATE_SECRET_PAYLOAD=$(cat <<EOF
{
  "expires_in_days": 365
}
EOF
)

run_test \
  "Generate secret for M2M client" \
  "POST" \
  "/m2m-clients/$M2M_CLIENT_ID/generate-secret" \
  "200" \
  "$ACCESS_TOKEN" \
  "$GENERATE_SECRET_PAYLOAD"

# Extract secret (ONLY TIME it's returned)
CLIENT_SECRET=$(echo "$LAST_RESPONSE" | jq -r '.secret // empty')
EXPIRES_AT=$(echo "$LAST_RESPONSE" | jq -r '.expires_at // empty')

if [ -n "$CLIENT_SECRET" ]; then
  echo -e "${GREEN}✓ Secret generated: ${CLIENT_SECRET:0:20}...${NC}"
  echo -e "${GREEN}✓ Expires at: $EXPIRES_AT${NC}"
else
  echo -e "${RED}❌ No secret in response${NC}"
  FAILED_TESTS=$((FAILED_TESTS + 1))
fi
echo ""

# Test: Generate secret for non-existent client
FAKE_CLIENT_ID="00000000-0000-0000-0000-000000000000"

run_test \
  "Generate secret for non-existent client (expect 404)" \
  "POST" \
  "/m2m-clients/$FAKE_CLIENT_ID/generate-secret" \
  "404" \
  "$ACCESS_TOKEN" \
  "$GENERATE_SECRET_PAYLOAD"

# =====================================================
# Phase 5: Update Scopes
# =====================================================

echo -e "${BLUE}═══════════════════════════════════════════════════════${NC}"
echo -e "${BLUE}Phase 5: Update Scopes${NC}"
echo -e "${BLUE}═══════════════════════════════════════════════════════${NC}"
echo ""

# Test: Update scopes successfully
UPDATE_SCOPES_PAYLOAD=$(cat <<EOF
{
  "assigned_scopes": ["ETA.Read", "Container.Read", "Booking.Read"]
}
EOF
)

run_test \
  "Update M2M client scopes" \
  "PATCH" \
  "/m2m-clients/$M2M_CLIENT_ID/scopes" \
  "200" \
  "$ACCESS_TOKEN" \
  "$UPDATE_SCOPES_PAYLOAD"

# Verify scopes were updated
UPDATED_SCOPES=$(echo "$LAST_RESPONSE" | jq -r '.assigned_scopes // []')
echo -e "${CYAN}Updated scopes: $UPDATED_SCOPES${NC}"
echo ""

# Test: Update with invalid scopes
INVALID_UPDATE_SCOPES=$(cat <<EOF
{
  "assigned_scopes": ["InvalidScope"]
}
EOF
)

run_test \
  "Update M2M client with invalid scopes (expect 400)" \
  "PATCH" \
  "/m2m-clients/$M2M_CLIENT_ID/scopes" \
  "400" \
  "$ACCESS_TOKEN" \
  "$INVALID_UPDATE_SCOPES"

# Test: Update with empty scopes
EMPTY_UPDATE_SCOPES=$(cat <<EOF
{
  "assigned_scopes": []
}
EOF
)

run_test \
  "Update M2M client with empty scopes (expect 400)" \
  "PATCH" \
  "/m2m-clients/$M2M_CLIENT_ID/scopes" \
  "400" \
  "$ACCESS_TOKEN" \
  "$EMPTY_UPDATE_SCOPES"

# =====================================================
# Phase 6: IDOR Protection Tests
# =====================================================

if [ -n "$LEGAL_ENTITY_ID_2" ]; then
  echo -e "${BLUE}═══════════════════════════════════════════════════════${NC}"
  echo -e "${BLUE}Phase 6: IDOR Protection Tests${NC}"
  echo -e "${BLUE}═══════════════════════════════════════════════════════${NC}"
  echo ""

  # Create M2M client for second legal entity
  CREATE_PAYLOAD_2=$(cat <<EOF
{
  "client_name": "IDOR Test Client",
  "description": "Client for IDOR testing",
  "assigned_scopes": ["ETA.Read"]
}
EOF
)

  run_test \
    "Create M2M client for second legal entity" \
    "POST" \
    "/legal-entities/$LEGAL_ENTITY_ID_2/m2m-clients" \
    "201" \
    "$ACCESS_TOKEN" \
    "$CREATE_PAYLOAD_2"

  M2M_CLIENT_ID_2=$(echo "$LAST_RESPONSE" | jq -r '.m2m_client_id // empty')

  if [ -n "$M2M_CLIENT_ID_2" ]; then
    echo -e "${GREEN}✓ Created second M2M client: $M2M_CLIENT_ID_2${NC}"
    echo ""

    # Test: Try to generate secret for client belonging to different legal entity
    # Note: This should return 404 to prevent information disclosure
    run_test \
      "IDOR: Generate secret for client from different legal entity (expect 404)" \
      "POST" \
      "/m2m-clients/$M2M_CLIENT_ID_2/generate-secret" \
      "404" \
      "$ACCESS_TOKEN" \
      "$GENERATE_SECRET_PAYLOAD"

    # Test: Try to update scopes for client belonging to different legal entity
    run_test \
      "IDOR: Update scopes for client from different legal entity (expect 404)" \
      "PATCH" \
      "/m2m-clients/$M2M_CLIENT_ID_2/scopes" \
      "404" \
      "$ACCESS_TOKEN" \
      "$UPDATE_SCOPES_PAYLOAD"

    # Test: Try to deactivate client belonging to different legal entity
    DEACTIVATE_PAYLOAD=$(cat <<EOF
{
  "reason": "IDOR test attempt"
}
EOF
)

    run_test \
      "IDOR: Deactivate client from different legal entity (expect 404)" \
      "DELETE" \
      "/m2m-clients/$M2M_CLIENT_ID_2" \
      "404" \
      "$ACCESS_TOKEN" \
      "$DEACTIVATE_PAYLOAD"

  else
    echo -e "${YELLOW}⚠ Failed to create second M2M client, skipping IDOR tests${NC}"
  fi
else
  echo -e "${YELLOW}⚠ Only one legal entity available, skipping IDOR tests${NC}"
fi
echo ""

# =====================================================
# Phase 7: Deactivate M2M Client
# =====================================================

echo -e "${BLUE}═══════════════════════════════════════════════════════${NC}"
echo -e "${BLUE}Phase 7: Deactivate M2M Client${NC}"
echo -e "${BLUE}═══════════════════════════════════════════════════════${NC}"
echo ""

# Test: Deactivate M2M client
DEACTIVATE_PAYLOAD=$(cat <<EOF
{
  "reason": "Test completed - cleaning up"
}
EOF
)

run_test \
  "Deactivate M2M client" \
  "DELETE" \
  "/m2m-clients/$M2M_CLIENT_ID" \
  "200" \
  "$ACCESS_TOKEN" \
  "$DEACTIVATE_PAYLOAD"

# Verify deactivation
DEACTIVATED_AT=$(echo "$LAST_RESPONSE" | jq -r '.deactivated_at // empty')
if [ -n "$DEACTIVATED_AT" ]; then
  echo -e "${GREEN}✓ Client deactivated at: $DEACTIVATED_AT${NC}"
else
  echo -e "${RED}❌ No deactivation timestamp in response${NC}"
  FAILED_TESTS=$((FAILED_TESTS + 1))
fi
echo ""

# Test: Try to generate secret for deactivated client (should fail)
run_test \
  "Generate secret for deactivated client (expect 404)" \
  "POST" \
  "/m2m-clients/$M2M_CLIENT_ID/generate-secret" \
  "404" \
  "$ACCESS_TOKEN" \
  "$GENERATE_SECRET_PAYLOAD"

# =====================================================
# Phase 8: Authentication Tests
# =====================================================

echo -e "${BLUE}═══════════════════════════════════════════════════════${NC}"
echo -e "${BLUE}Phase 8: Authentication Tests${NC}"
echo -e "${BLUE}═══════════════════════════════════════════════════════${NC}"
echo ""

# Test: List clients without auth token (expect 401)
run_test \
  "List M2M clients without authentication (expect 401)" \
  "GET" \
  "/legal-entities/$LEGAL_ENTITY_ID/m2m-clients" \
  "401" \
  ""

# Test: Create client without auth token (expect 401)
run_test \
  "Create M2M client without authentication (expect 401)" \
  "POST" \
  "/legal-entities/$LEGAL_ENTITY_ID/m2m-clients" \
  "401" \
  "" \
  "$CREATE_PAYLOAD"

# =====================================================
# Test Summary
# =====================================================

echo -e "${BLUE}═══════════════════════════════════════════════════════${NC}"
echo -e "${BLUE}  Test Summary${NC}"
echo -e "${BLUE}═══════════════════════════════════════════════════════${NC}"
echo ""
echo -e "Total Tests:  $TOTAL_TESTS"
echo -e "${GREEN}Passed:       $PASSED_TESTS${NC}"
echo -e "${RED}Failed:       $FAILED_TESTS${NC}"
echo ""

PASS_RATE=$(awk "BEGIN {printf \"%.1f\", ($PASSED_TESTS/$TOTAL_TESTS)*100}")
echo -e "Pass Rate:    ${PASS_RATE}%"
echo ""

if [ $FAILED_TESTS -eq 0 ]; then
  echo -e "${GREEN}✅ ALL TESTS PASSED!${NC}"
  exit 0
else
  echo -e "${RED}❌ SOME TESTS FAILED${NC}"
  exit 1
fi
