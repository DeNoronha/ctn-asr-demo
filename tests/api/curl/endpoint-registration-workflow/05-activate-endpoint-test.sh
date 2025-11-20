#!/bin/bash

# ============================================
# Step 5: Activate Endpoint Test
# ============================================
# Endpoint: POST /endpoints/{endpoint_id}/activate
# Purpose: Activate verified and tested endpoint
# Last Updated: November 10, 2025
# ============================================

set -e

API_BASE_URL="https://ca-ctn-asr-api-dev.calmriver-700a8c55.westeurope.azurecontainerapps.io/api/v1"
TOKEN=$(cat /tmp/asr-api-token.txt)
ENDPOINT_ID=$(cat /tmp/asr-test-endpoint-id.txt)

echo "============================================"
echo "Test: Activate Endpoint"
echo "============================================"
echo ""
echo "Endpoint: POST /endpoints/$ENDPOINT_ID/activate"
echo ""

# Test 5.1: Activate verified and tested endpoint
echo "Test 5.1: Activate verified and tested endpoint"
RESPONSE=$(curl -s -w "\nHTTP_STATUS:%{http_code}" -X POST \
  "$API_BASE_URL/endpoints/$ENDPOINT_ID/activate" \
  -H "Authorization: Bearer $TOKEN")

HTTP_STATUS=$(echo "$RESPONSE" | grep "HTTP_STATUS" | cut -d':' -f2)
BODY=$(echo "$RESPONSE" | sed '/HTTP_STATUS/d')

if [ "$HTTP_STATUS" = "200" ]; then
  echo "✓ Status: 200 OK"

  # Verify success message
  if echo "$BODY" | grep -qi "activated.*success"; then
    echo "✓ Success message present"
  fi

  # Verify endpoint is active
  if echo "$BODY" | grep -q '"is_active":true'; then
    echo "✓ Endpoint marked as active"
  else
    echo "✗ Endpoint not marked as active"
  fi

  # Verify activation date set
  if echo "$BODY" | grep -q '"activation_date"'; then
    echo "✓ Activation date recorded"
  else
    echo "✗ Activation date not set"
  fi

  # Verify endpoint data returned
  if echo "$BODY" | grep -q '"endpoint"'; then
    echo "✓ Updated endpoint data returned"
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

# Test 5.2: Non-existent endpoint
echo "Test 5.2: Non-existent endpoint ID"
RESPONSE=$(curl -s -w "\nHTTP_STATUS:%{http_code}" -X POST \
  "$API_BASE_URL/endpoints/00000000-0000-0000-0000-000000000000/activate" \
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

# Test 5.3: Activate already active endpoint (idempotency)
echo "Test 5.3: Re-activate already active endpoint (idempotency check)"
RESPONSE=$(curl -s -w "\nHTTP_STATUS:%{http_code}" -X POST \
  "$API_BASE_URL/endpoints/$ENDPOINT_ID/activate" \
  -H "Authorization: Bearer $TOKEN")

HTTP_STATUS=$(echo "$RESPONSE" | grep "HTTP_STATUS" | cut -d':' -f2)
BODY=$(echo "$RESPONSE" | sed '/HTTP_STATUS/d')

if [ "$HTTP_STATUS" = "200" ]; then
  echo "✓ Status: 200 OK (re-activation successful)"
  echo "✓ Activate endpoint is idempotent"
else
  echo "✗ Expected 200, got: $HTTP_STATUS"
fi

echo ""
echo "--------------------------------------------"

# Test 5.4: Activate unverified endpoint (should fail)
echo "Test 5.4: Activate unverified endpoint (should fail)"

# Create a new endpoint without verification
LEGAL_ENTITY_ID=$(cat /tmp/asr-test-legal-entity-id.txt)
CREATE_RESPONSE=$(curl -s -X POST \
  "$API_BASE_URL/entities/$LEGAL_ENTITY_ID/endpoints/register" \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "endpoint_name": "Unverified Activation Test",
    "endpoint_url": "https://api.unverified-activation.com/webhook"
  }')

if echo "$CREATE_RESPONSE" | grep -q "legal_entity_endpoint_id"; then
  UNVERIFIED_ENDPOINT_ID=$(echo "$CREATE_RESPONSE" | grep -o '"legal_entity_endpoint_id":"[^"]*' | cut -d'"' -f4)
  echo "Created unverified endpoint: $UNVERIFIED_ENDPOINT_ID"

  # Try to activate it
  RESPONSE=$(curl -s -w "\nHTTP_STATUS:%{http_code}" -X POST \
    "$API_BASE_URL/endpoints/$UNVERIFIED_ENDPOINT_ID/activate" \
    -H "Authorization: Bearer $TOKEN")

  HTTP_STATUS=$(echo "$RESPONSE" | grep "HTTP_STATUS" | cut -d':' -f2)
  BODY=$(echo "$RESPONSE" | sed '/HTTP_STATUS/d')

  if [ "$HTTP_STATUS" = "400" ]; then
    echo "✓ Status: 400 Bad Request (as expected)"
    if echo "$BODY" | grep -qi "verified"; then
      echo "✓ Error message mentions verification requirement"
    fi
  else
    echo "✗ Expected 400, got: $HTTP_STATUS"
  fi

  # Clean up unverified endpoint
  DELETE_RESPONSE=$(curl -s -X DELETE \
    "$API_BASE_URL/endpoints/$UNVERIFIED_ENDPOINT_ID" \
    -H "Authorization: Bearer $TOKEN")
  echo "✓ Cleaned up unverified endpoint"
else
  echo "⚠ Could not create unverified endpoint for test"
fi

echo ""
echo "--------------------------------------------"

# Test 5.5: Activate verified but untested endpoint (should fail)
echo "Test 5.5: Activate verified but untested endpoint (should fail)"

# Create another endpoint
CREATE_RESPONSE=$(curl -s -X POST \
  "$API_BASE_URL/entities/$LEGAL_ENTITY_ID/endpoints/register" \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "endpoint_name": "Untested Activation Test",
    "endpoint_url": "https://api.untested-activation.com/webhook"
  }')

if echo "$CREATE_RESPONSE" | grep -q "legal_entity_endpoint_id"; then
  UNTESTED_ENDPOINT_ID=$(echo "$CREATE_RESPONSE" | grep -o '"legal_entity_endpoint_id":"[^"]*' | cut -d'"' -f4)
  echo "Created endpoint: $UNTESTED_ENDPOINT_ID"

  # Send verification
  SEND_RESPONSE=$(curl -s -X POST \
    "$API_BASE_URL/endpoints/$UNTESTED_ENDPOINT_ID/send-verification" \
    -H "Authorization: Bearer $TOKEN")

  if echo "$SEND_RESPONSE" | grep -q '"token"'; then
    TEMP_TOKEN=$(echo "$SEND_RESPONSE" | grep -o '"token":"[^"]*' | cut -d'"' -f4)

    # Verify token
    VERIFY_RESPONSE=$(curl -s -X POST \
      "$API_BASE_URL/endpoints/$UNTESTED_ENDPOINT_ID/verify-token" \
      -H "Authorization: Bearer $TOKEN" \
      -H "Content-Type: application/json" \
      -d "{\"token\": \"$TEMP_TOKEN\"}")

    if echo "$VERIFY_RESPONSE" | grep -q "VERIFIED"; then
      echo "✓ Endpoint verified"

      # Try to activate without testing
      RESPONSE=$(curl -s -w "\nHTTP_STATUS:%{http_code}" -X POST \
        "$API_BASE_URL/endpoints/$UNTESTED_ENDPOINT_ID/activate" \
        -H "Authorization: Bearer $TOKEN")

      HTTP_STATUS=$(echo "$RESPONSE" | grep "HTTP_STATUS" | cut -d':' -f2)
      BODY=$(echo "$RESPONSE" | sed '/HTTP_STATUS/d')

      if [ "$HTTP_STATUS" = "400" ]; then
        echo "✓ Status: 400 Bad Request (as expected)"
        if echo "$BODY" | grep -qi "test"; then
          echo "✓ Error message mentions testing requirement"
        fi
      else
        echo "✗ Expected 400, got: $HTTP_STATUS"
      fi
    fi

    # Clean up
    DELETE_RESPONSE=$(curl -s -X DELETE \
      "$API_BASE_URL/endpoints/$UNTESTED_ENDPOINT_ID" \
      -H "Authorization: Bearer $TOKEN")
    echo "✓ Cleaned up untested endpoint"
  fi
else
  echo "⚠ Could not create endpoint for test"
fi

echo ""
echo "============================================"
echo "✓ Activate Endpoint Tests Complete"
echo "============================================"
echo ""
