#!/bin/bash
# Address Update Test Script
# Tests the ability to update legal entity addresses
#
# Usage:
#   export AUTH_TOKEN="your-azure-ad-token-here"
#   ./address-update-test.sh
#
# Environment Variables:
#   AUTH_TOKEN - Azure AD bearer token (required)
#   API_URL - API base URL (optional, defaults to production)
#   ENTITY_ID - Legal entity ID to test with (optional, has default)

set -e  # Exit on first error

# Configuration
API_URL="${API_URL:-https://ca-ctn-asr-api-dev.calmriver-700a8c55.westeurope.azurecontainerapps.io/api/v1}"
AUTH_TOKEN="${AUTH_TOKEN:-}"
ENTITY_ID="${ENTITY_ID:-fbc4bcdc-a9f9-4621-a153-c5deb6c49519}"

# Check dependencies
if ! command -v jq &> /dev/null; then
  echo "✗ Error: jq is required but not installed"
  echo "  Install with: brew install jq (macOS) or apt-get install jq (Linux)"
  exit 1
fi

# Check auth token
if [ -z "$AUTH_TOKEN" ]; then
  echo "✗ Error: AUTH_TOKEN environment variable not set"
  echo "  Get token from Azure AD and export it:"
  echo "  export AUTH_TOKEN='your-token-here'"
  exit 1
fi

# Variables to store original state
ORIGINAL_STREET=""
ORIGINAL_CITY=""
ORIGINAL_POSTAL=""
ORIGINAL_COUNTRY=""

# Cleanup function - restore original address
cleanup() {
  if [ -n "$ORIGINAL_STREET" ]; then
    echo ""
    echo "Restoring original address..."

    RESTORE_PAYLOAD='{
      "street_address": "'"$ORIGINAL_STREET"'",
      "city": "'"$ORIGINAL_CITY"'",
      "postal_code": "'"$ORIGINAL_POSTAL"'",
      "country": "'"$ORIGINAL_COUNTRY"'"
    }'

    RESTORE_RESPONSE=$(curl -s -w "\n%{http_code}" \
      -X PUT \
      -H "Authorization: Bearer $AUTH_TOKEN" \
      -H "Content-Type: application/json" \
      -d "$RESTORE_PAYLOAD" \
      "$API_URL/legal-entities/$ENTITY_ID")

    HTTP_CODE=$(echo "$RESTORE_RESPONSE" | tail -n1)

    if [ "$HTTP_CODE" = "200" ]; then
      echo "✓ Restored original address"
      echo "  Street: $ORIGINAL_STREET"
    else
      echo "⚠ Warning: Failed to restore original address (HTTP $HTTP_CODE)"
      echo "  Manual restoration may be required"
    fi
  fi
}
trap cleanup EXIT

# Print test header
echo "========================================"
echo "Address Update Test"
echo "========================================"
echo "API URL: $API_URL"
echo "Entity ID: $ENTITY_ID"
echo ""

# Test 1: Get Current Address
echo "Test 1: Retrieving current legal entity address..."

GET_RESPONSE=$(curl -s -w "\n%{http_code}" \
  -X GET \
  -H "Authorization: Bearer $AUTH_TOKEN" \
  "$API_URL/legal-entities/$ENTITY_ID")

HTTP_CODE=$(echo "$GET_RESPONSE" | tail -n1)
RESPONSE_BODY=$(echo "$GET_RESPONSE" | sed '$d')

if [ "$HTTP_CODE" = "200" ]; then
  ORIGINAL_STREET=$(echo "$RESPONSE_BODY" | jq -r '.street_address // empty')
  ORIGINAL_CITY=$(echo "$RESPONSE_BODY" | jq -r '.city // empty')
  ORIGINAL_POSTAL=$(echo "$RESPONSE_BODY" | jq -r '.postal_code // empty')
  ORIGINAL_COUNTRY=$(echo "$RESPONSE_BODY" | jq -r '.country // empty')
  ENTITY_NAME=$(echo "$RESPONSE_BODY" | jq -r '.legal_name // empty')

  echo "✓ Retrieved current address for: $ENTITY_NAME"
  echo "  Street: $ORIGINAL_STREET"
  echo "  City: $ORIGINAL_CITY"
  echo "  Postal Code: $ORIGINAL_POSTAL"
  echo "  Country: $ORIGINAL_COUNTRY"
else
  echo "✗ Failed to retrieve legal entity (HTTP $HTTP_CODE)"
  echo "Response: $RESPONSE_BODY"
  exit 1
fi

# Test 2: Update Address
echo ""
echo "Test 2: Updating street address to test value..."

TEST_STREET="123 Test API Street"

UPDATE_PAYLOAD='{
  "street_address": "'"$TEST_STREET"'",
  "city": "'"$ORIGINAL_CITY"'",
  "postal_code": "'"$ORIGINAL_POSTAL"'",
  "country": "'"$ORIGINAL_COUNTRY"'"
}'

UPDATE_RESPONSE=$(curl -s -w "\n%{http_code}" \
  -X PUT \
  -H "Authorization: Bearer $AUTH_TOKEN" \
  -H "Content-Type: application/json" \
  -d "$UPDATE_PAYLOAD" \
  "$API_URL/legal-entities/$ENTITY_ID")

HTTP_CODE=$(echo "$UPDATE_RESPONSE" | tail -n1)
RESPONSE_BODY=$(echo "$UPDATE_RESPONSE" | sed '$d')

if [ "$HTTP_CODE" = "200" ]; then
  UPDATED_STREET=$(echo "$RESPONSE_BODY" | jq -r '.street_address // empty')

  if [ "$UPDATED_STREET" = "$TEST_STREET" ]; then
    echo "✓ Updated address successfully"
    echo "  New street: $TEST_STREET"
  else
    echo "✗ Failed: Street address not updated correctly"
    echo "  Expected: $TEST_STREET"
    echo "  Got: $UPDATED_STREET"
    exit 1
  fi
else
  echo "✗ Failed to update address (HTTP $HTTP_CODE)"
  echo "Response: $RESPONSE_BODY"
  exit 1
fi

# Test 3: Verify Update Persistence
echo ""
echo "Test 3: Verifying address update persisted..."

VERIFY_RESPONSE=$(curl -s -w "\n%{http_code}" \
  -X GET \
  -H "Authorization: Bearer $AUTH_TOKEN" \
  "$API_URL/legal-entities/$ENTITY_ID")

HTTP_CODE=$(echo "$VERIFY_RESPONSE" | tail -n1)
RESPONSE_BODY=$(echo "$VERIFY_RESPONSE" | sed '$d')

if [ "$HTTP_CODE" = "200" ]; then
  VERIFIED_STREET=$(echo "$RESPONSE_BODY" | jq -r '.street_address // empty')
  VERIFIED_CITY=$(echo "$RESPONSE_BODY" | jq -r '.city // empty')
  VERIFIED_POSTAL=$(echo "$RESPONSE_BODY" | jq -r '.postal_code // empty')
  VERIFIED_COUNTRY=$(echo "$RESPONSE_BODY" | jq -r '.country // empty')

  if [ "$VERIFIED_STREET" = "$TEST_STREET" ] && \
     [ "$VERIFIED_CITY" = "$ORIGINAL_CITY" ] && \
     [ "$VERIFIED_POSTAL" = "$ORIGINAL_POSTAL" ] && \
     [ "$VERIFIED_COUNTRY" = "$ORIGINAL_COUNTRY" ]; then
    echo "✓ Verified address update persisted"
    echo "  Street: $VERIFIED_STREET"
    echo "  City: $VERIFIED_CITY"
    echo "  Postal Code: $VERIFIED_POSTAL"
    echo "  Country: $VERIFIED_COUNTRY"
  else
    echo "✗ Failed: Updated address not persisted correctly"
    echo "  Expected street: $TEST_STREET, Got: $VERIFIED_STREET"
    exit 1
  fi
else
  echo "✗ Failed to verify update (HTTP $HTTP_CODE)"
  echo "Response: $RESPONSE_BODY"
  exit 1
fi

# Test 4: Update Multiple Fields
echo ""
echo "Test 4: Updating multiple address fields..."

TEST_STREET_2="456 Multi-Field Test Avenue"
TEST_POSTAL_2="9999XX"

UPDATE_PAYLOAD_2='{
  "street_address": "'"$TEST_STREET_2"'",
  "city": "'"$ORIGINAL_CITY"'",
  "postal_code": "'"$TEST_POSTAL_2"'",
  "country": "'"$ORIGINAL_COUNTRY"'"
}'

UPDATE_RESPONSE_2=$(curl -s -w "\n%{http_code}" \
  -X PUT \
  -H "Authorization: Bearer $AUTH_TOKEN" \
  -H "Content-Type: application/json" \
  -d "$UPDATE_PAYLOAD_2" \
  "$API_URL/legal-entities/$ENTITY_ID")

HTTP_CODE=$(echo "$UPDATE_RESPONSE_2" | tail -n1)
RESPONSE_BODY=$(echo "$UPDATE_RESPONSE_2" | sed '$d')

if [ "$HTTP_CODE" = "200" ]; then
  UPDATED_STREET_2=$(echo "$RESPONSE_BODY" | jq -r '.street_address // empty')
  UPDATED_POSTAL_2=$(echo "$RESPONSE_BODY" | jq -r '.postal_code // empty')

  if [ "$UPDATED_STREET_2" = "$TEST_STREET_2" ] && [ "$UPDATED_POSTAL_2" = "$TEST_POSTAL_2" ]; then
    echo "✓ Updated multiple fields successfully"
    echo "  New street: $TEST_STREET_2"
    echo "  New postal code: $TEST_POSTAL_2"
  else
    echo "✗ Failed: Fields not updated correctly"
    echo "  Expected street: $TEST_STREET_2, Got: $UPDATED_STREET_2"
    echo "  Expected postal: $TEST_POSTAL_2, Got: $UPDATED_POSTAL_2"
    exit 1
  fi
else
  echo "✗ Failed to update multiple fields (HTTP $HTTP_CODE)"
  echo "Response: $RESPONSE_BODY"
  exit 1
fi

# Success
echo ""
echo "========================================"
echo "✓ All address update tests passed!"
echo "========================================"
echo ""
echo "Summary:"
echo "  - Retrieved original address"
echo "  - Updated street address"
echo "  - Verified update persistence"
echo "  - Updated multiple address fields"
echo "  - Cleanup will restore original address"
echo ""
