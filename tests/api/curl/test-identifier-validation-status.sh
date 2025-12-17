#!/bin/bash

##############################################################################
# Test: Identifier Validation Status Values
# Purpose: Verify new validation_status CHECK constraint works correctly
# Date: December 17, 2025
#
# Valid values (after migration 046):
# - PENDING
# - VALID
# - INVALID
# - EXPIRED
# - NOT_VERIFIABLE
#
# Old values (should fail):
# - VALIDATED
# - VERIFIED
# - FAILED
# - DERIVED
##############################################################################

set -e

# Source credentials
if [ -f .credentials ]; then
  source .credentials
fi

API_URL="${API_URL:-https://ca-ctn-asr-api-dev.calmriver-700a8c55.westeurope.azurecontainerapps.io/api/v1}"
TENANT_ID="598664e7-725c-4daa-bd1f-89c4ada717ff"
CLIENT_ID="d3037c11-a541-4f21-8862-8079137a0cde"
USER_EMAIL="test-e2@denoronha.consulting"
SCOPE="api://d3037c11-a541-4f21-8862-8079137a0cde/.default"

echo "============================================"
echo "Identifier Validation Status Tests"
echo "============================================"
echo "API: $API_URL"
echo ""

# Check password
if [ -z "$E2E_TEST_USER_PASSWORD" ]; then
  echo "ERROR: E2E_TEST_USER_PASSWORD not set"
  echo "Run: source .credentials"
  exit 1
fi

# Get access token
echo "1. Acquiring access token..."
TOKEN_RESPONSE=$(curl -s -X POST "https://login.microsoftonline.com/$TENANT_ID/oauth2/v2.0/token" \
  -H "Content-Type: application/x-www-form-urlencoded" \
  -d "grant_type=password" \
  -d "client_id=$CLIENT_ID" \
  -d "username=$USER_EMAIL" \
  -d "password=$E2E_TEST_USER_PASSWORD" \
  -d "scope=$SCOPE")

ACCESS_TOKEN=$(echo "$TOKEN_RESPONSE" | jq -r '.access_token')

if [ "$ACCESS_TOKEN" = "null" ] || [ -z "$ACCESS_TOKEN" ]; then
  echo "FAIL: Token acquisition failed"
  echo "$TOKEN_RESPONSE" | jq .
  exit 1
fi

echo "PASS: Token acquired"
echo ""

# Get a legal entity to test with
echo "2. Finding test legal entity..."
ENTITIES_RESPONSE=$(curl -s -X GET "$API_URL/legal-entities?page=1&pageSize=1" \
  -H "Authorization: Bearer $ACCESS_TOKEN" \
  -H "Content-Type: application/json")

ENTITY_ID=$(echo "$ENTITIES_RESPONSE" | jq -r '.data[0].legal_entity_id // empty')

if [ -z "$ENTITY_ID" ]; then
  echo "FAIL: No legal entities found"
  exit 1
fi

echo "PASS: Using entity $ENTITY_ID"
echo ""

# Test: Create identifier with PENDING status (valid)
echo "3. Test: Create identifier with PENDING status..."
IDENTIFIER_DATA=$(cat <<EOF
{
  "identifier_type": "DUNS",
  "identifier_value": "TEST$(date +%s | tail -c 9)",
  "registry_name": "Test Registry",
  "validation_status": "PENDING"
}
EOF
)

CREATE_RESPONSE=$(curl -s -w "\nHTTP_STATUS:%{http_code}" -X POST "$API_URL/entities/$ENTITY_ID/identifiers" \
  -H "Authorization: Bearer $ACCESS_TOKEN" \
  -H "Content-Type: application/json" \
  -d "$IDENTIFIER_DATA")

HTTP_STATUS=$(echo "$CREATE_RESPONSE" | grep "HTTP_STATUS" | cut -d: -f2)
RESPONSE_BODY=$(echo "$CREATE_RESPONSE" | sed '/HTTP_STATUS/d')

if [ "$HTTP_STATUS" != "201" ] && [ "$HTTP_STATUS" != "200" ]; then
  echo "FAIL: Expected 200/201, got $HTTP_STATUS"
  echo "$RESPONSE_BODY" | jq .
  exit 1
fi

IDENTIFIER_ID=$(echo "$RESPONSE_BODY" | jq -r '.legal_entity_reference_id // .id')

if [ -z "$IDENTIFIER_ID" ] || [ "$IDENTIFIER_ID" = "null" ]; then
  echo "FAIL: No identifier ID returned"
  echo "$RESPONSE_BODY" | jq .
  exit 1
fi

echo "PASS: Created identifier $IDENTIFIER_ID with PENDING status"
echo ""

# Test: Update to VALID status (valid)
echo "4. Test: Update identifier to VALID status..."
UPDATE_DATA='{"validation_status": "VALID", "verification_notes": "Test validation"}'

UPDATE_RESPONSE=$(curl -s -w "\nHTTP_STATUS:%{http_code}" -X PUT "$API_URL/identifiers/$IDENTIFIER_ID" \
  -H "Authorization: Bearer $ACCESS_TOKEN" \
  -H "Content-Type: application/json" \
  -d "$UPDATE_DATA")

HTTP_STATUS=$(echo "$UPDATE_RESPONSE" | grep "HTTP_STATUS" | cut -d: -f2)
RESPONSE_BODY=$(echo "$UPDATE_RESPONSE" | sed '/HTTP_STATUS/d')

if [ "$HTTP_STATUS" != "200" ]; then
  echo "FAIL: Expected 200, got $HTTP_STATUS"
  echo "$RESPONSE_BODY" | jq .
  exit 1
fi

UPDATED_STATUS=$(echo "$RESPONSE_BODY" | jq -r '.validation_status')

if [ "$UPDATED_STATUS" != "VALID" ]; then
  echo "FAIL: Expected validation_status=VALID, got $UPDATED_STATUS"
  echo "$RESPONSE_BODY" | jq .
  exit 1
fi

echo "PASS: Updated to VALID status"
echo ""

# Test: Update to INVALID status (valid)
echo "5. Test: Update identifier to INVALID status..."
UPDATE_DATA='{"validation_status": "INVALID", "verification_notes": "Test invalidation"}'

UPDATE_RESPONSE=$(curl -s -w "\nHTTP_STATUS:%{http_code}" -X PUT "$API_URL/identifiers/$IDENTIFIER_ID" \
  -H "Authorization: Bearer $ACCESS_TOKEN" \
  -H "Content-Type: application/json" \
  -d "$UPDATE_DATA")

HTTP_STATUS=$(echo "$UPDATE_RESPONSE" | grep "HTTP_STATUS" | cut -d: -f2)
RESPONSE_BODY=$(echo "$UPDATE_RESPONSE" | sed '/HTTP_STATUS/d')

if [ "$HTTP_STATUS" != "200" ]; then
  echo "FAIL: Expected 200, got $HTTP_STATUS"
  echo "$RESPONSE_BODY" | jq .
  exit 1
fi

UPDATED_STATUS=$(echo "$RESPONSE_BODY" | jq -r '.validation_status')

if [ "$UPDATED_STATUS" != "INVALID" ]; then
  echo "FAIL: Expected validation_status=INVALID, got $UPDATED_STATUS"
  echo "$RESPONSE_BODY" | jq .
  exit 1
fi

echo "PASS: Updated to INVALID status"
echo ""

# Test: Update to EXPIRED status (valid)
echo "6. Test: Update identifier to EXPIRED status..."
UPDATE_DATA='{"validation_status": "EXPIRED"}'

UPDATE_RESPONSE=$(curl -s -w "\nHTTP_STATUS:%{http_code}" -X PUT "$API_URL/identifiers/$IDENTIFIER_ID" \
  -H "Authorization: Bearer $ACCESS_TOKEN" \
  -H "Content-Type: application/json" \
  -d "$UPDATE_DATA")

HTTP_STATUS=$(echo "$UPDATE_RESPONSE" | grep "HTTP_STATUS" | cut -d: -f2)
RESPONSE_BODY=$(echo "$UPDATE_RESPONSE" | sed '/HTTP_STATUS/d')

if [ "$HTTP_STATUS" != "200" ]; then
  echo "FAIL: Expected 200, got $HTTP_STATUS"
  echo "$RESPONSE_BODY" | jq .
  exit 1
fi

echo "PASS: Updated to EXPIRED status"
echo ""

# Test: Update to NOT_VERIFIABLE status (valid)
echo "7. Test: Update identifier to NOT_VERIFIABLE status..."
UPDATE_DATA='{"validation_status": "NOT_VERIFIABLE"}'

UPDATE_RESPONSE=$(curl -s -w "\nHTTP_STATUS:%{http_code}" -X PUT "$API_URL/identifiers/$IDENTIFIER_ID" \
  -H "Authorization: Bearer $ACCESS_TOKEN" \
  -H "Content-Type: application/json" \
  -d "$UPDATE_DATA")

HTTP_STATUS=$(echo "$UPDATE_RESPONSE" | grep "HTTP_STATUS" | cut -d: -f2)
RESPONSE_BODY=$(echo "$UPDATE_RESPONSE" | sed '/HTTP_STATUS/d')

if [ "$HTTP_STATUS" != "200" ]; then
  echo "FAIL: Expected 200, got $HTTP_STATUS"
  echo "$RESPONSE_BODY" | jq .
  exit 1
fi

echo "PASS: Updated to NOT_VERIFIABLE status"
echo ""

# Test: Try to update to old VERIFIED status (should fail)
echo "8. Test: Try to update to old VERIFIED status (should fail)..."
UPDATE_DATA='{"validation_status": "VERIFIED"}'

UPDATE_RESPONSE=$(curl -s -w "\nHTTP_STATUS:%{http_code}" -X PUT "$API_URL/identifiers/$IDENTIFIER_ID" \
  -H "Authorization: Bearer $ACCESS_TOKEN" \
  -H "Content-Type: application/json" \
  -d "$UPDATE_DATA")

HTTP_STATUS=$(echo "$UPDATE_RESPONSE" | grep "HTTP_STATUS" | cut -d: -f2)
RESPONSE_BODY=$(echo "$UPDATE_RESPONSE" | sed '/HTTP_STATUS/d')

if [ "$HTTP_STATUS" = "200" ]; then
  echo "FAIL: Should have rejected VERIFIED status, but got 200"
  echo "$RESPONSE_BODY" | jq .
  exit 1
fi

if [ "$HTTP_STATUS" != "400" ] && [ "$HTTP_STATUS" != "500" ]; then
  echo "WARNING: Expected 400 or 500, got $HTTP_STATUS (database constraint might not be enforced)"
fi

echo "PASS: Rejected old VERIFIED status (HTTP $HTTP_STATUS)"
echo ""

# Test: Try to update to old VALIDATED status (should fail)
echo "9. Test: Try to update to old VALIDATED status (should fail)..."
UPDATE_DATA='{"validation_status": "VALIDATED"}'

UPDATE_RESPONSE=$(curl -s -w "\nHTTP_STATUS:%{http_code}" -X PUT "$API_URL/identifiers/$IDENTIFIER_ID" \
  -H "Authorization: Bearer $ACCESS_TOKEN" \
  -H "Content-Type: application/json" \
  -d "$UPDATE_DATA")

HTTP_STATUS=$(echo "$UPDATE_RESPONSE" | grep "HTTP_STATUS" | cut -d: -f2)

if [ "$HTTP_STATUS" = "200" ]; then
  echo "FAIL: Should have rejected VALIDATED status, but got 200"
  exit 1
fi

echo "PASS: Rejected old VALIDATED status (HTTP $HTTP_STATUS)"
echo ""

# Cleanup
echo "10. Cleanup: Deleting test identifier..."
DELETE_RESPONSE=$(curl -s -w "\nHTTP_STATUS:%{http_code}" -X DELETE "$API_URL/identifiers/$IDENTIFIER_ID" \
  -H "Authorization: Bearer $ACCESS_TOKEN")

HTTP_STATUS=$(echo "$DELETE_RESPONSE" | grep "HTTP_STATUS" | cut -d: -f2)

if [ "$HTTP_STATUS" != "200" ] && [ "$HTTP_STATUS" != "204" ]; then
  echo "WARNING: Cleanup failed (HTTP $HTTP_STATUS)"
else
  echo "PASS: Deleted test identifier"
fi

echo ""
echo "============================================"
echo "All validation_status tests passed!"
echo "============================================"
echo ""
echo "Summary:"
echo "- PENDING: ✓ Valid"
echo "- VALID: ✓ Valid"
echo "- INVALID: ✓ Valid"
echo "- EXPIRED: ✓ Valid"
echo "- NOT_VERIFIABLE: ✓ Valid"
echo "- VERIFIED (old): ✓ Rejected"
echo "- VALIDATED (old): ✓ Rejected"
