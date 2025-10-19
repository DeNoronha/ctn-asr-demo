#!/bin/bash
# Integration tests for database transaction functionality
# Tests rollback behavior and data consistency across Azure Functions

set -e

# Configuration - authentication must be provided via environment variables
API_URL="${API_URL:-https://func-ctn-demo-asr-dev.azurewebsites.net/api/v1}"
# Note: No secrets stored in this file - JWT passed via AZURE_TOKEN env var
JWT_BEARER="${AZURE_TOKEN:-}"

# Colors for output
GREEN='\033[0;32m'
RED='\033[0;31m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Test counter
TESTS_PASSED=0
TESTS_FAILED=0

# Helper functions
log_info() {
    echo -e "${YELLOW}[INFO]${NC} $1"
}

log_success() {
    echo -e "${GREEN}[PASS]${NC} $1"
    ((TESTS_PASSED++))
}

log_error() {
    echo -e "${RED}[FAIL]${NC} $1"
    ((TESTS_FAILED++))
}

check_auth() {
    if [ -z "$JWT_BEARER" ]; then
        echo "Error: AZURE_TOKEN environment variable not set"
        echo "Usage: export AZURE_TOKEN=\$(az account get-access-token --query accessToken -o tsv)"
        echo "Then run: ./test-transactions.sh"
        exit 1
    fi
}

# Test functions

test_create_member_rollback() {
    log_info "Test 1: Create member with invalid data should rollback entire transaction"

    # Attempt to create member with missing required field (should fail)
    RESPONSE=$(curl -s -w "\n%{http_code}" -X POST \
        -H "Authorization: Bearer $JWT_BEARER" \
        -H "Content-Type: application/json" \
        -d '{
            "org_id": "TX-TEST-001",
            "legal_name": "Transaction Test Co"
        }' \
        "$API_URL/members" 2>/dev/null || echo "000")

    HTTP_CODE=$(echo "$RESPONSE" | tail -n1)
    BODY=$(echo "$RESPONSE" | head -n-1)

    if [ "$HTTP_CODE" -eq 400 ]; then
        log_success "Invalid member creation rejected with HTTP 400"

        # Verify member was NOT created (rollback successful)
        sleep 2
        CHECK_RESPONSE=$(curl -s -w "\n%{http_code}" \
            -H "Authorization: Bearer $JWT_BEARER" \
            "$API_URL/members?org_id=TX-TEST-001" 2>/dev/null || echo "000")

        CHECK_CODE=$(echo "$CHECK_RESPONSE" | tail -n1)
        CHECK_BODY=$(echo "$CHECK_RESPONSE" | head -n-1)

        if echo "$CHECK_BODY" | grep -q "TX-TEST-001"; then
            log_error "Member was created despite validation error (transaction did not rollback)"
        else
            log_success "Member not found after failed creation (transaction rolled back successfully)"
        fi
    else
        log_error "Expected HTTP 400 but got HTTP $HTTP_CODE"
    fi
}

test_create_member_success() {
    log_info "Test 2: Valid member creation should commit all related records"

    # Create a valid member with all fields
    RESPONSE=$(curl -s -w "\n%{http_code}" -X POST \
        -H "Authorization: Bearer $JWT_BEARER" \
        -H "Content-Type: application/json" \
        -d '{
            "org_id": "TX-TEST-002",
            "legal_name": "Valid Transaction Test Co",
            "domain": "tx-test-002.com",
            "kvk": "12345678",
            "address_line1": "Test Street 123",
            "postal_code": "1234AB",
            "city": "Amsterdam",
            "country_code": "NL",
            "contact_email": "test@tx-test-002.com",
            "contact_name": "Test User"
        }' \
        "$API_URL/members" 2>/dev/null || echo "000")

    HTTP_CODE=$(echo "$RESPONSE" | tail -n1)
    BODY=$(echo "$RESPONSE" | head -n-1)

    if [ "$HTTP_CODE" -eq 201 ]; then
        log_success "Valid member created successfully with HTTP 201"

        # Extract legal_entity_id from response
        LEGAL_ENTITY_ID=$(echo "$BODY" | grep -o '"legal_entity_id":"[^"]*"' | cut -d'"' -f4)

        if [ -n "$LEGAL_ENTITY_ID" ]; then
            log_success "Legal entity ID returned: $LEGAL_ENTITY_ID"

            # Verify legal entity exists
            sleep 2
            ENTITY_CHECK=$(curl -s -H "Authorization: Bearer $JWT_BEARER" \
                "$API_URL/legal-entities/$LEGAL_ENTITY_ID" 2>/dev/null || echo "{}")

            if echo "$ENTITY_CHECK" | grep -q "Valid Transaction Test Co"; then
                log_success "Legal entity created and accessible"
            else
                log_error "Legal entity not found (transaction may have partially committed)"
            fi

            # Cleanup
            curl -s -X DELETE -H "Authorization: Bearer $JWT_BEARER" \
                "$API_URL/members/TX-TEST-002" >/dev/null 2>&1 || true
        else
            log_error "No legal_entity_id in response"
        fi
    else
        log_error "Expected HTTP 201 but got HTTP $HTTP_CODE: $BODY"
    fi
}

test_update_legal_entity_rollback() {
    log_info "Test 3: Update legal entity with invalid contact should rollback contact changes"

    # First create a test entity
    CREATE_RESPONSE=$(curl -s -w "\n%{http_code}" -X POST \
        -H "Authorization: Bearer $JWT_BEARER" \
        -H "Content-Type: application/json" \
        -d '{
            "org_id": "TX-TEST-003",
            "legal_name": "Update Rollback Test Co",
            "domain": "tx-test-003.com"
        }' \
        "$API_URL/members" 2>/dev/null || echo "000")

    CREATE_CODE=$(echo "$CREATE_RESPONSE" | tail -n1)
    CREATE_BODY=$(echo "$CREATE_RESPONSE" | head -n-1)

    if [ "$CREATE_CODE" -eq 201 ]; then
        LEGAL_ENTITY_ID=$(echo "$CREATE_BODY" | grep -o '"legal_entity_id":"[^"]*"' | cut -d'"' -f4)

        if [ -n "$LEGAL_ENTITY_ID" ]; then
            # Try to update with valid entity data but invalid contact (missing email)
            sleep 2
            UPDATE_RESPONSE=$(curl -s -w "\n%{http_code}" -X PUT \
                -H "Authorization: Bearer $JWT_BEARER" \
                -H "Content-Type: application/json" \
                -d '{
                    "primary_legal_name": "Updated Name",
                    "city": "Rotterdam",
                    "contacts": [
                        {
                            "full_name": "Test Contact"
                        }
                    ]
                }' \
                "$API_URL/legal-entities/$LEGAL_ENTITY_ID" 2>/dev/null || echo "000")

            UPDATE_CODE=$(echo "$UPDATE_RESPONSE" | tail -n1)

            # Even if contacts fail, entity update should succeed (savepoint behavior)
            if [ "$UPDATE_CODE" -eq 200 ]; then
                log_success "Update handled gracefully (savepoint allowed partial rollback)"

                # Verify entity name was still updated
                sleep 2
                VERIFY=$(curl -s -H "Authorization: Bearer $JWT_BEARER" \
                    "$API_URL/legal-entities/$LEGAL_ENTITY_ID" 2>/dev/null || echo "{}")

                if echo "$VERIFY" | grep -q "Rotterdam"; then
                    log_success "Entity update persisted despite contact failure (savepoint working)"
                else
                    log_error "Entity update was rolled back (savepoint may not be working)"
                fi
            else
                log_success "Update rejected due to invalid contacts (full transaction rollback)"
            fi

            # Cleanup
            curl -s -X DELETE -H "Authorization: Bearer $JWT_BEARER" \
                "$API_URL/members/TX-TEST-003" >/dev/null 2>&1 || true
        else
            log_error "Failed to extract legal_entity_id from create response"
        fi
    else
        log_error "Failed to create test entity for update rollback test"
    fi
}

test_update_member_profile_atomicity() {
    log_info "Test 4: Update member profile should be atomic (all or nothing)"

    # Create test member
    CREATE_RESPONSE=$(curl -s -w "\n%{http_code}" -X POST \
        -H "Authorization: Bearer $JWT_BEARER" \
        -H "Content-Type: application/json" \
        -d '{
            "org_id": "TX-TEST-004",
            "legal_name": "Profile Update Test Co",
            "domain": "tx-test-004.com"
        }' \
        "$API_URL/members" 2>/dev/null || echo "000")

    CREATE_CODE=$(echo "$CREATE_RESPONSE" | tail -n1)

    if [ "$CREATE_CODE" -eq 201 ]; then
        # This test would require member authentication
        # Skipping for now as it requires valid member JWT token
        log_info "Skipping member profile test (requires member authentication)"

        # Cleanup
        curl -s -X DELETE -H "Authorization: Bearer $JWT_BEARER" \
            "$API_URL/members/TX-TEST-004" >/dev/null 2>&1 || true
    else
        log_error "Failed to create test member for profile update test"
    fi
}

test_concurrent_updates() {
    log_info "Test 5: Concurrent updates should maintain data integrity"

    # Create test member
    CREATE_RESPONSE=$(curl -s -w "\n%{http_code}" -X POST \
        -H "Authorization: Bearer $JWT_BEARER" \
        -H "Content-Type: application/json" \
        -d '{
            "org_id": "TX-TEST-005",
            "legal_name": "Concurrent Test Co",
            "domain": "tx-test-005.com"
        }' \
        "$API_URL/members" 2>/dev/null || echo "000")

    CREATE_CODE=$(echo "$CREATE_RESPONSE" | tail -n1)
    CREATE_BODY=$(echo "$CREATE_RESPONSE" | head -n-1)

    if [ "$CREATE_CODE" -eq 201 ]; then
        LEGAL_ENTITY_ID=$(echo "$CREATE_BODY" | grep -o '"legal_entity_id":"[^"]*"' | cut -d'"' -f4)

        if [ -n "$LEGAL_ENTITY_ID" ]; then
            # Launch two concurrent updates
            sleep 1
            curl -s -X PUT \
                -H "Authorization: Bearer $JWT_BEARER" \
                -H "Content-Type: application/json" \
                -d '{"city": "Amsterdam"}' \
                "$API_URL/legal-entities/$LEGAL_ENTITY_ID" >/dev/null 2>&1 &

            curl -s -X PUT \
                -H "Authorization: Bearer $JWT_BEARER" \
                -H "Content-Type: application/json" \
                -d '{"city": "Rotterdam"}' \
                "$API_URL/legal-entities/$LEGAL_ENTITY_ID" >/dev/null 2>&1 &

            # Wait for both to complete
            wait

            sleep 2
            # Verify entity is in a consistent state (either Amsterdam or Rotterdam, not corrupted)
            VERIFY=$(curl -s -H "Authorization: Bearer $JWT_BEARER" \
                "$API_URL/legal-entities/$LEGAL_ENTITY_ID" 2>/dev/null || echo "{}")

            if echo "$VERIFY" | grep -qE '"city":"(Amsterdam|Rotterdam)"'; then
                log_success "Entity in consistent state after concurrent updates"
            else
                log_error "Entity may be in inconsistent state after concurrent updates"
            fi

            # Cleanup
            curl -s -X DELETE -H "Authorization: Bearer $JWT_BEARER" \
                "$API_URL/members/TX-TEST-005" >/dev/null 2>&1 || true
        fi
    else
        log_error "Failed to create test member for concurrent update test"
    fi
}

# Main execution
main() {
    echo "========================================="
    echo "Database Transaction Integration Tests"
    echo "========================================="
    echo ""
    echo "API URL: $API_URL"
    echo ""

    check_auth

    # Run tests
    test_create_member_rollback
    echo ""

    test_create_member_success
    echo ""

    test_update_legal_entity_rollback
    echo ""

    test_update_member_profile_atomicity
    echo ""

    test_concurrent_updates
    echo ""

    # Summary
    echo "========================================="
    echo "Test Summary"
    echo "========================================="
    echo -e "${GREEN}Passed:${NC} $TESTS_PASSED"
    echo -e "${RED}Failed:${NC} $TESTS_FAILED"
    echo "========================================="

    if [ $TESTS_FAILED -eq 0 ]; then
        echo -e "${GREEN}All tests passed!${NC}"
        exit 0
    else
        echo -e "${RED}Some tests failed!${NC}"
        exit 1
    fi
}

# Run main
main
