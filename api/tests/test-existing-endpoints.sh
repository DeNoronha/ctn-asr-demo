#!/bin/bash

# ============================================
# Test Existing Deployed Endpoints
# ============================================
# Purpose: Verify currently deployed endpoints work correctly
# Last Updated: November 6, 2025
# ============================================

set -e

API_BASE="https://func-ctn-demo-asr-dev.azurewebsites.net/api/v1"
TOKEN=$(cat /tmp/asr-api-token.txt)

if [ -z "$TOKEN" ]; then
  echo "✗ No token found. Run get-token.sh first."
  exit 1
fi

echo "============================================"
echo "Testing Currently Deployed API Endpoints"
echo "============================================"
echo ""

# Test 1: Health check (no auth required)
echo "[1/8] Testing health endpoint..."
HEALTH_RESPONSE=$(curl -s -w "\nHTTP_CODE:%{http_code}" "$API_BASE/../health")
HTTP_CODE=$(echo "$HEALTH_RESPONSE" | grep "HTTP_CODE:" | cut -d':' -f2)
if [ "$HTTP_CODE" = "200" ]; then
  echo "✓ Health check: HTTP $HTTP_CODE - API is healthy"
else
  echo "✗ Health check: HTTP $HTTP_CODE - API health check failed"
fi
echo ""

# Test 2: Get version (no auth required)
echo "[2/8] Testing version endpoint..."
VERSION_RESPONSE=$(curl -s -w "\nHTTP_CODE:%{http_code}" "$API_BASE/version")
HTTP_CODE=$(echo "$VERSION_RESPONSE" | grep "HTTP_CODE:" | cut -d':' -f2)
RESPONSE_BODY=$(echo "$VERSION_RESPONSE" | sed '/HTTP_CODE:/d')

if [ "$HTTP_CODE" = "200" ]; then
  echo "✓ Get version: HTTP $HTTP_CODE"
  echo "$RESPONSE_BODY" | jq -r 'if type=="object" then "  Version: \(.version // "unknown")\n  Environment: \(.environment // "unknown")" else "  Response: " + . end' 2>/dev/null || echo "  $RESPONSE_BODY"
else
  echo "✗ Get version: HTTP $HTTP_CODE"
fi
echo ""

# Test 3: Get authenticated member (requires auth)
echo "[3/8] Testing authenticated member endpoint..."
MEMBER_RESPONSE=$(curl -s -w "\nHTTP_CODE:%{http_code}" \
  -H "Authorization: Bearer $TOKEN" \
  "$API_BASE/member")
HTTP_CODE=$(echo "$MEMBER_RESPONSE" | grep "HTTP_CODE:" | cut -d':' -f2)
RESPONSE_BODY=$(echo "$MEMBER_RESPONSE" | sed '/HTTP_CODE:/d')

if [ "$HTTP_CODE" = "200" ]; then
  echo "✓ Get authenticated member: HTTP $HTTP_CODE"
  echo "$RESPONSE_BODY" | jq -r 'if type=="object" then "  Legal Name: \(.legal_name // "unknown")\n  Member ID: \(.org_id // "unknown")" else "  Response: " + . end' 2>/dev/null || echo "  $RESPONSE_BODY"
else
  echo "✗ Get authenticated member: HTTP $HTTP_CODE"
  [ "$HTTP_CODE" = "401" ] && echo "  Authentication failed"
  [ "$HTTP_CODE" = "403" ] && echo "  Authorization failed (user may not be a member)"
fi
echo ""

# Test 4: Get all members (admin only)
echo "[4/8] Testing get all members endpoint..."
MEMBERS_RESPONSE=$(curl -s -w "\nHTTP_CODE:%{http_code}" \
  -H "Authorization: Bearer $TOKEN" \
  "$API_BASE/all-members")
HTTP_CODE=$(echo "$MEMBERS_RESPONSE" | grep "HTTP_CODE:" | cut -d':' -f2)
RESPONSE_BODY=$(echo "$MEMBERS_RESPONSE" | sed '/HTTP_CODE:/d')

if [ "$HTTP_CODE" = "200" ]; then
  echo "✓ Get all members: HTTP $HTTP_CODE"
  MEMBER_COUNT=$(echo "$RESPONSE_BODY" | jq '.data | length' 2>/dev/null || echo "0")
  echo "  Member count: $MEMBER_COUNT"
else
  echo "✗ Get all members: HTTP $HTTP_CODE"
fi
echo ""

# Test 5: Get legal entity (need to get an ID first from members)
echo "[5/8] Testing get legal entity endpoint..."
if [ "$HTTP_CODE" = "200" ] && [ "$MEMBER_COUNT" -gt 0 ]; then
  LEGAL_ENTITY_ID=$(echo "$RESPONSE_BODY" | jq -r '.data[0].legal_entity_id // empty' 2>/dev/null)

  if [ -n "$LEGAL_ENTITY_ID" ]; then
    ENTITY_RESPONSE=$(curl -s -w "\nHTTP_CODE:%{http_code}" \
      -H "Authorization: Bearer $TOKEN" \
      "$API_BASE/legal-entities/$LEGAL_ENTITY_ID")
    HTTP_CODE=$(echo "$ENTITY_RESPONSE" | grep "HTTP_CODE:" | cut -d':' -f2)

    if [ "$HTTP_CODE" = "200" ]; then
      echo "✓ Get legal entity: HTTP $HTTP_CODE"
      echo "  Entity ID: $LEGAL_ENTITY_ID"
    else
      echo "✗ Get legal entity: HTTP $HTTP_CODE"
    fi
  else
    echo "⊘ Get legal entity: Skipped (no legal entity ID available)"
  fi
else
  echo "⊘ Get legal entity: Skipped (no members found)"
fi
echo ""

# Test 6: Get identifiers for legal entity
echo "[6/8] Testing get identifiers endpoint..."
if [ -n "$LEGAL_ENTITY_ID" ]; then
  IDENTIFIERS_RESPONSE=$(curl -s -w "\nHTTP_CODE:%{http_code}" \
    -H "Authorization: Bearer $TOKEN" \
    "$API_BASE/entities/$LEGAL_ENTITY_ID/identifiers")
  HTTP_CODE=$(echo "$IDENTIFIERS_RESPONSE" | grep "HTTP_CODE:" | cut -d':' -f2)
  RESPONSE_BODY=$(echo "$IDENTIFIERS_RESPONSE" | sed '/HTTP_CODE:/d')

  if [ "$HTTP_CODE" = "200" ]; then
    echo "✓ Get identifiers: HTTP $HTTP_CODE"
    IDENTIFIER_COUNT=$(echo "$RESPONSE_BODY" | jq 'length' 2>/dev/null || echo "0")
    echo "  Identifier count: $IDENTIFIER_COUNT"

    if [ "$IDENTIFIER_COUNT" -gt 0 ]; then
      echo "$RESPONSE_BODY" | jq -r '.[] | "  - \(.identifier_type): \(.identifier_value)"' 2>/dev/null | head -3
    fi
  else
    echo "✗ Get identifiers: HTTP $HTTP_CODE"
  fi
else
  echo "⊘ Get identifiers: Skipped (no legal entity ID)"
fi
echo ""

# Test 7: Get audit logs (admin only)
echo "[7/8] Testing get audit logs endpoint..."
AUDIT_RESPONSE=$(curl -s -w "\nHTTP_CODE:%{http_code}" \
  -H "Authorization: Bearer $TOKEN" \
  "$API_BASE/audit-logs")
HTTP_CODE=$(echo "$AUDIT_RESPONSE" | grep "HTTP_CODE:" | cut -d':' -f2)
RESPONSE_BODY=$(echo "$AUDIT_RESPONSE" | sed '/HTTP_CODE:/d')

if [ "$HTTP_CODE" = "200" ]; then
  echo "✓ Get audit logs: HTTP $HTTP_CODE"
  LOG_COUNT=$(echo "$RESPONSE_BODY" | jq '.data | length' 2>/dev/null || echo "0")
  echo "  Audit log count: $LOG_COUNT"
else
  echo "✗ Get audit logs: HTTP $HTTP_CODE"
fi
echo ""

# Test 8: Get party resolution (requires auth)
echo "[8/8] Testing party resolution endpoint..."
PARTY_RESPONSE=$(curl -s -w "\nHTTP_CODE:%{http_code}" \
  -H "Authorization: Bearer $TOKEN" \
  "$API_BASE/auth/resolve-party")
HTTP_CODE=$(echo "$PARTY_RESPONSE" | grep "HTTP_CODE:" | cut -d':' -f2)
RESPONSE_BODY=$(echo "$PARTY_RESPONSE" | sed '/HTTP_CODE:/d')

if [ "$HTTP_CODE" = "200" ]; then
  echo "✓ Party resolution: HTTP $HTTP_CODE"
  echo "$RESPONSE_BODY" | jq -r 'if type=="object" then "  Party Type: \(.party_type // "unknown")\n  Party ID: \(.party_id // "unknown")" else "  Response: " + . end' 2>/dev/null || echo "  $RESPONSE_BODY"
else
  echo "✗ Party resolution: HTTP $HTTP_CODE"
fi
echo ""

echo "============================================"
echo "Test Summary - Existing Endpoints"
echo "============================================"
echo "All tested endpoints are from currently deployed API"
echo "New endpoints (Task 5, User/Task Management) not yet deployed"
echo "============================================"
