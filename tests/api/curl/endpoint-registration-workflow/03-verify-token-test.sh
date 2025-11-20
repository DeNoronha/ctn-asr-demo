#!/bin/bash

# ============================================
# Step 3: Verify Token Test
# ============================================
# Endpoint: POST /endpoints/{endpoint_id}/verify-token
# Purpose: Validate verification token and update status to VERIFIED
# Last Updated: November 10, 2025
# ============================================

set -e

API_BASE_URL="https://ca-ctn-asr-api-dev.calmriver-700a8c55.westeurope.azurecontainerapps.io/api/v1"
TOKEN=$(cat /tmp/asr-api-token.txt)
ENDPOINT_ID=$(cat /tmp/asr-test-endpoint-id.txt)
VERIFICATION_TOKEN=$(cat /tmp/asr-test-verification-token.txt)

echo "============================================"
echo "Test: Verify Token"
echo "============================================"
echo ""
echo "Endpoint: POST /endpoints/$ENDPOINT_ID/verify-token"
echo ""

# Test 3.1: Valid token verification
echo "Test 3.1: Valid token verification"
RESPONSE=$(curl -s -w "\nHTTP_STATUS:%{http_code}" -X POST \
  "$API_BASE_URL/endpoints/$ENDPOINT_ID/verify-token" \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d "{
    \"token\": \"$VERIFICATION_TOKEN\"
  }")

HTTP_STATUS=$(echo "$RESPONSE" | grep "HTTP_STATUS" | cut -d':' -f2)
BODY=$(echo "$RESPONSE" | sed '/HTTP_STATUS/d')

if [ "$HTTP_STATUS" = "200" ]; then
  echo "✓ Status: 200 OK"

  # Verify success message
  if echo "$BODY" | grep -qi "verified.*success"; then
    echo "✓ Success message present"
  fi

  # Verify endpoint status updated
  if echo "$BODY" | grep -q '"verification_status":"VERIFIED"'; then
    echo "✓ Status updated to VERIFIED"
  else
    echo "✗ Status not updated to VERIFIED"
  fi

  # Verify endpoint data returned
  if echo "$BODY" | grep -q '"endpoint"'; then
    echo "✓ Endpoint data returned"
  fi

  echo ""
  echo "Response:"
  echo "$BODY" | python3 -m json.tool 2>/dev/null || echo "$BODY"
else
  echo "✗ Unexpected status: $HTTP_STATUS"
  echo "Response: $BODY"
  exit 1
fi

echo ""
echo "--------------------------------------------"

# Test 3.2: Invalid token
echo "Test 3.2: Invalid verification token"
RESPONSE=$(curl -s -w "\nHTTP_STATUS:%{http_code}" -X POST \
  "$API_BASE_URL/endpoints/$ENDPOINT_ID/verify-token" \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "token": "invalid-token-12345"
  }')

HTTP_STATUS=$(echo "$RESPONSE" | grep "HTTP_STATUS" | cut -d':' -f2)
BODY=$(echo "$RESPONSE" | sed '/HTTP_STATUS/d')

if [ "$HTTP_STATUS" = "400" ]; then
  echo "✓ Status: 400 Bad Request (as expected)"
  if echo "$BODY" | grep -qi "invalid.*token"; then
    echo "✓ Error message mentions invalid token"
  fi
else
  echo "✗ Expected 400, got: $HTTP_STATUS"
fi

echo ""
echo "--------------------------------------------"

# Test 3.3: Missing token in request
echo "Test 3.3: Missing token in request body"
RESPONSE=$(curl -s -w "\nHTTP_STATUS:%{http_code}" -X POST \
  "$API_BASE_URL/endpoints/$ENDPOINT_ID/verify-token" \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{}')

HTTP_STATUS=$(echo "$RESPONSE" | grep "HTTP_STATUS" | cut -d':' -f2)
BODY=$(echo "$RESPONSE" | sed '/HTTP_STATUS/d')

if [ "$HTTP_STATUS" = "400" ]; then
  echo "✓ Status: 400 Bad Request (as expected)"
  if echo "$BODY" | grep -qi "token.*required"; then
    echo "✓ Error message mentions token required"
  fi
else
  echo "✗ Expected 400, got: $HTTP_STATUS"
fi

echo ""
echo "--------------------------------------------"

# Test 3.4: Non-existent endpoint
echo "Test 3.4: Non-existent endpoint ID"
RESPONSE=$(curl -s -w "\nHTTP_STATUS:%{http_code}" -X POST \
  "$API_BASE_URL/endpoints/00000000-0000-0000-0000-000000000000/verify-token" \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d "{
    \"token\": \"$VERIFICATION_TOKEN\"
  }")

HTTP_STATUS=$(echo "$RESPONSE" | grep "HTTP_STATUS" | cut -d':' -f2)
BODY=$(echo "$RESPONSE" | sed '/HTTP_STATUS/d')

if [ "$HTTP_STATUS" = "404" ]; then
  echo "✓ Status: 404 Not Found (as expected)"
  if echo "$BODY" | grep -qi "not found"; then
    echo "✓ Error message mentions endpoint not found"
  fi
else
  echo "✗ Expected 404, got: $HTTP_STATUS"
fi

echo ""
echo "--------------------------------------------"

# Test 3.5: Already verified (idempotency - should succeed or return 400)
echo "Test 3.5: Re-verify already verified token (idempotency check)"
RESPONSE=$(curl -s -w "\nHTTP_STATUS:%{http_code}" -X POST \
  "$API_BASE_URL/endpoints/$ENDPOINT_ID/verify-token" \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d "{
    \"token\": \"$VERIFICATION_TOKEN\"
  }")

HTTP_STATUS=$(echo "$RESPONSE" | grep "HTTP_STATUS" | cut -d':' -f2)
BODY=$(echo "$RESPONSE" | sed '/HTTP_STATUS/d')

if [ "$HTTP_STATUS" = "200" ] || [ "$HTTP_STATUS" = "400" ]; then
  echo "✓ Status: $HTTP_STATUS (idempotent behavior)"
else
  echo "⚠ Unexpected status: $HTTP_STATUS"
fi

echo ""
echo "============================================"
echo "✓ Verify Token Tests Complete"
echo "============================================"
echo ""
