#!/bin/bash
# Contact CRUD Test Script
# Tests the full lifecycle of contact management operations
#
# Usage:
#   export AUTH_TOKEN="your-azure-ad-token-here"
#   ./contact-crud-test.sh
#
# Environment Variables:
#   AUTH_TOKEN - Azure AD bearer token (required)
#   API_URL - API base URL (optional, defaults to production)
#   ENTITY_ID - Legal entity ID to test with (optional, has default)

set -e  # Exit on first error

# Configuration
API_URL="${API_URL:-https://func-ctn-demo-asr-dev.azurewebsites.net/api/v1}"
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
CONTACT_ID=""

# Cleanup function
cleanup() {
  if [ -n "$CONTACT_ID" ]; then
    echo ""
    echo "Cleaning up test data..."

    DELETE_RESPONSE=$(curl -s -w "\n%{http_code}" \
      -X DELETE \
      -H "Authorization: Bearer $AUTH_TOKEN" \
      -H "Content-Type: application/json" \
      "$API_URL/contacts/$CONTACT_ID")

    HTTP_CODE=$(echo "$DELETE_RESPONSE" | tail -n1)

    if [ "$HTTP_CODE" = "200" ] || [ "$HTTP_CODE" = "204" ]; then
      echo "✓ Deleted contact (ID: $CONTACT_ID)"
    else
      echo "⚠ Warning: Failed to delete contact (HTTP $HTTP_CODE)"
      echo "  Manual cleanup may be required for contact: $CONTACT_ID"
    fi
  fi
}
trap cleanup EXIT

# Print test header
echo "========================================"
echo "Contact CRUD Test"
echo "========================================"
echo "API URL: $API_URL"
echo "Entity ID: $ENTITY_ID"
echo ""

# Test 1: Create Contact
echo "Test 1: Creating contact for legal entity..."

CREATE_PAYLOAD='{
  "legal_entity_id": "'"$ENTITY_ID"'",
  "contact_type": "PRIMARY",
  "first_name": "Test",
  "last_name": "Contact",
  "email_address": "test.contact@example.com",
  "phone_number": "+31612345678",
  "position_title": "API Test Contact"
}'

CREATE_RESPONSE=$(curl -s -w "\n%{http_code}" \
  -X POST \
  -H "Authorization: Bearer $AUTH_TOKEN" \
  -H "Content-Type: application/json" \
  -d "$CREATE_PAYLOAD" \
  "$API_URL/contacts")

HTTP_CODE=$(echo "$CREATE_RESPONSE" | tail -n1)
RESPONSE_BODY=$(echo "$CREATE_RESPONSE" | sed '$d')

if [ "$HTTP_CODE" = "201" ] || [ "$HTTP_CODE" = "200" ]; then
  CONTACT_ID=$(echo "$RESPONSE_BODY" | jq -r '.contact_id // .id // empty')

  if [ -z "$CONTACT_ID" ] || [ "$CONTACT_ID" = "null" ]; then
    echo "✗ Failed: Could not extract contact ID from response"
    echo "Response: $RESPONSE_BODY"
    exit 1
  fi

  echo "✓ Created contact (ID: $CONTACT_ID)"
  echo "  Name: Test Contact"
  echo "  Email: test.contact@example.com"
else
  echo "✗ Failed to create contact (HTTP $HTTP_CODE)"
  echo "Response: $RESPONSE_BODY"
  exit 1
fi

# Test 2: Retrieve Contacts for Legal Entity
echo ""
echo "Test 2: Retrieving contacts for entity..."

GET_RESPONSE=$(curl -s -w "\n%{http_code}" \
  -X GET \
  -H "Authorization: Bearer $AUTH_TOKEN" \
  "$API_URL/legal-entities/$ENTITY_ID/contacts")

HTTP_CODE=$(echo "$GET_RESPONSE" | tail -n1)
RESPONSE_BODY=$(echo "$GET_RESPONSE" | sed '$d')

if [ "$HTTP_CODE" = "200" ]; then
  CONTACT_COUNT=$(echo "$RESPONSE_BODY" | jq '. | length')
  FOUND_CONTACT=$(echo "$RESPONSE_BODY" | jq -r '.[] | select(.contact_id == "'"$CONTACT_ID"'" or .id == "'"$CONTACT_ID"'")')

  if [ -n "$FOUND_CONTACT" ]; then
    echo "✓ Retrieved contacts successfully (found $CONTACT_COUNT contact(s))"
    echo "  Created contact is present in list"
  else
    echo "✗ Failed: Created contact not found in list"
    echo "Response: $RESPONSE_BODY"
    exit 1
  fi
else
  echo "✗ Failed to retrieve contacts (HTTP $HTTP_CODE)"
  echo "Response: $RESPONSE_BODY"
  exit 1
fi

# Test 3: Update Contact
echo ""
echo "Test 3: Updating contact email address..."

UPDATE_PAYLOAD='{
  "email_address": "updated.test@example.com",
  "phone_number": "+31687654321"
}'

UPDATE_RESPONSE=$(curl -s -w "\n%{http_code}" \
  -X PUT \
  -H "Authorization: Bearer $AUTH_TOKEN" \
  -H "Content-Type: application/json" \
  -d "$UPDATE_PAYLOAD" \
  "$API_URL/contacts/$CONTACT_ID")

HTTP_CODE=$(echo "$UPDATE_RESPONSE" | tail -n1)
RESPONSE_BODY=$(echo "$UPDATE_RESPONSE" | sed '$d')

if [ "$HTTP_CODE" = "200" ]; then
  UPDATED_EMAIL=$(echo "$RESPONSE_BODY" | jq -r '.email_address // empty')
  UPDATED_PHONE=$(echo "$RESPONSE_BODY" | jq -r '.phone_number // empty')

  if [ "$UPDATED_EMAIL" = "updated.test@example.com" ] && [ "$UPDATED_PHONE" = "+31687654321" ]; then
    echo "✓ Updated contact successfully"
    echo "  New email: updated.test@example.com"
    echo "  New phone: +31687654321"
  else
    echo "✗ Failed: Contact details not updated correctly"
    echo "  Expected email: updated.test@example.com, Got: $UPDATED_EMAIL"
    echo "  Expected phone: +31687654321, Got: $UPDATED_PHONE"
    exit 1
  fi
else
  echo "✗ Failed to update contact (HTTP $HTTP_CODE)"
  echo "Response: $RESPONSE_BODY"
  exit 1
fi

# Test 4: Verify Update
echo ""
echo "Test 4: Verifying update by retrieving contact again..."

VERIFY_RESPONSE=$(curl -s -w "\n%{http_code}" \
  -X GET \
  -H "Authorization: Bearer $AUTH_TOKEN" \
  "$API_URL/legal-entities/$ENTITY_ID/contacts")

HTTP_CODE=$(echo "$VERIFY_RESPONSE" | tail -n1)
RESPONSE_BODY=$(echo "$VERIFY_RESPONSE" | sed '$d')

if [ "$HTTP_CODE" = "200" ]; then
  VERIFIED_EMAIL=$(echo "$RESPONSE_BODY" | jq -r '.[] | select(.contact_id == "'"$CONTACT_ID"'" or .id == "'"$CONTACT_ID"'") | .email_address // empty')
  VERIFIED_PHONE=$(echo "$RESPONSE_BODY" | jq -r '.[] | select(.contact_id == "'"$CONTACT_ID"'" or .id == "'"$CONTACT_ID"'") | .phone_number // empty')

  if [ "$VERIFIED_EMAIL" = "updated.test@example.com" ] && [ "$VERIFIED_PHONE" = "+31687654321" ]; then
    echo "✓ Verified contact update"
    echo "  Email: updated.test@example.com"
    echo "  Phone: +31687654321"
  else
    echo "✗ Failed: Updated details not persisted"
    echo "  Expected email: updated.test@example.com, Got: $VERIFIED_EMAIL"
    echo "  Expected phone: +31687654321, Got: $VERIFIED_PHONE"
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
echo "✓ All contact CRUD tests passed!"
echo "========================================"
echo ""
echo "Summary:"
echo "  - Created contact (Test Contact)"
echo "  - Retrieved contact from entity's contact list"
echo "  - Updated email and phone number"
echo "  - Verified update persistence"
echo "  - Cleanup will delete contact: $CONTACT_ID"
echo ""
