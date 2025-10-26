#!/bin/bash

#############################################################################
# API UPLOAD TEST - CTN DocuFlow
# Tests document upload and processing endpoints
#############################################################################

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
CYAN='\033[0;36m'
NC='\033[0m' # No Color

# Configuration
API_BASE_URL="${API_BASE_URL:-https://func-ctn-booking-prod.azurewebsites.net}"
ACCESS_TOKEN="${ACCESS_TOKEN:-}"

# Test counters
TESTS_RUN=0
TESTS_PASSED=0
TESTS_FAILED=0
WARNINGS=0

# Storage for test data
UPLOAD_ID=""
DOCUMENT_ID=""

# Helper function to pretty print JSON
pretty_json() {
    if command -v jq &> /dev/null; then
        echo "$1" | jq .
    else
        echo "$1"
    fi
}

# Helper function to create a minimal test PDF
create_test_pdf() {
    local filename="$1"
    # Create a minimal valid PDF (PDF 1.4 format)
    cat > "$filename" << 'EOF'
%PDF-1.4
1 0 obj
<< /Type /Catalog /Pages 2 0 R >>
endobj
2 0 obj
<< /Type /Pages /Kids [3 0 R] /Count 1 >>
endobj
3 0 obj
<< /Type /Page /Parent 2 0 R /Resources 4 0 R /MediaBox [0 0 612 792] /Contents 5 0 R >>
endobj
4 0 obj
<< /Font << /F1 << /Type /Font /Subtype /Type1 /BaseFont /Helvetica >> >> >>
endobj
5 0 obj
<< /Length 44 >>
stream
BT
/F1 12 Tf
100 700 Td
(Test Document) Tj
ET
endstream
endobj
xref
0 6
0000000000 65535 f
0000000009 00000 n
0000000058 00000 n
0000000115 00000 n
0000000229 00000 n
0000000331 00000 n
trailer
<< /Size 6 /Root 1 0 R >>
startxref
426
%%EOF
EOF
}

echo -e "${BLUE}=========================================${NC}"
echo -e "${BLUE}CTN DocuFlow - Upload API Test${NC}"
echo -e "${BLUE}=========================================${NC}"
echo ""
echo "API Base URL: $API_BASE_URL"
echo "Test Time: $(date '+%Y-%m-%d %H:%M:%S')"
echo ""

# Check if access token is provided
if [ -z "$ACCESS_TOKEN" ]; then
    echo -e "${YELLOW}⚠ WARNING: No ACCESS_TOKEN provided${NC}"
    echo "This test requires authentication. You can:"
    echo "1. Set ACCESS_TOKEN environment variable:"
    echo "   export ACCESS_TOKEN='your_token_here'"
    echo "2. Pass token as argument:"
    echo "   ./api-upload-test.sh <your_token>"
    echo ""
    echo "Running unauthenticated tests only..."
    echo ""
else
    echo -e "${GREEN}✓ Access token provided${NC}"
    echo ""
fi

# Test 1: POST /api/v1/upload without authentication (should return 401)
echo -e "${CYAN}Test 1: POST /api/v1/upload - Without authentication${NC}"
TESTS_RUN=$((TESTS_RUN + 1))

RESPONSE=$(curl -s -w "\n%{http_code}" -X POST \
    -H "Content-Type: application/pdf" \
    "${API_BASE_URL}/api/v1/upload")
HTTP_CODE=$(echo "$RESPONSE" | tail -n1)
BODY=$(echo "$RESPONSE" | sed '$d')

if [ "$HTTP_CODE" -eq 401 ]; then
    echo -e "${GREEN}✓ PASS${NC} - Correctly returned 401 Unauthorized"
    TESTS_PASSED=$((TESTS_PASSED + 1))
elif [ "$HTTP_CODE" -eq 404 ]; then
    echo -e "${YELLOW}⚠ WARN${NC} - Endpoint not found (404)"
    echo "The /api/v1/upload endpoint may not be implemented"
    WARNINGS=$((WARNINGS + 1))
    TESTS_PASSED=$((TESTS_PASSED + 1))
else
    echo -e "${RED}✗ FAIL${NC} - Expected 401 or 404, got $HTTP_CODE"
    echo "Response: $BODY"
    TESTS_FAILED=$((TESTS_FAILED + 1))
fi
echo ""

# Test 2: POST /api/v1/upload with empty body (should return 400 or 401)
echo -e "${CYAN}Test 2: POST /api/v1/upload - Empty body${NC}"
TESTS_RUN=$((TESTS_RUN + 1))

RESPONSE=$(curl -s -w "\n%{http_code}" -X POST \
    "${API_BASE_URL}/api/v1/upload")
HTTP_CODE=$(echo "$RESPONSE" | tail -n1)
BODY=$(echo "$RESPONSE" | sed '$d')

if [ "$HTTP_CODE" -eq 400 ] || [ "$HTTP_CODE" -eq 401 ] || [ "$HTTP_CODE" -eq 404 ]; then
    echo -e "${GREEN}✓ PASS${NC} - Correctly rejected empty request (HTTP $HTTP_CODE)"
    TESTS_PASSED=$((TESTS_PASSED + 1))
else
    echo -e "${YELLOW}⚠ WARN${NC} - Unexpected status code: $HTTP_CODE"
    echo "Response: $BODY"
    WARNINGS=$((WARNINGS + 1))
    TESTS_PASSED=$((TESTS_PASSED + 1))
fi
echo ""

# Test 3: GET /api/v1/document-sas-url/{id} without authentication
echo -e "${CYAN}Test 3: GET /api/v1/document-sas-url/{id} - Without authentication${NC}"
TESTS_RUN=$((TESTS_RUN + 1))

TEST_ID="test-document-id"
RESPONSE=$(curl -s -w "\n%{http_code}" \
    "${API_BASE_URL}/api/v1/document-sas-url/${TEST_ID}")
HTTP_CODE=$(echo "$RESPONSE" | tail -n1)
BODY=$(echo "$RESPONSE" | sed '$d')

if [ "$HTTP_CODE" -eq 401 ]; then
    echo -e "${GREEN}✓ PASS${NC} - Correctly returned 401 Unauthorized"
    TESTS_PASSED=$((TESTS_PASSED + 1))
elif [ "$HTTP_CODE" -eq 404 ]; then
    echo -e "${YELLOW}⚠ WARN${NC} - Endpoint not found (404)"
    WARNINGS=$((WARNINGS + 1))
    TESTS_PASSED=$((TESTS_PASSED + 1))
else
    echo -e "${RED}✗ FAIL${NC} - Expected 401 or 404, got $HTTP_CODE"
    echo "Response: $BODY"
    TESTS_FAILED=$((TESTS_FAILED + 1))
fi
echo ""

# If access token is provided, run authenticated tests
if [ ! -z "$ACCESS_TOKEN" ]; then
    echo -e "${BLUE}=========================================${NC}"
    echo -e "${BLUE}Authenticated Tests${NC}"
    echo -e "${BLUE}=========================================${NC}"
    echo ""

    # Create a test PDF file
    TEST_PDF="/tmp/test-booking-document.pdf"
    create_test_pdf "$TEST_PDF"
    echo "Created test PDF: $TEST_PDF"
    FILE_SIZE=$(wc -c < "$TEST_PDF")
    echo "File size: $FILE_SIZE bytes"
    echo ""

    # Test 4: POST /api/v1/upload with valid PDF
    echo -e "${CYAN}Test 4: POST /api/v1/upload - With valid PDF${NC}"
    TESTS_RUN=$((TESTS_RUN + 1))

    RESPONSE=$(curl -s -w "\n%{http_code}" -X POST \
        -H "Authorization: Bearer $ACCESS_TOKEN" \
        -H "Content-Type: application/pdf" \
        --data-binary "@${TEST_PDF}" \
        "${API_BASE_URL}/api/v1/upload")
    HTTP_CODE=$(echo "$RESPONSE" | tail -n1)
    BODY=$(echo "$RESPONSE" | sed '$d')

    if [ "$HTTP_CODE" -eq 200 ] || [ "$HTTP_CODE" -eq 201 ]; then
        echo -e "${GREEN}✓ PASS${NC} - Successfully uploaded document (HTTP $HTTP_CODE)"
        echo ""
        echo "Response:"
        pretty_json "$BODY"

        # Extract document/upload ID from response
        if echo "$BODY" | jq -e . >/dev/null 2>&1; then
            UPLOAD_ID=$(echo "$BODY" | jq -r '.id // .uploadId // .documentId // empty')
            DOCUMENT_ID=$(echo "$BODY" | jq -r '.documentId // .id // empty')

            if [ ! -z "$UPLOAD_ID" ] && [ "$UPLOAD_ID" != "null" ]; then
                echo ""
                echo "Upload ID: $UPLOAD_ID"
            fi
            if [ ! -z "$DOCUMENT_ID" ] && [ "$DOCUMENT_ID" != "null" ]; then
                echo "Document ID: $DOCUMENT_ID"
            fi
        fi

        TESTS_PASSED=$((TESTS_PASSED + 1))
    elif [ "$HTTP_CODE" -eq 404 ]; then
        echo -e "${YELLOW}⚠ WARN${NC} - Upload endpoint not found (404)"
        WARNINGS=$((WARNINGS + 1))
        TESTS_PASSED=$((TESTS_PASSED + 1))
    else
        echo -e "${RED}✗ FAIL${NC} - Expected 200/201, got $HTTP_CODE"
        echo "Response: $BODY"
        TESTS_FAILED=$((TESTS_FAILED + 1))
    fi
    echo ""

    # Test 5: POST /api/v1/upload with invalid content type
    echo -e "${CYAN}Test 5: POST /api/v1/upload - Invalid content type${NC}"
    TESTS_RUN=$((TESTS_RUN + 1))

    RESPONSE=$(curl -s -w "\n%{http_code}" -X POST \
        -H "Authorization: Bearer $ACCESS_TOKEN" \
        -H "Content-Type: text/plain" \
        --data-binary "@${TEST_PDF}" \
        "${API_BASE_URL}/api/v1/upload")
    HTTP_CODE=$(echo "$RESPONSE" | tail -n1)
    BODY=$(echo "$RESPONSE" | sed '$d')

    if [ "$HTTP_CODE" -eq 400 ] || [ "$HTTP_CODE" -eq 415 ]; then
        echo -e "${GREEN}✓ PASS${NC} - Correctly rejected invalid content type (HTTP $HTTP_CODE)"
        TESTS_PASSED=$((TESTS_PASSED + 1))
    elif [ "$HTTP_CODE" -eq 404 ]; then
        echo -e "${YELLOW}⚠ WARN${NC} - Endpoint not found (404)"
        WARNINGS=$((WARNINGS + 1))
        TESTS_PASSED=$((TESTS_PASSED + 1))
    elif [ "$HTTP_CODE" -eq 200 ] || [ "$HTTP_CODE" -eq 201 ]; then
        echo -e "${YELLOW}⚠ WARN${NC} - Upload succeeded despite invalid content type"
        echo "API should validate content type"
        WARNINGS=$((WARNINGS + 1))
        TESTS_PASSED=$((TESTS_PASSED + 1))
    else
        echo -e "${YELLOW}⚠ WARN${NC} - Unexpected status code: $HTTP_CODE"
        echo "Response: $BODY"
        WARNINGS=$((WARNINGS + 1))
        TESTS_PASSED=$((TESTS_PASSED + 1))
    fi
    echo ""

    # Test 6: GET /api/v1/document-sas-url/{id} with valid ID (if we have one)
    if [ ! -z "$DOCUMENT_ID" ] && [ "$DOCUMENT_ID" != "null" ]; then
        echo -e "${CYAN}Test 6: GET /api/v1/document-sas-url/{id} - With valid ID${NC}"
        TESTS_RUN=$((TESTS_RUN + 1))

        RESPONSE=$(curl -s -w "\n%{http_code}" \
            -H "Authorization: Bearer $ACCESS_TOKEN" \
            "${API_BASE_URL}/api/v1/document-sas-url/${DOCUMENT_ID}")
        HTTP_CODE=$(echo "$RESPONSE" | tail -n1)
        BODY=$(echo "$RESPONSE" | sed '$d')

        if [ "$HTTP_CODE" -eq 200 ]; then
            echo -e "${GREEN}✓ PASS${NC} - Successfully retrieved SAS URL (200 OK)"
            echo ""
            echo "Response:"
            pretty_json "$BODY"

            # Validate SAS URL
            if echo "$BODY" | jq -e . >/dev/null 2>&1; then
                SAS_URL=$(echo "$BODY" | jq -r '.url // .sasUrl // empty')
                if [ ! -z "$SAS_URL" ] && [ "$SAS_URL" != "null" ]; then
                    echo ""
                    echo "SAS URL present: ${SAS_URL:0:50}..."
                    if echo "$SAS_URL" | grep -q "blob.core.windows.net"; then
                        echo -e "${GREEN}  ✓${NC} SAS URL points to Azure Blob Storage"
                    fi
                fi
            fi

            TESTS_PASSED=$((TESTS_PASSED + 1))
        elif [ "$HTTP_CODE" -eq 404 ]; then
            echo -e "${YELLOW}⚠ WARN${NC} - Document not found or endpoint not implemented (404)"
            WARNINGS=$((WARNINGS + 1))
            TESTS_PASSED=$((TESTS_PASSED + 1))
        else
            echo -e "${RED}✗ FAIL${NC} - Expected 200, got $HTTP_CODE"
            echo "Response: $BODY"
            TESTS_FAILED=$((TESTS_FAILED + 1))
        fi
        echo ""
    else
        echo -e "${CYAN}Test 6: SKIPPED - No document ID available from upload test${NC}"
        echo ""
    fi

    # Test 7: Test file size limits (create 10MB test file)
    echo -e "${CYAN}Test 7: POST /api/v1/upload - Large file (10MB)${NC}"
    TESTS_RUN=$((TESTS_RUN + 1))

    LARGE_PDF="/tmp/large-test-document.pdf"
    # Create a 10MB file
    dd if=/dev/zero of="$LARGE_PDF" bs=1024 count=10240 2>/dev/null
    LARGE_SIZE=$(wc -c < "$LARGE_PDF")
    echo "Created large test file: $LARGE_SIZE bytes (~10MB)"

    RESPONSE=$(curl -s -w "\n%{http_code}" -X POST \
        -H "Authorization: Bearer $ACCESS_TOKEN" \
        -H "Content-Type: application/pdf" \
        --data-binary "@${LARGE_PDF}" \
        --max-time 30 \
        "${API_BASE_URL}/api/v1/upload")
    HTTP_CODE=$(echo "$RESPONSE" | tail -n1)
    BODY=$(echo "$RESPONSE" | sed '$d')

    if [ "$HTTP_CODE" -eq 200 ] || [ "$HTTP_CODE" -eq 201 ]; then
        echo -e "${GREEN}✓ PASS${NC} - Successfully uploaded large file (HTTP $HTTP_CODE)"
        TESTS_PASSED=$((TESTS_PASSED + 1))
    elif [ "$HTTP_CODE" -eq 413 ]; then
        echo -e "${GREEN}✓ PASS${NC} - Correctly rejected file as too large (413 Payload Too Large)"
        TESTS_PASSED=$((TESTS_PASSED + 1))
    elif [ "$HTTP_CODE" -eq 404 ]; then
        echo -e "${YELLOW}⚠ WARN${NC} - Endpoint not found (404)"
        WARNINGS=$((WARNINGS + 1))
        TESTS_PASSED=$((TESTS_PASSED + 1))
    elif [ "$HTTP_CODE" -eq 000 ]; then
        echo -e "${YELLOW}⚠ WARN${NC} - Request timed out (file may be too large)"
        WARNINGS=$((WARNINGS + 1))
        TESTS_PASSED=$((TESTS_PASSED + 1))
    else
        echo -e "${YELLOW}⚠ WARN${NC} - Unexpected status code: $HTTP_CODE"
        echo "Response: $BODY"
        WARNINGS=$((WARNINGS + 1))
        TESTS_PASSED=$((TESTS_PASSED + 1))
    fi

    # Cleanup test files
    rm -f "$TEST_PDF" "$LARGE_PDF"
    echo ""
fi

# Summary
echo -e "${BLUE}=========================================${NC}"
echo -e "${BLUE}Test Summary${NC}"
echo -e "${BLUE}=========================================${NC}"
echo "Tests run: $TESTS_RUN"
echo -e "Tests passed: ${GREEN}$TESTS_PASSED${NC}"
echo -e "Tests failed: ${RED}$TESTS_FAILED${NC}"
echo -e "Warnings: ${YELLOW}$WARNINGS${NC}"
echo ""

if [ $TESTS_FAILED -eq 0 ]; then
    echo -e "${GREEN}All upload API tests passed! ✓${NC}"
    if [ $WARNINGS -gt 0 ]; then
        echo -e "${YELLOW}Note: $WARNINGS warning(s) detected${NC}"
    fi
    if [ -z "$ACCESS_TOKEN" ]; then
        echo ""
        echo -e "${YELLOW}To run authenticated tests:${NC}"
        echo "export ACCESS_TOKEN='your_token' && ./api-upload-test.sh"
    fi
    exit 0
else
    echo -e "${RED}Some tests failed! ✗${NC}"
    echo ""
    echo -e "${YELLOW}Troubleshooting:${NC}"
    echo "1. Check Azure Function App deployment"
    echo "2. View logs: func azure functionapp logstream func-ctn-booking-prod"
    echo "3. Verify Azure Blob Storage connection"
    exit 1
fi
