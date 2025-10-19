#!/bin/bash
# ========================================
# Test: ResolveParty Endpoint
# ========================================
# Tests Azure AD user → party ID resolution
# Part of AUTH-001 implementation

set -e  # Exit on error

API_URL="https://func-ctn-demo-asr-dev.azurewebsites.net/api/v1"
AUTH_TOKEN="${AZURE_AD_TOKEN:-}"

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

echo "=========================================="
echo "ResolveParty Endpoint Tests"
echo "=========================================="
echo ""

# Check if auth token is set
if [ -z "$AUTH_TOKEN" ]; then
  echo -e "${RED}ERROR: AZURE_AD_TOKEN environment variable not set${NC}"
  echo "Please set your Azure AD token as an environment variable"
  echo "Get token from:"
  echo "  az login"
  echo "  az account get-access-token --resource api://d3037c11-a541-4f21-8862-8079137a0cde"
  echo "Then set the environment variable before running this script"
  exit 1
fi

echo "Using API: $API_URL"
echo ""

# ========================================
# Test 1: Valid authenticated request
# ========================================
echo "Test 1: Valid authenticated request (with party association)"
echo "Expected: 200 OK with party details OR 404 if user not linked to party"
echo ""

RESPONSE=$(curl -s -w "\n%{http_code}" \
  -H "Authorization: Bearer $AUTH_TOKEN" \
  "$API_URL/auth/resolve-party")

HTTP_CODE=$(echo "$RESPONSE" | tail -n1)
BODY=$(echo "$RESPONSE" | sed '$d')

if [ "$HTTP_CODE" = "200" ]; then
  echo -e "${GREEN}✓ Test 1 PASSED${NC} - HTTP $HTTP_CODE"
  echo "Response:"
  echo "$BODY" | jq .

  # Verify response structure
  if echo "$BODY" | jq -e '.party_id' > /dev/null; then
    echo -e "${GREEN}✓ party_id field present${NC}"
  else
    echo -e "${RED}✗ party_id field missing${NC}"
  fi

  if echo "$BODY" | jq -e '.legal_entity_id' > /dev/null; then
    echo -e "${GREEN}✓ legal_entity_id field present${NC}"
  else
    echo -e "${RED}✗ legal_entity_id field missing${NC}"
  fi

elif [ "$HTTP_CODE" = "404" ]; then
  echo -e "${YELLOW}⚠ Test 1 WARNING${NC} - HTTP $HTTP_CODE"
  echo "User is not associated with any party (expected for unlinked users)"
  echo "Response:"
  echo "$BODY" | jq .

elif [ "$HTTP_CODE" = "401" ]; then
  echo -e "${RED}✗ Test 1 FAILED${NC} - HTTP $HTTP_CODE (Unauthorized)"
  echo "Response:"
  echo "$BODY" | jq .
  echo ""
  echo "Token may be invalid or expired. Please refresh your token."
  exit 1

else
  echo -e "${RED}✗ Test 1 FAILED${NC} - HTTP $HTTP_CODE"
  echo "Response:"
  echo "$BODY" | jq .
  exit 1
fi

echo ""

# ========================================
# Test 2: Missing Authorization header
# ========================================
echo "Test 2: Missing Authorization header"
echo "Expected: 401 Unauthorized"
echo ""

RESPONSE=$(curl -s -w "\n%{http_code}" \
  "$API_URL/auth/resolve-party")

HTTP_CODE=$(echo "$RESPONSE" | tail -n1)
BODY=$(echo "$RESPONSE" | sed '$d')

if [ "$HTTP_CODE" = "401" ]; then
  echo -e "${GREEN}✓ Test 2 PASSED${NC} - HTTP $HTTP_CODE"
  echo "Response:"
  echo "$BODY" | jq .
else
  echo -e "${RED}✗ Test 2 FAILED${NC} - HTTP $HTTP_CODE (Expected 401)"
  echo "Response:"
  echo "$BODY" | jq .
  exit 1
fi

echo ""

# ========================================
# Test 3: Invalid token
# ========================================
echo "Test 3: Invalid token"
echo "Expected: 401 Unauthorized"
echo ""

RESPONSE=$(curl -s -w "\n%{http_code}" \
  -H "Authorization: Bearer invalid_token_12345" \
  "$API_URL/auth/resolve-party")

HTTP_CODE=$(echo "$RESPONSE" | tail -n1)
BODY=$(echo "$RESPONSE" | sed '$d')

if [ "$HTTP_CODE" = "401" ]; then
  echo -e "${GREEN}✓ Test 3 PASSED${NC} - HTTP $HTTP_CODE"
  echo "Response:"
  echo "$BODY" | jq .
else
  echo -e "${RED}✗ Test 3 FAILED${NC} - HTTP $HTTP_CODE (Expected 401)"
  echo "Response:"
  echo "$BODY" | jq .
  exit 1
fi

echo ""

# ========================================
# Summary
# ========================================
echo "=========================================="
echo -e "${GREEN}All tests completed!${NC}"
echo "=========================================="
echo ""
echo "Next steps:"
echo "1. Run database migration: database/migrations/015_add_azure_ad_object_id.sql"
echo "2. Populate azure_ad_object_id for existing users in database"
echo "3. Test orchestration endpoints with real party filtering"
echo ""
