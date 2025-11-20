#!/bin/bash

# API Smoke Test - Vite Migration Verification
# Tests basic API health and endpoints after Vite migration deployment

set -e  # Exit on first error

API_BASE_URL="https://ca-ctn-asr-api-dev.calmriver-700a8c55.westeurope.azurecontainerapps.io/api/v1"
GREEN='\033[0;32m'
RED='\033[0;31m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

echo "=================================================="
echo "API Smoke Test - Vite Migration Verification"
echo "=================================================="
echo ""
echo "Testing API: $API_BASE_URL"
echo ""

# Test 1: API Version Endpoint
echo "Test 1: GET /api/v1/version"
response=$(curl -s -w "\n%{http_code}" "$API_BASE_URL/version")
http_code=$(echo "$response" | tail -n1)
body=$(echo "$response" | sed '$d')

if [ "$http_code" -eq 200 ]; then
    echo -e "${GREEN}✓ PASS${NC} - API version endpoint responded with 200"
    echo "Response: $body"
else
    echo -e "${RED}✗ FAIL${NC} - API version endpoint returned $http_code"
    echo "Response: $body"
    exit 1
fi
echo ""

# Test 2: Check API is not returning HTML (common deployment error)
echo "Test 2: Verify API returns JSON, not HTML"
version_response=$(curl -s "$API_BASE_URL/version")
if echo "$version_response" | jq . > /dev/null 2>&1; then
    echo -e "${GREEN}✓ PASS${NC} - API returns valid JSON"
else
    echo -e "${RED}✗ FAIL${NC} - API returns invalid JSON or HTML"
    echo "Response: $version_response"
    echo "This might indicate a deployment routing issue"
    exit 1
fi
echo ""

# Test 3: Verify API version info is correct
echo "Test 3: Verify API version includes required fields"
node_version=$(echo "$version_response" | jq -r '.api.nodeVersion')
api_name=$(echo "$version_response" | jq -r '.api.name')
if [[ -n "$node_version" && "$api_name" == "CTN ASR API" ]]; then
    echo -e "${GREEN}✓ PASS${NC} - API version info is correct"
    echo "Node Version: $node_version"
    echo "API Name: $api_name"
else
    echo -e "${RED}✗ FAIL${NC} - API version info is missing or incorrect"
    exit 1
fi
echo ""

# Test 4: Verify API uptime (should be positive)
echo "Test 4: Verify API is running (uptime check)"
uptime=$(echo "$version_response" | jq -r '.api.uptime')
if (( $(echo "$uptime > 0" | bc -l) )); then
    echo -e "${GREEN}✓ PASS${NC} - API is running (uptime: ${uptime}s)"
else
    echo -e "${RED}✗ FAIL${NC} - API uptime is invalid: $uptime"
    exit 1
fi
echo ""

echo "=================================================="
echo "API Smoke Test Complete"
echo "=================================================="
echo -e "${GREEN}All critical API endpoints are responding correctly${NC}"
echo ""
