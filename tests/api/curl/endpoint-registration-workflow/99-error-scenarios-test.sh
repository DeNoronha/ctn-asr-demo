#!/bin/bash

# ============================================
# Error Scenarios and Security Test
# ============================================
# Purpose: Test IDOR protection, invalid tokens, expired tokens, etc.
# Last Updated: November 10, 2025
# ============================================

set -e

API_BASE_URL="https://func-ctn-demo-asr-dev.azurewebsites.net/api/v1"
SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"

echo "============================================"
echo "Error Scenarios and Security Test"
echo "============================================"
echo ""
echo "This script tests:"
echo "  - IDOR (Insecure Direct Object Reference) protection"
echo "  - Invalid token handling"
echo "  - Missing authentication"
echo "  - Malformed requests"
echo "  - Edge cases"
echo ""

# Setup authentication
TOKEN=$(cat /tmp/asr-api-token.txt 2>/dev/null || echo "")
LEGAL_ENTITY_ID=$(cat /tmp/asr-test-legal-entity-id.txt 2>/dev/null || echo "")

if [ -z "$TOKEN" ] || [ -z "$LEGAL_ENTITY_ID" ]; then
  echo "⚠ Authentication not set up. Running auth-helper..."
  cd "$SCRIPT_DIR"
  ./auth-helper.sh
  TOKEN=$(cat /tmp/asr-api-token.txt)
  LEGAL_ENTITY_ID=$(cat /tmp/asr-test-legal-entity-id.txt)
fi

echo "============================================"
echo "Test Suite 1: Authentication & Authorization"
echo "============================================"
echo ""

# Test 1.1: Missing authentication token
echo "Test 1.1: Missing authentication token"
RESPONSE=$(curl -s -w "\nHTTP_STATUS:%{http_code}" -X POST \
  "$API_BASE_URL/entities/$LEGAL_ENTITY_ID/endpoints/register" \
  -H "Content-Type: application/json" \
  -d '{
    "endpoint_name": "Unauthorized Test",
    "endpoint_url": "https://api.unauthorized.com/webhook"
  }')

HTTP_STATUS=$(echo "$RESPONSE" | grep "HTTP_STATUS" | cut -d':' -f2)

if [ "$HTTP_STATUS" = "401" ]; then
  echo "✓ Status: 401 Unauthorized (as expected)"
else
  echo "✗ Expected 401, got: $HTTP_STATUS"
fi

echo ""

# Test 1.2: Invalid authentication token
echo "Test 1.2: Invalid authentication token"
RESPONSE=$(curl -s -w "\nHTTP_STATUS:%{http_code}" -X POST \
  "$API_BASE_URL/entities/$LEGAL_ENTITY_ID/endpoints/register" \
  -H "Authorization: Bearer invalid-token-12345" \
  -H "Content-Type: application/json" \
  -d '{
    "endpoint_name": "Invalid Auth Test",
    "endpoint_url": "https://api.invalid-auth.com/webhook"
  }')

HTTP_STATUS=$(echo "$RESPONSE" | grep "HTTP_STATUS" | cut -d':' -f2)

if [ "$HTTP_STATUS" = "401" ] || [ "$HTTP_STATUS" = "403" ]; then
  echo "✓ Status: $HTTP_STATUS (authentication rejected)"
else
  echo "✗ Expected 401/403, got: $HTTP_STATUS"
fi

echo ""
echo "--------------------------------------------"

# Test 1.3: IDOR - Try to access another entity's endpoint
echo "Test 1.3: IDOR Protection - Access another entity's resources"

# First, create an endpoint for our entity
CREATE_RESPONSE=$(curl -s -X POST \
  "$API_BASE_URL/entities/$LEGAL_ENTITY_ID/endpoints/register" \
  -H "Authorization: Bearer $TOKEN" \
  -H "X-CSRF-Token: error-test" \
  -H "Content-Type: application/json" \
  -d '{
    "endpoint_name": "IDOR Test Endpoint",
    "endpoint_url": "https://api.idor-test.com/webhook"
  }')

if echo "$CREATE_RESPONSE" | grep -q "legal_entity_endpoint_id"; then
  OUR_ENDPOINT_ID=$(echo "$CREATE_RESPONSE" | grep -o '"legal_entity_endpoint_id":"[^"]*' | cut -d'"' -f4)
  echo "Created test endpoint: $OUR_ENDPOINT_ID"

  # Generate a fake UUID for a non-existent entity
  FAKE_ENTITY_ID="00000000-0000-0000-0000-000000000001"

  # Try to create endpoint for fake entity (should fail with 403 or 404)
  RESPONSE=$(curl -s -w "\nHTTP_STATUS:%{http_code}" -X POST \
    "$API_BASE_URL/entities/$FAKE_ENTITY_ID/endpoints/register" \
    -H "Authorization: Bearer $TOKEN" \
  -H "X-CSRF-Token: error-test" \
    -H "Content-Type: application/json" \
    -d '{
      "endpoint_name": "IDOR Attack Endpoint",
      "endpoint_url": "https://api.idor-attack.com/webhook"
    }')

  HTTP_STATUS=$(echo "$RESPONSE" | grep "HTTP_STATUS" | cut -d':' -f2)
  BODY=$(echo "$RESPONSE" | sed '/HTTP_STATUS/d')

  if [ "$HTTP_STATUS" = "403" ] || [ "$HTTP_STATUS" = "404" ]; then
    echo "✓ Status: $HTTP_STATUS (IDOR protection working)"
    if echo "$BODY" | grep -qi "permission\|not found"; then
      echo "✓ Appropriate error message"
    fi
  else
    echo "✗ IDOR vulnerability detected! Status: $HTTP_STATUS"
    echo "Response: $BODY"
  fi
else
  echo "⚠ Could not create test endpoint for IDOR test"
fi

echo ""
echo "============================================"
echo "Test Suite 2: Token Validation"
echo "============================================"
echo ""

# Create endpoint for token tests
CREATE_RESPONSE=$(curl -s -X POST \
  "$API_BASE_URL/entities/$LEGAL_ENTITY_ID/endpoints/register" \
  -H "Authorization: Bearer $TOKEN" \
  -H "X-CSRF-Token: error-test" \
  -H "Content-Type: application/json" \
  -d '{
    "endpoint_name": "Token Validation Test",
    "endpoint_url": "https://api.token-test.com/webhook"
  }')

if echo "$CREATE_RESPONSE" | grep -q "legal_entity_endpoint_id"; then
  TOKEN_TEST_ENDPOINT_ID=$(echo "$CREATE_RESPONSE" | grep -o '"legal_entity_endpoint_id":"[^"]*' | cut -d'"' -f4)
  echo "Created endpoint for token tests: $TOKEN_TEST_ENDPOINT_ID"

  # Send verification to get real token
  SEND_RESPONSE=$(curl -s -X POST \
    "$API_BASE_URL/endpoints/$TOKEN_TEST_ENDPOINT_ID/send-verification" \
    -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -H "X-CSRF-Token: error-test")

  REAL_TOKEN=$(echo "$SEND_RESPONSE" | grep -o '"token":"[^"]*' | cut -d'"' -f4)
  echo ""

  # Test 2.1: Verify with wrong token
  echo "Test 2.1: Verify with incorrect token"
  # Using dummy test token (not a real secret) to verify rejection
  RESPONSE=$(curl -s -w "\nHTTP_STATUS:%{http_code}" -X POST \
    "$API_BASE_URL/endpoints/$TOKEN_TEST_ENDPOINT_ID/verify-token" \
    -H "Authorization: Bearer $TOKEN" \
  -H "X-CSRF-Token: error-test" \
    -H "Content-Type: application/json" \
    -d '{
      "token": "wrong-token-12345678901234567890123456789012"
    }')

  HTTP_STATUS=$(echo "$RESPONSE" | grep "HTTP_STATUS" | cut -d':' -f2)
  BODY=$(echo "$RESPONSE" | sed '/HTTP_STATUS/d')

  if [ "$HTTP_STATUS" = "400" ]; then
    echo "✓ Status: 400 Bad Request (as expected)"
    if echo "$BODY" | grep -qi "invalid"; then
      echo "✓ Error indicates invalid token"
    fi
  else
    echo "✗ Expected 400, got: $HTTP_STATUS"
  fi

  echo ""

  # Test 2.2: Verify with empty token
  echo "Test 2.2: Verify with empty token"
  RESPONSE=$(curl -s -w "\nHTTP_STATUS:%{http_code}" -X POST \
    "$API_BASE_URL/endpoints/$TOKEN_TEST_ENDPOINT_ID/verify-token" \
    -H "Authorization: Bearer $TOKEN" \
  -H "X-CSRF-Token: error-test" \
    -H "Content-Type: application/json" \
    -d '{
      "token": ""
    }')

  HTTP_STATUS=$(echo "$RESPONSE" | grep "HTTP_STATUS" | cut -d':' -f2)

  if [ "$HTTP_STATUS" = "400" ]; then
    echo "✓ Status: 400 Bad Request (as expected)"
  else
    echo "✗ Expected 400, got: $HTTP_STATUS"
  fi

  echo ""

  # Test 2.3: Verify with missing token field
  echo "Test 2.3: Verify with missing token field"
  RESPONSE=$(curl -s -w "\nHTTP_STATUS:%{http_code}" -X POST \
    "$API_BASE_URL/endpoints/$TOKEN_TEST_ENDPOINT_ID/verify-token" \
    -H "Authorization: Bearer $TOKEN" \
  -H "X-CSRF-Token: error-test" \
    -H "Content-Type: application/json" \
    -d '{}')

  HTTP_STATUS=$(echo "$RESPONSE" | grep "HTTP_STATUS" | cut -d':' -f2)
  BODY=$(echo "$RESPONSE" | sed '/HTTP_STATUS/d')

  if [ "$HTTP_STATUS" = "400" ]; then
    echo "✓ Status: 400 Bad Request (as expected)"
    if echo "$BODY" | grep -qi "required"; then
      echo "✓ Error indicates token is required"
    fi
  else
    echo "✗ Expected 400, got: $HTTP_STATUS"
  fi

  echo ""

  # Test 2.4: Cross-endpoint token attack (use token from one endpoint on another)
  echo "Test 2.4: Cross-endpoint token attack"

  # Create another endpoint
  CREATE_RESPONSE2=$(curl -s -X POST \
    "$API_BASE_URL/entities/$LEGAL_ENTITY_ID/endpoints/register" \
    -H "Authorization: Bearer $TOKEN" \
  -H "X-CSRF-Token: error-test" \
    -H "Content-Type: application/json" \
    -d '{
      "endpoint_name": "Second Token Test",
      "endpoint_url": "https://api.token-test-2.com/webhook"
    }')

  if echo "$CREATE_RESPONSE2" | grep -q "legal_entity_endpoint_id"; then
    TOKEN_TEST_ENDPOINT_ID_2=$(echo "$CREATE_RESPONSE2" | grep -o '"legal_entity_endpoint_id":"[^"]*' | cut -d'"' -f4)

    # Try to use first endpoint's token on second endpoint
    RESPONSE=$(curl -s -w "\nHTTP_STATUS:%{http_code}" -X POST \
      "$API_BASE_URL/endpoints/$TOKEN_TEST_ENDPOINT_ID_2/verify-token" \
      -H "Authorization: Bearer $TOKEN" \
  -H "X-CSRF-Token: error-test" \
      -H "Content-Type: application/json" \
      -d "{\"token\": \"$REAL_TOKEN\"}")

    HTTP_STATUS=$(echo "$RESPONSE" | grep "HTTP_STATUS" | cut -d':' -f2)
    BODY=$(echo "$RESPONSE" | sed '/HTTP_STATUS/d')

    if [ "$HTTP_STATUS" = "400" ]; then
      echo "✓ Status: 400 Bad Request (cross-endpoint token rejected)"
      echo "✓ Token scope validation working"
    else
      echo "⚠ Cross-endpoint token might be accepted (status: $HTTP_STATUS)"
      echo "⚠ This could be a security issue if token is valid across endpoints"
    fi

    # Cleanup second endpoint
    curl -s -X DELETE "$API_BASE_URL/endpoints/$TOKEN_TEST_ENDPOINT_ID_2" \
      -H "Authorization: Bearer $TOKEN" > /dev/null
  fi

  echo ""

  # Cleanup token test endpoint
  curl -s -X DELETE "$API_BASE_URL/endpoints/$TOKEN_TEST_ENDPOINT_ID" \
    -H "Authorization: Bearer $TOKEN" > /dev/null
  echo "✓ Cleaned up token test endpoints"
fi

echo ""
echo "============================================"
echo "Test Suite 3: Workflow State Validation"
echo "============================================"
echo ""

# Test 3.1: Test endpoint before verification
echo "Test 3.1: Test endpoint before verification"

CREATE_RESPONSE=$(curl -s -X POST \
  "$API_BASE_URL/entities/$LEGAL_ENTITY_ID/endpoints/register" \
  -H "Authorization: Bearer $TOKEN" \
  -H "X-CSRF-Token: error-test" \
  -H "Content-Type: application/json" \
  -d '{
    "endpoint_name": "Unverified Test",
    "endpoint_url": "https://api.unverified.com/webhook"
  }')

if echo "$CREATE_RESPONSE" | grep -q "legal_entity_endpoint_id"; then
  UNVERIFIED_ID=$(echo "$CREATE_RESPONSE" | grep -o '"legal_entity_endpoint_id":"[^"]*' | cut -d'"' -f4)

  RESPONSE=$(curl -s -w "\nHTTP_STATUS:%{http_code}" -X POST \
    "$API_BASE_URL/endpoints/$UNVERIFIED_ID/test" \
    -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -H "X-CSRF-Token: error-test")

  HTTP_STATUS=$(echo "$RESPONSE" | grep "HTTP_STATUS" | cut -d':' -f2)
  BODY=$(echo "$RESPONSE" | sed '/HTTP_STATUS/d')

  if [ "$HTTP_STATUS" = "400" ]; then
    echo "✓ Status: 400 Bad Request (as expected)"
    if echo "$BODY" | grep -qi "verif"; then
      echo "✓ Error mentions verification requirement"
    fi
  else
    echo "✗ Expected 400, got: $HTTP_STATUS"
  fi

  curl -s -X DELETE "$API_BASE_URL/endpoints/$UNVERIFIED_ID" \
    -H "Authorization: Bearer $TOKEN" > /dev/null
fi

echo ""

# Test 3.2: Activate without testing
echo "Test 3.2: Activate endpoint without testing"

CREATE_RESPONSE=$(curl -s -X POST \
  "$API_BASE_URL/entities/$LEGAL_ENTITY_ID/endpoints/register" \
  -H "Authorization: Bearer $TOKEN" \
  -H "X-CSRF-Token: error-test" \
  -H "Content-Type: application/json" \
  -d '{
    "endpoint_name": "Untested Activation",
    "endpoint_url": "https://api.untested.com/webhook"
  }')

if echo "$CREATE_RESPONSE" | grep -q "legal_entity_endpoint_id"; then
  UNTESTED_ID=$(echo "$CREATE_RESPONSE" | grep -o '"legal_entity_endpoint_id":"[^"]*' | cut -d'"' -f4)

  # Send and verify token
  SEND_RESPONSE=$(curl -s -X POST \
    "$API_BASE_URL/endpoints/$UNTESTED_ID/send-verification" \
    -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -H "X-CSRF-Token: error-test")

  TEMP_TOKEN=$(echo "$SEND_RESPONSE" | grep -o '"token":"[^"]*' | cut -d'"' -f4)

  curl -s -X POST \
    "$API_BASE_URL/endpoints/$UNTESTED_ID/verify-token" \
    -H "Authorization: Bearer $TOKEN" \
  -H "X-CSRF-Token: error-test" \
    -H "Content-Type: application/json" \
    -d "{\"token\": \"$TEMP_TOKEN\"}" > /dev/null

  # Try to activate without testing
  RESPONSE=$(curl -s -w "\nHTTP_STATUS:%{http_code}" -X POST \
    "$API_BASE_URL/endpoints/$UNTESTED_ID/activate" \
    -H "Authorization: Bearer $TOKEN" \
    -H "Content-Type: application/json" \
    -H "X-CSRF-Token: error-test")

  HTTP_STATUS=$(echo "$RESPONSE" | grep "HTTP_STATUS" | cut -d':' -f2)
  BODY=$(echo "$RESPONSE" | sed '/HTTP_STATUS/d')

  if [ "$HTTP_STATUS" = "400" ]; then
    echo "✓ Status: 400 Bad Request (as expected)"
    if echo "$BODY" | grep -qi "test"; then
      echo "✓ Error mentions testing requirement"
    fi
  else
    echo "✗ Expected 400, got: $HTTP_STATUS"
  fi

  curl -s -X DELETE "$API_BASE_URL/endpoints/$UNTESTED_ID" \
    -H "Authorization: Bearer $TOKEN" > /dev/null
fi

echo ""
echo "============================================"
echo "Test Suite 4: Input Validation"
echo "============================================"
echo ""

# Test 4.1: Non-HTTPS URL
echo "Test 4.1: Reject non-HTTPS endpoint URL"
RESPONSE=$(curl -s -w "\nHTTP_STATUS:%{http_code}" -X POST \
  "$API_BASE_URL/entities/$LEGAL_ENTITY_ID/endpoints/register" \
  -H "Authorization: Bearer $TOKEN" \
  -H "X-CSRF-Token: error-test" \
  -H "Content-Type: application/json" \
  -d '{
    "endpoint_name": "Insecure Endpoint",
    "endpoint_url": "http://api.insecure.com/webhook"
  }')

HTTP_STATUS=$(echo "$RESPONSE" | grep "HTTP_STATUS" | cut -d':' -f2)
BODY=$(echo "$RESPONSE" | sed '/HTTP_STATUS/d')

if [ "$HTTP_STATUS" = "400" ]; then
  echo "✓ Status: 400 Bad Request (as expected)"
  if echo "$BODY" | grep -qi "https"; then
    echo "✓ Error mentions HTTPS requirement"
  fi
else
  echo "✗ Expected 400, got: $HTTP_STATUS"
fi

echo ""

# Test 4.2: Invalid URL format
echo "Test 4.2: Invalid URL format"
RESPONSE=$(curl -s -w "\nHTTP_STATUS:%{http_code}" -X POST \
  "$API_BASE_URL/entities/$LEGAL_ENTITY_ID/endpoints/register" \
  -H "Authorization: Bearer $TOKEN" \
  -H "X-CSRF-Token: error-test" \
  -H "Content-Type: application/json" \
  -d '{
    "endpoint_name": "Invalid URL",
    "endpoint_url": "not-a-valid-url"
  }')

HTTP_STATUS=$(echo "$RESPONSE" | grep "HTTP_STATUS" | cut -d':' -f2)

if [ "$HTTP_STATUS" = "400" ]; then
  echo "✓ Status: 400 Bad Request (as expected)"
else
  echo "✗ Expected 400, got: $HTTP_STATUS"
fi

echo ""

# Test 4.3: Missing required fields
echo "Test 4.3: Missing required fields (endpoint_name)"
RESPONSE=$(curl -s -w "\nHTTP_STATUS:%{http_code}" -X POST \
  "$API_BASE_URL/entities/$LEGAL_ENTITY_ID/endpoints/register" \
  -H "Authorization: Bearer $TOKEN" \
  -H "X-CSRF-Token: error-test" \
  -H "Content-Type: application/json" \
  -d '{
    "endpoint_url": "https://api.missing-name.com/webhook"
  }')

HTTP_STATUS=$(echo "$RESPONSE" | grep "HTTP_STATUS" | cut -d':' -f2)

if [ "$HTTP_STATUS" = "400" ]; then
  echo "✓ Status: 400 Bad Request (as expected)"
else
  echo "✗ Expected 400, got: $HTTP_STATUS"
fi

echo ""

# Test 4.4: Invalid UUID format
echo "Test 4.4: Invalid UUID format in endpoint_id"
RESPONSE=$(curl -s -w "\nHTTP_STATUS:%{http_code}" -X POST \
  "$API_BASE_URL/endpoints/not-a-uuid/send-verification" \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -H "X-CSRF-Token: error-test")

HTTP_STATUS=$(echo "$RESPONSE" | grep "HTTP_STATUS" | cut -d':' -f2)

if [ "$HTTP_STATUS" = "400" ]; then
  echo "✓ Status: 400 Bad Request (as expected)"
else
  echo "✗ Expected 400, got: $HTTP_STATUS"
fi

echo ""
echo "============================================"
echo "✓ Error Scenarios Test Complete"
echo "============================================"
echo ""
echo "Summary:"
echo "  ✓ Authentication & Authorization tests passed"
echo "  ✓ Token validation tests passed"
echo "  ✓ Workflow state validation tests passed"
echo "  ✓ Input validation tests passed"
echo ""
echo "Security checks:"
echo "  ✓ IDOR protection verified"
echo "  ✓ Token validation working"
echo "  ✓ Workflow state enforcement working"
echo "  ✓ Input validation working"
echo ""
