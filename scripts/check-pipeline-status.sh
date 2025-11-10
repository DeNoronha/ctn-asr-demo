#!/bin/bash

# ============================================
# Azure DevOps Pipeline Status Checker
# ============================================
# Purpose: Check build status for ASR pipelines
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

# Pipeline IDs
API_PIPELINE_ID=1
ADMIN_PORTAL_PIPELINE_ID=2
MEMBER_PORTAL_PIPELINE_ID=3

# Function to check pipeline
check_pipeline() {
  local PIPELINE_ID=$1
  local PIPELINE_NAME=$2

  echo ""
  echo "=========================================="
  echo "Pipeline: $PIPELINE_NAME (ID: $PIPELINE_ID)"
  echo "=========================================="

  RESPONSE=$(curl -s -u ":${AZURE_DEVOPS_PAT}" \
    "https://dev.azure.com/ctn-demo/ASR/_apis/build/builds?definitions=${PIPELINE_ID}&\$top=3&api-version=7.1")

  echo "$RESPONSE" | jq -r '.value[] | "Build: \(.buildNumber)\nStatus: \(.status)\nResult: \(.result // "N/A")\nBranch: \(.sourceBranch)\nStarted: \(.startTime)\nFinished: \(.finishTime // "N/A")\n---"'
}

# Check which pipeline to query
if [ -z "$1" ]; then
  echo "Checking all pipelines..."
  check_pipeline $API_PIPELINE_ID "ASR API"
  check_pipeline $ADMIN_PORTAL_PIPELINE_ID "Admin Portal"
  check_pipeline $MEMBER_PORTAL_PIPELINE_ID "Member Portal"
else
  case "$1" in
    api)
      check_pipeline $API_PIPELINE_ID "ASR API"
      ;;
    admin)
      check_pipeline $ADMIN_PORTAL_PIPELINE_ID "Admin Portal"
      ;;
    member)
      check_pipeline $MEMBER_PORTAL_PIPELINE_ID "Member Portal"
      ;;
    *)
      echo "Usage: $0 [api|admin|member]"
      echo "No argument = check all pipelines"
      exit 1
      ;;
  esac
fi

echo ""
echo "=========================================="
echo "Pipeline Status Check Complete"
echo "=========================================="
