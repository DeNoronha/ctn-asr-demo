#!/bin/bash

# Get auth token using ROPC flow
echo "🔐 Getting authentication token..."
TOKEN_RESPONSE=$(curl -s -X POST "https://login.microsoftonline.com/598664e7-725c-4daa-bd1f-89c4ada717ff/oauth2/v2.0/token" \
  -H "Content-Type: application/x-www-form-urlencoded" \
  -d "client_id=d3037c11-a541-4f21-8862-8079137a0cde" \
  -d "scope=api://d3037c11-a541-4f21-8862-8079137a0cde/.default" \
  -d "username=test-e2@denoronha.consulting" \
  -d "password=Madu5952" \
  -d "grant_type=password")

TOKEN=$(echo "$TOKEN_RESPONSE" | jq -r '.access_token')

if [ "$TOKEN" == "null" ] || [ -z "$TOKEN" ]; then
  echo "❌ Failed to get token"
  echo "$TOKEN_RESPONSE" | jq .
  exit 1
fi

echo "✅ Got token"

# Test all-members endpoint
echo ""
echo "📡 Testing /v1/all-members endpoint..."
RESPONSE=$(curl -s -w "\n%{http_code}" \
  -H "Authorization: Bearer $TOKEN" \
  "https://ca-ctn-asr-api-dev.calmriver-700a8c55.westeurope.azurecontainerapps.io/api/v1/all-members")

HTTP_CODE=$(echo "$RESPONSE" | tail -n1)
BODY=$(echo "$RESPONSE" | sed '$d')

echo "HTTP Status: $HTTP_CODE"
echo ""
echo "Response:"
echo "$BODY" | jq . 2>/dev/null || echo "$BODY"
