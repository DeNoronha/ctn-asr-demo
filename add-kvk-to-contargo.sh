#!/bin/bash
set -e

# Script to add KvK number to Contargo
# This script must be run with a valid Azure AD token

echo "=== Adding KvK Number to Contargo ==="
echo ""

# Check for token
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

echo "Step 1: Finding Contargo entity..."
MEMBERS_RESPONSE=$(curl -s -H "Authorization: Bearer $AUTH_TOKEN" "$API_URL/all-members")

# Extract Contargo entity ID
CONTARGO_ENTITY_ID=$(echo "$MEMBERS_RESPONSE" | jq -r '.data[] | select(.legal_name | contains("Contargo")) | .legal_entity_id' | head -1)

if [ -z "$CONTARGO_ENTITY_ID" ] || [ "$CONTARGO_ENTITY_ID" == "null" ]; then
  echo "❌ ERROR: Could not find Contargo entity"
  echo "Response: $MEMBERS_RESPONSE"
  exit 1
fi

echo "✅ Found Contargo entity: $CONTARGO_ENTITY_ID"
echo ""

echo "Step 2: Adding KvK number 95944192..."
ADD_RESPONSE=$(curl -s -X POST \
  -H "Authorization: Bearer $AUTH_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "identifier_type": "KVK",
    "identifier_value": "95944192",
    "country_code": "NL",
    "registry_name": "Dutch Chamber of Commerce (Kamer van Koophandel)",
    "registry_url": "https://www.kvk.nl/",
    "validation_status": "PENDING"
  }' \
  "$API_URL/entities/$CONTARGO_ENTITY_ID/identifiers")

# Check if successful
if echo "$ADD_RESPONSE" | jq -e '.legal_entity_reference_id' > /dev/null 2>&1; then
  IDENTIFIER_ID=$(echo "$ADD_RESPONSE" | jq -r '.legal_entity_reference_id')
  echo "✅ SUCCESS! KvK number added with ID: $IDENTIFIER_ID"
  echo ""
  echo "Identifier details:"
  echo "$ADD_RESPONSE" | jq '.'
  echo ""
  echo "✅ Contargo now has KvK number 95944192!"
else
  echo "❌ ERROR: Failed to add KvK number"
  echo "Response: $ADD_RESPONSE"
  exit 1
fi
