#!/bin/bash

# Quick deployment status check
# Usage: ./scripts/quick-check.sh

# Colors
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m'

cd "$(dirname "$0")/.."

echo -e "${BLUE}Quick Deployment Check${NC}"
echo "─────────────────────────────────────"

# Branch
BRANCH=$(git branch --show-current)
if [ "$BRANCH" = "main" ]; then
    echo -e "Branch:        ${GREEN}✓ main${NC}"
else
    echo -e "Branch:        ${RED}✗ $BRANCH${NC} (should be main)"
fi

# Uncommitted changes
if git diff-index --quiet HEAD --; then
    echo -e "Changes:       ${GREEN}✓ All committed${NC}"
else
    echo -e "Changes:       ${RED}✗ Uncommitted changes${NC}"
fi

# Latest commit
COMMIT=$(git log -1 --format="%h - %ar - %s" | head -c 80)
echo -e "Last commit:   ${YELLOW}$COMMIT${NC}"

# Push status
LATEST_COMMIT=$(git log -1 --format="%h")
if git branch -r --contains "$LATEST_COMMIT" | grep -q "origin/main"; then
    echo -e "Push status:   ${GREEN}✓ Pushed to origin/main${NC}"
else
    echo -e "Push status:   ${RED}✗ Not pushed${NC}"
fi

# GitHub Actions workflow status
if command -v gh &> /dev/null; then
    # Get the most recent workflow run
    LATEST_RUN=$(gh run list --branch main --limit 1 --json status,conclusion,name 2>/dev/null)
    if [ -n "$LATEST_RUN" ] && [ "$LATEST_RUN" != "[]" ]; then
        STATUS=$(echo "$LATEST_RUN" | grep -o '"status":"[^"]*"' | head -1 | cut -d'"' -f4)
        CONCLUSION=$(echo "$LATEST_RUN" | grep -o '"conclusion":"[^"]*"' | head -1 | cut -d'"' -f4)
        NAME=$(echo "$LATEST_RUN" | grep -o '"name":"[^"]*"' | head -1 | cut -d'"' -f4)

        if [ "$STATUS" = "completed" ] && [ "$CONCLUSION" = "success" ]; then
            echo -e "Workflow:      ${GREEN}✓ $NAME succeeded${NC}"
        elif [ "$STATUS" = "in_progress" ]; then
            echo -e "Workflow:      ${YELLOW}⚠ $NAME in progress${NC}"
        elif [ "$STATUS" = "completed" ] && [ "$CONCLUSION" = "failure" ]; then
            echo -e "Workflow:      ${RED}✗ $NAME failed${NC}"
        else
            echo -e "Workflow:      ${YELLOW}⚠ $NAME: $STATUS${NC}"
        fi
    else
        echo -e "Workflow:      ${YELLOW}⚠ Could not check (gh auth login required?)${NC}"
    fi
else
    echo -e "Workflow:      ${YELLOW}⚠ gh CLI not installed${NC}"
fi

echo "─────────────────────────────────────"
echo -e "GitHub Actions: ${BLUE}https://github.com/DeNoronha/ctn-asr-demo/actions${NC}"
echo ""

exit 0
