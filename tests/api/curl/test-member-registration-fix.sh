#!/bin/bash
# Test script for member registration endpoint
# Tests the fix for:
# 1. Database CHECK constraint (status must be pending, verified, failed, or manual_review)
# 2. PDF file upload requirement

set -e

# Configuration
API_BASE="https://func-ctn-demo-asr-dev.azurewebsites.net/api/v1"
ENDPOINT="${API_BASE}/register-member"
PDF_FILE="/Users/ramondenoronha/Dev/DIL/DEV-CTN-ASR/tests/KvK-DNC-95944192.pdf"

# Generate unique test data using timestamp
TIMESTAMP=$(date +%s)
TEST_EMAIL="test-reg-${TIMESTAMP}@example.com"
TEST_KVK="${TIMESTAMP: -8}"  # Last 8 digits of timestamp
TEST_COMPANY="Test Registration Company ${TIMESTAMP}"

echo "============================================"
echo "Member Registration API Test"
echo "============================================"
echo ""
echo "Test Configuration:"
echo "  Endpoint: ${ENDPOINT}"
echo "  PDF File: ${PDF_FILE}"
echo "  Email: ${TEST_EMAIL}"
echo "  KvK Number: ${TEST_KVK}"
echo "  Company: ${TEST_COMPANY}"
echo ""

# Verify PDF file exists
if [ ! -f "${PDF_FILE}" ]; then
    echo "ERROR: PDF file not found at ${PDF_FILE}"
    exit 1
fi

echo "Sending registration request..."
echo ""

# Execute the API call
RESPONSE=$(curl -s -w "\n%{http_code}" -X POST "${ENDPOINT}" \
    -H "Content-Type: multipart/form-data" \
    -F "legalName=${TEST_COMPANY}" \
    -F "kvkNumber=${TEST_KVK}" \
    -F "companyAddress=123 Test Street" \
    -F "postalCode=1234 AB" \
    -F "city=Amsterdam" \
    -F "country=Netherlands" \
    -F "contactName=Test User" \
    -F "contactEmail=${TEST_EMAIL}" \
    -F "contactPhone=+31612345678" \
    -F "jobTitle=Test Engineer" \
    -F "membershipType=standard" \
    -F "termsAccepted=true" \
    -F "gdprConsent=true" \
    -F "kvkDocument=@${PDF_FILE}")

# Extract HTTP status code (last line)
HTTP_STATUS=$(echo "${RESPONSE}" | tail -n 1)

# Extract response body (all but last line)
RESPONSE_BODY=$(echo "${RESPONSE}" | sed '$d')

echo "============================================"
echo "Response Details"
echo "============================================"
echo ""
echo "HTTP Status: ${HTTP_STATUS}"
echo ""
echo "Response Body:"
echo "${RESPONSE_BODY}" | jq . 2>/dev/null || echo "${RESPONSE_BODY}"
echo ""

# Test validation
echo "============================================"
echo "Test Validation"
echo "============================================"
echo ""

TEST_PASSED=true
ERRORS=""

# Check HTTP status
if [ "${HTTP_STATUS}" != "201" ]; then
    TEST_PASSED=false
    ERRORS="${ERRORS}\n- Expected HTTP 201, got ${HTTP_STATUS}"
fi

# Check response structure using jq
if command -v jq &> /dev/null; then
    # Check applicationId exists
    APP_ID=$(echo "${RESPONSE_BODY}" | jq -r '.applicationId // empty')
    if [ -z "${APP_ID}" ]; then
        TEST_PASSED=false
        ERRORS="${ERRORS}\n- Missing applicationId in response"
    else
        echo "  applicationId: ${APP_ID}"
    fi

    # Check status is 'pending'
    STATUS=$(echo "${RESPONSE_BODY}" | jq -r '.status // empty')
    if [ "${STATUS}" != "pending" ]; then
        TEST_PASSED=false
        ERRORS="${ERRORS}\n- Expected status 'pending', got '${STATUS}'"
    else
        echo "  status: ${STATUS} (CORRECT)"
    fi

    # Check verificationStatus is one of allowed values
    VERIFICATION_STATUS=$(echo "${RESPONSE_BODY}" | jq -r '.verificationStatus // empty')
    case "${VERIFICATION_STATUS}" in
        verified|manual_review|failed|pending)
            echo "  verificationStatus: ${VERIFICATION_STATUS} (VALID)"
            ;;
        flagged)
            TEST_PASSED=false
            ERRORS="${ERRORS}\n- verificationStatus is 'flagged' which is NOT allowed by database constraint"
            ;;
        "")
            TEST_PASSED=false
            ERRORS="${ERRORS}\n- Missing verificationStatus in response"
            ;;
        *)
            TEST_PASSED=false
            ERRORS="${ERRORS}\n- Unexpected verificationStatus: '${VERIFICATION_STATUS}'"
            ;;
    esac

    # Check submittedAt exists
    SUBMITTED_AT=$(echo "${RESPONSE_BODY}" | jq -r '.submittedAt // empty')
    if [ -z "${SUBMITTED_AT}" ]; then
        TEST_PASSED=false
        ERRORS="${ERRORS}\n- Missing submittedAt in response"
    else
        echo "  submittedAt: ${SUBMITTED_AT}"
    fi

    # Check nextSteps array exists
    NEXT_STEPS=$(echo "${RESPONSE_BODY}" | jq -r '.nextSteps // empty')
    if [ -z "${NEXT_STEPS}" ] || [ "${NEXT_STEPS}" == "null" ]; then
        TEST_PASSED=false
        ERRORS="${ERRORS}\n- Missing nextSteps array in response"
    else
        STEPS_COUNT=$(echo "${RESPONSE_BODY}" | jq '.nextSteps | length')
        echo "  nextSteps: ${STEPS_COUNT} step(s)"
    fi
else
    echo "WARNING: jq not installed, skipping detailed response validation"
fi

echo ""
echo "============================================"
echo "Test Result"
echo "============================================"
echo ""

if [ "${TEST_PASSED}" = true ]; then
    echo "TEST PASSED"
    echo ""
    echo "The member registration fix is working correctly:"
    echo "  - HTTP 201 Created returned"
    echo "  - verificationStatus uses valid database constraint value"
    echo "  - Response structure is complete"
    exit 0
else
    echo "TEST FAILED"
    echo ""
    echo "Errors encountered:"
    echo -e "${ERRORS}"
    exit 1
fi
