#!/bin/bash

TOKEN=$(curl -s -X POST "https://login.microsoftonline.com/598664e7-725c-4daa-bd1f-89c4ada717ff/oauth2/v2.0/token" \
  -H "Content-Type: application/x-www-form-urlencoded" \
  -d "client_id=d3037c11-a541-4f21-8862-8079137a0cde" \
  -d "scope=api://d3037c11-a541-4f21-8862-8079137a0cde/.default" \
  -d "username=test-e2@denoronha.consulting" \
  -d "password=Madu5952" \
  -d "grant_type=password" | jq -r '.access_token')

echo "📊 Comparing legal entities vs members..."
echo ""

# Get total legal entities
LEGAL_ENTITIES=$(curl -s -H "Authorization: Bearer $TOKEN" \
  "https://ca-ctn-asr-api-dev.calmriver-700a8c55.westeurope.azurecontainerapps.io/api/v1/legal-entities" | \
  jq '.pagination.total')

# Get total members
MEMBERS=$(curl -s -H "Authorization: Bearer $TOKEN" \
  "https://ca-ctn-asr-api-dev.calmriver-700a8c55.westeurope.azurecontainerapps.io/api/v1/all-members" | \
  jq '.pagination.total')

echo "Legal Entities (ACTIVE/PENDING): $LEGAL_ENTITIES"
echo "Members: $MEMBERS"
echo ""

MISSING=$((LEGAL_ENTITIES - MEMBERS))
if [ $MISSING -gt 0 ]; then
  echo "⚠️  Missing member records: $MISSING"
  echo ""
  echo "Legal entities without member records:"
  
  # Get all legal entity IDs
  ALL_LEGAL_ENTITIES=$(curl -s -H "Authorization: Bearer $TOKEN" \
    "https://ca-ctn-asr-api-dev.calmriver-700a8c55.westeurope.azurecontainerapps.io/api/v1/legal-entities?page_size=100" | \
    jq -r '.data[].legal_entity_id')
  
  # Get all member legal_entity_ids
  MEMBER_LEGAL_ENTITY_IDS=$(curl -s -H "Authorization: Bearer $TOKEN" \
    "https://ca-ctn-asr-api-dev.calmriver-700a8c55.westeurope.azurecontainerapps.io/api/v1/all-members?page_size=100" | \
    jq -r '.data[].legal_entity_id')
  
  # Find missing ones
  for le_id in $ALL_LEGAL_ENTITIES; do
    if ! echo "$MEMBER_LEGAL_ENTITY_IDS" | grep -q "$le_id"; then
      # Get entity name
      ENTITY=$(curl -s -H "Authorization: Bearer $TOKEN" \
        "https://ca-ctn-asr-api-dev.calmriver-700a8c55.westeurope.azurecontainerapps.io/api/v1/legal-entities/$le_id" | \
        jq -r '.primary_legal_name')
      echo "  - $ENTITY (ID: $le_id)"
    fi
  done
else
  echo "✅ All legal entities have member records!"
fi
