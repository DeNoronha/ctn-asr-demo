#!/bin/bash

#===============================================================================
# M2M Client Management Endpoints - Smoke Test
#
# Purpose: Verify M2M management endpoints are deployed and respond correctly
# Date: October 26, 2025
#
# Tests endpoint availability WITHOUT authentication (expects 401)
# This confirms endpoints are registered and middleware is working
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
API_BASE_URL="https://func-ctn-demo-asr-dev.azurewebsites.net/api/v1"

# Test counters
TOTAL_TESTS=0
PASSED_TESTS=0
FAILED_TESTS=0
FAILED_TEST_NAMES=()

echo -e "${BLUE}═══════════════════════════════════════════════════════${NC}"
echo -e "${BLUE}  M2M Client Management - Smoke Test${NC}"
echo -e "${BLUE}  (Endpoint Availability Check)${NC}"
echo -e "${BLUE}═══════════════════════════════════════════════════════${NC}"
echo ""
echo -e "API Base URL: $API_BASE_URL"
echo -e "Expected: All endpoints return ${YELLOW}401 Unauthorized${NC} (protected)"
echo ""

# =====================================================
# Helper Function
# =====================================================

test_endpoint() {
  local test_name="$1"
  local method="$2"
  local endpoint="$3"
  local expected_status="$4"

  TOTAL_TESTS=$((TOTAL_TESTS + 1))

  echo -e "${CYAN}Test $TOTAL_TESTS: $test_name${NC}"
  echo -e "  Method: $method"
  echo -e "  Endpoint: $endpoint"

  # Call endpoint without authentication
  HTTP_CODE=$(curl -s -o /dev/null -w "%{http_code}" --max-time 10 \
    -X $method "$API_BASE_URL$endpoint" \
    -H "Content-Type: application/json" 2>/dev/null)

  if [ "$HTTP_CODE" = "$expected_status" ]; then
    echo -e "${GREEN}  ✅ PASS - Got HTTP $HTTP_CODE${NC}"
    PASSED_TESTS=$((PASSED_TESTS + 1))
  elif [ "$HTTP_CODE" = "404" ]; then
    echo -e "${RED}  ❌ FAIL - Endpoint NOT REGISTERED (404)${NC}"
    echo -e "${YELLOW}  → Check essential-index.ts imports ManageM2MClients${NC}"
    FAILED_TESTS=$((FAILED_TESTS + 1))
    FAILED_TEST_NAMES+=("$test_name (404 - not registered)")
  else
    echo -e "${RED}  ❌ FAIL - Expected $expected_status, got $HTTP_CODE${NC}"
    FAILED_TESTS=$((FAILED_TESTS + 1))
    FAILED_TEST_NAMES+=("$test_name ($HTTP_CODE instead of $expected_status)")
  fi

  echo ""
}

# =====================================================
# Run Tests
# =====================================================

echo -e "${BLUE}═══════════════════════════════════════════════════════${NC}"
echo -e "${BLUE}Testing M2M Client Endpoints${NC}"
echo -e "${BLUE}═══════════════════════════════════════════════════════${NC}"
echo ""

# Use a test UUID for legal entity (endpoint should still return 401 without auth)
TEST_LEGAL_ENTITY_ID="00000000-0000-0000-0000-000000000000"
TEST_CLIENT_ID="00000000-0000-0000-0000-000000000000"

# Test 1: List M2M Clients
test_endpoint \
  "List M2M clients for legal entity" \
  "GET" \
  "/legal-entities/$TEST_LEGAL_ENTITY_ID/m2m-clients" \
  "401"

# Test 2: Create M2M Client
test_endpoint \
  "Create M2M client" \
  "POST" \
  "/legal-entities/$TEST_LEGAL_ENTITY_ID/m2m-clients" \
  "401"

# Test 3: Generate Secret
test_endpoint \
  "Generate secret for M2M client" \
  "POST" \
  "/m2m-clients/$TEST_CLIENT_ID/generate-secret" \
  "401"

# Test 4: Update Scopes
test_endpoint \
  "Update M2M client scopes" \
  "PATCH" \
  "/m2m-clients/$TEST_CLIENT_ID/scopes" \
  "401"

# Test 5: Deactivate Client
test_endpoint \
  "Deactivate M2M client" \
  "DELETE" \
  "/m2m-clients/$TEST_CLIENT_ID" \
  "401"

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

if [ $FAILED_TESTS -gt 0 ]; then
  echo -e "${RED}Failed Tests:${NC}"
  for test in "${FAILED_TEST_NAMES[@]}"; do
    echo -e "  - $test"
  done
  echo ""
fi

PASS_RATE=$(awk "BEGIN {printf \"%.1f\", ($PASSED_TESTS/$TOTAL_TESTS)*100}")
echo -e "Pass Rate:    ${PASS_RATE}%"
echo ""

if [ $FAILED_TESTS -eq 0 ]; then
  echo -e "${GREEN}✅ ALL ENDPOINTS REGISTERED AND PROTECTED!${NC}"
  echo ""
  echo -e "${CYAN}Next Steps:${NC}"
  echo -e "  1. Run authenticated tests with AUTH_TOKEN environment variable"
  echo -e "  2. Test CRUD operations with valid authentication"
  echo -e "  3. Test IDOR protection with multi-tenant scenarios"
  echo ""
  exit 0
else
  echo -e "${RED}❌ SOME ENDPOINTS NOT PROPERLY REGISTERED${NC}"
  echo ""
  echo -e "${YELLOW}Troubleshooting:${NC}"
  echo -e "  1. Check if ManageM2MClients is imported in essential-index.ts"
  echo -e "  2. Verify function app was deployed: func azure functionapp publish"
  echo -e "  3. Check Azure Function App logs for errors"
  echo ""
  exit 1
fi
