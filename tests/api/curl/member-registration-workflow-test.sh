#!/bin/bash
# =============================================================================
# Member Registration & Approval Workflow - API Test
# =============================================================================
# Tests the complete member onboarding workflow:
# 1. Submit application with KvK document
# 2. Approve application
# 3. Verify member created with KvK verification data
# =============================================================================

set -e  # Exit on error

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Configuration
API_BASE_URL="https://ca-ctn-asr-api-dev.calmriver-700a8c55.westeurope.azurecontainerapps.io/api/v1"
KVK_DOCUMENT_PATH="/Users/ramondenoronha/Desktop/KvK-DNC-95944192.pdf"
TEST_EMAIL="test-member-$(date +%s)@example.com"
TEST_KVK="95944192"
TEST_COMPANY="Test Company B.V. $(date +%s)"

echo "========================================================"
echo "Member Registration & Approval Workflow - API Test"
echo "========================================================"
echo "API Base URL: $API_BASE_URL"
echo "Test Email: $TEST_EMAIL"
echo "Test KvK: $TEST_KVK"
echo "Test Company: $TEST_COMPANY"
echo "KvK Document: $KVK_DOCUMENT_PATH"
echo "========================================================"
echo ""

# Check if KvK document exists
if [ ! -f "$KVK_DOCUMENT_PATH" ]; then
    echo -e "${RED}ERROR: KvK document not found at $KVK_DOCUMENT_PATH${NC}"
    exit 1
fi

# =============================================================================
# STEP 1: Submit Application
# =============================================================================
echo -e "${YELLOW}STEP 1: Submitting application...${NC}"

APPLICATION_RESPONSE=$(curl -s -X POST "$API_BASE_URL/applications" \
  -H "Content-Type: application/json" \
  -d "{
    \"company_name\": \"$TEST_COMPANY\",
    \"kvk_number\": \"$TEST_KVK\",
    \"contact_email\": \"$TEST_EMAIL\",
    \"contact_name\": \"Test Contact\",
    \"contact_phone\": \"+31612345678\",
    \"business_type\": \"Transport\",
    \"notes\": \"API test application\"
  }")

echo "Response: $APPLICATION_RESPONSE"

# Extract application ID
APPLICATION_ID=$(echo "$APPLICATION_RESPONSE" | grep -o '"id":"[^"]*"' | head -1 | cut -d'"' -f4)

if [ -z "$APPLICATION_ID" ]; then
    echo -e "${RED}ERROR: Failed to create application. Response: $APPLICATION_RESPONSE${NC}"
    exit 1
fi

echo -e "${GREEN}SUCCESS: Application created with ID: $APPLICATION_ID${NC}"
echo ""

# =============================================================================
# STEP 2: Upload KvK Document
# =============================================================================
echo -e "${YELLOW}STEP 2: Uploading KvK document...${NC}"

UPLOAD_RESPONSE=$(curl -s -X POST "$API_BASE_URL/applications/$APPLICATION_ID/documents" \
  -F "file=@$KVK_DOCUMENT_PATH" \
  -F "document_type=kvk_extract")

echo "Response: $UPLOAD_RESPONSE"

# Extract document URL
DOCUMENT_URL=$(echo "$UPLOAD_RESPONSE" | grep -o '"document_url":"[^"]*"' | cut -d'"' -f4)

if [ -z "$DOCUMENT_URL" ]; then
    echo -e "${RED}ERROR: Failed to upload document. Response: $UPLOAD_RESPONSE${NC}"
    exit 1
fi

echo -e "${GREEN}SUCCESS: Document uploaded to: $DOCUMENT_URL${NC}"
echo ""

# =============================================================================
# STEP 3: Verify Application Shows KvK Document
# =============================================================================
echo -e "${YELLOW}STEP 3: Verifying application shows KvK document...${NC}"

APPLICATION_DETAILS=$(curl -s -X GET "$API_BASE_URL/applications/$APPLICATION_ID")

echo "Application Details: $APPLICATION_DETAILS"

# Check if application has KvK document URL
if echo "$APPLICATION_DETAILS" | grep -q "$DOCUMENT_URL"; then
    echo -e "${GREEN}SUCCESS: Application shows KvK document URL${NC}"
else
    echo -e "${RED}WARNING: Application does not show KvK document URL${NC}"
fi
echo ""

# =============================================================================
# STEP 4: Approve Application
# =============================================================================
echo -e "${YELLOW}STEP 4: Approving application...${NC}"

APPROVAL_RESPONSE=$(curl -s -X PUT "$API_BASE_URL/applications/$APPLICATION_ID/approve" \
  -H "Content-Type: application/json" \
  -d "{
    \"approved_by\": \"API Test\",
    \"approval_notes\": \"Automated test approval\"
  }")

echo "Response: $APPROVAL_RESPONSE"

# Extract legal entity ID
LEGAL_ENTITY_ID=$(echo "$APPROVAL_RESPONSE" | grep -o '"legal_entity_id":"[^"]*"' | cut -d'"' -f4)

if [ -z "$LEGAL_ENTITY_ID" ]; then
    echo -e "${RED}ERROR: Failed to approve application. Response: $APPROVAL_RESPONSE${NC}"
    exit 1
fi

echo -e "${GREEN}SUCCESS: Application approved. Legal Entity ID: $LEGAL_ENTITY_ID${NC}"
echo ""

# =============================================================================
# STEP 5: Verify Member Created with KvK Verification Data
# =============================================================================
echo -e "${YELLOW}STEP 5: Verifying member created with KvK verification data...${NC}"

MEMBER_DETAILS=$(curl -s -X GET "$API_BASE_URL/legal-entities/$LEGAL_ENTITY_ID")

echo "Member Details: $MEMBER_DETAILS"

# Check for KvK verification fields
echo ""
echo "Checking KvK verification fields..."

CHECKS_PASSED=0
CHECKS_TOTAL=5

if echo "$MEMBER_DETAILS" | grep -q '"kvk_document_url"'; then
    echo -e "${GREEN}✓ kvk_document_url present${NC}"
    CHECKS_PASSED=$((CHECKS_PASSED + 1))
else
    echo -e "${RED}✗ kvk_document_url missing${NC}"
fi

if echo "$MEMBER_DETAILS" | grep -q '"kvk_verification_status"'; then
    echo -e "${GREEN}✓ kvk_verification_status present${NC}"
    CHECKS_PASSED=$((CHECKS_PASSED + 1))
else
    echo -e "${RED}✗ kvk_verification_status missing${NC}"
fi

if echo "$MEMBER_DETAILS" | grep -q '"kvk_verified_at"'; then
    echo -e "${GREEN}✓ kvk_verified_at present${NC}"
    CHECKS_PASSED=$((CHECKS_PASSED + 1))
else
    echo -e "${RED}✗ kvk_verified_at missing${NC}"
fi

if echo "$MEMBER_DETAILS" | grep -q '"kvk_verified_by"'; then
    echo -e "${GREEN}✓ kvk_verified_by present${NC}"
    CHECKS_PASSED=$((CHECKS_PASSED + 1))
else
    echo -e "${RED}✗ kvk_verified_by missing${NC}"
fi

if echo "$MEMBER_DETAILS" | grep -q '"kvk_verification_notes"'; then
    echo -e "${GREEN}✓ kvk_verification_notes present${NC}"
    CHECKS_PASSED=$((CHECKS_PASSED + 1))
else
    echo -e "${RED}✗ kvk_verification_notes missing${NC}"
fi

echo ""
echo "KvK Verification Fields Check: $CHECKS_PASSED/$CHECKS_TOTAL passed"

# =============================================================================
# STEP 6: Cleanup (Delete Test Data)
# =============================================================================
echo ""
echo -e "${YELLOW}STEP 6: Cleaning up test data...${NC}"

DELETE_RESPONSE=$(curl -s -X DELETE "$API_BASE_URL/legal-entities/$LEGAL_ENTITY_ID")
echo "Delete Response: $DELETE_RESPONSE"

echo -e "${GREEN}SUCCESS: Test data cleaned up${NC}"
echo ""

# =============================================================================
# Summary
# =============================================================================
echo "========================================================"
echo "TEST SUMMARY"
echo "========================================================"
echo "Application ID: $APPLICATION_ID"
echo "Legal Entity ID: $LEGAL_ENTITY_ID"
echo "Document URL: $DOCUMENT_URL"
echo "KvK Verification Fields: $CHECKS_PASSED/$CHECKS_TOTAL passed"
echo "========================================================"

if [ $CHECKS_PASSED -eq $CHECKS_TOTAL ]; then
    echo -e "${GREEN}ALL TESTS PASSED ✓${NC}"
    exit 0
else
    echo -e "${YELLOW}SOME CHECKS FAILED - Review output above${NC}"
    exit 1
fi
