#!/bin/bash

# ========================================
# M2M Authentication Test Suite
# ========================================
# Tests machine-to-machine authentication with Azure AD Client Credentials
# Usage: ./test-m2m-auth.sh [local|dev|prod]

set -e

# Configuration
TENANT_ID="598664e7-725c-4daa-bd1f-89c4ada717ff"
API_APP_ID="d3037c11-a541-4f21-8862-8079137a0cde"

# Determine environment
ENV="${1:-local}"

case $ENV in
  local)
    API_URL="http://localhost:7071/api/v1"
    ;;
  dev)
    API_URL="https://ca-ctn-asr-api-dev.calmriver-700a8c55.westeurope.azurecontainerapps.io/api/v1"
    ;;
  prod)
    API_URL="https://func-ctn-prod.azurewebsites.net/api/v1"
    ;;
  *)
    echo "Unknown environment: $ENV"
    echo "Usage: $0 [local|dev|prod]"
    exit 1
    ;;
esac

echo "========================================="
echo "M2M Authentication Test Suite"
echo "========================================="
echo "Environment: $ENV"
echo "API URL: $API_URL"
echo ""

# Check if jq is installed
if ! command -v jq &> /dev/null; then
    echo "❌ jq is required but not installed. Install with: brew install jq"
    exit 1
fi

# Step 1: Get test client credentials from Key Vault
echo "1. Retrieving test client credentials from Azure Key Vault..."

TEST_CLIENT_ID=$(az keyvault secret show \
  --vault-name "kv-ctn-demo-asr-dev" \
  --name "M2M-TestClient-ID" \
  --query value -o tsv 2>/dev/null)

TEST_CLIENT_SECRET=$(az keyvault secret show \
  --vault-name "kv-ctn-demo-asr-dev" \
  --name "M2M-TestClient-Secret" \
  --query value -o tsv 2>/dev/null)

if [ -z "$TEST_CLIENT_ID" ] || [ -z "$TEST_CLIENT_SECRET" ]; then
  echo "❌ Failed to retrieve credentials from Key Vault"
  echo "Run: ./api/scripts/create-test-m2m-client.sh"
  exit 1
fi

echo "✅ Client ID: $TEST_CLIENT_ID"
echo "✅ Client Secret: ${TEST_CLIENT_SECRET:0:10}..."
echo ""

# Step 2: Acquire access token
echo "2. Acquiring M2M access token..."

TOKEN_RESPONSE=$(curl -s -X POST \
  "https://login.microsoftonline.com/$TENANT_ID/oauth2/v2.0/token" \
  -H "Content-Type: application/x-www-form-urlencoded" \
  -d "client_id=$TEST_CLIENT_ID&client_secret=$TEST_CLIENT_SECRET&scope=api://$API_APP_ID/.default&grant_type=client_credentials")

ACCESS_TOKEN=$(echo $TOKEN_RESPONSE | jq -r '.access_token')

if [ "$ACCESS_TOKEN" = "null" ] || [ -z "$ACCESS_TOKEN" ]; then
  echo "❌ Failed to acquire access token"
  echo $TOKEN_RESPONSE | jq
  exit 1
fi

echo "✅ Access token acquired (expires in $(echo $TOKEN_RESPONSE | jq -r '.expires_in')s)"

# Decode token to verify claims
echo ""
echo "3. Verifying token claims..."
PAYLOAD=$(echo $ACCESS_TOKEN | cut -d'.' -f2 | base64 -d 2>/dev/null)
ROLES=$(echo $PAYLOAD | jq -r '.roles[]' 2>/dev/null | tr '\n' ',' | sed 's/,$//')

echo "✅ Token roles: $ROLES"
echo ""

# Test counters
TOTAL_TESTS=0
PASSED_TESTS=0
FAILED_TESTS=0

# Helper function to run test
run_test() {
  local test_name="$1"
  local method="$2"
  local endpoint="$3"
  local expected_status="$4"
  local auth_token="$5"
  local body="$6"

  TOTAL_TESTS=$((TOTAL_TESTS + 1))

  echo "Test $TOTAL_TESTS: $test_name"

  # Build curl command
  if [ -n "$body" ]; then
    RESPONSE=$(curl -s -w "\nHTTP_CODE:%{http_code}" \
      -X $method "$API_URL$endpoint" \
      -H "Authorization: Bearer $auth_token" \
      -H "Content-Type: application/json" \
      -d "$body" 2>/dev/null)
  else
    RESPONSE=$(curl -s -w "\nHTTP_CODE:%{http_code}" \
      -X $method "$API_URL$endpoint" \
      -H "Authorization: Bearer $auth_token" \
      -H "Content-Type: application/json" 2>/dev/null)
  fi

  HTTP_CODE=$(echo "$RESPONSE" | grep "HTTP_CODE:" | cut -d':' -f2)
  BODY=$(echo "$RESPONSE" | sed '/HTTP_CODE:/d')

  if [ "$HTTP_CODE" = "$expected_status" ]; then
    echo "✅ PASS - Got expected status $HTTP_CODE"
    PASSED_TESTS=$((PASSED_TESTS + 1))
  else
    echo "❌ FAIL - Expected $expected_status but got $HTTP_CODE"
    echo "Response: $BODY" | jq '.' 2>/dev/null || echo "$BODY"
    FAILED_TESTS=$((FAILED_TESTS + 1))
  fi

  echo ""
}

# ========================================
# Run Test Suite
# ========================================

echo "========================================="
echo "Running M2M Authentication Tests"
echo "========================================="
echo ""

# Test 1: ETA endpoint with valid token (has ETA.Read)
run_test \
  "ETA endpoint with valid token" \
  "GET" \
  "/eta/updates?bookingRef=BK123456" \
  "200" \
  "$ACCESS_TOKEN"

# Test 2: Container endpoint with valid token (has Container.Read)
run_test \
  "Container endpoint with valid token" \
  "GET" \
  "/containers/status?containerNumber=CONT123456" \
  "200" \
  "$ACCESS_TOKEN"

# Test 3: Booking GET with valid token (needs Booking.Read - should FAIL)
run_test \
  "Booking GET endpoint without required scope" \
  "GET" \
  "/bookings?bookingRef=BK123456" \
  "403" \
  "$ACCESS_TOKEN"

# Test 4: Booking POST with valid token (needs Booking.Write - should FAIL)
run_test \
  "Booking POST endpoint without required scope" \
  "POST" \
  "/bookings" \
  "403" \
  "$ACCESS_TOKEN" \
  '{"containerNumber":"CONT999","carrier":"Test","origin":"Hamburg","destination":"Rotterdam"}'

# Test 5: ETA endpoint without token (should FAIL)
run_test \
  "ETA endpoint without authentication" \
  "GET" \
  "/eta/updates?bookingRef=BK123456" \
  "401" \
  ""

# Test 6: ETA endpoint with invalid token (should FAIL)
run_test \
  "ETA endpoint with invalid token" \
  "GET" \
  "/eta/updates?bookingRef=BK123456" \
  "401" \
  "invalid.token.here"

# Test 7: Container endpoint with missing parameter (should FAIL)
run_test \
  "Container endpoint without required parameter" \
  "GET" \
  "/containers/status" \
  "400" \
  "$ACCESS_TOKEN"

# ========================================
# Test Summary
# ========================================

echo "========================================="
echo "Test Summary"
echo "========================================="
echo "Total Tests: $TOTAL_TESTS"
echo "Passed: $PASSED_TESTS"
echo "Failed: $FAILED_TESTS"
echo ""

if [ $FAILED_TESTS -eq 0 ]; then
  echo "✅ ALL TESTS PASSED!"
  exit 0
else
  echo "❌ SOME TESTS FAILED"
  exit 1
fi
