#!/bin/bash

#############################################################################
# JWT Token Inspector - Booking Portal
# Decodes and validates Azure AD JWT token claims
# Usage: ./inspect-token.sh <ACCESS_TOKEN>
#############################################################################

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
CYAN='\033[0;36m'
MAGENTA='\033[0;35m'
NC='\033[0m' # No Color

ACCESS_TOKEN="$1"

echo -e "${BLUE}=================================================${NC}"
echo -e "${BLUE}JWT Token Inspector - Booking Portal${NC}"
echo -e "${BLUE}=================================================${NC}"
echo ""

if [ -z "$ACCESS_TOKEN" ]; then
    echo -e "${RED}ERROR: Access token not provided${NC}"
    echo ""
    echo "Usage: $0 <ACCESS_TOKEN>"
    echo ""
    echo -e "${YELLOW}How to get a token:${NC}"
    echo "1. Log in to the frontend: https://kind-coast-017153103.1.azurestaticapps.net"
    echo "2. Open browser console (F12)"
    echo "3. Go to Network tab"
    echo "4. Upload a document (to trigger API call)"
    echo "5. Click on the 'documents' request"
    echo "6. Go to Request Headers"
    echo "7. Copy the token after 'Bearer ' in the Authorization header"
    echo ""
    echo -e "${YELLOW}Or paste token from console logs${NC}"
    exit 1
fi

# Basic token info
echo -e "${CYAN}Basic Information:${NC}"
echo "Token length: ${#ACCESS_TOKEN} characters"
echo ""

# Split token into parts
IFS='.' read -ra TOKEN_PARTS <<< "$ACCESS_TOKEN"
PART_COUNT=${#TOKEN_PARTS[@]}

if [ $PART_COUNT -ne 3 ]; then
    echo -e "${RED}ERROR: Invalid JWT format${NC}"
    echo "Expected 3 parts (header.payload.signature), got $PART_COUNT"
    exit 1
fi

HEADER_B64="${TOKEN_PARTS[0]}"
PAYLOAD_B64="${TOKEN_PARTS[1]}"
SIGNATURE_B64="${TOKEN_PARTS[2]}"

echo -e "${CYAN}Token Structure:${NC}"
echo "Header:    ${#HEADER_B64} characters"
echo "Payload:   ${#PAYLOAD_B64} characters"
echo "Signature: ${#SIGNATURE_B64} characters"
echo ""

# Decode header
echo -e "${MAGENTA}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
echo -e "${CYAN}JWT Header${NC}"
echo -e "${MAGENTA}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"

# Add padding if needed for base64 decoding
add_padding() {
    local str="$1"
    local mod=$((${#str} % 4))
    if [ $mod -eq 2 ]; then
        str="${str}=="
    elif [ $mod -eq 3 ]; then
        str="${str}="
    fi
    echo "$str"
}

HEADER_B64_PADDED=$(add_padding "$HEADER_B64")
PAYLOAD_B64_PADDED=$(add_padding "$PAYLOAD_B64")

if command -v jq &> /dev/null; then
    HEADER=$(echo "$HEADER_B64_PADDED" | base64 -d 2>/dev/null)
    if [ -n "$HEADER" ]; then
        echo "$HEADER" | jq -C .
    else
        echo -e "${RED}Failed to decode header${NC}"
    fi
else
    echo "Install 'jq' for formatted output"
    echo "$HEADER_B64_PADDED" | base64 -d
fi
echo ""

# Decode payload
echo -e "${MAGENTA}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
echo -e "${CYAN}JWT Payload (Claims)${NC}"
echo -e "${MAGENTA}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"

PAYLOAD=$(echo "$PAYLOAD_B64_PADDED" | base64 -d 2>/dev/null)

if [ -z "$PAYLOAD" ]; then
    echo -e "${RED}Failed to decode payload${NC}"
    exit 1
fi

if command -v jq &> /dev/null; then
    echo "$PAYLOAD" | jq -C .
    echo ""

    # Extract and validate key claims
    echo -e "${MAGENTA}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
    echo -e "${CYAN}Validation Results${NC}"
    echo -e "${MAGENTA}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"

    # Extract claims
    AUD=$(echo "$PAYLOAD" | jq -r '.aud // empty')
    ISS=$(echo "$PAYLOAD" | jq -r '.iss // empty')
    EXP=$(echo "$PAYLOAD" | jq -r '.exp // empty')
    IAT=$(echo "$PAYLOAD" | jq -r '.iat // empty')
    NBF=$(echo "$PAYLOAD" | jq -r '.nbf // empty')
    SUB=$(echo "$PAYLOAD" | jq -r '.sub // empty')
    OID=$(echo "$PAYLOAD" | jq -r '.oid // empty')
    NAME=$(echo "$PAYLOAD" | jq -r '.name // empty')
    EMAIL=$(echo "$PAYLOAD" | jq -r '.preferred_username // .email // .upn // empty')
    ROLES=$(echo "$PAYLOAD" | jq -r '.roles[]? // empty' 2>/dev/null | tr '\n' ', ' | sed 's/,$//')

    # Expected values
    EXPECTED_AUD="api://d3037c11-a541-4f21-8862-8079137a0cde/access_as_user"
    EXPECTED_ISS="https://login.microsoftonline.com/598664e7-725c-4daa-bd1f-89c4ada717ff/v2.0"

    # Validate audience
    echo -n "Audience (aud):     "
    if [ "$AUD" == "$EXPECTED_AUD" ]; then
        echo -e "${GREEN}✓ VALID${NC}"
        echo "  Value: $AUD"
    else
        echo -e "${RED}✗ INVALID${NC}"
        echo "  Expected: $EXPECTED_AUD"
        echo "  Actual:   $AUD"
    fi
    echo ""

    # Validate issuer
    echo -n "Issuer (iss):       "
    if [ "$ISS" == "$EXPECTED_ISS" ]; then
        echo -e "${GREEN}✓ VALID${NC}"
        echo "  Value: $ISS"
    else
        echo -e "${YELLOW}⚠ WARNING${NC}"
        echo "  Expected: $EXPECTED_ISS"
        echo "  Actual:   $ISS"
    fi
    echo ""

    # Validate expiration
    CURRENT_TIME=$(date +%s)
    echo -n "Expiration (exp):   "
    if [ -n "$EXP" ] && [ "$EXP" -gt "$CURRENT_TIME" ]; then
        echo -e "${GREEN}✓ NOT EXPIRED${NC}"
        SECONDS_UNTIL_EXPIRY=$((EXP - CURRENT_TIME))
        MINUTES_UNTIL_EXPIRY=$((SECONDS_UNTIL_EXPIRY / 60))
        echo "  Expires: $(date -r "$EXP" 2>/dev/null || date -d "@$EXP" 2>/dev/null)"
        echo "  Time until expiry: ${MINUTES_UNTIL_EXPIRY} minutes"
    elif [ -n "$EXP" ]; then
        echo -e "${RED}✗ EXPIRED${NC}"
        echo "  Expired: $(date -r "$EXP" 2>/dev/null || date -d "@$EXP" 2>/dev/null)"
        SECONDS_SINCE_EXPIRY=$((CURRENT_TIME - EXP))
        MINUTES_SINCE_EXPIRY=$((SECONDS_SINCE_EXPIRY / 60))
        echo "  Expired: ${MINUTES_SINCE_EXPIRY} minutes ago"
    else
        echo -e "${RED}✗ MISSING${NC}"
    fi
    echo ""

    # Validate not before
    echo -n "Not Before (nbf):   "
    if [ -n "$NBF" ] && [ "$NBF" -le "$CURRENT_TIME" ]; then
        echo -e "${GREEN}✓ VALID${NC}"
        echo "  Active since: $(date -r "$NBF" 2>/dev/null || date -d "@$NBF" 2>/dev/null)"
    elif [ -n "$NBF" ]; then
        echo -e "${RED}✗ NOT YET VALID${NC}"
        echo "  Will be valid: $(date -r "$NBF" 2>/dev/null || date -d "@$NBF" 2>/dev/null)"
    else
        echo -e "${YELLOW}⚠ MISSING${NC}"
    fi
    echo ""

    # Display user info
    echo -e "${CYAN}User Information:${NC}"
    echo "Subject (sub):      $SUB"
    echo "Object ID (oid):    $OID"
    echo "Name:               $NAME"
    echo "Email:              $EMAIL"
    echo ""

    # Display roles
    echo -e "${CYAN}Roles:${NC}"
    if [ -n "$ROLES" ]; then
        echo -e "${GREEN}$ROLES${NC}"

        # Check for expected roles
        EXPECTED_ROLES=("SystemAdmin" "TerminalOperator" "FreightForwarder")
        HAS_VALID_ROLE=false
        for role in "${EXPECTED_ROLES[@]}"; do
            if echo "$ROLES" | grep -q "$role"; then
                HAS_VALID_ROLE=true
                break
            fi
        done

        if [ "$HAS_VALID_ROLE" = true ]; then
            echo -e "${GREEN}✓ User has valid Booking Portal role${NC}"
        else
            echo -e "${YELLOW}⚠ User does not have expected roles${NC}"
            echo "Expected: SystemAdmin, TerminalOperator, or FreightForwarder"
        fi
    else
        echo -e "${RED}No roles found${NC}"
        echo -e "${YELLOW}⚠ User may not have access to Booking Portal${NC}"
    fi
    echo ""

    # Token lifetime
    if [ -n "$IAT" ] && [ -n "$EXP" ]; then
        LIFETIME=$((EXP - IAT))
        LIFETIME_MINUTES=$((LIFETIME / 60))
        echo -e "${CYAN}Token Lifetime:${NC}"
        echo "Issued at (iat):    $(date -r "$IAT" 2>/dev/null || date -d "@$IAT" 2>/dev/null)"
        echo "Valid for:          ${LIFETIME_MINUTES} minutes"
        echo ""
    fi

    # Summary
    echo -e "${MAGENTA}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
    echo -e "${CYAN}Summary${NC}"
    echo -e "${MAGENTA}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"

    ISSUES=0

    if [ "$AUD" != "$EXPECTED_AUD" ]; then
        echo -e "${RED}✗ Audience mismatch - API will reject this token${NC}"
        ISSUES=$((ISSUES + 1))
    fi

    if [ "$ISS" != "$EXPECTED_ISS" ]; then
        echo -e "${YELLOW}⚠ Issuer mismatch - may cause issues${NC}"
        ISSUES=$((ISSUES + 1))
    fi

    if [ -n "$EXP" ] && [ "$EXP" -le "$CURRENT_TIME" ]; then
        echo -e "${RED}✗ Token is expired - acquire a new token${NC}"
        ISSUES=$((ISSUES + 1))
    fi

    if [ -z "$ROLES" ]; then
        echo -e "${RED}✗ No roles - user cannot access Booking Portal${NC}"
        ISSUES=$((ISSUES + 1))
    fi

    if [ $ISSUES -eq 0 ]; then
        echo -e "${GREEN}✓ Token appears to be valid!${NC}"
        echo ""
        echo -e "${YELLOW}Next Steps:${NC}"
        echo "1. Test this token against the API:"
        echo "   ./auth-with-token-test.sh \"$ACCESS_TOKEN\""
        echo ""
        echo "2. If API test passes but frontend still fails, check:"
        echo "   - Axios interceptor is adding the Authorization header"
        echo "   - Network tab shows the header being sent"
        echo "   - CORS is configured correctly on the API"
    else
        echo ""
        echo -e "${RED}Found $ISSUES issue(s) with this token${NC}"
        echo ""
        echo -e "${YELLOW}Recommended Actions:${NC}"
        if [ "$AUD" != "$EXPECTED_AUD" ]; then
            echo "- Fix audience: Check Azure AD app registration → Expose an API"
            echo "  Expected scope: api://d3037c11-a541-4f21-8862-8079137a0cde/access_as_user"
        fi
        if [ -n "$EXP" ] && [ "$EXP" -le "$CURRENT_TIME" ]; then
            echo "- Acquire a new token: Log out and log in again"
        fi
        if [ -z "$ROLES" ]; then
            echo "- Assign roles: Azure AD → Enterprise Apps → Users and groups"
            echo "  Add role: SystemAdmin, TerminalOperator, or FreightForwarder"
        fi
    fi

else
    echo "Install 'jq' for detailed token analysis:"
    echo "  brew install jq  (macOS)"
    echo "  apt-get install jq  (Ubuntu/Debian)"
    echo ""
    echo "Raw payload:"
    echo "$PAYLOAD"
fi

echo ""
