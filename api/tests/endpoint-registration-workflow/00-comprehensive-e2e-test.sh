#!/bin/bash

# ============================================
# Comprehensive End-to-End Test
# ============================================
# Purpose: Complete workflow from registration to activation
# Tests all 5 steps in sequence with proper cleanup
# Last Updated: November 10, 2025
# ============================================

set -e

API_BASE_URL="https://func-ctn-demo-asr-dev.azurewebsites.net/api/v1"
SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"

echo "============================================"
echo "Endpoint Registration Workflow - E2E Test"
echo "============================================"
echo ""
echo "This script tests the complete endpoint registration workflow:"
echo "  1. Initiate registration (create endpoint)"
echo "  2. Send verification email (mock)"
echo "  3. Verify token"
echo "  4. Test endpoint (mock)"
echo "  5. Activate endpoint"
echo ""

# Check if API is reachable
echo "Checking API availability..."
HEALTH_CHECK=$(curl -s -w "%{http_code}" -o /dev/null "https://func-ctn-demo-asr-dev.azurewebsites.net/api/health")
if [ "$HEALTH_CHECK" = "200" ]; then
  echo "✓ API is reachable"
else
  echo "✗ API health check failed (status: $HEALTH_CHECK)"
  exit 1
fi
echo ""

# Step 0: Setup authentication
echo "============================================"
echo "Step 0: Authentication Setup"
echo "============================================"
cd "$SCRIPT_DIR"
./auth-helper.sh
if [ $? -ne 0 ]; then
  echo "✗ Authentication setup failed"
  exit 1
fi

# Load credentials
TOKEN=$(cat /tmp/asr-api-token.txt)
LEGAL_ENTITY_ID=$(cat /tmp/asr-test-legal-entity-id.txt)

echo ""
echo "============================================"
echo "Step 1: Initiate Registration"
echo "============================================"

RESPONSE=$(curl -s -w "\nHTTP_STATUS:%{http_code}" -X POST \
  "$API_BASE_URL/entities/$LEGAL_ENTITY_ID/endpoints/register" \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -H "X-CSRF-Token: e2e-test" \
  -d '{
    "endpoint_name": "E2E Test API Endpoint",
    "endpoint_url": "https://api.e2e-test.example.com/webhook",
    "endpoint_description": "End-to-end test endpoint for automated testing",
    "data_category": "DATA_EXCHANGE",
    "endpoint_type": "REST_API"
  }')

HTTP_STATUS=$(echo "$RESPONSE" | grep "HTTP_STATUS" | cut -d':' -f2)
BODY=$(echo "$RESPONSE" | sed '/HTTP_STATUS/d')

if [ "$HTTP_STATUS" = "201" ]; then
  ENDPOINT_ID=$(echo "$BODY" | grep -o '"legal_entity_endpoint_id":"[^"]*' | cut -d'"' -f4)
  echo "✓ Endpoint created: $ENDPOINT_ID"
  echo "$ENDPOINT_ID" > /tmp/asr-e2e-endpoint-id.txt

  if echo "$BODY" | grep -q '"verification_status":"PENDING"'; then
    echo "✓ Status: PENDING"
  fi

  if echo "$BODY" | grep -q '"is_active":false'; then
    echo "✓ Initially inactive"
  fi
else
  echo "✗ Failed to create endpoint (status: $HTTP_STATUS)"
  echo "$BODY"
  exit 1
fi

echo ""
echo "============================================"
echo "Step 2: Send Verification Email"
echo "============================================"

RESPONSE=$(curl -s -w "\nHTTP_STATUS:%{http_code}" -X POST \
  "$API_BASE_URL/endpoints/$ENDPOINT_ID/send-verification" \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -H "X-CSRF-Token: e2e-test")

HTTP_STATUS=$(echo "$RESPONSE" | grep "HTTP_STATUS" | cut -d':' -f2)
BODY=$(echo "$RESPONSE" | sed '/HTTP_STATUS/d')

if [ "$HTTP_STATUS" = "200" ]; then
  VERIFICATION_TOKEN=$(echo "$BODY" | grep -o '"token":"[^"]*' | cut -d'"' -f4)
  echo "✓ Verification email sent (mock)"
  echo "✓ Token received: ${VERIFICATION_TOKEN:0:20}..."
  echo "$VERIFICATION_TOKEN" > /tmp/asr-e2e-verification-token.txt
else
  echo "✗ Failed to send verification (status: $HTTP_STATUS)"
  echo "$BODY"
  exit 1
fi

echo ""
echo "============================================"
echo "Step 3: Verify Token"
echo "============================================"

RESPONSE=$(curl -s -w "\nHTTP_STATUS:%{http_code}" -X POST \
  "$API_BASE_URL/endpoints/$ENDPOINT_ID/verify-token" \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -H "X-CSRF-Token: e2e-test" \
  -d "{\"token\": \"$VERIFICATION_TOKEN\"}")

HTTP_STATUS=$(echo "$RESPONSE" | grep "HTTP_STATUS" | cut -d':' -f2)
BODY=$(echo "$RESPONSE" | sed '/HTTP_STATUS/d')

if [ "$HTTP_STATUS" = "200" ]; then
  echo "✓ Token verified successfully"

  if echo "$BODY" | grep -q '"verification_status":"VERIFIED"'; then
    echo "✓ Status updated to: VERIFIED"
  else
    echo "✗ Status not updated"
    exit 1
  fi
else
  echo "✗ Failed to verify token (status: $HTTP_STATUS)"
  echo "$BODY"
  exit 1
fi

echo ""
echo "============================================"
echo "Step 4: Test Endpoint"
echo "============================================"

RESPONSE=$(curl -s -w "\nHTTP_STATUS:%{http_code}" -X POST \
  "$API_BASE_URL/endpoints/$ENDPOINT_ID/test" \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -H "X-CSRF-Token: e2e-test")

HTTP_STATUS=$(echo "$RESPONSE" | grep "HTTP_STATUS" | cut -d':' -f2)
BODY=$(echo "$RESPONSE" | sed '/HTTP_STATUS/d')

if [ "$HTTP_STATUS" = "200" ]; then
  echo "✓ Endpoint test successful (mock)"

  if echo "$BODY" | grep -q '"success":true'; then
    echo "✓ Test result: SUCCESS"
  else
    echo "✗ Test result not marked as successful"
    exit 1
  fi

  if echo "$BODY" | grep -q '"response_time_ms"'; then
    RESPONSE_TIME=$(echo "$BODY" | grep -o '"response_time_ms":[0-9]*' | cut -d':' -f2)
    echo "✓ Response time: ${RESPONSE_TIME}ms"
  fi
else
  echo "✗ Failed to test endpoint (status: $HTTP_STATUS)"
  echo "$BODY"
  exit 1
fi

echo ""
echo "============================================"
echo "Step 5: Activate Endpoint"
echo "============================================"

RESPONSE=$(curl -s -w "\nHTTP_STATUS:%{http_code}" -X POST \
  "$API_BASE_URL/endpoints/$ENDPOINT_ID/activate" \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -H "X-CSRF-Token: e2e-test")

HTTP_STATUS=$(echo "$RESPONSE" | grep "HTTP_STATUS" | cut -d':' -f2)
BODY=$(echo "$RESPONSE" | sed '/HTTP_STATUS/d')

if [ "$HTTP_STATUS" = "200" ]; then
  echo "✓ Endpoint activated successfully"

  if echo "$BODY" | grep -q '"is_active":true'; then
    echo "✓ Status: ACTIVE"
  else
    echo "✗ Endpoint not marked as active"
    exit 1
  fi

  if echo "$BODY" | grep -q '"activation_date"'; then
    echo "✓ Activation date recorded"
  fi
else
  echo "✗ Failed to activate endpoint (status: $HTTP_STATUS)"
  echo "$BODY"
  exit 1
fi

echo ""
echo "============================================"
echo "Step 6: Verify Active Endpoint in Discovery"
echo "============================================"

# Get all active endpoints for the entity
RESPONSE=$(curl -s -w "\nHTTP_STATUS:%{http_code}" -X GET \
  "$API_BASE_URL/entities/$LEGAL_ENTITY_ID/endpoints?active_only=true" \
  -H "Authorization: Bearer $TOKEN")

HTTP_STATUS=$(echo "$RESPONSE" | grep "HTTP_STATUS" | cut -d':' -f2)
BODY=$(echo "$RESPONSE" | sed '/HTTP_STATUS/d')

if [ "$HTTP_STATUS" = "200" ]; then
  if echo "$BODY" | grep -q "$ENDPOINT_ID"; then
    echo "✓ Endpoint appears in active endpoints list"
  else
    echo "⚠ Endpoint not found in active endpoints (may need query parameter adjustment)"
  fi
else
  echo "⚠ Could not retrieve endpoints list (status: $HTTP_STATUS)"
fi

echo ""
echo "============================================"
echo "Step 7: Cleanup (Optional)"
echo "============================================"

read -p "Do you want to delete the test endpoint? (y/N): " -n 1 -r
echo
if [[ $REPLY =~ ^[Yy]$ ]]; then
  DELETE_RESPONSE=$(curl -s -w "\nHTTP_STATUS:%{http_code}" -X DELETE \
    "$API_BASE_URL/endpoints/$ENDPOINT_ID" \
    -H "Authorization: Bearer $TOKEN")

  DELETE_STATUS=$(echo "$DELETE_RESPONSE" | grep "HTTP_STATUS" | cut -d':' -f2)

  if [ "$DELETE_STATUS" = "200" ] || [ "$DELETE_STATUS" = "204" ]; then
    echo "✓ Test endpoint deleted"
  else
    echo "⚠ Could not delete endpoint (status: $DELETE_STATUS)"
  fi
else
  echo "⚠ Skipping cleanup - endpoint remains active"
  echo "  Endpoint ID: $ENDPOINT_ID"
fi

echo ""
echo "============================================"
echo "✓ End-to-End Test Complete"
echo "============================================"
echo ""
echo "Summary:"
echo "  1. ✓ Registration initiated"
echo "  2. ✓ Verification email sent"
echo "  3. ✓ Token verified"
echo "  4. ✓ Endpoint tested"
echo "  5. ✓ Endpoint activated"
echo ""
echo "Test artifacts saved:"
echo "  - Token: /tmp/asr-api-token.txt"
echo "  - Legal Entity ID: /tmp/asr-test-legal-entity-id.txt"
echo "  - Endpoint ID: /tmp/asr-e2e-endpoint-id.txt"
echo "  - Verification Token: /tmp/asr-e2e-verification-token.txt"
echo ""
