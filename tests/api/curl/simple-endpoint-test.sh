#!/bin/bash

TOKEN=$(cat /tmp/asr-api-token.txt)
API_BASE="https://ca-ctn-asr-api-dev.calmriver-700a8c55.westeurope.azurecontainerapps.io/api"

echo "Testing endpoints..."
echo ""

echo "1. Health check:"
curl -s "${API_BASE}/health" | head -20
echo ""

echo "2. Version:"
curl -s "${API_BASE}/version" -H "Authorization: Bearer ${TOKEN}"
echo ""
echo ""

echo "3. Members:"
curl -s "${API_BASE}/v1/members" -H "Authorization: Bearer ${TOKEN}" | head -50
echo ""
echo ""

echo "4. Tasks:"
curl -s "${API_BASE}/v1/admin/tasks" -H "Authorization: Bearer ${TOKEN}" | head -50
echo ""
echo ""

echo "5. M2M Clients:"
curl -s "${API_BASE}/v1/admin/m2m-clients" -H "Authorization: Bearer ${TOKEN}" | head -50
echo ""
