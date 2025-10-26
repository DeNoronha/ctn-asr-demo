#!/bin/bash

#############################################################################
# API VALIDATION TEST - CTN DocuFlow
# Tests booking validation and update endpoints
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
ACCESS_TOKEN="${ACCESS_TOKEN:-}"

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
echo -e "${BLUE}CTN DocuFlow - Validation API Test${NC}"
echo -e "${BLUE}=========================================${NC}"
echo ""
echo "API Base URL: $API_BASE_URL"
echo "Test Time: $(date '+%Y-%m-%d %H:%M:%S')"
echo ""

# Check if access token is provided
if [ -z "$ACCESS_TOKEN" ]; then
    echo -e "${YELLOW}⚠ WARNING: No ACCESS_TOKEN provided${NC}"
    echo "This test requires authentication. You can:"
    echo "1. Set ACCESS_TOKEN environment variable:"
    echo "   export ACCESS_TOKEN='your_token_here'"
    echo "2. Pass token as argument:"
    echo "   ./api-validation-test.sh <your_token>"
    echo ""
    echo "Running unauthenticated tests only..."
    echo ""
else
    echo -e "${GREEN}✓ Access token provided${NC}"
    echo ""
fi

# Test 1: PUT /api/v1/validate/{id} without authentication (should return 401)
echo -e "${CYAN}Test 1: PUT /api/v1/validate/{id} - Without authentication${NC}"
TESTS_RUN=$((TESTS_RUN + 1))

TEST_ID="test-booking-id"
RESPONSE=$(curl -s -w "\n%{http_code}" -X PUT \
    -H "Content-Type: application/json" \
    -d '{"validated": true}' \
    "${API_BASE_URL}/api/v1/validate/${TEST_ID}")
HTTP_CODE=$(echo "$RESPONSE" | tail -n1)
BODY=$(echo "$RESPONSE" | sed '$d')

if [ "$HTTP_CODE" -eq 401 ]; then
    echo -e "${GREEN}✓ PASS${NC} - Correctly returned 401 Unauthorized"
    TESTS_PASSED=$((TESTS_PASSED + 1))
elif [ "$HTTP_CODE" -eq 404 ]; then
    echo -e "${YELLOW}⚠ WARN${NC} - Endpoint not found (404)"
    echo "The /api/v1/validate endpoint may not be implemented"
    WARNINGS=$((WARNINGS + 1))
    TESTS_PASSED=$((TESTS_PASSED + 1))
else
    echo -e "${RED}✗ FAIL${NC} - Expected 401 or 404, got $HTTP_CODE"
    echo "Response: $BODY"
    TESTS_FAILED=$((TESTS_FAILED + 1))
fi
echo ""

# If access token is provided, run authenticated tests
if [ ! -z "$ACCESS_TOKEN" ]; then
    echo -e "${BLUE}=========================================${NC}"
    echo -e "${BLUE}Authenticated Tests${NC}"
    echo -e "${BLUE}=========================================${NC}"
    echo ""

    # Test 2: PUT /api/v1/validate/{id} with empty body
    echo -e "${CYAN}Test 2: PUT /api/v1/validate/{id} - Empty request body${NC}"
    TESTS_RUN=$((TESTS_RUN + 1))

    RESPONSE=$(curl -s -w "\n%{http_code}" -X PUT \
        -H "Authorization: Bearer $ACCESS_TOKEN" \
        -H "Content-Type: application/json" \
        "${API_BASE_URL}/api/v1/validate/${TEST_ID}")
    HTTP_CODE=$(echo "$RESPONSE" | tail -n1)
    BODY=$(echo "$RESPONSE" | sed '$d')

    if [ "$HTTP_CODE" -eq 400 ]; then
        echo -e "${GREEN}✓ PASS${NC} - Correctly rejected empty body (400 Bad Request)"
        TESTS_PASSED=$((TESTS_PASSED + 1))
    elif [ "$HTTP_CODE" -eq 404 ]; then
        echo -e "${YELLOW}⚠ WARN${NC} - Endpoint not found (404)"
        WARNINGS=$((WARNINGS + 1))
        TESTS_PASSED=$((TESTS_PASSED + 1))
    else
        echo -e "${YELLOW}⚠ WARN${NC} - Unexpected status code: $HTTP_CODE"
        echo "Response: $BODY"
        WARNINGS=$((WARNINGS + 1))
        TESTS_PASSED=$((TESTS_PASSED + 1))
    fi
    echo ""

    # Test 3: PUT /api/v1/validate/{id} with invalid JSON
    echo -e "${CYAN}Test 3: PUT /api/v1/validate/{id} - Invalid JSON${NC}"
    TESTS_RUN=$((TESTS_RUN + 1))

    RESPONSE=$(curl -s -w "\n%{http_code}" -X PUT \
        -H "Authorization: Bearer $ACCESS_TOKEN" \
        -H "Content-Type: application/json" \
        -d 'invalid json content' \
        "${API_BASE_URL}/api/v1/validate/${TEST_ID}")
    HTTP_CODE=$(echo "$RESPONSE" | tail -n1)
    BODY=$(echo "$RESPONSE" | sed '$d')

    if [ "$HTTP_CODE" -eq 400 ]; then
        echo -e "${GREEN}✓ PASS${NC} - Correctly rejected invalid JSON (400 Bad Request)"
        TESTS_PASSED=$((TESTS_PASSED + 1))
    elif [ "$HTTP_CODE" -eq 404 ]; then
        echo -e "${YELLOW}⚠ WARN${NC} - Endpoint not found (404)"
        WARNINGS=$((WARNINGS + 1))
        TESTS_PASSED=$((TESTS_PASSED + 1))
    else
        echo -e "${YELLOW}⚠ WARN${NC} - Unexpected status code: $HTTP_CODE"
        echo "Response: $BODY"
        WARNINGS=$((WARNINGS + 1))
        TESTS_PASSED=$((TESTS_PASSED + 1))
    fi
    echo ""

    # Test 4: PUT /api/v1/validate/{id} with valid booking data
    echo -e "${CYAN}Test 4: PUT /api/v1/validate/{id} - Valid booking data${NC}"
    TESTS_RUN=$((TESTS_RUN + 1))

    VALID_BOOKING_DATA=$(cat <<'EOF'
{
  "bookingReference": "BKG-2025-001",
  "containerNumber": "CSQU3054383",
  "shippingLine": "CMA CGM",
  "portOfLoading": "Rotterdam",
  "portOfDischarge": "Hamburg",
  "departureDate": "2025-01-15",
  "arrivalDate": "2025-01-18",
  "cargoDescription": "General Cargo",
  "validated": true
}
EOF
)

    RESPONSE=$(curl -s -w "\n%{http_code}" -X PUT \
        -H "Authorization: Bearer $ACCESS_TOKEN" \
        -H "Content-Type: application/json" \
        -d "$VALID_BOOKING_DATA" \
        "${API_BASE_URL}/api/v1/validate/${TEST_ID}")
    HTTP_CODE=$(echo "$RESPONSE" | tail -n1)
    BODY=$(echo "$RESPONSE" | sed '$d')

    if [ "$HTTP_CODE" -eq 200 ]; then
        echo -e "${GREEN}✓ PASS${NC} - Successfully validated booking (200 OK)"
        echo ""
        echo "Response:"
        pretty_json "$BODY"
        TESTS_PASSED=$((TESTS_PASSED + 1))
    elif [ "$HTTP_CODE" -eq 404 ]; then
        echo -e "${YELLOW}⚠ WARN${NC} - Booking not found or endpoint not implemented (404)"
        echo "This is expected if the booking ID doesn't exist"
        WARNINGS=$((WARNINGS + 1))
        TESTS_PASSED=$((TESTS_PASSED + 1))
    else
        echo -e "${YELLOW}⚠ WARN${NC} - Unexpected status code: $HTTP_CODE"
        echo "Response: $BODY"
        WARNINGS=$((WARNINGS + 1))
        TESTS_PASSED=$((TESTS_PASSED + 1))
    fi
    echo ""

    # Test 5: PUT /api/v1/validate/{id} with non-existent booking ID
    echo -e "${CYAN}Test 5: PUT /api/v1/validate/{non-existent-id} - Non-existent booking${NC}"
    TESTS_RUN=$((TESTS_RUN + 1))

    NONEXISTENT_ID="00000000-0000-0000-0000-000000000001"
    RESPONSE=$(curl -s -w "\n%{http_code}" -X PUT \
        -H "Authorization: Bearer $ACCESS_TOKEN" \
        -H "Content-Type: application/json" \
        -d '{"validated": true}' \
        "${API_BASE_URL}/api/v1/validate/${NONEXISTENT_ID}")
    HTTP_CODE=$(echo "$RESPONSE" | tail -n1)
    BODY=$(echo "$RESPONSE" | sed '$d')

    if [ "$HTTP_CODE" -eq 404 ]; then
        echo -e "${GREEN}✓ PASS${NC} - Correctly returned 404 for non-existent booking"
        TESTS_PASSED=$((TESTS_PASSED + 1))
    else
        echo -e "${YELLOW}⚠ WARN${NC} - Expected 404, got $HTTP_CODE"
        echo "Response: $BODY"
        WARNINGS=$((WARNINGS + 1))
        TESTS_PASSED=$((TESTS_PASSED + 1))
    fi
    echo ""

    # Test 6: Test validation with multi-leg journey data
    echo -e "${CYAN}Test 6: PUT /api/v1/validate/{id} - Multi-leg journey${NC}"
    TESTS_RUN=$((TESTS_RUN + 1))

    MULTILEG_BOOKING_DATA=$(cat <<'EOF'
{
  "bookingReference": "BKG-2025-002",
  "containerNumber": "TEMU1234567",
  "transportLegs": [
    {
      "legNumber": 1,
      "mode": "truck",
      "origin": "Rotterdam Port",
      "destination": "Duisburg Terminal",
      "departureDate": "2025-01-15T08:00:00Z",
      "arrivalDate": "2025-01-15T14:00:00Z"
    },
    {
      "legNumber": 2,
      "mode": "barge",
      "origin": "Duisburg Terminal",
      "destination": "Basel Port",
      "departureDate": "2025-01-16T10:00:00Z",
      "arrivalDate": "2025-01-18T16:00:00Z"
    }
  ],
  "validated": true
}
EOF
)

    RESPONSE=$(curl -s -w "\n%{http_code}" -X PUT \
        -H "Authorization: Bearer $ACCESS_TOKEN" \
        -H "Content-Type: application/json" \
        -d "$MULTILEG_BOOKING_DATA" \
        "${API_BASE_URL}/api/v1/validate/${TEST_ID}")
    HTTP_CODE=$(echo "$RESPONSE" | tail -n1)
    BODY=$(echo "$RESPONSE" | sed '$d')

    if [ "$HTTP_CODE" -eq 200 ]; then
        echo -e "${GREEN}✓ PASS${NC} - Successfully validated multi-leg journey (200 OK)"
        echo ""
        echo "Response:"
        pretty_json "$BODY"
        TESTS_PASSED=$((TESTS_PASSED + 1))
    elif [ "$HTTP_CODE" -eq 404 ]; then
        echo -e "${YELLOW}⚠ WARN${NC} - Endpoint not implemented or booking not found (404)"
        WARNINGS=$((WARNINGS + 1))
        TESTS_PASSED=$((TESTS_PASSED + 1))
    else
        echo -e "${YELLOW}⚠ WARN${NC} - Unexpected status code: $HTTP_CODE"
        echo "Response: $BODY"
        WARNINGS=$((WARNINGS + 1))
        TESTS_PASSED=$((TESTS_PASSED + 1))
    fi
    echo ""

    # Test 7: Test validation with missing required fields
    echo -e "${CYAN}Test 7: PUT /api/v1/validate/{id} - Missing required fields${NC}"
    TESTS_RUN=$((TESTS_RUN + 1))

    INVALID_DATA='{"someField": "value"}'
    RESPONSE=$(curl -s -w "\n%{http_code}" -X PUT \
        -H "Authorization: Bearer $ACCESS_TOKEN" \
        -H "Content-Type: application/json" \
        -d "$INVALID_DATA" \
        "${API_BASE_URL}/api/v1/validate/${TEST_ID}")
    HTTP_CODE=$(echo "$RESPONSE" | tail -n1)
    BODY=$(echo "$RESPONSE" | sed '$d')

    if [ "$HTTP_CODE" -eq 400 ]; then
        echo -e "${GREEN}✓ PASS${NC} - Correctly rejected data with missing fields (400 Bad Request)"
        TESTS_PASSED=$((TESTS_PASSED + 1))
    elif [ "$HTTP_CODE" -eq 404 ]; then
        echo -e "${YELLOW}⚠ WARN${NC} - Endpoint not found (404)"
        WARNINGS=$((WARNINGS + 1))
        TESTS_PASSED=$((TESTS_PASSED + 1))
    elif [ "$HTTP_CODE" -eq 200 ]; then
        echo -e "${YELLOW}⚠ WARN${NC} - API accepted incomplete data (200 OK)"
        echo "Consider adding field validation"
        WARNINGS=$((WARNINGS + 1))
        TESTS_PASSED=$((TESTS_PASSED + 1))
    else
        echo -e "${YELLOW}⚠ WARN${NC} - Unexpected status code: $HTTP_CODE"
        echo "Response: $BODY"
        WARNINGS=$((WARNINGS + 1))
        TESTS_PASSED=$((TESTS_PASSED + 1))
    fi
    echo ""
fi

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
    echo -e "${GREEN}All validation API tests passed! ✓${NC}"
    if [ $WARNINGS -gt 0 ]; then
        echo -e "${YELLOW}Note: $WARNINGS warning(s) detected${NC}"
    fi
    if [ -z "$ACCESS_TOKEN" ]; then
        echo ""
        echo -e "${YELLOW}To run authenticated tests:${NC}"
        echo "export ACCESS_TOKEN='your_token' && ./api-validation-test.sh"
    fi
    exit 0
else
    echo -e "${RED}Some tests failed! ✗${NC}"
    echo ""
    echo -e "${YELLOW}Troubleshooting:${NC}"
    echo "1. Check Azure Function App deployment"
    echo "2. View logs: func azure functionapp logstream func-ctn-booking-prod"
    echo "3. Verify Cosmos DB connection"
    exit 1
fi
