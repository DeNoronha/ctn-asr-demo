#!/bin/bash

#############################################################################
# MASTER API TEST RUNNER - CTN DocuFlow
# Runs all API test suites and generates comprehensive report
#############################################################################

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
CYAN='\033[0;36m'
MAGENTA='\033[0;35m'
NC='\033[0m' # No Color

# Configuration
API_BASE_URL="${API_BASE_URL:-https://func-ctn-booking-prod.azurewebsites.net}"
ACCESS_TOKEN="${ACCESS_TOKEN:-}"
TEST_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"

# Results tracking
TOTAL_SUITES=0
SUITES_PASSED=0
SUITES_FAILED=0
START_TIME=$(date +%s)

echo -e "${MAGENTA}╔═════════════════════════════════════════════════════════════════════╗${NC}"
echo -e "${MAGENTA}║                 CTN DOCUFLOW - API TEST SUITE                       ║${NC}"
echo -e "${MAGENTA}║                    Comprehensive API Testing                        ║${NC}"
echo -e "${MAGENTA}╚═════════════════════════════════════════════════════════════════════╝${NC}"
echo ""
echo -e "${CYAN}Configuration:${NC}"
echo "  API Base URL: $API_BASE_URL"
echo "  Test Directory: $TEST_DIR"
echo "  Test Time: $(date '+%Y-%m-%d %H:%M:%S')"
if [ -z "$ACCESS_TOKEN" ]; then
    echo -e "  Authentication: ${YELLOW}NOT PROVIDED${NC}"
    echo -e "  ${YELLOW}⚠ Some tests will be skipped without authentication${NC}"
else
    echo -e "  Authentication: ${GREEN}PROVIDED${NC}"
fi
echo ""

# Function to run a test suite
run_test_suite() {
    local test_name="$1"
    local test_script="$2"

    echo -e "${BLUE}════════════════════════════════════════════════════════════════════${NC}"
    echo -e "${BLUE}Running: $test_name${NC}"
    echo -e "${BLUE}════════════════════════════════════════════════════════════════════${NC}"
    echo ""

    TOTAL_SUITES=$((TOTAL_SUITES + 1))

    # Run the test script
    if [ -f "$test_script" ]; then
        if bash "$test_script"; then
            echo ""
            echo -e "${GREEN}✓ $test_name PASSED${NC}"
            SUITES_PASSED=$((SUITES_PASSED + 1))
            return 0
        else
            echo ""
            echo -e "${RED}✗ $test_name FAILED${NC}"
            SUITES_FAILED=$((SUITES_FAILED + 1))
            return 1
        fi
    else
        echo -e "${RED}✗ Test script not found: $test_script${NC}"
        SUITES_FAILED=$((SUITES_FAILED + 1))
        return 1
    fi
}

echo -e "${CYAN}Starting test execution...${NC}"
echo ""
sleep 1

# Suite 1: Authentication Tests
run_test_suite "Authentication & Security Tests" "$TEST_DIR/auth-smoke-test.sh"
echo ""

# Suite 2: Diagnostics Tests
run_test_suite "API Diagnostics & Health Tests" "$TEST_DIR/api-diagnostics-test.sh"
echo ""

# Suite 3: Bookings API Tests
run_test_suite "Bookings API Tests" "$TEST_DIR/api-bookings-test.sh"
echo ""

# Suite 4: Upload API Tests
run_test_suite "Document Upload API Tests" "$TEST_DIR/api-upload-test.sh"
echo ""

# Suite 5: Validation API Tests
run_test_suite "Booking Validation API Tests" "$TEST_DIR/api-validation-test.sh"
echo ""

# Calculate duration
END_TIME=$(date +%s)
DURATION=$((END_TIME - START_TIME))
MINUTES=$((DURATION / 60))
SECONDS=$((DURATION % 60))

# Generate final report
echo -e "${MAGENTA}╔═════════════════════════════════════════════════════════════════════╗${NC}"
echo -e "${MAGENTA}║                     FINAL TEST REPORT                               ║${NC}"
echo -e "${MAGENTA}╚═════════════════════════════════════════════════════════════════════╝${NC}"
echo ""
echo -e "${CYAN}Test Execution Summary:${NC}"
echo "  Total Test Suites: $TOTAL_SUITES"
echo -e "  Suites Passed: ${GREEN}$SUITES_PASSED${NC}"
echo -e "  Suites Failed: ${RED}$SUITES_FAILED${NC}"
echo "  Duration: ${MINUTES}m ${SECONDS}s"
echo ""

# Overall result
SUCCESS_RATE=$(( (SUITES_PASSED * 100) / TOTAL_SUITES ))

echo -e "${CYAN}Overall Result:${NC}"
if [ $SUITES_FAILED -eq 0 ]; then
    echo -e "  ${GREEN}✓✓✓ ALL TEST SUITES PASSED ✓✓✓${NC}"
    echo -e "  ${GREEN}Success Rate: 100%${NC}"
    echo ""
    echo -e "${CYAN}API Status: ${GREEN}HEALTHY ✓${NC}"
    echo ""

    if [ -z "$ACCESS_TOKEN" ]; then
        echo -e "${YELLOW}Note: Full test coverage requires authentication${NC}"
        echo ""
        echo -e "${CYAN}To run authenticated tests:${NC}"
        echo "  export ACCESS_TOKEN='your_token'"
        echo "  ./run-all-api-tests.sh"
        echo ""
    fi

    exit 0
else
    echo -e "  ${RED}✗✗✗ SOME TEST SUITES FAILED ✗✗✗${NC}"
    echo -e "  ${YELLOW}Success Rate: $SUCCESS_RATE%${NC}"
    echo ""
    echo -e "${CYAN}Failed Suites: $SUITES_FAILED / $TOTAL_SUITES${NC}"
    echo ""

    echo -e "${YELLOW}Troubleshooting Steps:${NC}"
    echo "  1. Check Azure Function App deployment status"
    echo "     Portal: https://portal.azure.com"
    echo ""
    echo "  2. View live function logs:"
    echo "     func azure functionapp logstream func-ctn-booking-prod"
    echo ""
    echo "  3. Verify Azure resources:"
    echo "     - Function App: func-ctn-booking-prod"
    echo "     - Cosmos DB: cosmos-ctn-booking-prod"
    echo "     - Storage Account: stbookingprodieafkhcfkn4"
    echo ""
    echo "  4. Check recent deployments:"
    echo "     https://dev.azure.com/ctn-demo/ASR/_build"
    echo ""
    echo "  5. Verify environment variables in Function App settings"
    echo ""

    exit 1
fi
