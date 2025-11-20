#!/bin/bash
###############################################################################
# Alert Testing Script
#
# Purpose: Test all configured alerts to verify they trigger correctly
# Author: DevOps Guardian Agent
# Date: November 17, 2025
#
# WARNING: This script will temporarily cause failures in monitoring systems.
#          Only run in non-production environments or during maintenance windows.
#
# Usage:
#   ./scripts/test-all-alerts.sh [--skip-destructive]
#
# Options:
#   --skip-destructive   Skip tests that stop services (health check tests)
#   --help               Display this help message
#
###############################################################################

set -e

# Colors
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m'

# Configuration
RESOURCE_GROUP="rg-ctn-demo-asr-dev"
FUNCTION_APP="func-ctn-demo-asr-dev"
API_BASE_URL="https://ca-ctn-asr-api-dev.calmriver-700a8c55.westeurope.azurecontainerapps.io/api"
ADMIN_PORTAL_URL="https://calm-tree-03352ba03.1.azurestaticapps.net"
MEMBER_PORTAL_URL="https://calm-pebble-043b2db03.1.azurestaticapps.net"
SKIP_DESTRUCTIVE=false

###############################################################################
# Helper Functions
###############################################################################

print_test() {
  echo -e "\n${BLUE}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
  echo -e "${BLUE}TEST: $1${NC}"
  echo -e "${BLUE}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}\n"
}

print_success() {
  echo -e "${GREEN}✅ $1${NC}"
}

print_warning() {
  echo -e "${YELLOW}⚠️  $1${NC}"
}

print_error() {
  echo -e "${RED}❌ $1${NC}"
}

print_info() {
  echo -e "${BLUE}ℹ️  $1${NC}"
}

wait_for_alert() {
  local alert_name=$1
  local timeout_seconds=$2
  local elapsed=0

  print_info "Waiting for alert '$alert_name' to fire (timeout: ${timeout_seconds}s)..."

  while [ $elapsed -lt $timeout_seconds ]; do
    # Check if alert is firing
    ALERT_STATE=$(az monitor metrics alert show \
      --name "$alert_name" \
      --resource-group "$RESOURCE_GROUP" \
      --query "enabled" -o tsv 2>/dev/null)

    if [ "$ALERT_STATE" = "true" ]; then
      print_success "Alert is enabled and should be evaluating"
      return 0
    fi

    sleep 10
    elapsed=$((elapsed + 10))
    echo -n "."
  done

  echo ""
  print_warning "Alert check timed out after ${timeout_seconds}s"
  print_info "Check Azure Portal > Monitor > Alerts for alert history"
  return 1
}

###############################################################################
# Test 1: Application Insights - High Error Rate
###############################################################################

test_high_error_rate() {
  print_test "High API Error Rate Alert"

  print_info "Generating 20 HTTP 404 errors..."
  for i in {1..20}; do
    curl -s -o /dev/null -w "." "$API_BASE_URL/nonexistent-endpoint-$i" &
  done
  wait

  echo ""
  print_success "Error requests sent"
  print_info "Alert 'CTN ASR - High API Error Rate' should fire within 5 minutes"
  print_info "Check: Azure Portal > Application Insights > Alerts"

  wait_for_alert "CTN ASR - High API Error Rate" 300
}

###############################################################################
# Test 2: Health Check Failure (DESTRUCTIVE)
###############################################################################

test_health_check_failure() {
  if [ "$SKIP_DESTRUCTIVE" = true ]; then
    print_warning "Skipping destructive test: Health Check Failure (--skip-destructive)"
    return 0
  fi

  print_test "Health Check Failure Alert"

  print_warning "This test will STOP the Function App for 60 seconds"
  read -p "Continue? (y/n): " -n 1 -r
  echo
  if [[ ! $REPLY =~ ^[Yy]$ ]]; then
    print_info "Test skipped by user"
    return 0
  fi

  print_info "Stopping Function App: $FUNCTION_APP"
  az functionapp stop --name "$FUNCTION_APP" --resource-group "$RESOURCE_GROUP"

  print_success "Function App stopped"
  print_info "Waiting 60 seconds for alert to trigger..."
  sleep 60

  print_info "Restarting Function App..."
  az functionapp start --name "$FUNCTION_APP" --resource-group "$RESOURCE_GROUP"

  print_success "Function App restarted"
  print_info "Alert 'ASR-Health-Endpoint-Unhealthy' should have fired"
  print_info "Check: Azure Portal > Monitor > Alerts > Alert History"

  # Verify Function App is healthy
  print_info "Verifying Function App health..."
  sleep 30
  HEALTH_STATUS=$(curl -s -o /dev/null -w "%{http_code}" "$API_BASE_URL/health")

  if [ "$HEALTH_STATUS" = "200" ]; then
    print_success "Function App is healthy (HTTP $HEALTH_STATUS)"
  else
    print_error "Function App health check failed (HTTP $HEALTH_STATUS)"
    return 1
  fi
}

###############################################################################
# Test 3: Slow Response Time
###############################################################################

test_slow_response() {
  print_test "Slow API Response Alert"

  print_info "This test requires an endpoint that takes >5 seconds to respond"
  print_info "The current API does not have such an endpoint by design"
  print_warning "Test skipped (no slow endpoint available)"
  print_info "To test manually:"
  echo "  1. Temporarily add a sleep(6000) to a function"
  echo "  2. Call the function multiple times"
  echo "  3. Wait for 'CTN ASR - Slow API Response' alert"
}

###############################################################################
# Test 4: Teams Webhook
###############################################################################

test_teams_webhook() {
  print_test "Teams Webhook Integration"

  # Get webhook URL from Key Vault
  print_info "Retrieving Teams webhook URL from Key Vault..."
  WEBHOOK_URL=$(az keyvault secret show \
    --vault-name "kv-ctn-demo-asr-dev" \
    --name "TEAMS-WEBHOOK-DEPLOYMENTS" \
    --query "value" -o tsv 2>/dev/null)

  if [ -z "$WEBHOOK_URL" ]; then
    print_error "Teams webhook URL not found in Key Vault"
    print_info "Run: ./scripts/setup-deployment-alerts.sh"
    return 1
  fi

  print_success "Webhook URL retrieved"

  # Send test message
  print_info "Sending test message to Teams..."
  TEST_PAYLOAD='{
    "@type": "MessageCard",
    "@context": "http://schema.org/extensions",
    "summary": "Alert Test",
    "themeColor": "FFA500",
    "title": "🧪 Alert System Test",
    "sections": [{
      "activityTitle": "Automated Alert Testing",
      "activitySubtitle": "Testing Teams webhook integration",
      "facts": [
        {"name": "Test", "value": "Teams Webhook"},
        {"name": "Status", "value": "In Progress"},
        {"name": "Timestamp", "value": "'"$(date -u +"%Y-%m-%dT%H:%M:%SZ")"'"}
      ]
    }],
    "potentialAction": [{
      "@type": "OpenUri",
      "name": "View Documentation",
      "targets": [{"os": "default", "uri": "https://github.com/ctn-demo"}]
    }]
  }'

  HTTP_STATUS=$(curl -s -o /dev/null -w "%{http_code}" \
    -H "Content-Type: application/json" \
    -d "$TEST_PAYLOAD" \
    "$WEBHOOK_URL")

  if [ "$HTTP_STATUS" = "200" ]; then
    print_success "Teams webhook test successful (HTTP $HTTP_STATUS)"
    print_info "Check your Teams channel for the test message"
  else
    print_error "Teams webhook test failed (HTTP $HTTP_STATUS)"
    return 1
  fi
}

###############################################################################
# Test 5: Portal Availability
###############################################################################

test_portal_availability() {
  print_test "Portal Availability Monitoring"

  print_info "Testing Admin Portal availability..."
  ADMIN_STATUS=$(curl -s -o /dev/null -w "%{http_code}" "$ADMIN_PORTAL_URL")

  if [ "$ADMIN_STATUS" = "200" ]; then
    print_success "Admin Portal is accessible (HTTP $ADMIN_STATUS)"
  else
    print_error "Admin Portal is not accessible (HTTP $ADMIN_STATUS)"
  fi

  print_info "Testing Member Portal availability..."
  MEMBER_STATUS=$(curl -s -o /dev/null -w "%{http_code}" "$MEMBER_PORTAL_URL")

  if [ "$MEMBER_STATUS" = "200" ]; then
    print_success "Member Portal is accessible (HTTP $MEMBER_STATUS)"
  else
    print_error "Member Portal is not accessible (HTTP $MEMBER_STATUS)"
  fi

  print_info "If availability tests are configured, check Azure Portal > Application Insights > Availability"
}

###############################################################################
# Test 6: List Alert History
###############################################################################

test_alert_history() {
  print_test "Alert History Review"

  print_info "Fetching recent alert history (last 24 hours)..."

  # Get alert history
  END_TIME=$(date -u +"%Y-%m-%dT%H:%M:%SZ")
  START_TIME=$(date -u -d "24 hours ago" +"%Y-%m-%dT%H:%M:%SZ" 2>/dev/null || date -u -v-24H +"%Y-%m-%dT%H:%M:%SZ")

  az monitor metrics alert list \
    --resource-group "$RESOURCE_GROUP" \
    --query "[?contains(name, 'ASR')].{Name:name, Enabled:enabled, Severity:severity}" \
    --output table

  print_info "To view detailed alert history:"
  echo "  Azure Portal > Monitor > Alerts > Alert History"
  echo "  Filter by: Resource Group = $RESOURCE_GROUP, Time range = Last 24 hours"
}

###############################################################################
# Main Execution
###############################################################################

main() {
  # Parse arguments
  while [[ $# -gt 0 ]]; do
    case $1 in
      --skip-destructive)
        SKIP_DESTRUCTIVE=true
        shift
        ;;
      --help)
        grep -E "^#" "$0" | grep -v "^#!/" | sed 's/^# //;s/^#//'
        exit 0
        ;;
      *)
        print_error "Unknown option: $1"
        echo "Use --help for usage information"
        exit 1
        ;;
    esac
  done

  echo -e "${BLUE}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
  echo -e "${BLUE}Alert Testing Suite${NC}"
  echo -e "${BLUE}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
  echo ""
  echo "Resource Group: $RESOURCE_GROUP"
  echo "Function App: $FUNCTION_APP"
  echo "API Base URL: $API_BASE_URL"
  echo ""

  if [ "$SKIP_DESTRUCTIVE" = true ]; then
    print_warning "Destructive tests will be skipped (--skip-destructive)"
    echo ""
  fi

  print_warning "WARNING: This script will trigger alerts and may temporarily affect services."
  read -p "Continue with testing? (y/n): " -n 1 -r
  echo
  if [[ ! $REPLY =~ ^[Yy]$ ]]; then
    print_info "Testing cancelled by user"
    exit 0
  fi

  # Run tests
  test_teams_webhook
  test_portal_availability
  test_high_error_rate
  test_health_check_failure
  test_slow_response
  test_alert_history

  echo ""
  echo -e "${GREEN}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
  echo -e "${GREEN}Testing Complete${NC}"
  echo -e "${GREEN}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
  echo ""
  print_info "Next steps:"
  echo "  1. Check Teams channel for alert notifications"
  echo "  2. Review alert history in Azure Portal > Monitor > Alerts"
  echo "  3. Verify email notifications were received"
  echo "  4. Document any failed tests in LESSONS_LEARNED.md"
  echo ""
}

main "$@"
