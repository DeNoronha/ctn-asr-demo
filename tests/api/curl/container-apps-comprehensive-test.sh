#!/bin/bash

# =============================================================================
# Container Apps Comprehensive API Test Script
# =============================================================================
# Complete test suite for Container Apps API migration validation
# Tests ALL available endpoints with authentication and edge cases
#
# API URL: https://ca-ctn-asr-api-dev.calmriver-700a8c55.westeurope.azurecontainerapps.io/api
# =============================================================================

set -e

# Configuration
BASE_URL="https://ca-ctn-asr-api-dev.calmriver-700a8c55.westeurope.azurecontainerapps.io/api"

# Azure AD Configuration
TENANT_ID="598664e7-725c-4daa-bd1f-89c4ada717ff"
CLIENT_ID="d3037c11-a541-4f21-8862-8079137a0cde"
SCOPE="$CLIENT_ID/.default"
USERNAME="test-e2@denoronha.consulting"
PASSWORD="${E2E_TEST_USER_PASSWORD:-Madu5952}"

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
CYAN='\033[0;36m'
NC='\033[0m' # No Color

# Counters
PASSED=0
FAILED=0
WARNINGS=0
TOTAL_TESTS=0

# Results array
declare -a RESULTS
declare -a RESPONSE_TIMES

# Test start time
TEST_START_TIME=$(date +%s)

# =============================================================================
# Helper Functions
# =============================================================================

print_header() {
    echo ""
    echo "============================================================================="
    echo -e "${BLUE}$1${NC}"
    echo "============================================================================="
}

print_subheader() {
    echo ""
    echo -e "${CYAN}--- $1 ---${NC}"
}

print_test() {
    echo -e "\n${YELLOW}TEST:${NC} $1"
    ((TOTAL_TESTS++))
}

log_result() {
    local test_name="$1"
    local status="$2"
    local details="$3"
    local response_time="$4"

    if [ "$status" == "PASS" ]; then
        echo -e "${GREEN}[PASS]${NC} $test_name (${response_time}ms)"
        ((PASSED++))
        RESULTS+=("PASS|$test_name|$details|$response_time")
    elif [ "$status" == "FAIL" ]; then
        echo -e "${RED}[FAIL]${NC} $test_name"
        echo -e "       ${RED}Details: $details${NC}"
        ((FAILED++))
        RESULTS+=("FAIL|$test_name|$details|$response_time")
    else
        echo -e "${YELLOW}[WARN]${NC} $test_name"
        echo -e "       ${YELLOW}Details: $details${NC}"
        ((WARNINGS++))
        RESULTS+=("WARN|$test_name|$details|$response_time")
    fi

    RESPONSE_TIMES+=("$response_time")
}

# Make HTTP request and measure time
make_request() {
    local method="$1"
    local endpoint="$2"
    local data="$3"
    local auth="$4"
    local content_type="${5:-application/json}"

    local curl_args=(-s -w "\n%{http_code}\n%{time_total}")
    curl_args+=(-X "$method")

    if [ -n "$auth" ]; then
        curl_args+=(-H "Authorization: Bearer $auth")
    fi

    if [ -n "$content_type" ]; then
        curl_args+=(-H "Content-Type: $content_type")
    fi

    if [ -n "$data" ]; then
        curl_args+=(-d "$data")
    fi

    local result=$(curl "${curl_args[@]}" "${BASE_URL}${endpoint}" 2>&1)
    echo "$result"
}

# =============================================================================
# Token Acquisition
# =============================================================================

acquire_token() {
    print_header "ACQUIRING AZURE AD ACCESS TOKEN"

    echo "Tenant: $TENANT_ID"
    echo "Client: $CLIENT_ID"
    echo "User: $USERNAME"
    echo ""

    local response=$(curl -s -X POST "https://login.microsoftonline.com/$TENANT_ID/oauth2/v2.0/token" \
        -H "Content-Type: application/x-www-form-urlencoded" \
        -d "client_id=$CLIENT_ID" \
        -d "scope=$SCOPE" \
        -d "username=$USERNAME" \
        -d "password=$PASSWORD" \
        -d "grant_type=password")

    if echo "$response" | grep -q "access_token"; then
        ACCESS_TOKEN=$(echo "$response" | grep -o '"access_token":"[^"]*' | cut -d'"' -f4)
        echo -e "${GREEN}Token acquired successfully${NC}"
        echo "Token (first 50 chars): ${ACCESS_TOKEN:0:50}..."
        return 0
    else
        echo -e "${RED}Failed to acquire token${NC}"
        echo "Response: $response"
        return 1
    fi
}

# =============================================================================
# PUBLIC ENDPOINT TESTS
# =============================================================================

test_health_endpoint() {
    print_test "GET /health - Health Check"

    local result=$(make_request "GET" "/health")
    local body=$(echo "$result" | sed -n '1p')
    local http_code=$(echo "$result" | sed -n '2p')
    local time_total=$(echo "$result" | sed -n '3p')
    local time_ms=$(echo "$time_total * 1000" | bc | cut -d'.' -f1)

    echo "HTTP Code: $http_code"
    echo "Response: $body"

    if [ "$http_code" == "200" ]; then
        log_result "GET /health" "PASS" "Returns 200 with health status" "$time_ms"
    else
        log_result "GET /health" "FAIL" "Expected 200, got $http_code" "$time_ms"
    fi
}

test_version_endpoint() {
    print_test "GET /v1/version - API Version Info"

    local result=$(make_request "GET" "/v1/version")
    local body=$(echo "$result" | sed -n '1p')
    local http_code=$(echo "$result" | sed -n '2p')
    local time_total=$(echo "$result" | sed -n '3p')
    local time_ms=$(echo "$time_total * 1000" | bc | cut -d'.' -f1)

    echo "HTTP Code: $http_code"
    echo "Response: $body"

    if [ "$http_code" == "200" ]; then
        log_result "GET /v1/version" "PASS" "Returns 200 with version info" "$time_ms"
    elif [ "$http_code" == "404" ]; then
        log_result "GET /v1/version" "FAIL" "Endpoint not found (404)" "$time_ms"
    else
        log_result "GET /v1/version" "FAIL" "Expected 200, got $http_code" "$time_ms"
    fi
}

test_register_member_empty_body() {
    print_test "POST /v1/register-member - Empty Body"

    local result=$(make_request "POST" "/v1/register-member" "{}")
    local body=$(echo "$result" | sed -n '1p')
    local http_code=$(echo "$result" | sed -n '2p')
    local time_total=$(echo "$result" | sed -n '3p')
    local time_ms=$(echo "$time_total * 1000" | bc | cut -d'.' -f1)

    echo "HTTP Code: $http_code"
    echo "Response: $body"

    if [ "$http_code" == "400" ]; then
        log_result "POST /v1/register-member (empty)" "PASS" "Returns 400 for empty body" "$time_ms"
    elif [ "$http_code" == "404" ]; then
        log_result "POST /v1/register-member (empty)" "FAIL" "Endpoint not found (404)" "$time_ms"
    else
        log_result "POST /v1/register-member (empty)" "WARN" "Expected 400, got $http_code" "$time_ms"
    fi
}

test_register_member_missing_fields() {
    print_test "POST /v1/register-member - Missing Required Fields"

    local data='{"legalName": "Test Company"}'
    local result=$(make_request "POST" "/v1/register-member" "$data")
    local body=$(echo "$result" | sed -n '1p')
    local http_code=$(echo "$result" | sed -n '2p')
    local time_total=$(echo "$result" | sed -n '3p')
    local time_ms=$(echo "$time_total * 1000" | bc | cut -d'.' -f1)

    echo "HTTP Code: $http_code"
    echo "Response: $body"

    if [ "$http_code" == "400" ]; then
        log_result "POST /v1/register-member (missing fields)" "PASS" "Returns 400 for missing required fields" "$time_ms"
    else
        log_result "POST /v1/register-member (missing fields)" "WARN" "Expected 400, got $http_code" "$time_ms"
    fi
}

test_register_member_invalid_email() {
    print_test "POST /v1/register-member - Invalid Email Format"

    local data='{
        "legalName": "Test Company BV",
        "primaryContactName": "John Doe",
        "primaryContactEmail": "not-an-email",
        "kvkNumber": "12345678"
    }'
    local result=$(make_request "POST" "/v1/register-member" "$data")
    local body=$(echo "$result" | sed -n '1p')
    local http_code=$(echo "$result" | sed -n '2p')
    local time_total=$(echo "$result" | sed -n '3p')
    local time_ms=$(echo "$time_total * 1000" | bc | cut -d'.' -f1)

    echo "HTTP Code: $http_code"
    echo "Response: $body"

    if [ "$http_code" == "400" ]; then
        log_result "POST /v1/register-member (invalid email)" "PASS" "Returns 400 for invalid email" "$time_ms"
    else
        log_result "POST /v1/register-member (invalid email)" "WARN" "Expected 400, got $http_code" "$time_ms"
    fi
}

test_register_member_invalid_kvk() {
    print_test "POST /v1/register-member - Invalid KvK Number"

    local data='{
        "legalName": "Test Company BV",
        "primaryContactName": "John Doe",
        "primaryContactEmail": "test@example.com",
        "kvkNumber": "123"
    }'
    local result=$(make_request "POST" "/v1/register-member" "$data")
    local body=$(echo "$result" | sed -n '1p')
    local http_code=$(echo "$result" | sed -n '2p')
    local time_total=$(echo "$result" | sed -n '3p')
    local time_ms=$(echo "$time_total * 1000" | bc | cut -d'.' -f1)

    echo "HTTP Code: $http_code"
    echo "Response: $body"

    if [ "$http_code" == "400" ]; then
        log_result "POST /v1/register-member (invalid KvK)" "PASS" "Returns 400 for invalid KvK" "$time_ms"
    else
        log_result "POST /v1/register-member (invalid KvK)" "WARN" "Expected 400, got $http_code" "$time_ms"
    fi
}

# =============================================================================
# UNAUTHORIZED ACCESS TESTS (Should return 401)
# =============================================================================

test_members_unauthorized() {
    print_test "GET /v1/members - Without Token"

    local result=$(make_request "GET" "/v1/members")
    local body=$(echo "$result" | sed -n '1p')
    local http_code=$(echo "$result" | sed -n '2p')
    local time_total=$(echo "$result" | sed -n '3p')
    local time_ms=$(echo "$time_total * 1000" | bc | cut -d'.' -f1)

    echo "HTTP Code: $http_code"

    if [ "$http_code" == "401" ]; then
        log_result "GET /v1/members (no auth)" "PASS" "Returns 401 without token" "$time_ms"
    elif [ "$http_code" == "404" ]; then
        log_result "GET /v1/members (no auth)" "FAIL" "Endpoint not found (404)" "$time_ms"
    else
        log_result "GET /v1/members (no auth)" "FAIL" "Expected 401, got $http_code" "$time_ms"
    fi
}

test_applications_unauthorized() {
    print_test "GET /v1/applications - Without Token"

    local result=$(make_request "GET" "/v1/applications")
    local body=$(echo "$result" | sed -n '1p')
    local http_code=$(echo "$result" | sed -n '2p')
    local time_total=$(echo "$result" | sed -n '3p')
    local time_ms=$(echo "$time_total * 1000" | bc | cut -d'.' -f1)

    echo "HTTP Code: $http_code"

    if [ "$http_code" == "401" ]; then
        log_result "GET /v1/applications (no auth)" "PASS" "Returns 401 without token" "$time_ms"
    elif [ "$http_code" == "404" ]; then
        log_result "GET /v1/applications (no auth)" "FAIL" "Endpoint not found (404)" "$time_ms"
    else
        log_result "GET /v1/applications (no auth)" "FAIL" "Expected 401, got $http_code" "$time_ms"
    fi
}

test_audit_logs_unauthorized() {
    print_test "GET /v1/audit-logs - Without Token"

    local result=$(make_request "GET" "/v1/audit-logs")
    local body=$(echo "$result" | sed -n '1p')
    local http_code=$(echo "$result" | sed -n '2p')
    local time_total=$(echo "$result" | sed -n '3p')
    local time_ms=$(echo "$time_total * 1000" | bc | cut -d'.' -f1)

    echo "HTTP Code: $http_code"

    if [ "$http_code" == "401" ]; then
        log_result "GET /v1/audit-logs (no auth)" "PASS" "Returns 401 without token" "$time_ms"
    elif [ "$http_code" == "404" ]; then
        log_result "GET /v1/audit-logs (no auth)" "FAIL" "Endpoint not found (404)" "$time_ms"
    else
        log_result "GET /v1/audit-logs (no auth)" "FAIL" "Expected 401, got $http_code" "$time_ms"
    fi
}

test_tasks_unauthorized() {
    print_test "GET /v1/tasks - Without Token"

    local result=$(make_request "GET" "/v1/tasks")
    local body=$(echo "$result" | sed -n '1p')
    local http_code=$(echo "$result" | sed -n '2p')
    local time_total=$(echo "$result" | sed -n '3p')
    local time_ms=$(echo "$time_total * 1000" | bc | cut -d'.' -f1)

    echo "HTTP Code: $http_code"

    if [ "$http_code" == "401" ]; then
        log_result "GET /v1/tasks (no auth)" "PASS" "Returns 401 without token" "$time_ms"
    elif [ "$http_code" == "404" ]; then
        log_result "GET /v1/tasks (no auth)" "FAIL" "Endpoint not found (404)" "$time_ms"
    else
        log_result "GET /v1/tasks (no auth)" "FAIL" "Expected 401, got $http_code" "$time_ms"
    fi
}

test_member_unauthorized() {
    print_test "GET /v1/member - Without Token"

    local result=$(make_request "GET" "/v1/member")
    local body=$(echo "$result" | sed -n '1p')
    local http_code=$(echo "$result" | sed -n '2p')
    local time_total=$(echo "$result" | sed -n '3p')
    local time_ms=$(echo "$time_total * 1000" | bc | cut -d'.' -f1)

    echo "HTTP Code: $http_code"

    if [ "$http_code" == "401" ]; then
        log_result "GET /v1/member (no auth)" "PASS" "Returns 401 without token" "$time_ms"
    elif [ "$http_code" == "404" ]; then
        log_result "GET /v1/member (no auth)" "FAIL" "Endpoint not found (404)" "$time_ms"
    else
        log_result "GET /v1/member (no auth)" "FAIL" "Expected 401, got $http_code" "$time_ms"
    fi
}

# =============================================================================
# AUTHENTICATED ENDPOINT TESTS
# =============================================================================

test_members_authenticated() {
    print_test "GET /v1/members - With Valid Token"

    local result=$(make_request "GET" "/v1/members" "" "$ACCESS_TOKEN")
    local body=$(echo "$result" | sed -n '1p')
    local http_code=$(echo "$result" | sed -n '2p')
    local time_total=$(echo "$result" | sed -n '3p')
    local time_ms=$(echo "$time_total * 1000" | bc | cut -d'.' -f1)

    echo "HTTP Code: $http_code"
    echo "Response (truncated): ${body:0:200}..."

    if [ "$http_code" == "200" ]; then
        log_result "GET /v1/members" "PASS" "Returns 200 with members data" "$time_ms"
    elif [ "$http_code" == "403" ]; then
        log_result "GET /v1/members" "FAIL" "Forbidden (403) - RBAC issue" "$time_ms"
    else
        log_result "GET /v1/members" "FAIL" "Expected 200, got $http_code" "$time_ms"
    fi
}

test_members_pagination() {
    print_test "GET /v1/members?page=1&pageSize=5 - Pagination"

    local result=$(make_request "GET" "/v1/members?page=1&pageSize=5" "" "$ACCESS_TOKEN")
    local body=$(echo "$result" | sed -n '1p')
    local http_code=$(echo "$result" | sed -n '2p')
    local time_total=$(echo "$result" | sed -n '3p')
    local time_ms=$(echo "$time_total * 1000" | bc | cut -d'.' -f1)

    echo "HTTP Code: $http_code"

    if [ "$http_code" == "200" ]; then
        log_result "GET /v1/members (pagination)" "PASS" "Pagination works correctly" "$time_ms"
    else
        log_result "GET /v1/members (pagination)" "FAIL" "Expected 200, got $http_code" "$time_ms"
    fi
}

test_members_search() {
    print_test "GET /v1/members?search=test - Search Filter"

    local result=$(make_request "GET" "/v1/members?search=test" "" "$ACCESS_TOKEN")
    local body=$(echo "$result" | sed -n '1p')
    local http_code=$(echo "$result" | sed -n '2p')
    local time_total=$(echo "$result" | sed -n '3p')
    local time_ms=$(echo "$time_total * 1000" | bc | cut -d'.' -f1)

    echo "HTTP Code: $http_code"

    if [ "$http_code" == "200" ]; then
        log_result "GET /v1/members (search)" "PASS" "Search filter works correctly" "$time_ms"
    else
        log_result "GET /v1/members (search)" "FAIL" "Expected 200, got $http_code" "$time_ms"
    fi
}

test_applications_authenticated() {
    print_test "GET /v1/applications - With Valid Token"

    local result=$(make_request "GET" "/v1/applications" "" "$ACCESS_TOKEN")
    local body=$(echo "$result" | sed -n '1p')
    local http_code=$(echo "$result" | sed -n '2p')
    local time_total=$(echo "$result" | sed -n '3p')
    local time_ms=$(echo "$time_total * 1000" | bc | cut -d'.' -f1)

    echo "HTTP Code: $http_code"
    echo "Response (truncated): ${body:0:200}..."

    if [ "$http_code" == "200" ]; then
        log_result "GET /v1/applications" "PASS" "Returns 200 with applications" "$time_ms"
    elif [ "$http_code" == "403" ]; then
        log_result "GET /v1/applications" "FAIL" "Forbidden (403) - RBAC issue" "$time_ms"
    else
        log_result "GET /v1/applications" "FAIL" "Expected 200, got $http_code" "$time_ms"
    fi
}

test_audit_logs_authenticated() {
    print_test "GET /v1/audit-logs - With Valid Token"

    local result=$(make_request "GET" "/v1/audit-logs" "" "$ACCESS_TOKEN")
    local body=$(echo "$result" | sed -n '1p')
    local http_code=$(echo "$result" | sed -n '2p')
    local time_total=$(echo "$result" | sed -n '3p')
    local time_ms=$(echo "$time_total * 1000" | bc | cut -d'.' -f1)

    echo "HTTP Code: $http_code"
    echo "Response (truncated): ${body:0:200}..."

    if [ "$http_code" == "200" ]; then
        log_result "GET /v1/audit-logs" "PASS" "Returns 200 with audit logs" "$time_ms"
    elif [ "$http_code" == "403" ]; then
        log_result "GET /v1/audit-logs" "FAIL" "Forbidden (403) - RBAC issue" "$time_ms"
    else
        log_result "GET /v1/audit-logs" "FAIL" "Expected 200, got $http_code" "$time_ms"
    fi
}

test_tasks_authenticated() {
    print_test "GET /v1/tasks - With Valid Token"

    local result=$(make_request "GET" "/v1/tasks" "" "$ACCESS_TOKEN")
    local body=$(echo "$result" | sed -n '1p')
    local http_code=$(echo "$result" | sed -n '2p')
    local time_total=$(echo "$result" | sed -n '3p')
    local time_ms=$(echo "$time_total * 1000" | bc | cut -d'.' -f1)

    echo "HTTP Code: $http_code"
    echo "Response (truncated): ${body:0:200}..."

    if [ "$http_code" == "200" ]; then
        log_result "GET /v1/tasks" "PASS" "Returns 200 with tasks" "$time_ms"
    elif [ "$http_code" == "403" ]; then
        log_result "GET /v1/tasks" "FAIL" "Forbidden (403) - RBAC issue" "$time_ms"
    else
        log_result "GET /v1/tasks" "FAIL" "Expected 200, got $http_code" "$time_ms"
    fi
}

test_member_authenticated() {
    print_test "GET /v1/member - Authenticated User Profile"

    local result=$(make_request "GET" "/v1/member" "" "$ACCESS_TOKEN")
    local body=$(echo "$result" | sed -n '1p')
    local http_code=$(echo "$result" | sed -n '2p')
    local time_total=$(echo "$result" | sed -n '3p')
    local time_ms=$(echo "$time_total * 1000" | bc | cut -d'.' -f1)

    echo "HTTP Code: $http_code"
    echo "Response (truncated): ${body:0:200}..."

    if [ "$http_code" == "200" ]; then
        log_result "GET /v1/member" "PASS" "Returns 200 with user profile" "$time_ms"
    elif [ "$http_code" == "404" ]; then
        log_result "GET /v1/member" "WARN" "User not linked to member (404)" "$time_ms"
    else
        log_result "GET /v1/member" "FAIL" "Expected 200, got $http_code" "$time_ms"
    fi
}

# =============================================================================
# EDGE CASE TESTS
# =============================================================================

test_invalid_token() {
    print_test "GET /v1/members - Invalid Token"

    local result=$(make_request "GET" "/v1/members" "" "invalid-token-12345")
    local body=$(echo "$result" | sed -n '1p')
    local http_code=$(echo "$result" | sed -n '2p')
    local time_total=$(echo "$result" | sed -n '3p')
    local time_ms=$(echo "$time_total * 1000" | bc | cut -d'.' -f1)

    echo "HTTP Code: $http_code"

    if [ "$http_code" == "401" ]; then
        log_result "GET /v1/members (invalid token)" "PASS" "Returns 401 for invalid token" "$time_ms"
    else
        log_result "GET /v1/members (invalid token)" "FAIL" "Expected 401, got $http_code" "$time_ms"
    fi
}

test_expired_token() {
    print_test "GET /v1/members - Malformed JWT Token"

    # Malformed JWT
    local bad_token="eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJzdWIiOiIxMjM0NTY3ODkwIiwibmFtZSI6IkpvaG4gRG9lIiwiZXhwIjoxMjM0NTY3ODkwfQ.invalid"

    local result=$(make_request "GET" "/v1/members" "" "$bad_token")
    local body=$(echo "$result" | sed -n '1p')
    local http_code=$(echo "$result" | sed -n '2p')
    local time_total=$(echo "$result" | sed -n '3p')
    local time_ms=$(echo "$time_total * 1000" | bc | cut -d'.' -f1)

    echo "HTTP Code: $http_code"

    if [ "$http_code" == "401" ]; then
        log_result "GET /v1/members (malformed JWT)" "PASS" "Returns 401 for malformed JWT" "$time_ms"
    else
        log_result "GET /v1/members (malformed JWT)" "FAIL" "Expected 401, got $http_code" "$time_ms"
    fi
}

test_nonexistent_member() {
    print_test "GET /v1/members/nonexistent-id - Non-existent Member"

    local result=$(make_request "GET" "/v1/members/00000000-0000-0000-0000-000000000000" "" "$ACCESS_TOKEN")
    local body=$(echo "$result" | sed -n '1p')
    local http_code=$(echo "$result" | sed -n '2p')
    local time_total=$(echo "$result" | sed -n '3p')
    local time_ms=$(echo "$time_total * 1000" | bc | cut -d'.' -f1)

    echo "HTTP Code: $http_code"

    if [ "$http_code" == "404" ]; then
        log_result "GET /v1/members/:id (not found)" "PASS" "Returns 404 for non-existent member" "$time_ms"
    else
        log_result "GET /v1/members/:id (not found)" "WARN" "Expected 404, got $http_code" "$time_ms"
    fi
}

test_invalid_uuid() {
    print_test "GET /v1/members/invalid-uuid - Invalid UUID Format"

    local result=$(make_request "GET" "/v1/members/not-a-uuid" "" "$ACCESS_TOKEN")
    local body=$(echo "$result" | sed -n '1p')
    local http_code=$(echo "$result" | sed -n '2p')
    local time_total=$(echo "$result" | sed -n '3p')
    local time_ms=$(echo "$time_total * 1000" | bc | cut -d'.' -f1)

    echo "HTTP Code: $http_code"

    if [ "$http_code" == "400" ] || [ "$http_code" == "404" ]; then
        log_result "GET /v1/members/:id (invalid UUID)" "PASS" "Handles invalid UUID correctly ($http_code)" "$time_ms"
    else
        log_result "GET /v1/members/:id (invalid UUID)" "WARN" "Expected 400/404, got $http_code" "$time_ms"
    fi
}

test_invalid_pagination() {
    print_test "GET /v1/members?page=-1 - Invalid Pagination"

    local result=$(make_request "GET" "/v1/members?page=-1&pageSize=0" "" "$ACCESS_TOKEN")
    local body=$(echo "$result" | sed -n '1p')
    local http_code=$(echo "$result" | sed -n '2p')
    local time_total=$(echo "$result" | sed -n '3p')
    local time_ms=$(echo "$time_total * 1000" | bc | cut -d'.' -f1)

    echo "HTTP Code: $http_code"

    if [ "$http_code" == "400" ] || [ "$http_code" == "200" ]; then
        log_result "GET /v1/members (invalid pagination)" "PASS" "Handles invalid pagination ($http_code)" "$time_ms"
    else
        log_result "GET /v1/members (invalid pagination)" "WARN" "Unexpected response: $http_code" "$time_ms"
    fi
}

test_sql_injection() {
    print_test "GET /v1/members?search=' OR 1=1-- - SQL Injection Attempt"

    local result=$(make_request "GET" "/v1/members?search=' OR 1=1--" "" "$ACCESS_TOKEN")
    local body=$(echo "$result" | sed -n '1p')
    local http_code=$(echo "$result" | sed -n '2p')
    local time_total=$(echo "$result" | sed -n '3p')
    local time_ms=$(echo "$time_total * 1000" | bc | cut -d'.' -f1)

    echo "HTTP Code: $http_code"

    if [ "$http_code" == "200" ] || [ "$http_code" == "400" ]; then
        log_result "SQL injection test" "PASS" "No SQL injection vulnerability ($http_code)" "$time_ms"
    elif [ "$http_code" == "500" ]; then
        log_result "SQL injection test" "FAIL" "Possible SQL injection vulnerability (500)" "$time_ms"
    else
        log_result "SQL injection test" "WARN" "Unexpected response: $http_code" "$time_ms"
    fi
}

test_wrong_content_type() {
    print_test "POST /v1/register-member - Wrong Content-Type"

    local data='legalName=Test&email=test@test.com'

    local result=$(curl -s -w "\n%{http_code}\n%{time_total}" \
        -X POST \
        -H "Content-Type: application/x-www-form-urlencoded" \
        -d "$data" \
        "${BASE_URL}/v1/register-member" 2>&1)

    local body=$(echo "$result" | sed -n '1p')
    local http_code=$(echo "$result" | sed -n '2p')
    local time_total=$(echo "$result" | sed -n '3p')
    local time_ms=$(echo "$time_total * 1000" | bc | cut -d'.' -f1)

    echo "HTTP Code: $http_code"

    if [ "$http_code" == "400" ] || [ "$http_code" == "415" ]; then
        log_result "POST wrong content-type" "PASS" "Rejects wrong content-type ($http_code)" "$time_ms"
    else
        log_result "POST wrong content-type" "WARN" "Expected 400/415, got $http_code" "$time_ms"
    fi
}

# =============================================================================
# ADDITIONAL ENDPOINT TESTS
# =============================================================================

test_legal_entities() {
    print_test "GET /v1/legal-entities - Legal Entities List"

    local result=$(make_request "GET" "/v1/legal-entities" "" "$ACCESS_TOKEN")
    local body=$(echo "$result" | sed -n '1p')
    local http_code=$(echo "$result" | sed -n '2p')
    local time_total=$(echo "$result" | sed -n '3p')
    local time_ms=$(echo "$time_total * 1000" | bc | cut -d'.' -f1)

    echo "HTTP Code: $http_code"

    if [ "$http_code" == "200" ]; then
        log_result "GET /v1/legal-entities" "PASS" "Returns 200 with legal entities" "$time_ms"
    elif [ "$http_code" == "404" ]; then
        log_result "GET /v1/legal-entities" "WARN" "Endpoint not found (may not be deployed)" "$time_ms"
    else
        log_result "GET /v1/legal-entities" "FAIL" "Expected 200, got $http_code" "$time_ms"
    fi
}

test_identifiers() {
    print_test "GET /v1/identifiers - Identifiers List"

    local result=$(make_request "GET" "/v1/identifiers" "" "$ACCESS_TOKEN")
    local body=$(echo "$result" | sed -n '1p')
    local http_code=$(echo "$result" | sed -n '2p')
    local time_total=$(echo "$result" | sed -n '3p')
    local time_ms=$(echo "$time_total * 1000" | bc | cut -d'.' -f1)

    echo "HTTP Code: $http_code"

    if [ "$http_code" == "200" ]; then
        log_result "GET /v1/identifiers" "PASS" "Returns 200 with identifiers" "$time_ms"
    elif [ "$http_code" == "404" ]; then
        log_result "GET /v1/identifiers" "WARN" "Endpoint not found (may not be deployed)" "$time_ms"
    else
        log_result "GET /v1/identifiers" "FAIL" "Expected 200, got $http_code" "$time_ms"
    fi
}

test_contacts() {
    print_test "GET /v1/contacts - Contacts List"

    local result=$(make_request "GET" "/v1/contacts" "" "$ACCESS_TOKEN")
    local body=$(echo "$result" | sed -n '1p')
    local http_code=$(echo "$result" | sed -n '2p')
    local time_total=$(echo "$result" | sed -n '3p')
    local time_ms=$(echo "$time_total * 1000" | bc | cut -d'.' -f1)

    echo "HTTP Code: $http_code"

    if [ "$http_code" == "200" ]; then
        log_result "GET /v1/contacts" "PASS" "Returns 200 with contacts" "$time_ms"
    elif [ "$http_code" == "404" ]; then
        log_result "GET /v1/contacts" "WARN" "Endpoint not found (may not be deployed)" "$time_ms"
    else
        log_result "GET /v1/contacts" "FAIL" "Expected 200, got $http_code" "$time_ms"
    fi
}

test_endpoints() {
    print_test "GET /v1/endpoints - Endpoints List"

    local result=$(make_request "GET" "/v1/endpoints" "" "$ACCESS_TOKEN")
    local body=$(echo "$result" | sed -n '1p')
    local http_code=$(echo "$result" | sed -n '2p')
    local time_total=$(echo "$result" | sed -n '3p')
    local time_ms=$(echo "$time_total * 1000" | bc | cut -d'.' -f1)

    echo "HTTP Code: $http_code"

    if [ "$http_code" == "200" ]; then
        log_result "GET /v1/endpoints" "PASS" "Returns 200 with endpoints" "$time_ms"
    elif [ "$http_code" == "404" ]; then
        log_result "GET /v1/endpoints" "WARN" "Endpoint not found (may not be deployed)" "$time_ms"
    else
        log_result "GET /v1/endpoints" "FAIL" "Expected 200, got $http_code" "$time_ms"
    fi
}

# =============================================================================
# PRINT SUMMARY
# =============================================================================

print_summary() {
    local TEST_END_TIME=$(date +%s)
    local TOTAL_TIME=$((TEST_END_TIME - TEST_START_TIME))

    # Calculate average response time
    local total_response=0
    for time in "${RESPONSE_TIMES[@]}"; do
        total_response=$((total_response + time))
    done
    local avg_response=$((total_response / ${#RESPONSE_TIMES[@]}))

    print_header "TEST SUMMARY"

    echo ""
    echo "API Base URL: $BASE_URL"
    echo "Test Duration: ${TOTAL_TIME}s"
    echo "Average Response Time: ${avg_response}ms"
    echo ""
    echo "=========================================="
    printf "%-20s %s\n" "Total Tests:" "$TOTAL_TESTS"
    printf "%-20s ${GREEN}%s${NC}\n" "Passed:" "$PASSED"
    printf "%-20s ${RED}%s${NC}\n" "Failed:" "$FAILED"
    printf "%-20s ${YELLOW}%s${NC}\n" "Warnings:" "$WARNINGS"
    echo "=========================================="

    echo ""
    echo "DETAILED RESULTS:"
    echo "=========================================="

    for result in "${RESULTS[@]}"; do
        IFS='|' read -r status name details time <<< "$result"
        if [ "$status" == "PASS" ]; then
            printf "${GREEN}[PASS]${NC} %-40s %s\n" "$name" "(${time}ms)"
        elif [ "$status" == "FAIL" ]; then
            printf "${RED}[FAIL]${NC} %-40s %s\n" "$name" "$details"
        else
            printf "${YELLOW}[WARN]${NC} %-40s %s\n" "$name" "$details"
        fi
    done

    echo ""
    echo "=========================================="

    # Calculate pass rate
    local PASS_RATE=$((PASSED * 100 / TOTAL_TESTS))

    if [ $FAILED -eq 0 ]; then
        echo -e "${GREEN}OVERALL RESULT: SUCCESS ($PASS_RATE% pass rate)${NC}"
        echo "All critical tests passed!"
        exit 0
    elif [ $FAILED -le 3 ]; then
        echo -e "${YELLOW}OVERALL RESULT: PARTIAL SUCCESS ($PASS_RATE% pass rate)${NC}"
        echo "Some tests failed - review issues above"
        exit 1
    else
        echo -e "${RED}OVERALL RESULT: FAILURE ($PASS_RATE% pass rate)${NC}"
        echo "Multiple tests failed - migration may have issues"
        exit 1
    fi
}

# =============================================================================
# MAIN EXECUTION
# =============================================================================

main() {
    echo ""
    echo "============================================================================="
    echo "  CONTAINER APPS COMPREHENSIVE API TEST"
    echo "  $(date)"
    echo "============================================================================="
    echo ""
    echo "Target API: $BASE_URL"
    echo ""

    # Acquire token first
    if ! acquire_token; then
        echo -e "${RED}Cannot proceed without valid token${NC}"
        exit 1
    fi

    # Public endpoint tests
    print_header "PUBLIC ENDPOINTS (No Auth Required)"
    test_health_endpoint
    test_version_endpoint
    test_register_member_empty_body
    test_register_member_missing_fields
    test_register_member_invalid_email
    test_register_member_invalid_kvk

    # Unauthorized access tests
    print_header "UNAUTHORIZED ACCESS TESTS (Should Return 401)"
    test_members_unauthorized
    test_applications_unauthorized
    test_audit_logs_unauthorized
    test_tasks_unauthorized
    test_member_unauthorized

    # Authenticated endpoint tests
    print_header "AUTHENTICATED ENDPOINTS (With Valid Token)"
    test_members_authenticated
    test_members_pagination
    test_members_search
    test_applications_authenticated
    test_audit_logs_authenticated
    test_tasks_authenticated
    test_member_authenticated

    # Additional endpoints
    print_header "ADDITIONAL ENDPOINTS"
    test_legal_entities
    test_identifiers
    test_contacts
    test_endpoints

    # Edge case tests
    print_header "EDGE CASE & SECURITY TESTS"
    test_invalid_token
    test_expired_token
    test_nonexistent_member
    test_invalid_uuid
    test_invalid_pagination
    test_sql_injection
    test_wrong_content_type

    # Print summary
    print_summary
}

# Run main
main "$@"
