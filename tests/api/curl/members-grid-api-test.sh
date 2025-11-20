#!/bin/bash

# ============================================
# Members Grid API Test
# ============================================
# Tests the /all-members endpoint that the admin portal uses
# This should be run BEFORE investigating UI issues
#
# Usage: ./api/tests/members-grid-api-test.sh

set -e

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

API_BASE="https://ca-ctn-asr-api-dev.calmriver-700a8c55.westeurope.azurecontainerapps.io/api/v1"

echo ""
echo "======================================"
echo "Members Grid API Test"
echo "======================================"
echo ""

# Test 1: Health check
echo -e "${YELLOW}Test 1: API Health Check${NC}"
HEALTH_STATUS=$(curl -s -o /dev/null -w "%{http_code}" https://ca-ctn-asr-api-dev.calmriver-700a8c55.westeurope.azurecontainerapps.io/api/health)
if [ "$HEALTH_STATUS" = "200" ]; then
    echo -e "${GREEN}✓ API is healthy (HTTP $HEALTH_STATUS)${NC}"
else
    echo -e "${RED}✗ API health check failed (HTTP $HEALTH_STATUS)${NC}"
    exit 1
fi
echo ""

# Test 2: Get members without authentication (should fail with 401)
echo -e "${YELLOW}Test 2: GET /all-members (no auth - should fail)${NC}"
NO_AUTH_STATUS=$(curl -s -o /dev/null -w "%{http_code}" "$API_BASE/all-members?page=1&page_size=20")
if [ "$NO_AUTH_STATUS" = "401" ]; then
    echo -e "${GREEN}✓ Properly rejected unauthenticated request (HTTP $NO_AUTH_STATUS)${NC}"
else
    echo -e "${RED}✗ Expected 401, got HTTP $NO_AUTH_STATUS${NC}"
    echo "  Note: This might be okay if auth is disabled in dev"
fi
echo ""

# Test 3: Test endpoint exists (with HEAD request)
echo -e "${YELLOW}Test 3: Check if /all-members endpoint exists${NC}"
HEAD_STATUS=$(curl -s -o /dev/null -w "%{http_code}" -X HEAD "$API_BASE/all-members")
if [ "$HEAD_STATUS" = "401" ] || [ "$HEAD_STATUS" = "200" ]; then
    echo -e "${GREEN}✓ Endpoint exists (HTTP $HEAD_STATUS)${NC}"
elif [ "$HEAD_STATUS" = "404" ]; then
    echo -e "${RED}✗ Endpoint not found (HTTP $HEAD_STATUS)${NC}"
    echo "  This is a DEPLOYMENT ISSUE - API code not deployed correctly"
    exit 1
else
    echo -e "${YELLOW}⚠ Unexpected status (HTTP $HEAD_STATUS)${NC}"
fi
echo ""

# Test 4: Test with pagination parameters
echo -e "${YELLOW}Test 4: GET /all-members with pagination params${NC}"
PAGINATED_RESPONSE=$(curl -s "$API_BASE/all-members?page=1&page_size=5")
echo "Response (first 500 chars):"
echo "$PAGINATED_RESPONSE" | head -c 500
echo ""
echo ""

# Test 5: Check response structure (if we got data)
echo -e "${YELLOW}Test 5: Validate response structure${NC}"
if echo "$PAGINATED_RESPONSE" | grep -q '"data"'; then
    echo -e "${GREEN}✓ Response contains 'data' field${NC}"
else
    echo -e "${RED}✗ Response missing 'data' field${NC}"
fi

if echo "$PAGINATED_RESPONSE" | grep -q '"pagination"'; then
    echo -e "${GREEN}✓ Response contains 'pagination' field${NC}"
else
    echo -e "${YELLOW}⚠ Response missing 'pagination' field (might be okay)${NC}"
fi

if echo "$PAGINATED_RESPONSE" | grep -q '"org_id"'; then
    echo -e "${GREEN}✓ Member objects contain 'org_id' field${NC}"
else
    echo -e "${RED}✗ Member objects missing 'org_id' field${NC}"
fi
echo ""

# Test 6: Check specific member fields that grid displays
echo -e "${YELLOW}Test 6: Check required member fields for grid${NC}"
REQUIRED_FIELDS=("legal_name" "status" "lei" "euid" "kvk" "created_at")
for field in "${REQUIRED_FIELDS[@]}"; do
    if echo "$PAGINATED_RESPONSE" | grep -q "\"$field\""; then
        echo -e "${GREEN}✓ Field '$field' present${NC}"
    else
        echo -e "${YELLOW}⚠ Field '$field' not found (might not have data)${NC}"
    fi
done
echo ""

echo "======================================"
echo "API Test Summary"
echo "======================================"
echo ""
echo "If all tests pass, the API is working correctly."
echo "If the UI still doesn't respond to clicks, the issue is in the frontend code."
echo ""
echo "Next steps:"
echo "  1. If tests FAIL → Fix API deployment first"
echo "  2. If tests PASS → Debug frontend with browser DevTools"
echo ""
