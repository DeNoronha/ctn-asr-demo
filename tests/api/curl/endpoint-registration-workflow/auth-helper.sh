#!/bin/bash

# ============================================
# Authentication Helper for Endpoint Registration Tests
# ============================================
# Purpose: Get OAuth2 token and find/create test entity
# Last Updated: November 10, 2025
# ============================================

set -e

# Source credentials from .credentials file
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
CREDENTIALS_FILE="$SCRIPT_DIR/../../../.credentials"

if [ ! -f "$CREDENTIALS_FILE" ]; then
  echo "❌ Error: .credentials file not found at $CREDENTIALS_FILE"
  echo "Please ensure .credentials file exists in repository root"
  exit 1
fi

source "$CREDENTIALS_FILE"

TENANT_ID="${AZURE_AD_TENANT_ID}"
CLIENT_ID="${AZURE_AD_CLIENT_ID}"
SCOPE="$CLIENT_ID/.default"
USERNAME="${E2E_TEST_USER_EMAIL}"
PASSWORD="${E2E_TEST_USER_PASSWORD}"
API_BASE_URL="${API_BASE_URL}"

echo "============================================"
echo "Endpoint Registration Workflow - Auth Setup"
echo "============================================"
echo ""

# Step 1: Get OAuth token
echo "Step 1: Acquiring Azure AD Token..."
RESPONSE=$(curl -s -X POST "https://login.microsoftonline.com/$TENANT_ID/oauth2/v2.0/token" \
  -H "Content-Type: application/x-www-form-urlencoded" \
  -d "client_id=$CLIENT_ID" \
  -d "scope=$SCOPE" \
  -d "username=$USERNAME" \
  -d "password=$PASSWORD" \
  -d "grant_type=password")

if echo "$RESPONSE" | grep -q "access_token"; then
  TOKEN=$(echo "$RESPONSE" | grep -o '"access_token":"[^"]*' | cut -d'"' -f4)
  echo "✓ Token acquired successfully"
  echo "$TOKEN" > /tmp/asr-api-token.txt
else
  echo "✗ Failed to acquire token"
  echo "$RESPONSE"
  exit 1
fi

echo ""

# Step 2: Get a legal entity for testing (SystemAdmin has access to all)
echo "Step 2: Getting legal entity for testing..."
MEMBERS_RESPONSE=$(curl -s -H "Authorization: Bearer $TOKEN" "$API_BASE_URL/all-members")

if echo "$MEMBERS_RESPONSE" | grep -q "legal_entity_id"; then
  LEGAL_ENTITY_ID=$(echo "$MEMBERS_RESPONSE" | grep -o '"legal_entity_id":"[^"]*' | head -1 | cut -d'"' -f4)
  LEGAL_NAME=$(echo "$MEMBERS_RESPONSE" | grep -o '"legal_name":"[^"]*' | head -1 | cut -d'"' -f4)
  echo "✓ Using existing entity: $LEGAL_NAME"
  echo "  Entity ID: $LEGAL_ENTITY_ID"
  echo "$LEGAL_ENTITY_ID" > /tmp/asr-test-legal-entity-id.txt
else
  echo "✗ No legal entities found in system"
  echo "$MEMBERS_RESPONSE"
  exit 1
fi

echo ""
echo "============================================"
echo "✓ Authentication Setup Complete"
echo "============================================"
echo "Token saved to: /tmp/asr-api-token.txt"
echo "Legal Entity ID: $LEGAL_ENTITY_ID"
echo "Saved to: /tmp/asr-test-legal-entity-id.txt"
echo ""
echo "Usage in test scripts:"
echo "  TOKEN=\$(cat /tmp/asr-api-token.txt)"
echo "  LEGAL_ENTITY_ID=\$(cat /tmp/asr-test-legal-entity-id.txt)"
echo ""
