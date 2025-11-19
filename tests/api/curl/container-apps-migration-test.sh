#!/bin/bash

# =============================================================================
# Container Apps Migration Test Script
# =============================================================================
# Tests API endpoints after migration from Azure Functions to Container Apps
#
# Old URL: https://func-ctn-demo-asr-dev.azurewebsites.net/api
# New URL: https://ca-ctn-asr-api-dev.calmriver-700a8c55.westeurope.azurecontainerapps.io/api
# =============================================================================

set -e

# Configuration
NEW_BASE_URL="https://ca-ctn-asr-api-dev.calmriver-700a8c55.westeurope.azurecontainerapps.io/api"
OLD_BASE_URL="https://func-ctn-demo-asr-dev.azurewebsites.net/api"

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Counters
PASSED=0
FAILED=0
WARNINGS=0

# Results array
declare -a RESULTS

# =============================================================================
# Helper Functions
# =============================================================================

print_header() {
    echo ""
    echo "============================================================================="
    echo -e "${BLUE}$1${NC}"
    echo "============================================================================="
}

print_test() {
    echo -e "\n${YELLOW}TEST:${NC} $1"
}

log_result() {
    local test_name="$1"
    local status="$2"
    local details="$3"

    if [ "$status" == "PASS" ]; then
        echo -e "${GREEN}[PASS]${NC} $test_name"
        ((PASSED++))
        RESULTS+=("PASS|$test_name|$details")
    elif [ "$status" == "FAIL" ]; then
        echo -e "${RED}[FAIL]${NC} $test_name"
        echo -e "       ${RED}Details: $details${NC}"
        ((FAILED++))
        RESULTS+=("FAIL|$test_name|$details")
    else
        echo -e "${YELLOW}[WARN]${NC} $test_name"
        echo -e "       ${YELLOW}Details: $details${NC}"
        ((WARNINGS++))
        RESULTS+=("WARN|$test_name|$details")
    fi
}

# =============================================================================
# Test Functions
# =============================================================================

test_health_endpoint() {
    print_test "GET /health - Health Check"

    response=$(curl -s -w "\n%{http_code}" "${NEW_BASE_URL}/health" 2>&1)
    http_code=$(echo "$response" | tail -n1)
    body=$(echo "$response" | sed '$d')

    echo "Response Code: $http_code"
    echo "Response Body: $body"

    if [ "$http_code" == "200" ]; then
        # Check if response contains expected health data
        if echo "$body" | grep -q "status"; then
            log_result "Health endpoint" "PASS" "Returns 200 with status information"
        else
            log_result "Health endpoint" "PASS" "Returns 200 but response format may differ"
        fi
    else
        log_result "Health endpoint" "FAIL" "Expected 200, got $http_code"
    fi
}

test_version_endpoint() {
    print_test "GET /v1/version - API Version Info"

    response=$(curl -s -w "\n%{http_code}" "${NEW_BASE_URL}/v1/version" 2>&1)
    http_code=$(echo "$response" | tail -n1)
    body=$(echo "$response" | sed '$d')

    echo "Response Code: $http_code"
    echo "Response Body: $body"

    if [ "$http_code" == "200" ]; then
        log_result "Version endpoint" "PASS" "Returns 200 with version info"
    elif [ "$http_code" == "404" ]; then
        log_result "Version endpoint" "FAIL" "Endpoint not found (404) - may not be registered"
    else
        log_result "Version endpoint" "FAIL" "Expected 200, got $http_code"
    fi
}

test_register_member_validation() {
    print_test "POST /v1/register-member - Validation Test (incomplete data)"

    # Send incomplete data to test validation
    response=$(curl -s -w "\n%{http_code}" \
        -X POST \
        -H "Content-Type: application/json" \
        -d '{"incomplete": "data"}' \
        "${NEW_BASE_URL}/v1/register-member" 2>&1)

    http_code=$(echo "$response" | tail -n1)
    body=$(echo "$response" | sed '$d')

    echo "Response Code: $http_code"
    echo "Response Body: $body"

    # We expect 400 (Bad Request) for invalid data
    if [ "$http_code" == "400" ]; then
        log_result "Register member validation" "PASS" "Correctly returns 400 for invalid data"
    elif [ "$http_code" == "404" ]; then
        log_result "Register member validation" "FAIL" "Endpoint not found (404)"
    elif [ "$http_code" == "500" ]; then
        log_result "Register member validation" "FAIL" "Server error (500) - check logs"
    else
        log_result "Register member validation" "WARN" "Got $http_code - expected 400 for validation error"
    fi
}

test_members_unauthorized() {
    print_test "GET /v1/members - Unauthorized Access Test"

    response=$(curl -s -w "\n%{http_code}" "${NEW_BASE_URL}/v1/members" 2>&1)
    http_code=$(echo "$response" | tail -n1)
    body=$(echo "$response" | sed '$d')

    echo "Response Code: $http_code"
    echo "Response Body: $body"

    if [ "$http_code" == "401" ]; then
        log_result "Members unauthorized" "PASS" "Correctly returns 401 without token"
    elif [ "$http_code" == "404" ]; then
        log_result "Members unauthorized" "FAIL" "Endpoint not found (404)"
    else
        log_result "Members unauthorized" "FAIL" "Expected 401, got $http_code"
    fi
}

test_applications_unauthorized() {
    print_test "GET /v1/applications - Unauthorized Access Test"

    response=$(curl -s -w "\n%{http_code}" "${NEW_BASE_URL}/v1/applications" 2>&1)
    http_code=$(echo "$response" | tail -n1)
    body=$(echo "$response" | sed '$d')

    echo "Response Code: $http_code"
    echo "Response Body: $body"

    if [ "$http_code" == "401" ]; then
        log_result "Applications unauthorized" "PASS" "Correctly returns 401 without token"
    elif [ "$http_code" == "404" ]; then
        log_result "Applications unauthorized" "FAIL" "Endpoint not found (404)"
    else
        log_result "Applications unauthorized" "FAIL" "Expected 401, got $http_code"
    fi
}

test_audit_logs_unauthorized() {
    print_test "GET /v1/audit-logs - Unauthorized Access Test"

    response=$(curl -s -w "\n%{http_code}" "${NEW_BASE_URL}/v1/audit-logs" 2>&1)
    http_code=$(echo "$response" | tail -n1)
    body=$(echo "$response" | sed '$d')

    echo "Response Code: $http_code"
    echo "Response Body: $body"

    if [ "$http_code" == "401" ]; then
        log_result "Audit logs unauthorized" "PASS" "Correctly returns 401 without token"
    elif [ "$http_code" == "404" ]; then
        log_result "Audit logs unauthorized" "FAIL" "Endpoint not found (404)"
    else
        log_result "Audit logs unauthorized" "FAIL" "Expected 401, got $http_code"
    fi
}

test_tasks_unauthorized() {
    print_test "GET /v1/tasks - Unauthorized Access Test"

    response=$(curl -s -w "\n%{http_code}" "${NEW_BASE_URL}/v1/tasks" 2>&1)
    http_code=$(echo "$response" | tail -n1)
    body=$(echo "$response" | sed '$d')

    echo "Response Code: $http_code"
    echo "Response Body: $body"

    if [ "$http_code" == "401" ]; then
        log_result "Tasks unauthorized" "PASS" "Correctly returns 401 without token"
    elif [ "$http_code" == "404" ]; then
        log_result "Tasks unauthorized" "FAIL" "Endpoint not found (404)"
    else
        log_result "Tasks unauthorized" "FAIL" "Expected 401, got $http_code"
    fi
}

test_member_unauthorized() {
    print_test "GET /v1/member - Unauthorized Access Test"

    response=$(curl -s -w "\n%{http_code}" "${NEW_BASE_URL}/v1/member" 2>&1)
    http_code=$(echo "$response" | tail -n1)
    body=$(echo "$response" | sed '$d')

    echo "Response Code: $http_code"
    echo "Response Body: $body"

    if [ "$http_code" == "401" ]; then
        log_result "Member (self) unauthorized" "PASS" "Correctly returns 401 without token"
    elif [ "$http_code" == "404" ]; then
        log_result "Member (self) unauthorized" "FAIL" "Endpoint not found (404)"
    else
        log_result "Member (self) unauthorized" "FAIL" "Expected 401, got $http_code"
    fi
}

# =============================================================================
# Additional Connectivity Tests
# =============================================================================

test_dns_resolution() {
    print_test "DNS Resolution Test"

    host="ca-ctn-asr-api-dev.calmriver-700a8c55.westeurope.azurecontainerapps.io"
    if nslookup "$host" > /dev/null 2>&1; then
        log_result "DNS resolution" "PASS" "Host resolves correctly"
    else
        log_result "DNS resolution" "FAIL" "Cannot resolve $host"
    fi
}

test_ssl_certificate() {
    print_test "SSL Certificate Test"

    host="ca-ctn-asr-api-dev.calmriver-700a8c55.westeurope.azurecontainerapps.io"
    if curl -s --head "https://$host" > /dev/null 2>&1; then
        log_result "SSL certificate" "PASS" "Valid SSL certificate"
    else
        log_result "SSL certificate" "FAIL" "SSL certificate issue"
    fi
}

test_response_time() {
    print_test "Response Time Test"

    time_total=$(curl -s -o /dev/null -w "%{time_total}" "${NEW_BASE_URL}/health" 2>&1)

    # Convert to milliseconds
    time_ms=$(echo "$time_total * 1000" | bc)

    echo "Response time: ${time_ms}ms"

    if (( $(echo "$time_total < 3" | bc -l) )); then
        log_result "Response time" "PASS" "Health endpoint responds in ${time_ms}ms"
    else
        log_result "Response time" "WARN" "Slow response: ${time_ms}ms (>3s)"
    fi
}

# =============================================================================
# Compare with Old API (if still available)
# =============================================================================

compare_with_old_api() {
    print_header "COMPARISON WITH OLD API (Azure Functions)"

    print_test "Checking if old API is still available..."

    old_response=$(curl -s -w "\n%{http_code}" "${OLD_BASE_URL}/health" 2>&1)
    old_http_code=$(echo "$old_response" | tail -n1)

    if [ "$old_http_code" == "200" ]; then
        echo -e "${YELLOW}Note:${NC} Old API at Azure Functions is still responding"
        echo "Old API health: $old_http_code"
    else
        echo "Old API not responding (expected after migration)"
    fi
}

# =============================================================================
# Print Summary
# =============================================================================

print_summary() {
    print_header "TEST SUMMARY"

    echo ""
    echo "New API Base URL: $NEW_BASE_URL"
    echo ""
    echo "----------------------------------------"
    printf "%-20s %s\n" "Total Tests:" "$((PASSED + FAILED + WARNINGS))"
    printf "%-20s ${GREEN}%s${NC}\n" "Passed:" "$PASSED"
    printf "%-20s ${RED}%s${NC}\n" "Failed:" "$FAILED"
    printf "%-20s ${YELLOW}%s${NC}\n" "Warnings:" "$WARNINGS"
    echo "----------------------------------------"

    echo ""
    echo "DETAILED RESULTS:"
    echo "----------------------------------------"

    for result in "${RESULTS[@]}"; do
        IFS='|' read -r status name details <<< "$result"
        if [ "$status" == "PASS" ]; then
            printf "${GREEN}[PASS]${NC} %s\n" "$name"
        elif [ "$status" == "FAIL" ]; then
            printf "${RED}[FAIL]${NC} %s - %s\n" "$name" "$details"
        else
            printf "${YELLOW}[WARN]${NC} %s - %s\n" "$name" "$details"
        fi
    done

    echo ""
    echo "----------------------------------------"

    if [ $FAILED -eq 0 ]; then
        echo -e "${GREEN}MIGRATION TEST: SUCCESS${NC}"
        echo "All critical tests passed!"
        exit 0
    else
        echo -e "${RED}MIGRATION TEST: ISSUES FOUND${NC}"
        echo "Please review failed tests above"
        exit 1
    fi
}

# =============================================================================
# Main Execution
# =============================================================================

main() {
    echo ""
    echo "============================================================================="
    echo "  CONTAINER APPS MIGRATION TEST"
    echo "  $(date)"
    echo "============================================================================="

    # Connectivity tests
    print_header "CONNECTIVITY TESTS"
    test_dns_resolution
    test_ssl_certificate
    test_response_time

    # Public endpoint tests
    print_header "PUBLIC ENDPOINTS (No Auth Required)"
    test_health_endpoint
    test_version_endpoint
    test_register_member_validation

    # Protected endpoint tests (401 expected)
    print_header "PROTECTED ENDPOINTS (Should Return 401)"
    test_members_unauthorized
    test_applications_unauthorized
    test_audit_logs_unauthorized
    test_tasks_unauthorized
    test_member_unauthorized

    # Compare with old API
    compare_with_old_api

    # Print summary
    print_summary
}

# Run main
main "$@"
