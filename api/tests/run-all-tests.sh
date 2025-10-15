#!/bin/bash
# Run All API Tests
# Executes all API test scripts in sequence and reports results
#
# Usage:
#   export AUTH_TOKEN="your-azure-ad-token-here"
#   ./run-all-tests.sh
#
# Environment Variables:
#   AUTH_TOKEN - Azure AD bearer token (required)
#   API_URL - API base URL (optional, defaults to production)
#   ENTITY_ID - Legal entity ID to test with (optional, has default)

set -e  # Exit on first error

# Check auth token
if [ -z "$AUTH_TOKEN" ]; then
  echo "✗ Error: AUTH_TOKEN environment variable not set"
  echo "  Get token from Azure AD and export it:"
  echo "  export AUTH_TOKEN='your-token-here'"
  exit 1
fi

# Track results
TESTS_RUN=0
TESTS_PASSED=0
TESTS_FAILED=0
START_TIME=$(date +%s)

# Print header
echo "========================================"
echo "API Test Suite - Running All Tests"
echo "========================================"
echo "Started at: $(date)"
echo ""

# Test 1: Identifier CRUD
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "Running: Identifier CRUD Test"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo ""

TESTS_RUN=$((TESTS_RUN + 1))
if ./identifier-crud-test.sh; then
  TESTS_PASSED=$((TESTS_PASSED + 1))
  echo ""
  echo "✓ Identifier CRUD Test: PASSED"
else
  TESTS_FAILED=$((TESTS_FAILED + 1))
  echo ""
  echo "✗ Identifier CRUD Test: FAILED"
  echo ""
  echo "Stopping test suite due to failure."
  exit 1
fi

# Test 2: Contact CRUD
echo ""
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "Running: Contact CRUD Test"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo ""

TESTS_RUN=$((TESTS_RUN + 1))
if ./contact-crud-test.sh; then
  TESTS_PASSED=$((TESTS_PASSED + 1))
  echo ""
  echo "✓ Contact CRUD Test: PASSED"
else
  TESTS_FAILED=$((TESTS_FAILED + 1))
  echo ""
  echo "✗ Contact CRUD Test: FAILED"
  echo ""
  echo "Stopping test suite due to failure."
  exit 1
fi

# Test 3: Address Update
echo ""
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "Running: Address Update Test"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo ""

TESTS_RUN=$((TESTS_RUN + 1))
if ./address-update-test.sh; then
  TESTS_PASSED=$((TESTS_PASSED + 1))
  echo ""
  echo "✓ Address Update Test: PASSED"
else
  TESTS_FAILED=$((TESTS_FAILED + 1))
  echo ""
  echo "✗ Address Update Test: FAILED"
  echo ""
  echo "Stopping test suite due to failure."
  exit 1
fi

# Calculate duration
END_TIME=$(date +%s)
DURATION=$((END_TIME - START_TIME))

# Print final summary
echo ""
echo "========================================"
echo "Test Suite Summary"
echo "========================================"
echo "Completed at: $(date)"
echo "Duration: ${DURATION}s"
echo ""
echo "Tests Run:    $TESTS_RUN"
echo "Tests Passed: $TESTS_PASSED"
echo "Tests Failed: $TESTS_FAILED"
echo ""

if [ $TESTS_FAILED -eq 0 ]; then
  echo "✓✓✓ ALL TESTS PASSED ✓✓✓"
  echo ""
  echo "API is healthy and ready for UI testing!"
  exit 0
else
  echo "✗✗✗ SOME TESTS FAILED ✗✗✗"
  echo ""
  echo "Fix API issues before proceeding with UI testing."
  exit 1
fi
