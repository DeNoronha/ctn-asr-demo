#!/bin/bash

TOKEN=$(curl -s -X POST "https://login.microsoftonline.com/598664e7-725c-4daa-bd1f-89c4ada717ff/oauth2/v2.0/token" \
  -H "Content-Type: application/x-www-form-urlencoded" \
  -d "client_id=d3037c11-a541-4f21-8862-8079137a0cde" \
  -d "scope=api://d3037c11-a541-4f21-8862-8079137a0cde/.default" \
  -d "username=test-e2@denoronha.consulting" \
  -d "password=Madu5952" \
  -d "grant_type=password" | jq -r '.access_token')

# Get application details to find email
echo "Getting LK Holding application details..."
APP_DATA=$(curl -s -H "Authorization: Bearer $TOKEN" \
  "https://ca-ctn-asr-api-dev.calmriver-700a8c55.westeurope.azurecontainerapps.io/api/v1/applications" | \
  jq '.data[] | select(.legal_name == "Lk Holding")')

echo "$APP_DATA" | jq '{application_id, applicant_email, kvk_number}'

APPLICANT_EMAIL=$(echo "$APP_DATA" | jq -r '.applicant_email')
echo ""
echo "Applicant email: $APPLICANT_EMAIL"

# Create member record using API - check if there's a POST endpoint
echo ""
echo "Checking available member endpoints..."
curl -s -H "Authorization: Bearer $TOKEN" \
  -X POST \
  -H "Content-Type: application/json" \
  -d '{
    "legal_entity_id": "8fc8562b-96d5-4a97-9195-a8682abefee5",
    "email": "'"$APPLICANT_EMAIL"'"
  }' \
  "https://ca-ctn-asr-api-dev.calmriver-700a8c55.westeurope.azurecontainerapps.io/api/v1/members" | jq '.'
