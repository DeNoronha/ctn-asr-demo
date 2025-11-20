#!/bin/bash
# Identifier CRUD Test Script
# Tests the full lifecycle of identifier management operations
#
# Usage:
#   export AUTH_TOKEN="your-azure-ad-token-here"
#   ./identifier-crud-test.sh
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

# Variables to track created resources
IDENTIFIER_ID=""

# Cleanup function
cleanup() {
  if [ -n "$IDENTIFIER_ID" ]; then
    echo ""
    echo "Cleaning up test data..."

    DELETE_RESPONSE=$(curl -s -w "\n%{http_code}" \
      -X DELETE \
      -H "Authorization: Bearer $AUTH_TOKEN" \
      -H "Content-Type: application/json" \
      "$API_URL/identifiers/$IDENTIFIER_ID")

    HTTP_CODE=$(echo "$DELETE_RESPONSE" | tail -n1)

    if [ "$HTTP_CODE" = "200" ] || [ "$HTTP_CODE" = "204" ]; then
      echo "✓ Deleted identifier (ID: $IDENTIFIER_ID)"
    else
      echo "⚠ Warning: Failed to delete identifier (HTTP $HTTP_CODE)"
      echo "  Manual cleanup may be required for identifier: $IDENTIFIER_ID"
    fi
  fi
}
trap cleanup EXIT

# Print test header
echo "========================================"
echo "Identifier CRUD Test"
echo "========================================"
echo "API URL: $API_URL"
echo "Entity ID: $ENTITY_ID"
echo ""

# Test 1: Create Identifier
echo "Test 1: Creating identifier (KvK number 12345678)..."

CREATE_PAYLOAD='{
  "legal_entity_id": "'"$ENTITY_ID"'",
  "identifier_type": "KVK_NUMBER",
  "identifier_value": "12345678",
  "validation_status": "PENDING",
  "is_primary": true
}'

CREATE_RESPONSE=$(curl -s -w "\n%{http_code}" \
  -X POST \
  -H "Authorization: Bearer $AUTH_TOKEN" \
  -H "Content-Type: application/json" \
  -d "$CREATE_PAYLOAD" \
  "$API_URL/entities/$ENTITY_ID/identifiers")

HTTP_CODE=$(echo "$CREATE_RESPONSE" | tail -n1)
RESPONSE_BODY=$(echo "$CREATE_RESPONSE" | sed '$d')

if [ "$HTTP_CODE" = "201" ] || [ "$HTTP_CODE" = "200" ]; then
  IDENTIFIER_ID=$(echo "$RESPONSE_BODY" | jq -r '.legal_entity_reference_id // .id // empty')

  if [ -z "$IDENTIFIER_ID" ] || [ "$IDENTIFIER_ID" = "null" ]; then
    echo "✗ Failed: Could not extract identifier ID from response"
    echo "Response: $RESPONSE_BODY"
    exit 1
  fi

  echo "✓ Created identifier (ID: $IDENTIFIER_ID)"
else
  echo "✗ Failed to create identifier (HTTP $HTTP_CODE)"
  echo "Response: $RESPONSE_BODY"
  exit 1
fi

# Test 2: Retrieve Identifiers
echo ""
echo "Test 2: Retrieving identifiers for entity..."

GET_RESPONSE=$(curl -s -w "\n%{http_code}" \
  -X GET \
  -H "Authorization: Bearer $AUTH_TOKEN" \
  "$API_URL/entities/$ENTITY_ID/identifiers")

HTTP_CODE=$(echo "$GET_RESPONSE" | tail -n1)
RESPONSE_BODY=$(echo "$GET_RESPONSE" | sed '$d')

if [ "$HTTP_CODE" = "200" ]; then
  IDENTIFIER_COUNT=$(echo "$RESPONSE_BODY" | jq '. | length')
  FOUND_IDENTIFIER=$(echo "$RESPONSE_BODY" | jq -r '.[] | select(.legal_entity_reference_id == "'"$IDENTIFIER_ID"'" or .id == "'"$IDENTIFIER_ID"'")')

  if [ -n "$FOUND_IDENTIFIER" ]; then
    echo "✓ Retrieved identifiers successfully (found $IDENTIFIER_COUNT identifier(s))"
    echo "  Created identifier is present in list"
  else
    echo "✗ Failed: Created identifier not found in list"
    echo "Response: $RESPONSE_BODY"
    exit 1
  fi
else
  echo "✗ Failed to retrieve identifiers (HTTP $HTTP_CODE)"
  echo "Response: $RESPONSE_BODY"
  exit 1
fi

# Test 3: Update Identifier
echo ""
echo "Test 3: Updating identifier validation status to VALIDATED..."

UPDATE_PAYLOAD='{
  "validation_status": "VALIDATED"
}'

UPDATE_RESPONSE=$(curl -s -w "\n%{http_code}" \
  -X PUT \
  -H "Authorization: Bearer $AUTH_TOKEN" \
  -H "Content-Type: application/json" \
  -d "$UPDATE_PAYLOAD" \
  "$API_URL/identifiers/$IDENTIFIER_ID")

HTTP_CODE=$(echo "$UPDATE_RESPONSE" | tail -n1)
RESPONSE_BODY=$(echo "$UPDATE_RESPONSE" | sed '$d')

if [ "$HTTP_CODE" = "200" ]; then
  UPDATED_STATUS=$(echo "$RESPONSE_BODY" | jq -r '.validation_status // empty')

  if [ "$UPDATED_STATUS" = "VALIDATED" ]; then
    echo "✓ Updated identifier validation status to VALIDATED"
  else
    echo "✗ Failed: Validation status not updated correctly"
    echo "  Expected: VALIDATED, Got: $UPDATED_STATUS"
    exit 1
  fi
else
  echo "✗ Failed to update identifier (HTTP $HTTP_CODE)"
  echo "Response: $RESPONSE_BODY"
  exit 1
fi

# Test 4: Verify Update
echo ""
echo "Test 4: Verifying update by retrieving identifier again..."

VERIFY_RESPONSE=$(curl -s -w "\n%{http_code}" \
  -X GET \
  -H "Authorization: Bearer $AUTH_TOKEN" \
  "$API_URL/entities/$ENTITY_ID/identifiers")

HTTP_CODE=$(echo "$VERIFY_RESPONSE" | tail -n1)
RESPONSE_BODY=$(echo "$VERIFY_RESPONSE" | sed '$d')

if [ "$HTTP_CODE" = "200" ]; then
  VERIFIED_STATUS=$(echo "$RESPONSE_BODY" | jq -r '.[] | select(.legal_entity_reference_id == "'"$IDENTIFIER_ID"'" or .id == "'"$IDENTIFIER_ID"'") | .validation_status // empty')

  if [ "$VERIFIED_STATUS" = "VALIDATED" ]; then
    echo "✓ Verified identifier update (status: VALIDATED)"
  else
    echo "✗ Failed: Updated status not persisted"
    echo "  Expected: VALIDATED, Got: $VERIFIED_STATUS"
    exit 1
  fi
else
  echo "✗ Failed to verify update (HTTP $HTTP_CODE)"
  echo "Response: $RESPONSE_BODY"
  exit 1
fi

# Success
echo ""
echo "========================================"
echo "✓ All identifier CRUD tests passed!"
echo "========================================"
echo ""
echo "Summary:"
echo "  - Created identifier with KvK number 12345678"
echo "  - Retrieved identifier from list"
echo "  - Updated validation status to VALIDATED"
echo "  - Verified update persistence"
echo "  - Cleanup will delete identifier: $IDENTIFIER_ID"
echo ""
