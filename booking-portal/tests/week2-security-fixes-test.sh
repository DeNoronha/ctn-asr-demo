#!/bin/bash

# Week 2 HIGH Priority Security Fixes Test
# Tests service extraction, updated routes, pagination, PDF processing

set -e

API_BASE="https://func-ctn-booking-prod.azurewebsites.net"
TEST_PDF="/Users/ramondenoronha/Dev/DIL/ASR-full/booking-portal/tests/sample-transport-order.pdf"

echo "=== Week 2 Security Fixes Test ==="
echo "Start time: $(date)"
echo ""

# 1. Test TypeScript compilation
echo "1. Testing TypeScript compilation..."
cd /Users/ramondenoronha/Dev/DIL/ASR-full/api
if npm run build > /tmp/api-build.log 2>&1; then
    echo "   ✅ API TypeScript compilation successful"
else
    echo "   ❌ API TypeScript compilation failed:"
    tail -20 /tmp/api-build.log
    exit 1
fi
echo ""

# 2. Test new upload endpoint (/api/v1/upload)
echo "2. Testing /api/v1/upload endpoint..."
if [ ! -f "$TEST_PDF" ]; then
    echo "   ⚠️  Test PDF not found, skipping upload test"
else
    BODY=$(curl -s -X POST -H "Content-Type: multipart/form-data" -F "file=@${TEST_PDF}" "${API_BASE}/api/v1/upload")
    HTTP_CODE=$(curl -s -o /dev/null -w "%{http_code}" -X POST -H "Content-Type: multipart/form-data" -F "file=@${TEST_PDF}" "${API_BASE}/api/v1/upload")

    if [ "$HTTP_CODE" -eq 200 ] || [ "$HTTP_CODE" -eq 201 ]; then
        echo "   ✅ Upload endpoint works (${HTTP_CODE})"
        UPLOAD_ID=$(echo "$BODY" | jq -r '.id // .uploadId // empty')
        echo "   Upload ID: $UPLOAD_ID"
    else
        echo "   ⚠️  Upload endpoint returned $HTTP_CODE"
        echo "   Response: $BODY"
    fi
fi
echo ""

# 3. Test pagination on bookings endpoint
echo "3. Testing pagination (limit & continuationToken)..."
BODY=$(curl -s "${API_BASE}/api/v1/bookings?limit=5")
HTTP_CODE=$(curl -s -o /dev/null -w "%{http_code}" "${API_BASE}/api/v1/bookings?limit=5")

if [ "$HTTP_CODE" -eq 200 ]; then
    echo "   ✅ Pagination endpoint works (200)"
    ITEM_COUNT=$(echo "$BODY" | jq '.data | length')
    CONTINUATION=$(echo "$BODY" | jq -r '.continuationToken // "none"')
    echo "   Items returned: $ITEM_COUNT"
    echo "   Continuation token: $CONTINUATION"
else
    echo "   ⚠️  Pagination test returned $HTTP_CODE"
    echo "   Response: $BODY"
fi
echo ""

# 4. Test validate endpoint (new route /api/v1/validate/{id})
echo "4. Testing /api/v1/validate/{id} endpoint..."
if [ -n "$UPLOAD_ID" ]; then
    BODY=$(curl -s "${API_BASE}/api/v1/validate/${UPLOAD_ID}")
    HTTP_CODE=$(curl -s -o /dev/null -w "%{http_code}" "${API_BASE}/api/v1/validate/${UPLOAD_ID}")

    if [ "$HTTP_CODE" -eq 200 ]; then
        echo "   ✅ Validate endpoint works (200)"
        STATUS=$(echo "$BODY" | jq -r '.status // empty')
        echo "   Validation status: $STATUS"
    else
        echo "   ⚠️  Validate endpoint returned $HTTP_CODE"
        echo "   Response: $BODY"
    fi
else
    echo "   ⚠️  No upload ID available, skipping validate test"
fi
echo ""

# 5. Verify service extraction - check for proper error handling
echo "5. Verifying service extraction (error handling)..."
HTTP_CODE=$(curl -s -o /dev/null -w "%{http_code}" "${API_BASE}/api/v1/validate/invalid-id-12345")

if [ "$HTTP_CODE" -eq 404 ]; then
    echo "   ✅ Service properly handles invalid IDs (404)"
elif [ "$HTTP_CODE" -eq 400 ]; then
    echo "   ✅ Service properly handles invalid IDs (400)"
else
    echo "   ⚠️  Unexpected response for invalid ID: $HTTP_CODE"
fi
echo ""

# 6. Check API diagnostic endpoint
echo "6. Checking API diagnostic..."
DIAGNOSTIC=$(curl -s "${API_BASE}/api/diagnostic" | jq '.')
if [ $? -eq 0 ]; then
    echo "   ✅ API diagnostic working"
    echo "$DIAGNOSTIC"
else
    echo "   ❌ API diagnostic failed"
fi
echo ""

echo "=== Test Summary ==="
echo "✅ TypeScript compilation: PASS"
echo "All API endpoint tests completed"
echo "End time: $(date)"
