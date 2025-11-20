#!/bin/bash

################################################################################
# Comprehensive Deployment Test Suite
# Tests all recently deployed endpoints + existing critical endpoints
# Created: 2025-11-06
################################################################################

set -e  # Exit on error

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Configuration
API_BASE="https://ca-ctn-asr-api-dev.calmriver-700a8c55.westeurope.azurecontainerapps.io/api"
TOKEN_FILE="/tmp/asr-api-token.txt"
REPORT_FILE="/Users/ramondenoronha/Dev/DIL/ASR-full/api/tests/COMPREHENSIVE_TEST_REPORT_$(date +%Y-%m-%d_%H-%M-%S).md"

# Test counters
TOTAL_TESTS=0
PASSED_TESTS=0
FAILED_TESTS=0

# Array to store test results
declare -a TEST_RESULTS

################################################################################
# Helper Functions
################################################################################

log_info() {
    echo -e "${BLUE}[INFO]${NC} $1"
}

log_success() {
    echo -e "${GREEN}[PASS]${NC} $1"
    ((PASSED_TESTS++))
    ((TOTAL_TESTS++))
    TEST_RESULTS+=("✅ PASS: $1")
}

log_failure() {
    echo -e "${RED}[FAIL]${NC} $1"
    ((FAILED_TESTS++))
    ((TOTAL_TESTS++))
    TEST_RESULTS+=("❌ FAIL: $1")
}

log_warning() {
    echo -e "${YELLOW}[WARN]${NC} $1"
}

# Function to check if token exists and is valid
check_token() {
    if [[ ! -f "$TOKEN_FILE" ]]; then
        log_failure "Token file not found at $TOKEN_FILE"
        exit 1
    fi

    TOKEN=$(cat "$TOKEN_FILE")
    if [[ -z "$TOKEN" ]]; then
        log_failure "Token file is empty"
        exit 1
    fi

    log_success "Token file loaded successfully"
}

# Function to make authenticated API calls
api_call() {
    local method=$1
    local endpoint=$2
    local data=$3
    local content_type=${4:-"application/json"}

    local start_time=$(perl -MTime::HiRes=time -e 'printf "%.0f", time * 1000')

    if [[ -n "$data" ]]; then
        response=$(curl -s -w "\n%{http_code}" -X "$method" \
            "$API_BASE$endpoint" \
            -H "Authorization: Bearer $TOKEN" \
            -H "Content-Type: $content_type" \
            -d "$data")
    else
        response=$(curl -s -w "\n%{http_code}" -X "$method" \
            "$API_BASE$endpoint" \
            -H "Authorization: Bearer $TOKEN")
    fi

    local end_time=$(perl -MTime::HiRes=time -e 'printf "%.0f", time * 1000')
    local duration=$((end_time - start_time))

    # Extract status code (last line) and body (everything else)
    http_code=$(echo "$response" | tail -n1)
    body=$(echo "$response" | sed '$d')

    echo "$http_code|$duration|$body"
}

# Function to upload file
api_upload() {
    local method=$1
    local endpoint=$2
    local file_path=$3

    local start_time=$(perl -MTime::HiRes=time -e 'printf "%.0f", time * 1000')

    response=$(curl -s -w "\n%{http_code}" -X "$method" \
        "$API_BASE$endpoint" \
        -H "Authorization: Bearer $TOKEN" \
        -F "file=@$file_path")

    local end_time=$(perl -MTime::HiRes=time -e 'printf "%.0f", time * 1000')
    local duration=$((end_time - start_time))

    http_code=$(echo "$response" | tail -n1)
    body=$(echo "$response" | sed '$d')

    echo "$http_code|$duration|$body"
}

################################################################################
# Test Suite
################################################################################

echo "=================================="
echo "COMPREHENSIVE DEPLOYMENT TEST SUITE"
echo "=================================="
echo "Started at: $(date)"
echo ""

# Check token
check_token

################################################################################
# 1. HEALTH & VERSION CHECKS (Baseline)
################################################################################

log_info "Testing Health & Version endpoints..."

# Health check
result=$(api_call GET "/health")
http_code=$(echo "$result" | cut -d'|' -f1)
duration=$(echo "$result" | cut -d'|' -f2)
body=$(echo "$result" | cut -d'|' -f3-)

if [[ "$http_code" == "200" ]]; then
    log_success "Health check (${duration}ms)"
else
    log_failure "Health check - Expected 200, got $http_code"
fi

# Version check
result=$(api_call GET "/version")
http_code=$(echo "$result" | cut -d'|' -f1)
duration=$(echo "$result" | cut -d'|' -f2)
body=$(echo "$result" | cut -d'|' -f3-)

if [[ "$http_code" == "200" ]]; then
    version=$(echo "$body" | jq -r '.version // empty')
    log_success "Version endpoint - v$version (${duration}ms)"
else
    log_failure "Version endpoint - Expected 200, got $http_code"
fi

################################################################################
# 2. MEMBER/LEGAL ENTITY ENDPOINTS (Core functionality)
################################################################################

log_info ""
log_info "Testing Member/Legal Entity endpoints..."

# Get members list
result=$(api_call GET "/v1/members")
http_code=$(echo "$result" | cut -d'|' -f1)
duration=$(echo "$result" | cut -d'|' -f2)
body=$(echo "$result" | cut -d'|' -f3-)

if [[ "$http_code" == "200" ]]; then
    member_count=$(echo "$body" | jq -r '.data | length')
    log_success "GET /v1/members - Found $member_count members (${duration}ms)"

    # Get first member's legal entity ID for subsequent tests
    LEGAL_ENTITY_ID=$(echo "$body" | jq -r '.data[0].legal_entity_id // empty')

    if [[ -n "$LEGAL_ENTITY_ID" ]]; then
        log_info "Using legal_entity_id: $LEGAL_ENTITY_ID for further tests"
    else
        log_warning "No members found, some tests will be skipped"
    fi
else
    log_failure "GET /v1/members - Expected 200, got $http_code"
fi

# Get specific legal entity (if we have an ID)
if [[ -n "$LEGAL_ENTITY_ID" ]]; then
    result=$(api_call GET "/v1/legal-entities/$LEGAL_ENTITY_ID")
    http_code=$(echo "$result" | cut -d'|' -f1)
    duration=$(echo "$result" | cut -d'|' -f2)
    body=$(echo "$result" | cut -d'|' -f3-)

    if [[ "$http_code" == "200" ]]; then
        entity_name=$(echo "$body" | jq -r '.name // empty')
        log_success "GET /v1/legal-entities/{id} - $entity_name (${duration}ms)"
    else
        log_failure "GET /v1/legal-entities/{id} - Expected 200, got $http_code"
    fi

    # Get identifiers for the legal entity
    result=$(api_call GET "/v1/legal-entities/$LEGAL_ENTITY_ID/identifiers")
    http_code=$(echo "$result" | cut -d'|' -f1)
    duration=$(echo "$result" | cut -d'|' -f2)
    body=$(echo "$result" | cut -d'|' -f3-)

    if [[ "$http_code" == "200" ]]; then
        identifier_count=$(echo "$body" | jq -r '. | length')
        log_success "GET /v1/legal-entities/{id}/identifiers - Found $identifier_count identifiers (${duration}ms)"

        # Save first identifier ID for cleanup later
        IDENTIFIER_ID=$(echo "$body" | jq -r '.[0].identifier_id // empty')
    else
        log_failure "GET /v1/legal-entities/{id}/identifiers - Expected 200, got $http_code"
    fi
fi

################################################################################
# 3. IDENTIFIER VERIFICATION ENDPOINTS (CRITICAL - Just deployed!)
################################################################################

log_info ""
log_info "Testing Identifier Verification endpoints (Task 5 - CRITICAL)..."

if [[ -n "$LEGAL_ENTITY_ID" ]]; then

    # Test 3.1: GET verifications (should be empty initially)
    result=$(api_call GET "/v1/legal-entities/$LEGAL_ENTITY_ID/verifications")
    http_code=$(echo "$result" | cut -d'|' -f1)
    duration=$(echo "$result" | cut -d'|' -f2)
    body=$(echo "$result" | cut -d'|' -f3-)

    if [[ "$http_code" == "200" ]]; then
        verification_count=$(echo "$body" | jq -r '. | length')
        log_success "GET /v1/legal-entities/{id}/verifications - Found $verification_count verifications (${duration}ms)"
    else
        log_failure "GET /v1/legal-entities/{id}/verifications - Expected 200, got $http_code"
    fi

    # Test 3.2: POST verification with file upload (create test document first)
    # Create a temporary test document
    TEST_DOC="/tmp/test_verification_doc_$(date +%s).txt"
    echo "Test verification document for KvK Chamber of Commerce" > "$TEST_DOC"
    echo "Legal Entity: $LEGAL_ENTITY_ID" >> "$TEST_DOC"
    echo "Verification Date: $(date)" >> "$TEST_DOC"
    echo "This is a test document for API testing purposes." >> "$TEST_DOC"

    log_info "Uploading verification document..."
    result=$(api_upload POST "/v1/legal-entities/$LEGAL_ENTITY_ID/verifications" "$TEST_DOC")
    http_code=$(echo "$result" | cut -d'|' -f1)
    duration=$(echo "$result" | cut -d'|' -f2)
    body=$(echo "$result" | cut -d'|' -f3-)

    if [[ "$http_code" == "201" || "$http_code" == "200" ]]; then
        VERIFICATION_ID=$(echo "$body" | jq -r '.verification_id // .id // empty')
        log_success "POST /v1/legal-entities/{id}/verifications - Upload successful, ID: $VERIFICATION_ID (${duration}ms)"
    else
        log_failure "POST /v1/legal-entities/{id}/verifications - Expected 201/200, got $http_code - Body: $body"
    fi

    # Clean up test document
    rm -f "$TEST_DOC"

    # Test 3.3: GET verifications again (should now have at least 1)
    sleep 1  # Give database a moment
    result=$(api_call GET "/v1/legal-entities/$LEGAL_ENTITY_ID/verifications")
    http_code=$(echo "$result" | cut -d'|' -f1)
    duration=$(echo "$result" | cut -d'|' -f2)
    body=$(echo "$result" | cut -d'|' -f3-)

    if [[ "$http_code" == "200" ]]; then
        verification_count=$(echo "$body" | jq -r '. | length')
        if [[ "$verification_count" -gt 0 ]]; then
            log_success "GET /v1/legal-entities/{id}/verifications (after upload) - Found $verification_count verifications (${duration}ms)"
        else
            log_failure "GET /v1/legal-entities/{id}/verifications (after upload) - Expected >0 verifications, found $verification_count"
        fi
    else
        log_failure "GET /v1/legal-entities/{id}/verifications (after upload) - Expected 200, got $http_code"
    fi

else
    log_warning "Skipping verification tests - no legal entity ID available"
fi

################################################################################
# 4. TASK MANAGEMENT ENDPOINTS
################################################################################

log_info ""
log_info "Testing Task Management endpoints..."

# Test 4.1: GET all tasks
result=$(api_call GET "/v1/admin/tasks")
http_code=$(echo "$result" | cut -d'|' -f1)
duration=$(echo "$result" | cut -d'|' -f2)
body=$(echo "$result" | cut -d'|' -f3-)

if [[ "$http_code" == "200" ]]; then
    task_count=$(echo "$body" | jq -r '. | length')
    log_success "GET /v1/admin/tasks - Found $task_count tasks (${duration}ms)"
else
    log_failure "GET /v1/admin/tasks - Expected 200, got $http_code"
fi

# Test 4.2: POST create new task
task_data=$(cat <<EOF
{
    "title": "API Test Task - $(date +%s)",
    "description": "This is a test task created by the comprehensive deployment test suite",
    "task_type": "member_application_review",
    "priority": "medium",
    "related_entity_id": "$LEGAL_ENTITY_ID"
}
EOF
)

result=$(api_call POST "/v1/admin/tasks" "$task_data")
http_code=$(echo "$result" | cut -d'|' -f1)
duration=$(echo "$result" | cut -d'|' -f2)
body=$(echo "$result" | cut -d'|' -f3-)

if [[ "$http_code" == "201" || "$http_code" == "200" ]]; then
    TASK_ID=$(echo "$body" | jq -r '.task_id // .id // empty')
    log_success "POST /v1/admin/tasks - Task created, ID: $TASK_ID (${duration}ms)"
else
    log_failure "POST /v1/admin/tasks - Expected 201/200, got $http_code - Body: $body"
fi

# Test 4.3: PATCH update task (if we created one)
if [[ -n "$TASK_ID" ]]; then
    update_data=$(cat <<EOF
{
    "status": "in_progress",
    "notes": "Updated by comprehensive test suite at $(date)"
}
EOF
)

    result=$(api_call PATCH "/v1/admin/tasks/$TASK_ID" "$update_data")
    http_code=$(echo "$result" | cut -d'|' -f1)
    duration=$(echo "$result" | cut -d'|' -f2)
    body=$(echo "$result" | cut -d'|' -f3-)

    if [[ "$http_code" == "200" ]]; then
        log_success "PATCH /v1/admin/tasks/{taskid} - Task updated (${duration}ms)"
    else
        log_failure "PATCH /v1/admin/tasks/{taskid} - Expected 200, got $http_code"
    fi
else
    log_warning "Skipping task update test - no task ID available"
fi

################################################################################
# 5. ADDITIONAL CRITICAL ENDPOINTS (Regression testing)
################################################################################

log_info ""
log_info "Testing additional critical endpoints (regression)..."

# Test 5.1: Member registration status check
result=$(api_call GET "/v1/members/registration/status")
http_code=$(echo "$result" | cut -d'|' -f1)
duration=$(echo "$result" | cut -d'|' -f2)

if [[ "$http_code" == "200" || "$http_code" == "404" ]]; then
    # 404 is acceptable if no registration in progress
    log_success "GET /v1/members/registration/status (${duration}ms)"
else
    log_failure "GET /v1/members/registration/status - Expected 200/404, got $http_code"
fi

# Test 5.2: Audit logs
result=$(api_call GET "/v1/audit-logs?limit=10")
http_code=$(echo "$result" | cut -d'|' -f1)
duration=$(echo "$result" | cut -d'|' -f2)
body=$(echo "$result" | cut -d'|' -f3-)

if [[ "$http_code" == "200" ]]; then
    audit_count=$(echo "$body" | jq -r '.data | length // 0')
    log_success "GET /v1/audit-logs - Found $audit_count audit logs (${duration}ms)"
else
    log_failure "GET /v1/audit-logs - Expected 200, got $http_code"
fi

# Test 5.3: M2M clients (if SystemAdmin)
result=$(api_call GET "/v1/admin/m2m-clients")
http_code=$(echo "$result" | cut -d'|' -f1)
duration=$(echo "$result" | cut -d'|' -f2)
body=$(echo "$result" | cut -d'|' -f3-)

if [[ "$http_code" == "200" ]]; then
    m2m_count=$(echo "$body" | jq -r '. | length // 0')
    log_success "GET /v1/admin/m2m-clients - Found $m2m_count M2M clients (${duration}ms)"
elif [[ "$http_code" == "403" ]]; then
    log_warning "GET /v1/admin/m2m-clients - Access denied (expected for non-admin users)"
else
    log_failure "GET /v1/admin/m2m-clients - Expected 200/403, got $http_code"
fi

################################################################################
# 6. ERROR HANDLING TESTS (Negative cases)
################################################################################

log_info ""
log_info "Testing error handling (negative cases)..."

# Test 6.1: Non-existent legal entity
result=$(api_call GET "/v1/legal-entities/00000000-0000-0000-0000-000000000000")
http_code=$(echo "$result" | cut -d'|' -f1)
duration=$(echo "$result" | cut -d'|' -f2)

if [[ "$http_code" == "404" ]]; then
    log_success "GET /v1/legal-entities/{invalid-id} - Correctly returns 404 (${duration}ms)"
else
    log_failure "GET /v1/legal-entities/{invalid-id} - Expected 404, got $http_code"
fi

# Test 6.2: Invalid task ID
result=$(api_call GET "/v1/admin/tasks/99999999")
http_code=$(echo "$result" | cut -d'|' -f1)
duration=$(echo "$result" | cut -d'|' -f2)

if [[ "$http_code" == "404" ]]; then
    log_success "GET /v1/admin/tasks/{invalid-id} - Correctly returns 404 (${duration}ms)"
else
    log_failure "GET /v1/admin/tasks/{invalid-id} - Expected 404, got $http_code"
fi

# Test 6.3: Missing required fields in POST
invalid_task='{"title": ""}'
result=$(api_call POST "/v1/admin/tasks" "$invalid_task")
http_code=$(echo "$result" | cut -d'|' -f1)
duration=$(echo "$result" | cut -d'|' -f2)

if [[ "$http_code" == "400" ]]; then
    log_success "POST /v1/admin/tasks (invalid) - Correctly returns 400 (${duration}ms)"
else
    log_failure "POST /v1/admin/tasks (invalid) - Expected 400, got $http_code"
fi

################################################################################
# CLEANUP
################################################################################

log_info ""
log_info "Cleaning up test data..."

# Delete test task if created
if [[ -n "$TASK_ID" ]]; then
    log_info "Note: Task $TASK_ID should be manually reviewed/deleted if needed"
fi

# Note: We don't delete verification records as they're historical audit data

################################################################################
# GENERATE REPORT
################################################################################

log_info ""
log_info "Generating test report..."

cat > "$REPORT_FILE" <<EOF
# Comprehensive Deployment Test Report

**Generated:** $(date)
**API Base:** $API_BASE
**Test User:** test-e2@denoronha.consulting

---

## Summary

- **Total Tests:** $TOTAL_TESTS
- **Passed:** $PASSED_TESTS ($(awk "BEGIN {printf \"%.1f\", ($PASSED_TESTS/$TOTAL_TESTS)*100}")%)
- **Failed:** $FAILED_TESTS
- **Status:** $([ $FAILED_TESTS -eq 0 ] && echo "✅ ALL TESTS PASSED" || echo "❌ SOME TESTS FAILED")

---

## Test Results

EOF

for result in "${TEST_RESULTS[@]}"; do
    echo "$result" >> "$REPORT_FILE"
done

cat >> "$REPORT_FILE" <<EOF

---

## Endpoint Coverage

### ✅ Task 5 - Identifier Verification (CRITICAL - Just Deployed)
- GET /v1/legal-entities/{id}/verifications
- POST /v1/legal-entities/{id}/verifications (with file upload)

### ✅ Task Management
- GET /v1/admin/tasks
- POST /v1/admin/tasks
- PATCH /v1/admin/tasks/{taskid}

### ✅ Core Functionality (Regression)
- Health check
- Version
- Get members
- Get legal entity
- Get identifiers
- Member registration status
- Audit logs
- M2M clients

### ✅ Error Handling
- Invalid legal entity ID (404)
- Invalid task ID (404)
- Invalid POST data (400)

---

## Recommendations

EOF

if [[ $FAILED_TESTS -eq 0 ]]; then
    cat >> "$REPORT_FILE" <<EOF
✅ **All systems operational!** All endpoints are functioning correctly.

**Next Steps:**
1. Run Playwright E2E tests for UI validation
2. Monitor production logs for any errors
3. Verify performance metrics in Application Insights
EOF
else
    cat >> "$REPORT_FILE" <<EOF
⚠️ **Action Required:** $FAILED_TESTS test(s) failed. Review the failures above and:

1. Check Azure Function App logs: \`func azure functionapp logstream func-ctn-demo-asr-dev\`
2. Verify database migration 022 was applied successfully
3. Confirm all function imports in essential-index.ts
4. Check for deployment errors in Azure DevOps pipeline

**Failed Tests:** Review the ❌ FAIL entries above for specific issues.
EOF
fi

cat >> "$REPORT_FILE" <<EOF

---

## Test Environment

- **API:** https://ca-ctn-asr-api-dev.calmriver-700a8c55.westeurope.azurecontainerapps.io/api
- **Database:** psql-ctn-demo-asr-dev.postgres.database.azure.com
- **Test User Object ID:** 7e093589-f654-4e53-9522-898995d1201b
- **Role:** SystemAdmin

---

## Performance Metrics

All response times are included in the test results above (shown in milliseconds).

**Baseline Expectations:**
- Health/Version: < 200ms
- GET operations: < 500ms
- POST operations: < 1000ms
- File uploads: < 2000ms

---

*Generated by comprehensive-deployment-test.sh*
EOF

################################################################################
# FINAL OUTPUT
################################################################################

echo ""
echo "=================================="
echo "TEST SUMMARY"
echo "=================================="
echo "Total Tests: $TOTAL_TESTS"
echo "Passed: $PASSED_TESTS"
echo "Failed: $FAILED_TESTS"
echo ""

if [[ $FAILED_TESTS -eq 0 ]]; then
    echo -e "${GREEN}✅ ALL TESTS PASSED${NC}"
else
    echo -e "${RED}❌ $FAILED_TESTS TEST(S) FAILED${NC}"
fi

echo ""
echo "Full report: $REPORT_FILE"
echo ""
echo "Completed at: $(date)"

# Exit with error if any tests failed
exit $FAILED_TESTS
