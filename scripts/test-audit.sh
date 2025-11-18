#!/bin/bash
TOKEN=$(curl -s -X POST \
    "https://login.microsoftonline.com/598664e7-725c-4daa-bd1f-89c4ada717ff/oauth2/v2.0/token" \
    -H "Content-Type: application/x-www-form-urlencoded" \
    -d "client_id=d3037c11-a541-4f21-8862-8079137a0cde" \
    -d "scope=api://d3037c11-a541-4f21-8862-8079137a0cde/.default" \
    -d "username=test-e2@denoronha.consulting" \
    -d "password=Madu5952" \
    -d "grant_type=password" | jq -r '.access_token')

echo "Testing audit-logs endpoint:"
curl -s "https://func-ctn-demo-asr-dev.azurewebsites.net/api/v1/audit-logs" \
    -H "Authorization: Bearer $TOKEN" \
    -w "\nHTTP Status: %{http_code}\n"
