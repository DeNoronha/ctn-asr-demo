#!/bin/bash

# Test script for Identifier CRUD endpoints
# This script tests all identifier endpoints with proper authentication

API_BASE="https://func-ctn-demo-asr-dev.azurewebsites.net/api"
TENANT_ID="598664e7-725c-4daa-bd1f-89c4ada717ff"
CLIENT_ID="7ba7bde4-aef6-4acf-8a31-dc4b577ec73f"
SCOPE="api://7ba7bde4-aef6-4acf-8a31-dc4b577ec73f/.default"

echo "========================================="
echo "Identifier Endpoint Testing"
echo "========================================="
echo ""

# Get a valid legal entity ID from the database
echo "Step 1: Finding a test legal entity..."
LEGAL_ENTITY_ID=$(az postgres flexible-server execute \
  --name psql-ctn-demo-asr-dev \
  --admin-user dbadmin \
  --database-name association_register \
  --querytext "SELECT legal_entity_id FROM legal_entity WHERE is_deleted = FALSE LIMIT 1;" \
  --output tsv 2>/dev/null | tail -n 1)

if [ -z "$LEGAL_ENTITY_ID" ]; then
  echo "ERROR: Could not find a legal entity in the database"
  exit 1
fi

echo "✓ Using legal entity: $LEGAL_ENTITY_ID"
echo ""

# Get access token for API authentication
echo "Step 2: Acquiring access token..."
TOKEN=$(az account get-access-token --resource "$CLIENT_ID" --query accessToken -o tsv 2>/dev/null)

if [ -z "$TOKEN" ]; then
  echo "ERROR: Could not acquire access token"
  exit 1
fi

echo "✓ Access token acquired"
echo ""

# Test 1: GET /api/v1/entities/{legalEntityId}/identifiers
echo "========================================="
echo "TEST 1: GET Identifiers"
echo "========================================="
echo "URL: $API_BASE/v1/entities/$LEGAL_ENTITY_ID/identifiers"
echo ""
GET_RESPONSE=$(curl -s -w "\nHTTP_STATUS:%{http_code}" \
  -X GET "$API_BASE/v1/entities/$LEGAL_ENTITY_ID/identifiers" \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json")

HTTP_STATUS=$(echo "$GET_RESPONSE" | grep "HTTP_STATUS:" | cut -d: -f2)
BODY=$(echo "$GET_RESPONSE" | sed '/HTTP_STATUS:/d')

echo "Response Status: $HTTP_STATUS"
echo "Response Body:"
echo "$BODY" | jq '.' 2>/dev/null || echo "$BODY"
echo ""

# Test 2: POST /api/v1/entities/{legalEntityId}/identifiers
echo "========================================="
echo "TEST 2: POST Create Identifier"
echo "========================================="
echo "URL: $API_BASE/v1/entities/$LEGAL_ENTITY_ID/identifiers"
echo ""

# Create test identifier payload
IDENTIFIER_PAYLOAD='{
  "identifier_type": "KVK",
  "identifier_value": "95944192",
  "country_code": "NL",
  "registry_name": "Dutch Chamber of Commerce (Kamer van Koophandel)",
  "registry_url": "https://www.kvk.nl/",
  "validation_status": "PENDING"
}'

echo "Request Payload:"
echo "$IDENTIFIER_PAYLOAD" | jq '.'
echo ""

POST_RESPONSE=$(curl -s -w "\nHTTP_STATUS:%{http_code}" \
  -X POST "$API_BASE/v1/entities/$LEGAL_ENTITY_ID/identifiers" \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d "$IDENTIFIER_PAYLOAD")

HTTP_STATUS=$(echo "$POST_RESPONSE" | grep "HTTP_STATUS:" | cut -d: -f2)
BODY=$(echo "$POST_RESPONSE" | sed '/HTTP_STATUS:/d')

echo "Response Status: $HTTP_STATUS"
echo "Response Body:"
echo "$BODY" | jq '.' 2>/dev/null || echo "$BODY"
echo ""

# Extract identifier ID for update/delete tests
IDENTIFIER_ID=$(echo "$BODY" | jq -r '.legal_entity_reference_id' 2>/dev/null)

if [ "$HTTP_STATUS" = "201" ] && [ "$IDENTIFIER_ID" != "null" ]; then
  echo "✓ Identifier created successfully with ID: $IDENTIFIER_ID"
  echo ""

  # Test 3: PUT /api/v1/identifiers/{identifierId}
  echo "========================================="
  echo "TEST 3: PUT Update Identifier"
  echo "========================================="
  echo "URL: $API_BASE/v1/identifiers/$IDENTIFIER_ID"
  echo ""

  UPDATE_PAYLOAD='{
    "validation_status": "VALIDATED",
    "verification_notes": "Verified through KVK API"
  }'

  echo "Request Payload:"
  echo "$UPDATE_PAYLOAD" | jq '.'
  echo ""

  PUT_RESPONSE=$(curl -s -w "\nHTTP_STATUS:%{http_code}" \
    -X PUT "$API_BASE/v1/identifiers/$IDENTIFIER_ID" \
    -H "Authorization: Bearer $TOKEN" \
    -H "Content-Type: application/json" \
    -d "$UPDATE_PAYLOAD")

  HTTP_STATUS=$(echo "$PUT_RESPONSE" | grep "HTTP_STATUS:" | cut -d: -f2)
  BODY=$(echo "$PUT_RESPONSE" | sed '/HTTP_STATUS:/d')

  echo "Response Status: $HTTP_STATUS"
  echo "Response Body:"
  echo "$BODY" | jq '.' 2>/dev/null || echo "$BODY"
  echo ""

  # Test 4: DELETE /api/v1/identifiers/{identifierId}
  echo "========================================="
  echo "TEST 4: DELETE Identifier"
  echo "========================================="
  echo "URL: $API_BASE/v1/identifiers/$IDENTIFIER_ID"
  echo ""

  DELETE_RESPONSE=$(curl -s -w "\nHTTP_STATUS:%{http_code}" \
    -X DELETE "$API_BASE/v1/identifiers/$IDENTIFIER_ID" \
    -H "Authorization: Bearer $TOKEN")

  HTTP_STATUS=$(echo "$DELETE_RESPONSE" | grep "HTTP_STATUS:" | cut -d: -f2)
  BODY=$(echo "$DELETE_RESPONSE" | sed '/HTTP_STATUS:/d')

  echo "Response Status: $HTTP_STATUS"
  echo "Response Body:"
  echo "$BODY" | jq '.' 2>/dev/null || echo "$BODY"
  echo ""
else
  echo "✗ Failed to create identifier. Skipping update/delete tests."
  echo ""
fi

echo "========================================="
echo "Test Summary"
echo "========================================="
echo "All tests completed. Review the results above."
echo ""
