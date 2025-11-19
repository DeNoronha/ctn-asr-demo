#!/bin/bash

# Debug script for endpoints not showing issue
# Run this AFTER logging into the member portal

API_URL="https://func-ctn-demo-asr-dev.azurewebsites.net/api/v1"

echo "==================================="
echo "Debugging Endpoints Visibility Issue"
echo "==================================="
echo ""

# You need to paste your access token here after logging in
read -p "Enter your access token (from browser DevTools → Application → Session Storage): " ACCESS_TOKEN

if [ -z "$ACCESS_TOKEN" ]; then
  echo "❌ No token provided"
  exit 1
fi

echo ""
echo "1. Testing /member endpoint (should return your organizationId and legalEntityId):"
echo "---"
curl -s -H "Authorization: Bearer $ACCESS_TOKEN" \
  -H "Content-Type: application/json" \
  "$API_URL/member" | jq '.'

echo ""
echo ""
echo "2. Testing /member-endpoints endpoint (should return your endpoints):"
echo "---"
RESPONSE=$(curl -s -w "\n%{http_code}" -H "Authorization: Bearer $ACCESS_TOKEN" \
  -H "Content-Type: application/json" \
  "$API_URL/member-endpoints")

HTTP_CODE=$(echo "$RESPONSE" | tail -1)
BODY=$(echo "$RESPONSE" | sed '$d')

echo "HTTP Status: $HTTP_CODE"
echo "Response Body:"
echo "$BODY" | jq '.'

if [ "$HTTP_CODE" != "200" ]; then
  echo ""
  echo "❌ ERROR: Expected 200, got $HTTP_CODE"

  if [ "$HTTP_CODE" = "403" ]; then
    echo ""
    echo "🔍 Diagnosis: 403 Forbidden"
    echo "   This means your JWT token is missing 'partyId'"
    echo "   Check your JWT token at https://jwt.io"
  elif [ "$HTTP_CODE" = "404" ]; then
    echo ""
    echo "🔍 Diagnosis: 404 Not Found"
    echo "   This means no legal_entity exists with the partyId from your JWT"
    echo "   The party_id in your JWT doesn't match any legal_entity in the database"
  fi
else
  echo ""
  ENDPOINT_COUNT=$(echo "$BODY" | jq '.endpoints | length')
  echo "✅ SUCCESS: Found $ENDPOINT_COUNT endpoint(s)"

  if [ "$ENDPOINT_COUNT" = "0" ]; then
    echo ""
    echo "⚠️  WARNING: API returned 200 but endpoints array is empty"
    echo "   This means:"
    echo "   1. The legal_entity_id was found correctly"
    echo "   2. But no endpoints exist for that legal_entity_id (WHERE is_deleted = false)"
    echo ""
    echo "   Check database with:"
    echo "   SELECT * FROM legal_entity_endpoint"
    echo "   WHERE legal_entity_id = '<your_legal_entity_id>'"
    echo "   AND is_deleted = false;"
  fi
fi

echo ""
echo "==================================="
echo "Debug complete"
echo "==================================="
