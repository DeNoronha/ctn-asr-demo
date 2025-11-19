#!/bin/bash

# Test Member Portal API Endpoints
# Created: 2025-11-14
# Purpose: Test API endpoints after GetAuthenticatedMember fix

set -e

# Configuration
TENANT_ID="598664e7-725c-4daa-bd1f-89c4ada717ff"
CLIENT_ID="d3037c11-a541-4f21-8862-8079137a0cde"
API_SCOPE="api://d3037c11-a541-4f21-8862-8079137a0cde/.default"
API_BASE="https://func-ctn-demo-asr-dev.azurewebsites.net/api/v1"

# Test user credentials
USERNAME="test-e2@denoronha.consulting"
PASSWORD="Madu5952"

echo "========================================="
echo "Member Portal API Test Suite"
echo "========================================="
echo "Timestamp: $(date)"
echo "Test User: $USERNAME"
echo "API Base: $API_BASE"
echo ""

# Step 1: Acquire token using Resource Owner Password Credentials (ROPC) flow
echo "Step 1: Acquiring access token..."
TOKEN_RESPONSE=$(curl -s -X POST \
  "https://login.microsoftonline.com/$TENANT_ID/oauth2/v2.0/token" \
  -H "Content-Type: application/x-www-form-urlencoded" \
  -d "client_id=$CLIENT_ID" \
  -d "scope=$API_SCOPE" \
  -d "username=$USERNAME" \
  -d "password=$PASSWORD" \
  -d "grant_type=password")

# Check if token acquisition was successful
if echo "$TOKEN_RESPONSE" | grep -q "access_token"; then
  ACCESS_TOKEN=$(echo "$TOKEN_RESPONSE" | grep -o '"access_token":"[^"]*' | cut -d'"' -f4)
  echo "✅ Token acquired successfully"
  echo ""
else
  echo "❌ Token acquisition failed"
  echo "Response: $TOKEN_RESPONSE"
  exit 1
fi

# Step 2: Test GET /v1/member endpoint (the one we just fixed)
echo "========================================="
echo "Step 2: Testing GET /v1/member"
echo "========================================="
MEMBER_RESPONSE=$(curl -s -w "\n\nHTTP_STATUS:%{http_code}\nRESPONSE_TIME:%{time_total}s\n" \
  -H "Authorization: Bearer $ACCESS_TOKEN" \
  "$API_BASE/member")

echo "$MEMBER_RESPONSE"
echo ""

if echo "$MEMBER_RESPONSE" | grep -q "HTTP_STATUS:200"; then
  echo "✅ GET /v1/member - SUCCESS"
else
  echo "❌ GET /v1/member - FAILED"
  echo "Check if API is deployed and route is registered"
fi
echo ""

# Step 3: Test GET /v1/member/identifiers
echo "========================================="
echo "Step 3: Testing GET /v1/member/identifiers"
echo "========================================="
IDENTIFIERS_RESPONSE=$(curl -s -w "\n\nHTTP_STATUS:%{http_code}\nRESPONSE_TIME:%{time_total}s\n" \
  -H "Authorization: Bearer $ACCESS_TOKEN" \
  "$API_BASE/member/identifiers")

echo "$IDENTIFIERS_RESPONSE"
echo ""

if echo "$IDENTIFIERS_RESPONSE" | grep -q "HTTP_STATUS:200"; then
  echo "✅ GET /v1/member/identifiers - SUCCESS"
else
  echo "❌ GET /v1/member/identifiers - FAILED"
fi
echo ""

# Step 4: Test GET /v1/member/contacts
echo "========================================="
echo "Step 4: Testing GET /v1/member/contacts"
echo "========================================="
CONTACTS_RESPONSE=$(curl -s -w "\n\nHTTP_STATUS:%{http_code}\nRESPONSE_TIME:%{time_total}s\n" \
  -H "Authorization: Bearer $ACCESS_TOKEN" \
  "$API_BASE/member/contacts")

echo "$CONTACTS_RESPONSE"
echo ""

if echo "$CONTACTS_RESPONSE" | grep -q "HTTP_STATUS:200"; then
  echo "✅ GET /v1/member/contacts - SUCCESS"
else
  echo "❌ GET /v1/member/contacts - FAILED"
fi
echo ""

# Step 5: Test GET /v1/member/endpoints
echo "========================================="
echo "Step 5: Testing GET /v1/member/endpoints"
echo "========================================="
ENDPOINTS_RESPONSE=$(curl -s -w "\n\nHTTP_STATUS:%{http_code}\nRESPONSE_TIME:%{time_total}s\n" \
  -H "Authorization: Bearer $ACCESS_TOKEN" \
  "$API_BASE/member/endpoints")

echo "$ENDPOINTS_RESPONSE"
echo ""

if echo "$ENDPOINTS_RESPONSE" | grep -q "HTTP_STATUS:200"; then
  echo "✅ GET /v1/member/endpoints - SUCCESS"
else
  echo "❌ GET /v1/member/endpoints - FAILED"
fi
echo ""

# Step 6: Test GET /v1/members (list all members)
echo "========================================="
echo "Step 6: Testing GET /v1/members"
echo "========================================="
MEMBERS_RESPONSE=$(curl -s -w "\n\nHTTP_STATUS:%{http_code}\nRESPONSE_TIME:%{time_total}s\n" \
  -H "Authorization: Bearer $ACCESS_TOKEN" \
  "$API_BASE/members")

echo "$MEMBERS_RESPONSE"
echo ""

if echo "$MEMBERS_RESPONSE" | grep -q "HTTP_STATUS:200"; then
  echo "✅ GET /v1/members - SUCCESS"
else
  echo "❌ GET /v1/members - FAILED"
fi
echo ""

# Summary
echo "========================================="
echo "Test Summary"
echo "========================================="
echo "All tests completed. Review output above for any failures."
echo "Timestamp: $(date)"
echo "========================================="
