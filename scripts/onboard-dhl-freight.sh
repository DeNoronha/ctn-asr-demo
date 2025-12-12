#!/bin/bash
# ============================================================================
# ONBOARDING SCRIPT: DHL Freight Netherlands BV
# ============================================================================
# This script fetches data from external registries and inserts into database.
#
# Company Details:
#   Name: DHL Freight (Netherlands) B.V.
#   KVK:  30130193
#   Vestigingsnr: 000051105322
#   Peppol: 9944:nl001671248b03 (Verified in Peppol Directory)
#
# This script will:
#   1. Fetch data from KVK API (includes RSIN)
#   2. Check GLEIF for LEI
#   3. Fetch data from Peppol Directory
#   4. Generate derived identifiers (EUID, EORI)
#   5. Insert all data into database
#
# Usage:
#   source .credentials  # Load API keys
#   ./scripts/onboard-dhl-freight.sh
#
# Date: 2025-12-12
# Author: Claude Code
# ============================================================================

set -e  # Exit on error

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Company details
KVK_NUMBER="30130193"
VESTIGINGSNR="000051105322"
PEPPOL_ID="9944:nl001671248b03"
COMPANY_NAME="DHL Freight (Netherlands) B.V."
MANAGING_DIRECTOR="Lisette Nap"

# Output directory for API responses
OUTPUT_DIR="./scripts/onboarding-data/dhl-freight"
mkdir -p "$OUTPUT_DIR"

echo -e "${BLUE}============================================================${NC}"
echo -e "${BLUE}  DHL Freight Netherlands BV - Onboarding Script${NC}"
echo -e "${BLUE}============================================================${NC}"
echo ""

# ============================================================================
# Step 1: Validate environment
# ============================================================================
echo -e "${YELLOW}Step 1: Validating environment...${NC}"

if [ -z "$KVK_API_KEY" ]; then
    echo -e "${RED}ERROR: KVK_API_KEY not set. Run: source .credentials${NC}"
    exit 1
fi

if [ -z "$POSTGRES_HOST" ]; then
    echo -e "${RED}ERROR: POSTGRES_HOST not set. Run: source .credentials${NC}"
    exit 1
fi

echo -e "${GREEN}  Environment validated${NC}"
echo ""

# ============================================================================
# Step 2: Fetch KVK data (includes RSIN) with geoData=true for GPS coordinates
# ============================================================================
echo -e "${YELLOW}Step 2: Fetching KVK data for ${KVK_NUMBER}...${NC}"

KVK_RESPONSE=$(curl -s -X GET \
    "https://api.kvk.nl/api/v1/basisprofielen/${KVK_NUMBER}?geoData=true" \
    -H "apikey: ${KVK_API_KEY}" \
    -H "Accept: application/json")

# Save raw response
echo "$KVK_RESPONSE" > "$OUTPUT_DIR/kvk_response.json"

# Check for error
if echo "$KVK_RESPONSE" | jq -e '.fout' > /dev/null 2>&1; then
    echo -e "${RED}ERROR: KVK API returned error:${NC}"
    echo "$KVK_RESPONSE" | jq '.fout'
    exit 1
fi

# ============================================================================
# Extract ALL fields from KVK Basisprofiel API response
# Based on OpenAPI spec v1.4.0
# ============================================================================

# Core identifiers
KVK_NAAM=$(echo "$KVK_RESPONSE" | jq -r '.naam // empty')
STATUTORY_NAME=$(echo "$KVK_RESPONSE" | jq -r '.statutaireNaam // empty')
IND_NON_MAILING=$(echo "$KVK_RESPONSE" | jq -r '.indNonMailing // empty')

# RSIN: From eigenaar (preferred) or hoofdvestiging
RSIN=$(echo "$KVK_RESPONSE" | jq -r '._embedded.eigenaar.rsin // ._embedded.hoofdvestiging.rsin // empty')

# Vestigingsnummer (12-digit branch number)
KVK_VESTIGINGSNUMMER=$(echo "$KVK_RESPONSE" | jq -r '._embedded.hoofdvestiging.vestigingsnummer // empty')

# Legal form
RECHTSVORM=$(echo "$KVK_RESPONSE" | jq -r '._embedded.eigenaar.rechtsvorm // empty')
LEGAL_FORM=$(echo "$KVK_RESPONSE" | jq -r '._embedded.eigenaar.uitgebreideRechtsvorm // ._embedded.eigenaar.rechtsvorm // empty')

# Registration dates
FORMAL_REG_DATE=$(echo "$KVK_RESPONSE" | jq -r '.formeleRegistratiedatum // empty')
MATERIAL_START_DATE=$(echo "$KVK_RESPONSE" | jq -r '.materieleRegistratie.datumAanvang // empty')
MATERIAL_END_DATE=$(echo "$KVK_RESPONSE" | jq -r '.materieleRegistratie.datumEinde // empty')

# Employee counts
TOTAL_EMPLOYEES=$(echo "$KVK_RESPONSE" | jq -r '.totaalWerkzamePersonen // ._embedded.hoofdvestiging.totaalWerkzamePersonen // empty')
FULLTIME_EMPLOYEES=$(echo "$KVK_RESPONSE" | jq -r '._embedded.hoofdvestiging.voltijdWerkzamePersonen // empty')
PARTTIME_EMPLOYEES=$(echo "$KVK_RESPONSE" | jq -r '._embedded.hoofdvestiging.deeltijdWerkzamePersonen // empty')

# Indicators
IND_HOOFDVESTIGING=$(echo "$KVK_RESPONSE" | jq -r '._embedded.hoofdvestiging.indHoofdvestiging // empty')
IND_COMMERCIELE_VESTIGING=$(echo "$KVK_RESPONSE" | jq -r '._embedded.hoofdvestiging.indCommercieleVestiging // empty')

# Primary trade name
PRIMARY_TRADE_NAME=$(echo "$KVK_RESPONSE" | jq -r '._embedded.hoofdvestiging.eersteHandelsnaam // .handelsnamen[0].naam // empty')

# Trade names (as JSON array)
TRADE_NAMES=$(echo "$KVK_RESPONSE" | jq -c '.handelsnamen // []')

# SBI Activities (as JSON array)
SBI_ACTIVITIES=$(echo "$KVK_RESPONSE" | jq -c '.sbiActiviteiten // []')

# Addresses from hoofdvestiging (as JSON array)
ADDRESSES=$(echo "$KVK_RESPONSE" | jq -c '._embedded.hoofdvestiging.adressen // []')

# Owner addresses (as JSON array)
OWNER_ADDRESSES=$(echo "$KVK_RESPONSE" | jq -c '._embedded.eigenaar.adressen // []')

# Websites
WEBSITES=$(echo "$KVK_RESPONSE" | jq -c '._embedded.hoofdvestiging.websites // []')
OWNER_WEBSITES=$(echo "$KVK_RESPONSE" | jq -c '._embedded.eigenaar.websites // []')

# GeoData (if available)
GEO_DATA=$(echo "$KVK_RESPONSE" | jq -c '._embedded.hoofdvestiging.adressen[0].geoData // null')

# Display extracted data
echo -e "${GREEN}  === Core Identifiers ===${NC}"
echo -e "${GREEN}  Company Name:       ${KVK_NAAM}${NC}"
echo -e "${GREEN}  Statutory Name:     ${STATUTORY_NAME:-Not registered}${NC}"
echo -e "${GREEN}  RSIN:               ${RSIN:-NOT FOUND}${NC}"
echo -e "${GREEN}  Vestigingsnummer:   ${KVK_VESTIGINGSNUMMER:-Not found}${NC}"

echo -e "${GREEN}  === Legal Form ===${NC}"
echo -e "${GREEN}  Rechtsvorm:         ${RECHTSVORM:-Unknown}${NC}"
echo -e "${GREEN}  Extended Form:      ${LEGAL_FORM}${NC}"

echo -e "${GREEN}  === Registration Dates ===${NC}"
echo -e "${GREEN}  Formal Reg Date:    ${FORMAL_REG_DATE}${NC}"
echo -e "${GREEN}  Material Start:     ${MATERIAL_START_DATE:-Unknown}${NC}"
echo -e "${GREEN}  Material End:       ${MATERIAL_END_DATE:-Active}${NC}"

echo -e "${GREEN}  === Employees ===${NC}"
echo -e "${GREEN}  Total:              ${TOTAL_EMPLOYEES:-Unknown}${NC}"
echo -e "${GREEN}  Full-time:          ${FULLTIME_EMPLOYEES:-Unknown}${NC}"
echo -e "${GREEN}  Part-time:          ${PARTTIME_EMPLOYEES:-Unknown}${NC}"

echo -e "${GREEN}  === Indicators ===${NC}"
echo -e "${GREEN}  Non-Mailing:        ${IND_NON_MAILING:-Unknown}${NC}"
echo -e "${GREEN}  Main Branch:        ${IND_HOOFDVESTIGING:-Unknown}${NC}"
echo -e "${GREEN}  Commercial:         ${IND_COMMERCIELE_VESTIGING:-Unknown}${NC}"

echo -e "${GREEN}  === Trade Names ===${NC}"
echo -e "${GREEN}  Primary:            ${PRIMARY_TRADE_NAME}${NC}"

if [ -z "$RSIN" ]; then
    echo -e "${RED}WARNING: RSIN not found in KVK response!${NC}"
    echo -e "${YELLOW}  This may be a sole proprietorship (eenmanszaak) which uses BSN instead${NC}"
fi

if [ -n "$MATERIAL_END_DATE" ]; then
    echo -e "${RED}WARNING: Company has end date: ${MATERIAL_END_DATE}${NC}"
    echo -e "${RED}  This company may be dissolved!${NC}"
fi
echo ""

# ============================================================================
# Step 2b: Fetch branch list (vestigingen)
# ============================================================================
echo -e "${YELLOW}Step 2b: Fetching branch list...${NC}"

BRANCHES_RESPONSE=$(curl -s -X GET \
    "https://api.kvk.nl/api/v1/basisprofielen/${KVK_NUMBER}/vestigingen" \
    -H "apikey: ${KVK_API_KEY}" \
    -H "Accept: application/json")

echo "$BRANCHES_RESPONSE" > "$OUTPUT_DIR/kvk_branches_response.json"

TOTAL_BRANCHES=$(echo "$BRANCHES_RESPONSE" | jq -r '.totaalAantalVestigingen // 0')
COMMERCIAL_BRANCHES=$(echo "$BRANCHES_RESPONSE" | jq -r '.aantalCommercieleVestigingen // 0')
NON_COMMERCIAL_BRANCHES=$(echo "$BRANCHES_RESPONSE" | jq -r '.aantalNietCommercieleVestigingen // 0')

echo -e "${GREEN}  Total Branches:        ${TOTAL_BRANCHES}${NC}"
echo -e "${GREEN}  Commercial Branches:   ${COMMERCIAL_BRANCHES}${NC}"
echo -e "${GREEN}  Non-commercial:        ${NON_COMMERCIAL_BRANCHES}${NC}"
echo ""

# ============================================================================
# Step 3: Generate derived identifiers
# ============================================================================
echo -e "${YELLOW}Step 3: Generating derived identifiers...${NC}"

# EUID: European Unique Identifier (from KVK)
EUID_VALUE="NL.KVK.${KVK_NUMBER}"
echo -e "${GREEN}  EUID: ${EUID_VALUE}${NC}"

# EORI: Economic Operators Registration and Identification (from RSIN)
if [ -n "$RSIN" ]; then
    # RSIN is already 9 digits, just use it directly
    # Strip leading zeros for numeric padding, then re-pad (handles 001671248 -> NL001671248)
    RSIN_NUMERIC=$(echo "$RSIN" | sed 's/^0*//')
    RSIN_PADDED=$(printf "%09d" "$RSIN_NUMERIC")
    EORI_VALUE="NL${RSIN_PADDED}"
    echo -e "${GREEN}  EORI: ${EORI_VALUE} (generated from RSIN)${NC}"
else
    EORI_VALUE=""
    echo -e "${YELLOW}  EORI: Cannot generate (RSIN not available)${NC}"
fi

# VAT: Dutch VAT number (extracted from Peppol ID scheme 9944)
# Peppol ID 9944:nl001671248b03 -> VAT NL001671248B03
PEPPOL_VALUE=$(echo "$PEPPOL_ID" | cut -d':' -f2)
VAT_VALUE=$(echo "$PEPPOL_VALUE" | tr '[:lower:]' '[:upper:]')
echo -e "${GREEN}  VAT: ${VAT_VALUE} (from Peppol ID)${NC}"
echo ""

# ============================================================================
# Step 4: Check GLEIF for LEI
# ============================================================================
echo -e "${YELLOW}Step 4: Checking GLEIF for LEI...${NC}"

# Search by name (fuzzy match) - 15 second timeout
GLEIF_RESPONSE=$(curl -s --max-time 15 -X GET \
    "https://api.gleif.org/api/v1/lei-records?filter[entity.legalName]=DHL%20Freight%20Netherlands" \
    -H "Accept: application/json" 2>/dev/null || echo '{"data":[]}')

# Save raw response
echo "$GLEIF_RESPONSE" > "$OUTPUT_DIR/gleif_response.json"

LEI_COUNT=$(echo "$GLEIF_RESPONSE" | jq '.data | length')

if [ "$LEI_COUNT" -gt 0 ]; then
    LEI=$(echo "$GLEIF_RESPONSE" | jq -r '.data[0].id')
    LEI_NAME=$(echo "$GLEIF_RESPONSE" | jq -r '.data[0].attributes.entity.legalName.name')
    echo -e "${GREEN}  LEI Found: ${LEI}${NC}"
    echo -e "${GREEN}  LEI Name: ${LEI_NAME}${NC}"
else
    LEI=""
    echo -e "${YELLOW}  LEI: NOT FOUND in GLEIF database${NC}"
    echo -e "${YELLOW}  Note: DHL Freight (Netherlands) B.V. does not have an LEI registered${NC}"
fi
echo ""

# ============================================================================
# Step 5: Fetch Peppol Directory data
# ============================================================================
echo -e "${YELLOW}Step 5: Fetching Peppol Directory data...${NC}"

# Peppol Directory API (public) - 15 second timeout
PEPPOL_RESPONSE=$(curl -s --max-time 15 -X GET \
    "https://directory.peppol.eu/search/1.0/json?participant=iso6523-actorid-upis%3A%3A${PEPPOL_ID}" \
    -H "Accept: application/json" 2>/dev/null || echo '{"matches":[]}')

# Save raw response
echo "$PEPPOL_RESPONSE" > "$OUTPUT_DIR/peppol_response.json"

PEPPOL_MATCH_COUNT=$(echo "$PEPPOL_RESPONSE" | jq '.matches[0].participantID | length // 0')

if [ "$PEPPOL_MATCH_COUNT" -gt 0 ] || echo "$PEPPOL_RESPONSE" | jq -e '.matches[0]' > /dev/null 2>&1; then
    PEPPOL_NAME=$(echo "$PEPPOL_RESPONSE" | jq -r '.matches[0].entities[0].name[0].name // empty')
    PEPPOL_COUNTRY=$(echo "$PEPPOL_RESPONSE" | jq -r '.matches[0].entities[0].countryCode // empty')
    echo -e "${GREEN}  Peppol participant verified${NC}"
    echo -e "${GREEN}  Name: ${PEPPOL_NAME:-Not available}${NC}"
    echo -e "${GREEN}  Country: ${PEPPOL_COUNTRY:-NL}${NC}"
else
    echo -e "${YELLOW}  Peppol: Participant not found or API unavailable${NC}"
fi
echo ""

# ============================================================================
# Step 6: Validate VAT via VIES (EU VAT Information Exchange System)
# ============================================================================
echo -e "${YELLOW}Step 6: Validating VAT via VIES...${NC}"

# VIES expects VAT number WITHOUT country prefix
# VAT_VALUE is NL001671248B03 -> we need 001671248B03
VAT_NUMBER_ONLY=$(echo "$VAT_VALUE" | sed 's/^[A-Z]\{2\}//')
COUNTRY_CODE="NL"

echo -e "${CYAN}  Calling VIES API: country=$COUNTRY_CODE, vat=$VAT_NUMBER_ONLY${NC}"

VIES_RESPONSE=$(curl -s --max-time 15 -X GET \
    "https://ec.europa.eu/taxation_customs/vies/rest-api/ms/${COUNTRY_CODE}/vat/${VAT_NUMBER_ONLY}" \
    -H "Accept: application/json" 2>/dev/null || echo '{"isValid":false,"userError":"SERVICE_UNAVAILABLE"}')

# Save raw response
echo "$VIES_RESPONSE" > "$OUTPUT_DIR/vies_response.json"

VIES_VALID=$(echo "$VIES_RESPONSE" | jq -r '.isValid // false')
VIES_NAME=$(echo "$VIES_RESPONSE" | jq -r '.name // empty')
VIES_ADDRESS=$(echo "$VIES_RESPONSE" | jq -r '.address // empty')
VIES_REQUEST_DATE=$(echo "$VIES_RESPONSE" | jq -r '.requestDate // empty')
VIES_USER_ERROR=$(echo "$VIES_RESPONSE" | jq -r '.userError // empty')

if [ "$VIES_VALID" = "true" ]; then
    echo -e "${GREEN}  VIES Validation: VALID${NC}"
    echo -e "${GREEN}  Trader Name: ${VIES_NAME}${NC}"
    echo -e "${GREEN}  Address: $(echo "$VIES_ADDRESS" | tr '\n' ' ')${NC}"
    echo -e "${GREEN}  Request Date: ${VIES_REQUEST_DATE}${NC}"
    VIES_FULL_VAT="${COUNTRY_CODE}${VAT_NUMBER_ONLY}"
else
    echo -e "${RED}  VIES Validation: INVALID or UNAVAILABLE${NC}"
    echo -e "${RED}  Error: ${VIES_USER_ERROR}${NC}"
    VIES_FULL_VAT=""
fi
echo ""

# ============================================================================
# Step 7: Display summary
# ============================================================================
echo -e "${BLUE}============================================================${NC}"
echo -e "${BLUE}  SUMMARY: Identifiers to be stored${NC}"
echo -e "${BLUE}============================================================${NC}"
echo -e "  Company Name:    ${COMPANY_NAME}"
echo -e "  KVK:             ${KVK_NUMBER}"
echo -e "  Vestigingsnr:    ${VESTIGINGSNR}"
echo -e "  RSIN:            ${RSIN:-NOT AVAILABLE}"
echo -e "  EUID:            ${EUID_VALUE}"
echo -e "  VAT:             ${VAT_VALUE}"
echo -e "  VIES:            ${VIES_FULL_VAT:-NOT VALIDATED}"
echo -e "  EORI:            ${EORI_VALUE:-NOT AVAILABLE (requires RSIN)}"
echo -e "  Peppol ID:       ${PEPPOL_ID}"
echo -e "  LEI:             ${LEI:-NOT REGISTERED}"
echo -e "  Managing Dir:    ${MANAGING_DIRECTOR}"
echo -e "${BLUE}============================================================${NC}"
echo ""

# ============================================================================
# Step 8: Generate SQL with actual values
# ============================================================================
echo -e "${YELLOW}Step 8: Generating SQL script with fetched data...${NC}"

SQL_FILE="$OUTPUT_DIR/insert_dhl_freight.sql"

cat > "$SQL_FILE" << EOSQL
-- ============================================================================
-- AUTO-GENERATED SQL: DHL Freight Netherlands BV
-- Generated: $(date -u +"%Y-%m-%d %H:%M:%S UTC")
-- Data fetched from: KVK API, GLEIF API, Peppol Directory
-- ============================================================================

BEGIN;

DO \$\$
DECLARE
    v_party_id UUID;
    v_legal_entity_id UUID;
    v_member_id UUID;
BEGIN
    -- Generate UUIDs
    v_party_id := gen_random_uuid();
    v_legal_entity_id := gen_random_uuid();
    v_member_id := gen_random_uuid();

    -- ========================================================================
    -- Insert party_reference
    -- ========================================================================
    INSERT INTO party_reference (
        party_id,
        party_class,
        party_type,
        created_by
    ) VALUES (
        v_party_id,
        'LegalEntity',
        'Company',
        'onboarding_script'
    );

    RAISE NOTICE 'Created party_reference: %', v_party_id;

    -- ========================================================================
    -- Insert legal_entity
    -- ========================================================================
    INSERT INTO legal_entity (
        legal_entity_id,
        party_id,
        primary_legal_name,
        entity_legal_form,
        domain,
        country_code,
        status,
        membership_level,
        authentication_tier,
        authentication_method,
        created_by
    ) VALUES (
        v_legal_entity_id,
        v_party_id,
        '${COMPANY_NAME}',
        '${LEGAL_FORM:-B.V.}',
        'dhl.com',
        'NL',
        'ACTIVE',
        'PREMIUM',
        2,
        'DNS',  -- Valid: eHerkenning, DNS, EmailVerification
        'onboarding_script'
    );

    RAISE NOTICE 'Created legal_entity: %', v_legal_entity_id;

    -- ========================================================================
    -- Insert member record
    -- ========================================================================
    INSERT INTO members (
        id,
        org_id,
        legal_entity_id,
        email,
        metadata
    ) VALUES (
        v_member_id,
        'DHL-FREIGHT-NL',
        v_legal_entity_id,
        'info@dhl.com',
        jsonb_build_object(
            'onboarded_via', 'script',
            'onboarded_at', NOW(),
            'company_type', 'logistics',
            'sector', 'freight_forwarding'
        )
    );

    RAISE NOTICE 'Created member: %', v_member_id;

    -- ========================================================================
    -- Insert KVK identifier
    -- ========================================================================
    INSERT INTO legal_entity_number (
        legal_entity_id,
        identifier_type,
        identifier_value,
        country_code,
        registry_name,
        registry_url,
        issuing_authority,
        validation_status,
        verification_status,
        created_by
    ) VALUES (
        v_legal_entity_id,
        'KVK',
        '${KVK_NUMBER}',
        'NL',
        'Kamer van Koophandel',
        'https://www.kvk.nl',
        'KvK Netherlands',
        'VERIFIED',
        'VERIFIED',
        'onboarding_script'
    );

    -- ========================================================================
    -- Insert EUID identifier
    -- ========================================================================
    INSERT INTO legal_entity_number (
        legal_entity_id,
        identifier_type,
        identifier_value,
        country_code,
        registry_name,
        registry_url,
        issuing_authority,
        validation_status,
        verification_status,
        created_by
    ) VALUES (
        v_legal_entity_id,
        'EUID',
        '${EUID_VALUE}',
        'NL',
        'Business Registers Interconnection System (BRIS)',
        'https://e-justice.europa.eu/489/EN/business_registers',
        'European Commission',
        'VERIFIED',
        'VERIFIED',
        'onboarding_script'
    );

    -- ========================================================================
    -- Insert VAT identifier
    -- ========================================================================
    INSERT INTO legal_entity_number (
        legal_entity_id,
        identifier_type,
        identifier_value,
        country_code,
        registry_name,
        registry_url,
        issuing_authority,
        validation_status,
        verification_status,
        created_by
    ) VALUES (
        v_legal_entity_id,
        'VAT',
        '${VAT_VALUE}',
        'NL',
        'Belastingdienst (Dutch Tax Authority)',
        'https://ec.europa.eu/taxation_customs/vies',
        'Dutch Tax Authority',
        'VERIFIED',
        'VERIFIED',
        'onboarding_script'
    );
EOSQL

# Add RSIN if available (valid identifier type after migration 035)
if [ -n "$RSIN" ]; then
cat >> "$SQL_FILE" << EOSQL

    -- ========================================================================
    -- Insert RSIN identifier (fetched from KVK API)
    -- ========================================================================
    INSERT INTO legal_entity_number (
        legal_entity_id,
        identifier_type,
        identifier_value,
        country_code,
        registry_name,
        registry_url,
        issuing_authority,
        validation_status,
        verification_status,
        created_by
    ) VALUES (
        v_legal_entity_id,
        'RSIN',
        '${RSIN}',
        'NL',
        'Kamer van Koophandel (via KVK API)',
        'https://www.kvk.nl',
        'KvK Netherlands',
        'VERIFIED',
        'VERIFIED',
        'onboarding_script'
    );
EOSQL
fi

# Add EORI if available
if [ -n "$EORI_VALUE" ]; then
cat >> "$SQL_FILE" << EOSQL

    -- ========================================================================
    -- Insert EORI identifier (generated from RSIN)
    -- ========================================================================
    INSERT INTO legal_entity_number (
        legal_entity_id,
        identifier_type,
        identifier_value,
        country_code,
        registry_name,
        registry_url,
        issuing_authority,
        validation_status,
        verification_status,
        created_by
    ) VALUES (
        v_legal_entity_id,
        'EORI',
        '${EORI_VALUE}',
        'NL',
        'EU EORI Validation System',
        'https://ec.europa.eu/taxation_customs/dds2/eos/eori_validation.jsp',
        'Dutch Customs (Douane)',
        'PENDING',  -- validation_status: VERIFIED, PENDING, INVALID
        'PENDING',  -- verification_status: PENDING, VERIFIED, FAILED, EXPIRED
        'onboarding_script'
    );
EOSQL
fi

# Add LEI if available
if [ -n "$LEI" ]; then
cat >> "$SQL_FILE" << EOSQL

    -- ========================================================================
    -- Insert LEI identifier (fetched from GLEIF)
    -- ========================================================================
    INSERT INTO legal_entity_number (
        legal_entity_id,
        identifier_type,
        identifier_value,
        country_code,
        registry_name,
        registry_url,
        issuing_authority,
        validation_status,
        verification_status,
        created_by
    ) VALUES (
        v_legal_entity_id,
        'LEI',
        '${LEI}',
        'NL',
        'Global Legal Entity Identifier Foundation (GLEIF)',
        'https://www.gleif.org',
        'GLEIF',
        'VERIFIED',
        'VERIFIED',
        'onboarding_script'
    );
EOSQL
fi

# Add Peppol identifier (valid identifier type after migration 035)
# Full Peppol data is also stored in peppol_registry_data table
cat >> "$SQL_FILE" << EOSQL

    -- ========================================================================
    -- Insert PEPPOL identifier
    -- ========================================================================
    INSERT INTO legal_entity_number (
        legal_entity_id,
        identifier_type,
        identifier_value,
        country_code,
        registry_name,
        registry_url,
        issuing_authority,
        validation_status,
        verification_status,
        created_by
    ) VALUES (
        v_legal_entity_id,
        'PEPPOL',
        '${PEPPOL_ID}',
        'NL',
        'Peppol Directory',
        'https://directory.peppol.eu',
        'OpenPeppol AISBL',
        'VERIFIED',
        'VERIFIED',
        'onboarding_script'
    );
EOSQL

# Add VIES identifier if validated
if [ -n "$VIES_FULL_VAT" ]; then
cat >> "$SQL_FILE" << EOSQL

    -- ========================================================================
    -- Insert VIES identifier (validated via EU VIES API)
    -- ========================================================================
    INSERT INTO legal_entity_number (
        legal_entity_id,
        identifier_type,
        identifier_value,
        country_code,
        registry_name,
        registry_url,
        issuing_authority,
        validation_status,
        verification_status,
        created_by
    ) VALUES (
        v_legal_entity_id,
        'VIES',
        '${VIES_FULL_VAT}',
        '${COUNTRY_CODE}',
        'EU VIES System',
        'https://ec.europa.eu/taxation_customs/vies',
        'European Commission',
        'VERIFIED',
        'VERIFIED',
        'onboarding_script'
    );

    -- ========================================================================
    -- Insert VIES registry data (full validation response)
    -- ========================================================================
    INSERT INTO vies_registry_data (
        legal_entity_id,
        country_code,
        vat_number,
        full_vat_number,
        is_valid,
        user_error,
        request_date,
        trader_name,
        trader_address,
        raw_api_response,
        fetched_at,
        data_source,
        created_by
    ) VALUES (
        v_legal_entity_id,
        '${COUNTRY_CODE}',
        '${VAT_NUMBER_ONLY}',
        '${VIES_FULL_VAT}',
        true,
        '${VIES_USER_ERROR}',
        '${VIES_REQUEST_DATE}'::timestamptz,
        '${VIES_NAME}',
        '$(echo "$VIES_ADDRESS" | sed "s/'/''/g")',
        '$(echo "$VIES_RESPONSE" | jq -c .)',
        NOW(),
        'vies_ec_europa',
        'onboarding_script'
    );
EOSQL
fi

cat >> "$SQL_FILE" << EOSQL

    -- ========================================================================
    -- Insert primary contact
    -- ========================================================================
    INSERT INTO legal_entity_contact (
        legal_entity_id,
        contact_type,
        full_name,
        first_name,
        last_name,
        job_title,
        email,
        is_primary,
        is_active,
        preferred_language,
        created_by
    ) VALUES (
        v_legal_entity_id,
        'PRIMARY',
        '${MANAGING_DIRECTOR}',
        'Lisette',
        'Nap',
        'Managing Director',
        'lisette.nap@dhl.com',
        true,
        true,
        'nl',
        'onboarding_script'
    );

    -- ========================================================================
    -- Insert KVK registry data (ALL FIELDS from API)
    -- Based on migration 034_expand_kvk_registry_data.sql
    -- ========================================================================
    INSERT INTO kvk_registry_data (
        legal_entity_id,
        kvk_number,
        company_name,
        -- New fields from migration 034
        statutory_name,
        ind_non_mailing,
        vestigingsnummer,
        rsin,
        rechtsvorm,
        legal_form,
        formal_registration_date,
        material_registration_date,
        material_end_date,
        total_employees,
        fulltime_employees,
        parttime_employees,
        ind_hoofdvestiging,
        ind_commerciele_vestiging,
        primary_trade_name,
        trade_names,
        sbi_activities,
        addresses,
        owner_addresses,
        websites,
        owner_websites,
        geo_data,
        total_branches,
        commercial_branches,
        non_commercial_branches,
        raw_api_response,
        fetched_at,
        data_source,
        created_by
    ) VALUES (
        v_legal_entity_id,
        '${KVK_NUMBER}',
        '${KVK_NAAM}',
        -- New fields
        $([ -n "$STATUTORY_NAME" ] && echo "'${STATUTORY_NAME}'" || echo "NULL"),
        $([ -n "$IND_NON_MAILING" ] && echo "'${IND_NON_MAILING}'" || echo "NULL"),
        $([ -n "$KVK_VESTIGINGSNUMMER" ] && echo "'${KVK_VESTIGINGSNUMMER}'" || echo "NULL"),
        $([ -n "$RSIN" ] && echo "'${RSIN}'" || echo "NULL"),
        $([ -n "$RECHTSVORM" ] && echo "'${RECHTSVORM}'" || echo "NULL"),
        $([ -n "$LEGAL_FORM" ] && echo "'${LEGAL_FORM}'" || echo "NULL"),
        $([ -n "$FORMAL_REG_DATE" ] && echo "'${FORMAL_REG_DATE}'" || echo "NULL"),
        $([ -n "$MATERIAL_START_DATE" ] && echo "'${MATERIAL_START_DATE}'" || echo "NULL"),
        $([ -n "$MATERIAL_END_DATE" ] && echo "'${MATERIAL_END_DATE}'" || echo "NULL"),
        $([ -n "$TOTAL_EMPLOYEES" ] && echo "$TOTAL_EMPLOYEES" || echo "NULL"),
        $([ -n "$FULLTIME_EMPLOYEES" ] && echo "$FULLTIME_EMPLOYEES" || echo "NULL"),
        $([ -n "$PARTTIME_EMPLOYEES" ] && echo "$PARTTIME_EMPLOYEES" || echo "NULL"),
        $([ -n "$IND_HOOFDVESTIGING" ] && echo "'${IND_HOOFDVESTIGING}'" || echo "NULL"),
        $([ -n "$IND_COMMERCIELE_VESTIGING" ] && echo "'${IND_COMMERCIELE_VESTIGING}'" || echo "NULL"),
        $([ -n "$PRIMARY_TRADE_NAME" ] && echo "'${PRIMARY_TRADE_NAME}'" || echo "NULL"),
        '${TRADE_NAMES}'::jsonb,
        '${SBI_ACTIVITIES}'::jsonb,
        '${ADDRESSES}'::jsonb,
        '${OWNER_ADDRESSES}'::jsonb,
        '${WEBSITES}'::jsonb,
        '${OWNER_WEBSITES}'::jsonb,
        $([ "$GEO_DATA" != "null" ] && echo "'${GEO_DATA}'::jsonb" || echo "NULL"),
        $([ -n "$TOTAL_BRANCHES" ] && echo "$TOTAL_BRANCHES" || echo "NULL"),
        $([ -n "$COMMERCIAL_BRANCHES" ] && echo "$COMMERCIAL_BRANCHES" || echo "NULL"),
        $([ -n "$NON_COMMERCIAL_BRANCHES" ] && echo "$NON_COMMERCIAL_BRANCHES" || echo "NULL"),
        '$(cat "$OUTPUT_DIR/kvk_response.json" | jq -c .)'::jsonb,
        NOW(),
        'kvk_api',
        'onboarding_script'
    );

    -- ========================================================================
    -- Insert Peppol registry data
    -- ========================================================================
    INSERT INTO peppol_registry_data (
        legal_entity_id,
        participant_id,
        participant_scheme,
        participant_value,
        entity_name,
        country_code,
        registration_date,
        raw_api_response,
        data_source,
        fetched_at,
        created_by
    ) VALUES (
        v_legal_entity_id,
        'iso6523-actorid-upis::${PEPPOL_ID}',
        'iso6523-actorid-upis',
        '${PEPPOL_ID}',
        '${COMPANY_NAME}',
        'NL',
        CURRENT_DATE,
        '$(cat "$OUTPUT_DIR/peppol_response.json" | jq -c .)'::jsonb,
        'peppol_directory',
        NOW(),
        'onboarding_script'
    );

    -- ========================================================================
    -- Output summary
    -- ========================================================================
    RAISE NOTICE '============================================================';
    RAISE NOTICE 'DHL Freight Netherlands BV - Onboarding Complete';
    RAISE NOTICE '============================================================';
    RAISE NOTICE 'party_id:        %', v_party_id;
    RAISE NOTICE 'legal_entity_id: %', v_legal_entity_id;
    RAISE NOTICE 'member_id:       %', v_member_id;
    RAISE NOTICE 'KVK:             ${KVK_NUMBER}';
    RAISE NOTICE 'RSIN:            ${RSIN:-NOT AVAILABLE}';
    RAISE NOTICE 'EUID:            ${EUID_VALUE}';
    RAISE NOTICE 'VAT:             ${VAT_VALUE}';
    RAISE NOTICE 'EORI:            ${EORI_VALUE:-NOT AVAILABLE}';
    RAISE NOTICE 'Peppol:          ${PEPPOL_ID}';
    RAISE NOTICE 'LEI:             ${LEI:-NOT REGISTERED}';
    RAISE NOTICE '============================================================';

END \$\$;

COMMIT;

-- ============================================================================
-- VERIFY: Check the created records
-- ============================================================================
SELECT
    m.id AS member_id,
    m.org_id,
    le.legal_entity_id,
    le.primary_legal_name,
    le.status,
    le.membership_level
FROM members m
JOIN legal_entity le ON m.legal_entity_id = le.legal_entity_id
WHERE le.primary_legal_name LIKE '%DHL Freight%';

-- Check all identifiers
SELECT
    len.identifier_type,
    len.identifier_value,
    len.validation_status
FROM legal_entity_number len
JOIN legal_entity le ON len.legal_entity_id = le.legal_entity_id
WHERE le.primary_legal_name LIKE '%DHL Freight%'
  AND len.is_deleted = false
ORDER BY len.identifier_type;
EOSQL

echo -e "${GREEN}  SQL script generated: ${SQL_FILE}${NC}"
echo ""

# ============================================================================
# Step 8: Ask to execute
# ============================================================================
echo -e "${BLUE}============================================================${NC}"
echo -e "${BLUE}  Ready to execute SQL${NC}"
echo -e "${BLUE}============================================================${NC}"
echo ""
echo -e "To execute the generated SQL against the database:"
echo ""
echo -e "  ${YELLOW}psql \"host=\$POSTGRES_HOST port=5432 dbname=\$POSTGRES_DATABASE user=\$POSTGRES_USER sslmode=require\" -f ${SQL_FILE}${NC}"
echo ""
echo -e "Or review the generated files:"
echo -e "  - KVK response:    ${OUTPUT_DIR}/kvk_response.json"
echo -e "  - GLEIF response:  ${OUTPUT_DIR}/gleif_response.json"
echo -e "  - Peppol response: ${OUTPUT_DIR}/peppol_response.json"
echo -e "  - SQL script:      ${SQL_FILE}"
echo ""

read -p "Execute SQL now? (y/N): " -n 1 -r
echo
if [[ $REPLY =~ ^[Yy]$ ]]; then
    echo -e "${YELLOW}Executing SQL...${NC}"
    # Build connection string using environment variables
    # Note: Requires POSTGRES_HOST, POSTGRES_DATABASE, POSTGRES_USER, POSTGRES_PASSWORD from .credentials
    CONNECTION_STRING="postgresql://${POSTGRES_USER}:${POSTGRES_PASSWORD}@${POSTGRES_HOST}:5432/${POSTGRES_DATABASE}?sslmode=require"
    psql "$CONNECTION_STRING" -f "$SQL_FILE"
    echo -e "${GREEN}Done!${NC}"
else
    echo -e "${YELLOW}SQL not executed. You can run it manually later.${NC}"
fi
