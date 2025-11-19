#!/bin/bash

# ======================================================
# EUID Auto-Generation API Test
# ======================================================
# Tests the automatic generation of EUID identifiers
# when KvK numbers are added or updated.
#
# Prerequisites:
# - Azure Functions API running
# - Valid access token
# - Test legal entity created
#
# Usage:
#   ./euid-generation-test.sh [API_BASE_URL] [AUTH_TOKEN]
#
# Example:
#   ./euid-generation-test.sh https://func-ctn-demo-asr-dev.azurewebsites.net/api/v1 eyJ0eXAi...
# ======================================================

set -e

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Configuration
API_BASE_URL="${1:-http://localhost:7071/api/v1}"
AUTH_TOKEN="${2}"

if [ -z "$AUTH_TOKEN" ]; then
  echo -e "${RED}Error: AUTH_TOKEN is required${NC}"
  echo "Usage: $0 [API_BASE_URL] [AUTH_TOKEN]"
  exit 1
fi

echo -e "${GREEN}======================================${NC}"
echo -e "${GREEN}EUID Auto-Generation API Test${NC}"
echo -e "${GREEN}======================================${NC}"
echo ""
echo "API Base URL: $API_BASE_URL"
echo ""

# Test data
TEST_LEGAL_ENTITY_ID=""
TEST_KVK_NUMBER="12345678"
TEST_EUID_EXPECTED="NL.KVK.12345678"
KVK_IDENTIFIER_ID=""
EUID_IDENTIFIER_ID=""

# ======================================================
# Helper Functions
# ======================================================

print_test() {
  echo -e "\n${YELLOW}TEST:${NC} $1"
}

print_success() {
  echo -e "${GREEN}✓ PASS:${NC} $1"
}

print_error() {
  echo -e "${RED}✗ FAIL:${NC} $1"
  exit 1
}

# ======================================================
# Test 1: Create Test Legal Entity
# ======================================================

print_test "Create test legal entity"

RESPONSE=$(curl -s -X POST "$API_BASE_URL/legal-entities" \
  -H "Authorization: Bearer $AUTH_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "primary_legal_name": "Test Company for EUID Generation",
    "domain": "test-euid-company.example.com",
    "country_code": "NL",
    "status": "ACTIVE"
  }')

TEST_LEGAL_ENTITY_ID=$(echo "$RESPONSE" | jq -r '.legal_entity_id // .party_id // empty')

if [ -z "$TEST_LEGAL_ENTITY_ID" ]; then
  print_error "Failed to create test legal entity. Response: $RESPONSE"
fi

print_success "Test legal entity created: $TEST_LEGAL_ENTITY_ID"

# ======================================================
# Test 2: Add KvK Identifier (Should Auto-Generate EUID)
# ======================================================

print_test "Add KvK identifier (should auto-generate EUID)"

RESPONSE=$(curl -s -X POST "$API_BASE_URL/entities/$TEST_LEGAL_ENTITY_ID/identifiers" \
  -H "Authorization: Bearer $AUTH_TOKEN" \
  -H "Content-Type: application/json" \
  -d "{
    \"identifier_type\": \"KVK\",
    \"identifier_value\": \"$TEST_KVK_NUMBER\",
    \"country_code\": \"NL\",
    \"registry_name\": \"Dutch Chamber of Commerce\",
    \"validation_status\": \"PENDING\"
  }")

KVK_IDENTIFIER_ID=$(echo "$RESPONSE" | jq -r '.legal_entity_reference_id // empty')
EUID_AUTO_GENERATED=$(echo "$RESPONSE" | jq -r '.euid_auto_generated // false')

if [ -z "$KVK_IDENTIFIER_ID" ]; then
  print_error "Failed to create KvK identifier. Response: $RESPONSE"
fi

print_success "KvK identifier created: $KVK_IDENTIFIER_ID"

if [ "$EUID_AUTO_GENERATED" = "true" ]; then
  print_success "EUID auto-generation flag is true"
else
  echo -e "${YELLOW}WARNING:${NC} EUID auto-generation flag not set (may still be generated)"
fi

# ======================================================
# Test 3: Verify EUID Was Auto-Generated
# ======================================================

print_test "Verify EUID was automatically generated"

# Wait a moment for async processing
sleep 2

RESPONSE=$(curl -s -X GET "$API_BASE_URL/entities/$TEST_LEGAL_ENTITY_ID/identifiers" \
  -H "Authorization: Bearer $AUTH_TOKEN")

# Extract identifiers array
IDENTIFIERS=$(echo "$RESPONSE" | jq -r '.data // .identifiers // empty')

if [ -z "$IDENTIFIERS" ]; then
  print_error "Failed to retrieve identifiers. Response: $RESPONSE"
fi

# Check for EUID identifier
EUID_FOUND=$(echo "$IDENTIFIERS" | jq -r ".[] | select(.identifier_type == \"EUID\")")

if [ -z "$EUID_FOUND" ]; then
  print_error "EUID was not auto-generated"
fi

EUID_VALUE=$(echo "$EUID_FOUND" | jq -r '.identifier_value')
EUID_IDENTIFIER_ID=$(echo "$EUID_FOUND" | jq -r '.legal_entity_reference_id')

if [ "$EUID_VALUE" != "$TEST_EUID_EXPECTED" ]; then
  print_error "EUID value mismatch. Expected: $TEST_EUID_EXPECTED, Got: $EUID_VALUE"
fi

print_success "EUID auto-generated with correct value: $EUID_VALUE"
print_success "EUID identifier ID: $EUID_IDENTIFIER_ID"

# Verify EUID properties
EUID_COUNTRY=$(echo "$EUID_FOUND" | jq -r '.country_code')
EUID_STATUS=$(echo "$EUID_FOUND" | jq -r '.validation_status')
EUID_NOTES=$(echo "$EUID_FOUND" | jq -r '.verification_notes')

if [ "$EUID_COUNTRY" != "NL" ]; then
  print_error "EUID country code mismatch. Expected: NL, Got: $EUID_COUNTRY"
fi

print_success "EUID country code is correct: $EUID_COUNTRY"

if [ "$EUID_STATUS" = "VALIDATED" ]; then
  print_success "EUID validation status is VALIDATED"
fi

if [[ "$EUID_NOTES" == *"Auto-generated from KVK"* ]]; then
  print_success "EUID has auto-generation note: $EUID_NOTES"
fi

# ======================================================
# Test 4: Update KvK Number (Should Update EUID)
# ======================================================

print_test "Update KvK number (should update EUID)"

NEW_KVK_NUMBER="87654321"
NEW_EUID_EXPECTED="NL.KVK.87654321"

RESPONSE=$(curl -s -X PUT "$API_BASE_URL/identifiers/$KVK_IDENTIFIER_ID" \
  -H "Authorization: Bearer $AUTH_TOKEN" \
  -H "Content-Type: application/json" \
  -d "{
    \"identifier_value\": \"$NEW_KVK_NUMBER\"
  }")

EUID_AUTO_UPDATED=$(echo "$RESPONSE" | jq -r '.euid_auto_updated // false')

print_success "KvK identifier updated to: $NEW_KVK_NUMBER"

if [ "$EUID_AUTO_UPDATED" = "true" ]; then
  print_success "EUID auto-update flag is true"
fi

# Verify EUID was updated
sleep 2

RESPONSE=$(curl -s -X GET "$API_BASE_URL/entities/$TEST_LEGAL_ENTITY_ID/identifiers" \
  -H "Authorization: Bearer $AUTH_TOKEN")

IDENTIFIERS=$(echo "$RESPONSE" | jq -r '.data // .identifiers // empty')
EUID_FOUND=$(echo "$IDENTIFIERS" | jq -r ".[] | select(.identifier_type == \"EUID\")")
EUID_VALUE=$(echo "$EUID_FOUND" | jq -r '.identifier_value')

if [ "$EUID_VALUE" != "$NEW_EUID_EXPECTED" ]; then
  print_error "EUID was not updated. Expected: $NEW_EUID_EXPECTED, Got: $EUID_VALUE"
fi

print_success "EUID automatically updated to: $EUID_VALUE"

# ======================================================
# Test 5: Manual EUID Generation Endpoint
# ======================================================

print_test "Test manual EUID generation endpoint"

# Delete the EUID first
curl -s -X DELETE "$API_BASE_URL/identifiers/$EUID_IDENTIFIER_ID" \
  -H "Authorization: Bearer $AUTH_TOKEN" > /dev/null

sleep 1

# Use the manual generation endpoint
RESPONSE=$(curl -s -X POST "$API_BASE_URL/entities/$TEST_LEGAL_ENTITY_ID/identifiers/generate-euid" \
  -H "Authorization: Bearer $AUTH_TOKEN" \
  -H "Content-Type: application/json" \
  -d "{
    \"identifier_type\": \"KVK\",
    \"identifier_value\": \"$NEW_KVK_NUMBER\"
  }")

GENERATED_EUID=$(echo "$RESPONSE" | jq -r '.euid_value // empty')
WAS_CREATED=$(echo "$RESPONSE" | jq -r '.was_created // false')

if [ "$GENERATED_EUID" != "$NEW_EUID_EXPECTED" ]; then
  print_error "Manual EUID generation failed. Expected: $NEW_EUID_EXPECTED, Got: $GENERATED_EUID"
fi

if [ "$WAS_CREATED" != "true" ]; then
  print_error "Manual EUID was not created (was_created flag is false)"
fi

print_success "Manual EUID generation successful: $GENERATED_EUID"

# ======================================================
# Test 6: Idempotency Check
# ======================================================

print_test "Test idempotency (calling again should not create duplicate)"

RESPONSE=$(curl -s -X POST "$API_BASE_URL/entities/$TEST_LEGAL_ENTITY_ID/identifiers/generate-euid" \
  -H "Authorization: Bearer $AUTH_TOKEN" \
  -H "Content-Type: application/json" \
  -d "{
    \"identifier_type\": \"KVK\",
    \"identifier_value\": \"$NEW_KVK_NUMBER\"
  }")

WAS_CREATED=$(echo "$RESPONSE" | jq -r '.was_created // false')
WAS_UPDATED=$(echo "$RESPONSE" | jq -r '.was_updated // false')

if [ "$WAS_CREATED" = "true" ]; then
  print_error "Idempotency check failed: Duplicate EUID was created"
fi

if [ "$WAS_UPDATED" = "false" ] && [ "$WAS_CREATED" = "false" ]; then
  print_success "Idempotency check passed: No duplicate created"
fi

# ======================================================
# Cleanup
# ======================================================

print_test "Cleanup test data"

# Delete KvK identifier
curl -s -X DELETE "$API_BASE_URL/identifiers/$KVK_IDENTIFIER_ID" \
  -H "Authorization: Bearer $AUTH_TOKEN" > /dev/null

# Delete EUID identifier
NEW_EUID_ID=$(echo "$RESPONSE" | jq -r '.identifier_id // empty')
if [ -n "$NEW_EUID_ID" ]; then
  curl -s -X DELETE "$API_BASE_URL/identifiers/$NEW_EUID_ID" \
    -H "Authorization: Bearer $AUTH_TOKEN" > /dev/null
fi

# Delete test legal entity
curl -s -X DELETE "$API_BASE_URL/legal-entities/$TEST_LEGAL_ENTITY_ID" \
  -H "Authorization: Bearer $AUTH_TOKEN" > /dev/null

print_success "Cleanup completed"

# ======================================================
# Summary
# ======================================================

echo ""
echo -e "${GREEN}======================================${NC}"
echo -e "${GREEN}All tests passed! ✓${NC}"
echo -e "${GREEN}======================================${NC}"
echo ""
echo "Summary:"
echo "  ✓ KvK identifier creation triggers EUID auto-generation"
echo "  ✓ EUID format is correct (NL.KVK.{number})"
echo "  ✓ EUID properties are correctly set"
echo "  ✓ KvK update triggers EUID auto-update"
echo "  ✓ Manual EUID generation endpoint works"
echo "  ✓ Idempotency is maintained (no duplicates)"
echo ""
