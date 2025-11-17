#!/bin/bash
#
# DORA Metrics Daily Report Generator
# Generates comprehensive DORA metrics summary for CTN ASR
#
# Usage: ./scripts/generate-dora-report.sh [days]
# Example: ./scripts/generate-dora-report.sh 30

set -euo pipefail

# Configuration
ORG="https://dev.azure.com/ctn-demo"
PROJECT="ASR"
DAYS_BACK=${1:-30}

# Color codes for terminal output
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

echo ""
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "   CTN ASR - DORA Metrics Report"
echo "   Period: Last $DAYS_BACK days"
echo "   Generated: $(date '+%Y-%m-%d %H:%M:%S %Z')"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo ""

# Calculate date range
START_DATE=$(date -u -d "$DAYS_BACK days ago" +%Y-%m-%dT%H:%M:%SZ 2>/dev/null || date -u -v-"$DAYS_BACK"d +%Y-%m-%dT%H:%M:%SZ)

# Fetch all pipeline runs
echo "🔍 Fetching pipeline data from Azure DevOps..."
ALL_RUNS=$(az pipelines runs list \
  --org "$ORG" \
  --project "$PROJECT" \
  --top 500 \
  --query "[?finishTime >= '$START_DATE']" \
  --output json)

if [ -z "$ALL_RUNS" ] || [ "$ALL_RUNS" = "null" ]; then
  echo "❌ Failed to fetch pipeline runs. Check Azure CLI authentication."
  echo "   Run: az login"
  exit 1
fi

TOTAL_RUNS=$(echo "$ALL_RUNS" | jq 'length')
echo "   ✅ Retrieved $TOTAL_RUNS pipeline runs"
echo ""

# ═══════════════════════════════════════════════════════════════
# 1. DEPLOYMENT FREQUENCY
# ═══════════════════════════════════════════════════════════════

echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "📊 Metric 1: Deployment Frequency"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo ""

SUCCESS_COUNT=$(echo "$ALL_RUNS" | jq '[.[] | select(.result == "succeeded")] | length')
DEPLOYMENT_FREQ=$(echo "scale=2; $SUCCESS_COUNT / $DAYS_BACK" | bc)

echo "Total Successful Deployments: $SUCCESS_COUNT"
echo "Period: $DAYS_BACK days"
echo "Deployment Frequency: $DEPLOYMENT_FREQ per day"
echo ""

# Determine tier
if (( $(echo "$DEPLOYMENT_FREQ >= 1" | bc -l) )); then
  DF_TIER="Elite ✅"
  DF_COLOR=$GREEN
elif (( $(echo "$DEPLOYMENT_FREQ >= 0.14" | bc -l) )); then  # ~1 per week
  DF_TIER="High ⚠️"
  DF_COLOR=$YELLOW
elif (( $(echo "$DEPLOYMENT_FREQ >= 0.03" | bc -l) )); then  # ~1 per month
  DF_TIER="Medium ⚠️"
  DF_COLOR=$YELLOW
else
  DF_TIER="Low ❌"
  DF_COLOR=$RED
fi

echo -e "Performance Tier: ${DF_COLOR}${DF_TIER}${NC}"
echo "Target: ≥1 per day (Elite)"
echo ""

# ═══════════════════════════════════════════════════════════════
# 2. LEAD TIME FOR CHANGES
# ═══════════════════════════════════════════════════════════════

echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "📊 Metric 2: Lead Time for Changes"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo ""

# Calculate lead times (queueTime to finishTime)
LEAD_TIMES=$(echo "$ALL_RUNS" | jq -r '
  [.[] | select(.result == "succeeded") |
   (((.finishTime | fromdateiso8601) - (.queueTime | fromdateiso8601)) / 60)] |
  map(select(. > 0))
')

LEAD_TIME_COUNT=$(echo "$LEAD_TIMES" | jq 'length')

if [ "$LEAD_TIME_COUNT" -eq 0 ]; then
  echo "⚠️  No lead time data available"
  AVG_LEAD_TIME=0
  MIN_LEAD_TIME=0
  MAX_LEAD_TIME=0
else
  AVG_LEAD_TIME=$(echo "$LEAD_TIMES" | jq 'add / length | round')
  MIN_LEAD_TIME=$(echo "$LEAD_TIMES" | jq 'min | round')
  MAX_LEAD_TIME=$(echo "$LEAD_TIMES" | jq 'max | round')
fi

echo "Successful Deployments Analyzed: $LEAD_TIME_COUNT"
echo "Average Lead Time: $AVG_LEAD_TIME minutes"
echo "Fastest Deployment: $MIN_LEAD_TIME minutes"
echo "Slowest Deployment: $MAX_LEAD_TIME minutes"
echo ""

# Determine tier
if [ "$AVG_LEAD_TIME" -lt 60 ]; then
  LT_TIER="Elite ✅"
  LT_COLOR=$GREEN
elif [ "$AVG_LEAD_TIME" -lt 1440 ]; then  # <1 day
  LT_TIER="High ⚠️"
  LT_COLOR=$YELLOW
elif [ "$AVG_LEAD_TIME" -lt 10080 ]; then  # <1 week
  LT_TIER="Medium ⚠️"
  LT_COLOR=$YELLOW
else
  LT_TIER="Low ❌"
  LT_COLOR=$RED
fi

echo -e "Performance Tier: ${LT_COLOR}${LT_TIER}${NC}"
echo "Target: <60 minutes (Elite)"
echo ""

# ═══════════════════════════════════════════════════════════════
# 3. CHANGE FAILURE RATE
# ═══════════════════════════════════════════════════════════════

echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "📊 Metric 3: Change Failure Rate"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo ""

FAILED_COUNT=$(echo "$ALL_RUNS" | jq '[.[] | select(.result == "failed" or .result == "partiallySucceeded")] | length')
TOTAL_DEPLOYMENTS=$((SUCCESS_COUNT + FAILED_COUNT))

if [ "$TOTAL_DEPLOYMENTS" -eq 0 ]; then
  CFR=0
else
  CFR=$(echo "scale=2; ($FAILED_COUNT * 100) / $TOTAL_DEPLOYMENTS" | bc)
fi

echo "Total Deployments: $TOTAL_DEPLOYMENTS"
echo "Failed Deployments: $FAILED_COUNT"
echo "Successful Deployments: $SUCCESS_COUNT"
echo "Change Failure Rate: ${CFR}%"
echo ""

# Determine tier
if (( $(echo "$CFR <= 15" | bc -l) )); then
  CFR_TIER="Elite ✅"
  CFR_COLOR=$GREEN
elif (( $(echo "$CFR <= 30" | bc -l) )); then
  CFR_TIER="High/Medium ⚠️"
  CFR_COLOR=$YELLOW
else
  CFR_TIER="Low ❌"
  CFR_COLOR=$RED
fi

echo -e "Performance Tier: ${CFR_COLOR}${CFR_TIER}${NC}"
echo "Target: ≤15% (Elite)"
echo ""

# ═══════════════════════════════════════════════════════════════
# 4. MEAN TIME TO RESTORE (MTTR)
# ═══════════════════════════════════════════════════════════════

echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "📊 Metric 4: Mean Time to Restore (MTTR)"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo ""

if [ "$FAILED_COUNT" -eq 0 ]; then
  echo "✅ No deployment failures in this period!"
  echo "MTTR: N/A (0 incidents)"
  echo ""
  echo -e "Performance Tier: ${GREEN}Elite ✅${NC}"
  echo "Target: <60 minutes (Elite)"
  echo ""
  MTTR_VALUE=0
  MTTR_TIER="Elite ✅"
  MTTR_COLOR=$GREEN
else
  echo "🔍 Calculating MTTR for $FAILED_COUNT failures..."
  echo "(Running calculate-mttr.sh script...)"
  echo ""

  # Call MTTR calculation script and capture output
  MTTR_SCRIPT="/Users/ramondenoronha/Dev/DIL/DEV-CTN-ASR/scripts/calculate-mttr.sh"

  if [ -x "$MTTR_SCRIPT" ]; then
    # Run in subshell to avoid polluting current output
    MTTR_OUTPUT=$($MTTR_SCRIPT "$DAYS_BACK" 2>&1)

    # Extract MTTR value from output
    MTTR_VALUE=$(echo "$MTTR_OUTPUT" | grep -oP 'Average MTTR: \K\d+' || echo "0")

    echo "$MTTR_OUTPUT"
    echo ""

    # Determine tier
    if [ "$MTTR_VALUE" -lt 60 ]; then
      MTTR_TIER="Elite ✅"
      MTTR_COLOR=$GREEN
    elif [ "$MTTR_VALUE" -lt 1440 ]; then
      MTTR_TIER="High ⚠️"
      MTTR_COLOR=$YELLOW
    else
      MTTR_TIER="Medium/Low ❌"
      MTTR_COLOR=$RED
    fi
  else
    echo "⚠️  MTTR calculation script not found or not executable"
    echo "   Expected: $MTTR_SCRIPT"
    echo "   Run: chmod +x $MTTR_SCRIPT"
    echo ""
    MTTR_VALUE="N/A"
    MTTR_TIER="Unknown"
    MTTR_COLOR=$YELLOW
  fi
fi

# ═══════════════════════════════════════════════════════════════
# OVERALL SUMMARY
# ═══════════════════════════════════════════════════════════════

echo ""
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "🏆 OVERALL DORA PERFORMANCE SUMMARY"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo ""

printf "%-30s %-20s %-15s\n" "Metric" "Value" "Tier"
echo "───────────────────────────────────────────────────────────────"
printf "%-30s %-20s " "Deployment Frequency" "$DEPLOYMENT_FREQ/day"
echo -e "${DF_COLOR}${DF_TIER}${NC}"

printf "%-30s %-20s " "Lead Time for Changes" "$AVG_LEAD_TIME min"
echo -e "${LT_COLOR}${LT_TIER}${NC}"

printf "%-30s %-20s " "Change Failure Rate" "${CFR}%"
echo -e "${CFR_COLOR}${CFR_TIER}${NC}"

if [ "$MTTR_VALUE" != "N/A" ] && [ "$MTTR_VALUE" -eq 0 ]; then
  printf "%-30s %-20s " "MTTR" "N/A (no failures)"
else
  printf "%-30s %-20s " "MTTR" "$MTTR_VALUE min"
fi
echo -e "${MTTR_COLOR}${MTTR_TIER}${NC}"

echo ""

# Calculate overall tier (majority rule)
ELITE_COUNT=0
HIGH_COUNT=0
MEDIUM_LOW_COUNT=0

[[ "$DF_TIER" == *"Elite"* ]] && ELITE_COUNT=$((ELITE_COUNT + 1)) || \
  [[ "$DF_TIER" == *"High"* ]] && HIGH_COUNT=$((HIGH_COUNT + 1)) || MEDIUM_LOW_COUNT=$((MEDIUM_LOW_COUNT + 1))

[[ "$LT_TIER" == *"Elite"* ]] && ELITE_COUNT=$((ELITE_COUNT + 1)) || \
  [[ "$LT_TIER" == *"High"* ]] && HIGH_COUNT=$((HIGH_COUNT + 1)) || MEDIUM_LOW_COUNT=$((MEDIUM_LOW_COUNT + 1))

[[ "$CFR_TIER" == *"Elite"* ]] && ELITE_COUNT=$((ELITE_COUNT + 1)) || \
  [[ "$CFR_TIER" == *"High"* ]] && HIGH_COUNT=$((HIGH_COUNT + 1)) || MEDIUM_LOW_COUNT=$((MEDIUM_LOW_COUNT + 1))

[[ "$MTTR_TIER" == *"Elite"* ]] && ELITE_COUNT=$((ELITE_COUNT + 1)) || \
  [[ "$MTTR_TIER" == *"High"* ]] && HIGH_COUNT=$((HIGH_COUNT + 1)) || MEDIUM_LOW_COUNT=$((MEDIUM_LOW_COUNT + 1))

if [ "$ELITE_COUNT" -ge 3 ]; then
  OVERALL_TIER="Elite ✅"
  OVERALL_COLOR=$GREEN
  OVERALL_MESSAGE="Outstanding DevOps performance! Continue maintaining these standards."
elif [ "$HIGH_COUNT" -ge 2 ]; then
  OVERALL_TIER="High ⚠️"
  OVERALL_COLOR=$YELLOW
  OVERALL_MESSAGE="Good performance. Focus on improving metrics below Elite tier."
else
  OVERALL_TIER="Medium/Low ❌"
  OVERALL_COLOR=$RED
  OVERALL_MESSAGE="Performance needs improvement. Review recommendations below."
fi

echo -e "Overall Performance Tier: ${OVERALL_COLOR}${OVERALL_TIER}${NC}"
echo ""
echo "$OVERALL_MESSAGE"
echo ""

# ═══════════════════════════════════════════════════════════════
# RECOMMENDATIONS
# ═══════════════════════════════════════════════════════════════

if [ "$ELITE_COUNT" -lt 4 ]; then
  echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
  echo "📋 RECOMMENDATIONS"
  echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
  echo ""

  if [[ "$DF_TIER" != *"Elite"* ]]; then
    echo "🔹 Deployment Frequency:"
    echo "   - Deploy smaller, more frequent changes"
    echo "   - Reduce batch size of commits"
    echo "   - Automate deployment triggers"
    echo ""
  fi

  if [[ "$LT_TIER" != *"Elite"* ]]; then
    echo "🔹 Lead Time for Changes:"
    echo "   - Optimize build pipeline (check for slow steps)"
    echo "   - Parallelize test execution"
    echo "   - Review npm caching effectiveness"
    echo "   - Consider faster test runners"
    echo ""
  fi

  if [[ "$CFR_TIER" != *"Elite"* ]]; then
    echo "🔹 Change Failure Rate:"
    echo "   - Increase test coverage (unit + E2E)"
    echo "   - Implement pre-merge CI checks"
    echo "   - Review recent failures for patterns"
    echo "   - Add more comprehensive health checks"
    echo ""
  fi

  if [[ "$MTTR_TIER" != *"Elite"* ]] && [ "$MTTR_VALUE" != "N/A" ]; then
    echo "🔹 Mean Time to Restore:"
    echo "   - Implement automated rollback procedures"
    echo "   - Improve monitoring and alerting"
    echo "   - Create hotfix deployment pipeline"
    echo "   - Maintain deployment artifacts for quick rollback"
    echo ""
  fi
fi

# ═══════════════════════════════════════════════════════════════
# DASHBOARD LINK
# ═══════════════════════════════════════════════════════════════

echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "📊 View Live Dashboard"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo ""
echo "https://dev.azure.com/ctn-demo/ASR/_dashboards"
echo ""
echo "Documentation: docs/devops/DORA_METRICS_DASHBOARD.md"
echo ""

# ═══════════════════════════════════════════════════════════════
# EXPORT OPTIONS
# ═══════════════════════════════════════════════════════════════

echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "💾 Export Report"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo ""

REPORT_FILE="dora-report-$(date +%Y%m%d).txt"
echo "Save this output to file: $REPORT_FILE"
echo "Run: ./scripts/generate-dora-report.sh $DAYS_BACK > $REPORT_FILE"
echo ""

# JSON output option
echo "For JSON output (automation-friendly):"
echo "az pipelines runs list --org $ORG --project $PROJECT --output json"
echo ""

echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "Report generation complete!"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo ""
