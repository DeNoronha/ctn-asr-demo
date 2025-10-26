#!/bin/bash
# Find Missing Commits - Recovery Script
# Identifies commits on feature branches not in main
#
# Usage: ./scripts/find-missing-commits.sh [days]
# Example: ./scripts/find-missing-commits.sh 7

set -e

DAYS=${1:-7}
echo "🔍 Finding commits from last $DAYS days not in main..."
echo ""

# Find all feature branches
BRANCHES=$(git branch -a | grep -v "HEAD\|main\|master" | sed 's/remotes\/origin\///' | sort -u)

echo "📋 Feature Branches Found:"
echo "$BRANCHES" | sed 's/^/  - /'
echo ""

# For each branch, find commits not in main
echo "🔎 Commits Not in Main (Last $DAYS Days):"
echo "================================================"
echo ""

for BRANCH in $BRANCHES; do
    # Skip if branch doesn't exist
    git show-ref --verify --quiet refs/heads/$BRANCH || git show-ref --verify --quiet refs/remotes/origin/$BRANCH || continue

    # Get commits not in main
    COMMITS=$(git log $BRANCH --oneline --not main --since="$DAYS days ago" 2>/dev/null || true)

    if [ ! -z "$COMMITS" ]; then
        echo "Branch: $BRANCH"
        echo "----------------------------------------"
        echo "$COMMITS" | sed 's/^/  /'
        echo ""
    fi
done

# Find admin portal specific commits
echo ""
echo "🎯 Admin Portal Commits Not in Main:"
echo "================================================"
git log --all --oneline --not main --since="$DAYS days ago" -- admin-portal/ | head -20 || true

echo ""
echo "💾 Member Portal Commits Not in Main:"
echo "================================================"
git log --all --oneline --not main --since="$DAYS days ago" -- member-portal/ | head -20 || true

echo ""
echo "🔧 API Commits Not in Main:"
echo "================================================"
git log --all --oneline --not main --since="$DAYS days ago" -- api/ | head -20 || true

echo ""
echo "✅ Recovery Complete"
echo ""
echo "Next Steps:"
echo "  1. Review commits above"
echo "  2. For each needed commit: git cherry-pick COMMIT_HASH"
echo "  3. Or merge entire branch: git merge feature/branch-name"
echo "  4. Push to main: git push origin main"
echo "  5. Verify deployment with TE agent"
