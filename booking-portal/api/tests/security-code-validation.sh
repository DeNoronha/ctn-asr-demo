#!/bin/bash
#
# Security Code Validation (Static Analysis Only)
# Validates Week 1 CRITICAL security fixes in code
#
# Branch: feature/booking-portal-security-fixes
# Date: 2025-10-23
#

set -e

# Color output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m'

TESTS_RUN=0
TESTS_PASSED=0
TESTS_FAILED=0

API_DIR="/Users/ramondenoronha/Dev/DIL/ASR-full/booking-portal/api"

echo -e "${BLUE}========================================${NC}"
echo -e "${BLUE}Security Code Validation (Static Analysis)${NC}"
echo -e "${BLUE}========================================${NC}"
echo ""
echo "Branch: feature/booking-portal-security-fixes"
echo "API Directory: $API_DIR"
echo ""

# ============================================================================
# Test 1: Authentication - All endpoints use getUserFromRequest
# ============================================================================
echo -e "${YELLOW}[1] Authentication Implementation${NC}"

for func in GetBookingById GetBookings GetDocumentSasUrl UploadDocument; do
    TESTS_RUN=$((TESTS_RUN + 1))
    echo -n "  $func calls getUserFromRequest... "

    if grep -q "getUserFromRequest" "$API_DIR/$func/index.ts"; then
        echo -e "${GREEN}PASS${NC}"
        TESTS_PASSED=$((TESTS_PASSED + 1))
    else
        echo -e "${RED}FAIL${NC}"
        TESTS_FAILED=$((TESTS_FAILED + 1))
    fi
done

for func in GetBookingById GetBookings GetDocumentSasUrl UploadDocument; do
    TESTS_RUN=$((TESTS_RUN + 1))
    echo -n "  $func returns 401 when user is null... "

    if grep -q "status: 401" "$API_DIR/$func/index.ts" && \
       grep -q "if (!user)" "$API_DIR/$func/index.ts"; then
        echo -e "${GREEN}PASS${NC}"
        TESTS_PASSED=$((TESTS_PASSED + 1))
    else
        echo -e "${RED}FAIL${NC}"
        TESTS_FAILED=$((TESTS_FAILED + 1))
    fi
done

echo ""

# ============================================================================
# Test 2: IDOR Protection
# ============================================================================
echo -e "${YELLOW}[2] IDOR Protection${NC}"

TESTS_RUN=$((TESTS_RUN + 1))
echo -n "  GetBookingById checks tenantId match... "
if grep -q "booking.tenantId !== user.tenantId" "$API_DIR/GetBookingById/index.ts"; then
    echo -e "${GREEN}PASS${NC}"
    TESTS_PASSED=$((TESTS_PASSED + 1))
else
    echo -e "${RED}FAIL${NC}"
    TESTS_FAILED=$((TESTS_FAILED + 1))
fi

TESTS_RUN=$((TESTS_RUN + 1))
echo -n "  GetBookingById returns 404 (not 403)... "
if grep -A 3 "IDOR attempt" "$API_DIR/GetBookingById/index.ts" | grep -q "status: 404"; then
    echo -e "${GREEN}PASS${NC}"
    TESTS_PASSED=$((TESTS_PASSED + 1))
else
    echo -e "${RED}FAIL${NC}"
    TESTS_FAILED=$((TESTS_FAILED + 1))
fi

TESTS_RUN=$((TESTS_RUN + 1))
echo -n "  GetBookingById logs IDOR attempts... "
if grep -q "IDOR attempt" "$API_DIR/GetBookingById/index.ts"; then
    echo -e "${GREEN}PASS${NC}"
    TESTS_PASSED=$((TESTS_PASSED + 1))
else
    echo -e "${RED}FAIL${NC}"
    TESTS_FAILED=$((TESTS_FAILED + 1))
fi

TESTS_RUN=$((TESTS_RUN + 1))
echo -n "  GetBookings filters by user tenantId... "
if grep -q "c.tenantId = @tenantId" "$API_DIR/GetBookings/index.ts" && \
   grep -q "user.tenantId" "$API_DIR/GetBookings/index.ts"; then
    echo -e "${GREEN}PASS${NC}"
    TESTS_PASSED=$((TESTS_PASSED + 1))
else
    echo -e "${RED}FAIL${NC}"
    TESTS_FAILED=$((TESTS_FAILED + 1))
fi

echo ""

# ============================================================================
# Test 3: File Upload Validation
# ============================================================================
echo -e "${YELLOW}[3] File Upload Validation${NC}"

TESTS_RUN=$((TESTS_RUN + 1))
echo -n "  UploadDocument validates PDF magic bytes... "
if grep -q "pdfHeader.includes('%PDF-')" "$API_DIR/UploadDocument/index.ts"; then
    echo -e "${GREEN}PASS${NC}"
    TESTS_PASSED=$((TESTS_PASSED + 1))
else
    echo -e "${RED}FAIL${NC}"
    TESTS_FAILED=$((TESTS_FAILED + 1))
fi

TESTS_RUN=$((TESTS_RUN + 1))
echo -n "  UploadDocument rejects invalid PDFs (400)... "
if grep -B 5 "Invalid file format" "$API_DIR/UploadDocument/index.ts" | grep -q "status: 400"; then
    echo -e "${GREEN}PASS${NC}"
    TESTS_PASSED=$((TESTS_PASSED + 1))
else
    echo -e "${RED}FAIL${NC}"
    TESTS_FAILED=$((TESTS_FAILED + 1))
fi

TESTS_RUN=$((TESTS_RUN + 1))
echo -n "  UploadDocument enforces 10MB limit... "
if grep -q "MAX_FILE_SIZE = 10 \* 1024 \* 1024" "$API_DIR/UploadDocument/index.ts"; then
    echo -e "${GREEN}PASS${NC}"
    TESTS_PASSED=$((TESTS_PASSED + 1))
else
    echo -e "${RED}FAIL${NC}"
    TESTS_FAILED=$((TESTS_FAILED + 1))
fi

TESTS_RUN=$((TESTS_RUN + 1))
echo -n "  UploadDocument rejects large files (413)... "
if grep -B 5 "File too large" "$API_DIR/UploadDocument/index.ts" | grep -q "status: 413"; then
    echo -e "${GREEN}PASS${NC}"
    TESTS_PASSED=$((TESTS_PASSED + 1))
else
    echo -e "${RED}FAIL${NC}"
    TESTS_FAILED=$((TESTS_FAILED + 1))
fi

echo ""

# ============================================================================
# Test 4: Error Message Sanitization
# ============================================================================
echo -e "${YELLOW}[4] Error Message Sanitization${NC}"

for func in GetBookingById GetBookings GetDocumentSasUrl UploadDocument; do
    TESTS_RUN=$((TESTS_RUN + 1))
    echo -n "  $func returns generic error... "

    if grep -q "{ error: 'Internal server error' }" "$API_DIR/$func/index.ts"; then
        echo -e "${GREEN}PASS${NC}"
        TESTS_PASSED=$((TESTS_PASSED + 1))
    else
        echo -e "${RED}FAIL${NC}"
        TESTS_FAILED=$((TESTS_FAILED + 1))
    fi
done

for func in GetBookingById GetBookings GetDocumentSasUrl; do
    TESTS_RUN=$((TESTS_RUN + 1))
    echo -n "  $func doesn't expose error.stack... "

    # Should NOT have error.stack in response body
    if ! grep "body.*error.stack\|error: error.message" "$API_DIR/$func/index.ts" >/dev/null 2>&1; then
        echo -e "${GREEN}PASS${NC}"
        TESTS_PASSED=$((TESTS_PASSED + 1))
    else
        echo -e "${RED}FAIL${NC}"
        TESTS_FAILED=$((TESTS_FAILED + 1))
    fi
done

echo ""

# ============================================================================
# Test 5: Container Number Validation (ISO 6346)
# ============================================================================
echo -e "${YELLOW}[5] Container Number Validation${NC}"

TESTS_RUN=$((TESTS_RUN + 1))
echo -n "  ISO 6346 check digit algorithm fixed... "
if grep -q "const remainder = sum % 11;" "$API_DIR/shared/documentClassifier.ts" && \
   grep -q "const calculatedCheckDigit = remainder === 10 ? 0 : remainder;" "$API_DIR/shared/documentClassifier.ts"; then
    echo -e "${GREEN}PASS${NC}"
    TESTS_PASSED=$((TESTS_PASSED + 1))
else
    echo -e "${RED}FAIL${NC}"
    TESTS_FAILED=$((TESTS_FAILED + 1))
fi

TESTS_RUN=$((TESTS_RUN + 1))
echo -n "  isValidContainerNumber function exists... "
if grep -q "function isValidContainerNumber" "$API_DIR/shared/documentClassifier.ts"; then
    echo -e "${GREEN}PASS${NC}"
    TESTS_PASSED=$((TESTS_PASSED + 1))
else
    echo -e "${RED}FAIL${NC}"
    TESTS_FAILED=$((TESTS_FAILED + 1))
fi

echo ""

# ============================================================================
# Test 6: Environment Variable Validation
# ============================================================================
echo -e "${YELLOW}[6] Environment Variable Validation${NC}"

TESTS_RUN=$((TESTS_RUN + 1))
echo -n "  auth.ts validates TENANT_ID and CLIENT_ID... "
if grep -q "if (!TENANT_ID || !CLIENT_ID)" "$API_DIR/shared/auth.ts" && \
   grep -q "throw new Error('CRITICAL:" "$API_DIR/shared/auth.ts"; then
    echo -e "${GREEN}PASS${NC}"
    TESTS_PASSED=$((TESTS_PASSED + 1))
else
    echo -e "${RED}FAIL${NC}"
    TESTS_FAILED=$((TESTS_FAILED + 1))
fi

TESTS_RUN=$((TESTS_RUN + 1))
echo -n "  auth.ts fails fast at startup... "
# Check validation happens at module level (outside functions)
if grep -B 5 "if (!TENANT_ID || !CLIENT_ID)" "$API_DIR/shared/auth.ts" | grep -q "const TENANT_ID"; then
    echo -e "${GREEN}PASS${NC}"
    TESTS_PASSED=$((TESTS_PASSED + 1))
else
    echo -e "${RED}FAIL${NC}"
    TESTS_FAILED=$((TESTS_FAILED + 1))
fi

echo ""

# ============================================================================
# Test 7: JWT Token Validation
# ============================================================================
echo -e "${YELLOW}[7] JWT Token Validation${NC}"

TESTS_RUN=$((TESTS_RUN + 1))
echo -n "  auth.ts uses jwt.verify... "
if grep -q "jwt.verify" "$API_DIR/shared/auth.ts"; then
    echo -e "${GREEN}PASS${NC}"
    TESTS_PASSED=$((TESTS_PASSED + 1))
else
    echo -e "${RED}FAIL${NC}"
    TESTS_FAILED=$((TESTS_FAILED + 1))
fi

TESTS_RUN=$((TESTS_RUN + 1))
echo -n "  auth.ts validates audience... "
if grep -q "audience:" "$API_DIR/shared/auth.ts"; then
    echo -e "${GREEN}PASS${NC}"
    TESTS_PASSED=$((TESTS_PASSED + 1))
else
    echo -e "${RED}FAIL${NC}"
    TESTS_FAILED=$((TESTS_FAILED + 1))
fi

TESTS_RUN=$((TESTS_RUN + 1))
echo -n "  auth.ts validates issuer... "
if grep -q "issuer:" "$API_DIR/shared/auth.ts"; then
    echo -e "${GREEN}PASS${NC}"
    TESTS_PASSED=$((TESTS_PASSED + 1))
else
    echo -e "${RED}FAIL${NC}"
    TESTS_FAILED=$((TESTS_FAILED + 1))
fi

TESTS_RUN=$((TESTS_RUN + 1))
echo -n "  auth.ts uses RS256 algorithm... "
if grep -q "algorithms: \['RS256'\]" "$API_DIR/shared/auth.ts"; then
    echo -e "${GREEN}PASS${NC}"
    TESTS_PASSED=$((TESTS_PASSED + 1))
else
    echo -e "${RED}FAIL${NC}"
    TESTS_FAILED=$((TESTS_FAILED + 1))
fi

echo ""

# ============================================================================
# Summary
# ============================================================================
echo -e "${BLUE}========================================${NC}"
echo -e "${BLUE}Test Summary${NC}"
echo -e "${BLUE}========================================${NC}"
echo ""
echo "Tests run:    $TESTS_RUN"
echo -e "Tests passed: ${GREEN}$TESTS_PASSED${NC}"
echo -e "Tests failed: ${RED}$TESTS_FAILED${NC}"
echo ""

PASS_RATE=$((TESTS_PASSED * 100 / TESTS_RUN))

if [ $TESTS_FAILED -eq 0 ]; then
    echo -e "${GREEN}✓ ALL SECURITY CODE VALIDATIONS PASSED (100%)${NC}"
    echo ""
    echo "Week 1 CRITICAL security fixes verified in code:"
    echo "  ✓ Authentication required on all endpoints"
    echo "  ✓ IDOR protection with tenant isolation"
    echo "  ✓ File upload validation (PDF magic bytes, 10MB limit)"
    echo "  ✓ Error message sanitization (no stack traces)"
    echo "  ✓ Container number validation (ISO 6346 fixed)"
    echo "  ✓ Environment variable validation at startup"
    echo "  ✓ JWT token validation (RS256, audience, issuer)"
    echo ""
    echo -e "${YELLOW}⚠ DEPLOYMENT STATUS: NOT DEPLOYED TO PRODUCTION${NC}"
    echo "  Branch: feature/booking-portal-security-fixes"
    echo "  Status: Code ready, needs merge to main + pipeline deployment"
    echo ""
    exit 0
elif [ $PASS_RATE -ge 90 ]; then
    echo -e "${YELLOW}⚠ MOSTLY PASSED ($PASS_RATE%)${NC}"
    echo "Review failed tests before deployment."
    exit 1
else
    echo -e "${RED}✗ SECURITY VALIDATIONS FAILED ($PASS_RATE%)${NC}"
    echo "Fix failing tests before deployment."
    exit 1
fi
