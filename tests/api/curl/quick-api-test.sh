#!/bin/bash
# ========================================
# Quick API Test - Manual Token Entry
# ========================================
# Simple API test that accepts token via environment variable or prompt
#
# Usage:
#   export AUTH_TOKEN=YOUR_TOKEN_HERE
#   ./quick-api-test.sh
#
# OR let script prompt for token:
#   ./quick-api-test.sh
#
# To get a token:
#   node get-token-and-test-members.js
#   (then copy from /tmp/asr_admin_token.txt)
# ========================================

set -eo pipefail

# API Configuration
API_BASE_URL="https://ca-ctn-asr-api-dev.calmriver-700a8c55.westeurope.azurecontainerapps.io/api/v1"
API_HEALTH_URL="https://ca-ctn-asr-api-dev.calmriver-700a8c55.westeurope.azurecontainerapps.io/api/health"

# Colors
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[0;33m'
BLUE='\033[0;34m'
CYAN='\033[0;36m'
NC='\033[0m'
BOLD='\033[1m'

print_success() { echo -e "${GREEN}✓${NC} $1"; }
print_failure() { echo -e "${RED}✗${NC} $1"; }
print_info() { echo -e "${CYAN}ℹ${NC} $1"; }
print_section() {
  echo ""
  echo -e "${BOLD}${CYAN}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
  echo -e "${BOLD}${CYAN}$1${NC}"
  echo -e "${BOLD}${CYAN}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
  echo ""
}

# ========================================
# Get Token
# ========================================

get_token() {
  print_section "Authentication"

  # Check environment variable first
  if [ -n "$AUTH_TOKEN" ]; then
    print_success "Using token from AUTH_TOKEN environment variable"
    return 0
  fi

  # Check saved token file
  local token_file="/tmp/asr_admin_token.txt"
  if [ -f "$token_file" ]; then
    AUTH_TOKEN=$(cat "$token_file")
    print_success "Using saved token from $token_file"
    print_info "Token age: $(stat -f "%Sm" -t "%Y-%m-%d %H:%M:%S" "$token_file")"
    return 0
  fi

  # Prompt user for token
  echo ""
  print_info "No token found. Please obtain a token first:"
  echo ""
  echo "  Option 1 (Automated):"
  echo "    node get-token-and-test-members.js"
  echo "    # Completes login, saves token to /tmp/asr_admin_token.txt"
  echo ""
  echo "  Option 2 (Manual):"
  echo "    1. Open: https://calm-tree-03352ba03.1.azurestaticapps.net"
  echo "    2. Login with test-e2@denoronha.consulting (password in CLAUDE.md)"
  echo "    3. Open browser console (F12)"
  echo "    4. Run: Object.keys(localStorage).find(k => k.includes('accesstoken'))"
  echo "    5. Run: JSON.parse(localStorage.getItem('<key>')).secret"
  echo "    6. Copy token and paste below"
  echo ""
  read -p "Enter token (or press Ctrl+C to exit): " AUTH_TOKEN

  if [ -z "$AUTH_TOKEN" ]; then
    print_failure "No token provided"
    exit 1
  fi

  # Save token for future use
  echo "$AUTH_TOKEN" > "$token_file"
  print_success "Token saved to $token_file"
}

# ========================================
# Test API
# ========================================

test_api() {
  print_section "Running Quick API Tests"

  local tests_passed=0
  local tests_failed=0

  # Test 1: Health Check
  echo -e "${BOLD}Test 1: Health Check${NC}"
  local health_response=$(curl -s -w "\n%{http_code}" "$API_HEALTH_URL")
  local http_code=$(echo "$health_response" | tail -n 1)
  local body=$(echo "$health_response" | head -n -1 || echo "$health_response")

  if [ "$http_code" = "200" ]; then
    print_success "Health check passed"
    echo "$body" | jq '.' 2>/dev/null || echo "$body"
    tests_passed=$((tests_passed + 1))
  else
    print_failure "Health check failed (HTTP $http_code)"
    echo "$body"
    tests_failed=$((tests_failed + 1))
  fi

  echo ""

  # Test 2: Authenticated Member
  echo -e "${BOLD}Test 2: Authenticated Member${NC}"
  local auth_response=$(curl -s -w "\n%{http_code}" \
    -H "Authorization: Bearer $AUTH_TOKEN" \
    "${API_BASE_URL}/authenticated-member")
  local http_code=$(echo "$auth_response" | tail -n 1)
  local body=$(echo "$auth_response" | head -n -1 || echo "$auth_response")

  if [ "$http_code" = "200" ]; then
    print_success "Authentication passed"
    echo "$body" | jq '.' 2>/dev/null || echo "$body"
    tests_passed=$((tests_passed + 1))
  else
    print_failure "Authentication failed (HTTP $http_code)"
    echo "$body"
    tests_failed=$((tests_failed + 1))
  fi

  echo ""

  # Test 3: All Members
  echo -e "${BOLD}Test 3: All Members${NC}"
  local members_response=$(curl -s -w "\n%{http_code}" \
    -H "Authorization: Bearer $AUTH_TOKEN" \
    "${API_BASE_URL}/all-members?page=1&page_size=10")
  local http_code=$(echo "$members_response" | tail -n 1)
  local body=$(echo "$members_response" | head -n -1 || echo "$members_response")

  if [ "$http_code" = "200" ]; then
    local total=$(echo "$body" | jq '.total' 2>/dev/null || echo "0")
    local count=$(echo "$body" | jq '.data | length' 2>/dev/null || echo "0")

    print_success "Members list retrieved"
    print_info "Total members: $total"
    print_info "Members in page: $count"

    if [ "$count" -gt 0 ]; then
      echo ""
      echo "First member:"
      echo "$body" | jq '.data[0]' 2>/dev/null
    fi

    tests_passed=$((tests_passed + 1))
  else
    print_failure "Members list failed (HTTP $http_code)"
    echo "$body"
    tests_failed=$((tests_failed + 1))
  fi

  echo ""

  # Summary
  print_section "Summary"
  echo -e "${BOLD}Tests Run:${NC} $((tests_passed + tests_failed))"
  echo -e "${GREEN}${BOLD}Tests Passed:${NC} $tests_passed"
  echo -e "${RED}${BOLD}Tests Failed:${NC} $tests_failed"
  echo ""

  if [ $tests_failed -eq 0 ]; then
    print_success "All tests passed! API is healthy."
    exit 0
  else
    print_failure "Some tests failed. Check errors above."
    exit 1
  fi
}

# ========================================
# Main
# ========================================

echo -e "${BOLD}${BLUE}========================================${NC}"
echo -e "${BOLD}${BLUE}CTN ASR - Quick API Test${NC}"
echo -e "${BOLD}${BLUE}========================================${NC}"
echo ""

get_token
test_api
