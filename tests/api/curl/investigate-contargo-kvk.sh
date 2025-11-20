#!/bin/bash
# Investigation Script: Check if Contargo has KvK number 95944192
#
# This script tests the API endpoints to verify if the KvK number
# that was supposedly added last night actually exists in the database.
#
# Usage:
#   export AUTH_TOKEN="your-azure-ad-token-here"
#   ./investigate-contargo-kvk.sh
#
# Environment Variables:
#   AUTH_TOKEN - Azure AD bearer token (required)

set -e  # Exit on first error

# Configuration
API_URL="https://ca-ctn-asr-api-dev.calmriver-700a8c55.westeurope.azurecontainerapps.io/api/v1"
AUTH_TOKEN="${AUTH_TOKEN:-}"
EXPECTED_KVK="95944192"

# Check dependencies
if ! command -v jq &> /dev/null; then
  echo "✗ Error: jq is required but not installed"
  echo "  Install with: brew install jq (macOS) or apt-get install jq (Linux)"
  exit 1
fi

# Check auth token
if [ -z "$AUTH_TOKEN" ]; then
  echo "✗ Error: AUTH_TOKEN environment variable not set"
  echo ""
  echo "To get a token:"
  echo "1. Open https://calm-tree-03352ba03.1.azurestaticapps.net"
  echo "2. Login with Azure AD"
  echo "3. Open browser DevTools (F12)"
  echo "4. Go to Application tab → Session Storage"
  echo "5. Find the MSAL token"
  echo "6. Copy the accessToken value"
  echo "7. Run: export AUTH_TOKEN='paste-token-here'"
  echo "8. Then run this script again"
  exit 1
fi

# Print test header
echo "========================================"
echo "Contargo KvK Investigation"
echo "========================================"
echo "API URL: $API_URL"
echo "Expected KvK: $EXPECTED_KVK"
echo ""

# Step 1: Get all members and find Contargo
echo "Step 1: Finding Contargo in all-members endpoint..."

ALL_MEMBERS_RESPONSE=$(curl -s -w "\n%{http_code}" \
  -H "Authorization: Bearer $AUTH_TOKEN" \
  "$API_URL/all-members")

HTTP_CODE=$(echo "$ALL_MEMBERS_RESPONSE" | tail -n1)
RESPONSE_BODY=$(echo "$ALL_MEMBERS_RESPONSE" | sed '$d')

if [ "$HTTP_CODE" != "200" ]; then
  echo "✗ Failed to get members list (HTTP $HTTP_CODE)"
  echo "Response: $RESPONSE_BODY"
  exit 1
fi

# Extract Contargo entity
CONTARGO_DATA=$(echo "$RESPONSE_BODY" | jq '.data[] | select(.legal_name | contains("Contargo"))')

if [ -z "$CONTARGO_DATA" ]; then
  echo "✗ ERROR: Contargo not found in members list"
  echo ""
  echo "Available members:"
  echo "$RESPONSE_BODY" | jq -r '.data[] | .legal_name'
  exit 1
fi

CONTARGO_ENTITY_ID=$(echo "$CONTARGO_DATA" | jq -r '.legal_entity_id')
CONTARGO_NAME=$(echo "$CONTARGO_DATA" | jq -r '.legal_name')

echo "✓ Found Contargo:"
echo "  Name: $CONTARGO_NAME"
echo "  Entity ID: $CONTARGO_ENTITY_ID"
echo ""

# Step 2: Get identifiers for Contargo entity
echo "Step 2: Retrieving identifiers for Contargo entity..."

IDENTIFIERS_RESPONSE=$(curl -s -w "\n%{http_code}" \
  -H "Authorization: Bearer $AUTH_TOKEN" \
  "$API_URL/entities/$CONTARGO_ENTITY_ID/identifiers")

HTTP_CODE=$(echo "$IDENTIFIERS_RESPONSE" | tail -n1)
RESPONSE_BODY=$(echo "$IDENTIFIERS_RESPONSE" | sed '$d')

if [ "$HTTP_CODE" != "200" ]; then
  echo "✗ Failed to get identifiers (HTTP $HTTP_CODE)"
  echo "Response: $RESPONSE_BODY"
  exit 1
fi

# Check if response is an array
IDENTIFIER_COUNT=$(echo "$RESPONSE_BODY" | jq '. | length')

if [ "$IDENTIFIER_COUNT" = "0" ]; then
  echo "✗ NO IDENTIFIERS FOUND for Contargo"
  echo "  This confirms the bug: KvK number was NOT added to database"
  echo ""
  echo "Raw response:"
  echo "$RESPONSE_BODY" | jq '.'
  exit 1
fi

echo "✓ Found $IDENTIFIER_COUNT identifier(s) for Contargo"
echo ""
echo "All identifiers:"
echo "$RESPONSE_BODY" | jq -r '.[] | "  - Type: \(.identifier_type), Value: \(.identifier_value), Status: \(.validation_status)"'
echo ""

# Step 3: Check if KvK 95944192 exists
echo "Step 3: Checking if KvK $EXPECTED_KVK exists..."

KVK_IDENTIFIER=$(echo "$RESPONSE_BODY" | jq --arg kvk "$EXPECTED_KVK" '.[] | select(.identifier_value == $kvk)')

if [ -z "$KVK_IDENTIFIER" ]; then
  echo "✗ BUG CONFIRMED: KvK number $EXPECTED_KVK NOT FOUND"
  echo ""
  echo "Expected identifier:"
  echo "  Type: KVK"
  echo "  Value: $EXPECTED_KVK"
  echo "  Status: PENDING"
  echo ""
  echo "This confirms the script 'add-kvk-to-contargo.sh' FAILED to add the identifier"
  echo "despite claiming success."
  exit 1
fi

echo "✓ SUCCESS: KvK number $EXPECTED_KVK EXISTS in database!"
echo ""
echo "Identifier details:"
echo "$KVK_IDENTIFIER" | jq '.'
echo ""

# Step 4: Summary
echo "========================================"
echo "Investigation Summary"
echo "========================================"
echo "✓ Contargo entity exists (ID: $CONTARGO_ENTITY_ID)"
echo "✓ Entity has $IDENTIFIER_COUNT identifier(s)"
echo "✓ KvK $EXPECTED_KVK is present in database"
echo ""
echo "API Test Result: PASS"
echo ""
echo "If the KvK number is not visible in the admin portal UI,"
echo "this indicates a FRONTEND DISPLAY BUG, not a backend issue."
echo ""
