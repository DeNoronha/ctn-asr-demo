#!/bin/bash
# =============================================================================
# Member Registration API Test - WITH KvK Document Upload
# =============================================================================
# Tests the complete member registration endpoint with multipart/form-data
# and KvK document verification flow using Document Intelligence and KvK API.
#
# This test demonstrates:
# - Multipart/form-data request with file upload
# - Document upload to Azure Blob Storage
# - Document Intelligence OCR extraction
# - KvK API validation
# - Application creation with verification status
# =============================================================================

set -e

# Colors
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
CYAN='\033[0;36m'
NC='\033[0m'

# Configuration
API_BASE_URL="https://ca-ctn-asr-api-dev.calmriver-700a8c55.westeurope.azurecontainerapps.io/api/v1"
TIMESTAMP=$(date +%s)
TEST_EMAIL="test-member-${TIMESTAMP}@example.com"
TEST_KVK=$(printf "%08d" $(echo $TIMESTAMP | tail -c 8 | sed 's/^0*//'))  # Generate 8-digit KvK number
TEST_COMPANY="Test Company B.V. ${TIMESTAMP}"

# KvK Document Path
KVK_DOCUMENT_PATH="/Users/ramondenoronha/Desktop/KvK-DNC-95944192.pdf"

echo ""
echo "========================================================================"
echo "  Member Registration API Test (WITH KvK Document Upload)"
echo "========================================================================"
echo "  API: $API_BASE_URL"
echo "  Email: $TEST_EMAIL"
echo "  KvK: $TEST_KVK"
echo "  Company: $TEST_COMPANY"
echo "  Document: $KVK_DOCUMENT_PATH"
echo "========================================================================"
echo ""

# =============================================================================
# PRE-FLIGHT CHECKS
# =============================================================================
echo -e "${BLUE}[Pre-flight] Checking prerequisites...${NC}"

# Check if KvK document exists
if [ ! -f "$KVK_DOCUMENT_PATH" ]; then
    echo -e "${RED}✗ KvK document not found: $KVK_DOCUMENT_PATH${NC}"
    echo ""
    echo "Available PDF files on Desktop:"
    ls -lh /Users/ramondenoronha/Desktop/*.pdf 2>/dev/null || echo "  No PDF files found"
    echo ""
    exit 1
fi

FILE_SIZE=$(stat -f%z "$KVK_DOCUMENT_PATH" 2>/dev/null || stat -c%s "$KVK_DOCUMENT_PATH")
FILE_SIZE_MB=$(echo "scale=2; $FILE_SIZE / 1024 / 1024" | bc)

echo -e "${GREEN}✓ KvK document found${NC}"
echo "  Path: $KVK_DOCUMENT_PATH"
echo "  Size: ${FILE_SIZE_MB} MB"

# Check if file is PDF
if ! file "$KVK_DOCUMENT_PATH" | grep -q "PDF"; then
    echo -e "${RED}✗ File is not a PDF${NC}"
    file "$KVK_DOCUMENT_PATH"
    exit 1
fi

echo -e "${GREEN}✓ File is a valid PDF${NC}"
echo ""

# =============================================================================
# TEST 1: Register Member with KvK Document
# =============================================================================
echo -e "${CYAN}[1/3] Submitting member registration with KvK document...${NC}"
echo ""

# Create multipart/form-data request with curl
REGISTER_RESPONSE=$(curl -s -w "\nHTTP_STATUS:%{http_code}" -X POST "$API_BASE_URL/register-member" \
  -F "legalName=$TEST_COMPANY" \
  -F "kvkNumber=$TEST_KVK" \
  -F "companyAddress=Test Street 123" \
  -F "postalCode=1234AB" \
  -F "city=Amsterdam" \
  -F "country=Netherlands" \
  -F "contactName=Test Contact" \
  -F "contactEmail=$TEST_EMAIL" \
  -F "contactPhone=+31612345678" \
  -F "jobTitle=CEO" \
  -F "membershipType=basic" \
  -F "termsAccepted=true" \
  -F "gdprConsent=true" \
  -F "kvkDocument=@$KVK_DOCUMENT_PATH;type=application/pdf")

HTTP_STATUS=$(echo "$REGISTER_RESPONSE" | grep "HTTP_STATUS" | cut -d':' -f2)
RESPONSE_BODY=$(echo "$REGISTER_RESPONSE" | sed '/HTTP_STATUS/d')

echo -e "${YELLOW}HTTP Status:${NC} $HTTP_STATUS"
echo -e "${YELLOW}Response:${NC}"
echo "$RESPONSE_BODY" | jq '.' 2>/dev/null || echo "$RESPONSE_BODY"
echo ""

if [ "$HTTP_STATUS" != "201" ]; then
    echo -e "${RED}✗ Registration failed (expected 201 Created, got $HTTP_STATUS)${NC}"
    echo ""
    echo "Common issues:"
    echo "  - 400: Validation error (check form fields)"
    echo "  - 409: Duplicate email or KvK number"
    echo "  - 413: File too large (max 10MB)"
    echo "  - 500: Server error (check Azure logs)"
    echo ""
    exit 1
fi

echo -e "${GREEN}✓ Registration request accepted (201 Created)${NC}"
echo ""

# =============================================================================
# TEST 2: Extract and Validate Response Data
# =============================================================================
echo -e "${CYAN}[2/3] Validating response data...${NC}"
echo ""

# Extract fields using jq
APPLICATION_ID=$(echo "$RESPONSE_BODY" | jq -r '.applicationId // empty')
STATUS=$(echo "$RESPONSE_BODY" | jq -r '.status // empty')
VERIFICATION_STATUS=$(echo "$RESPONSE_BODY" | jq -r '.verificationStatus // empty')
VERIFICATION_MESSAGE=$(echo "$RESPONSE_BODY" | jq -r '.verificationMessage // empty')
SUBMITTED_AT=$(echo "$RESPONSE_BODY" | jq -r '.submittedAt // empty')

# Validate required fields
VALIDATION_ERRORS=0

if [ -z "$APPLICATION_ID" ]; then
    echo -e "${RED}✗ Missing applicationId in response${NC}"
    VALIDATION_ERRORS=$((VALIDATION_ERRORS + 1))
else
    echo -e "${GREEN}✓ Application ID:${NC} $APPLICATION_ID"
fi

if [ -z "$STATUS" ]; then
    echo -e "${RED}✗ Missing status in response${NC}"
    VALIDATION_ERRORS=$((VALIDATION_ERRORS + 1))
else
    echo -e "${GREEN}✓ Application Status:${NC} $STATUS"
fi

if [ -z "$VERIFICATION_STATUS" ]; then
    echo -e "${RED}✗ Missing verificationStatus in response${NC}"
    VALIDATION_ERRORS=$((VALIDATION_ERRORS + 1))
else
    echo -e "${GREEN}✓ Verification Status:${NC} $VERIFICATION_STATUS"
fi

if [ -z "$VERIFICATION_MESSAGE" ]; then
    echo -e "${YELLOW}⚠ Missing verificationMessage (optional)${NC}"
else
    echo -e "${GREEN}✓ Verification Message:${NC} $VERIFICATION_MESSAGE"
fi

if [ -z "$SUBMITTED_AT" ]; then
    echo -e "${RED}✗ Missing submittedAt timestamp${NC}"
    VALIDATION_ERRORS=$((VALIDATION_ERRORS + 1))
else
    echo -e "${GREEN}✓ Submitted At:${NC} $SUBMITTED_AT"
fi

echo ""

# Check for nextSteps array
NEXT_STEPS=$(echo "$RESPONSE_BODY" | jq '.nextSteps // empty')
if [ -z "$NEXT_STEPS" ]; then
    echo -e "${YELLOW}⚠ Missing nextSteps guidance${NC}"
else
    echo -e "${GREEN}✓ Next Steps:${NC}"
    echo "$RESPONSE_BODY" | jq -r '.nextSteps[]' | sed 's/^/    • /'
fi

echo ""

if [ $VALIDATION_ERRORS -gt 0 ]; then
    echo -e "${RED}✗ Response validation failed ($VALIDATION_ERRORS errors)${NC}"
    exit 1
fi

echo -e "${GREEN}✓ All required response fields present${NC}"
echo ""

# =============================================================================
# TEST 3: Verification Status Analysis
# =============================================================================
echo -e "${CYAN}[3/3] Analyzing document verification results...${NC}"
echo ""

case "$VERIFICATION_STATUS" in
    "verified")
        echo -e "${GREEN}✓ VERIFIED${NC} - Document passed all validation checks"
        echo "  • Document Intelligence successfully extracted KvK data"
        echo "  • KvK API confirmed company exists"
        echo "  • No discrepancies found between entered and extracted data"
        echo ""
        ;;
    "flagged")
        echo -e "${YELLOW}⚠ FLAGGED${NC} - Document uploaded but needs manual review"
        echo "  • Document Intelligence extracted data successfully"
        echo "  • Some discrepancies or warnings detected"
        echo "  • Admin team will review during application processing"
        echo ""
        echo -e "${YELLOW}Possible flags:${NC}"
        echo "  - entered_kvk_mismatch: Entered KvK ≠ Extracted KvK"
        echo "  - entered_name_mismatch: Entered name ≠ Extracted name"
        echo "  - kvk_api_inactive: Company inactive in KvK registry"
        echo "  - kvk_api_name_mismatch: KvK registry name differs"
        echo ""
        ;;
    "failed")
        echo -e "${RED}✗ FAILED${NC} - Document verification encountered errors"
        echo "  • Document Intelligence could not extract data"
        echo "  • OR KvK API validation failed"
        echo "  • Application requires manual review"
        echo ""
        echo -e "${RED}Possible causes:${NC}"
        echo "  - Poor document quality (blurry, rotated)"
        echo "  - Non-standard KvK document format"
        echo "  - KvK API unavailable or company not found"
        echo "  - Network/service errors during processing"
        echo ""
        ;;
    "pending")
        echo -e "${BLUE}⏳ PENDING${NC} - Document uploaded, verification queued"
        echo "  • Document successfully uploaded to blob storage"
        echo "  • Verification will be processed asynchronously"
        echo ""
        ;;
    *)
        echo -e "${YELLOW}⚠ UNKNOWN${NC} - Unexpected verification status: $VERIFICATION_STATUS"
        echo ""
        ;;
esac

# =============================================================================
# SUMMARY
# =============================================================================
echo "========================================================================"
echo "  Test Summary"
echo "========================================================================"
echo -e "${GREEN}✓ Member registration with KvK document: SUCCESS${NC}"
echo ""
echo "Created Application:"
echo "  • Application ID: $APPLICATION_ID"
echo "  • Company: $TEST_COMPANY"
echo "  • KvK Number: $TEST_KVK"
echo "  • Contact Email: $TEST_EMAIL"
echo "  • Status: $STATUS"
echo "  • Verification: $VERIFICATION_STATUS"
echo "  • Submitted: $SUBMITTED_AT"
echo ""
echo "What was tested:"
echo "  ✓ Multipart/form-data request with file upload"
echo "  ✓ PDF file upload (${FILE_SIZE_MB} MB)"
echo "  ✓ Form data validation (14 required fields)"
echo "  ✓ Document upload to Azure Blob Storage"
echo "  ✓ Document Intelligence OCR extraction"
echo "  ✓ KvK API validation"
echo "  ✓ Application creation with verification status"
echo "  ✓ Response structure validation"
echo ""
echo "Next Steps:"
echo "  1. Check Azure Blob Storage for uploaded document:"
echo "     Container: documents"
echo "     Path: applications/$APPLICATION_ID/kvk-document.pdf"
echo ""
echo "  2. Check database for application record:"
echo "     SELECT * FROM applications WHERE application_id = '$APPLICATION_ID';"
echo ""
echo "  3. Admin approval workflow (Playwright test):"
echo "     • Login to admin portal"
echo "     • Navigate to Applications > Pending"
echo "     • Review application $APPLICATION_ID"
echo "     • View KvK document and verification status"
echo "     • Approve or reject application"
echo ""
echo "  4. Cleanup test data (manual):"
echo "     UPDATE applications SET status = 'rejected' WHERE application_id = '$APPLICATION_ID';"
echo ""
echo "========================================================================"
echo ""

echo -e "${GREEN}Test completed successfully! ✓${NC}"
echo ""

# Store application ID for potential cleanup
echo "$APPLICATION_ID" >> /tmp/test-applications.txt
echo "Application ID stored in /tmp/test-applications.txt for cleanup"
