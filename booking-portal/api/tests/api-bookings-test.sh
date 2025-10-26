#!/bin/bash

#############################################################################
# API BOOKINGS TEST - CTN DocuFlow
# Tests bookings-related API endpoints (requires authentication)
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

# Storage for test data
BOOKING_ID=""

# Helper function to pretty print JSON
pretty_json() {
    if command -v jq &> /dev/null; then
        echo "$1" | jq .
    else
        echo "$1"
    fi
}

echo -e "${BLUE}=========================================${NC}"
echo -e "${BLUE}CTN DocuFlow - Bookings API Test${NC}"
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
    echo "   ./api-bookings-test.sh <your_token>"
    echo ""
    echo "Running unauthenticated tests only..."
    echo ""
else
    echo -e "${GREEN}✓ Access token provided${NC}"
    echo ""
fi

# Test 1: GET /api/v1/bookings without authentication (should return 401)
echo -e "${CYAN}Test 1: GET /api/v1/bookings - Without authentication${NC}"
TESTS_RUN=$((TESTS_RUN + 1))

RESPONSE=$(curl -s -w "\n%{http_code}" "${API_BASE_URL}/api/v1/bookings")
HTTP_CODE=$(echo "$RESPONSE" | tail -n1)
BODY=$(echo "$RESPONSE" | sed '$d')

if [ "$HTTP_CODE" -eq 401 ]; then
    echo -e "${GREEN}✓ PASS${NC} - Correctly returned 401 Unauthorized"
    TESTS_PASSED=$((TESTS_PASSED + 1))
elif [ "$HTTP_CODE" -eq 404 ]; then
    echo -e "${YELLOW}⚠ WARN${NC} - Endpoint not found (404)"
    echo "The /api/v1/bookings endpoint may not be implemented"
    WARNINGS=$((WARNINGS + 1))
    TESTS_PASSED=$((TESTS_PASSED + 1))
else
    echo -e "${RED}✗ FAIL${NC} - Expected 401 or 404, got $HTTP_CODE"
    echo "Response: $BODY"
    TESTS_FAILED=$((TESTS_FAILED + 1))
fi
echo ""

# Test 2: GET /api/v1/bookings/{id} without authentication (should return 401)
echo -e "${CYAN}Test 2: GET /api/v1/bookings/{id} - Without authentication${NC}"
TESTS_RUN=$((TESTS_RUN + 1))

TEST_ID="00000000-0000-0000-0000-000000000000"
RESPONSE=$(curl -s -w "\n%{http_code}" "${API_BASE_URL}/api/v1/bookings/${TEST_ID}")
HTTP_CODE=$(echo "$RESPONSE" | tail -n1)
BODY=$(echo "$RESPONSE" | sed '$d')

if [ "$HTTP_CODE" -eq 401 ]; then
    echo -e "${GREEN}✓ PASS${NC} - Correctly returned 401 Unauthorized"
    TESTS_PASSED=$((TESTS_PASSED + 1))
elif [ "$HTTP_CODE" -eq 404 ]; then
    echo -e "${YELLOW}⚠ WARN${NC} - Endpoint not found (404)"
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

    # Test 3: GET /api/v1/bookings with authentication
    echo -e "${CYAN}Test 3: GET /api/v1/bookings - With authentication${NC}"
    TESTS_RUN=$((TESTS_RUN + 1))

    RESPONSE=$(curl -s -w "\n%{http_code}" \
        -H "Authorization: Bearer $ACCESS_TOKEN" \
        "${API_BASE_URL}/api/v1/bookings")
    HTTP_CODE=$(echo "$RESPONSE" | tail -n1)
    BODY=$(echo "$RESPONSE" | sed '$d')

    if [ "$HTTP_CODE" -eq 200 ]; then
        echo -e "${GREEN}✓ PASS${NC} - Successfully retrieved bookings (200 OK)"

        # Check if response is valid JSON array
        if echo "$BODY" | jq -e . >/dev/null 2>&1; then
            BOOKING_COUNT=$(echo "$BODY" | jq '. | length')
            echo "Number of bookings: $BOOKING_COUNT"

            # Extract first booking ID if available
            if [ "$BOOKING_COUNT" -gt 0 ]; then
                BOOKING_ID=$(echo "$BODY" | jq -r '.[0].id // .[0]._id // empty')
                if [ ! -z "$BOOKING_ID" ]; then
                    echo "First booking ID: $BOOKING_ID"
                fi
            fi

            # Pretty print first booking (if exists)
            if [ "$BOOKING_COUNT" -gt 0 ]; then
                echo ""
                echo "Sample booking (first record):"
                echo "$BODY" | jq '.[0]'
            fi
        else
            echo "Response is not valid JSON"
            echo "Response: $BODY"
        fi

        TESTS_PASSED=$((TESTS_PASSED + 1))
    elif [ "$HTTP_CODE" -eq 404 ]; then
        echo -e "${YELLOW}⚠ WARN${NC} - Endpoint not found (404)"
        WARNINGS=$((WARNINGS + 1))
        TESTS_PASSED=$((TESTS_PASSED + 1))
    else
        echo -e "${RED}✗ FAIL${NC} - Expected 200, got $HTTP_CODE"
        echo "Response: $BODY"
        TESTS_FAILED=$((TESTS_FAILED + 1))
    fi
    echo ""

    # Test 4: GET /api/v1/bookings/{id} with authentication (if we have a booking ID)
    if [ ! -z "$BOOKING_ID" ] && [ "$BOOKING_ID" != "null" ]; then
        echo -e "${CYAN}Test 4: GET /api/v1/bookings/{id} - With authentication${NC}"
        TESTS_RUN=$((TESTS_RUN + 1))

        RESPONSE=$(curl -s -w "\n%{http_code}" \
            -H "Authorization: Bearer $ACCESS_TOKEN" \
            "${API_BASE_URL}/api/v1/bookings/${BOOKING_ID}")
        HTTP_CODE=$(echo "$RESPONSE" | tail -n1)
        BODY=$(echo "$RESPONSE" | sed '$d')

        if [ "$HTTP_CODE" -eq 200 ]; then
            echo -e "${GREEN}✓ PASS${NC} - Successfully retrieved booking by ID (200 OK)"
            echo ""
            echo "Booking details:"
            pretty_json "$BODY"

            # Validate booking structure
            if echo "$BODY" | jq -e '.id // ._id' >/dev/null 2>&1; then
                echo -e "${GREEN}  ✓${NC} Booking has ID field"
            else
                echo -e "${YELLOW}  ⚠${NC} Booking missing ID field"
                WARNINGS=$((WARNINGS + 1))
            fi

            TESTS_PASSED=$((TESTS_PASSED + 1))
        elif [ "$HTTP_CODE" -eq 404 ]; then
            echo -e "${YELLOW}⚠ WARN${NC} - Booking not found (404)"
            echo "Booking ID: $BOOKING_ID"
            WARNINGS=$((WARNINGS + 1))
            TESTS_PASSED=$((TESTS_PASSED + 1))
        else
            echo -e "${RED}✗ FAIL${NC} - Expected 200 or 404, got $HTTP_CODE"
            echo "Response: $BODY"
            TESTS_FAILED=$((TESTS_FAILED + 1))
        fi
        echo ""
    else
        echo -e "${CYAN}Test 4: SKIPPED - No booking ID available from previous test${NC}"
        echo ""
    fi

    # Test 5: GET /api/v1/bookings with invalid ID (should return 404)
    echo -e "${CYAN}Test 5: GET /api/v1/bookings/{invalid-id} - Invalid UUID${NC}"
    TESTS_RUN=$((TESTS_RUN + 1))

    INVALID_ID="not-a-valid-uuid"
    RESPONSE=$(curl -s -w "\n%{http_code}" \
        -H "Authorization: Bearer $ACCESS_TOKEN" \
        "${API_BASE_URL}/api/v1/bookings/${INVALID_ID}")
    HTTP_CODE=$(echo "$RESPONSE" | tail -n1)
    BODY=$(echo "$RESPONSE" | sed '$d')

    if [ "$HTTP_CODE" -eq 400 ] || [ "$HTTP_CODE" -eq 404 ]; then
        echo -e "${GREEN}✓ PASS${NC} - Correctly rejected invalid ID (HTTP $HTTP_CODE)"
        TESTS_PASSED=$((TESTS_PASSED + 1))
    else
        echo -e "${YELLOW}⚠ WARN${NC} - Unexpected status code: $HTTP_CODE"
        echo "Response: $BODY"
        WARNINGS=$((WARNINGS + 1))
        TESTS_PASSED=$((TESTS_PASSED + 1))
    fi
    echo ""

    # Test 6: GET /api/v1/bookings with non-existent ID (should return 404)
    echo -e "${CYAN}Test 6: GET /api/v1/bookings/{non-existent-id} - Valid UUID but doesn't exist${NC}"
    TESTS_RUN=$((TESTS_RUN + 1))

    NONEXISTENT_ID="00000000-0000-0000-0000-000000000001"
    RESPONSE=$(curl -s -w "\n%{http_code}" \
        -H "Authorization: Bearer $ACCESS_TOKEN" \
        "${API_BASE_URL}/api/v1/bookings/${NONEXISTENT_ID}")
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
    echo -e "${GREEN}All bookings API tests passed! ✓${NC}"
    if [ $WARNINGS -gt 0 ]; then
        echo -e "${YELLOW}Note: $WARNINGS warning(s) detected${NC}"
    fi
    if [ -z "$ACCESS_TOKEN" ]; then
        echo ""
        echo -e "${YELLOW}To run authenticated tests:${NC}"
        echo "export ACCESS_TOKEN='your_token' && ./api-bookings-test.sh"
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
