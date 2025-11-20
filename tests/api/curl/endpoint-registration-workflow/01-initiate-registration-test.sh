#!/bin/bash

# ============================================
# Step 1: Initiate Endpoint Registration Test
# ============================================
# Endpoint: POST /entities/{legal_entity_id}/endpoints/register
# Purpose: Create endpoint in PENDING status with verification token
# Last Updated: November 10, 2025
# ============================================

set -e

API_BASE_URL="https://ca-ctn-asr-api-dev.calmriver-700a8c55.westeurope.azurecontainerapps.io/api/v1"
TOKEN=$(cat /tmp/asr-api-token.txt)
LEGAL_ENTITY_ID=$(cat /tmp/asr-test-legal-entity-id.txt)

echo "============================================"
echo "Test: Initiate Endpoint Registration"
echo "============================================"
echo ""
echo "Endpoint: POST /entities/$LEGAL_ENTITY_ID/endpoints/register"
echo ""

# Test 1: Valid registration
echo "Test 1.1: Valid endpoint registration"
RESPONSE=$(curl -s -w "\nHTTP_STATUS:%{http_code}" -X POST \
  "$API_BASE_URL/entities/$LEGAL_ENTITY_ID/endpoints/register" \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "endpoint_name": "Test API Endpoint",
    "endpoint_url": "https://api.example.com/webhook",
    "endpoint_description": "Test endpoint for automated testing",
    "data_category": "DATA_EXCHANGE",
    "endpoint_type": "REST_API"
  }')

HTTP_STATUS=$(echo "$RESPONSE" | grep "HTTP_STATUS" | cut -d':' -f2)
BODY=$(echo "$RESPONSE" | sed '/HTTP_STATUS/d')

if [ "$HTTP_STATUS" = "201" ]; then
  echo "✓ Status: 201 Created"
  ENDPOINT_ID=$(echo "$BODY" | grep -o '"legal_entity_endpoint_id":"[^"]*' | cut -d'"' -f4)
  echo "✓ Endpoint ID: $ENDPOINT_ID"
  echo "$ENDPOINT_ID" > /tmp/asr-test-endpoint-id.txt

  # Verify response structure
  if echo "$BODY" | grep -q '"verification_token"'; then
    echo "✓ Verification token generated"
  else
    echo "✗ Missing verification_token in response"
  fi

  if echo "$BODY" | grep -q '"verification_status":"PENDING"'; then
    echo "✓ Status set to PENDING"
  else
    echo "✗ Verification status not PENDING"
  fi

  if echo "$BODY" | grep -q '"is_active":false'; then
    echo "✓ Endpoint marked as inactive"
  else
    echo "✗ Endpoint should be inactive initially"
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

# Test 1.2: Missing required field (endpoint_name)
echo "Test 1.2: Missing required field (endpoint_name)"
RESPONSE=$(curl -s -w "\nHTTP_STATUS:%{http_code}" -X POST \
  "$API_BASE_URL/entities/$LEGAL_ENTITY_ID/endpoints/register" \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "endpoint_url": "https://api.example.com/webhook"
  }')

HTTP_STATUS=$(echo "$RESPONSE" | grep "HTTP_STATUS" | cut -d':' -f2)
BODY=$(echo "$RESPONSE" | sed '/HTTP_STATUS/d')

if [ "$HTTP_STATUS" = "400" ]; then
  echo "✓ Status: 400 Bad Request (as expected)"
  if echo "$BODY" | grep -q "endpoint_name"; then
    echo "✓ Error message mentions missing field"
  fi
else
  echo "✗ Expected 400, got: $HTTP_STATUS"
fi

echo ""
echo "--------------------------------------------"

# Test 1.3: Invalid URL (non-HTTPS)
echo "Test 1.3: Invalid URL (non-HTTPS)"
RESPONSE=$(curl -s -w "\nHTTP_STATUS:%{http_code}" -X POST \
  "$API_BASE_URL/entities/$LEGAL_ENTITY_ID/endpoints/register" \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "endpoint_name": "Insecure Endpoint",
    "endpoint_url": "http://api.example.com/webhook"
  }')

HTTP_STATUS=$(echo "$RESPONSE" | grep "HTTP_STATUS" | cut -d':' -f2)
BODY=$(echo "$RESPONSE" | sed '/HTTP_STATUS/d')

if [ "$HTTP_STATUS" = "400" ]; then
  echo "✓ Status: 400 Bad Request (as expected)"
  if echo "$BODY" | grep -qi "https"; then
    echo "✓ Error message mentions HTTPS requirement"
  fi
else
  echo "✗ Expected 400, got: $HTTP_STATUS"
fi

echo ""
echo "--------------------------------------------"

# Test 1.4: Invalid UUID format
echo "Test 1.4: Invalid legal_entity_id format"
RESPONSE=$(curl -s -w "\nHTTP_STATUS:%{http_code}" -X POST \
  "$API_BASE_URL/entities/not-a-uuid/endpoints/register" \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "endpoint_name": "Test Endpoint",
    "endpoint_url": "https://api.example.com/webhook"
  }')

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
echo "============================================"
echo "✓ Initiate Registration Tests Complete"
echo "============================================"
echo "Endpoint ID saved to: /tmp/asr-test-endpoint-id.txt"
echo ""
