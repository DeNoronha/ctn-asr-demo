#!/bin/bash
# =============================================================================
# Member Registration API Test (Without Document Upload)
# =============================================================================
# Tests the member registration and approval workflow via API endpoints
# Note: Document upload is handled via UI and will be tested with Playwright
# =============================================================================

set -e

# Colors
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m'

# Configuration
API_BASE_URL="https://ca-ctn-asr-api-dev.calmriver-700a8c55.westeurope.azurecontainerapps.io/api/v1"
TIMESTAMP=$(date +%s)
TEST_EMAIL="test-member-${TIMESTAMP}@example.com"
TEST_KVK=$(printf "%08d" $(echo $TIMESTAMP | tail -c 8 | sed 's/^0*//'))  # Generate 8-digit KvK number
TEST_COMPANY="Test Company B.V. ${TIMESTAMP}"

echo ""
echo "========================================================================"
echo "  Member Registration API Test"
echo "========================================================================"
echo "  API: $API_BASE_URL"
echo "  Email: $TEST_EMAIL"
echo "  KvK: $TEST_KVK"
echo "  Company: $TEST_COMPANY"
echo "========================================================================"
echo ""

# =============================================================================
# STEP 1: Register Member (Public Endpoint)
# =============================================================================
echo -e "${BLUE}[1/4] Submitting member registration...${NC}"

REGISTER_RESPONSE=$(curl -s -w "\nHTTP_STATUS:%{http_code}" -X POST "$API_BASE_URL/register-member" \
  -H "Content-Type: application/json" \
  -d "{
    \"legalName\": \"$TEST_COMPANY\",
    \"kvkNumber\": \"$TEST_KVK\",
    \"companyAddress\": \"Test Street 123\",
    \"postalCode\": \"1234AB\",
    \"city\": \"Amsterdam\",
    \"country\": \"Netherlands\",
    \"contactName\": \"Test Contact\",
    \"contactEmail\": \"$TEST_EMAIL\",
    \"contactPhone\": \"+31612345678\",
    \"jobTitle\": \"CEO\",
    \"membershipType\": \"basic\",
    \"termsAccepted\": true,
    \"gdprConsent\": true
  }")

HTTP_STATUS=$(echo "$REGISTER_RESPONSE" | grep "HTTP_STATUS" | cut -d':' -f2)
RESPONSE_BODY=$(echo "$REGISTER_RESPONSE" | sed '/HTTP_STATUS/d')

echo "Response: $RESPONSE_BODY"
echo "HTTP Status: $HTTP_STATUS"

if [ "$HTTP_STATUS" != "201" ]; then
    echo -e "${RED}✗ Registration failed (expected 201, got $HTTP_STATUS)${NC}"
    exit 1
fi

APPLICATION_ID=$(echo "$RESPONSE_BODY" | grep -o '"applicationId":"[^"]*"' | cut -d'"' -f4)

if [ -z "$APPLICATION_ID" ]; then
    echo -e "${RED}✗ Failed to extract application ID${NC}"
    exit 1
fi

echo -e "${GREEN}✓ Application created: $APPLICATION_ID${NC}"
echo ""

# =============================================================================
# STEP 2: Get Admin Token (would normally be from Azure AD)
# =============================================================================
echo -e "${BLUE}[2/4] Getting admin authentication token...${NC}"
echo -e "${YELLOW}Note: This test requires admin authentication. Skipping API auth test.${NC}"
echo -e "${YELLOW}Admin endpoints require Azure AD token which Playwright will handle.${NC}"
echo ""

# =============================================================================
# STEP 3: Summary
# =============================================================================
echo "========================================================================"
echo "  Test Summary"
echo "========================================================================"
echo -e "${GREEN}✓ Member registration successful${NC}"
echo "  Application ID: $APPLICATION_ID"
echo "  Company: $TEST_COMPANY"
echo "  KvK: $TEST_KVK"
echo "  Email: $TEST_EMAIL"
echo ""
echo "Next Steps:"
echo "  1. Document upload (UI only - test with Playwright)"
echo "  2. Admin approval (requires Azure AD auth - test with Playwright)"
echo "  3. Verification of KvK data transfer (test with Playwright)"
echo "========================================================================"
echo ""

echo -e "${GREEN}API Registration Test: PASSED ✓${NC}"
