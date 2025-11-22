#!/bin/bash

set -e

echo "🔐 Acquiring authentication token..."
TOKEN=$(curl -s -X POST "https://login.microsoftonline.com/598664e7-725c-4daa-bd1f-89c4ada717ff/oauth2/v2.0/token" \
  -H "Content-Type: application/x-www-form-urlencoded" \
  -d "client_id=d3037c11-a541-4f21-8862-8079137a0cde" \
  -d "scope=api://d3037c11-a541-4f21-8862-8079137a0cde/.default" \
  -d "username=test-e2@denoronha.consulting" \
  -d "password=Madu5952" \
  -d "grant_type=password" | jq -r '.access_token')

if [ "$TOKEN" == "null" ] || [ -z "$TOKEN" ]; then
  echo "❌ Failed to get authentication token"
  exit 1
fi

echo "✅ Token acquired"
echo ""

LK_HOLDING_ID="8fc8562b-96d5-4a97-9195-a8682abefee5"

echo "📋 LK Holding Current Status:"
echo "=============================="
curl -s -H "Authorization: Bearer $TOKEN" \
  "https://ca-ctn-asr-api-dev.calmriver-700a8c55.westeurope.azurecontainerapps.io/api/v1/legal-entities/$LK_HOLDING_ID" | \
  jq '{
    legal_entity_id,
    primary_legal_name,
    kvk_verification_status,
    kvk_document_url,
    kvk_extracted_company_name,
    kvk_extracted_number,
    kvk_mismatch_flags
  }'

echo ""
echo "🔢 LK Holding Identifiers:"
echo "========================="
curl -s -H "Authorization: Bearer $TOKEN" \
  "https://ca-ctn-asr-api-dev.calmriver-700a8c55.westeurope.azurecontainerapps.io/api/v1/legal-entities/$LK_HOLDING_ID/identifiers" | \
  jq '.data[] | {identifier_type, identifier_value, validation_status}'

echo ""
echo "🚀 Triggering manual verification..."
echo "====================================="
VERIFY_RESPONSE=$(curl -s -X POST \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  "https://ca-ctn-asr-api-dev.calmriver-700a8c55.westeurope.azurecontainerapps.io/api/v1/legal-entities/$LK_HOLDING_ID/kvk-document/verify")

echo "$VERIFY_RESPONSE" | jq '.'

echo ""
echo "⏳ Waiting 10 seconds for verification to complete..."
sleep 10

echo ""
echo "📊 Updated Status:"
echo "================="
curl -s -H "Authorization: Bearer $TOKEN" \
  "https://ca-ctn-asr-api-dev.calmriver-700a8c55.westeurope.azurecontainerapps.io/api/v1/legal-entities/$LK_HOLDING_ID" | \
  jq '{
    kvk_verification_status,
    kvk_extracted_company_name,
    kvk_extracted_number,
    kvk_mismatch_flags,
    kvk_verified_at
  }'

echo ""
echo "🆔 Updated Identifiers (should include EUID and LEI):"
echo "===================================================="
curl -s -H "Authorization: Bearer $TOKEN" \
  "https://ca-ctn-asr-api-dev.calmriver-700a8c55.westeurope.azurecontainerapps.io/api/v1/legal-entities/$LK_HOLDING_ID/identifiers" | \
  jq '.data[] | {identifier_type, identifier_value, validation_status}'

echo ""
echo "✅ Test complete!"
