#!/bin/bash
# Diagnostic script for member registration 500 error
# Created: 2025-11-19
# Purpose: Identify which service is failing in the registration flow

set -e

API_BASE="https://func-ctn-demo-asr-dev.azurewebsites.net/api"
PDF_PATH="/Users/ramondenoronha/Dev/DIL/DEV-CTN-ASR/tests/KvK-DNC-95944192.pdf"
TIMESTAMP=$(date +%s)

echo "=========================================="
echo "Member Registration Diagnostic Tests"
echo "=========================================="
echo "Timestamp: $(date)"
echo ""

# Test 1: API Health
echo "TEST 1: API Health Check"
echo "------------------------"
HEALTH_RESPONSE=$(curl -s "$API_BASE/health")
echo "$HEALTH_RESPONSE" | jq .
echo ""

# Check if health is OK
if echo "$HEALTH_RESPONSE" | jq -e '.status == "healthy"' > /dev/null 2>&1; then
    echo "RESULT: PASS - API is healthy"
else
    echo "RESULT: FAIL - API health check failed"
fi
echo ""

# Test 2: Basic validation (missing fields)
echo "TEST 2: Basic Validation (Missing Fields)"
echo "------------------------------------------"
VALIDATION_RESPONSE=$(curl -s -X POST "$API_BASE/v1/register-member" \
  -F "legalName=test")
echo "$VALIDATION_RESPONSE" | jq .
echo ""

if echo "$VALIDATION_RESPONSE" | jq -e '.error == "Missing required fields"' > /dev/null 2>&1; then
    echo "RESULT: PASS - Validation working correctly"
else
    echo "RESULT: FAIL - Validation not working as expected"
fi
echo ""

# Test 3: Full registration with PDF
echo "TEST 3: Full Registration with PDF"
echo "-----------------------------------"
echo "Using PDF: $PDF_PATH"
echo "Test email: test-diag-${TIMESTAMP}@example.com"
echo ""

REGISTER_RESPONSE=$(curl -s -X POST "$API_BASE/v1/register-member" \
  -F "legalName=Test Company Diagnostics ${TIMESTAMP}" \
  -F "kvkNumber=12345678" \
  -F "companyAddress=123 Test Street" \
  -F "postalCode=1234AB" \
  -F "city=Amsterdam" \
  -F "country=Netherlands" \
  -F "contactName=Test Contact" \
  -F "contactEmail=test-diag-${TIMESTAMP}@example.com" \
  -F "contactPhone=+31612345678" \
  -F "jobTitle=Test Manager" \
  -F "membershipType=standard" \
  -F "termsAccepted=true" \
  -F "gdprConsent=true" \
  -F "kvkDocument=@${PDF_PATH}")

echo "Response:"
echo "$REGISTER_RESPONSE" | jq .
echo ""

# Analyze the response
if echo "$REGISTER_RESPONSE" | jq -e '.applicationId' > /dev/null 2>&1; then
    echo "RESULT: PASS - Registration successful!"
    APP_ID=$(echo "$REGISTER_RESPONSE" | jq -r '.applicationId')
    echo "Application ID: $APP_ID"
elif echo "$REGISTER_RESPONSE" | jq -e '.error' > /dev/null 2>&1; then
    ERROR_MSG=$(echo "$REGISTER_RESPONSE" | jq -r '.error')
    ERROR_ID=$(echo "$REGISTER_RESPONSE" | jq -r '.errorId // "N/A"')
    echo "RESULT: FAIL - Error occurred"
    echo "Error: $ERROR_MSG"
    echo "Error ID: $ERROR_ID"

    # Try to identify the failing service based on error message
    if echo "$ERROR_MSG" | grep -qi "blob\|storage\|upload"; then
        echo "DIAGNOSIS: BlobStorageService is likely failing"
    elif echo "$ERROR_MSG" | grep -qi "document\|intelligence\|extract\|pdf"; then
        echo "DIAGNOSIS: DocumentIntelligenceService is likely failing"
    elif echo "$ERROR_MSG" | grep -qi "kvk\|validation\|company"; then
        echo "DIAGNOSIS: KvKService is likely failing"
    elif echo "$ERROR_MSG" | grep -qi "database\|insert\|constraint"; then
        echo "DIAGNOSIS: Database insert is likely failing"
    else
        echo "DIAGNOSIS: Unable to determine failing service from error message"
    fi
else
    echo "RESULT: FAIL - Unexpected response format"
fi
echo ""

# Test 4: Test without PDF (to isolate storage issues)
echo "TEST 4: Registration without PDF (Isolate Storage)"
echo "---------------------------------------------------"
NO_PDF_RESPONSE=$(curl -s -X POST "$API_BASE/v1/register-member" \
  -F "legalName=Test Company No PDF ${TIMESTAMP}" \
  -F "kvkNumber=87654321" \
  -F "companyAddress=456 Test Avenue" \
  -F "postalCode=5678CD" \
  -F "city=Rotterdam" \
  -F "country=Netherlands" \
  -F "contactName=Test Contact 2" \
  -F "contactEmail=test-nopdf-${TIMESTAMP}@example.com" \
  -F "contactPhone=+31687654321" \
  -F "jobTitle=Test Director" \
  -F "membershipType=standard" \
  -F "termsAccepted=true" \
  -F "gdprConsent=true")

echo "Response:"
echo "$NO_PDF_RESPONSE" | jq .
echo ""

# Test 5: Check other endpoints that might use Azure services
echo "TEST 5: Check Members Endpoint (Database connectivity)"
echo "-------------------------------------------------------"
MEMBERS_RESPONSE=$(curl -s -w "\n%{http_code}" "$API_BASE/v1/members?limit=1")
HTTP_CODE=$(echo "$MEMBERS_RESPONSE" | tail -1)
BODY=$(echo "$MEMBERS_RESPONSE" | sed '$d')
echo "HTTP Status: $HTTP_CODE"
echo "$BODY" | jq . 2>/dev/null || echo "$BODY"
echo ""

if [ "$HTTP_CODE" = "200" ]; then
    echo "RESULT: PASS - Members endpoint working"
elif [ "$HTTP_CODE" = "401" ]; then
    echo "RESULT: EXPECTED - Members endpoint requires authentication (401)"
elif [ "$HTTP_CODE" = "404" ]; then
    echo "RESULT: FAIL - Members endpoint not found (404)"
else
    echo "RESULT: FAIL - Members endpoint returned HTTP $HTTP_CODE"
fi
echo ""

echo "=========================================="
echo "DIAGNOSTIC SUMMARY"
echo "=========================================="
echo ""
echo "Registration Flow:"
echo "1. BlobStorageService - Upload PDF to Azure Blob Storage"
echo "2. DocumentIntelligenceService - Extract KvK data from PDF"
echo "3. KvKService - Validate company against KvK API"
echo "4. Database insert - Create application record"
echo ""
echo "Check the responses above to identify which step is failing."
echo "The error ID can be used to search Application Insights for more details."
echo ""
echo "=========================================="
echo "ANALYSIS RESULTS"
echo "=========================================="
echo ""
echo "Based on code review of /Users/ramondenoronha/Dev/DIL/DEV-CTN-ASR/api/src/functions/registerMember.ts:"
echo ""
echo "POTENTIAL FAILURE POINTS:"
echo ""
echo "1. BlobStorageService (lines 350-367)"
echo "   - Environment: AZURE_STORAGE_CONNECTION_STRING"
echo "   - Throws in constructor if connection string is invalid"
echo "   - Symptoms: 500 error before any processing"
echo ""
echo "2. DocumentIntelligenceService (lines 377-389)"
echo "   - Environment: DOC_INTELLIGENCE_ENDPOINT, DOC_INTELLIGENCE_KEY"
echo "   - Throws in constructor if credentials missing"
echo "   - Symptoms: 500 error after blob upload succeeds"
echo ""
echo "3. KvKService (lines 420-433)"
echo "   - Environment: KVK_API_KEY"
echo "   - Warns but doesn't throw if key missing"
echo "   - Returns flags=['api_key_missing'] instead"
echo ""
echo "MOST LIKELY CAUSE:"
echo "The DocumentIntelligenceService constructor throws if credentials are missing."
echo "This causes the entire request to fail with a 500 error."
echo ""
echo "RECOMMENDED NEXT STEPS:"
echo "1. Check Application Insights for error ID: $ERROR_ID"
echo "2. Verify Azure environment variables in Function App Configuration:"
echo "   - DOC_INTELLIGENCE_ENDPOINT"
echo "   - DOC_INTELLIGENCE_KEY"
echo "   - AZURE_STORAGE_CONNECTION_STRING"
echo "   - KVK_API_KEY"
echo "3. Run: az functionapp config appsettings list --name func-ctn-demo-asr-dev --resource-group rg-ctn-demo-asr-dev | grep -E 'DOC_INTELLIGENCE|AZURE_STORAGE|KVK_API'"
echo ""
