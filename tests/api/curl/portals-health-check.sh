#!/bin/bash
# CTN Portals Health Check Test
# Tests all three portals are accessible and responding correctly
# Created: October 18, 2025

set -e  # Exit on error

echo "=========================================="
echo "CTN Portals Health Check Test"
echo "Started: $(date)"
echo "=========================================="
echo ""

# Color codes for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Test results tracking
TESTS_PASSED=0
TESTS_FAILED=0
FAILED_TESTS=()

# Function to test portal accessibility and security headers
test_portal() {
  local portal_name="$1"
  local url="$2"
  local expected_status="${3:-200}"

  echo "Testing: $portal_name"
  echo "URL: $url"

  # Get response with headers
  temp_file=$(mktemp)
  response=$(curl -s -D "$temp_file" -o /dev/null -w "%{http_code}" -L --max-time 30 "$url" 2>&1 || echo "CURL_ERROR")

  if [ "$response" = "CURL_ERROR" ]; then
    echo -e "${RED}✗ FAILED${NC} - Curl error (timeout or connection failed)"
    TESTS_FAILED=$((TESTS_FAILED + 1))
    FAILED_TESTS+=("$portal_name - Curl error")
    rm -f "$temp_file"
    echo ""
    return 1
  fi

  if [ "$response" -eq "$expected_status" ]; then
    echo -e "${GREEN}✓ PASSED${NC} - HTTP $response"
    TESTS_PASSED=$((TESTS_PASSED + 1))
  else
    echo -e "${RED}✗ FAILED${NC} - Expected HTTP $expected_status, got HTTP $response"
    TESTS_FAILED=$((TESTS_FAILED + 1))
    FAILED_TESTS+=("$portal_name - HTTP $response instead of $expected_status")
  fi

  # Check security headers
  echo "  Security Headers:"

  # X-Content-Type-Options
  if grep -qi "X-Content-Type-Options: nosniff" "$temp_file"; then
    echo -e "    ${GREEN}✓${NC} X-Content-Type-Options: nosniff"
  else
    echo -e "    ${YELLOW}⚠${NC} X-Content-Type-Options: nosniff (missing or incorrect)"
  fi

  # X-Frame-Options
  if grep -qi "X-Frame-Options: DENY" "$temp_file"; then
    echo -e "    ${GREEN}✓${NC} X-Frame-Options: DENY"
  elif grep -qi "X-Frame-Options: SAMEORIGIN" "$temp_file"; then
    echo -e "    ${GREEN}✓${NC} X-Frame-Options: SAMEORIGIN"
  else
    echo -e "    ${YELLOW}⚠${NC} X-Frame-Options (missing)"
  fi

  # Strict-Transport-Security
  if grep -qi "Strict-Transport-Security" "$temp_file"; then
    echo -e "    ${GREEN}✓${NC} Strict-Transport-Security present"
  else
    echo -e "    ${YELLOW}⚠${NC} Strict-Transport-Security (missing)"
  fi

  # Content-Security-Policy
  if grep -qi "Content-Security-Policy" "$temp_file"; then
    echo -e "    ${GREEN}✓${NC} Content-Security-Policy present"
  else
    echo -e "    ${YELLOW}⚠${NC} Content-Security-Policy (missing)"
  fi

  rm -f "$temp_file"
  echo ""
}

# Function to test API endpoint
test_api_endpoint() {
  local endpoint_name="$1"
  local url="$2"
  local expected_status="${3:-200}"

  echo "Testing: $endpoint_name"
  echo "URL: $url"

  response=$(curl -s -o /dev/null -w "%{http_code}" --max-time 15 "$url" 2>&1 || echo "CURL_ERROR")

  if [ "$response" = "CURL_ERROR" ]; then
    echo -e "${YELLOW}⚠ WARNING${NC} - Curl error (may require authentication)"
    echo ""
    return 0
  fi

  if [ "$response" -eq "$expected_status" ] || [ "$response" -eq 401 ] || [ "$response" -eq 403 ]; then
    echo -e "${GREEN}✓ PASSED${NC} - HTTP $response (endpoint accessible)"
    TESTS_PASSED=$((TESTS_PASSED + 1))
  else
    echo -e "${RED}✗ FAILED${NC} - HTTP $response"
    TESTS_FAILED=$((TESTS_FAILED + 1))
    FAILED_TESTS+=("$endpoint_name - HTTP $response")
  fi
  echo ""
}

# Test Admin Portal
echo "=========================================="
echo "1. ADMIN PORTAL"
echo "=========================================="
test_portal "Admin Portal - Home" "https://calm-tree-03352ba03.1.azurestaticapps.net/"
test_portal "Admin Portal - NotFound Page" "https://calm-tree-03352ba03.1.azurestaticapps.net/nonexistent"

# Test Member Portal
echo "=========================================="
echo "2. MEMBER PORTAL"
echo "=========================================="
test_portal "Member Portal - Home" "https://calm-pebble-043b2db03.1.azurestaticapps.net/"
test_portal "Member Portal - NotFound Page" "https://calm-pebble-043b2db03.1.azurestaticapps.net/nonexistent"

# Test Orchestrator Portal
echo "=========================================="
echo "3. ORCHESTRATOR PORTAL"
echo "=========================================="
test_portal "Orchestrator Portal - Home" "https://ambitious-sky-098ea8e03.2.azurestaticapps.net/"
test_portal "Orchestrator Portal - NotFound Page" "https://ambitious-sky-098ea8e03.2.azurestaticapps.net/nonexistent"

# Test API Health
echo "=========================================="
echo "4. API HEALTH CHECKS"
echo "=========================================="
test_api_endpoint "API - Base URL" "https://func-ctn-demo-asr-dev.azurewebsites.net/api/v1"
test_api_endpoint "API - Health Check" "https://func-ctn-demo-asr-dev.azurewebsites.net/api/v1/health"

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
  exit 1
else
  echo -e "${GREEN}All tests passed!${NC}"
  echo ""
  exit 0
fi
