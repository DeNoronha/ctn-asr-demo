#!/bin/bash

#############################################################################
# AUTH WITH TOKEN TEST - Booking Portal API
# Tests API endpoints with a valid Azure AD JWT token
# Usage: ./auth-with-token-test.sh <ACCESS_TOKEN>
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
ACCESS_TOKEN="$1"

# Test counters
TESTS_RUN=0
TESTS_PASSED=0
TESTS_FAILED=0

echo -e "${BLUE}=================================================${NC}"
echo -e "${BLUE}Booking Portal API - Token Authentication Test${NC}"
echo -e "${BLUE}=================================================${NC}"
echo ""

if [ -z "$ACCESS_TOKEN" ]; then
    echo -e "${RED}ERROR: Access token not provided${NC}"
    echo ""
    echo "Usage: $0 <ACCESS_TOKEN>"
    echo ""
    echo -e "${YELLOW}How to get a token:${NC}"
    echo "1. Log in to the frontend: https://kind-coast-017153103.1.azurestaticapps.net"
    echo "2. Open browser console (F12)"
    echo "3. Look for the log message: '[Auth] Token claims:'"
    echo "4. Copy the token from the previous log line"
    echo ""
    echo "Or use the token inspector script:"
    echo "  ./inspect-token.sh"
    exit 1
fi

echo "API Base URL: $API_BASE_URL"
echo ""

# Decode and display token information
echo -e "${CYAN}Token Information:${NC}"
echo "Token length: ${#ACCESS_TOKEN} characters"

# Decode JWT token (just the payload, no verification)
if command -v jq &> /dev/null; then
    TOKEN_PARTS=($(echo "$ACCESS_TOKEN" | tr '.' ' '))
    if [ ${#TOKEN_PARTS[@]} -eq 3 ]; then
        HEADER=$(echo "${TOKEN_PARTS[0]}" | base64 -d 2>/dev/null | jq -r . 2>/dev/null)
        PAYLOAD=$(echo "${TOKEN_PARTS[1]}" | base64 -d 2>/dev/null | jq -r . 2>/dev/null)

        if [ -n "$PAYLOAD" ]; then
            echo -e "${CYAN}Token Claims:${NC}"
            echo "$PAYLOAD" | jq .
            echo ""

            # Extract key claims
            AUD=$(echo "$PAYLOAD" | jq -r '.aud')
            ISS=$(echo "$PAYLOAD" | jq -r '.iss')
            EXP=$(echo "$PAYLOAD" | jq -r '.exp')
            ROLES=$(echo "$PAYLOAD" | jq -r '.roles[]?' 2>/dev/null | tr '\n' ', ' | sed 's/,$//')

            echo -e "${CYAN}Key Claims:${NC}"
            echo "Audience (aud): $AUD"
            echo "Issuer (iss): $ISS"
            echo "Expiration (exp): $EXP ($(date -r "$EXP" 2>/dev/null || echo 'invalid'))"
            echo "Roles: ${ROLES:-No roles found}"
            echo ""

            # Check if token is expired
            CURRENT_TIME=$(date +%s)
            if [ "$EXP" -lt "$CURRENT_TIME" ]; then
                echo -e "${RED}WARNING: Token is EXPIRED!${NC}"
                echo "Current time: $(date -r "$CURRENT_TIME")"
                echo "Token expired: $(date -r "$EXP" 2>/dev/null)"
                echo ""
            fi

            # Check audience
            EXPECTED_AUD="api://d3037c11-a541-4f21-8862-8079137a0cde/access_as_user"
            if [ "$AUD" != "$EXPECTED_AUD" ]; then
                echo -e "${YELLOW}WARNING: Token audience does not match expected value${NC}"
                echo "Expected: $EXPECTED_AUD"
                echo "Actual: $AUD"
                echo ""
            fi
        fi
    fi
else
    echo "Install 'jq' for detailed token inspection"
    echo ""
fi

# Test 1: GET /api/v1/tenants with valid token
echo -e "${YELLOW}Test 1: GET /api/v1/tenants with authentication${NC}"
TESTS_RUN=$((TESTS_RUN + 1))

RESPONSE=$(curl -s -w "\n%{http_code}" \
    -H "Authorization: Bearer $ACCESS_TOKEN" \
    -H "Content-Type: application/json" \
    "${API_BASE_URL}/api/v1/tenants")
HTTP_CODE=$(echo "$RESPONSE" | tail -n1)
BODY=$(echo "$RESPONSE" | head -n-1)

if [ "$HTTP_CODE" -eq 200 ]; then
    echo -e "${GREEN}✓ PASS${NC} - Successfully authenticated (HTTP 200)"
    echo "Response: $BODY" | head -c 200
    echo "..."
    TESTS_PASSED=$((TESTS_PASSED + 1))
elif [ "$HTTP_CODE" -eq 401 ]; then
    echo -e "${RED}✗ FAIL${NC} - Still getting 401 Unauthorized"
    echo "Response body: $BODY"
    echo ""
    echo -e "${YELLOW}Possible issues:${NC}"
    echo "1. Token expired or invalid"
    echo "2. Token audience mismatch"
    echo "3. Token issuer not recognized by API"
    echo "4. API JWT validation configuration error"
    TESTS_FAILED=$((TESTS_FAILED + 1))
else
    echo -e "${YELLOW}⚠ UNEXPECTED${NC} - Got HTTP $HTTP_CODE (expected 200 or 401)"
    echo "Response body: $BODY"
    TESTS_FAILED=$((TESTS_FAILED + 1))
fi
echo ""

# Test 2: GET /api/v1/bookings with valid token
echo -e "${YELLOW}Test 2: GET /api/v1/bookings with authentication${NC}"
TESTS_RUN=$((TESTS_RUN + 1))

RESPONSE=$(curl -s -w "\n%{http_code}" \
    -H "Authorization: Bearer $ACCESS_TOKEN" \
    -H "Content-Type: application/json" \
    "${API_BASE_URL}/api/v1/bookings")
HTTP_CODE=$(echo "$RESPONSE" | tail -n1)
BODY=$(echo "$RESPONSE" | head -n-1)

if [ "$HTTP_CODE" -eq 200 ]; then
    echo -e "${GREEN}✓ PASS${NC} - Successfully authenticated (HTTP 200)"
    echo "Response: $BODY" | head -c 200
    echo "..."
    TESTS_PASSED=$((TESTS_PASSED + 1))
elif [ "$HTTP_CODE" -eq 401 ]; then
    echo -e "${RED}✗ FAIL${NC} - Still getting 401 Unauthorized"
    echo "Response body: $BODY"
    TESTS_FAILED=$((TESTS_FAILED + 1))
else
    echo -e "${YELLOW}⚠ UNEXPECTED${NC} - Got HTTP $HTTP_CODE"
    echo "Response body: $BODY"
    if [ "$HTTP_CODE" -eq 404 ]; then
        echo -e "${CYAN}Note: 404 may indicate the endpoint doesn't exist, but auth passed${NC}"
    fi
    TESTS_FAILED=$((TESTS_FAILED + 1))
fi
echo ""

# Test 3: POST /api/v1/bookings/upload with valid token (no file, just check auth)
echo -e "${YELLOW}Test 3: POST /api/v1/bookings/upload with authentication${NC}"
TESTS_RUN=$((TESTS_RUN + 1))

RESPONSE=$(curl -s -w "\n%{http_code}" \
    -X POST \
    -H "Authorization: Bearer $ACCESS_TOKEN" \
    -H "Content-Type: application/pdf" \
    "${API_BASE_URL}/api/v1/bookings/upload")
HTTP_CODE=$(echo "$RESPONSE" | tail -n1)
BODY=$(echo "$RESPONSE" | head -n-1)

if [ "$HTTP_CODE" -eq 400 ]; then
    echo -e "${GREEN}✓ PASS${NC} - Authentication successful (HTTP 400 = missing file, but auth passed)"
    echo "Response body: $BODY"
    TESTS_PASSED=$((TESTS_PASSED + 1))
elif [ "$HTTP_CODE" -eq 200 ] || [ "$HTTP_CODE" -eq 202 ]; then
    echo -e "${GREEN}✓ PASS${NC} - Authentication successful (HTTP $HTTP_CODE)"
    echo "Response body: $BODY"
    TESTS_PASSED=$((TESTS_PASSED + 1))
elif [ "$HTTP_CODE" -eq 401 ]; then
    echo -e "${RED}✗ FAIL${NC} - Still getting 401 Unauthorized"
    echo "Response body: $BODY"
    TESTS_FAILED=$((TESTS_FAILED + 1))
else
    echo -e "${YELLOW}⚠ UNEXPECTED${NC} - Got HTTP $HTTP_CODE"
    echo "Response body: $BODY"
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
    echo "Authentication is working correctly with this token."
    exit 0
elif [ $TESTS_PASSED -eq 0 ]; then
    echo -e "${RED}All tests failed! ✗${NC}"
    echo ""
    echo -e "${YELLOW}Debugging Steps:${NC}"
    echo "1. Check if token is expired (see token info above)"
    echo "2. Verify token audience matches: api://d3037c11-a541-4f21-8862-8079137a0cde/access_as_user"
    echo "3. Check API logs: func azure functionapp logstream func-ctn-booking-prod"
    echo "4. Verify Azure AD app registration settings"
    exit 1
else
    echo -e "${YELLOW}Mixed results! ⚠${NC}"
    echo "Some endpoints authenticated successfully, others failed."
    echo "Check the individual test results above for details."
    exit 1
fi
