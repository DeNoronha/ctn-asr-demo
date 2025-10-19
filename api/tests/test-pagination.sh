#!/bin/bash
# Test script for pagination functionality
# Tests the GetMembers endpoint with various pagination parameters

API_URL="${API_URL:-https://func-ctn-demo-asr-dev.azurewebsites.net/api/v1}"

echo "================================"
echo "Testing Pagination - GetMembers"
echo "================================"
echo "API URL: $API_URL"
echo ""

# Test 1: Default pagination (should return page 1, limit 50)
echo "Test 1: Default pagination (no parameters)"
echo "-------------------------------------------"
RESPONSE=$(curl -s "$API_URL/all-members")
TOTAL=$(echo "$RESPONSE" | jq -r '.pagination.totalItems // .pagination.total // "N/A"')
PAGE=$(echo "$RESPONSE" | jq -r '.pagination.page // "N/A"')
PAGE_SIZE=$(echo "$RESPONSE" | jq -r '.pagination.pageSize // .pagination.page_size // "N/A"')
DATA_COUNT=$(echo "$RESPONSE" | jq -r '.data | length')

echo "Total Items: $TOTAL"
echo "Current Page: $PAGE"
echo "Page Size: $PAGE_SIZE"
echo "Items Returned: $DATA_COUNT"
echo ""

# Test 2: Page 1, limit 10
echo "Test 2: Page 1 with limit 10"
echo "------------------------------"
RESPONSE=$(curl -s "$API_URL/all-members?page=1&limit=10")
TOTAL=$(echo "$RESPONSE" | jq -r '.pagination.totalItems // .pagination.total // "N/A"')
PAGE=$(echo "$RESPONSE" | jq -r '.pagination.page // "N/A"')
PAGE_SIZE=$(echo "$RESPONSE" | jq -r '.pagination.pageSize // .pagination.page_size // "N/A"')
DATA_COUNT=$(echo "$RESPONSE" | jq -r '.data | length')

echo "Total Items: $TOTAL"
echo "Current Page: $PAGE"
echo "Page Size: $PAGE_SIZE"
echo "Items Returned: $DATA_COUNT"
echo ""

# Test 3: Page 2, limit 10
echo "Test 3: Page 2 with limit 10"
echo "------------------------------"
RESPONSE=$(curl -s "$API_URL/all-members?page=2&limit=10")
TOTAL=$(echo "$RESPONSE" | jq -r '.pagination.totalItems // .pagination.total // "N/A"')
PAGE=$(echo "$RESPONSE" | jq -r '.pagination.page // "N/A"')
PAGE_SIZE=$(echo "$RESPONSE" | jq -r '.pagination.pageSize // .pagination.page_size // "N/A"')
DATA_COUNT=$(echo "$RESPONSE" | jq -r '.data | length')
FIRST_ORG_ID=$(echo "$RESPONSE" | jq -r '.data[0].org_id // "N/A"')

echo "Total Items: $TOTAL"
echo "Current Page: $PAGE"
echo "Page Size: $PAGE_SIZE"
echo "Items Returned: $DATA_COUNT"
echo "First org_id: $FIRST_ORG_ID"
echo ""

# Test 4: Page 1, limit 5
echo "Test 4: Page 1 with limit 5"
echo "----------------------------"
RESPONSE=$(curl -s "$API_URL/all-members?page=1&limit=5")
DATA_COUNT=$(echo "$RESPONSE" | jq -r '.data | length')
FIRST_ORG_ID=$(echo "$RESPONSE" | jq -r '.data[0].org_id // "N/A"')

echo "Items Returned: $DATA_COUNT"
echo "First org_id: $FIRST_ORG_ID"
echo ""

# Test 5: Large page size
echo "Test 5: Large page size (limit 100)"
echo "------------------------------------"
RESPONSE=$(curl -s "$API_URL/all-members?page=1&limit=100")
TOTAL=$(echo "$RESPONSE" | jq -r '.pagination.totalItems // .pagination.total // "N/A"')
PAGE_SIZE=$(echo "$RESPONSE" | jq -r '.pagination.pageSize // .pagination.page_size // "N/A"')
DATA_COUNT=$(echo "$RESPONSE" | jq -r '.data | length')

echo "Total Items: $TOTAL"
echo "Page Size: $PAGE_SIZE"
echo "Items Returned: $DATA_COUNT"
echo ""

# Test 6: Pagination metadata validation
echo "Test 6: Pagination metadata validation"
echo "---------------------------------------"
RESPONSE=$(curl -s "$API_URL/all-members?page=1&limit=20")
TOTAL=$(echo "$RESPONSE" | jq -r '.pagination.totalItems // .pagination.total // 0')
PAGE_SIZE=$(echo "$RESPONSE" | jq -r '.pagination.pageSize // .pagination.page_size // 20')

if [ "$TOTAL" -gt 0 ]; then
  EXPECTED_PAGES=$(( ($TOTAL + $PAGE_SIZE - 1) / $PAGE_SIZE ))
  TOTAL_PAGES=$(echo "$RESPONSE" | jq -r '.pagination.totalPages // .pagination.total_pages // "N/A"')
  HAS_NEXT=$(echo "$RESPONSE" | jq -r '.pagination.hasNextPage // .pagination.has_next_page // "N/A"')
  HAS_PREV=$(echo "$RESPONSE" | jq -r '.pagination.hasPreviousPage // .pagination.has_previous_page // "N/A"')

  echo "Total Items: $TOTAL"
  echo "Page Size: $PAGE_SIZE"
  echo "Expected Total Pages: $EXPECTED_PAGES"
  echo "Actual Total Pages: $TOTAL_PAGES"
  echo "Has Next Page: $HAS_NEXT"
  echo "Has Previous Page: $HAS_PREV"

  if [ "$TOTAL_PAGES" = "$EXPECTED_PAGES" ]; then
    echo "✓ Total pages calculation is correct"
  else
    echo "✗ Total pages calculation mismatch"
  fi
else
  echo "⚠ No data available to test pagination"
fi
echo ""

# Test 7: Invalid pagination parameters
echo "Test 7: Invalid pagination parameters"
echo "--------------------------------------"
echo "Testing page=0 (should default to 1):"
RESPONSE=$(curl -s "$API_URL/all-members?page=0&limit=10")
PAGE=$(echo "$RESPONSE" | jq -r '.pagination.page // "N/A"')
echo "  Returned page: $PAGE"

echo "Testing page=-1 (should default to 1):"
RESPONSE=$(curl -s "$API_URL/all-members?page=-1&limit=10")
PAGE=$(echo "$RESPONSE" | jq -r '.pagination.page // "N/A"')
echo "  Returned page: $PAGE"

echo "Testing limit=0 (should default to 50):"
RESPONSE=$(curl -s "$API_URL/all-members?page=1&limit=0")
PAGE_SIZE=$(echo "$RESPONSE" | jq -r '.pagination.pageSize // .pagination.page_size // "N/A"')
echo "  Returned page size: $PAGE_SIZE"

echo ""
echo "================================"
echo "Pagination Tests Complete"
echo "================================"
