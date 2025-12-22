#!/bin/bash
# ============================================
# Three-Tier Authentication System - API Test
# Created: October 28, 2025
# Purpose: Test tier management and DNS verification endpoints
# ============================================

set -e  # Exit on error

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
CYAN='\033[0;36m'
NC='\033[0m' # No Color

# Configuration
API_BASE_URL="https://ca-ctn-asr-api-dev.calmriver-700a8c55.westeurope.azurecontainerapps.io/api/v1"
HEALTH_URL="https://ca-ctn-asr-api-dev.calmriver-700a8c55.westeurope.azurecontainerapps.io/api/health"

# Test results tracking
TESTS_RUN=0
TESTS_PASSED=0
TESTS_FAILED=0

# ============================================
# Helper Functions
# ============================================

log_info() {
  echo -e "${BLUE}ℹ ${NC}$1"
}

log_success() {
  echo -e "${GREEN}✓${NC} $1"
  TESTS_PASSED=$((TESTS_PASSED + 1))
}

log_error() {
  echo -e "${RED}✗${NC} $1"
  TESTS_FAILED=$((TESTS_FAILED + 1))
}

log_warning() {
  echo -e "${YELLOW}⚠${NC} $1"
}

log_section() {
  echo -e "\n${CYAN}========================================${NC}"
  echo -e "${CYAN}$1${NC}"
  echo -e "${CYAN}========================================${NC}\n"
}

# ============================================
# Test API Endpoint
# ============================================
test_endpoint() {
  local method=$1
  local url=$2
  local expected_status=$3
  local test_name=$4
  local body=$5
  local auth_header=$6

  TESTS_RUN=$((TESTS_RUN + 1))

  log_info "Testing: $test_name"
  log_info "Method: $method | URL: $url"

  if [ -n "$body" ]; then
    log_info "Request Body: $body"
  fi

  # Build curl command
  local curl_cmd="curl -s -w '\n%{http_code}' -X $method '$url'"

  if [ -n "$body" ]; then
    curl_cmd="$curl_cmd -H 'Content-Type: application/json' -d '$body'"
  fi

  if [ -n "$auth_header" ]; then
    curl_cmd="$curl_cmd -H 'Authorization: Bearer $auth_header'"
  fi

  # Execute request
  local response=$(eval $curl_cmd)
  local http_code=$(echo "$response" | tail -n1)
  local response_body=$(echo "$response" | sed '$d')

  log_info "Response Code: $http_code"

  if [ -n "$response_body" ]; then
    log_info "Response Body: $response_body"
  fi

  # Check status code
  if [ "$http_code" -eq "$expected_status" ]; then
    log_success "✓ $test_name - Status $http_code (expected $expected_status)"

    # If successful and has response body, show it prettified
    if [ -n "$response_body" ] && [ "$http_code" -ge 200 ] && [ "$http_code" -lt 300 ]; then
      echo "$response_body" | python3 -m json.tool 2>/dev/null || echo "$response_body"
    fi

    return 0
  else
    log_error "✗ $test_name - Status $http_code (expected $expected_status)"

    if [ -n "$response_body" ]; then
      echo -e "${RED}Error Response:${NC}"
      echo "$response_body" | python3 -m json.tool 2>/dev/null || echo "$response_body"
    fi

    return 1
  fi
}

# ============================================
# STEP 1: Pre-Test Health Check
# ============================================
log_section "STEP 1: API Health Check"

log_info "Checking API health endpoint..."
HEALTH_RESPONSE=$(curl -s -w '\n%{http_code}' "$HEALTH_URL")
HEALTH_CODE=$(echo "$HEALTH_RESPONSE" | tail -n1)
HEALTH_BODY=$(echo "$HEALTH_RESPONSE" | sed '$d')

if [ "$HEALTH_CODE" -eq 200 ]; then
  log_success "API is healthy (HTTP $HEALTH_CODE)"
  echo "$HEALTH_BODY" | python3 -m json.tool 2>/dev/null || echo "$HEALTH_BODY"
else
  log_error "API health check failed (HTTP $HEALTH_CODE)"
  echo "$HEALTH_BODY"
  log_warning "Deployment may be out of sync. Check GitHub Actions workflow status."
  log_warning "URL: https://github.com/DeNoronha/ctn-asr-demo/actions"
  exit 1
fi

# ============================================
# STEP 2: Test Public Endpoint (No Auth)
# ============================================
log_section "STEP 2: Test Tier Requirements (Public Endpoint)"

test_endpoint "GET" \
  "$API_BASE_URL/tiers/requirements" \
  200 \
  "GET /tiers/requirements (no auth required)" \
  "" \
  ""

# ============================================
# STEP 3: Test Tier Info Endpoint
# ============================================
log_section "STEP 3: Test Get Tier Info"

log_warning "NOTE: This test requires authentication. Skipping for now."
log_info "Endpoint: GET /entities/{legalEntityId}/tier"
log_info "Requires: Member or Admin authentication"
log_info ""
log_info "To test manually:"
log_info "1. Get access token from browser localStorage"
log_info "2. Run: curl -H 'Authorization: Bearer \$TOKEN' \\"
log_info "   $API_BASE_URL/entities/{LEGAL_ENTITY_ID}/tier"

# Test with invalid entity ID (should return 404 or 401)
test_endpoint "GET" \
  "$API_BASE_URL/entities/00000000-0000-0000-0000-000000000000/tier" \
  401 \
  "GET /entities/{id}/tier (no auth - expect 401)" \
  "" \
  ""

# ============================================
# STEP 4: Test DNS Token Generation
# ============================================
log_section "STEP 4: Test DNS Token Generation"

log_warning "NOTE: This test requires authentication. Skipping for now."
log_info "Endpoint: POST /entities/{legalEntityId}/dns/token"
log_info "Requires: Member authentication"
log_info "Request body: { \"domain\": \"example.com\" }"
log_info ""
log_info "Expected response:"
log_info "{"
log_info "  \"tokenId\": \"uuid\","
log_info "  \"domain\": \"example.com\","
log_info "  \"token\": \"ctn-XXXXXXXXXXXXXXXXXXXXXXXXXXXXX\","
log_info "  \"recordName\": \"_ctn-verify.example.com\","
log_info "  \"expiresAt\": \"2025-11-27T...\","
log_info "  \"instructions\": { ... }"
log_info "}"

# Test without auth (should return 401)
test_endpoint "POST" \
  "$API_BASE_URL/entities/00000000-0000-0000-0000-000000000000/dns/token" \
  401 \
  "POST /entities/{id}/dns/token (no auth - expect 401)" \
  '{"domain":"example.com"}' \
  ""

# ============================================
# STEP 5: Test DNS Token Verification
# ============================================
log_section "STEP 5: Test DNS Token Verification"

log_warning "NOTE: This test requires authentication. Skipping for now."
log_info "Endpoint: POST /dns/verify/{tokenId}"
log_info "Requires: Member authentication"
log_info ""
log_info "Expected response:"
log_info "{"
log_info "  \"verified\": true/false,"
log_info "  \"details\": \"2 out of 3 resolvers confirmed\","
log_info "  \"resolverResults\": ["
log_info "    { \"resolver\": \"8.8.8.8\", \"found\": true, \"records\": [...] },"
log_info "    { \"resolver\": \"1.1.1.1\", \"found\": true, \"records\": [...] },"
log_info "    { \"resolver\": \"9.9.9.9\", \"found\": false }"
log_info "  ]"
log_info "}"

# Test without auth (should return 401)
test_endpoint "POST" \
  "$API_BASE_URL/dns/verify/00000000-0000-0000-0000-000000000000" \
  401 \
  "POST /dns/verify/{tokenId} (no auth - expect 401)" \
  "" \
  ""

# ============================================
# STEP 6: Test Get Pending DNS Tokens
# ============================================
log_section "STEP 6: Test Get Pending DNS Tokens"

log_warning "NOTE: This test requires authentication. Skipping for now."
log_info "Endpoint: GET /entities/{legalEntityId}/dns/tokens"
log_info "Requires: Member authentication"
log_info ""
log_info "Expected response:"
log_info "{"
log_info "  \"tokens\": ["
log_info "    {"
log_info "      \"tokenId\": \"uuid\","
log_info "      \"domain\": \"example.com\","
log_info "      \"token\": \"ctn-XXXXX...\","
log_info "      \"recordName\": \"_ctn-verify.example.com\","
log_info "      \"expiresAt\": \"2025-11-27T...\","
log_info "      \"status\": \"pending\""
log_info "    }"
log_info "  ]"
log_info "}"

# Test without auth (should return 401)
test_endpoint "GET" \
  "$API_BASE_URL/entities/00000000-0000-0000-0000-000000000000/dns/tokens" \
  401 \
  "GET /entities/{id}/dns/tokens (no auth - expect 401)" \
  "" \
  ""

# ============================================
# STEP 7: Test Update Tier (Admin Only)
# ============================================
log_section "STEP 7: Test Update Tier (Admin Only)"

log_warning "NOTE: This test requires ADMIN authentication. Skipping for now."
log_info "Endpoint: PUT /entities/{legalEntityId}/tier"
log_info "Requires: Admin authentication"
log_info "Request body:"
log_info "{"
log_info "  \"tier\": 2,"
log_info "  \"method\": \"DNS\","
log_info "  \"dnsVerifiedDomain\": \"example.com\","
log_info "  \"eherkenningIdentifier\": null,"
log_info "  \"eherkenningLevel\": null"
log_info "}"

# Test without auth (should return 401)
test_endpoint "PUT" \
  "$API_BASE_URL/entities/00000000-0000-0000-0000-000000000000/tier" \
  401 \
  "PUT /entities/{id}/tier (no auth - expect 401)" \
  '{"tier":2,"method":"DNS"}' \
  ""

# ============================================
# STEP 8: Test Authorization Log (Admin Only)
# ============================================
log_section "STEP 8: Test Authorization Log (Admin Only)"

log_warning "NOTE: This test requires ADMIN authentication. Skipping for now."
log_info "Endpoint: GET /authorization-log"
log_info "Requires: Admin authentication"
log_info "Query params: ?legalEntityId={id}&limit=100&offset=0"
log_info ""
log_info "Expected response:"
log_info "{"
log_info "  \"data\": ["
log_info "    {"
log_info "      \"log_id\": \"uuid\","
log_info "      \"legal_entity_id\": \"uuid\","
log_info "      \"user_identifier\": \"user@example.com\","
log_info "      \"requested_resource\": \"/api/v1/webhooks\","
log_info "      \"requested_action\": \"READ\","
log_info "      \"required_tier\": 2,"
log_info "      \"user_tier\": 3,"
log_info "      \"authorization_result\": \"denied\","
log_info "      \"denial_reason\": \"Insufficient tier: requires Tier 2, has Tier 3\","
log_info "      \"created_at\": \"2025-10-28T...\""
log_info "    }"
log_info "  ],"
log_info "  \"pagination\": { \"limit\": 100, \"offset\": 0, \"total\": 1 }"
log_info "}"

# Test without auth (should return 401)
test_endpoint "GET" \
  "$API_BASE_URL/authorization-log?limit=10&offset=0" \
  401 \
  "GET /authorization-log (no auth - expect 401)" \
  "" \
  ""

# ============================================
# STEP 9: Check Function Registration
# ============================================
log_section "STEP 9: Function Registration Check"

log_info "Checking if TierManagement functions are registered..."
log_info ""
log_warning "⚠️  CRITICAL CHECK REQUIRED:"
log_info "The TierManagement.ts file must be imported in api/src/index.ts"
log_info "Add this line to index.ts:"
log_info ""
echo -e "${CYAN}import './functions/TierManagement';${NC}"
log_info ""
log_info "Without this import, all tier endpoints will return 404!"
log_info ""

# Try to detect if endpoints exist by testing OPTIONS request
log_info "Testing if endpoints respond to OPTIONS (CORS preflight)..."

ENDPOINTS=(
  "/entities/test-id/tier"
  "/dns/verify/test-id"
  "/entities/test-id/dns/token"
  "/entities/test-id/dns/tokens"
  "/tiers/requirements"
  "/authorization-log"
)

REGISTERED_COUNT=0
NOT_FOUND_COUNT=0

for endpoint in "${ENDPOINTS[@]}"; do
  RESPONSE=$(curl -s -w '\n%{http_code}' -X OPTIONS "$API_BASE_URL$endpoint")
  HTTP_CODE=$(echo "$RESPONSE" | tail -n1)

  if [ "$HTTP_CODE" -eq 200 ] || [ "$HTTP_CODE" -eq 204 ]; then
    log_success "Endpoint registered: $endpoint (HTTP $HTTP_CODE)"
    REGISTERED_COUNT=$((REGISTERED_COUNT + 1))
  elif [ "$HTTP_CODE" -eq 404 ]; then
    log_error "Endpoint NOT FOUND: $endpoint (HTTP 404)"
    NOT_FOUND_COUNT=$((NOT_FOUND_COUNT + 1))
  else
    log_warning "Endpoint status unclear: $endpoint (HTTP $HTTP_CODE)"
  fi
done

log_info ""
log_info "Registration Summary:"
log_info "  - Registered: $REGISTERED_COUNT"
log_info "  - Not Found: $NOT_FOUND_COUNT"
log_info ""

if [ "$NOT_FOUND_COUNT" -gt 0 ]; then
  log_error "⚠️  CRITICAL: $NOT_FOUND_COUNT endpoints returning 404!"
  log_error ""
  log_error "ACTION REQUIRED:"
  log_error "1. Check api/src/index.ts contains: import './functions/TierManagement';"
  log_error "2. Rebuild API: cd api && npm run build"
  log_error "3. Push changes to trigger GitHub Actions workflow"
  log_error "4. Wait 2-3 minutes for deployment"
  log_error "5. Re-run this test script"
fi

# ============================================
# Final Summary
# ============================================
log_section "TEST SUMMARY"

echo -e "${BLUE}Tests Run:${NC}    $TESTS_RUN"
echo -e "${GREEN}Tests Passed:${NC} $TESTS_PASSED"
echo -e "${RED}Tests Failed:${NC} $TESTS_FAILED"
echo ""

if [ "$TESTS_FAILED" -eq 0 ]; then
  echo -e "${GREEN}✓ All tests passed!${NC}"
  echo ""
  log_info "Next Steps:"
  log_info "1. Use browser to authenticate and extract access token"
  log_info "2. Test authenticated endpoints manually with curl"
  log_info "3. Create full integration tests with Playwright"
  exit 0
else
  echo -e "${RED}✗ Some tests failed!${NC}"
  echo ""
  log_warning "Common Issues:"
  log_warning "1. API not deployed - check GitHub Actions workflow"
  log_warning "2. Functions not registered - check index.ts imports"
  log_warning "3. Database migration not run - check database schema"
  exit 1
fi
