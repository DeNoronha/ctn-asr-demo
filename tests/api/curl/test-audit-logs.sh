#!/bin/bash
# ========================================
# Test Script: GetAuditLogs API Endpoint
# ========================================
# Tests the audit logs retrieval endpoint with various filters

set -e

# Configuration
API_URL="https://ca-ctn-asr-api-dev.calmriver-700a8c55.westeurope.azurecontainerapps.io/api/v1"
# Get token from environment variable
AUTH_TOKEN="${AZURE_AD_TOKEN:-}"

# Colors for output
GREEN='\033[0;32m'
RED='\033[0;31m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Check if auth token is set
if [ -z "$AUTH_TOKEN" ]; then
  echo -e "${RED}ERROR: AZURE_AD_TOKEN environment variable not set${NC}"
  echo "Please obtain a token from the admin portal and set it:"
  echo "  export AZURE_AD_TOKEN=<your-access-token>"
  exit 1
fi

echo "========================================="
echo "Testing GetAuditLogs API Endpoint"
echo "========================================="
echo ""

# Test 1: Get all logs (first page)
echo -e "${YELLOW}Test 1: Get all audit logs (first page)${NC}"
RESPONSE=$(curl -s -w "\n%{http_code}" \
  -H "Authorization: Bearer $AUTH_TOKEN" \
  "$API_URL/audit-logs?page=1&limit=10")

HTTP_CODE=$(echo "$RESPONSE" | tail -n1)
BODY=$(echo "$RESPONSE" | sed '$d')

if [ "$HTTP_CODE" = "200" ]; then
  echo -e "${GREEN}✓ Success (HTTP $HTTP_CODE)${NC}"
  echo "$BODY" | jq -r '.pagination'
  echo "Sample record:"
  echo "$BODY" | jq -r '.data[0]'
else
  echo -e "${RED}✗ Failed (HTTP $HTTP_CODE)${NC}"
  echo "$BODY"
fi
echo ""

# Test 2: Filter by event type
echo -e "${YELLOW}Test 2: Filter by event type (member_created)${NC}"
RESPONSE=$(curl -s -w "\n%{http_code}" \
  -H "Authorization: Bearer $AUTH_TOKEN" \
  "$API_URL/audit-logs?event_type=member_created&limit=5")

HTTP_CODE=$(echo "$RESPONSE" | tail -n1)
BODY=$(echo "$RESPONSE" | sed '$d')

if [ "$HTTP_CODE" = "200" ]; then
  echo -e "${GREEN}✓ Success (HTTP $HTTP_CODE)${NC}"
  TOTAL=$(echo "$BODY" | jq -r '.pagination.totalItems')
  echo "Total member_created events: $TOTAL"
else
  echo -e "${RED}✗ Failed (HTTP $HTTP_CODE)${NC}"
  echo "$BODY"
fi
echo ""

# Test 3: Filter by result (failures only)
echo -e "${YELLOW}Test 3: Filter by result (failures only)${NC}"
RESPONSE=$(curl -s -w "\n%{http_code}" \
  -H "Authorization: Bearer $AUTH_TOKEN" \
  "$API_URL/audit-logs?result=failure&limit=5")

HTTP_CODE=$(echo "$RESPONSE" | tail -n1)
BODY=$(echo "$RESPONSE" | sed '$d')

if [ "$HTTP_CODE" = "200" ]; then
  echo -e "${GREEN}✓ Success (HTTP $HTTP_CODE)${NC}"
  TOTAL=$(echo "$BODY" | jq -r '.pagination.totalItems')
  echo "Total failure events: $TOTAL"
  if [ "$TOTAL" != "0" ]; then
    echo "Sample failure:"
    echo "$BODY" | jq -r '.data[0] | {event_type, severity, error_message}'
  fi
else
  echo -e "${RED}✗ Failed (HTTP $HTTP_CODE)${NC}"
  echo "$BODY"
fi
echo ""

# Test 4: Filter by severity
echo -e "${YELLOW}Test 4: Filter by severity (ERROR)${NC}"
RESPONSE=$(curl -s -w "\n%{http_code}" \
  -H "Authorization: Bearer $AUTH_TOKEN" \
  "$API_URL/audit-logs?severity=ERROR&limit=5")

HTTP_CODE=$(echo "$RESPONSE" | tail -n1)
BODY=$(echo "$RESPONSE" | sed '$d')

if [ "$HTTP_CODE" = "200" ]; then
  echo -e "${GREEN}✓ Success (HTTP $HTTP_CODE)${NC}"
  TOTAL=$(echo "$BODY" | jq -r '.pagination.totalItems')
  echo "Total ERROR severity events: $TOTAL"
else
  echo -e "${RED}✗ Failed (HTTP $HTTP_CODE)${NC}"
  echo "$BODY"
fi
echo ""

# Test 5: Filter by date range (last 7 days)
echo -e "${YELLOW}Test 5: Filter by date range (last 7 days)${NC}"
START_DATE=$(date -u -v-7d +"%Y-%m-%dT00:00:00Z" 2>/dev/null || date -u -d "7 days ago" +"%Y-%m-%dT00:00:00Z")
END_DATE=$(date -u +"%Y-%m-%dT23:59:59Z")

RESPONSE=$(curl -s -w "\n%{http_code}" \
  -H "Authorization: Bearer $AUTH_TOKEN" \
  "$API_URL/audit-logs?start_date=$START_DATE&end_date=$END_DATE&limit=5")

HTTP_CODE=$(echo "$RESPONSE" | tail -n1)
BODY=$(echo "$RESPONSE" | sed '$d')

if [ "$HTTP_CODE" = "200" ]; then
  echo -e "${GREEN}✓ Success (HTTP $HTTP_CODE)${NC}"
  TOTAL=$(echo "$BODY" | jq -r '.pagination.totalItems')
  echo "Events in last 7 days: $TOTAL"
else
  echo -e "${RED}✗ Failed (HTTP $HTTP_CODE)${NC}"
  echo "$BODY"
fi
echo ""

# Test 6: Filter by user email (partial match)
echo -e "${YELLOW}Test 6: Filter by user email (contains '@')${NC}"
RESPONSE=$(curl -s -w "\n%{http_code}" \
  -H "Authorization: Bearer $AUTH_TOKEN" \
  "$API_URL/audit-logs?user_email=@&limit=5")

HTTP_CODE=$(echo "$RESPONSE" | tail -n1)
BODY=$(echo "$RESPONSE" | sed '$d')

if [ "$HTTP_CODE" = "200" ]; then
  echo -e "${GREEN}✓ Success (HTTP $HTTP_CODE)${NC}"
  TOTAL=$(echo "$BODY" | jq -r '.pagination.totalItems')
  echo "Events with email addresses: $TOTAL"
  if [ "$TOTAL" != "0" ]; then
    echo "Sample user emails:"
    echo "$BODY" | jq -r '.data[] | .user_email' | sort -u | head -3
  fi
else
  echo -e "${RED}✗ Failed (HTTP $HTTP_CODE)${NC}"
  echo "$BODY"
fi
echo ""

# Test 7: Pagination test
echo -e "${YELLOW}Test 7: Pagination (page 2)${NC}"
RESPONSE=$(curl -s -w "\n%{http_code}" \
  -H "Authorization: Bearer $AUTH_TOKEN" \
  "$API_URL/audit-logs?page=2&limit=10")

HTTP_CODE=$(echo "$RESPONSE" | tail -n1)
BODY=$(echo "$RESPONSE" | sed '$d')

if [ "$HTTP_CODE" = "200" ]; then
  echo -e "${GREEN}✓ Success (HTTP $HTTP_CODE)${NC}"
  echo "$BODY" | jq -r '.pagination'
else
  echo -e "${RED}✗ Failed (HTTP $HTTP_CODE)${NC}"
  echo "$BODY"
fi
echo ""

# Test 8: Resource filtering
echo -e "${YELLOW}Test 8: Filter by resource type${NC}"
RESPONSE=$(curl -s -w "\n%{http_code}" \
  -H "Authorization: Bearer $AUTH_TOKEN" \
  "$API_URL/audit-logs?resource_type=member&limit=5")

HTTP_CODE=$(echo "$RESPONSE" | tail -n1)
BODY=$(echo "$RESPONSE" | sed '$d')

if [ "$HTTP_CODE" = "200" ]; then
  echo -e "${GREEN}✓ Success (HTTP $HTTP_CODE)${NC}"
  TOTAL=$(echo "$BODY" | jq -r '.pagination.totalItems')
  echo "Events related to members: $TOTAL"
else
  echo -e "${RED}✗ Failed (HTTP $HTTP_CODE)${NC}"
  echo "$BODY"
fi
echo ""

# Test 9: Authentication test (no token)
echo -e "${YELLOW}Test 9: Authentication test (should fail without token)${NC}"
RESPONSE=$(curl -s -w "\n%{http_code}" \
  "$API_URL/audit-logs")

HTTP_CODE=$(echo "$RESPONSE" | tail -n1)

if [ "$HTTP_CODE" = "401" ]; then
  echo -e "${GREEN}✓ Success - Correctly rejected unauthorized request (HTTP $HTTP_CODE)${NC}"
else
  echo -e "${RED}✗ Failed - Expected 401, got $HTTP_CODE${NC}"
fi
echo ""

echo "========================================="
echo "Test Summary: GetAuditLogs API"
echo "========================================="
echo "All tests completed!"
echo ""
echo "To run this script:"
echo "  1. Get an access token from the admin portal"
echo "  2. export AZURE_AD_TOKEN=<your-access-token>"
echo "  3. ./api/tests/test-audit-logs.sh"
