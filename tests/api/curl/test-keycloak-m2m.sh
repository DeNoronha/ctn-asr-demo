#!/bin/bash

# =====================================================
# Test Keycloak M2M Authentication
# =====================================================
# Tests OAuth2.0 client credentials flow with Cloud IAM Keycloak
# Usage: ./scripts/test-keycloak-m2m.sh [client_id] [client_secret]
# =====================================================

set -e  # Exit on error

# Colors
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
CYAN='\033[0;36m'
NC='\033[0m' # No Color

# Helper functions
log_info() { echo -e "${CYAN}ℹ️  $1${NC}"; }
log_success() { echo -e "${GREEN}✅ $1${NC}"; }
log_warning() { echo -e "${YELLOW}⚠️  $1${NC}"; }
log_error() { echo -e "${RED}❌ $1${NC}"; }
log_step() {
    echo ""
    echo -e "${BLUE}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
    echo -e "${BLUE}$1${NC}"
    echo -e "${BLUE}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
}

# Configuration
KEYCLOAK_ISSUER="${KEYCLOAK_ISSUER:-https://lemur-8.cloud-iam.com/auth}"
KEYCLOAK_REALM="${KEYCLOAK_REALM:-ctn-test}"
API_BASE_URL="${API_BASE_URL:-https://ca-ctn-asr-api-dev.calmriver-700a8c55.westeurope.azurecontainerapps.io/api/v1}"

# Client credentials (from arguments or environment)
CLIENT_ID="${1:-${KEYCLOAK_CLIENT_ID}}"
CLIENT_SECRET="${2:-${KEYCLOAK_CLIENT_SECRET}}"

# Token endpoint
TOKEN_ENDPOINT="${KEYCLOAK_ISSUER}/realms/${KEYCLOAK_REALM}/protocol/openid-connect/token"

# Validation
if [ -z "$CLIENT_ID" ]; then
    log_error "Client ID not provided"
    echo ""
    echo "Usage:"
    echo "  $0 <client_id> <client_secret>"
    echo ""
    echo "Or set environment variables:"
    echo "  export KEYCLOAK_CLIENT_ID=terminal-operator-acme"
    echo "  export KEYCLOAK_CLIENT_SECRET=<secret>"
    echo "  $0"
    echo ""
    exit 1
fi

if [ -z "$CLIENT_SECRET" ]; then
    log_error "Client secret not provided"
    echo ""
    echo "Usage:"
    echo "  $0 $CLIENT_ID <client_secret>"
    echo ""
    exit 1
fi

# Banner
clear
echo -e "${CYAN}"
cat << "EOF"
╔══════════════════════════════════════════════════════╗
║   Keycloak M2M Authentication Test                   ║
║   Cloud IAM (France) - OAuth2.0 Client Credentials   ║
╚══════════════════════════════════════════════════════╝
EOF
echo -e "${NC}"

log_info "Testing M2M authentication with Cloud IAM Keycloak"
echo ""
echo "Configuration:"
echo "  Keycloak Issuer: $KEYCLOAK_ISSUER"
echo "  Realm: $KEYCLOAK_REALM"
echo "  Client ID: $CLIENT_ID"
echo "  API Base URL: $API_BASE_URL"
echo ""
read -p "Press ENTER to continue or Ctrl+C to abort..."

# =====================================================
# STEP 1: Request Access Token
# =====================================================
log_step "STEP 1: Requesting Access Token"

log_info "Token endpoint: $TOKEN_ENDPOINT"
log_info "Grant type: client_credentials"

# Request token
TOKEN_RESPONSE=$(curl -s -X POST "$TOKEN_ENDPOINT" \
  -H "Content-Type: application/x-www-form-urlencoded" \
  -d "grant_type=client_credentials" \
  -d "client_id=$CLIENT_ID" \
  -d "client_secret=$CLIENT_SECRET")

# Check for errors
if echo "$TOKEN_RESPONSE" | jq -e '.error' > /dev/null 2>&1; then
    ERROR=$(echo "$TOKEN_RESPONSE" | jq -r '.error')
    ERROR_DESC=$(echo "$TOKEN_RESPONSE" | jq -r '.error_description')
    log_error "Token request failed: $ERROR"
    log_error "Description: $ERROR_DESC"
    echo ""
    log_info "Troubleshooting:"
    echo "  1. Verify client_id and client_secret are correct"
    echo "  2. Check client has 'Service Account Enabled' in Keycloak"
    echo "  3. Verify Keycloak instance URL is accessible"
    echo "  4. Check client is active (not disabled)"
    exit 1
fi

# Extract token
ACCESS_TOKEN=$(echo "$TOKEN_RESPONSE" | jq -r '.access_token')

if [ -z "$ACCESS_TOKEN" ] || [ "$ACCESS_TOKEN" = "null" ]; then
    log_error "Failed to extract access token from response"
    echo "Response:"
    echo "$TOKEN_RESPONSE" | jq '.'
    exit 1
fi

log_success "Access token received"

# Token metadata
TOKEN_TYPE=$(echo "$TOKEN_RESPONSE" | jq -r '.token_type')
EXPIRES_IN=$(echo "$TOKEN_RESPONSE" | jq -r '.expires_in')
SCOPE=$(echo "$TOKEN_RESPONSE" | jq -r '.scope // empty')

echo ""
echo "Token Details:"
echo "  Type: $TOKEN_TYPE"
echo "  Expires in: ${EXPIRES_IN} seconds ($(($EXPIRES_IN / 60)) minutes)"
if [ -n "$SCOPE" ]; then
    echo "  Scope: $SCOPE"
fi

# =====================================================
# STEP 2: Decode and Validate Token
# =====================================================
log_step "STEP 2: Decoding Token Claims"

# Decode JWT (header and payload only - signature not verified here)
TOKEN_HEADER=$(echo "$ACCESS_TOKEN" | cut -d'.' -f1 | base64 -d 2>/dev/null | jq '.')
TOKEN_PAYLOAD=$(echo "$ACCESS_TOKEN" | cut -d'.' -f2 | base64 -d 2>/dev/null | jq '.')

if [ -z "$TOKEN_PAYLOAD" ]; then
    log_warning "Could not decode token payload (may be base64url encoded)"
else
    log_success "Token decoded successfully"
    echo ""
    echo "Token Header:"
    echo "$TOKEN_HEADER" | jq '.'
    echo ""
    echo "Token Payload:"
    echo "$TOKEN_PAYLOAD" | jq '.'

    # Extract key claims
    ISS=$(echo "$TOKEN_PAYLOAD" | jq -r '.iss')
    AUD=$(echo "$TOKEN_PAYLOAD" | jq -r '.aud // empty')
    SUB=$(echo "$TOKEN_PAYLOAD" | jq -r '.sub')
    AZP=$(echo "$TOKEN_PAYLOAD" | jq -r '.azp // empty')
    EXP=$(echo "$TOKEN_PAYLOAD" | jq -r '.exp')
    IAT=$(echo "$TOKEN_PAYLOAD" | jq -r '.iat')

    # Validate claims
    echo ""
    echo "Key Claims:"
    echo "  Issuer (iss): $ISS"
    echo "  Audience (aud): $AUD"
    echo "  Subject (sub): $SUB"
    echo "  Authorized Party (azp): $AZP"
    echo "  Issued At: $(date -r $IAT 2>/dev/null || echo $IAT)"
    echo "  Expires At: $(date -r $EXP 2>/dev/null || echo $EXP)"

    # Check issuer matches
    EXPECTED_ISSUER="${KEYCLOAK_ISSUER}/realms/${KEYCLOAK_REALM}"
    if [ "$ISS" = "$EXPECTED_ISSUER" ]; then
        log_success "Issuer matches expected: $ISS"
    else
        log_error "Issuer mismatch!"
        echo "  Expected: $EXPECTED_ISSUER"
        echo "  Got: $ISS"
    fi

    # Extract roles
    REALM_ROLES=$(echo "$TOKEN_PAYLOAD" | jq -r '.realm_access.roles // [] | join(", ")')
    if [ -n "$REALM_ROLES" ] && [ "$REALM_ROLES" != "" ]; then
        echo ""
        echo "Realm Roles: $REALM_ROLES"
    fi

    RESOURCE_ACCESS=$(echo "$TOKEN_PAYLOAD" | jq -r '.resource_access // {} | keys | join(", ")')
    if [ -n "$RESOURCE_ACCESS" ] && [ "$RESOURCE_ACCESS" != "" ]; then
        echo "Resource Access: $RESOURCE_ACCESS"
    fi
fi

# =====================================================
# STEP 3: Test API Health Endpoint (No Auth)
# =====================================================
log_step "STEP 3: Testing API Health Endpoint (No Auth Required)"

log_info "GET $API_BASE_URL/health"

HEALTH_RESPONSE=$(curl -s -w "\n%{http_code}" "$API_BASE_URL/health")
HEALTH_BODY=$(echo "$HEALTH_RESPONSE" | head -n -1)
HEALTH_STATUS=$(echo "$HEALTH_RESPONSE" | tail -n 1)

if [ "$HEALTH_STATUS" = "200" ]; then
    log_success "API health check passed (200 OK)"
    echo "$HEALTH_BODY" | jq '.' 2>/dev/null || echo "$HEALTH_BODY"
else
    log_error "API health check failed (status: $HEALTH_STATUS)"
    echo "$HEALTH_BODY"
fi

# =====================================================
# STEP 4: Test Authenticated API Endpoint
# =====================================================
log_step "STEP 4: Testing Authenticated API Endpoint"

# Test /members endpoint
log_info "GET $API_BASE_URL/members"
log_info "Authorization: Bearer <token>"

MEMBERS_RESPONSE=$(curl -s -w "\n%{http_code}" \
  -H "Authorization: Bearer $ACCESS_TOKEN" \
  -H "Accept: application/json" \
  "$API_BASE_URL/members")

MEMBERS_BODY=$(echo "$MEMBERS_RESPONSE" | head -n -1)
MEMBERS_STATUS=$(echo "$MEMBERS_RESPONSE" | tail -n 1)

echo ""
echo "Response Status: $MEMBERS_STATUS"

if [ "$MEMBERS_STATUS" = "200" ]; then
    log_success "Authenticated request successful (200 OK)"
    echo ""
    echo "Response:"
    echo "$MEMBERS_BODY" | jq '.' 2>/dev/null || echo "$MEMBERS_BODY"

    # Count results
    MEMBER_COUNT=$(echo "$MEMBERS_BODY" | jq '.data | length' 2>/dev/null || echo "unknown")
    if [ "$MEMBER_COUNT" != "unknown" ] && [ "$MEMBER_COUNT" != "null" ]; then
        echo ""
        log_info "Retrieved $MEMBER_COUNT member(s)"
    fi
elif [ "$MEMBERS_STATUS" = "401" ]; then
    log_error "Authentication failed (401 Unauthorized)"
    echo ""
    echo "Response:"
    echo "$MEMBERS_BODY" | jq '.' 2>/dev/null || echo "$MEMBERS_BODY"
    echo ""
    log_info "Troubleshooting:"
    echo "  1. Verify Azure Functions has KEYCLOAK_ISSUER environment variable set"
    echo "  2. Check token issuer matches Azure Functions configuration"
    echo "  3. Verify API middleware is using authenticateKeycloak or authenticateDual"
    echo "  4. Check database mapping exists for client_id: $CLIENT_ID"
elif [ "$MEMBERS_STATUS" = "403" ]; then
    log_error "Authorization failed (403 Forbidden)"
    echo ""
    echo "Response:"
    echo "$MEMBERS_BODY" | jq '.' 2>/dev/null || echo "$MEMBERS_BODY"
    echo ""
    log_info "Troubleshooting:"
    echo "  1. Check client has required roles/scopes assigned"
    echo "  2. Verify party mapping exists in ctn_m2m_credentials"
    echo "  3. Check endpoint requires scopes this client has"
else
    log_error "Unexpected response (status: $MEMBERS_STATUS)"
    echo ""
    echo "Response:"
    echo "$MEMBERS_BODY" | jq '.' 2>/dev/null || echo "$MEMBERS_BODY"
fi

# =====================================================
# STEP 5: Verify Database Mapping
# =====================================================
log_step "STEP 5: Verifying Database Mapping (Optional)"

log_info "This step requires database access"
echo ""
echo "Run this query to verify mapping exists:"
echo ""
echo "SELECT"
echo "  service_account_name,"
echo "  m2m_client_id,"
echo "  auth_provider,"
echo "  auth_issuer,"
echo "  assigned_scopes,"
echo "  is_active,"
echo "  party_name"
echo "FROM v_m2m_credentials_active"
echo "WHERE m2m_client_id = '$CLIENT_ID';"
echo ""

# =====================================================
# Summary
# =====================================================
log_step "✅ TEST COMPLETE"

echo ""
if [ "$HEALTH_STATUS" = "200" ] && [ "$MEMBERS_STATUS" = "200" ]; then
    log_success "All tests passed! 🎉"
    echo ""
    echo "✓ Access token obtained"
    echo "✓ Token decoded and validated"
    echo "✓ API health check passed"
    echo "✓ Authenticated request successful"
    echo ""
    log_info "Your Keycloak M2M authentication is working correctly!"
elif [ "$HEALTH_STATUS" = "200" ]; then
    log_warning "API is healthy but authentication failed"
    echo ""
    echo "✓ Access token obtained from Keycloak"
    echo "✓ API health check passed"
    echo "✗ Authenticated request failed (status: $MEMBERS_STATUS)"
    echo ""
    log_info "Check the troubleshooting steps above"
else
    log_error "Tests failed"
    echo ""
    echo "✗ API health check failed"
    echo ""
    log_info "Verify API is deployed and accessible at: $API_BASE_URL"
fi

echo ""
log_info "Useful Commands:"
echo ""
echo "# Store token in variable:"
echo "export ACCESS_TOKEN=\"$ACCESS_TOKEN\""
echo ""
echo "# Test other endpoints:"
echo "curl -H \"Authorization: Bearer \$ACCESS_TOKEN\" $API_BASE_URL/members"
echo "curl -H \"Authorization: Bearer \$ACCESS_TOKEN\" $API_BASE_URL/legal-entities"
echo ""
echo "# Decode token online:"
echo "https://jwt.io"
echo ""
echo "# Check database mapping:"
echo "psql -h psql-ctn-demo-asr-dev.postgres.database.azure.com -p 5432 -U asradmin -d asr_dev"
echo "SELECT * FROM v_m2m_credentials_active WHERE m2m_client_id = '$CLIENT_ID';"
echo ""
