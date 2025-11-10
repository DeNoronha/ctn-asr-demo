#!/bin/bash

# ============================================
# Azure DevOps Build Logs Fetcher
# ============================================
# Purpose: Get detailed logs for failed builds
# Last Updated: November 10, 2025
# ============================================

set -e

# Source credentials
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
CREDENTIALS_FILE="$SCRIPT_DIR/../.credentials"

if [ ! -f "$CREDENTIALS_FILE" ]; then
  echo "❌ Error: .credentials file not found"
  exit 1
fi

source "$CREDENTIALS_FILE"

# Get pipeline ID from argument
PIPELINE_ID=${1:-3}  # Default to member portal

# Get pipeline name
case "$PIPELINE_ID" in
  1) PIPELINE_NAME="ASR API" ;;
  2) PIPELINE_NAME="Admin Portal" ;;
  3) PIPELINE_NAME="Member Portal" ;;
  *) PIPELINE_NAME="Unknown Pipeline" ;;
esac

echo "=========================================="
echo "Fetching logs for: $PIPELINE_NAME (ID: $PIPELINE_ID)"
echo "=========================================="
echo ""

# Get latest build ID
BUILD_ID=$(curl -s -u ":${AZURE_DEVOPS_PAT}" \
  "https://dev.azure.com/ctn-demo/ASR/_apis/build/builds?definitions=${PIPELINE_ID}&\$top=1&api-version=7.1" | \
  jq -r '.value[0].id')

if [ -z "$BUILD_ID" ] || [ "$BUILD_ID" = "null" ]; then
  echo "❌ No builds found for pipeline $PIPELINE_ID"
  exit 1
fi

echo "Latest Build ID: $BUILD_ID"
echo ""

# Get build details
BUILD_INFO=$(curl -s -u ":${AZURE_DEVOPS_PAT}" \
  "https://dev.azure.com/ctn-demo/ASR/_apis/build/builds/${BUILD_ID}?api-version=7.1")

echo "$BUILD_INFO" | jq -r '"Build Number: \(.buildNumber)\nStatus: \(.status)\nResult: \(.result)\nStarted: \(.startTime)\nFinished: \(.finishTime)\nSource Branch: \(.sourceBranch)\nSource Version: \(.sourceVersion[0:8])"'

echo ""
echo "=========================================="
echo "Build Timeline"
echo "=========================================="

# Get timeline (tasks/steps)
TIMELINE=$(curl -s -u ":${AZURE_DEVOPS_PAT}" \
  "https://dev.azure.com/ctn-demo/ASR/_apis/build/builds/${BUILD_ID}/timeline?api-version=7.1")

echo "$TIMELINE" | jq -r '.records[] | select(.type == "Task" or .type == "Stage" or .type == "Job") | "\(.name) - \(.result // "N/A") (\(.state))"' | head -20

echo ""
echo "=========================================="
echo "Failed Tasks"
echo "=========================================="

# Show only failed tasks
FAILED_TASKS=$(echo "$TIMELINE" | jq -r '.records[] | select(.result == "failed") | "\n❌ \(.name)\n   Result: \(.result)\n   Issues:"')

if [ -z "$FAILED_TASKS" ]; then
  echo "No failed tasks found"
else
  echo "$FAILED_TASKS"

  # Get log IDs for failed tasks
  echo ""
  echo "=========================================="
  echo "Error Details"
  echo "=========================================="

  LOG_IDS=$(echo "$TIMELINE" | jq -r '.records[] | select(.result == "failed" and .log != null) | .log.id')

  for LOG_ID in $LOG_IDS; do
    echo ""
    echo "--- Log $LOG_ID ---"
    curl -s -u ":${AZURE_DEVOPS_PAT}" \
      "https://dev.azure.com/ctn-demo/ASR/_apis/build/builds/${BUILD_ID}/logs/${LOG_ID}?api-version=7.1" | \
      grep -i "error\|fail\|exception" | tail -20 || echo "No errors found in log"
  done
fi

echo ""
echo "=========================================="
echo "Build URL"
echo "=========================================="
echo "https://dev.azure.com/ctn-demo/ASR/_build/results?buildId=${BUILD_ID}"
