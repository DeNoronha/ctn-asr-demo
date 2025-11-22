#!/bin/bash

# Get auth token
TOKEN=$(curl -s -X POST "https://login.microsoftonline.com/598664e7-725c-4daa-bd1f-89c4ada717ff/oauth2/v2.0/token" \
  -H "Content-Type: application/x-www-form-urlencoded" \
  -d "client_id=d3037c11-a541-4f21-8862-8079137a0cde" \
  -d "scope=api://d3037c11-a541-4f21-8862-8079137a0cde/.default" \
  -d "username=test-e2@denoronha.consulting" \
  -d "password=Madu5952" \
  -d "grant_type=password" | jq -r '.access_token')

# Search for LK Holding
echo "Searching for LK Holding in all-members..."
curl -s -H "Authorization: Bearer $TOKEN" \
  "https://ca-ctn-asr-api-dev.calmriver-700a8c55.westeurope.azurecontainerapps.io/api/v1/all-members?search=LK" | jq '.data[] | select(.legal_name | test("LK|Holding"; "i"))'

echo ""
echo "Checking legal-entities endpoint for LK Holding ID..."
curl -s -H "Authorization: Bearer $TOKEN" \
  "https://ca-ctn-asr-api-dev.calmriver-700a8c55.westeurope.azurecontainerapps.io/api/v1/legal-entities/8fc8562b-96d5-4a97-9195-a8682abefe85" | jq '{legal_entity_id, primary_legal_name, status}'
