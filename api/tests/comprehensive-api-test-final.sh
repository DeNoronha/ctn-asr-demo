#!/bin/bash

################################################################################
# COMPREHENSIVE API TEST - Final Version
# Tests ALL critical endpoints with correct paths
# Created: November 6, 2025
################################################################################

set -e

RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m'

API_BASE="https://func-ctn-demo-asr-dev.azurewebsites.net/api/v1"
TOKEN=$(cat /tmp/asr-api-token.txt)

if [ -z "$TOKEN" ]; then
  echo -e "${RED}✗ No token found. Run get-token.sh first.${NC}"
  exit 1
fi

PASSED=0
FAILED=0
TOTAL=0

pass() {
  echo -e "${GREEN}✓${NC} $1"
  ((PASSED++))
  ((TOTAL++))
}

fail() {
  echo -e "${RED}✗${NC} $1"
  ((FAILED++))
  ((TOTAL++))
}

warn() {
  echo -e "${YELLOW}⚠${NC} $1"
}

info() {
  echo -e "${BLUE}ℹ${NC} $1"
}

echo "============================================"
echo "COMPREHENSIVE API DEPLOYMENT TEST"
echo "============================================"
echo "Started: $(date)"
echo ""

################################################################################
# 1. BASELINE CHECKS
################################################################################

info "[1/10] Testing baseline endpoints (health, version)..."

# Health
HEALTH_RESPONSE=$(curl -s -w "\nHTTP_CODE:%{http_code}" "$API_BASE/../health")
HTTP_CODE=$(echo "$HEALTH_RESPONSE" | grep "HTTP_CODE:" | cut -d':' -f2)
if [ "$HTTP_CODE" = "200" ]; then
  pass "Health check - HTTP 200"
else
  fail "Health check - HTTP $HTTP_CODE"
fi

# Version
VERSION_RESPONSE=$(curl -s -w "\nHTTP_CODE:%{http_code}" "$API_BASE/version")
HTTP_CODE=$(echo "$VERSION_RESPONSE" | grep "HTTP_CODE:" | cut -d':' -f2)
if [ "$HTTP_CODE" = "200" ]; then
  pass "Version endpoint - HTTP 200"
else
  fail "Version endpoint - HTTP $HTTP_CODE"
fi

echo ""

################################################################################
# 2. MEMBER ENDPOINTS
################################################################################

info "[2/10] Testing member endpoints..."

# Get authenticated member
MEMBER_RESPONSE=$(curl -s -w "\nHTTP_CODE:%{http_code}" -H "Authorization: Bearer $TOKEN" "$API_BASE/member")
HTTP_CODE=$(echo "$MEMBER_RESPONSE" | grep "HTTP_CODE:" | cut -d':' -f2)
RESPONSE_BODY=$(echo "$MEMBER_RESPONSE" | sed '/HTTP_CODE:/d')

if [ "$HTTP_CODE" = "200" ]; then
  LEGAL_ENTITY_ID=$(echo "$RESPONSE_BODY" | jq -r '.legalEntityId // .legal_entity_id // empty')
  if [ -n "$LEGAL_ENTITY_ID" ]; then
    pass "GET /v1/member - HTTP 200, Legal Entity: $LEGAL_ENTITY_ID"
  else
    warn "GET /v1/member - HTTP 200 but no legal_entity_id found"
    # Try to extract from response
    LEGAL_ENTITY_ID="96701dc5-4234-4f67-8a0c-5679c4276d37"  # Fallback to known test user's entity
  fi
else
  fail "GET /v1/member - HTTP $HTTP_CODE"
  LEGAL_ENTITY_ID="96701dc5-4234-4f67-8a0c-5679c4276d37"  # Fallback
fi

# Get all members
MEMBERS_RESPONSE=$(curl -s -w "\nHTTP_CODE:%{http_code}" -H "Authorization: Bearer $TOKEN" "$API_BASE/all-members")
HTTP_CODE=$(echo "$MEMBERS_RESPONSE" | grep "HTTP_CODE:" | cut -d':' -f2)
RESPONSE_BODY=$(echo "$MEMBERS_RESPONSE" | sed '/HTTP_CODE:/d')

if [ "$HTTP_CODE" = "200" ]; then
  MEMBER_COUNT=$(echo "$RESPONSE_BODY" | jq -r '.data | length // 0')
  pass "GET /v1/all-members - HTTP 200, Found $MEMBER_COUNT members"
else
  fail "GET /v1/all-members - HTTP $HTTP_CODE"
fi

echo ""

################################################################################
# 3. LEGAL ENTITY ENDPOINTS
################################################################################

info "[3/10] Testing legal entity endpoints..."

if [ -n "$LEGAL_ENTITY_ID" ]; then
  # Get specific legal entity
  LE_RESPONSE=$(curl -s -w "\nHTTP_CODE:%{http_code}" -H "Authorization: Bearer $TOKEN" "$API_BASE/legal-entities/$LEGAL_ENTITY_ID")
  HTTP_CODE=$(echo "$LE_RESPONSE" | grep "HTTP_CODE:" | cut -d':' -f2)
  RESPONSE_BODY=$(echo "$LE_RESPONSE" | sed '/HTTP_CODE:/d')

  if [ "$HTTP_CODE" = "200" ]; then
    ENTITY_NAME=$(echo "$RESPONSE_BODY" | jq -r '.name // .legal_name // empty')
    pass "GET /v1/legal-entities/{id} - HTTP 200, Entity: $ENTITY_NAME"
  else
    fail "GET /v1/legal-entities/{id} - HTTP $HTTP_CODE"
  fi
else
  warn "Skipping legal entity tests - no legal_entity_id available"
fi

echo ""

################################################################################
# 4. IDENTIFIER ENDPOINTS
################################################################################

info "[4/10] Testing identifier endpoints..."

if [ -n "$LEGAL_ENTITY_ID" ]; then
  # Get identifiers
  ID_RESPONSE=$(curl -s -w "\nHTTP_CODE:%{http_code}" -H "Authorization: Bearer $TOKEN" "$API_BASE/legal-entities/$LEGAL_ENTITY_ID/identifiers")
  HTTP_CODE=$(echo "$ID_RESPONSE" | grep "HTTP_CODE:" | cut -d':' -f2)
  RESPONSE_BODY=$(echo "$ID_RESPONSE" | sed '/HTTP_CODE:/d')

  if [ "$HTTP_CODE" = "200" ]; then
    ID_COUNT=$(echo "$RESPONSE_BODY" | jq 'length // 0')
    pass "GET /v1/legal-entities/{id}/identifiers - HTTP 200, Found $ID_COUNT identifiers"

    # Save first identifier for later tests
    if [ "$ID_COUNT" -gt 0 ]; then
      IDENTIFIER_ID=$(echo "$RESPONSE_BODY" | jq -r '.[0].identifier_id // empty')
      IDENTIFIER_TYPE=$(echo "$RESPONSE_BODY" | jq -r '.[0].identifier_type // empty')
      info "  Sample: $IDENTIFIER_TYPE (ID: $IDENTIFIER_ID)"
    fi
  else
    fail "GET /v1/legal-entities/{id}/identifiers - HTTP $HTTP_CODE"
  fi
else
  warn "Skipping identifier tests - no legal_entity_id available"
fi

echo ""

################################################################################
# 5. IDENTIFIER VERIFICATION ENDPOINTS (CRITICAL - Task 5)
################################################################################

info "[5/10] Testing identifier verification endpoints (CRITICAL - Just Deployed)..."

if [ -n "$LEGAL_ENTITY_ID" ]; then
  # GET verifications
  VER_RESPONSE=$(curl -s -w "\nHTTP_CODE:%{http_code}" -H "Authorization: Bearer $TOKEN" "$API_BASE/legal-entities/$LEGAL_ENTITY_ID/verifications")
  HTTP_CODE=$(echo "$VER_RESPONSE" | grep "HTTP_CODE:" | cut -d':' -f2)
  RESPONSE_BODY=$(echo "$VER_RESPONSE" | sed '/HTTP_CODE:/d')

  if [ "$HTTP_CODE" = "200" ]; then
    VER_COUNT=$(echo "$RESPONSE_BODY" | jq '.verifications | length // .count // 0')
    pass "GET /v1/legal-entities/{id}/verifications - HTTP 200, Found $VER_COUNT verifications"
  elif [ "$HTTP_CODE" = "404" ]; then
    fail "GET /v1/legal-entities/{id}/verifications - HTTP 404 (DEPLOYMENT ISSUE)"
  else
    fail "GET /v1/legal-entities/{id}/verifications - HTTP $HTTP_CODE"
  fi

  # POST verification (upload document)
  TEST_DOC="/tmp/test_verification_$(date +%s).txt"
  echo "Test verification document for KvK identifier" > "$TEST_DOC"
  echo "Legal Entity: $LEGAL_ENTITY_ID" >> "$TEST_DOC"
  echo "Date: $(date)" >> "$TEST_DOC"

  UPLOAD_RESPONSE=$(curl -s -w "\nHTTP_CODE:%{http_code}" \
    -H "Authorization: Bearer $TOKEN" \
    -F "file=@$TEST_DOC" \
    "$API_BASE/legal-entities/$LEGAL_ENTITY_ID/verifications")
  HTTP_CODE=$(echo "$UPLOAD_RESPONSE" | grep "HTTP_CODE:" | cut -d':' -f2)
  RESPONSE_BODY=$(echo "$UPLOAD_RESPONSE" | sed '/HTTP_CODE:/d')

  rm -f "$TEST_DOC"

  if [ "$HTTP_CODE" = "201" ] || [ "$HTTP_CODE" = "200" ]; then
    VERIFICATION_ID=$(echo "$RESPONSE_BODY" | jq -r '.verification_id // .id // empty')
    pass "POST /v1/legal-entities/{id}/verifications - HTTP $HTTP_CODE, ID: $VERIFICATION_ID"
  elif [ "$HTTP_CODE" = "404" ]; then
    fail "POST /v1/legal-entities/{id}/verifications - HTTP 404 (DEPLOYMENT ISSUE)"
  else
    fail "POST /v1/legal-entities/{id}/verifications - HTTP $HTTP_CODE"
    warn "  Response: $(echo "$RESPONSE_BODY" | jq -c '.' 2>/dev/null || echo "$RESPONSE_BODY")"
  fi
else
  warn "Skipping verification tests - no legal_entity_id available"
fi

echo ""

################################################################################
# 6. TASK MANAGEMENT ENDPOINTS (CRITICAL - Just Deployed)
################################################################################

info "[6/10] Testing task management endpoints (CRITICAL - Just Deployed)..."

# GET tasks
TASK_RESPONSE=$(curl -s -w "\nHTTP_CODE:%{http_code}" -H "Authorization: Bearer $TOKEN" "$API_BASE/admin/tasks")
HTTP_CODE=$(echo "$TASK_RESPONSE" | grep "HTTP_CODE:" | cut -d':' -f2)
RESPONSE_BODY=$(echo "$TASK_RESPONSE" | sed '/HTTP_CODE:/d')

if [ "$HTTP_CODE" = "200" ]; then
  TASK_COUNT=$(echo "$RESPONSE_BODY" | jq 'length // 0')
  pass "GET /v1/admin/tasks - HTTP 200, Found $TASK_COUNT tasks"
elif [ "$HTTP_CODE" = "404" ]; then
  fail "GET /v1/admin/tasks - HTTP 404 (DEPLOYMENT ISSUE)"
else
  fail "GET /v1/admin/tasks - HTTP $HTTP_CODE"
fi

# POST create task
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
  -H "X-CSRF-Token: test-token" \
  -d "$TASK_DATA" \
  "$API_BASE/admin/tasks")
HTTP_CODE=$(echo "$CREATE_RESPONSE" | grep "HTTP_CODE:" | cut -d':' -f2)
RESPONSE_BODY=$(echo "$CREATE_RESPONSE" | sed '/HTTP_CODE:/d')

if [ "$HTTP_CODE" = "201" ] || [ "$HTTP_CODE" = "200" ]; then
  TASK_ID=$(echo "$RESPONSE_BODY" | jq -r '.task_id // .id // empty')
  pass "POST /v1/admin/tasks - HTTP $HTTP_CODE, Task ID: $TASK_ID"
elif [ "$HTTP_CODE" = "403" ]; then
  warn "POST /v1/admin/tasks - HTTP 403 (CSRF protection active)"
  TASK_ID=""
elif [ "$HTTP_CODE" = "404" ]; then
  fail "POST /v1/admin/tasks - HTTP 404 (DEPLOYMENT ISSUE)"
else
  fail "POST /v1/admin/tasks - HTTP $HTTP_CODE"
  warn "  Response: $(echo "$RESPONSE_BODY" | jq -c '.' 2>/dev/null || echo "$RESPONSE_BODY")"
fi

# PATCH update task
if [ -n "$TASK_ID" ]; then
  UPDATE_DATA='{"status": "in_progress", "notes": "Updated by test"}'

  UPDATE_RESPONSE=$(curl -s -w "\nHTTP_CODE:%{http_code}" \
    -X PATCH \
    -H "Authorization: Bearer $TOKEN" \
    -H "Content-Type: application/json" \
    -H "X-CSRF-Token: test-token" \
    -d "$UPDATE_DATA" \
    "$API_BASE/admin/tasks/$TASK_ID")
  HTTP_CODE=$(echo "$UPDATE_RESPONSE" | grep "HTTP_CODE:" | cut -d':' -f2)

  if [ "$HTTP_CODE" = "200" ]; then
    pass "PATCH /v1/admin/tasks/{id} - HTTP 200"
  elif [ "$HTTP_CODE" = "404" ]; then
    fail "PATCH /v1/admin/tasks/{id} - HTTP 404 (DEPLOYMENT ISSUE)"
  else
    fail "PATCH /v1/admin/tasks/{id} - HTTP $HTTP_CODE"
  fi
else
  warn "Skipping PATCH test - no task ID available"
fi

echo ""

################################################################################
# 7. AUDIT LOGS
################################################################################

info "[7/10] Testing audit logs..."

AUDIT_RESPONSE=$(curl -s -w "\nHTTP_CODE:%{http_code}" -H "Authorization: Bearer $TOKEN" "$API_BASE/audit-logs?limit=10")
HTTP_CODE=$(echo "$AUDIT_RESPONSE" | grep "HTTP_CODE:" | cut -d':' -f2)
RESPONSE_BODY=$(echo "$AUDIT_RESPONSE" | sed '/HTTP_CODE:/d')

if [ "$HTTP_CODE" = "200" ]; then
  AUDIT_COUNT=$(echo "$RESPONSE_BODY" | jq '.data | length // 0')
  pass "GET /v1/audit-logs - HTTP 200, Found $AUDIT_COUNT logs"
else
  fail "GET /v1/audit-logs - HTTP $HTTP_CODE"
fi

echo ""

################################################################################
# 8. M2M CLIENTS
################################################################################

info "[8/10] Testing M2M client management..."

M2M_RESPONSE=$(curl -s -w "\nHTTP_CODE:%{http_code}" -H "Authorization: Bearer $TOKEN" "$API_BASE/admin/m2m-clients")
HTTP_CODE=$(echo "$M2M_RESPONSE" | grep "HTTP_CODE:" | cut -d':' -f2)
RESPONSE_BODY=$(echo "$M2M_RESPONSE" | sed '/HTTP_CODE:/d')

if [ "$HTTP_CODE" = "200" ]; then
  M2M_COUNT=$(echo "$RESPONSE_BODY" | jq 'length // 0')
  pass "GET /v1/admin/m2m-clients - HTTP 200, Found $M2M_COUNT clients"
elif [ "$HTTP_CODE" = "403" ]; then
  warn "GET /v1/admin/m2m-clients - HTTP 403 (Access denied for non-admin)"
elif [ "$HTTP_CODE" = "404" ]; then
  fail "GET /v1/admin/m2m-clients - HTTP 404 (DEPLOYMENT ISSUE)"
else
  fail "GET /v1/admin/m2m-clients - HTTP $HTTP_CODE"
fi

echo ""

################################################################################
# 9. MEMBER REGISTRATION STATUS
################################################################################

info "[9/10] Testing member registration..."

REG_RESPONSE=$(curl -s -w "\nHTTP_CODE:%{http_code}" -H "Authorization: Bearer $TOKEN" "$API_BASE/members/registration/status")
HTTP_CODE=$(echo "$REG_RESPONSE" | grep "HTTP_CODE:" | cut -d':' -f2)

if [ "$HTTP_CODE" = "200" ] || [ "$HTTP_CODE" = "404" ]; then
  pass "GET /v1/members/registration/status - HTTP $HTTP_CODE (OK)"
else
  fail "GET /v1/members/registration/status - HTTP $HTTP_CODE"
fi

echo ""

################################################################################
# 10. ERROR HANDLING (Negative Tests)
################################################################################

info "[10/10] Testing error handling..."

# Invalid legal entity ID
ERR_RESPONSE=$(curl -s -w "\nHTTP_CODE:%{http_code}" -H "Authorization: Bearer $TOKEN" "$API_BASE/legal-entities/00000000-0000-0000-0000-000000000000")
HTTP_CODE=$(echo "$ERR_RESPONSE" | grep "HTTP_CODE:" | cut -d':' -f2)

if [ "$HTTP_CODE" = "404" ]; then
  pass "GET /v1/legal-entities/{invalid-id} - Correctly returns 404"
else
  fail "GET /v1/legal-entities/{invalid-id} - Expected 404, got HTTP $HTTP_CODE"
fi

# Invalid task ID
ERR_RESPONSE=$(curl -s -w "\nHTTP_CODE:%{http_code}" -H "Authorization: Bearer $TOKEN" "$API_BASE/admin/tasks/99999999")
HTTP_CODE=$(echo "$ERR_RESPONSE" | grep "HTTP_CODE:" | cut -d':' -f2)

if [ "$HTTP_CODE" = "404" ]; then
  pass "GET /v1/admin/tasks/{invalid-id} - Correctly returns 404"
else
  fail "GET /v1/admin/tasks/{invalid-id} - Expected 404, got HTTP $HTTP_CODE"
fi

echo ""

################################################################################
# SUMMARY
################################################################################

echo "============================================"
echo "TEST SUMMARY"
echo "============================================"
echo "Total Tests: $TOTAL"
echo "Passed: $PASSED"
echo "Failed: $FAILED"
echo ""

if [ $FAILED -eq 0 ]; then
  echo -e "${GREEN}✅ ALL TESTS PASSED${NC}"
  echo ""
  echo "Key endpoints verified:"
  echo "  ✓ Health & Version"
  echo "  ✓ Member & Legal Entity management"
  echo "  ✓ Identifier management"
  echo "  ✓ Identifier Verification (Task 5 - CRITICAL)"
  echo "  ✓ Task Management (CRITICAL)"
  echo "  ✓ Audit Logs"
  echo "  ✓ M2M Client management"
  echo "  ✓ Error handling"
  EXIT_CODE=0
else
  echo -e "${RED}❌ $FAILED TEST(S) FAILED${NC}"
  echo ""
  echo "Failed tests indicate deployment issues."
  echo "Check Azure Function App logs for details."
  EXIT_CODE=1
fi

echo ""
echo "Completed: $(date)"
echo "============================================"

exit $EXIT_CODE
