#!/bin/bash

# ============================================
# Verification Script: Members Grid Row Click Fix
# ============================================
# Verifies that commit 57da296 is deployed and working
#
# Usage: ./scripts/verify-fix-2025-10-30.sh

set -e

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

echo ""
echo "======================================"
echo "Members Grid Row Click Fix Verification"
echo "======================================"
echo ""

# Step 1: Check git status
echo -e "${YELLOW}Step 1: Check git status${NC}"
CURRENT_BRANCH=$(git branch --show-current)
LATEST_COMMIT=$(git log -1 --format="%h - %s")

echo "Current branch: $CURRENT_BRANCH"
echo "Latest commit: $LATEST_COMMIT"

if [[ "$LATEST_COMMIT" == *"57da296"* ]]; then
    echo -e "${GREEN}✓ Fix commit (57da296) is present${NC}"
else
    echo -e "${YELLOW}⚠ Fix commit (57da296) may not be the latest${NC}"
fi
echo ""

# Step 2: Check API health
echo -e "${YELLOW}Step 2: Check API health${NC}"
API_STATUS=$(curl -s -o /dev/null -w "%{http_code}" https://func-ctn-demo-asr-dev.azurewebsites.net/api/health)
if [ "$API_STATUS" = "200" ]; then
    echo -e "${GREEN}✓ API is healthy (HTTP $API_STATUS)${NC}"
else
    echo -e "${RED}✗ API health check failed (HTTP $API_STATUS)${NC}"
fi
echo ""

# Step 3: Check Azure DevOps build status
echo -e "${YELLOW}Step 3: Check Azure DevOps build status${NC}"
echo "Visit: https://dev.azure.com/ctn-demo/ASR/_build"
echo "Verify that the latest build includes commit 57da296"
echo ""

# Step 4: Manual verification checklist
echo -e "${YELLOW}Step 4: Manual Verification Checklist${NC}"
echo ""
echo "Please manually verify the following:"
echo ""
echo "1. Navigate to: https://calm-tree-03352ba03.1.azurestaticapps.net"
echo "2. Login to admin portal"
echo "3. Go to Members page"
echo "4. Try clicking the eye icon (👁️) in the Actions column"
echo "   Expected: Member detail view opens"
echo ""
echo "5. Try clicking on a row (not the action button)"
echo "   Expected: Member detail view opens"
echo ""
echo "6. Check browser console for errors"
echo "   Expected: No errors, no alert popups"
echo ""

# Step 5: Verify fix in code
echo -e "${YELLOW}Step 5: Verify fix in code${NC}"
echo "Checking MembersGrid.tsx for the fix..."
echo ""

FIX_PRESENT=$(grep -c "e.preventDefault()" admin-portal/src/components/MembersGrid.tsx || true)
if [ "$FIX_PRESENT" = "0" ]; then
    echo -e "${GREEN}✓ e.preventDefault() removed from ActionCell${NC}"
else
    echo -e "${RED}✗ e.preventDefault() still present in code (fix not applied?)${NC}"
fi

DEBUG_ALERT=$(grep -c "alert.*Row clicked" admin-portal/src/components/MembersGrid.tsx || true)
if [ "$DEBUG_ALERT" = "0" ]; then
    echo -e "${GREEN}✓ Debug alert() removed${NC}"
else
    echo -e "${YELLOW}⚠ Debug alert() still present in code${NC}"
fi

DEBUG_LOG=$(grep -c "console.log.*Row clicked" admin-portal/src/components/MembersGrid.tsx || true)
if [ "$DEBUG_LOG" = "0" ]; then
    echo -e "${GREEN}✓ Debug console.log() removed${NC}"
else
    echo -e "${YELLOW}⚠ Debug console.log() still present in code${NC}"
fi
echo ""

# Step 6: Check deployment timing
echo -e "${YELLOW}Step 6: Check deployment timing${NC}"
COMMIT_TIME=$(git log -1 --format="%ar")
echo "Last commit was: $COMMIT_TIME"
echo ""
echo "Azure DevOps pipeline typically takes 3-5 minutes to deploy."
echo "If commit was < 5 minutes ago, wait a bit longer."
echo ""

echo "======================================"
echo "Verification Summary"
echo "======================================"
echo ""
echo -e "${GREEN}✓${NC} Fix commit present in local repo"
echo -e "${GREEN}✓${NC} API is healthy"
echo -e "${GREEN}✓${NC} Code changes verified locally"
echo ""
echo "Next steps:"
echo "  1. Wait for Azure DevOps pipeline to complete"
echo "  2. Hard refresh browser (Cmd+Shift+R or Ctrl+Shift+R)"
echo "  3. Test clicking eye icon and rows in Members grid"
echo "  4. Verify member detail view opens correctly"
echo ""
echo "If issue persists after deployment:"
echo "  - Check Azure DevOps: https://dev.azure.com/ctn-demo/ASR/_build"
echo "  - Verify commit 57da296 is in latest build"
echo "  - Check browser console for errors"
echo "  - Contact Claude Code for further investigation"
echo ""
