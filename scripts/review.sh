#!/bin/bash

# Code Review Script for CTN Project
echo "=== CTN Code Review ==="

# Function to review a project
review_project() {
  local project_dir=$1
  local project_name=$2

  echo -e "\n📦 Reviewing $project_name..."
  cd "$project_dir" || exit 1

  # Create reports directory if it doesn't exist
  mkdir -p reports

  echo -e "\nRunning Biome checks..."
  npm run lint:report
  if [ $? -ne 0 ]; then
    echo "⚠ Biome found issues in $project_name"
  else
    echo "✓ Biome checks passed for $project_name"
  fi

  echo -e "\nRunning Aikido security scan..."
  npm run security:scan 2>/dev/null
  if [ $? -ne 0 ]; then
    echo "⚠ Aikido scan incomplete (CLI may not be installed)"
  else
    echo "✓ Aikido scan completed for $project_name"
  fi

  echo -e "\nGenerating summary..."
  npm run security:summary 2>/dev/null

  cd - > /dev/null
}

# Get script directory
SCRIPT_DIR="$( cd "$( dirname "${BASH_SOURCE[0]}" )" && pwd )"
PROJECT_ROOT="$(dirname "$SCRIPT_DIR")"

# Review Admin Portal (web)
if [ -d "$PROJECT_ROOT/web" ]; then
  review_project "$PROJECT_ROOT/web" "Admin Portal (web)"
fi

# Review Member Portal (portal)
if [ -d "$PROJECT_ROOT/portal" ]; then
  review_project "$PROJECT_ROOT/portal" "Member Portal (portal)"
fi

echo -e "\n=== Review Complete ==="
echo "Reports available in:"
echo "- web/reports/"
echo "- portal/reports/"
echo ""
echo "View summaries:"
echo "  cat web/reports/aikido-summary.md"
echo "  cat portal/reports/aikido-summary.md"
