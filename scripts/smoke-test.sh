#!/bin/bash
# ==============================================
# CTN ASR Smoke Test Battery
# Run before commits and after deployments
# ==============================================

# Configuration
API_BASE_URL="${API_BASE_URL:-https://func-ctn-demo-asr-dev.azurewebsites.net}"
ADMIN_PORTAL_URL="${ADMIN_PORTAL_URL:-https://calm-tree-03352ba03.1.azurestaticapps.net}"
MEMBER_PORTAL_URL="${MEMBER_PORTAL_URL:-https://calm-pebble-043b2db03.1.azurestaticapps.net}"
TIMEOUT=10

# Colors
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m'

# Counters
PASSED=0
FAILED=0

echo ""
echo "=============================================="
echo "  CTN ASR Smoke Test Battery"
echo "=============================================="
echo ""

# Function to test an endpoint
test_endpoint() {
    local name="$1"
    local url="$2"
    local expected_code="${3:-200}"

    http_code=$(curl -s -o /dev/null -w "%{http_code}" --connect-timeout $TIMEOUT "$url" 2>/dev/null || echo "000")

    if [ "$http_code" == "$expected_code" ]; then
        echo -e "${GREEN}[PASS]${NC} $name - HTTP $http_code"
        ((PASSED++))
    elif [ "$http_code" == "000" ]; then
        echo -e "${RED}[FAIL]${NC} $name - Connection timeout/failed"
        ((FAILED++))
    else
        echo -e "${RED}[FAIL]${NC} $name - Expected $expected_code, got $http_code"
        ((FAILED++))
    fi
}

echo "Testing API Endpoints..."
echo "------------------------"

# Critical API endpoints
test_endpoint "API Health" "$API_BASE_URL/api/health" 200
test_endpoint "API Version" "$API_BASE_URL/api/v1/version" 200
test_endpoint "API Root" "$API_BASE_URL/" 200

echo ""
echo "Testing Portal Connectivity..."
echo "------------------------------"

# Portal health checks
test_endpoint "Admin Portal" "$ADMIN_PORTAL_URL" 200
test_endpoint "Member Portal" "$MEMBER_PORTAL_URL" 200

echo ""
echo "=============================================="
echo "  Results: $PASSED passed, $FAILED failed"
echo "=============================================="
echo ""

if [ $FAILED -gt 0 ]; then
    echo -e "${RED}SMOKE TESTS FAILED!${NC}"
    echo "Please fix the issues before committing."
    exit 1
else
    echo -e "${GREEN}ALL SMOKE TESTS PASSED!${NC}"
    exit 0
fi
