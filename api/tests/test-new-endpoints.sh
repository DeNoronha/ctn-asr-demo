#!/bin/bash

################################################################################
# Test NEW Endpoints Only
# Task 5 - Identifier Verifications
# Task Management
################################################################################

set -e

RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m'

API_BASE="https://func-ctn-demo-asr-dev.azurewebsites.net/api/v1"
TOKEN=$(cat /tmp/asr-api-token.txt)

echo "============================================"
echo "Testing NEW Endpoints (Just Deployed)"
echo "============================================"
echo ""

# Get a legal entity ID first
echo "[1] Getting legal entity ID..."
MEMBER_RESPONSE=$(curl -s -w "\nHTTP_CODE:%{http_code}" -H "Authorization: Bearer $TOKEN" "$API_BASE/member")
HTTP_CODE=$(echo "$MEMBER_RESPONSE" | grep "HTTP_CODE:" | cut -d':' -f2)
RESPONSE_BODY=$(echo "$MEMBER_RESPONSE" | sed '/HTTP_CODE:/d')

if [ "$HTTP_CODE" = "200" ]; then
  LEGAL_ENTITY_ID=$(echo "$RESPONSE_BODY" | jq -r '.legalEntityId // .legal_entity_id // empty')
  if [ -z "$LEGAL_ENTITY_ID" ]; then
    LEGAL_ENTITY_ID="96701dc5-4234-4f67-8a0c-5679c4276d37"  # Fallback
  fi
  echo -e "${GREEN}✓${NC} Legal Entity ID: $LEGAL_ENTITY_ID"
else
  echo -e "${RED}✗${NC} Failed to get member, HTTP $HTTP_CODE"
  LEGAL_ENTITY_ID="96701dc5-4234-4f67-8a0c-5679c4276d37"
fi

echo ""

################################################################################
# IDENTIFIER VERIFICATIONS (Task 5 - CRITICAL)
################################################################################

echo "[2] Testing Identifier Verification Endpoints (Task 5)..."
echo ""

# GET verifications
echo "[2a] GET /v1/legal-entities/{id}/verifications"
VER_RESPONSE=$(curl -s -w "\nHTTP_CODE:%{http_code}" -H "Authorization: Bearer $TOKEN" \
  "$API_BASE/legal-entities/$LEGAL_ENTITY_ID/verifications")
HTTP_CODE=$(echo "$VER_RESPONSE" | grep "HTTP_CODE:" | cut -d':' -f2)
RESPONSE_BODY=$(echo "$VER_RESPONSE" | sed '/HTTP_CODE:/d')

echo "Response Code: $HTTP_CODE"
if [ "$HTTP_CODE" = "200" ]; then
  VER_COUNT=$(echo "$RESPONSE_BODY" | jq '.verifications | length // .count // 0')
  echo -e "${GREEN}✓${NC} GET verifications - HTTP 200, Found $VER_COUNT verifications"
  if [ "$VER_COUNT" -gt 0 ]; then
    echo "$RESPONSE_BODY" | jq '.verifications[0] // empty' | head -10
  fi
elif [ "$HTTP_CODE" = "404" ]; then
  echo -e "${RED}✗${NC} GET verifications - HTTP 404 (ENDPOINT NOT DEPLOYED)"
else
  echo -e "${RED}✗${NC} GET verifications - HTTP $HTTP_CODE"
  echo "Response: $RESPONSE_BODY" | head -5
fi

echo ""

# POST verification
echo "[2b] POST /v1/legal-entities/{id}/verifications (file upload)"
TEST_DOC="/tmp/test_verification_$(date +%s).txt"
cat > "$TEST_DOC" <<EOF
Test Verification Document
==========================
Legal Entity: $LEGAL_ENTITY_ID
Identifier Type: KVK
Verification Date: $(date)
Test Data: This is an automated test upload
EOF

UPLOAD_RESPONSE=$(curl -s -w "\nHTTP_CODE:%{http_code}" \
  -H "Authorization: Bearer $TOKEN" \
  -F "file=@$TEST_DOC" \
  "$API_BASE/legal-entities/$LEGAL_ENTITY_ID/verifications")
HTTP_CODE=$(echo "$UPLOAD_RESPONSE" | grep "HTTP_CODE:" | cut -d':' -f2)
RESPONSE_BODY=$(echo "$UPLOAD_RESPONSE" | sed '/HTTP_CODE:/d')

rm -f "$TEST_DOC"

echo "Response Code: $HTTP_CODE"
if [ "$HTTP_CODE" = "201" ] || [ "$HTTP_CODE" = "200" ]; then
  VERIFICATION_ID=$(echo "$RESPONSE_BODY" | jq -r '.verification_id // .id // empty')
  echo -e "${GREEN}✓${NC} POST verification - HTTP $HTTP_CODE, Verification ID: $VERIFICATION_ID"
elif [ "$HTTP_CODE" = "404" ]; then
  echo -e "${RED}✗${NC} POST verification - HTTP 404 (ENDPOINT NOT DEPLOYED)"
else
  echo -e "${RED}✗${NC} POST verification - HTTP $HTTP_CODE"
  echo "Response: $(echo "$RESPONSE_BODY" | jq -c '.' 2>/dev/null || echo "$RESPONSE_BODY")"
fi

echo ""
echo ""

################################################################################
# TASK MANAGEMENT ENDPOINTS
################################################################################

echo "[3] Testing Task Management Endpoints..."
echo ""

# GET tasks
echo "[3a] GET /v1/admin/tasks"
TASK_RESPONSE=$(curl -s -w "\nHTTP_CODE:%{http_code}" -H "Authorization: Bearer $TOKEN" \
  "$API_BASE/admin/tasks")
HTTP_CODE=$(echo "$TASK_RESPONSE" | grep "HTTP_CODE:" | cut -d':' -f2)
RESPONSE_BODY=$(echo "$TASK_RESPONSE" | sed '/HTTP_CODE:/d')

echo "Response Code: $HTTP_CODE"
if [ "$HTTP_CODE" = "200" ]; then
  TASK_COUNT=$(echo "$RESPONSE_BODY" | jq 'length // 0')
  echo -e "${GREEN}✓${NC} GET tasks - HTTP 200, Found $TASK_COUNT tasks"
  if [ "$TASK_COUNT" -gt 0 ]; then
    echo "$RESPONSE_BODY" | jq '.[0] // empty' | head -10
  fi
elif [ "$HTTP_CODE" = "404" ]; then
  echo -e "${RED}✗${NC} GET tasks - HTTP 404 (ENDPOINT NOT DEPLOYED)"
else
  echo -e "${RED}✗${NC} GET tasks - HTTP $HTTP_CODE"
  echo "Response: $RESPONSE_BODY" | head -5
fi

echo ""

# POST create task (with CSRF token)
echo "[3b] POST /v1/admin/tasks (create new task)"
TASK_DATA=$(cat <<EOF
{
  "title": "API Test Task - $(date +%s)",
  "description": "Comprehensive deployment test",
  "task_type": "member_application_review",
  "priority": "medium"
}
EOF
)

CREATE_RESPONSE=$(curl -s -w "\nHTTP_CODE:%{http_code}" \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -H "X-CSRF-Token: test-token-$(date +%s)" \
  -d "$TASK_DATA" \
  "$API_BASE/admin/tasks")
HTTP_CODE=$(echo "$CREATE_RESPONSE" | grep "HTTP_CODE:" | cut -d':' -f2)
RESPONSE_BODY=$(echo "$CREATE_RESPONSE" | sed '/HTTP_CODE:/d')

echo "Response Code: $HTTP_CODE"
if [ "$HTTP_CODE" = "201" ] || [ "$HTTP_CODE" = "200" ]; then
  TASK_ID=$(echo "$RESPONSE_BODY" | jq -r '.task_id // .id // empty')
  echo -e "${GREEN}✓${NC} POST task - HTTP $HTTP_CODE, Task ID: $TASK_ID"
elif [ "$HTTP_CODE" = "403" ]; then
  echo -e "${YELLOW}⚠${NC} POST task - HTTP 403 (CSRF protection active - expected behavior)"
elif [ "$HTTP_CODE" = "404" ]; then
  echo -e "${RED}✗${NC} POST task - HTTP 404 (ENDPOINT NOT DEPLOYED)"
else
  echo -e "${RED}✗${NC} POST task - HTTP $HTTP_CODE"
  echo "Response: $(echo "$RESPONSE_BODY" | jq -c '.' 2>/dev/null || echo "$RESPONSE_BODY")"
fi

echo ""

# PATCH update task (if we have a task ID)
if [ -n "$TASK_ID" ]; then
  echo "[3c] PATCH /v1/admin/tasks/{id} (update task)"
  UPDATE_DATA='{"status": "in_progress", "notes": "Updated by comprehensive test"}'

  UPDATE_RESPONSE=$(curl -s -w "\nHTTP_CODE:%{http_code}" \
    -X PATCH \
    -H "Authorization: Bearer $TOKEN" \
    -H "Content-Type: application/json" \
    -H "X-CSRF-Token: test-token-$(date +%s)" \
    -d "$UPDATE_DATA" \
    "$API_BASE/admin/tasks/$TASK_ID")
  HTTP_CODE=$(echo "$UPDATE_RESPONSE" | grep "HTTP_CODE:" | cut -d':' -f2)

  echo "Response Code: $HTTP_CODE"
  if [ "$HTTP_CODE" = "200" ]; then
    echo -e "${GREEN}✓${NC} PATCH task - HTTP 200"
  elif [ "$HTTP_CODE" = "404" ]; then
    echo -e "${RED}✗${NC} PATCH task - HTTP 404 (ENDPOINT NOT DEPLOYED)"
  else
    echo -e "${RED}✗${NC} PATCH task - HTTP $HTTP_CODE"
  fi
else
  echo "[3c] PATCH /v1/admin/tasks/{id} - Skipped (no task ID available)"
fi

echo ""
echo ""

################################################################################
# SUMMARY
################################################################################

echo "============================================"
echo "NEW ENDPOINTS SUMMARY"
echo "============================================"
echo ""
echo "Tested endpoints:"
echo "  1. GET /v1/legal-entities/{id}/verifications"
echo "  2. POST /v1/legal-entities/{id}/verifications"
echo "  3. GET /v1/admin/tasks"
echo "  4. POST /v1/admin/tasks"
echo "  5. PATCH /v1/admin/tasks/{id}"
echo ""
echo "Check for any 404 errors above - these indicate"
echo "endpoints are not deployed to the function app."
echo ""
echo "Completed: $(date)"
echo "============================================"
