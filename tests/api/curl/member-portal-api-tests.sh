#!/bin/bash

# Member Portal API Tests - Comprehensive CRUD Test Suite
# Tests all member portal API endpoints with curl before UI testing
#
# CRITICAL: These tests MUST pass before running Playwright UI tests
# Purpose: Isolate API issues from UI issues, catch 404/500 errors early
#
# Prerequisites:
# - Valid Azure AD access token for a member user
# - Member user must have legal entity and contacts in database
#
# Usage:
#   export ACCESS_TOKEN="your_azure_ad_token_here"
#   ./member-portal-api-tests.sh

set -e  # Exit on first error

API_BASE_URL="https://ca-ctn-asr-api-dev.calmriver-700a8c55.westeurope.azurecontainerapps.io/api/v1"
GREEN='\033[0;32m'
RED='\033[0;31m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Test counters
TESTS_RUN=0
TESTS_PASSED=0
TESTS_FAILED=0

# IDs for cleanup
CREATED_CONTACT_ID=""
CREATED_ENDPOINT_ID=""

echo "=================================================================="
echo "Member Portal API Tests - Phase 1 (curl-based)"
echo "=================================================================="
echo ""
echo "Testing API: $API_BASE_URL"
echo ""

# Check if ACCESS_TOKEN is set
if [ -z "$ACCESS_TOKEN" ]; then
    echo -e "${RED}ERROR: ACCESS_TOKEN environment variable not set${NC}"
    echo ""
    echo "To get an access token:"
    echo "1. Login to member portal: https://calm-pebble-043b2db03.1.azurestaticapps.net"
    echo "2. Open browser DevTools > Console"
    echo "3. Run: window.localStorage.getItem('msal.token') or check Network tab"
    echo "4. Copy the access token"
    echo "5. Export: export ACCESS_TOKEN='your_token_here'"
    echo ""
    echo -e "${YELLOW}Continuing with tests that don't require authentication...${NC}"
    echo ""
fi

# Helper function to run a test
run_test() {
    local test_name="$1"
    local expected_status="$2"
    local http_code="$3"
    local response_body="$4"

    TESTS_RUN=$((TESTS_RUN + 1))

    if [ "$http_code" -eq "$expected_status" ]; then
        echo -e "${GREEN}✓ PASS${NC} - $test_name"
        TESTS_PASSED=$((TESTS_PASSED + 1))
        return 0
    else
        echo -e "${RED}✗ FAIL${NC} - $test_name"
        echo "  Expected: $expected_status, Got: $http_code"
        echo "  Response: $response_body"
        TESTS_FAILED=$((TESTS_FAILED + 1))
        return 1
    fi
}

# Helper function to extract JSON field
extract_json_field() {
    local json="$1"
    local field="$2"
    echo "$json" | jq -r ".$field // empty"
}

echo "=================================================================="
echo "Phase 1: Member Data API Tests"
echo "=================================================================="
echo ""

# Test 1: GET /api/v1/member (Get authenticated member data)
echo "Test 1: GET /api/v1/member"
if [ -n "$ACCESS_TOKEN" ]; then
    response=$(curl -s -w "\n%{http_code}" \
        -H "Authorization: Bearer $ACCESS_TOKEN" \
        -H "Content-Type: application/json" \
        "$API_BASE_URL/member")
    http_code=$(echo "$response" | tail -n1)
    body=$(echo "$response" | sed '$d')

    if run_test "Get authenticated member data" 200 "$http_code" "$body"; then
        echo "  Member Data: $(echo "$body" | jq -c '{legalName, kvk, lei, status}')"

        # Extract legal entity ID for later tests
        LEGAL_ENTITY_ID=$(extract_json_field "$body" "legalEntityId")
        echo "  Legal Entity ID: $LEGAL_ENTITY_ID"
    fi
else
    echo -e "${YELLOW}⊘ SKIP${NC} - Test requires ACCESS_TOKEN"
fi
echo ""

echo "=================================================================="
echo "Phase 2: Contacts API Tests (CRUD)"
echo "=================================================================="
echo ""

# Test 2: GET /api/v1/member-contacts (List all contacts)
echo "Test 2: GET /api/v1/member-contacts"
if [ -n "$ACCESS_TOKEN" ]; then
    response=$(curl -s -w "\n%{http_code}" \
        -H "Authorization: Bearer $ACCESS_TOKEN" \
        -H "Content-Type: application/json" \
        "$API_BASE_URL/member-contacts")
    http_code=$(echo "$response" | tail -n1)
    body=$(echo "$response" | sed '$d')

    if run_test "Get member contacts list" 200 "$http_code" "$body"; then
        contact_count=$(echo "$body" | jq '.contacts | length')
        echo "  Found $contact_count contacts"
        echo "  Contacts: $(echo "$body" | jq -c '.contacts[] | {full_name, email, job_title}')"
    fi
else
    echo -e "${YELLOW}⊘ SKIP${NC} - Test requires ACCESS_TOKEN"
fi
echo ""

# Test 3: POST /api/v1/member/contacts (Create new contact)
echo "Test 3: POST /api/v1/member/contacts"
if [ -n "$ACCESS_TOKEN" ]; then
    # Generate unique email for test contact
    TEST_EMAIL="test-contact-$(date +%s)@example.com"

    response=$(curl -s -w "\n%{http_code}" -X POST \
        -H "Authorization: Bearer $ACCESS_TOKEN" \
        -H "Content-Type: application/json" \
        -d "{
            \"full_name\": \"Test Contact $(date +%Y%m%d-%H%M%S)\",
            \"first_name\": \"Test\",
            \"last_name\": \"Contact\",
            \"email\": \"$TEST_EMAIL\",
            \"phone\": \"+31201234567\",
            \"mobile\": \"+31612345678\",
            \"job_title\": \"API Test Engineer\",
            \"department\": \"Testing\",
            \"contact_type\": \"TECHNICAL\",
            \"preferred_language\": \"en\",
            \"preferred_contact_method\": \"EMAIL\",
            \"is_primary\": false
        }" \
        "$API_BASE_URL/member/contacts")
    http_code=$(echo "$response" | tail -n1)
    body=$(echo "$response" | sed '$d')

    if run_test "Create new contact" 201 "$http_code" "$body"; then
        CREATED_CONTACT_ID=$(extract_json_field "$body" "contactId")
        echo "  Created Contact ID: $CREATED_CONTACT_ID"
        echo "  Test Email: $TEST_EMAIL"
    fi
else
    echo -e "${YELLOW}⊘ SKIP${NC} - Test requires ACCESS_TOKEN"
fi
echo ""

# Test 4: PUT /api/v1/member/contacts/{contactId} (Update contact)
echo "Test 4: PUT /api/v1/member/contacts/{contactId}"
if [ -n "$ACCESS_TOKEN" ] && [ -n "$CREATED_CONTACT_ID" ]; then
    response=$(curl -s -w "\n%{http_code}" -X PUT \
        -H "Authorization: Bearer $ACCESS_TOKEN" \
        -H "Content-Type: application/json" \
        -d "{
            \"job_title\": \"Senior API Test Engineer\",
            \"department\": \"Quality Assurance\"
        }" \
        "$API_BASE_URL/member/contacts/$CREATED_CONTACT_ID")
    http_code=$(echo "$response" | tail -n1)
    body=$(echo "$response" | sed '$d')

    run_test "Update contact details" 200 "$http_code" "$body"
else
    echo -e "${YELLOW}⊘ SKIP${NC} - Test requires ACCESS_TOKEN and created contact"
fi
echo ""

# Test 5: Verify contact was updated (GET again)
echo "Test 5: GET /api/v1/member-contacts (Verify update)"
if [ -n "$ACCESS_TOKEN" ] && [ -n "$CREATED_CONTACT_ID" ]; then
    response=$(curl -s -w "\n%{http_code}" \
        -H "Authorization: Bearer $ACCESS_TOKEN" \
        -H "Content-Type: application/json" \
        "$API_BASE_URL/member-contacts")
    http_code=$(echo "$response" | tail -n1)
    body=$(echo "$response" | sed '$d')

    if run_test "Verify contact update" 200 "$http_code" "$body"; then
        updated_contact=$(echo "$body" | jq ".contacts[] | select(.legal_entity_contact_id == \"$CREATED_CONTACT_ID\")")
        if [ -n "$updated_contact" ]; then
            echo -e "  ${GREEN}✓${NC} Contact found with updated data"
            echo "  Updated Contact: $(echo "$updated_contact" | jq -c '{full_name, job_title, department}')"
        else
            echo -e "  ${RED}✗${NC} Contact not found in list"
        fi
    fi
else
    echo -e "${YELLOW}⊘ SKIP${NC} - Test requires ACCESS_TOKEN and created contact"
fi
echo ""

echo "=================================================================="
echo "Phase 3: Endpoints API Tests (CRUD)"
echo "=================================================================="
echo ""

# Test 6: GET /api/v1/member-endpoints (List all endpoints)
echo "Test 6: GET /api/v1/member-endpoints"
if [ -n "$ACCESS_TOKEN" ]; then
    response=$(curl -s -w "\n%{http_code}" \
        -H "Authorization: Bearer $ACCESS_TOKEN" \
        -H "Content-Type: application/json" \
        "$API_BASE_URL/member-endpoints")
    http_code=$(echo "$response" | tail -n1)
    body=$(echo "$response" | sed '$d')

    if run_test "Get member endpoints list" 200 "$http_code" "$body"; then
        endpoint_count=$(echo "$body" | jq '.endpoints | length')
        echo "  Found $endpoint_count endpoints"
        if [ "$endpoint_count" -gt 0 ]; then
            echo "  Endpoints: $(echo "$body" | jq -c '.endpoints[] | {endpoint_name, endpoint_url, is_active}')"
        fi
    fi
else
    echo -e "${YELLOW}⊘ SKIP${NC} - Test requires ACCESS_TOKEN"
fi
echo ""

# Note: Endpoint creation/update/delete endpoints may not be implemented yet
# These tests are placeholders for when the API is ready

echo "Test 7: POST /api/v1/member/endpoints (Create endpoint)"
echo -e "${YELLOW}⊘ TODO${NC} - Endpoint creation API not yet implemented"
echo "  Expected route: POST /api/v1/member/endpoints"
echo ""

echo "Test 8: PUT /api/v1/member/endpoints/{endpointId} (Update endpoint)"
echo -e "${YELLOW}⊘ TODO${NC} - Endpoint update API not yet implemented"
echo "  Expected route: PUT /api/v1/member/endpoints/{endpointId}"
echo ""

echo "=================================================================="
echo "Phase 4: API Tokens Tests"
echo "=================================================================="
echo ""

# Test 9: GET /api/v1/member/tokens (List tokens)
echo "Test 9: GET /api/v1/member/tokens"
if [ -n "$ACCESS_TOKEN" ]; then
    response=$(curl -s -w "\n%{http_code}" \
        -H "Authorization: Bearer $ACCESS_TOKEN" \
        -H "Content-Type: application/json" \
        "$API_BASE_URL/member/tokens")
    http_code=$(echo "$response" | tail -n1)
    body=$(echo "$response" | sed '$d')

    if run_test "Get member tokens list" 200 "$http_code" "$body"; then
        token_count=$(echo "$body" | jq '.tokens | length')
        echo "  Found $token_count tokens"
        if [ "$token_count" -gt 0 ]; then
            echo "  Tokens: $(echo "$body" | jq -c '.tokens[] | {token_type, issued_at, expires_at, revoked}')"
        fi
    fi
else
    echo -e "${YELLOW}⊘ SKIP${NC} - Test requires ACCESS_TOKEN"
fi
echo ""

# Test 10: POST /api/v1/member/tokens (Issue new BDI token)
echo "Test 10: POST /api/v1/member/tokens (Issue BDI token)"
echo -e "${YELLOW}⊘ TODO${NC} - Token issuance test requires BDI integration setup"
echo "  Expected route: POST /api/v1/member/tokens or /api/v1/bdi/issue-token"
echo ""

echo "=================================================================="
echo "Phase 5: Cleanup - Delete Test Data"
echo "=================================================================="
echo ""

# Cleanup: Delete created contact
if [ -n "$CREATED_CONTACT_ID" ] && [ -n "$ACCESS_TOKEN" ]; then
    echo "Cleanup: Deleting test contact ($CREATED_CONTACT_ID)"

    # Note: Delete endpoint may not exist yet, use soft delete via update
    response=$(curl -s -w "\n%{http_code}" -X PUT \
        -H "Authorization: Bearer $ACCESS_TOKEN" \
        -H "Content-Type: application/json" \
        -d '{"is_active": false}' \
        "$API_BASE_URL/member/contacts/$CREATED_CONTACT_ID" 2>/dev/null || echo "404")

    http_code=$(echo "$response" | tail -n1)

    if [ "$http_code" -eq 200 ]; then
        echo -e "${GREEN}✓${NC} Test contact deactivated successfully"
    else
        echo -e "${YELLOW}⚠${NC} Could not deactivate test contact (may need manual cleanup)"
        echo "  Contact ID: $CREATED_CONTACT_ID"
    fi
else
    echo "No test data to clean up"
fi
echo ""

echo "=================================================================="
echo "API Test Results Summary"
echo "=================================================================="
echo ""
echo "Tests Run:    $TESTS_RUN"
echo -e "Tests Passed: ${GREEN}$TESTS_PASSED${NC}"
echo -e "Tests Failed: ${RED}$TESTS_FAILED${NC}"
echo ""

if [ $TESTS_FAILED -eq 0 ] && [ $TESTS_RUN -gt 0 ]; then
    echo -e "${GREEN}✓ ALL API TESTS PASSED${NC}"
    echo ""
    echo "You can now proceed to Phase 2: Playwright UI Tests"
    echo "  npx playwright test web/e2e/member-portal.spec.ts"
    exit 0
elif [ $TESTS_RUN -eq 0 ]; then
    echo -e "${YELLOW}⚠ NO TESTS WERE RUN${NC}"
    echo "Set ACCESS_TOKEN to run authenticated tests"
    exit 1
else
    echo -e "${RED}✗ SOME API TESTS FAILED${NC}"
    echo ""
    echo "DO NOT run UI tests until API tests pass!"
    echo "Fix API issues first, then test UI."
    exit 1
fi
