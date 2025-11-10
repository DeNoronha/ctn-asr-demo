#!/bin/bash

# ============================================
# Step 2: Send Verification Email Test
# ============================================
# Endpoint: POST /endpoints/{endpoint_id}/send-verification
# Purpose: Send verification email (mock) and update status to SENT
# Last Updated: November 10, 2025
# ============================================

set -e

API_BASE_URL="https://func-ctn-demo-asr-dev.azurewebsites.net/api/v1"
TOKEN=$(cat /tmp/asr-api-token.txt)
ENDPOINT_ID=$(cat /tmp/asr-test-endpoint-id.txt)

echo "============================================"
echo "Test: Send Verification Email"
echo "============================================"
echo ""
echo "Endpoint: POST /endpoints/$ENDPOINT_ID/send-verification"
echo ""

# Test 2.1: Send verification email
echo "Test 2.1: Send verification email (mock)"
RESPONSE=$(curl -s -w "\nHTTP_STATUS:%{http_code}" -X POST \
  "$API_BASE_URL/endpoints/$ENDPOINT_ID/send-verification" \
  -H "Authorization: Bearer $TOKEN")

HTTP_STATUS=$(echo "$RESPONSE" | grep "HTTP_STATUS" | cut -d':' -f2)
BODY=$(echo "$RESPONSE" | sed '/HTTP_STATUS/d')

if [ "$HTTP_STATUS" = "200" ]; then
  echo "✓ Status: 200 OK"

  # Verify response contains token (dev mode)
  if echo "$BODY" | grep -q '"token"'; then
    VERIFICATION_TOKEN=$(echo "$BODY" | grep -o '"token":"[^"]*' | cut -d'"' -f4)
    echo "✓ Verification token received: ${VERIFICATION_TOKEN:0:20}..."
    echo "$VERIFICATION_TOKEN" > /tmp/asr-test-verification-token.txt
  else
    echo "✗ Missing token in response"
  fi

  # Verify mock flag
  if echo "$BODY" | grep -q '"mock":true'; then
    echo "✓ Mock flag present (development mode)"
  else
    echo "⚠ Mock flag not present"
  fi

  # Verify message
  if echo "$BODY" | grep -qi "verification.*sent"; then
    echo "✓ Success message present"
  fi

  # Verify expiration time
  if echo "$BODY" | grep -q '"expires_at"'; then
    echo "✓ Expiration timestamp present"
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

# Test 2.2: Invalid endpoint ID
echo "Test 2.2: Invalid endpoint ID"
RESPONSE=$(curl -s -w "\nHTTP_STATUS:%{http_code}" -X POST \
  "$API_BASE_URL/endpoints/00000000-0000-0000-0000-000000000000/send-verification" \
  -H "Authorization: Bearer $TOKEN")

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

# Test 2.3: Invalid UUID format
echo "Test 2.3: Invalid UUID format"
RESPONSE=$(curl -s -w "\nHTTP_STATUS:%{http_code}" -X POST \
  "$API_BASE_URL/endpoints/not-a-uuid/send-verification" \
  -H "Authorization: Bearer $TOKEN")

HTTP_STATUS=$(echo "$RESPONSE" | grep "HTTP_STATUS" | cut -d':' -f2)
BODY=$(echo "$RESPONSE" | sed '/HTTP_STATUS/d')

if [ "$HTTP_STATUS" = "400" ]; then
  echo "✓ Status: 400 Bad Request (as expected)"
  if echo "$BODY" | grep -qi "uuid"; then
    echo "✓ Error message mentions UUID validation"
  fi
else
  echo "✗ Expected 400, got: $HTTP_STATUS"
fi

echo ""
echo "--------------------------------------------"

# Test 2.4: Resend verification (should work)
echo "Test 2.4: Resend verification email"
RESPONSE=$(curl -s -w "\nHTTP_STATUS:%{http_code}" -X POST \
  "$API_BASE_URL/endpoints/$ENDPOINT_ID/send-verification" \
  -H "Authorization: Bearer $TOKEN")

HTTP_STATUS=$(echo "$RESPONSE" | grep "HTTP_STATUS" | cut -d':' -f2)
BODY=$(echo "$RESPONSE" | sed '/HTTP_STATUS/d')

if [ "$HTTP_STATUS" = "200" ]; then
  echo "✓ Status: 200 OK (resend successful)"
  if echo "$BODY" | grep -q '"token"'; then
    NEW_TOKEN=$(echo "$BODY" | grep -o '"token":"[^"]*' | cut -d'"' -f4)
    echo "✓ New verification token received"
    echo "$NEW_TOKEN" > /tmp/asr-test-verification-token.txt
  fi
else
  echo "✗ Unexpected status: $HTTP_STATUS"
fi

echo ""
echo "============================================"
echo "✓ Send Verification Tests Complete"
echo "============================================"
echo "Verification token saved to: /tmp/asr-test-verification-token.txt"
echo ""
