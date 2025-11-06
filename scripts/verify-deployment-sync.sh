#!/bin/bash

# Deployment Sync Verification Script
# Ensures changes are committed and deployed to Azure before proceeding
# Usage: ./scripts/verify-deployment-sync.sh [--skip-build-check]

set -e

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_ROOT="$(cd "$SCRIPT_DIR/.." && pwd)"

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

echo -e "${BLUE}═══════════════════════════════════════════════════════════════${NC}"
echo -e "${BLUE}   Deployment Sync Verification${NC}"
echo -e "${BLUE}═══════════════════════════════════════════════════════════════${NC}"
echo ""

cd "$PROJECT_ROOT"

# 1. Verify on main branch
echo -e "${BLUE}[1/5]${NC} Checking current branch..."
CURRENT_BRANCH=$(git branch --show-current)
if [ "$CURRENT_BRANCH" != "main" ]; then
    echo -e "${RED}✗ ERROR: Not on main branch!${NC}"
    echo -e "  Current branch: ${YELLOW}$CURRENT_BRANCH${NC}"
    echo -e "  Run: ${YELLOW}git checkout main${NC}"
    exit 1
fi
echo -e "${GREEN}✓ On main branch${NC}"
echo ""

# 2. Check for uncommitted changes
echo -e "${BLUE}[2/5]${NC} Checking for uncommitted changes..."
if ! git diff-index --quiet HEAD --; then
    echo -e "${RED}✗ ERROR: Uncommitted changes detected!${NC}"
    echo ""
    echo -e "${YELLOW}Modified files:${NC}"
    git status --short
    echo ""
    echo -e "Please commit or stash changes before verifying deployment."
    echo -e "  Run: ${YELLOW}git add -A && git commit -m \"...\" && git push origin main${NC}"
    exit 1
fi
echo -e "${GREEN}✓ No uncommitted changes${NC}"
echo ""

# 3. Get latest local commit
echo -e "${BLUE}[3/5]${NC} Getting latest commit info..."
LATEST_COMMIT=$(git log -1 --format="%h")
COMMIT_TIME=$(git log -1 --format="%ar")
COMMIT_MSG=$(git log -1 --format="%s")
echo -e "  Latest commit: ${GREEN}$LATEST_COMMIT${NC}"
echo -e "  Time: ${YELLOW}$COMMIT_TIME${NC}"
echo -e "  Message: $COMMIT_MSG"
echo ""

# 4. Check if commit is pushed
echo -e "${BLUE}[4/5]${NC} Verifying commit is pushed to remote..."
if ! git branch -r --contains "$LATEST_COMMIT" | grep -q "origin/main"; then
    echo -e "${RED}✗ ERROR: Latest commit not pushed to origin/main!${NC}"
    echo -e "  Run: ${YELLOW}git push origin main${NC}"
    exit 1
fi
echo -e "${GREEN}✓ Commit pushed to origin/main${NC}"
echo ""

# 5. Check Azure DevOps pipeline status (optional)
if [ "$1" != "--skip-build-check" ]; then
    echo -e "${BLUE}[5/5]${NC} Checking Azure DevOps pipeline status..."

    # Try to get latest pipeline run for ASR API
    if command -v az &> /dev/null; then
        LATEST_RUN=$(az pipelines runs list --pipeline-ids 9 --top 1 --output json 2>/dev/null || echo "[]")

        if [ "$LATEST_RUN" != "[]" ]; then
            RUN_STATUS=$(echo "$LATEST_RUN" | grep -o '"status": "[^"]*"' | head -1 | cut -d'"' -f4)
            RUN_RESULT=$(echo "$LATEST_RUN" | grep -o '"result": "[^"]*"' | head -1 | cut -d'"' -f4)
            RUN_TIME=$(echo "$LATEST_RUN" | grep -o '"queueTime": "[^"]*"' | head -1 | cut -d'"' -f4)
            RUN_NUMBER=$(echo "$LATEST_RUN" | grep -o '"buildNumber": "[^"]*"' | head -1 | cut -d'"' -f4)

            echo -e "  Latest pipeline run: ${YELLOW}$RUN_NUMBER${NC}"
            echo -e "  Status: ${YELLOW}$RUN_STATUS${NC}"

            if [ "$RUN_STATUS" = "completed" ]; then
                if [ "$RUN_RESULT" = "succeeded" ]; then
                    echo -e "  Result: ${GREEN}$RUN_RESULT${NC}"
                    echo -e "${GREEN}✓ Pipeline completed successfully${NC}"
                else
                    echo -e "  Result: ${RED}$RUN_RESULT${NC}"
                    echo -e "${YELLOW}⚠ WARNING: Latest pipeline did not succeed${NC}"
                    echo -e "  Check: ${BLUE}https://dev.azure.com/ctn-demo/ASR/_build${NC}"
                fi
            elif [ "$RUN_STATUS" = "inProgress" ]; then
                echo -e "${YELLOW}⚠ Pipeline is currently running${NC}"
                echo -e "  Wait for completion before testing changes"
            else
                echo -e "${YELLOW}⚠ Pipeline status: $RUN_STATUS${NC}"
            fi

            # Calculate time difference
            COMMIT_EPOCH=$(git log -1 --format="%at")
            RUN_EPOCH=$(date -j -f "%Y-%m-%dT%H:%M:%S" "${RUN_TIME:0:19}" "+%s" 2>/dev/null || echo "0")

            if [ "$RUN_EPOCH" != "0" ]; then
                TIME_DIFF=$((RUN_EPOCH - COMMIT_EPOCH))

                if [ $TIME_DIFF -lt 0 ]; then
                    AGE=$((0 - TIME_DIFF))
                    AGE_MIN=$((AGE / 60))
                    echo -e "${YELLOW}⚠ WARNING: Latest build is $AGE_MIN minutes OLDER than your commit${NC}"
                    echo -e "  Your commit may not be deployed yet. Wait 2-3 minutes and re-run this script."
                    exit 1
                fi
            fi
        else
            echo -e "${YELLOW}⚠ Could not retrieve pipeline status${NC}"
            echo -e "  Manually check: ${BLUE}https://dev.azure.com/ctn-demo/ASR/_build${NC}"
        fi
    else
        echo -e "${YELLOW}⚠ Azure CLI not available, skipping pipeline check${NC}"
        echo -e "  Manually verify: ${BLUE}https://dev.azure.com/ctn-demo/ASR/_build${NC}"
    fi
else
    echo -e "${BLUE}[5/5]${NC} Skipping build check (--skip-build-check flag provided)"
fi

echo ""
echo -e "${GREEN}═══════════════════════════════════════════════════════════════${NC}"
echo -e "${GREEN}   ✓ All verification checks passed${NC}"
echo -e "${GREEN}═══════════════════════════════════════════════════════════════${NC}"
echo ""
echo -e "${BLUE}Next steps:${NC}"
echo -e "  • Latest commit: ${GREEN}$LATEST_COMMIT${NC} ($COMMIT_TIME)"
echo -e "  • Verify API: ${BLUE}curl https://func-ctn-demo-asr-dev.azurewebsites.net/api/health${NC}"
echo -e "  • Verify deployment: ${BLUE}curl https://func-ctn-demo-asr-dev.azurewebsites.net/api/v1/version${NC}"
echo -e "  • Admin Portal: ${BLUE}https://calm-tree-03352ba03.1.azurestaticapps.net${NC}"
echo ""

exit 0
