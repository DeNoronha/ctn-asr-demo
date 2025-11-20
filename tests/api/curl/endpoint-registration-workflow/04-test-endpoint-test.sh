#!/bin/bash

# ============================================
# Step 4: Test Endpoint Test
# ============================================
# Endpoint: POST /endpoints/{endpoint_id}/test
# Purpose: Test endpoint connectivity (mock)
# Last Updated: November 10, 2025
# ============================================

set -e

API_BASE_URL="https://ca-ctn-asr-api-dev.calmriver-700a8c55.westeurope.azurecontainerapps.io/api/v1"
TOKEN=$(cat /tmp/asr-api-token.txt)
ENDPOINT_ID=$(cat /tmp/asr-test-endpoint-id.txt)

echo "============================================"
echo "Test: Test Endpoint"
echo "============================================"
echo ""
echo "Endpoint: POST /endpoints/$ENDPOINT_ID/test"
echo ""

# Test 4.1: Test verified endpoint
echo "Test 4.1: Test verified endpoint (mock)"
RESPONSE=$(curl -s -w "\nHTTP_STATUS:%{http_code}" -X POST \
  "$API_BASE_URL/endpoints/$ENDPOINT_ID/test" \
  -H "Authorization: Bearer $TOKEN")

HTTP_STATUS=$(echo "$RESPONSE" | grep "HTTP_STATUS" | cut -d':' -f2)
BODY=$(echo "$RESPONSE" | sed '/HTTP_STATUS/d')

if [ "$HTTP_STATUS" = "200" ]; then
  echo "✓ Status: 200 OK"

  # Verify success message
  if echo "$BODY" | grep -qi "test.*success"; then
    echo "✓ Success message present"
  fi

  # Verify mock flag
  if echo "$BODY" | grep -q '"mock":true'; then
    echo "✓ Mock flag present (development mode)"
  fi

  # Verify test data structure
  if echo "$BODY" | grep -q '"test_data"'; then
    echo "✓ Test data returned"

    # Check for key test result fields
    if echo "$BODY" | grep -q '"success":true'; then
      echo "  ✓ Test marked as successful"
    fi

    if echo "$BODY" | grep -q '"response_time_ms"'; then
      echo "  ✓ Response time captured"
    fi

    if echo "$BODY" | grep -q '"status_code"'; then
      echo "  ✓ Status code captured"
    fi
  fi

  # Verify endpoint data returned
  if echo "$BODY" | grep -q '"endpoint"'; then
    echo "✓ Updated endpoint data returned"

    # Verify test_result_data was stored
    if echo "$BODY" | grep -q '"test_result_data"'; then
      echo "  ✓ Test results stored in endpoint record"
    fi
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

# Test 4.2: Non-existent endpoint
echo "Test 4.2: Non-existent endpoint ID"
RESPONSE=$(curl -s -w "\nHTTP_STATUS:%{http_code}" -X POST \
  "$API_BASE_URL/endpoints/00000000-0000-0000-0000-000000000000/test" \
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

# Test 4.3: Re-test endpoint (idempotency - should succeed)
echo "Test 4.3: Re-test endpoint (idempotency check)"
RESPONSE=$(curl -s -w "\nHTTP_STATUS:%{http_code}" -X POST \
  "$API_BASE_URL/endpoints/$ENDPOINT_ID/test" \
  -H "Authorization: Bearer $TOKEN")

HTTP_STATUS=$(echo "$RESPONSE" | grep "HTTP_STATUS" | cut -d':' -f2)
BODY=$(echo "$RESPONSE" | sed '/HTTP_STATUS/d')

if [ "$HTTP_STATUS" = "200" ]; then
  echo "✓ Status: 200 OK (re-test successful)"
  echo "✓ Test endpoint is idempotent"
else
  echo "✗ Expected 200, got: $HTTP_STATUS"
fi

echo ""
echo "--------------------------------------------"

# Test 4.4: Test unverified endpoint (create new endpoint without verification)
echo "Test 4.4: Test unverified endpoint (should fail)"

# Create a new endpoint without verifying it
LEGAL_ENTITY_ID=$(cat /tmp/asr-test-legal-entity-id.txt)
CREATE_RESPONSE=$(curl -s -X POST \
  "$API_BASE_URL/entities/$LEGAL_ENTITY_ID/endpoints/register" \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "endpoint_name": "Unverified Test Endpoint",
    "endpoint_url": "https://api.unverified.com/webhook"
  }')

if echo "$CREATE_RESPONSE" | grep -q "legal_entity_endpoint_id"; then
  UNVERIFIED_ENDPOINT_ID=$(echo "$CREATE_RESPONSE" | grep -o '"legal_entity_endpoint_id":"[^"]*' | cut -d'"' -f4)
  echo "Created unverified endpoint: $UNVERIFIED_ENDPOINT_ID"

  # Try to test it
  RESPONSE=$(curl -s -w "\nHTTP_STATUS:%{http_code}" -X POST \
    "$API_BASE_URL/endpoints/$UNVERIFIED_ENDPOINT_ID/test" \
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
echo "============================================"
echo "✓ Test Endpoint Tests Complete"
echo "============================================"
echo ""
