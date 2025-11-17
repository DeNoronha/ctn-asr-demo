#!/bin/bash
#
# MTTR Calculation Script for CTN ASR
# Calculates Mean Time to Restore from deployment failures
#
# Usage: ./scripts/calculate-mttr.sh [days]
# Example: ./scripts/calculate-mttr.sh 30

set -euo pipefail

# Configuration
ORG="https://dev.azure.com/ctn-demo"
PROJECT="ASR"
DAYS_BACK=${1:-30}

# Pipeline names (used for filtering)
API_PIPELINE="Association-Register-API"
ADMIN_PIPELINE="Association-Register-Admin"
MEMBER_PIPELINE="Association-Register-Member"

echo "📊 Calculating MTTR for CTN ASR (last $DAYS_BACK days)..."
echo ""

# Calculate date range
START_DATE=$(date -u -d "$DAYS_BACK days ago" +%Y-%m-%dT%H:%M:%SZ 2>/dev/null || date -u -v-"$DAYS_BACK"d +%Y-%m-%dT%H:%M:%SZ)

# Fetch all pipeline runs (both succeeded and failed)
echo "🔍 Fetching pipeline runs from Azure DevOps..."
ALL_RUNS=$(az pipelines runs list \
  --org "$ORG" \
  --project "$PROJECT" \
  --top 200 \
  --query "[?finishTime >= '$START_DATE'] | sort_by(@, &finishTime)" \
  --output json)

if [ -z "$ALL_RUNS" ] || [ "$ALL_RUNS" = "null" ]; then
  echo "❌ Failed to fetch pipeline runs. Check Azure CLI authentication."
  exit 1
fi

TOTAL_RUNS=$(echo "$ALL_RUNS" | jq 'length')
echo "   Found $TOTAL_RUNS pipeline runs"
echo ""

# Filter failed runs
FAILED_RUNS=$(echo "$ALL_RUNS" | jq '[.[] | select(.result == "failed" or .result == "partiallySucceeded")]')
FAILURE_COUNT=$(echo "$FAILED_RUNS" | jq 'length')

if [ "$FAILURE_COUNT" -eq 0 ]; then
  echo "✅ No deployment failures in last $DAYS_BACK days!"
  echo ""
  echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
  echo "📊 MTTR Summary (Last $DAYS_BACK days)"
  echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
  echo "Incidents: 0"
  echo "Average MTTR: N/A (no failures)"
  echo "Performance Tier: Elite ✅"
  echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
  echo ""
  echo "Excellent! No deployment failures detected."
  echo "Continue monitoring daily to maintain Elite performance."
  exit 0
fi

echo "🚨 Found $FAILURE_COUNT deployment failures"
echo ""

# Initialize counters
TOTAL_MTTR=0
RECOVERIES=0
declare -a MTTR_VALUES

# Process each failure
echo "Analyzing failures and recovery times..."
echo ""

echo "$FAILED_RUNS" | jq -c '.[]' | while IFS= read -r FAILED_RUN; do
  RUN_ID=$(echo "$FAILED_RUN" | jq -r '.id')
  PIPELINE_ID=$(echo "$FAILED_RUN" | jq -r '.definition.id')
  PIPELINE_NAME=$(echo "$FAILED_RUN" | jq -r '.definition.name')
  FAILURE_TIME=$(echo "$FAILED_RUN" | jq -r '.finishTime')
  RESULT=$(echo "$FAILED_RUN" | jq -r '.result')

  echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
  echo "Failure #$((RECOVERIES + 1)): $PIPELINE_NAME"
  echo "   Run ID: #$RUN_ID"
  echo "   Result: $RESULT"
  echo "   Time: $FAILURE_TIME"

  # Find next successful run for same pipeline after this failure
  RECOVERY_RUN=$(echo "$ALL_RUNS" | jq --arg PIPELINE_ID "$PIPELINE_ID" --arg FAILURE_TIME "$FAILURE_TIME" '
    [.[] | select(.definition.id == ($PIPELINE_ID | tonumber) and .result == "succeeded" and .finishTime > $FAILURE_TIME)] | first
  ')

  if [ -z "$RECOVERY_RUN" ] || [ "$RECOVERY_RUN" = "null" ]; then
    echo "   ⚠️  No recovery deployment found"
    echo "   Status: UNRESOLVED (may still be broken)"
    continue
  fi

  RECOVERY_ID=$(echo "$RECOVERY_RUN" | jq -r '.id')
  RECOVERY_TIME=$(echo "$RECOVERY_RUN" | jq -r '.finishTime')

  # Calculate MTTR for this incident (in seconds, then convert)
  FAILURE_EPOCH=$(date -d "$FAILURE_TIME" +%s 2>/dev/null || date -j -f "%Y-%m-%dT%H:%M:%S" "${FAILURE_TIME%.*}" +%s)
  RECOVERY_EPOCH=$(date -d "$RECOVERY_TIME" +%s 2>/dev/null || date -j -f "%Y-%m-%dT%H:%M:%S" "${RECOVERY_TIME%.*}" +%s)
  MTTR_SECONDS=$((RECOVERY_EPOCH - FAILURE_EPOCH))
  MTTR_MINUTES=$((MTTR_SECONDS / 60))

  # Format for display
  if [ "$MTTR_MINUTES" -lt 60 ]; then
    MTTR_DISPLAY="${MTTR_MINUTES} minutes"
  else
    MTTR_HOURS=$((MTTR_MINUTES / 60))
    MTTR_REMAINING_MINS=$((MTTR_MINUTES % 60))
    MTTR_DISPLAY="${MTTR_HOURS}h ${MTTR_REMAINING_MINS}m"
  fi

  echo "   ✅ Recovered by Run #$RECOVERY_ID"
  echo "   Recovery Time: $RECOVERY_TIME"
  echo "   MTTR: $MTTR_DISPLAY"

  # Save to temp file for aggregation (workaround for subshell limitations)
  echo "$MTTR_MINUTES" >> /tmp/mttr_values_$$.txt
done

echo ""
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"

# Read MTTR values from temp file
if [ -f /tmp/mttr_values_$$.txt ]; then
  RECOVERIES=$(wc -l < /tmp/mttr_values_$$.txt | tr -d ' ')

  if [ "$RECOVERIES" -eq 0 ]; then
    echo ""
    echo "⚠️  $FAILURE_COUNT failures detected, but NO recoveries found"
    echo ""
    echo "This indicates unresolved deployment failures!"
    echo "Action required: Review failed pipelines and deploy fixes."
    rm -f /tmp/mttr_values_$$.txt
    exit 1
  fi

  # Calculate average, min, max MTTR
  TOTAL_MTTR=0
  MIN_MTTR=999999
  MAX_MTTR=0

  while read -r MTTR_VALUE; do
    TOTAL_MTTR=$((TOTAL_MTTR + MTTR_VALUE))

    if [ "$MTTR_VALUE" -lt "$MIN_MTTR" ]; then
      MIN_MTTR=$MTTR_VALUE
    fi

    if [ "$MTTR_VALUE" -gt "$MAX_MTTR" ]; then
      MAX_MTTR=$MTTR_VALUE
    fi
  done < /tmp/mttr_values_$$.txt

  AVG_MTTR=$((TOTAL_MTTR / RECOVERIES))

  # Clean up temp file
  rm -f /tmp/mttr_values_$$.txt

  echo ""
  echo "📊 MTTR Summary (Last $DAYS_BACK days)"
  echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
  echo "Total Incidents: $FAILURE_COUNT"
  echo "Resolved Incidents: $RECOVERIES"
  echo "Unresolved Incidents: $((FAILURE_COUNT - RECOVERIES))"
  echo ""
  echo "Average MTTR: $AVG_MTTR minutes"
  echo "Fastest Recovery: $MIN_MTTR minutes"
  echo "Slowest Recovery: $MAX_MTTR minutes"
  echo ""

  # Determine performance tier
  if [ "$AVG_MTTR" -lt 60 ]; then
    TIER="Elite ✅"
    TIER_MESSAGE="Outstanding recovery performance!"
  elif [ "$AVG_MTTR" -lt 1440 ]; then
    TIER="High ⚠️"
    TIER_MESSAGE="Good recovery time, aim for <60 min"
  elif [ "$AVG_MTTR" -lt 10080 ]; then
    TIER="Medium ⚠️"
    TIER_MESSAGE="Recovery time needs improvement"
  else
    TIER="Low ❌"
    TIER_MESSAGE="URGENT: Recovery process requires immediate attention"
  fi

  echo "Performance Tier: $TIER"
  echo "Target: <60 minutes (Elite)"
  echo ""
  echo "$TIER_MESSAGE"
  echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
  echo ""

  # Recommendations based on tier
  if [ "$AVG_MTTR" -ge 60 ]; then
    echo "📋 Recommendations to Improve MTTR:"
    echo ""
    echo "1. Automate rollback procedures"
    echo "2. Improve monitoring and alerting (catch failures faster)"
    echo "3. Pre-prepared hotfix procedures"
    echo "4. Fast-track testing for emergency fixes"
    echo "5. Keep previous deployment artifacts for quick rollback"
    echo ""
  fi

  # Update dashboard widget (instructions)
  echo "🔄 Update Dashboard:"
  echo ""
  echo "1. Navigate to: https://dev.azure.com/ctn-demo/ASR/_dashboards"
  echo "2. Edit MTTR widget"
  echo "3. Update markdown:"
  echo ""
  echo "   ## MTTR"
  echo "   **Mean Time to Restore**"
  echo ""
  echo "   ### $AVG_MTTR minutes"
  echo "   *$TIER*"
  echo ""
  echo "   ---"
  echo "   🎯 Target: <60 min (Elite)"
  echo "   📈 Last $DAYS_BACK days"
  echo ""

else
  echo ""
  echo "⚠️  No MTTR data collected (internal error)"
  echo "   This may indicate an issue with the script."
  exit 1
fi
