#!/bin/bash
# Manual test script for /api/v1/all-members
# Usage: Provide token as argument or paste when prompted

set -e

echo "========================================="
echo "CTN ASR - Test /api/v1/all-members"
echo "========================================="
echo ""

API_URL="https://ca-ctn-asr-api-dev.calmriver-700a8c55.westeurope.azurecontainerapps.io/api/v1/all-members?page=1&page_size=10"

# Check if token provided as argument
if [ -n "$1" ]; then
    TOKEN="$1"
    echo "Using token from command line argument"
else
    # Check if token file exists
    if [ -f "/tmp/asr_admin_token.txt" ]; then
        TOKEN=$(cat /tmp/asr_admin_token.txt)
        echo "Using cached token from /tmp/asr_admin_token.txt"
    else
        echo "No token found. Please provide a Bearer token."
        echo ""
        echo "To get a token:"
        echo "1. Open browser to: https://calm-tree-03352ba03.1.azurestaticapps.net/"
        echo "2. Login and wait for dashboard to load"
        echo "3. Open DevTools (F12) > Console"
        echo "4. Run this code to extract token:"
        echo ""
        echo "// Find and extract access token from storage"
        echo "let token = null;"
        echo "for (let i = 0; i < sessionStorage.length; i++) {"
        echo "  const key = sessionStorage.key(i);"
        echo "  if (key?.includes('accesstoken')) {"
        echo "    try {"
        echo "      const data = JSON.parse(sessionStorage.getItem(key));"
        echo "      if (data.secret) {"
        echo "        token = data.secret;"
        echo "        console.log('Token:', token);"
        echo "        break;"
        echo "      }"
        echo "    } catch (e) {}"
        echo "  }"
        echo "}"
        echo "if (!token) console.error('Token not found in sessionStorage');"
        echo ""
        echo "5. Copy the token and paste below"
        echo ""
        read -p "Enter Bearer token: " TOKEN

        # Save token for future use
        echo "$TOKEN" > /tmp/asr_admin_token.txt
        echo "Token saved to /tmp/asr_admin_token.txt"
    fi
fi

echo ""
echo "Testing endpoint: $API_URL"
echo ""

# Make the request
RESPONSE=$(curl -s -w "\nHTTP_CODE:%{http_code}" \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  "$API_URL")

# Extract HTTP code
HTTP_CODE=$(echo "$RESPONSE" | grep "HTTP_CODE:" | cut -d':' -f2)
BODY=$(echo "$RESPONSE" | sed '/HTTP_CODE:/d')

echo "HTTP Status: $HTTP_CODE"
echo ""

if [ "$HTTP_CODE" == "200" ]; then
    echo "✅ SUCCESS - API returned 200 OK"
    echo ""
    echo "Response:"
    echo "$BODY" | jq '.'
    echo ""

    # Count members
    MEMBER_COUNT=$(echo "$BODY" | jq '.data | length' 2>/dev/null || echo "0")
    TOTAL_COUNT=$(echo "$BODY" | jq '.total' 2>/dev/null || echo "unknown")

    echo "========================================="
    echo "RESULTS"
    echo "========================================="
    echo "Members in response: $MEMBER_COUNT"
    echo "Total in database: $TOTAL_COUNT"
    echo ""

    if [ "$MEMBER_COUNT" == "0" ]; then
        echo "⚠️  ROOT CAUSE: DATABASE ISSUE"
        echo "   - API is working (200 OK)"
        echo "   - Auth is working (token accepted)"
        echo "   - BUT: No members in database"
        echo ""
        echo "Action needed: Check database"
        echo "  SELECT COUNT(*) FROM members;"
    else
        echo "✅ API is working correctly!"
        echo "   - $MEMBER_COUNT members returned"
        echo ""
        echo "Sample member:"
        echo "$BODY" | jq '.data[0] | {legal_name, lei, kvk, status}' 2>/dev/null || echo "N/A"
        echo ""
        echo "⚠️  If dashboard still shows 0 members:"
        echo "   ROOT CAUSE: FRONTEND ISSUE"
        echo "   - Check browser console for errors"
        echo "   - Verify Dashboard.tsx fetches this endpoint"
        echo "   - Check MembersGrid.tsx renders data array"
    fi

elif [ "$HTTP_CODE" == "401" ]; then
    echo "❌ AUTHENTICATION FAILED (401)"
    echo "$BODY" | jq '.' 2>/dev/null || echo "$BODY"
    echo ""
    echo "Token expired or invalid. Get a new token:"
    echo "  rm /tmp/asr_admin_token.txt"
    echo "  ./test-members-manual.sh"

elif [ "$HTTP_CODE" == "404" ]; then
    echo "❌ ENDPOINT NOT FOUND (404)"
    echo "$BODY"
    echo ""
    echo "The API endpoint is not deployed."
    echo "Deploy with:"
    echo "  cd api && func azure functionapp publish func-ctn-demo-asr-dev --typescript --build remote"

elif [ "$HTTP_CODE" == "500" ]; then
    echo "❌ BACKEND ERROR (500)"
    echo "$BODY" | jq '.' 2>/dev/null || echo "$BODY"

else
    echo "❌ UNEXPECTED STATUS: $HTTP_CODE"
    echo "$BODY"
fi

echo ""
echo "========================================="
