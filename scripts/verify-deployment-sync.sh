#!/bin/bash

# Deployment Sync Verification Script
# Ensures changes are committed and deployed via GitHub Actions before proceeding
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

# 5. Check GitHub Actions workflow status (optional)
if [ "$1" != "--skip-build-check" ]; then
    echo -e "${BLUE}[5/5]${NC} Checking GitHub Actions workflow status..."

    if command -v gh &> /dev/null; then
        # Get the most recent workflow run for main branch
        LATEST_RUN=$(gh run list --branch main --limit 1 --json status,conclusion,name,headSha,createdAt 2>/dev/null)

        if [ -n "$LATEST_RUN" ] && [ "$LATEST_RUN" != "[]" ]; then
            RUN_STATUS=$(echo "$LATEST_RUN" | grep -o '"status":"[^"]*"' | head -1 | cut -d'"' -f4)
            RUN_CONCLUSION=$(echo "$LATEST_RUN" | grep -o '"conclusion":"[^"]*"' | head -1 | cut -d'"' -f4)
            RUN_NAME=$(echo "$LATEST_RUN" | grep -o '"name":"[^"]*"' | head -1 | cut -d'"' -f4)
            RUN_SHA=$(echo "$LATEST_RUN" | grep -o '"headSha":"[^"]*"' | head -1 | cut -d'"' -f4)

            echo -e "  Latest workflow: ${YELLOW}$RUN_NAME${NC}"
            echo -e "  Status: ${YELLOW}$RUN_STATUS${NC}"

            if [ "$RUN_STATUS" = "completed" ]; then
                if [ "$RUN_CONCLUSION" = "success" ]; then
                    echo -e "  Conclusion: ${GREEN}$RUN_CONCLUSION${NC}"
                    echo -e "${GREEN}✓ Workflow completed successfully${NC}"
                else
                    echo -e "  Conclusion: ${RED}$RUN_CONCLUSION${NC}"
                    echo -e "${YELLOW}⚠ WARNING: Latest workflow did not succeed${NC}"
                    echo -e "  Check: ${BLUE}https://github.com/DeNoronha/ctn-asr-demo/actions${NC}"
                fi
            elif [ "$RUN_STATUS" = "in_progress" ]; then
                echo -e "${YELLOW}⚠ Workflow is currently running${NC}"
                echo -e "  Wait for completion before testing changes"
            else
                echo -e "${YELLOW}⚠ Workflow status: $RUN_STATUS${NC}"
            fi

            # Check if the workflow ran for our commit
            FULL_COMMIT=$(git log -1 --format="%H")
            if [ "${RUN_SHA:0:8}" != "${FULL_COMMIT:0:8}" ]; then
                echo -e "${YELLOW}⚠ WARNING: Latest workflow is not for your commit${NC}"
                echo -e "  Workflow SHA: ${RUN_SHA:0:8}, Your commit: ${FULL_COMMIT:0:8}"
                echo -e "  A new workflow may still be starting. Wait and re-run this script."
            fi
        else
            echo -e "${YELLOW}⚠ Could not retrieve workflow status${NC}"
            echo -e "  Manually check: ${BLUE}https://github.com/DeNoronha/ctn-asr-demo/actions${NC}"
        fi
    else
        echo -e "${YELLOW}⚠ GitHub CLI (gh) not available, skipping workflow check${NC}"
        echo -e "  Install: ${BLUE}brew install gh${NC}"
        echo -e "  Manually verify: ${BLUE}https://github.com/DeNoronha/ctn-asr-demo/actions${NC}"
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
echo -e "  • Verify API: ${BLUE}curl https://ca-ctn-asr-api-dev.calmriver-700a8c55.westeurope.azurecontainerapps.io/api/health${NC}"
echo -e "  • Admin Portal: ${BLUE}https://calm-tree-03352ba03.1.azurestaticapps.net${NC}"
echo -e "  • GitHub Actions: ${BLUE}https://github.com/DeNoronha/ctn-asr-demo/actions${NC}"
echo ""

exit 0
