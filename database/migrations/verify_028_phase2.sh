#!/bin/bash
# =====================================================
# Verification Script for Migration 028
# Date: November 13, 2025
# Purpose: Verify Phase 2 schema changes completed successfully
# =====================================================

set -e  # Exit on error

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Database connection details
DB_HOST="${DB_HOST:-psql-ctn-demo-asr-dev.postgres.database.azure.com}"
DB_PORT="${DB_PORT:-5432}"
DB_NAME="${DB_NAME:-asr_dev}"
DB_USER="${DB_USER:-asradmin}"

# Get password from .credentials file
if [ -f ".credentials" ]; then
  export PGPASSWORD=$(grep POSTGRES_PASSWORD .credentials | cut -d= -f2)
elif [ -z "$PGPASSWORD" ]; then
  echo -e "${RED}ERROR: PGPASSWORD not set and .credentials file not found${NC}"
  exit 1
fi

# PostgreSQL connection string
PSQL_CMD="psql -h $DB_HOST -p $DB_PORT -U $DB_USER -d $DB_NAME --set=sslmode=require -t -A"

echo -e "${BLUE}=============================================${NC}"
echo -e "${BLUE}Migration 028 Verification Script${NC}"
echo -e "${BLUE}=============================================${NC}"
echo ""

# Track test results
TOTAL_TESTS=0
PASSED_TESTS=0
FAILED_TESTS=0

# Helper function to run test
run_test() {
  local test_name="$1"
  local test_sql="$2"
  local expected_result="$3"

  TOTAL_TESTS=$((TOTAL_TESTS + 1))
  echo -e "${YELLOW}Test $TOTAL_TESTS: $test_name${NC}"

  result=$($PSQL_CMD -c "$test_sql" 2>&1)
  exit_code=$?

  if [ $exit_code -eq 0 ] && [ "$result" = "$expected_result" ]; then
    echo -e "${GREEN}✓ PASSED${NC}"
    PASSED_TESTS=$((PASSED_TESTS + 1))
    echo ""
    return 0
  else
    echo -e "${RED}✗ FAILED${NC}"
    echo -e "  Expected: $expected_result"
    echo -e "  Got:      $result"
    FAILED_TESTS=$((FAILED_TESTS + 1))
    echo ""
    return 1
  fi
}

# =====================================================
# Test 1: Verify members table structure
# =====================================================

run_test \
  "Members table has 8 columns (duplicate columns removed)" \
  "SELECT COUNT(*) FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'members'" \
  "8"

# =====================================================
# Test 2: Verify legal_name column removed
# =====================================================

run_test \
  "Members table does NOT have legal_name column" \
  "SELECT COUNT(*) FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'members' AND column_name = 'legal_name'" \
  "0"

# =====================================================
# Test 3: Verify domain column removed
# =====================================================

run_test \
  "Members table does NOT have domain column" \
  "SELECT COUNT(*) FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'members' AND column_name = 'domain'" \
  "0"

# =====================================================
# Test 4: Verify status column removed
# =====================================================

run_test \
  "Members table does NOT have status column" \
  "SELECT COUNT(*) FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'members' AND column_name = 'status'" \
  "0"

# =====================================================
# Test 5: Verify membership_level column removed
# =====================================================

run_test \
  "Members table does NOT have membership_level column" \
  "SELECT COUNT(*) FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'members' AND column_name = 'membership_level'" \
  "0"

# =====================================================
# Test 6: Verify lei column removed
# =====================================================

run_test \
  "Members table does NOT have lei column" \
  "SELECT COUNT(*) FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'members' AND column_name = 'lei'" \
  "0"

# =====================================================
# Test 7: Verify kvk column removed
# =====================================================

run_test \
  "Members table does NOT have kvk column" \
  "SELECT COUNT(*) FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'members' AND column_name = 'kvk'" \
  "0"

# =====================================================
# Test 8: Verify UNIQUE constraint on legal_entity_id
# =====================================================

run_test \
  "UNIQUE index uq_members_legal_entity_id exists" \
  "SELECT COUNT(*) FROM pg_indexes WHERE schemaname = 'public' AND indexname = 'uq_members_legal_entity_id'" \
  "1"

# =====================================================
# Test 9: Verify legal_entity_id is NOT NULL
# =====================================================

run_test \
  "legal_entity_id column is NOT NULL" \
  "SELECT is_nullable FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'members' AND column_name = 'legal_entity_id'" \
  "NO"

# =====================================================
# Test 10: Verify v_members_full view exists
# =====================================================

run_test \
  "View v_members_full exists" \
  "SELECT COUNT(*) FROM pg_views WHERE schemaname = 'public' AND viewname = 'v_members_full'" \
  "1"

# =====================================================
# Test 11: Verify v_members_list view exists
# =====================================================

run_test \
  "View v_members_list exists" \
  "SELECT COUNT(*) FROM pg_views WHERE schemaname = 'public' AND viewname = 'v_members_list'" \
  "1"

# =====================================================
# Test 12: Verify v_members_full has legal_name column
# =====================================================

run_test \
  "View v_members_full has legal_name column (backward compatibility)" \
  "SELECT COUNT(*) FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'v_members_full' AND column_name = 'legal_name'" \
  "1"

# =====================================================
# Test 13: Verify v_members_full has domain column
# =====================================================

run_test \
  "View v_members_full has domain column (backward compatibility)" \
  "SELECT COUNT(*) FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'v_members_full' AND column_name = 'domain'" \
  "1"

# =====================================================
# Test 14: Verify CHECK constraint on org_id format
# =====================================================

run_test \
  "CHECK constraint chk_members_org_id_format exists" \
  "SELECT COUNT(*) FROM information_schema.constraint_column_usage WHERE table_schema = 'public' AND table_name = 'members' AND constraint_name = 'chk_members_org_id_format'" \
  "1"

# =====================================================
# Test 15: Verify CHECK constraint on email format
# =====================================================

run_test \
  "CHECK constraint chk_members_email_format exists" \
  "SELECT COUNT(*) FROM information_schema.constraint_column_usage WHERE table_schema = 'public' AND table_name = 'members' AND constraint_name = 'chk_members_email_format'" \
  "1"

# =====================================================
# Test 16: Verify backup table exists
# =====================================================

run_test \
  "Backup table members_backup_20251113 exists" \
  "SELECT COUNT(*) FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'members_backup_20251113'" \
  "1"

# =====================================================
# Test 17: Verify no duplicate members per legal_entity
# =====================================================

run_test \
  "No duplicate members records per legal_entity_id" \
  "SELECT COUNT(*) FROM (SELECT legal_entity_id, COUNT(*) as cnt FROM members GROUP BY legal_entity_id HAVING COUNT(*) > 1) duplicates" \
  "0"

# =====================================================
# Test 18: Verify table comments exist
# =====================================================

run_test \
  "Table members has comment (documentation)" \
  "SELECT CASE WHEN obj_description('public.members'::regclass) IS NULL THEN 0 ELSE 1 END" \
  "1"

run_test \
  "Table legal_entity has comment (documentation)" \
  "SELECT CASE WHEN obj_description('public.legal_entity'::regclass) IS NULL THEN 0 ELSE 1 END" \
  "1"

run_test \
  "Table party_reference has comment (documentation)" \
  "SELECT CASE WHEN obj_description('public.party_reference'::regclass) IS NULL THEN 0 ELSE 1 END" \
  "1"

# =====================================================
# Test 19: Verify view returns data
# =====================================================

echo -e "${YELLOW}Test 22: View v_members_full returns data${NC}"
view_count=$($PSQL_CMD -c "SELECT COUNT(*) FROM v_members_full" 2>&1)
members_count=$($PSQL_CMD -c "SELECT COUNT(*) FROM members" 2>&1)

TOTAL_TESTS=$((TOTAL_TESTS + 1))

if [ "$view_count" = "$members_count" ]; then
  echo -e "${GREEN}✓ PASSED${NC}"
  echo -e "  View returns $view_count rows (matches members table)"
  PASSED_TESTS=$((PASSED_TESTS + 1))
  echo ""
else
  echo -e "${RED}✗ FAILED${NC}"
  echo -e "  View returns $view_count rows, expected $members_count"
  FAILED_TESTS=$((FAILED_TESTS + 1))
  echo ""
fi

# =====================================================
# Test 20: Verify view columns match expected structure
# =====================================================

echo -e "${YELLOW}Test 23: View v_members_full has all expected columns${NC}"
expected_columns="id|org_id|legal_entity_id|azure_ad_object_id|email|created_at|updated_at|member_metadata|legal_name|domain|status|membership_level|authentication_tier|authentication_method|legal_entity_metadata|party_id|lei|kvk|euri|duns|contact_count|endpoint_count"

actual_columns=$($PSQL_CMD -c "SELECT string_agg(column_name, '|' ORDER BY ordinal_position) FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'v_members_full'" 2>&1)

TOTAL_TESTS=$((TOTAL_TESTS + 1))

if [ "$actual_columns" = "$expected_columns" ]; then
  echo -e "${GREEN}✓ PASSED${NC}"
  echo -e "  View has all expected columns"
  PASSED_TESTS=$((PASSED_TESTS + 1))
  echo ""
else
  echo -e "${RED}✗ FAILED${NC}"
  echo -e "  Expected: $expected_columns"
  echo -e "  Got:      $actual_columns"
  FAILED_TESTS=$((FAILED_TESTS + 1))
  echo ""
fi

# =====================================================
# Summary
# =====================================================

echo -e "${BLUE}=============================================${NC}"
echo -e "${BLUE}Verification Summary${NC}"
echo -e "${BLUE}=============================================${NC}"
echo -e "Total Tests:  $TOTAL_TESTS"
echo -e "${GREEN}Passed:       $PASSED_TESTS${NC}"

if [ $FAILED_TESTS -gt 0 ]; then
  echo -e "${RED}Failed:       $FAILED_TESTS${NC}"
  echo ""
  echo -e "${RED}✗ MIGRATION 028 VERIFICATION FAILED${NC}"
  echo -e "${YELLOW}Review failed tests above and check migration script.${NC}"
  exit 1
else
  echo -e "${GREEN}Failed:       0${NC}"
  echo ""
  echo -e "${GREEN}=============================================${NC}"
  echo -e "${GREEN}✓ ALL TESTS PASSED!${NC}"
  echo -e "${GREEN}Migration 028 completed successfully.${NC}"
  echo -e "${GREEN}=============================================${NC}"
  echo ""
  echo -e "${BLUE}Next Steps:${NC}"
  echo -e "1. Test API endpoints (see API_QUERY_REVIEW_PHASE2.md)"
  echo -e "2. Test frontend portals (member list, detail pages)"
  echo -e "3. Update SCHEMA_ISSUES_SUMMARY.md with Phase 2 completion"
  echo -e "4. Regenerate current_schema.sql:"
  echo -e "   ${YELLOW}pg_dump --schema-only --no-owner --no-acl -h $DB_HOST -p $DB_PORT -U $DB_USER -d $DB_NAME > database/current_schema.sql${NC}"
  exit 0
fi
