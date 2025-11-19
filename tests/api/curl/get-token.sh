#!/bin/bash

# ============================================
# Get Azure AD Token for E2E Test User
# ============================================
# Purpose: Acquire OAuth2 token for API testing
# User: test-e2@denoronha.consulting (MFA excluded)
# Last Updated: November 6, 2025
# ============================================

set -e

TENANT_ID="598664e7-725c-4daa-bd1f-89c4ada717ff"
CLIENT_ID="d3037c11-a541-4f21-8862-8079137a0cde"
# Use GUID-based scope instead of API URI for ROPC flow
SCOPE="$CLIENT_ID/.default"
USERNAME="test-e2@denoronha.consulting"

# Password from environment variable (see .credentials file line 203)
PASSWORD="${E2E_TEST_USER_PASSWORD:-}"
if [ -z "$PASSWORD" ]; then
  echo "❌ E2E_TEST_USER_PASSWORD environment variable not set"
  echo "   Get password from .credentials file (E2E test user section)"
  echo "   Then: export E2E_TEST_USER_PASSWORD=<password>"
  exit 1
fi

echo "============================================"
echo "Acquiring Azure AD Token..."
echo "============================================"
echo "Tenant: $TENANT_ID"
echo "Client: $CLIENT_ID"
echo "User: $USERNAME"
echo ""

# Use Resource Owner Password Credentials (ROPC) flow
# NOTE: Only works for users excluded from MFA
RESPONSE=$(curl -s -X POST "https://login.microsoftonline.com/$TENANT_ID/oauth2/v2.0/token" \
  -H "Content-Type: application/x-www-form-urlencoded" \
  -d "client_id=$CLIENT_ID" \
  -d "scope=$SCOPE" \
  -d "username=$USERNAME" \
  -d "password=$PASSWORD" \
  -d "grant_type=password")

# Check if we got a token
if echo "$RESPONSE" | grep -q "access_token"; then
  ACCESS_TOKEN=$(echo "$RESPONSE" | grep -o '"access_token":"[^"]*' | cut -d'"' -f4)
  echo "✓ Token acquired successfully"
  echo ""
  echo "ACCESS_TOKEN=$ACCESS_TOKEN"
  echo ""
  echo "Token (first 50 chars): ${ACCESS_TOKEN:0:50}..."
  echo ""

  # Save to file for use in other scripts
  echo "$ACCESS_TOKEN" > /tmp/asr-api-token.txt
  echo "✓ Token saved to /tmp/asr-api-token.txt"
  echo ""
  echo "Usage in other scripts:"
  echo "  TOKEN=\$(cat /tmp/asr-api-token.txt)"
  echo ""
else
  echo "✗ Failed to acquire token"
  echo ""
  echo "Response:"
  echo "$RESPONSE" | jq . 2>/dev/null || echo "$RESPONSE"
  exit 1
fi
