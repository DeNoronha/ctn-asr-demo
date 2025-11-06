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

# Pipeline status
if command -v az &> /dev/null; then
    LATEST_RUN=$(az pipelines runs list --pipeline-ids 9 --top 1 --output json 2>/dev/null || echo "[]")
    if [ "$LATEST_RUN" != "[]" ]; then
        STATUS=$(echo "$LATEST_RUN" | grep -o '"status": "[^"]*"' | head -1 | cut -d'"' -f4)
        RESULT=$(echo "$LATEST_RUN" | grep -o '"result": "[^"]*"' | head -1 | cut -d'"' -f4)

        if [ "$STATUS" = "completed" ] && [ "$RESULT" = "succeeded" ]; then
            echo -e "Pipeline:      ${GREEN}✓ Build succeeded${NC}"
        elif [ "$STATUS" = "inProgress" ]; then
            echo -e "Pipeline:      ${YELLOW}⚠ Build in progress${NC}"
        else
            echo -e "Pipeline:      ${RED}✗ Status: $STATUS${NC}"
        fi
    else
        echo -e "Pipeline:      ${YELLOW}⚠ Could not check${NC}"
    fi
fi

echo "─────────────────────────────────────"
echo -e "Azure DevOps:  ${BLUE}https://dev.azure.com/ctn-demo/ASR/_build${NC}"
echo ""

exit 0
