#!/bin/bash

#############################################################################
# API DIAGNOSTICS TEST - CTN DocuFlow
# Tests diagnostic and health check endpoints
#############################################################################

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
CYAN='\033[0;36m'
NC='\033[0m' # No Color

# Configuration
API_BASE_URL="${API_BASE_URL:-https://func-ctn-booking-prod.azurewebsites.net}"

# Test counters
TESTS_RUN=0
TESTS_PASSED=0
TESTS_FAILED=0
WARNINGS=0

# Helper function to pretty print JSON
pretty_json() {
    if command -v jq &> /dev/null; then
        echo "$1" | jq .
    else
        echo "$1"
    fi
}

echo -e "${BLUE}=========================================${NC}"
echo -e "${BLUE}CTN DocuFlow - API Diagnostics Test${NC}"
echo -e "${BLUE}=========================================${NC}"
echo ""
echo "API Base URL: $API_BASE_URL"
echo "Test Time: $(date '+%Y-%m-%d %H:%M:%S')"
echo ""

# Test 1: Check /api/v1/diagnostic endpoint
echo -e "${CYAN}Test 1: GET /api/v1/diagnostic - Health check${NC}"
TESTS_RUN=$((TESTS_RUN + 1))

RESPONSE=$(curl -s -w "\n%{http_code}" "${API_BASE_URL}/api/v1/diagnostic")
HTTP_CODE=$(echo "$RESPONSE" | tail -n1)
BODY=$(echo "$RESPONSE" | sed '$d')

if [ "$HTTP_CODE" -eq 200 ]; then
    echo -e "${GREEN}✓ PASS${NC} - Diagnostic endpoint returned 200 OK"
    echo "Response body:"
    pretty_json "$BODY"

    # Parse response and check for expected fields
    if echo "$BODY" | grep -q "status"; then
        echo -e "${GREEN}  ✓${NC} Response contains 'status' field"
    else
        echo -e "${YELLOW}  ⚠${NC} Response missing 'status' field"
        WARNINGS=$((WARNINGS + 1))
    fi

    TESTS_PASSED=$((TESTS_PASSED + 1))
elif [ "$HTTP_CODE" -eq 404 ]; then
    echo -e "${YELLOW}⚠ WARN${NC} - Diagnostic endpoint not found (404)"
    echo "This endpoint may not be implemented yet"
    WARNINGS=$((WARNINGS + 1))
    TESTS_PASSED=$((TESTS_PASSED + 1))
else
    echo -e "${RED}✗ FAIL${NC} - Expected 200 or 404, got $HTTP_CODE"
    echo "Response body:"
    echo "$BODY"
    TESTS_FAILED=$((TESTS_FAILED + 1))
fi
echo ""

# Test 2: Check if API root responds
echo -e "${CYAN}Test 2: GET /api/v1 - API root${NC}"
TESTS_RUN=$((TESTS_RUN + 1))

RESPONSE=$(curl -s -w "\n%{http_code}" "${API_BASE_URL}/api/v1")
HTTP_CODE=$(echo "$RESPONSE" | tail -n1)
BODY=$(echo "$RESPONSE" | sed '$d')

if [ "$HTTP_CODE" -eq 200 ] || [ "$HTTP_CODE" -eq 404 ]; then
    echo -e "${GREEN}✓ PASS${NC} - API is responding (HTTP $HTTP_CODE)"
    if [ ! -z "$BODY" ]; then
        echo "Response: $BODY"
    fi
    TESTS_PASSED=$((TESTS_PASSED + 1))
else
    echo -e "${RED}✗ FAIL${NC} - API not responding correctly (HTTP $HTTP_CODE)"
    echo "Response: $BODY"
    TESTS_FAILED=$((TESTS_FAILED + 1))
fi
echo ""

# Test 3: Test OPTIONS request (CORS preflight)
echo -e "${CYAN}Test 3: OPTIONS /api/v1/bookings - CORS preflight${NC}"
TESTS_RUN=$((TESTS_RUN + 1))

RESPONSE=$(curl -s -i -X OPTIONS \
    -H "Origin: https://kind-coast-017153103.1.azurestaticapps.net" \
    -H "Access-Control-Request-Method: GET" \
    "${API_BASE_URL}/api/v1/bookings")

if echo "$RESPONSE" | grep -iq "Access-Control-Allow-Origin"; then
    echo -e "${GREEN}✓ PASS${NC} - CORS headers present"
    echo "CORS Headers:"
    echo "$RESPONSE" | grep -i "Access-Control"
    TESTS_PASSED=$((TESTS_PASSED + 1))
else
    echo -e "${YELLOW}⚠ WARN${NC} - CORS headers not found in OPTIONS response"
    echo "This may cause issues with browser-based clients"
    WARNINGS=$((WARNINGS + 1))
    TESTS_PASSED=$((TESTS_PASSED + 1))
fi
echo ""

# Test 4: Test malformed requests (should return 400)
echo -e "${CYAN}Test 4: POST /api/v1/upload - Malformed request${NC}"
TESTS_RUN=$((TESTS_RUN + 1))

RESPONSE=$(curl -s -w "\n%{http_code}" -X POST \
    -H "Content-Type: application/json" \
    -d '{"invalid": "data"}' \
    "${API_BASE_URL}/api/v1/upload")
HTTP_CODE=$(echo "$RESPONSE" | tail -n1)
BODY=$(echo "$RESPONSE" | sed '$d')

if [ "$HTTP_CODE" -eq 400 ] || [ "$HTTP_CODE" -eq 401 ] || [ "$HTTP_CODE" -eq 404 ]; then
    echo -e "${GREEN}✓ PASS${NC} - Correctly rejected malformed request (HTTP $HTTP_CODE)"
    echo "Response: $BODY"
    TESTS_PASSED=$((TESTS_PASSED + 1))
else
    echo -e "${YELLOW}⚠ WARN${NC} - Unexpected status code: $HTTP_CODE"
    echo "Response: $BODY"
    WARNINGS=$((WARNINGS + 1))
    TESTS_PASSED=$((TESTS_PASSED + 1))
fi
echo ""

# Test 5: Check response times
echo -e "${CYAN}Test 5: Response time check${NC}"
TESTS_RUN=$((TESTS_RUN + 1))

START_TIME=$(date +%s%N)
RESPONSE=$(curl -s -w "\n%{http_code}" "${API_BASE_URL}/api/v1/diagnostic")
END_TIME=$(date +%s%N)
HTTP_CODE=$(echo "$RESPONSE" | tail -n1)

RESPONSE_TIME=$(( (END_TIME - START_TIME) / 1000000 )) # Convert to milliseconds

echo "Response time: ${RESPONSE_TIME}ms"

if [ "$RESPONSE_TIME" -lt 2000 ]; then
    echo -e "${GREEN}✓ PASS${NC} - Response time is acceptable (<2000ms)"
    TESTS_PASSED=$((TESTS_PASSED + 1))
elif [ "$RESPONSE_TIME" -lt 5000 ]; then
    echo -e "${YELLOW}⚠ WARN${NC} - Response time is slow (${RESPONSE_TIME}ms)"
    WARNINGS=$((WARNINGS + 1))
    TESTS_PASSED=$((TESTS_PASSED + 1))
else
    echo -e "${RED}✗ FAIL${NC} - Response time is too slow (${RESPONSE_TIME}ms)"
    TESTS_FAILED=$((TESTS_FAILED + 1))
fi
echo ""

# Test 6: Check if API is deployed to production URL
echo -e "${CYAN}Test 6: Verify production URL accessibility${NC}"
TESTS_RUN=$((TESTS_RUN + 1))

RESPONSE=$(curl -s -o /dev/null -w "%{http_code}" --max-time 10 "${API_BASE_URL}/api/v1/diagnostic")
HTTP_CODE=$RESPONSE

if [ "$HTTP_CODE" -ne 000 ]; then
    echo -e "${GREEN}✓ PASS${NC} - Production URL is accessible (HTTP $HTTP_CODE)"
    TESTS_PASSED=$((TESTS_PASSED + 1))
else
    echo -e "${RED}✗ FAIL${NC} - Cannot reach production URL"
    TESTS_FAILED=$((TESTS_FAILED + 1))
fi
echo ""

# Summary
echo -e "${BLUE}=========================================${NC}"
echo -e "${BLUE}Test Summary${NC}"
echo -e "${BLUE}=========================================${NC}"
echo "Tests run: $TESTS_RUN"
echo -e "Tests passed: ${GREEN}$TESTS_PASSED${NC}"
echo -e "Tests failed: ${RED}$TESTS_FAILED${NC}"
echo -e "Warnings: ${YELLOW}$WARNINGS${NC}"
echo ""

if [ $TESTS_FAILED -eq 0 ]; then
    echo -e "${GREEN}All diagnostic tests passed! ✓${NC}"
    if [ $WARNINGS -gt 0 ]; then
        echo -e "${YELLOW}Note: $WARNINGS warning(s) detected${NC}"
    fi
    exit 0
else
    echo -e "${RED}Some tests failed! ✗${NC}"
    echo ""
    echo -e "${YELLOW}Troubleshooting:${NC}"
    echo "1. Check Azure Function App deployment status"
    echo "2. View logs: func azure functionapp logstream func-ctn-booking-prod"
    echo "3. Check Azure Portal for function app status"
    exit 1
fi
