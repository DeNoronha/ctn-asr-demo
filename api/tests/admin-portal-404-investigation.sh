#!/bin/bash
# API Test Battery: Admin Portal 404 Investigation
# Created: 2025-10-25
# Purpose: Test all admin portal API endpoints to identify 404 issues

API_BASE="https://func-ctn-demo-asr-dev.azurewebsites.net/api"

echo "=========================================="
echo "API DEPLOYMENT STATUS CHECK"
echo "=========================================="
echo ""

echo "1. Testing Function App Base URL..."
curl -s -w "\nHTTP Status: %{http_code}\n" "$API_BASE" | head -5
echo ""

echo "2. Testing Health Endpoint..."
curl -s -w "\nHTTP Status: %{http_code}\n" "$API_BASE/health"
echo ""

echo "3. Testing Version Endpoint..."
curl -s -w "\nHTTP Status: %{http_code}\n" "$API_BASE/v1/version"
echo ""

echo "=========================================="
echo "ADMIN PORTAL CRITICAL ENDPOINTS"
echo "=========================================="
echo ""

echo "4. Testing Members Endpoint (expected route)..."
curl -s -w "\nHTTP Status: %{http_code}\n" "$API_BASE/v1/members"
echo ""

echo "5. Testing Members Endpoint (actual route)..."
curl -s -w "\nHTTP Status: %{http_code}\n" "$API_BASE/v1/all-members"
echo ""

echo "6. Testing Identifiers Endpoint..."
curl -s -w "\nHTTP Status: %{http_code}\n" "$API_BASE/v1/identifiers"
echo ""

echo "7. Testing Legal Entity Endpoint..."
curl -s -w "\nHTTP Status: %{http_code}\n" "$API_BASE/v1/legal-entities/test-id"
echo ""

echo "8. Testing Contacts Endpoint..."
curl -s -w "\nHTTP Status: %{http_code}\n" "$API_BASE/v1/contacts"
echo ""

echo "=========================================="
echo "SUMMARY"
echo "=========================================="
echo ""
echo "Expected Results:"
echo "- If all endpoints return 404: API NOT DEPLOYED"
echo "- If health/version work but others fail: PARTIAL DEPLOYMENT"
echo "- If some endpoints work: ROUTE MISMATCH ISSUE"
echo ""
echo "Next Steps:"
echo "1. Deploy API: cd api && func azure functionapp publish func-ctn-demo-asr-dev --typescript --build remote"
echo "2. Wait 2-3 minutes for deployment"
echo "3. Re-run this test script"
echo ""
