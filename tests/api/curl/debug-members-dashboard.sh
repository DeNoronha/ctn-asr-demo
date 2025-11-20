#!/bin/bash
# Debug script: Test /api/v1/all-members endpoint
# Created: October 25, 2025
# Purpose: Diagnose why dashboard shows 0 members

set -e

echo "========================================="
echo "CTN ASR - Debug Members Dashboard"
echo "========================================="
echo ""

# Configuration
TENANT_ID="598664e7-725c-4daa-bd1f-89c4ada717ff"
CLIENT_ID="d3037c11-a541-4f21-8862-8079137a0cde"
API_SCOPE="api://d3037c11-a541-4f21-8862-8079137a0cde/.default"
API_BASE="https://ca-ctn-asr-api-dev.calmriver-700a8c55.westeurope.azurecontainerapps.io/api/v1"

echo "Step 1: Checking if we need to authenticate..."
echo ""

# Check if we have a stored token
TOKEN_FILE="/tmp/asr_admin_token.txt"

if [ -f "$TOKEN_FILE" ]; then
    TOKEN=$(cat "$TOKEN_FILE")
    echo "Using cached token from $TOKEN_FILE"
else
    echo "ERROR: No authentication token found."
    echo ""
    echo "Please run the authentication script first:"
    echo "  cd /Users/ramondenoronha/Dev/DIL/ASR-full/admin-portal/scripts"
    echo "  node capture-auth-auto.js"
    echo ""
    exit 1
fi

echo ""
echo "========================================="
echo "Step 2: Testing GET /api/v1/all-members"
echo "========================================="
echo ""

# Test the all-members endpoint
ENDPOINT="$API_BASE/all-members?page=1&page_size=10"

echo "Request Details:"
echo "  Method: GET"
echo "  URL: $ENDPOINT"
echo "  Authorization: Bearer <token>"
echo ""

RESPONSE=$(curl -s -w "\nHTTP_STATUS:%{http_code}" \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  "$ENDPOINT")

# Extract status code
HTTP_STATUS=$(echo "$RESPONSE" | grep "HTTP_STATUS:" | cut -d':' -f2)
BODY=$(echo "$RESPONSE" | sed '/HTTP_STATUS:/d')

echo "Response Status: $HTTP_STATUS"
echo ""

if [ "$HTTP_STATUS" == "200" ]; then
    echo "✅ SUCCESS - API returned 200 OK"
    echo ""
    echo "Response Body:"
    echo "$BODY" | jq '.'
    echo ""

    # Check if data array is empty
    MEMBER_COUNT=$(echo "$BODY" | jq '.data | length')
    echo "Members returned: $MEMBER_COUNT"

    if [ "$MEMBER_COUNT" == "0" ]; then
        echo ""
        echo "⚠️  WARNING: API returned 200 but data array is EMPTY"
        echo "This indicates a DATABASE ISSUE - no members exist in the database"
        echo ""
        echo "Recommended action: Connect to database and run:"
        echo "  SELECT COUNT(*) FROM members;"
    else
        echo ""
        echo "✅ Members found in response!"
        echo "This is a FRONTEND issue - data exists but UI is not displaying it"
    fi

elif [ "$HTTP_STATUS" == "401" ]; then
    echo "❌ AUTHENTICATION FAILED (401 Unauthorized)"
    echo ""
    echo "Response Body:"
    echo "$BODY" | jq '.'
    echo ""
    echo "Possible causes:"
    echo "  1. Token expired (Azure AD tokens expire after 1 hour)"
    echo "  2. Invalid token scope"
    echo "  3. Token not properly formatted"
    echo ""
    echo "Recommended action: Re-authenticate"
    echo "  cd /Users/ramondenoronha/Dev/DIL/ASR-full/admin-portal/scripts"
    echo "  node capture-auth-auto.js"

elif [ "$HTTP_STATUS" == "403" ]; then
    echo "❌ AUTHORIZATION FAILED (403 Forbidden)"
    echo ""
    echo "Response Body:"
    echo "$BODY" | jq '.'
    echo ""
    echo "User is authenticated but doesn't have permission to access this endpoint"

elif [ "$HTTP_STATUS" == "404" ]; then
    echo "❌ ENDPOINT NOT FOUND (404)"
    echo ""
    echo "Response Body:"
    echo "$BODY" | jq '.'
    echo ""
    echo "The /api/v1/all-members endpoint is not registered or deployed"
    echo ""
    echo "Recommended action: Check if API is deployed"
    echo "  func azure functionapp list-functions func-ctn-demo-asr-dev"

elif [ "$HTTP_STATUS" == "500" ]; then
    echo "❌ INTERNAL SERVER ERROR (500)"
    echo ""
    echo "Response Body:"
    echo "$BODY" | jq '.'
    echo ""
    echo "Backend error in GetMembers.ts handler"
    echo ""
    echo "Recommended action: Check Azure Function logs"
    echo "  func azure functionapp logstream func-ctn-demo-asr-dev --timeout 20"

else
    echo "❌ UNEXPECTED STATUS CODE: $HTTP_STATUS"
    echo ""
    echo "Response Body:"
    echo "$BODY" | jq '.'
fi

echo ""
echo "========================================="
echo "Debug script complete"
echo "========================================="
