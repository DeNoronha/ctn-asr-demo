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

DNC_ID="96701dc5-4234-4f67-8a0c-5679c4276d37"
KVK_DOC="/Users/ramondenoronha/Dev/DIL/DEV-CTN-ASR/tests/KvK-DNC-95944192.pdf"

echo "📄 De Noronha Consulting Entity Details:"
echo "========================================"
echo "Legal Entity ID: $DNC_ID"
echo "KvK Number: 95944192"
echo "Document: $KVK_DOC"
echo ""

echo "📤 Uploading KvK document..."
echo "============================"
UPLOAD_RESPONSE=$(curl -s -X POST \
  -H "Authorization: Bearer $TOKEN" \
  -F "file=@$KVK_DOC" \
  "https://ca-ctn-asr-api-dev.calmriver-700a8c55.westeurope.azurecontainerapps.io/api/v1/legal-entities/$DNC_ID/kvk-document")

echo "$UPLOAD_RESPONSE" | jq '.'

echo ""
echo "⏳ Waiting 15 seconds for automatic verification to complete..."
sleep 15

echo ""
echo "📊 Verification Status:"
echo "======================"
curl -s -H "Authorization: Bearer $TOKEN" \
  "https://ca-ctn-asr-api-dev.calmriver-700a8c55.westeurope.azurecontainerapps.io/api/v1/legal-entities/$DNC_ID" | \
  jq '{
    legal_entity_id,
    primary_legal_name,
    kvk_verification_status,
    kvk_document_url,
    kvk_extracted_company_name,
    kvk_extracted_number,
    kvk_mismatch_flags,
    kvk_verified_at
  }'

echo ""
echo "🆔 Identifiers (should include KvK, EUID, and possibly LEI):"
echo "=========================================================="
curl -s -H "Authorization: Bearer $TOKEN" \
  "https://ca-ctn-asr-api-dev.calmriver-700a8c55.westeurope.azurecontainerapps.io/api/v1/legal-entities/$DNC_ID/identifiers" | \
  jq '.data[] | {identifier_type, identifier_value, validation_status}'

echo ""
echo "✅ Upload and verification test complete!"
echo ""
echo "Expected results:"
echo "  - kvk_verification_status: 'verified' or 'flagged' (not 'pending')"
echo "  - kvk_extracted_number: '95944192'"
echo "  - Identifiers include: KvK, EUID (NL.KVK.95944192)"
echo "  - If De Noronha Consulting has an LEI, it should appear too"
