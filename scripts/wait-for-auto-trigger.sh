#!/bin/bash
#
# Wait for Automatic Pipeline Trigger
#
# This script prevents duplicate builds by:
# 1. Detecting which files were changed in the last commit
# 2. Waiting for Azure DevOps automatic triggers to start builds
# 3. Only manually triggering if auto-trigger fails
#
# Usage:
#   ./scripts/wait-for-auto-trigger.sh [commit-hash]
#
# Examples:
#   ./scripts/wait-for-auto-trigger.sh              # Use HEAD
#   ./scripts/wait-for-auto-trigger.sh abc123       # Specific commit
#

set -e

COMMIT=${1:-HEAD}
ORG="https://dev.azure.com/ctn-demo"
PROJECT="ASR"
WAIT_TIME=30  # Wait 30 seconds for auto-trigger

# Pipeline IDs
ADMIN_PIPELINE_ID=1
MEMBER_PIPELINE_ID=3
API_PIPELINE_ID=9

echo "=========================================="
echo "🔍 Checking for Automatic Pipeline Triggers"
echo "=========================================="
echo ""
echo "Commit: $(git rev-parse $COMMIT)"
echo "Message: $(git log -1 --format='%s' $COMMIT)"
echo ""

# Get list of changed files in the commit
CHANGED_FILES=$(git diff-tree --no-commit-id --name-only -r $COMMIT)
echo "Changed files:"
echo "$CHANGED_FILES" | sed 's/^/  - /'
echo ""

# Determine which pipelines should be triggered based on path filters
SHOULD_TRIGGER_ADMIN=false
SHOULD_TRIGGER_MEMBER=false
SHOULD_TRIGGER_API=false

while IFS= read -r file; do
  # Admin Portal triggers
  if [[ "$file" =~ ^admin-portal/ ]] || [[ "$file" == ".azure-pipelines/admin-portal.yml" ]]; then
    # Exclude docs and markdown files
    if [[ ! "$file" =~ ^admin-portal/.*\.md$ ]] && [[ ! "$file" =~ ^docs/ ]]; then
      SHOULD_TRIGGER_ADMIN=true
    fi
  fi

  # Member Portal triggers
  if [[ "$file" =~ ^member-portal/ ]] || [[ "$file" == ".azure-pipelines/member-portal.yml" ]]; then
    if [[ ! "$file" =~ ^member-portal/.*\.md$ ]] && [[ ! "$file" =~ ^docs/ ]]; then
      SHOULD_TRIGGER_MEMBER=true
    fi
  fi

  # API triggers
  if [[ "$file" =~ ^api/ ]] || [[ "$file" == ".azure-pipelines/asr-api.yml" ]]; then
    if [[ ! "$file" =~ ^api/.*\.md$ ]] && [[ ! "$file" =~ ^docs/ ]]; then
      SHOULD_TRIGGER_API=true
    fi
  fi
done <<< "$CHANGED_FILES"

echo "Expected triggers:"
echo "  - Admin Portal:  $SHOULD_TRIGGER_ADMIN"
echo "  - Member Portal: $SHOULD_TRIGGER_MEMBER"
echo "  - API:           $SHOULD_TRIGGER_API"
echo ""

if [[ "$SHOULD_TRIGGER_ADMIN" == false ]] && [[ "$SHOULD_TRIGGER_MEMBER" == false ]] && [[ "$SHOULD_TRIGGER_API" == false ]]; then
  echo "ℹ️  No pipelines should be triggered for these changes."
  echo "   (Only docs, markdown, or excluded paths were modified)"
  exit 0
fi

# Get the commit SHA
COMMIT_SHA=$(git rev-parse $COMMIT)

echo "⏳ Waiting $WAIT_TIME seconds for automatic triggers..."
sleep $WAIT_TIME
echo ""

# Function to check if a pipeline was triggered
check_pipeline_triggered() {
  local pipeline_id=$1
  local pipeline_name=$2

  # Get most recent build for this pipeline
  local latest_build=$(az pipelines runs list \
    --org $ORG \
    --project $PROJECT \
    --pipeline-ids $pipeline_id \
    --top 1 \
    --query "[0].{id:id, sourceVersion:sourceVersion, queueTime:queueTime, reason:reason}" \
    --output json 2>/dev/null)

  if [[ -z "$latest_build" ]] || [[ "$latest_build" == "null" ]] || [[ "$latest_build" == "[]" ]]; then
    echo "  ❌ $pipeline_name: No builds found"
    return 1
  fi

  # Handle both array and single object responses from az cli
  local build_sha=$(echo "$latest_build" | jq -r 'if type=="array" then .[0].sourceVersion else .sourceVersion end')
  local queue_time=$(echo "$latest_build" | jq -r 'if type=="array" then .[0].queueTime else .queueTime end')
  local build_id=$(echo "$latest_build" | jq -r 'if type=="array" then .[0].id else .id end')
  local reason=$(echo "$latest_build" | jq -r 'if type=="array" then .[0].reason else .reason end')

  # Check if build is for our commit (SHA match is sufficient since Azure DevOps assigns builds chronologically)
  if [[ "$build_sha" == "$COMMIT_SHA" ]]; then
    echo "  ✅ $pipeline_name: Build #$build_id triggered ($reason)"
    echo "     Queued: $queue_time"
    echo "     URL: https://dev.azure.com/ctn-demo/ASR/_build/results?buildId=$build_id"
    return 0
  else
    echo "  ❌ $pipeline_name: Latest build is not for this commit"
    echo "     Latest build SHA: ${build_sha:0:8}, Expected: ${COMMIT_SHA:0:8}"
    return 1
  fi
}

# Check each pipeline that should have been triggered
echo "🔍 Checking for automatic triggers..."
echo ""

ADMIN_TRIGGERED=true
MEMBER_TRIGGERED=true
API_TRIGGERED=true

if [[ "$SHOULD_TRIGGER_ADMIN" == true ]]; then
  check_pipeline_triggered $ADMIN_PIPELINE_ID "Admin Portal" || ADMIN_TRIGGERED=false
fi

if [[ "$SHOULD_TRIGGER_MEMBER" == true ]]; then
  check_pipeline_triggered $MEMBER_PIPELINE_ID "Member Portal" || MEMBER_TRIGGERED=false
fi

if [[ "$SHOULD_TRIGGER_API" == true ]]; then
  check_pipeline_triggered $API_PIPELINE_ID "API" || API_TRIGGERED=false
fi

echo ""

# Summary
if [[ "$ADMIN_TRIGGERED" == true ]] && [[ "$MEMBER_TRIGGERED" == true ]] && [[ "$API_TRIGGERED" == true ]]; then
  echo "=========================================="
  echo "✅ All expected pipelines triggered automatically!"
  echo "=========================================="
  echo ""
  echo "No manual intervention needed."
  echo "Monitor builds at: https://dev.azure.com/ctn-demo/ASR/_build"
  exit 0
else
  echo "=========================================="
  echo "⚠️  Some pipelines were NOT triggered automatically"
  echo "=========================================="
  echo ""
  echo "This might be due to:"
  echo "  - Mixed commit (changes to both included and excluded paths)"
  echo "  - Azure DevOps processing delay (rare)"
  echo "  - Pipeline configuration issues"
  echo ""
  echo "💡 Recommendation:"
  echo "  - Wait another 30 seconds and re-run this script"
  echo "  - Or manually trigger the missing pipelines:"
  echo ""

  if [[ "$SHOULD_TRIGGER_ADMIN" == true ]] && [[ "$ADMIN_TRIGGERED" == false ]]; then
    echo "    az pipelines run --org $ORG --project $PROJECT --id $ADMIN_PIPELINE_ID"
  fi

  if [[ "$SHOULD_TRIGGER_MEMBER" == true ]] && [[ "$MEMBER_TRIGGERED" == false ]]; then
    echo "    az pipelines run --org $ORG --project $PROJECT --id $MEMBER_PIPELINE_ID"
  fi

  if [[ "$SHOULD_TRIGGER_API" == true ]] && [[ "$API_TRIGGERED" == false ]]; then
    echo "    az pipelines run --org $ORG --project $PROJECT --id $API_PIPELINE_ID"
  fi

  exit 1
fi
