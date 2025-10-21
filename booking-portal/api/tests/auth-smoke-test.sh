#!/bin/bash

#############################################################################
# AUTH SMOKE TEST - Booking Portal API
# Tests authentication and authorization on API endpoints
#############################################################################

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Configuration
API_BASE_URL="${API_BASE_URL:-https://func-ctn-booking-prod.azurewebsites.net}"
CLIENT_ID="${CLIENT_ID:-d3037c11-a541-4f21-8862-8079137a0cde}"
TENANT_ID="${TENANT_ID:-598664e7-725c-4daa-bd1f-89c4ada717ff}"

# Test counters
TESTS_RUN=0
TESTS_PASSED=0
TESTS_FAILED=0

echo -e "${BLUE}=================================================${NC}"
echo -e "${BLUE}Booking Portal API - Authentication Smoke Test${NC}"
echo -e "${BLUE}=================================================${NC}"
echo ""
echo "API Base URL: $API_BASE_URL"
echo "Client ID: $CLIENT_ID"
echo "Tenant ID: $TENANT_ID"
echo ""

# Test 1: GET /api/v1/tenants without auth (should return 401)
echo -e "${YELLOW}Test 1: GET /api/v1/tenants without authentication${NC}"
TESTS_RUN=$((TESTS_RUN + 1))

RESPONSE=$(curl -s -w "\n%{http_code}" "${API_BASE_URL}/api/v1/tenants")
HTTP_CODE=$(echo "$RESPONSE" | tail -n1)
BODY=$(echo "$RESPONSE" | head -n-1)

if [ "$HTTP_CODE" -eq 401 ]; then
    echo -e "${GREEN}✓ PASS${NC} - Correctly returned 401 Unauthorized"
    echo "Response body: $BODY"
    TESTS_PASSED=$((TESTS_PASSED + 1))
else
    echo -e "${RED}✗ FAIL${NC} - Expected 401, got $HTTP_CODE"
    echo "Response body: $BODY"
    TESTS_FAILED=$((TESTS_FAILED + 1))
fi
echo ""

# Test 2: GET /api/v1/tenants with invalid token (should return 401)
echo -e "${YELLOW}Test 2: GET /api/v1/tenants with invalid token${NC}"
TESTS_RUN=$((TESTS_RUN + 1))

INVALID_TOKEN="eyJhbGciOiJSUzI1NiIsInR5cCI6IkpXVCJ9.eyJzdWIiOiIxMjM0NTY3ODkwIiwibmFtZSI6IkpvaG4gRG9lIiwiaWF0IjoxNTE2MjM5MDIyfQ.invalid"

RESPONSE=$(curl -s -w "\n%{http_code}" \
    -H "Authorization: Bearer $INVALID_TOKEN" \
    "${API_BASE_URL}/api/v1/tenants")
HTTP_CODE=$(echo "$RESPONSE" | tail -n1)
BODY=$(echo "$RESPONSE" | head -n-1)

if [ "$HTTP_CODE" -eq 401 ]; then
    echo -e "${GREEN}✓ PASS${NC} - Correctly returned 401 Unauthorized for invalid token"
    echo "Response body: $BODY"
    TESTS_PASSED=$((TESTS_PASSED + 1))
else
    echo -e "${RED}✗ FAIL${NC} - Expected 401, got $HTTP_CODE"
    echo "Response body: $BODY"
    TESTS_FAILED=$((TESTS_FAILED + 1))
fi
echo ""

# Test 3: GET /api/v1/tenants with malformed token (should return 401)
echo -e "${YELLOW}Test 3: GET /api/v1/tenants with malformed token${NC}"
TESTS_RUN=$((TESTS_RUN + 1))

MALFORMED_TOKEN="not.a.valid.jwt.token"

RESPONSE=$(curl -s -w "\n%{http_code}" \
    -H "Authorization: Bearer $MALFORMED_TOKEN" \
    "${API_BASE_URL}/api/v1/tenants")
HTTP_CODE=$(echo "$RESPONSE" | tail -n1)
BODY=$(echo "$RESPONSE" | head -n-1)

if [ "$HTTP_CODE" -eq 401 ]; then
    echo -e "${GREEN}✓ PASS${NC} - Correctly returned 401 Unauthorized for malformed token"
    echo "Response body: $BODY"
    TESTS_PASSED=$((TESTS_PASSED + 1))
else
    echo -e "${RED}✗ FAIL${NC} - Expected 401, got $HTTP_CODE"
    echo "Response body: $BODY"
    TESTS_FAILED=$((TESTS_FAILED + 1))
fi
echo ""

# Test 4: POST /api/v1/bookings/upload without auth (should return 401)
echo -e "${YELLOW}Test 4: POST /api/v1/bookings/upload without authentication${NC}"
TESTS_RUN=$((TESTS_RUN + 1))

RESPONSE=$(curl -s -w "\n%{http_code}" \
    -X POST \
    -H "Content-Type: application/pdf" \
    "${API_BASE_URL}/api/v1/bookings/upload")
HTTP_CODE=$(echo "$RESPONSE" | tail -n1)
BODY=$(echo "$RESPONSE" | head -n-1)

if [ "$HTTP_CODE" -eq 401 ]; then
    echo -e "${GREEN}✓ PASS${NC} - Correctly returned 401 Unauthorized"
    echo "Response body: $BODY"
    TESTS_PASSED=$((TESTS_PASSED + 1))
else
    echo -e "${RED}✗ FAIL${NC} - Expected 401, got $HTTP_CODE"
    echo "Response body: $BODY"
    TESTS_FAILED=$((TESTS_FAILED + 1))
fi
echo ""

# Test 5: Check if JWKS endpoint is accessible
echo -e "${YELLOW}Test 5: Verify JWKS endpoint is accessible${NC}"
TESTS_RUN=$((TESTS_RUN + 1))

JWKS_URL="https://login.microsoftonline.com/${TENANT_ID}/discovery/v2.0/keys"
RESPONSE=$(curl -s -w "\n%{http_code}" "$JWKS_URL")
HTTP_CODE=$(echo "$RESPONSE" | tail -n1)
BODY=$(echo "$RESPONSE" | head -n-1)

if [ "$HTTP_CODE" -eq 200 ]; then
    echo -e "${GREEN}✓ PASS${NC} - JWKS endpoint is accessible"
    echo "Keys returned: $(echo "$BODY" | grep -o '"kid"' | wc -l)"
    TESTS_PASSED=$((TESTS_PASSED + 1))
else
    echo -e "${RED}✗ FAIL${NC} - JWKS endpoint returned $HTTP_CODE"
    echo "Response body: $BODY"
    TESTS_FAILED=$((TESTS_FAILED + 1))
fi
echo ""

# Test 6: Check Azure AD discovery endpoint
echo -e "${YELLOW}Test 6: Verify Azure AD discovery endpoint${NC}"
TESTS_RUN=$((TESTS_RUN + 1))

DISCOVERY_URL="https://login.microsoftonline.com/${TENANT_ID}/v2.0/.well-known/openid-configuration"
RESPONSE=$(curl -s -w "\n%{http_code}" "$DISCOVERY_URL")
HTTP_CODE=$(echo "$RESPONSE" | tail -n1)
BODY=$(echo "$RESPONSE" | head -n-1)

if [ "$HTTP_CODE" -eq 200 ]; then
    echo -e "${GREEN}✓ PASS${NC} - Azure AD discovery endpoint is accessible"
    echo "Issuer: $(echo "$BODY" | grep -o '"issuer":"[^"]*"' | cut -d'"' -f4)"
    TESTS_PASSED=$((TESTS_PASSED + 1))
else
    echo -e "${RED}✗ FAIL${NC} - Discovery endpoint returned $HTTP_CODE"
    echo "Response body: $BODY"
    TESTS_FAILED=$((TESTS_FAILED + 1))
fi
echo ""

# Test 7: Check if API is deployed and responding
echo -e "${YELLOW}Test 7: Verify API is deployed and responding${NC}"
TESTS_RUN=$((TESTS_RUN + 1))

RESPONSE=$(curl -s -w "\n%{http_code}" "${API_BASE_URL}/api/v1/health" || echo "Connection failed\n000")
HTTP_CODE=$(echo "$RESPONSE" | tail -n1)
BODY=$(echo "$RESPONSE" | head -n-1)

if [ "$HTTP_CODE" -eq 200 ] || [ "$HTTP_CODE" -eq 404 ]; then
    echo -e "${GREEN}✓ PASS${NC} - API is deployed and responding (HTTP $HTTP_CODE)"
    echo "Response: $BODY"
    TESTS_PASSED=$((TESTS_PASSED + 1))
else
    echo -e "${RED}✗ FAIL${NC} - API is not responding correctly (HTTP $HTTP_CODE)"
    echo "Response: $BODY"
    TESTS_FAILED=$((TESTS_FAILED + 1))
fi
echo ""

# Summary
echo -e "${BLUE}=================================================${NC}"
echo -e "${BLUE}Test Summary${NC}"
echo -e "${BLUE}=================================================${NC}"
echo "Tests run: $TESTS_RUN"
echo -e "Tests passed: ${GREEN}$TESTS_PASSED${NC}"
echo -e "Tests failed: ${RED}$TESTS_FAILED${NC}"
echo ""

if [ $TESTS_FAILED -eq 0 ]; then
    echo -e "${GREEN}All tests passed! ✓${NC}"
    echo ""
    echo -e "${YELLOW}Next Steps:${NC}"
    echo "1. Acquire a valid JWT token from Azure AD"
    echo "2. Run: ./auth-with-token-test.sh <YOUR_ACCESS_TOKEN>"
    echo "3. Or use the frontend debugging guide to capture a token from browser"
    exit 0
else
    echo -e "${RED}Some tests failed! ✗${NC}"
    echo ""
    echo -e "${YELLOW}Troubleshooting:${NC}"
    echo "1. Check if API is deployed correctly"
    echo "2. Verify Client ID and Tenant ID are correct"
    echo "3. Check Azure Function logs: func azure functionapp logstream func-ctn-booking-prod"
    exit 1
fi
