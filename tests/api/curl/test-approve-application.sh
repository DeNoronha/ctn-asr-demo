#!/bin/bash

# Test Application Approval Endpoint
# Tests POST /api/v1/applications/{id}/approve

set -e

API_BASE="https://func-ctn-demo-asr-dev.azurewebsites.net/api/v1"
APPLICATION_ID="8eb19470-2dec-46e6-a32b-83643e1998db"

# Azure AD credentials for test user (SystemAdmin)
TENANT_ID="598664e7-725c-4daa-bd1f-89c4ada717ff"
CLIENT_ID="d3037c11-a541-4f21-8862-8079137a0cde"
SCOPE="api://d3037c11-a541-4f21-8862-8079137a0cde/.default"

# E2E Test User (SystemAdmin, MFA excluded)
# Get credentials from environment or .credentials file
if [ -z "$E2E_TEST_USER_EMAIL" ] || [ -z "$E2E_TEST_USER_PASSWORD" ]; then
  echo "❌ Error: E2E_TEST_USER_EMAIL and E2E_TEST_USER_PASSWORD environment variables must be set"
  echo "Tip: source .credentials file or set manually"
  exit 1
fi

TEST_USER_EMAIL="${E2E_TEST_USER_EMAIL}"
TEST_USER_PASS="${E2E_TEST_USER_PASSWORD}"

echo "=========================================="
echo "Test: Approve Application"
echo "=========================================="
echo ""

echo "Step 1: Get Azure AD token..."
TOKEN_RESPONSE=$(curl -s -X POST "https://login.microsoftonline.com/${TENANT_ID}/oauth2/v2.0/token" \
  -H "Content-Type: application/x-www-form-urlencoded" \
  -d "client_id=${CLIENT_ID}" \
  -d "scope=${SCOPE}" \
  -d "username=${TEST_USER_EMAIL}" \
  -d "password=${TEST_USER_PASS}" \
  -d "grant_type=password")

ACCESS_TOKEN=$(echo "$TOKEN_RESPONSE" | grep -o '"access_token":"[^"]*"' | cut -d'"' -f4)

if [ -z "$ACCESS_TOKEN" ]; then
  echo "❌ Failed to get access token"
  echo "Response: $TOKEN_RESPONSE"
  exit 1
fi

echo "✓ Got access token (${#ACCESS_TOKEN} chars)"
echo ""

echo "Step 2: Check if application exists..."
APP_CHECK=$(curl -s -w "\nHTTP_STATUS:%{http_code}" \
  -H "Authorization: Bearer $ACCESS_TOKEN" \
  "${API_BASE}/applications/${APPLICATION_ID}")

HTTP_STATUS=$(echo "$APP_CHECK" | grep "HTTP_STATUS:" | cut -d: -f2)
APP_DATA=$(echo "$APP_CHECK" | sed '/HTTP_STATUS:/d')

if [ "$HTTP_STATUS" != "200" ]; then
  echo "❌ Application not found (HTTP ${HTTP_STATUS})"
  echo "Response: $APP_DATA"
  exit 1
fi

echo "✓ Application found"
echo "$APP_DATA" | jq '.'
echo ""

echo "Step 3: Approve application..."
APPROVE_RESPONSE=$(curl -s -w "\nHTTP_STATUS:%{http_code}" \
  -X POST \
  -H "Authorization: Bearer $ACCESS_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"reviewNotes": "Test approval from curl script"}' \
  "${API_BASE}/applications/${APPLICATION_ID}/approve")

HTTP_STATUS=$(echo "$APPROVE_RESPONSE" | grep "HTTP_STATUS:" | cut -d: -f2)
RESPONSE_BODY=$(echo "$APPROVE_RESPONSE" | sed '/HTTP_STATUS:/d')

echo "HTTP Status: $HTTP_STATUS"
echo "Response Body:"
echo "$RESPONSE_BODY" | jq '.'
echo ""

if [ "$HTTP_STATUS" = "500" ]; then
  echo "❌ INTERNAL SERVER ERROR - Backend issue detected"
  echo ""
  echo "This confirms the 500 error reported by the frontend."
  echo "Check backend logs for detailed error message."
  exit 1
elif [ "$HTTP_STATUS" = "200" ]; then
  echo "✓ Application approved successfully"
  LEGAL_ENTITY_ID=$(echo "$RESPONSE_BODY" | jq -r '.legalEntityId')
  echo "Created Legal Entity ID: $LEGAL_ENTITY_ID"
else
  echo "⚠️  Unexpected status: $HTTP_STATUS"
fi

echo ""
echo "=========================================="
echo "Test Complete"
echo "=========================================="
