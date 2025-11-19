#!/bin/bash

# ============================================
# Test Generic Identifier Verification Endpoints
# ============================================
# Purpose: Test new verification endpoints for Task 5
# Endpoints:
#   - GET /v1/legal-entities/{legalEntityId}/verifications
#   - POST /v1/legal-entities/{legalEntityId}/verifications
# Last Updated: November 6, 2025
# ============================================

set -e

API_BASE="https://func-ctn-demo-asr-dev.azurewebsites.net/api/v1"
TOKEN=$(cat /tmp/asr-api-token.txt)

if [ -z "$TOKEN" ]; then
  echo "✗ No token found. Run get-token.sh first."
  exit 1
fi

echo "============================================"
echo "Testing Generic Identifier Verification"
echo "============================================"
echo ""

# Step 1: Get a legal entity to test with
echo "[1/5] Getting legal entities..."
LEGAL_ENTITIES_RESPONSE=$(curl -s -X GET "$API_BASE/legal-entities" \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json")

# Check if response is valid JSON
if echo "$LEGAL_ENTITIES_RESPONSE" | jq empty 2>/dev/null; then
  LEGAL_ENTITY_ID=$(echo "$LEGAL_ENTITIES_RESPONSE" | jq -r '.data[0].id // empty')
  LEGAL_ENTITY_NAME=$(echo "$LEGAL_ENTITIES_RESPONSE" | jq -r '.data[0].legal_name // empty')

  if [ -z "$LEGAL_ENTITY_ID" ]; then
    echo "✗ No legal entities found in response"
    echo "Response: $LEGAL_ENTITIES_RESPONSE"
    exit 1
  fi

  echo "✓ Legal Entity: $LEGAL_ENTITY_NAME ($LEGAL_ENTITY_ID)"
else
  echo "✗ Invalid JSON response from /legal-entities"
  echo "Response: $LEGAL_ENTITIES_RESPONSE"
  exit 1
fi
echo ""

# Step 2: Get existing identifiers for this legal entity
echo "[2/5] Getting identifiers for legal entity..."
IDENTIFIERS_RESPONSE=$(curl -s -X GET "$API_BASE/legal-entities/$LEGAL_ENTITY_ID/identifiers" \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json")

if echo "$IDENTIFIERS_RESPONSE" | jq empty 2>/dev/null; then
  IDENTIFIER_COUNT=$(echo "$IDENTIFIERS_RESPONSE" | jq 'length')
  echo "✓ Found $IDENTIFIER_COUNT identifiers"

  # Show first identifier if exists
  if [ "$IDENTIFIER_COUNT" -gt 0 ]; then
    FIRST_IDENTIFIER=$(echo "$IDENTIFIERS_RESPONSE" | jq '.[0]')
    IDENTIFIER_TYPE=$(echo "$FIRST_IDENTIFIER" | jq -r '.identifier_type')
    IDENTIFIER_VALUE=$(echo "$FIRST_IDENTIFIER" | jq -r '.identifier_value')
    echo "  - Example: $IDENTIFIER_TYPE = $IDENTIFIER_VALUE"
  fi
else
  echo "✗ Invalid JSON response from /identifiers"
  echo "Response: $IDENTIFIERS_RESPONSE"
  exit 1
fi
echo ""

# Step 3: Get verification history (should return empty array or existing verifications)
echo "[3/5] Getting verification history..."
VERIFICATIONS_RESPONSE=$(curl -s -w "\nHTTP_CODE:%{http_code}" -X GET \
  "$API_BASE/legal-entities/$LEGAL_ENTITY_ID/verifications" \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json")

HTTP_CODE=$(echo "$VERIFICATIONS_RESPONSE" | grep "HTTP_CODE:" | cut -d':' -f2)
RESPONSE_BODY=$(echo "$VERIFICATIONS_RESPONSE" | sed '/HTTP_CODE:/d')

if [ "$HTTP_CODE" = "200" ]; then
  if echo "$RESPONSE_BODY" | jq empty 2>/dev/null; then
    VERIFICATION_COUNT=$(echo "$RESPONSE_BODY" | jq 'length')
    echo "✓ GET verifications: HTTP $HTTP_CODE - Found $VERIFICATION_COUNT verifications"

    if [ "$VERIFICATION_COUNT" -gt 0 ]; then
      echo "$RESPONSE_BODY" | jq '.[] | {id, identifier_type, verification_status, created_at}'
    fi
  else
    echo "✗ Invalid JSON in response"
    echo "Response: $RESPONSE_BODY"
  fi
elif [ "$HTTP_CODE" = "404" ]; then
  echo "✗ GET verifications: HTTP $HTTP_CODE - Endpoint not found (deployment issue)"
  echo "Response: $RESPONSE_BODY"
elif [ "$HTTP_CODE" = "500" ]; then
  echo "✗ GET verifications: HTTP $HTTP_CODE - Internal server error"
  echo "Response: $RESPONSE_BODY"
else
  echo "✗ GET verifications: HTTP $HTTP_CODE - Unexpected status"
  echo "Response: $RESPONSE_BODY"
fi
echo ""

# Step 4: Upload a verification document (if we have identifiers)
if [ "$IDENTIFIER_COUNT" -gt 0 ]; then
  echo "[4/5] Testing verification document upload..."

  # Create a test base64 PDF (minimal valid PDF)
  TEST_PDF_BASE64="JVBERi0xLjQKJeLjz9MKMSAwIG9iago8PC9UeXBlL0NhdGFsb2cvUGFnZXMgMiAwIFI+PgplbmRvYmoKMiAwIG9iago8PC9UeXBlL1BhZ2VzL0tpZHNbMyAwIFJdL0NvdW50IDE+PgplbmRvYmoKMyAwIG9iago8PC9UeXBlL1BhZ2UvTWVkaWFCb3hbMCAwIDYxMiA3OTJdL1BhcmVudCAyIDAgUj4+CmVuZG9iago0IDAgb2JqCjw8L0xlbmd0aCAzNj4+CnN0cmVhbQpCVAovRjEgMTIgVGYKMTAwIDcwMCBUZAooVEVTVCBET0NVTUVOVCkgVGoKRVQKZW5kc3RyZWFtCmVuZG9iagp4cmVmCjAgNQowMDAwMDAwMDAwIDY1NTM1IGYgCjAwMDAwMDAwMTggMDAwMDAgbiAKMDAwMDAwMDA3NyAwMDAwMCBuIAowMDAwMDAwMTc4IDAwMDAwIG4gCjAwMDAwMDAyNzMgMDAwMDAgbiAKdHJhaWxlcgo8PC9TaXplIDUvUm9vdCAxIDAgUj4+CnN0YXJ0eHJlZgozODQKJSVFT0YK"

  UPLOAD_PAYLOAD=$(cat <<EOF
{
  "identifier_type": "LEI",
  "document_name": "test-lei-verification.pdf",
  "document_data": "$TEST_PDF_BASE64",
  "notes": "API Test - Automated verification upload"
}
EOF
)

  UPLOAD_RESPONSE=$(curl -s -w "\nHTTP_CODE:%{http_code}" -X POST \
    "$API_BASE/legal-entities/$LEGAL_ENTITY_ID/verifications" \
    -H "Authorization: Bearer $TOKEN" \
    -H "Content-Type: application/json" \
    -d "$UPLOAD_PAYLOAD")

  HTTP_CODE=$(echo "$UPLOAD_RESPONSE" | grep "HTTP_CODE:" | cut -d':' -f2)
  RESPONSE_BODY=$(echo "$UPLOAD_RESPONSE" | sed '/HTTP_CODE:/d')

  if [ "$HTTP_CODE" = "201" ] || [ "$HTTP_CODE" = "200" ]; then
    if echo "$RESPONSE_BODY" | jq empty 2>/dev/null; then
      VERIFICATION_ID=$(echo "$RESPONSE_BODY" | jq -r '.id // empty')
      echo "✓ POST verification: HTTP $HTTP_CODE - Document uploaded successfully"
      echo "  Verification ID: $VERIFICATION_ID"

      # Save verification ID for cleanup
      echo "$VERIFICATION_ID" > /tmp/asr-test-verification-id.txt
    else
      echo "✓ POST verification: HTTP $HTTP_CODE (non-JSON response)"
      echo "Response: $RESPONSE_BODY"
    fi
  elif [ "$HTTP_CODE" = "404" ]; then
    echo "✗ POST verification: HTTP $HTTP_CODE - Endpoint not found (deployment issue)"
    echo "Response: $RESPONSE_BODY"
  elif [ "$HTTP_CODE" = "400" ]; then
    echo "✗ POST verification: HTTP $HTTP_CODE - Bad request (validation error)"
    echo "Response: $RESPONSE_BODY"
  elif [ "$HTTP_CODE" = "500" ]; then
    echo "✗ POST verification: HTTP $HTTP_CODE - Internal server error"
    echo "Response: $RESPONSE_BODY"
  else
    echo "✗ POST verification: HTTP $HTTP_CODE - Unexpected status"
    echo "Response: $RESPONSE_BODY"
  fi
else
  echo "[4/5] Skipping verification upload (no identifiers found)"
fi
echo ""

# Step 5: Verify the verification was created
echo "[5/5] Verifying upload was successful..."
FINAL_VERIFICATIONS=$(curl -s -X GET \
  "$API_BASE/legal-entities/$LEGAL_ENTITY_ID/verifications" \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json")

if echo "$FINAL_VERIFICATIONS" | jq empty 2>/dev/null; then
  FINAL_COUNT=$(echo "$FINAL_VERIFICATIONS" | jq 'length')
  echo "✓ Final verification count: $FINAL_COUNT"

  if [ -f /tmp/asr-test-verification-id.txt ]; then
    TEST_VERIFICATION_ID=$(cat /tmp/asr-test-verification-id.txt)
    echo "✓ Test created verification ID: $TEST_VERIFICATION_ID"
    echo ""
    echo "NOTE: Cleanup required - verification document uploaded"
    echo "      Manual cleanup: Delete verification $TEST_VERIFICATION_ID"
  fi
else
  echo "✗ Could not verify final state"
fi
echo ""

echo "============================================"
echo "Test Summary"
echo "============================================"
echo "Endpoints Tested:"
echo "  - GET  /v1/legal-entities/{id}/identifiers"
echo "  - GET  /v1/legal-entities/{id}/verifications"
echo "  - POST /v1/legal-entities/{id}/verifications"
echo ""
echo "Next Steps:"
echo "  1. Review test results above"
echo "  2. Check for any 404/500 errors"
echo "  3. Clean up test data if needed"
echo "============================================"
