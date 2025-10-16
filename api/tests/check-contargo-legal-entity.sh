#!/bin/bash
set -e

# Test script to check if Contargo's legal entity exists
# This diagnoses 404 errors when adding identifiers

echo "========================================="
echo "Checking Contargo Legal Entity"
echo "========================================="
echo ""

# Check for auth token
if [ -z "$AUTH_TOKEN" ]; then
  echo "❌ ERROR: AUTH_TOKEN environment variable not set"
  echo ""
  echo "To get a token:"
  echo "1. Open https://calm-tree-03352ba03.1.azurestaticapps.net"
  echo "2. Login"
  echo "3. Open browser DevTools (F12)"
  echo "4. Go to Application tab → Session Storage"
  echo "5. Find the msal token"
  echo "6. Copy the accessToken value"
  echo "7. Run: export AUTH_TOKEN='paste-token-here'"
  echo "8. Then run this script again"
  exit 1
fi

API_URL="https://func-ctn-demo-asr-dev.azurewebsites.net/api/v1"

echo "Step 1: Getting all members..."
MEMBERS_RESPONSE=$(curl -s -H "Authorization: Bearer $AUTH_TOKEN" "$API_URL/all-members")

# Extract Contargo member info
CONTARGO_INFO=$(echo "$MEMBERS_RESPONSE" | jq '.data[] | select(.legal_name | contains("Contargo"))')

if [ -z "$CONTARGO_INFO" ] || [ "$CONTARGO_INFO" == "null" ]; then
  echo "❌ ERROR: Could not find Contargo member"
  echo "Response: $MEMBERS_RESPONSE"
  exit 1
fi

echo "✅ Found Contargo member"
echo ""

# Extract IDs
MEMBER_ID=$(echo "$CONTARGO_INFO" | jq -r '.id')
LEGAL_ENTITY_ID=$(echo "$CONTARGO_INFO" | jq -r '.legal_entity_id')

echo "Member Details:"
echo "  Member ID: $MEMBER_ID"
echo "  Legal Entity ID: $LEGAL_ENTITY_ID"
echo "  Legal Name: $(echo "$CONTARGO_INFO" | jq -r '.legal_name')"
echo ""

# Check if legal_entity_id is null
if [ "$LEGAL_ENTITY_ID" == "null" ] || [ -z "$LEGAL_ENTITY_ID" ]; then
  echo "❌ PROBLEM FOUND: Contargo has NO legal_entity_id!"
  echo ""
  echo "This is the root cause of 404 errors when adding identifiers."
  echo "The member exists but has no legal entity record."
  echo ""
  echo "Solution: Create legal entity for Contargo using migration 013"
  exit 1
fi

echo "Step 2: Checking if legal entity record exists..."
echo "Testing GET /entities/$LEGAL_ENTITY_ID/identifiers"
echo ""

# Try to get identifiers for this legal entity
IDENTIFIERS_RESPONSE=$(curl -s -w "\nHTTP_CODE:%{http_code}" \
  -H "Authorization: Bearer $AUTH_TOKEN" \
  "$API_URL/entities/$LEGAL_ENTITY_ID/identifiers")

HTTP_CODE=$(echo "$IDENTIFIERS_RESPONSE" | grep "HTTP_CODE" | cut -d: -f2)
RESPONSE_BODY=$(echo "$IDENTIFIERS_RESPONSE" | sed '/HTTP_CODE/d')

echo "HTTP Status: $HTTP_CODE"
echo ""

if [ "$HTTP_CODE" == "200" ]; then
  echo "✅ SUCCESS: Legal entity exists!"
  echo ""
  echo "Current identifiers:"
  echo "$RESPONSE_BODY" | jq '.'
  echo ""
  echo "✅ You can now add KvK 95944192 to Contargo"
  echo ""
  echo "Command to add KvK:"
  echo "curl -X POST \\"
  echo "  -H \"Authorization: Bearer \$AUTH_TOKEN\" \\"
  echo "  -H \"Content-Type: application/json\" \\"
  echo "  -d '{
    \"identifier_type\": \"KVK\",
    \"identifier_value\": \"95944192\",
    \"country_code\": \"NL\",
    \"registry_name\": \"Dutch Chamber of Commerce (Kamer van Koophandel)\",
    \"registry_url\": \"https://www.kvk.nl/\",
    \"validation_status\": \"PENDING\"
  }' \\"
  echo "  \"$API_URL/entities/$LEGAL_ENTITY_ID/identifiers\""
elif [ "$HTTP_CODE" == "404" ]; then
  echo "❌ PROBLEM FOUND: Legal entity does NOT exist!"
  echo ""
  echo "Error response:"
  echo "$RESPONSE_BODY" | jq '.'
  echo ""
  echo "ROOT CAUSE: Contargo member has legal_entity_id = $LEGAL_ENTITY_ID"
  echo "            but no record exists in legal_entities table."
  echo ""
  echo "This is the classic 'orphaned reference' problem from CLAUDE.md:"
  echo "  - Member has legal_entity_id value"
  echo "  - Legal entity record doesn't exist"
  echo "  - Foreign key constraint blocks identifier creation"
  echo ""
  echo "Solution: Run migration 013 to create legal entities for all members"
elif [ "$HTTP_CODE" == "500" ]; then
  echo "❌ SERVER ERROR"
  echo ""
  echo "Error response:"
  echo "$RESPONSE_BODY" | jq '.'
  echo ""
  echo "This indicates a database or server issue."
  echo "Check API logs: func azure functionapp logstream func-ctn-demo-asr-dev"
else
  echo "⚠️ UNEXPECTED STATUS CODE: $HTTP_CODE"
  echo ""
  echo "Response:"
  echo "$RESPONSE_BODY" | jq '.'
fi

echo ""
echo "========================================="
echo "Diagnostic Complete"
echo "========================================="
