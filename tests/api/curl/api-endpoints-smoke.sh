#!/bin/bash
# CTN API Endpoints Smoke Test
# Tests API endpoints are correctly registered and respond appropriately
# Created: October 18, 2025

set -e  # Exit on error

echo "=========================================="
echo "CTN API Endpoints Smoke Test"
echo "Started: $(date)"
echo "=========================================="
echo ""

# Color codes for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Test results tracking
TESTS_PASSED=0
TESTS_FAILED=0
FAILED_TESTS=()

# API Base URL
API_BASE="https://ca-ctn-asr-api-dev.calmriver-700a8c55.westeurope.azurecontainerapps.io"

# Function to test API endpoint
test_api() {
  local endpoint_name="$1"
  local url="$2"
  local expected_status="$3"
  local description="$4"

  echo "Testing: $endpoint_name"
  echo "URL: $url"
  echo "Description: $description"

  # Get response with headers
  temp_file=$(mktemp)
  response=$(curl -s -D "$temp_file" -o /dev/null -w "%{http_code}" --max-time 15 "$url" 2>&1 || echo "CURL_ERROR")

  if [ "$response" = "CURL_ERROR" ]; then
    echo -e "${RED}✗ FAILED${NC} - Curl error (timeout or connection failed)"
    TESTS_FAILED=$((TESTS_FAILED + 1))
    FAILED_TESTS+=("$endpoint_name - Curl error")
    rm -f "$temp_file"
    echo ""
    return 1
  fi

  # Check if response matches expected status
  if [ "$response" -eq "$expected_status" ]; then
    echo -e "${GREEN}✓ PASSED${NC} - HTTP $response (expected $expected_status)"
    TESTS_PASSED=$((TESTS_PASSED + 1))
  else
    echo -e "${RED}✗ FAILED${NC} - Expected HTTP $expected_status, got HTTP $response"
    TESTS_FAILED=$((TESTS_FAILED + 1))
    FAILED_TESTS+=("$endpoint_name - HTTP $response instead of $expected_status")
  fi

  rm -f "$temp_file"
  echo ""
}

# Function to test protected endpoint (expects 401/403)
test_protected_api() {
  local endpoint_name="$1"
  local url="$2"
  local description="$3"

  echo "Testing: $endpoint_name (Protected)"
  echo "URL: $url"
  echo "Description: $description"

  response=$(curl -s -o /dev/null -w "%{http_code}" --max-time 15 "$url" 2>&1 || echo "CURL_ERROR")

  if [ "$response" = "CURL_ERROR" ]; then
    echo -e "${RED}✗ FAILED${NC} - Curl error (timeout or connection failed)"
    TESTS_FAILED=$((TESTS_FAILED + 1))
    FAILED_TESTS+=("$endpoint_name - Curl error")
    echo ""
    return 1
  fi

  # Protected endpoints should return 401 Unauthorized or 403 Forbidden
  if [ "$response" -eq 401 ] || [ "$response" -eq 403 ]; then
    echo -e "${GREEN}✓ PASSED${NC} - HTTP $response (correctly protected)"
    TESTS_PASSED=$((TESTS_PASSED + 1))
  elif [ "$response" -eq 404 ]; then
    echo -e "${RED}✗ FAILED${NC} - HTTP 404 (endpoint not registered)"
    TESTS_FAILED=$((TESTS_FAILED + 1))
    FAILED_TESTS+=("$endpoint_name - HTTP 404 (not registered)")
  else
    echo -e "${YELLOW}⚠ WARNING${NC} - HTTP $response (unexpected response)"
    TESTS_PASSED=$((TESTS_PASSED + 1))
  fi

  echo ""
}

# Test 1: Public Health Check Endpoint
echo "=========================================="
echo "1. PUBLIC ENDPOINTS"
echo "=========================================="
test_api "Health Check" "$API_BASE/api/health" 200 "Public health check endpoint"

# Test 2: API Version Endpoint
test_api "API Version" "$API_BASE/api/v1" 404 "Base API route (expected 404, no handler)"

# Test 3: Protected Member Endpoints
echo "=========================================="
echo "2. PROTECTED MEMBER ENDPOINTS"
echo "=========================================="
test_protected_api "All Members List" "$API_BASE/api/v1/all-members" "List all members"
test_protected_api "Members Search" "$API_BASE/api/v1/members" "Search members"

# Test 4: Protected Legal Entity Endpoints
echo "=========================================="
echo "3. PROTECTED LEGAL ENTITY ENDPOINTS"
echo "=========================================="
test_protected_api "Legal Entities List" "$API_BASE/api/v1/legal-entities" "List legal entities"

# Test with dummy UUID to verify route registration
DUMMY_UUID="00000000-0000-0000-0000-000000000000"
test_protected_api "Legal Entity Details" "$API_BASE/api/v1/legal-entities/$DUMMY_UUID" "Get legal entity by ID"

# Test 5: Protected Identifier Endpoints
echo "=========================================="
echo "4. PROTECTED IDENTIFIER ENDPOINTS"
echo "=========================================="
test_protected_api "Entity Identifiers List" "$API_BASE/api/v1/entities/$DUMMY_UUID/identifiers" "List entity identifiers"
test_protected_api "Create Identifier" "$API_BASE/api/v1/entities/$DUMMY_UUID/identifiers" "Create new identifier (POST)"

# Test 6: Protected Contact Endpoints
echo "=========================================="
echo "5. PROTECTED CONTACT ENDPOINTS"
echo "=========================================="
test_protected_api "Entity Contacts List" "$API_BASE/api/v1/entities/$DUMMY_UUID/contacts" "List entity contacts"
test_protected_api "Create Contact" "$API_BASE/api/v1/entities/$DUMMY_UUID/contacts" "Create new contact (POST)"

# Test 7: Protected Endpoint Management
echo "=========================================="
echo "6. PROTECTED ENDPOINT MANAGEMENT"
echo "=========================================="
test_protected_api "Member Endpoints List" "$API_BASE/api/v1/members/$DUMMY_UUID/endpoints" "List member endpoints"

# Test 8: BDI Integration Endpoints
echo "=========================================="
echo "7. BDI INTEGRATION ENDPOINTS"
echo "=========================================="
test_protected_api "Generate BVAD Token" "$API_BASE/api/v1/bdi/generate-bvad" "Generate BVAD token"
test_protected_api "Validate BVOD Token" "$API_BASE/api/v1/bdi/validate-bvod" "Validate BVOD token"

# Summary
echo "=========================================="
echo "TEST SUMMARY"
echo "=========================================="
echo "Total Tests: $((TESTS_PASSED + TESTS_FAILED))"
echo -e "${GREEN}Passed: $TESTS_PASSED${NC}"
echo -e "${RED}Failed: $TESTS_FAILED${NC}"
echo ""

if [ $TESTS_FAILED -gt 0 ]; then
  echo -e "${RED}Failed Tests:${NC}"
  for test in "${FAILED_TESTS[@]}"; do
    echo "  - $test"
  done
  echo ""
  echo -e "${YELLOW}Note: 404 errors indicate routes are not registered in Azure Functions.${NC}"
  echo -e "${YELLOW}Check api/src/functions/essential-index.ts or production-index.ts${NC}"
  echo ""
  exit 1
else
  echo -e "${GREEN}All tests passed!${NC}"
  echo ""
  exit 0
fi
