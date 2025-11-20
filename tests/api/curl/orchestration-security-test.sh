#!/bin/bash
# CTN Orchestration API - Security Testing
# Tests security fixes for orchestration endpoints
# Created: October 19, 2025
#
# Security Fixes Tested:
# - IDOR-001: GetOrchestrationDetails verifies party involvement
# - IDOR-002: GetEvents verifies party involvement
# - INJ-001: executeQuery() deprecated to prevent injection
# - SEC-001: Cosmos DB credentials validated at startup
#
# Usage:
#   ./orchestration-security-test.sh
#
# Optional: With authentication token for deeper testing
#   export AUTH_TOKEN=<your-azure-ad-token-here>
#   ./orchestration-security-test.sh

set -e  # Exit on error

echo "=========================================="
echo "CTN Orchestration API - Security Testing"
echo "Started: $(date)"
echo "=========================================="
echo ""

# Color codes for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
CYAN='\033[0;36m'
NC='\033[0m' # No Color

# Test results tracking
TESTS_PASSED=0
TESTS_FAILED=0
TESTS_SKIPPED=0
FAILED_TESTS=()
SKIPPED_TESTS=()

# API Configuration
API_BASE="https://ca-ctn-asr-api-dev.calmriver-700a8c55.westeurope.azurecontainerapps.io/api/v1"
# AUTH_TOKEN should be set as environment variable
AUTH_TOKEN=${AUTH_TOKEN}

# Test orchestration and party IDs (these would need to exist in Cosmos DB)
# Using dummy UUIDs for endpoint availability testing
TEST_ORCHESTRATION_ID="test-orch-001"
TEST_PARTY_ID_AUTHORIZED="test-party-001"
TEST_PARTY_ID_UNAUTHORIZED="test-party-002"

echo "=========================================="
echo "TEST CONFIGURATION"
echo "=========================================="
echo "API Base URL: $API_BASE"
if [ -n "$AUTH_TOKEN" ]; then
  echo -e "${GREEN}✓ Auth Token: Provided (${#AUTH_TOKEN} chars)${NC}"
else
  echo -e "${YELLOW}⚠ Auth Token: Not provided (limited testing)${NC}"
fi
echo ""

# Function to test endpoint availability (unauthenticated)
test_endpoint_availability() {
  local test_name="$1"
  local url="$2"
  local expected_status="$3"
  local description="$4"

  echo "Test: $test_name"
  echo "URL: $url"
  echo "Description: $description"
  echo "Expected: HTTP $expected_status (no auth)"

  response=$(curl -s -o /dev/null -w "%{http_code}" --max-time 10 "$url" 2>&1 || echo "CURL_ERROR")

  if [ "$response" = "CURL_ERROR" ]; then
    echo -e "${RED}✗ FAILED${NC} - Curl error (timeout or connection failed)"
    TESTS_FAILED=$((TESTS_FAILED + 1))
    FAILED_TESTS+=("$test_name - Curl error")
  elif [ "$response" -eq "$expected_status" ]; then
    echo -e "${GREEN}✓ PASSED${NC} - HTTP $response"
    TESTS_PASSED=$((TESTS_PASSED + 1))
  elif [ "$response" -eq 404 ]; then
    echo -e "${RED}✗ FAILED${NC} - HTTP 404 (endpoint not registered)"
    TESTS_FAILED=$((TESTS_FAILED + 1))
    FAILED_TESTS+=("$test_name - Endpoint not registered (404)")
  else
    echo -e "${RED}✗ FAILED${NC} - Expected HTTP $expected_status, got HTTP $response"
    TESTS_FAILED=$((TESTS_FAILED + 1))
    FAILED_TESTS+=("$test_name - HTTP $response instead of $expected_status")
  fi

  echo ""
}

# Function to test authenticated endpoint
test_authenticated_endpoint() {
  local test_name="$1"
  local url="$2"
  local expected_status="$3"
  local description="$4"

  if [ -z "$AUTH_TOKEN" ]; then
    echo "Test: $test_name"
    echo -e "${YELLOW}⚠ SKIPPED${NC} - Requires AUTH_TOKEN environment variable"
    TESTS_SKIPPED=$((TESTS_SKIPPED + 1))
    SKIPPED_TESTS+=("$test_name - No auth token")
    echo ""
    return
  fi

  echo "Test: $test_name"
  echo "URL: $url"
  echo "Description: $description"
  echo "Expected: HTTP $expected_status (with auth)"

  response=$(curl -s -o /dev/null -w "%{http_code}" --max-time 10 \
    -H "Authorization: Bearer $AUTH_TOKEN" \
    "$url" 2>&1 || echo "CURL_ERROR")

  if [ "$response" = "CURL_ERROR" ]; then
    echo -e "${RED}✗ FAILED${NC} - Curl error (timeout or connection failed)"
    TESTS_FAILED=$((TESTS_FAILED + 1))
    FAILED_TESTS+=("$test_name - Curl error")
  elif [ "$response" -eq "$expected_status" ]; then
    echo -e "${GREEN}✓ PASSED${NC} - HTTP $response"
    TESTS_PASSED=$((TESTS_PASSED + 1))
  else
    echo -e "${RED}✗ FAILED${NC} - Expected HTTP $expected_status, got HTTP $response"
    TESTS_FAILED=$((TESTS_FAILED + 1))
    FAILED_TESTS+=("$test_name - HTTP $response instead of $expected_status")
  fi

  echo ""
}

# Function to test IDOR protection (requires actual test data)
test_idor_protection() {
  local test_name="$1"
  local url="$2"
  local description="$3"

  echo "Test: $test_name"
  echo -e "${CYAN}ℹ TEST DATA REQUIRED${NC}"
  echo "Description: $description"
  echo ""
  echo "To fully test IDOR protection, you need:"
  echo "  1. Two parties (A and B) in Cosmos DB Gremlin database"
  echo "  2. An orchestration that party A is involved in"
  echo "  3. Authentication tokens for both parties"
  echo ""
  echo "Test Steps (manual):"
  echo "  1. Create orchestration with party A involved"
  echo "  2. Authenticate as party A → should return 200 with data"
  echo "  3. Authenticate as party B → should return 404 (not 403)"
  echo "  4. Check audit log for IDOR_ATTEMPT entry"
  echo ""
  TESTS_SKIPPED=$((TESTS_SKIPPED + 1))
  SKIPPED_TESTS+=("$test_name - Requires test data in Cosmos DB")
  echo ""
}

# ============================================
# TEST SUITE
# ============================================

echo "=========================================="
echo "SECTION 1: ENDPOINT AVAILABILITY TESTS"
echo "=========================================="
echo "Testing that orchestration endpoints are registered"
echo ""

test_endpoint_availability \
  "GetOrchestrations - No Auth" \
  "$API_BASE/orchestrations" \
  401 \
  "Should reject unauthenticated requests"

test_endpoint_availability \
  "GetOrchestrationDetails - No Auth" \
  "$API_BASE/orchestrations/$TEST_ORCHESTRATION_ID" \
  401 \
  "Should reject unauthenticated requests"

test_endpoint_availability \
  "GetEvents - No Auth" \
  "$API_BASE/events?orchestration_id=$TEST_ORCHESTRATION_ID" \
  401 \
  "Should reject unauthenticated requests"

test_endpoint_availability \
  "GetWebhooks - No Auth" \
  "$API_BASE/webhooks" \
  401 \
  "Should reject unauthenticated requests"

echo "=========================================="
echo "SECTION 2: AUTHENTICATION TESTS"
echo "=========================================="
echo "Testing that endpoints require valid authentication"
echo ""

test_authenticated_endpoint \
  "GetOrchestrations - With Auth" \
  "$API_BASE/orchestrations" \
  200 \
  "Should return orchestrations for authenticated user"

test_authenticated_endpoint \
  "GetOrchestrationDetails - With Auth" \
  "$API_BASE/orchestrations/$TEST_ORCHESTRATION_ID" \
  404 \
  "Should return 404 for non-existent orchestration"

test_authenticated_endpoint \
  "GetEvents - With Auth (Missing orchestration_id)" \
  "$API_BASE/events" \
  400 \
  "Should return 400 when orchestration_id is missing"

test_authenticated_endpoint \
  "GetEvents - With Auth (Invalid orchestration_id)" \
  "$API_BASE/events?orchestration_id=$TEST_ORCHESTRATION_ID" \
  404 \
  "Should return 404 for non-existent orchestration"

echo "=========================================="
echo "SECTION 3: IDOR PROTECTION TESTS"
echo "=========================================="
echo "Testing Insecure Direct Object Reference protection"
echo ""

test_idor_protection \
  "IDOR-001: GetOrchestrationDetails" \
  "$API_BASE/orchestrations/{orchestration_id}" \
  "Verify user can only access orchestrations their party is involved in"

test_idor_protection \
  "IDOR-002: GetEvents" \
  "$API_BASE/events?orchestration_id={id}" \
  "Verify user can only access events for orchestrations they're involved in"

echo "=========================================="
echo "SECTION 4: INJECTION PROTECTION TESTS"
echo "=========================================="
echo ""

echo "Test: INJ-001: executeQuery() Deprecated"
echo -e "${CYAN}ℹ CODE REVIEW REQUIRED${NC}"
echo "Description: Verify executeQuery() is deprecated and throws error"
echo ""
echo "Code Review Checklist:"
echo "  ✓ api/src/utils/gremlinClient.ts:executeQuery() throws error"
echo "  ✓ All endpoints use specific helper functions instead"
echo "  ✓ No direct Gremlin query string construction from user input"
echo ""
TESTS_SKIPPED=$((TESTS_SKIPPED + 1))
SKIPPED_TESTS+=("INJ-001 - Code review required")
echo ""

echo "=========================================="
echo "SECTION 5: ENVIRONMENT VALIDATION TESTS"
echo "=========================================="
echo ""

echo "Test: SEC-001: Cosmos DB Credentials Validation"
echo -e "${CYAN}ℹ DEPLOYMENT VERIFICATION REQUIRED${NC}"
echo "Description: Verify missing credentials cause startup failure"
echo ""
echo "Verification Steps:"
echo "  1. Check Azure Function App environment variables"
echo "  2. Verify COSMOS_ORCHESTRATION_ENDPOINT is set"
echo "  3. Verify COSMOS_ORCHESTRATION_KEY is set"
echo "  4. Check Application Insights for startup errors if missing"
echo ""
echo "Expected Behavior:"
echo "  - Missing COSMOS_ORCHESTRATION_ENDPOINT → startup error"
echo "  - Missing COSMOS_ORCHESTRATION_KEY → startup error"
echo "  - Invalid endpoint format → startup error"
echo ""
TESTS_SKIPPED=$((TESTS_SKIPPED + 1))
SKIPPED_TESTS+=("SEC-001 - Deployment verification required")
echo ""

echo "=========================================="
echo "SECTION 6: AUDIT LOG VERIFICATION"
echo "=========================================="
echo ""

echo "Test: Audit Log - IDOR Attempt Capture"
echo -e "${CYAN}ℹ DATABASE VERIFICATION REQUIRED${NC}"
echo "Description: Verify IDOR attempts are logged in audit_log table"
echo ""
echo "SQL Query to check audit logs:"
echo ""
echo "  SELECT "
echo "    event_type, severity, result, resource_type, resource_id,"
echo "    details->>'security_issue' as security_issue,"
echo "    details->>'reason' as reason,"
echo "    error_message, created_at"
echo "  FROM audit_log"
echo "  WHERE event_type = 'ACCESS_DENIED'"
echo "    AND details->>'security_issue' = 'IDOR_ATTEMPT'"
echo "  ORDER BY created_at DESC"
echo "  LIMIT 10;"
echo ""
echo "Expected Fields:"
echo "  - event_type: ACCESS_DENIED"
echo "  - severity: WARNING"
echo "  - result: failure"
echo "  - details.security_issue: IDOR_ATTEMPT"
echo "  - details.reason: party_not_involved"
echo ""
TESTS_SKIPPED=$((TESTS_SKIPPED + 1))
SKIPPED_TESTS+=("Audit Log - Database verification required")
echo ""

# ============================================
# TEST SUMMARY
# ============================================

echo "=========================================="
echo "TEST SUMMARY"
echo "=========================================="
TOTAL_TESTS=$((TESTS_PASSED + TESTS_FAILED + TESTS_SKIPPED))
echo "Total Tests: $TOTAL_TESTS"
echo -e "${GREEN}Passed: $TESTS_PASSED${NC}"
echo -e "${RED}Failed: $TESTS_FAILED${NC}"
echo -e "${YELLOW}Skipped: $TESTS_SKIPPED${NC}"
echo ""

if [ $TESTS_FAILED -gt 0 ]; then
  echo -e "${RED}Failed Tests:${NC}"
  for test in "${FAILED_TESTS[@]}"; do
    echo "  - $test"
  done
  echo ""
fi

if [ $TESTS_SKIPPED -gt 0 ]; then
  echo -e "${YELLOW}Skipped Tests:${NC}"
  for test in "${SKIPPED_TESTS[@]}"; do
    echo "  - $test"
  done
  echo ""
fi

echo "=========================================="
echo "RECOMMENDATIONS"
echo "=========================================="
echo ""
echo "1. IDOR Testing (Manual):"
echo "   - Create test orchestrations in Cosmos DB Gremlin"
echo "   - Test with multiple party authentication tokens"
echo "   - Verify 404 responses (not 403) for unauthorized access"
echo "   - Check audit_log table for IDOR_ATTEMPT entries"
echo ""
echo "2. Injection Testing (Code Review):"
echo "   - Verify executeQuery() is deprecated in gremlinClient.ts"
echo "   - Confirm all endpoints use parameterized helper functions"
echo "   - Review GetOrchestrations, GetOrchestrationDetails, GetEvents"
echo ""
echo "3. Environment Validation (Deployment):"
echo "   - Test startup with missing COSMOS_ORCHESTRATION_ENDPOINT"
echo "   - Test startup with missing COSMOS_ORCHESTRATION_KEY"
echo "   - Verify Application Insights captures startup errors"
echo ""
echo "4. Audit Logging (Database):"
echo "   - Query audit_log for IDOR_ATTEMPT entries"
echo "   - Verify all access attempts are logged"
echo "   - Check log retention and rotation policies"
echo ""
echo "5. Next Steps:"
echo "   - Create Cosmos DB test data seeding script"
echo "   - Implement automated IDOR testing in Playwright"
echo "   - Add negative test cases for injection attempts"
echo "   - Set up automated audit log monitoring"
echo ""

if [ $TESTS_FAILED -gt 0 ]; then
  echo -e "${RED}✗ SECURITY TESTS FAILED${NC}"
  echo "Fix failed tests before deploying to production"
  exit 1
elif [ $TESTS_SKIPPED -gt 0 ]; then
  echo -e "${YELLOW}⚠ PARTIAL SECURITY TESTING${NC}"
  echo "Complete manual/deployment tests before production release"
  exit 0
else
  echo -e "${GREEN}✓ ALL AUTOMATED TESTS PASSED${NC}"
  echo "Proceed with manual verification steps"
  exit 0
fi
