#!/bin/bash
# ========================================
# CTN ASR - Comprehensive Admin Portal API Test Suite
# ========================================
# Tests all CRITICAL endpoints according to TEST_PLAN_ADMIN_PORTAL.md
# Created: November 1, 2025
# Author: TE (Test Engineer) Agent
#
# Usage:
#   ./admin-portal-comprehensive-test.sh
#
# This script:
# 1. Obtains Azure AD token automatically (test-e2@denoronha.consulting)
# 2. Tests CRITICAL API endpoints first
# 3. Tests HIGH priority endpoints
# 4. Tests MEDIUM priority endpoints
# 5. Generates detailed test report
#
# ========================================

set -eo pipefail  # Exit on error, exit on pipe failure

# ========================================
# CONFIGURATION
# ========================================

# API Configuration
API_BASE_URL="${API_BASE_URL:-https://func-ctn-demo-asr-dev.azurewebsites.net/api/v1}"
API_HEALTH_URL="https://func-ctn-demo-asr-dev.azurewebsites.net/api/health"
API_VERSION_URL="https://func-ctn-demo-asr-dev.azurewebsites.net/api/version"

# Azure AD Configuration
TENANT_ID="598664e7-725c-4daa-bd1f-89c4ada717ff"
CLIENT_ID="d3037c11-a541-4f21-8862-8079137a0cde"
SCOPE="api://d3037c11-a541-4f21-8862-8079137a0cde/.default"

# Test User Credentials (MFA excluded for automation)
# NOTE: Password stored in environment variable for security
TEST_USER_EMAIL="${TEST_USER_EMAIL:-test-e2@denoronha.consulting}"
#TEST_USER_PASSWORD="See CLAUDE.md E2E Test User section"
TEST_USER_PASSWORD="${TEST_USER_PASSWORD}"
TEST_USER_OBJECT_ID="7e093589-f654-4e53-9522-898995d1201b"

# Test tracking
TESTS_RUN=0
TESTS_PASSED=0
TESTS_FAILED=0
CRITICAL_FAILURES=()
HIGH_FAILURES=()
MEDIUM_FAILURES=()
START_TIME=$(date +%s)

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[0;33m'
BLUE='\033[0;34m'
CYAN='\033[0;36m'
NC='\033[0m' # No Color
BOLD='\033[1m'

# ========================================
# HELPER FUNCTIONS
# ========================================

print_header() {
  echo ""
  echo -e "${BOLD}${BLUE}========================================${NC}"
  echo -e "${BOLD}${BLUE}$1${NC}"
  echo -e "${BOLD}${BLUE}========================================${NC}"
  echo ""
}

print_section() {
  echo ""
  echo -e "${BOLD}${CYAN}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
  echo -e "${BOLD}${CYAN}$1${NC}"
  echo -e "${BOLD}${CYAN}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
  echo ""
}

print_test() {
  echo -e "${BOLD}TEST:${NC} $1"
}

print_success() {
  echo -e "${GREEN}✓${NC} $1"
}

print_failure() {
  echo -e "${RED}✗${NC} $1"
}

print_warning() {
  echo -e "${YELLOW}⚠${NC} $1"
}

print_info() {
  echo -e "${CYAN}ℹ${NC} $1"
}

# Track test result
record_test() {
  local test_name="$1"
  local priority="$2"  # CRITICAL, HIGH, MEDIUM
  local passed="$3"

  TESTS_RUN=$((TESTS_RUN + 1))

  if [ "$passed" = "true" ]; then
    TESTS_PASSED=$((TESTS_PASSED + 1))
    print_success "$test_name - PASSED"
  else
    TESTS_FAILED=$((TESTS_FAILED + 1))
    print_failure "$test_name - FAILED"

    # Track failure by priority
    case "$priority" in
      CRITICAL)
        CRITICAL_FAILURES+=("$test_name")
        ;;
      HIGH)
        HIGH_FAILURES+=("$test_name")
        ;;
      MEDIUM)
        MEDIUM_FAILURES+=("$test_name")
        ;;
    esac
  fi
}

# ========================================
# AUTHENTICATION
# ========================================

get_azure_ad_token() {
  print_section "STEP 1: Azure AD Authentication"
  print_info "Loading access token for test user: $TEST_USER_EMAIL"

  # Check if token file exists
  local token_file="$(dirname "$0")/.auth-token"

  if [ ! -f "$token_file" ]; then
    print_failure "Token file not found: $token_file"
    echo ""
    print_warning "Please run the following command to obtain a token:"
    print_warning "  node get-auth-token.js"
    echo ""
    print_info "This will use device code flow (browser-based authentication)"
    exit 1
  fi

  # Read token from file
  local token_data=$(cat "$token_file")
  AUTH_TOKEN=$(echo "$token_data" | jq -r '.access_token' 2>/dev/null)
  local expires_at=$(echo "$token_data" | jq -r '.expires_at' 2>/dev/null)
  local acquired_at=$(echo "$token_data" | jq -r '.acquired_at' 2>/dev/null)

  if [ -z "$AUTH_TOKEN" ] || [ "$AUTH_TOKEN" = "null" ]; then
    print_failure "Invalid token file format"
    print_warning "Please run: node get-auth-token.js"
    exit 1
  fi

  # Check if token is expired
  local current_time=$(date +%s)
  local expires_at_seconds=$((expires_at / 1000))

  if [ $current_time -gt $expires_at_seconds ]; then
    print_failure "Token has expired"
    print_info "Acquired at: $acquired_at"
    print_info "Expired at: $(date -r $expires_at_seconds)"
    echo ""
    print_warning "Please obtain a new token:"
    print_warning "  node get-auth-token.js"
    exit 1
  fi

  print_success "Token loaded successfully"
  print_info "Token acquired at: $acquired_at"
  print_info "Token expires in: $(( (expires_at_seconds - current_time) / 60 )) minutes"

  # Decode token claims (optional, for verification)
  local token_payload=$(echo "$AUTH_TOKEN" | cut -d'.' -f2)
  # Add padding if needed
  local padding=$((4 - ${#token_payload} % 4))
  if [ $padding -ne 4 ]; then
    token_payload="${token_payload}$(printf '=' %.0s $(seq 1 $padding))"
  fi

  print_info "Token claims:"
  echo "$token_payload" | base64 -d 2>/dev/null | jq '.' || echo "Could not decode token"

  echo ""
}

# ========================================
# CRITICAL PRIORITY TESTS
# ========================================

test_critical_endpoints() {
  print_header "PHASE 1: CRITICAL PRIORITY TESTS"
  print_info "These tests MUST pass before any release"

  # Test 1: Health Check
  print_section "Test 1: API Health Check"
  print_test "GET /api/health (unauthenticated)"

  local start_time=$(date +%s%3N)
  local health_response=$(curl -s -w "\n%{http_code}\n%{time_total}" "$API_HEALTH_URL")
  local http_code=$(echo "$health_response" | tail -2 | head -1)
  local response_time=$(echo "$health_response" | tail -1)
  local body=$(echo "$health_response" | head -n -2)

  print_info "HTTP Status: $http_code"
  print_info "Response Time: ${response_time}s"

  if [ "$http_code" = "200" ]; then
    echo "Response Body:"
    echo "$body" | jq '.' 2>/dev/null || echo "$body"

    # Check response time < 500ms
    local response_ms=$(echo "$response_time * 1000" | bc | cut -d'.' -f1)
    if [ "$response_ms" -lt 500 ]; then
      record_test "Health Check" "CRITICAL" "true"
    else
      print_warning "Response time ${response_ms}ms exceeds 500ms threshold"
      record_test "Health Check" "CRITICAL" "false"
    fi
  else
    echo "Response:"
    echo "$body"
    record_test "Health Check" "CRITICAL" "false"
  fi

  # Test 2: Version Check
  print_section "Test 2: API Version"
  print_test "GET /api/version (unauthenticated)"

  local version_response=$(curl -s -w "\n%{http_code}" "$API_VERSION_URL")
  local http_code=$(echo "$version_response" | tail -1)
  local body=$(echo "$version_response" | head -n -1)

  print_info "HTTP Status: $http_code"

  if [ "$http_code" = "200" ]; then
    echo "Version Info:"
    echo "$body" | jq '.' 2>/dev/null || echo "$body"
    record_test "Version Check" "CRITICAL" "true"
  else
    echo "Response:"
    echo "$body"
    record_test "Version Check" "CRITICAL" "false"
  fi

  # Test 3: Authenticated Member Endpoint
  print_section "Test 3: Authenticated Member"
  print_test "GET /api/v1/authenticated-member"

  local auth_member_response=$(curl -s -w "\n%{http_code}" \
    -H "Authorization: Bearer $AUTH_TOKEN" \
    "${API_BASE_URL}/authenticated-member")
  local http_code=$(echo "$auth_member_response" | tail -1)
  local body=$(echo "$auth_member_response" | head -n -1)

  print_info "HTTP Status: $http_code"

  if [ "$http_code" = "200" ]; then
    echo "Authenticated User:"
    echo "$body" | jq '.' 2>/dev/null || echo "$body"

    # Extract and verify role
    local role=$(echo "$body" | jq -r '.role' 2>/dev/null || echo "")
    if [ "$role" = "SystemAdmin" ]; then
      print_success "User role: SystemAdmin (correct)"
      record_test "Authenticated Member" "CRITICAL" "true"
    else
      print_warning "User role: $role (expected SystemAdmin)"
      record_test "Authenticated Member" "CRITICAL" "false"
    fi
  else
    echo "Response:"
    echo "$body"
    record_test "Authenticated Member" "CRITICAL" "false"
  fi

  # Test 4: Members List (All Members)
  print_section "Test 4: All Members (Paginated)"
  print_test "GET /api/v1/all-members"

  local members_response=$(curl -s -w "\n%{http_code}" \
    -H "Authorization: Bearer $AUTH_TOKEN" \
    "${API_BASE_URL}/all-members")
  local http_code=$(echo "$members_response" | tail -1)
  local body=$(echo "$members_response" | head -n -1)

  print_info "HTTP Status: $http_code"

  if [ "$http_code" = "200" ]; then
    # Check if response has data array (paginated response)
    local data_array=$(echo "$body" | jq '.data' 2>/dev/null || echo "null")

    if [ "$data_array" != "null" ]; then
      local total=$(echo "$body" | jq '.total' 2>/dev/null || echo "0")
      local count=$(echo "$body" | jq '.data | length' 2>/dev/null || echo "0")

      print_success "Paginated response received"
      print_info "Total members: $total"
      print_info "Members in this page: $count"

      # Show first member as example
      echo ""
      echo "Example member:"
      echo "$body" | jq '.data[0]' 2>/dev/null || echo "No members found"

      record_test "All Members List" "CRITICAL" "true"
    else
      print_warning "Response is not paginated (expected {data: [], total: N})"
      echo "$body" | jq '.' 2>/dev/null || echo "$body"
      record_test "All Members List" "CRITICAL" "false"
    fi
  else
    echo "Response:"
    echo "$body"
    record_test "All Members List" "CRITICAL" "false"
  fi

  # Test 5: Get Single Member
  print_section "Test 5: Get Single Member"

  # First, get a member ID from all-members
  local member_id=$(echo "$body" | jq -r '.data[0].org_id' 2>/dev/null || echo "")

  if [ -z "$member_id" ] || [ "$member_id" = "null" ]; then
    print_warning "No members found to test with"
    record_test "Get Single Member" "CRITICAL" "false"
  else
    print_test "GET /api/v1/members/$member_id"

    local member_response=$(curl -s -w "\n%{http_code}" \
      -H "Authorization: Bearer $AUTH_TOKEN" \
      "${API_BASE_URL}/members/${member_id}")
    local http_code=$(echo "$member_response" | tail -1)
    local body=$(echo "$member_response" | head -n -1)

    print_info "HTTP Status: $http_code"

    if [ "$http_code" = "200" ]; then
      echo "Member Details:"
      echo "$body" | jq '.' 2>/dev/null || echo "$body"
      record_test "Get Single Member" "CRITICAL" "true"

      # Save member ID for later tests
      export TEST_MEMBER_ID="$member_id"
      export TEST_LEGAL_ENTITY_ID=$(echo "$body" | jq -r '.legal_entity_id' 2>/dev/null || echo "")
    else
      echo "Response:"
      echo "$body"
      record_test "Get Single Member" "CRITICAL" "false"
    fi
  fi
}

# ========================================
# HIGH PRIORITY TESTS
# ========================================

test_high_priority_endpoints() {
  print_header "PHASE 2: HIGH PRIORITY TESTS"

  if [ -z "$TEST_LEGAL_ENTITY_ID" ]; then
    print_warning "No legal entity ID available from previous tests"
    print_warning "Skipping high priority tests that require legal entity"
    return
  fi

  # Test 6: Legal Entity Details
  print_section "Test 6: Legal Entity Details"
  print_test "GET /api/v1/legal-entities/$TEST_LEGAL_ENTITY_ID"

  local entity_response=$(curl -s -w "\n%{http_code}" \
    -H "Authorization: Bearer $AUTH_TOKEN" \
    "${API_BASE_URL}/legal-entities/${TEST_LEGAL_ENTITY_ID}")
  local http_code=$(echo "$entity_response" | tail -1)
  local body=$(echo "$entity_response" | head -n -1)

  print_info "HTTP Status: $http_code"

  if [ "$http_code" = "200" ]; then
    echo "Legal Entity:"
    echo "$body" | jq '.' 2>/dev/null || echo "$body"
    record_test "Legal Entity Details" "HIGH" "true"
  else
    echo "Response:"
    echo "$body"
    record_test "Legal Entity Details" "HIGH" "false"
  fi

  # Test 7: Identifiers (Paginated)
  print_section "Test 7: Entity Identifiers"
  print_test "GET /api/v1/entities/$TEST_LEGAL_ENTITY_ID/identifiers"

  local identifiers_response=$(curl -s -w "\n%{http_code}" \
    -H "Authorization: Bearer $AUTH_TOKEN" \
    "${API_BASE_URL}/entities/${TEST_LEGAL_ENTITY_ID}/identifiers")
  local http_code=$(echo "$identifiers_response" | tail -1)
  local body=$(echo "$identifiers_response" | head -n -1)

  print_info "HTTP Status: $http_code"

  if [ "$http_code" = "200" ]; then
    local total=$(echo "$body" | jq '.total' 2>/dev/null || echo "0")
    local count=$(echo "$body" | jq '.data | length' 2>/dev/null || echo "0")

    print_info "Total identifiers: $total"
    print_info "Identifiers in page: $count"

    echo ""
    echo "Identifiers:"
    echo "$body" | jq '.data' 2>/dev/null || echo "$body"

    record_test "Entity Identifiers" "HIGH" "true"
  else
    echo "Response:"
    echo "$body"

    # 404 is acceptable if no identifiers exist
    if [ "$http_code" = "404" ]; then
      print_info "No identifiers found (404 is acceptable)"
      record_test "Entity Identifiers" "HIGH" "true"
    else
      record_test "Entity Identifiers" "HIGH" "false"
    fi
  fi

  # Test 8: Contacts (Paginated)
  print_section "Test 8: Entity Contacts"
  print_test "GET /api/v1/legal-entities/$TEST_LEGAL_ENTITY_ID/contacts"

  local contacts_response=$(curl -s -w "\n%{http_code}" \
    -H "Authorization: Bearer $AUTH_TOKEN" \
    "${API_BASE_URL}/legal-entities/${TEST_LEGAL_ENTITY_ID}/contacts")
  local http_code=$(echo "$contacts_response" | tail -1)
  local body=$(echo "$contacts_response" | head -n -1)

  print_info "HTTP Status: $http_code"

  if [ "$http_code" = "200" ]; then
    local total=$(echo "$body" | jq '.total' 2>/dev/null || echo "0")
    local count=$(echo "$body" | jq '.data | length' 2>/dev/null || echo "0")

    print_info "Total contacts: $total"
    print_info "Contacts in page: $count"

    echo ""
    echo "Contacts:"
    echo "$body" | jq '.data' 2>/dev/null || echo "$body"

    record_test "Entity Contacts" "HIGH" "true"
  else
    echo "Response:"
    echo "$body"

    # 404 is acceptable if no contacts exist
    if [ "$http_code" = "404" ]; then
      print_info "No contacts found (404 is acceptable)"
      record_test "Entity Contacts" "HIGH" "true"
    else
      record_test "Entity Contacts" "HIGH" "false"
    fi
  fi

  # Test 9: Endpoints (Data Connections)
  print_section "Test 9: Entity Endpoints"
  print_test "GET /api/v1/legal-entities/$TEST_LEGAL_ENTITY_ID/endpoints"

  local endpoints_response=$(curl -s -w "\n%{http_code}" \
    -H "Authorization: Bearer $AUTH_TOKEN" \
    "${API_BASE_URL}/legal-entities/${TEST_LEGAL_ENTITY_ID}/endpoints")
  local http_code=$(echo "$endpoints_response" | tail -1)
  local body=$(echo "$endpoints_response" | head -n -1)

  print_info "HTTP Status: $http_code"

  if [ "$http_code" = "200" ]; then
    local count=$(echo "$body" | jq 'length' 2>/dev/null || echo "0")

    print_info "Total endpoints: $count"

    echo ""
    echo "Endpoints:"
    echo "$body" | jq '.' 2>/dev/null || echo "$body"

    record_test "Entity Endpoints" "HIGH" "true"
  else
    echo "Response:"
    echo "$body"

    # 404 is acceptable if no endpoints exist
    if [ "$http_code" = "404" ]; then
      print_info "No endpoints found (404 is acceptable)"
      record_test "Entity Endpoints" "HIGH" "true"
    else
      record_test "Entity Endpoints" "HIGH" "false"
    fi
  fi
}

# ========================================
# MEDIUM PRIORITY TESTS
# ========================================

test_medium_priority_endpoints() {
  print_header "PHASE 3: MEDIUM PRIORITY TESTS"

  # Test 10: Diagnostic Endpoint
  print_section "Test 10: Diagnostic Information"
  print_test "GET /api/diagnostic"

  local diagnostic_response=$(curl -s -w "\n%{http_code}" \
    -H "Authorization: Bearer $AUTH_TOKEN" \
    "https://func-ctn-demo-asr-dev.azurewebsites.net/api/diagnostic")
  local http_code=$(echo "$diagnostic_response" | tail -1)
  local body=$(echo "$diagnostic_response" | head -n -1)

  print_info "HTTP Status: $http_code"

  if [ "$http_code" = "200" ]; then
    echo "Diagnostic Info:"
    echo "$body" | jq '.' 2>/dev/null || echo "$body"
    record_test "Diagnostic Information" "MEDIUM" "true"
  else
    echo "Response:"
    echo "$body"
    record_test "Diagnostic Information" "MEDIUM" "false"
  fi

  # Test 11: Audit Logs
  print_section "Test 11: Audit Logs"
  print_test "GET /api/v1/audit-logs"

  local audit_response=$(curl -s -w "\n%{http_code}" \
    -H "Authorization: Bearer $AUTH_TOKEN" \
    "${API_BASE_URL}/audit-logs")
  local http_code=$(echo "$audit_response" | tail -1)
  local body=$(echo "$audit_response" | head -n -1)

  print_info "HTTP Status: $http_code"

  if [ "$http_code" = "200" ]; then
    local total=$(echo "$body" | jq '.total' 2>/dev/null || echo "0")
    local count=$(echo "$body" | jq '.data | length' 2>/dev/null || echo "0")

    print_info "Total audit logs: $total"
    print_info "Logs in page: $count"

    echo ""
    echo "Recent Audit Logs:"
    echo "$body" | jq '.data[0:3]' 2>/dev/null || echo "$body"

    record_test "Audit Logs" "MEDIUM" "true"
  else
    echo "Response:"
    echo "$body"
    record_test "Audit Logs" "MEDIUM" "false"
  fi
}

# ========================================
# ERROR HANDLING TESTS
# ========================================

test_error_handling() {
  print_header "PHASE 4: ERROR HANDLING TESTS"

  # Test: Unauthenticated Request
  print_section "Test: Unauthenticated Request (401)"
  print_test "GET /api/v1/all-members (no auth token)"

  local unauth_response=$(curl -s -w "\n%{http_code}" \
    "${API_BASE_URL}/all-members")
  local http_code=$(echo "$unauth_response" | tail -1)
  local body=$(echo "$unauth_response" | head -n -1)

  print_info "HTTP Status: $http_code"

  if [ "$http_code" = "401" ]; then
    print_success "Correctly returned 401 Unauthorized"
    echo "Response:"
    echo "$body" | jq '.' 2>/dev/null || echo "$body"
    record_test "Unauthenticated Request" "HIGH" "true"
  else
    print_failure "Expected 401, got $http_code"
    echo "Response:"
    echo "$body"
    record_test "Unauthenticated Request" "HIGH" "false"
  fi

  # Test: Non-existent Resource (404)
  print_section "Test: Non-existent Resource (404)"
  print_test "GET /api/v1/members/00000000-0000-0000-0000-000000000000"

  local notfound_response=$(curl -s -w "\n%{http_code}" \
    -H "Authorization: Bearer $AUTH_TOKEN" \
    "${API_BASE_URL}/members/00000000-0000-0000-0000-000000000000")
  local http_code=$(echo "$notfound_response" | tail -1)
  local body=$(echo "$notfound_response" | head -n -1)

  print_info "HTTP Status: $http_code"

  if [ "$http_code" = "404" ]; then
    print_success "Correctly returned 404 Not Found"
    echo "Response:"
    echo "$body" | jq '.' 2>/dev/null || echo "$body"
    record_test "Non-existent Resource" "HIGH" "true"
  else
    print_failure "Expected 404, got $http_code"
    echo "Response:"
    echo "$body"
    record_test "Non-existent Resource" "HIGH" "false"
  fi
}

# ========================================
# MAIN EXECUTION
# ========================================

main() {
  print_header "CTN ASR - Comprehensive Admin Portal API Test Suite"
  print_info "Started at: $(date)"
  print_info "API Base URL: $API_BASE_URL"
  print_info "Test User: $TEST_USER_EMAIL"
  echo ""

  # Step 1: Authentication
  get_azure_ad_token

  # Step 2: Critical Tests (MUST PASS)
  test_critical_endpoints

  # Step 3: High Priority Tests
  test_high_priority_endpoints

  # Step 4: Medium Priority Tests
  test_medium_priority_endpoints

  # Step 5: Error Handling
  test_error_handling

  # Generate Final Report
  generate_final_report
}

# ========================================
# FINAL REPORT
# ========================================

generate_final_report() {
  local end_time=$(date +%s)
  local duration=$((end_time - START_TIME))

  print_header "TEST SUITE SUMMARY"

  echo "Completed at: $(date)"
  echo "Duration: ${duration}s"
  echo ""

  echo -e "${BOLD}Results:${NC}"
  echo "  Tests Run:    $TESTS_RUN"
  echo -e "  ${GREEN}Tests Passed: $TESTS_PASSED${NC}"
  echo -e "  ${RED}Tests Failed: $TESTS_FAILED${NC}"
  echo ""

  # Calculate pass rate
  local pass_rate=0
  if [ $TESTS_RUN -gt 0 ]; then
    pass_rate=$(echo "scale=1; ($TESTS_PASSED * 100) / $TESTS_RUN" | bc)
  fi
  echo "  Pass Rate: ${pass_rate}%"
  echo ""

  # Show failures by priority
  if [ ${#CRITICAL_FAILURES[@]} -gt 0 ]; then
    echo -e "${RED}${BOLD}CRITICAL FAILURES (${#CRITICAL_FAILURES[@]}):${NC}"
    for test in "${CRITICAL_FAILURES[@]}"; do
      echo -e "  ${RED}✗${NC} $test"
    done
    echo ""
  fi

  if [ ${#HIGH_FAILURES[@]} -gt 0 ]; then
    echo -e "${YELLOW}${BOLD}HIGH PRIORITY FAILURES (${#HIGH_FAILURES[@]}):${NC}"
    for test in "${HIGH_FAILURES[@]}"; do
      echo -e "  ${YELLOW}✗${NC} $test"
    done
    echo ""
  fi

  if [ ${#MEDIUM_FAILURES[@]} -gt 0 ]; then
    echo -e "${YELLOW}MEDIUM PRIORITY FAILURES (${#MEDIUM_FAILURES[@]}):${NC}"
    for test in "${MEDIUM_FAILURES[@]}"; do
      echo -e "  ${YELLOW}✗${NC} $test"
    done
    echo ""
  fi

  # Overall verdict
  echo -e "${BOLD}Overall Verdict:${NC}"

  if [ ${#CRITICAL_FAILURES[@]} -gt 0 ]; then
    echo -e "${RED}${BOLD}❌ CRITICAL FAILURES DETECTED${NC}"
    echo ""
    echo "The API has CRITICAL issues that MUST be fixed before release."
    echo "DO NOT proceed with E2E testing until these are resolved."
    exit 1
  elif [ ${#HIGH_FAILURES[@]} -gt 0 ]; then
    echo -e "${YELLOW}${BOLD}⚠️  HIGH PRIORITY FAILURES DETECTED${NC}"
    echo ""
    echo "The API has HIGH priority issues that should be fixed."
    echo "E2E testing can proceed, but expect failures in affected areas."
    exit 1
  elif [ ${#MEDIUM_FAILURES[@]} -gt 0 ]; then
    echo -e "${YELLOW}${BOLD}⚠️  MEDIUM PRIORITY FAILURES DETECTED${NC}"
    echo ""
    echo "The API has MEDIUM priority issues. E2E testing can proceed."
    exit 0
  else
    echo -e "${GREEN}${BOLD}✅ ALL TESTS PASSED${NC}"
    echo ""
    echo "The API is healthy and ready for E2E testing!"
    exit 0
  fi
}

# Execute main function
main
