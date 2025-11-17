#!/bin/bash
###############################################################################
# Master Setup Script: Azure Monitor Deployment Alerts
#
# Purpose: Comprehensive alert configuration for CTN ASR monorepo
# Author: DevOps Guardian Agent
# Date: November 17, 2025
#
# This script orchestrates all alert setup tasks:
#   1. Teams webhook secrets (Key Vault storage)
#   2. Azure DevOps pipeline failure alerts (service hooks)
#   3. Health check monitoring alerts (Azure Monitor)
#   4. Application Insights performance alerts
#   5. Action group configuration (email + Teams)
#
# Usage:
#   ./scripts/setup-deployment-alerts.sh [--skip-webhooks] [--dry-run]
#
# Options:
#   --skip-webhooks    Skip Teams webhook configuration (use if already set up)
#   --dry-run          Show commands without executing (validation mode)
#   --help             Display this help message
#
###############################################################################

set -e

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Configuration
RESOURCE_GROUP="rg-ctn-demo-asr-dev"
FUNCTION_APP="func-ctn-demo-asr-dev"
APP_INSIGHTS="appi-ctn-demo-asr-dev"
KEY_VAULT="kv-ctn-demo-asr-dev"
AZDO_ORG="https://dev.azure.com/ctn-demo"
AZDO_PROJECT="ASR"
SUBSCRIPTION_ID=$(az account show --query id -o tsv)
DRY_RUN=false
SKIP_WEBHOOKS=false

###############################################################################
# Helper Functions
###############################################################################

print_header() {
  echo -e "\n${BLUE}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
  echo -e "${BLUE}$1${NC}"
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

run_command() {
  if [ "$DRY_RUN" = true ]; then
    echo -e "${YELLOW}[DRY-RUN]${NC} $1"
  else
    eval "$1"
  fi
}

check_prerequisites() {
  print_header "Checking Prerequisites"

  # Azure CLI
  if ! command -v az &> /dev/null; then
    print_error "Azure CLI not found. Install: https://aka.ms/azure-cli"
    exit 1
  fi
  print_success "Azure CLI installed ($(az --version | head -1))"

  # Azure DevOps extension
  if ! az extension list --query "[?name=='azure-devops'].name" -o tsv | grep -q "azure-devops"; then
    print_warning "Azure DevOps extension not installed. Installing..."
    run_command "az extension add --name azure-devops"
  fi
  print_success "Azure DevOps CLI extension available"

  # jq
  if ! command -v jq &> /dev/null; then
    print_error "jq not found. Install: brew install jq (macOS) or apt-get install jq (Ubuntu)"
    exit 1
  fi
  print_success "jq installed ($(jq --version))"

  # Verify Azure subscription
  if [ -z "$SUBSCRIPTION_ID" ]; then
    print_error "Not logged into Azure. Run: az login"
    exit 1
  fi
  print_success "Logged into Azure (Subscription: $SUBSCRIPTION_ID)"

  # Verify resource group exists
  if ! az group show --name "$RESOURCE_GROUP" &> /dev/null; then
    print_error "Resource group '$RESOURCE_GROUP' not found"
    exit 1
  fi
  print_success "Resource group '$RESOURCE_GROUP' exists"

  echo ""
}

###############################################################################
# Step 1: Teams Webhook Configuration
###############################################################################

configure_teams_webhooks() {
  if [ "$SKIP_WEBHOOKS" = true ]; then
    print_warning "Skipping Teams webhook configuration (--skip-webhooks)"
    return 0
  fi

  print_header "Step 1: Teams Webhook Configuration"

  print_info "Teams webhooks must be created manually in Teams app:"
  echo ""
  echo "  1. Open Teams → Your channel (e.g., #asr-deployments)"
  echo "  2. Click '...' → Manage channel → Connectors"
  echo "  3. Add 'Incoming Webhook'"
  echo "  4. Name: 'ASR Deployment Alerts'"
  echo "  5. Copy webhook URL"
  echo ""

  read -p "Have you created the Teams webhook? (y/n): " -n 1 -r
  echo
  if [[ ! $REPLY =~ ^[Yy]$ ]]; then
    print_warning "Skipping webhook configuration. Run this script again after creating webhook."
    return 0
  fi

  read -p "Enter Teams webhook URL: " WEBHOOK_URL

  if [ -z "$WEBHOOK_URL" ]; then
    print_error "Webhook URL cannot be empty"
    return 1
  fi

  # Store in Key Vault
  print_info "Storing webhook URL in Azure Key Vault..."
  run_command "az keyvault secret set \
    --vault-name '$KEY_VAULT' \
    --name 'TEAMS-WEBHOOK-DEPLOYMENTS' \
    --value '$WEBHOOK_URL' \
    --description 'Teams incoming webhook for deployment alerts'"

  print_success "Webhook URL stored in Key Vault: TEAMS-WEBHOOK-DEPLOYMENTS"

  # Test webhook
  print_info "Testing webhook..."
  TEST_PAYLOAD='{
    "@type": "MessageCard",
    "@context": "http://schema.org/extensions",
    "summary": "Test Alert",
    "themeColor": "0078D4",
    "title": "✅ Alert System Test",
    "text": "This is a test message from the deployment alerts setup script. If you see this, the webhook is working correctly!"
  }'

  if [ "$DRY_RUN" = false ]; then
    HTTP_STATUS=$(curl -s -o /dev/null -w "%{http_code}" \
      -H "Content-Type: application/json" \
      -d "$TEST_PAYLOAD" \
      "$WEBHOOK_URL")

    if [ "$HTTP_STATUS" = "200" ]; then
      print_success "Webhook test successful (HTTP $HTTP_STATUS)"
    else
      print_error "Webhook test failed (HTTP $HTTP_STATUS)"
      return 1
    fi
  fi

  echo ""
}

###############################################################################
# Step 2: Azure DevOps Pipeline Alerts
###############################################################################

configure_pipeline_alerts() {
  print_header "Step 2: Azure DevOps Pipeline Failure Alerts"

  # Get webhook URL from Key Vault
  if [ "$DRY_RUN" = false ]; then
    WEBHOOK_URL=$(az keyvault secret show \
      --vault-name "$KEY_VAULT" \
      --name "TEAMS-WEBHOOK-DEPLOYMENTS" \
      --query "value" -o tsv 2>/dev/null)

    if [ -z "$WEBHOOK_URL" ]; then
      print_error "Teams webhook URL not found in Key Vault. Run Step 1 first."
      return 1
    fi
  else
    WEBHOOK_URL="https://example.webhook.office.com/webhookb2/xxxxx"
  fi

  print_info "Configuring service hooks for pipeline failures..."

  # Login to Azure DevOps
  run_command "az devops login --organization '$AZDO_ORG'"

  # Note: Azure CLI doesn't support creating service hooks directly
  # This must be done via Azure DevOps REST API or Portal

  print_warning "Service hooks must be configured manually in Azure DevOps:"
  echo ""
  echo "  1. Navigate to: $AZDO_ORG/$AZDO_PROJECT/_settings/serviceHooks"
  echo "  2. Click '+ Create subscription'"
  echo "  3. Select 'Web Hooks'"
  echo "  4. Event: 'Build completed'"
  echo "  5. Filters:"
  echo "     - Build status: Failed"
  echo "     - Build pipeline: (select all ASR pipelines)"
  echo "  6. URL: (retrieve from Key Vault)"
  echo "     az keyvault secret show --vault-name $KEY_VAULT --name TEAMS-WEBHOOK-DEPLOYMENTS --query value -o tsv"
  echo ""

  print_info "Alternative: Use Logic Apps for automated webhook creation"
  echo "  See: scripts/setup-logic-app-alerts.json"

  echo ""
}

###############################################################################
# Step 3: Health Check Monitoring Alerts
###############################################################################

configure_health_alerts() {
  print_header "Step 3: Health Check Monitoring Alerts"

  print_info "Running health monitoring alerts script..."

  if [ -f "infrastructure/health-monitoring-alerts.sh" ]; then
    run_command "bash infrastructure/health-monitoring-alerts.sh"
    print_success "Health monitoring alerts configured"
  else
    print_error "Script not found: infrastructure/health-monitoring-alerts.sh"
    return 1
  fi

  echo ""
}

###############################################################################
# Step 4: Application Insights Performance Alerts
###############################################################################

configure_app_insights_alerts() {
  print_header "Step 4: Application Insights Performance Alerts"

  print_info "Running Application Insights alerts script..."

  if [ -f "infrastructure/app-insights-alerts.sh" ]; then
    run_command "bash infrastructure/app-insights-alerts.sh"
    print_success "Application Insights alerts configured"
  else
    print_error "Script not found: infrastructure/app-insights-alerts.sh"
    return 1
  fi

  echo ""
}

###############################################################################
# Step 5: Action Groups Configuration
###############################################################################

configure_action_groups() {
  print_header "Step 5: Action Groups Configuration"

  print_info "Creating action groups for alert notifications..."

  # Action Group: Critical Alerts (Teams + Email)
  print_info "Creating action group: ag-ctn-asr-critical"

  # Check if Teams webhook is available
  if [ "$DRY_RUN" = false ]; then
    WEBHOOK_URL=$(az keyvault secret show \
      --vault-name "$KEY_VAULT" \
      --name "TEAMS-WEBHOOK-DEPLOYMENTS" \
      --query "value" -o tsv 2>/dev/null)
  else
    WEBHOOK_URL="https://example.webhook.office.com/webhookb2/xxxxx"
  fi

  if [ -n "$WEBHOOK_URL" ]; then
    run_command "az monitor action-group create \
      --name 'ag-ctn-asr-critical' \
      --resource-group '$RESOURCE_GROUP' \
      --short-name 'ASR-Crit' \
      --email-receiver name='DevTeam' email='devteam@ctn.com' \
      --webhook-receiver name='Teams' service-uri='$WEBHOOK_URL' \
      || echo 'Action group already exists'"
  else
    run_command "az monitor action-group create \
      --name 'ag-ctn-asr-critical' \
      --resource-group '$RESOURCE_GROUP' \
      --short-name 'ASR-Crit' \
      --email-receiver name='DevTeam' email='devteam@ctn.com' \
      || echo 'Action group already exists'"
  fi

  # Action Group: Warning Alerts (Email only)
  print_info "Creating action group: ag-ctn-asr-warnings"
  run_command "az monitor action-group create \
    --name 'ag-ctn-asr-warnings' \
    --resource-group '$RESOURCE_GROUP' \
    --short-name 'ASR-Warn' \
    --email-receiver name='DevTeam' email='devteam@ctn.com' \
    || echo 'Action group already exists'"

  print_success "Action groups configured"

  # Update existing alerts to use action groups
  print_info "Updating existing alerts with action groups..."

  CRITICAL_ACTION_GROUP_ID=$(az monitor action-group show \
    --name "ag-ctn-asr-critical" \
    --resource-group "$RESOURCE_GROUP" \
    --query "id" -o tsv 2>/dev/null)

  if [ -n "$CRITICAL_ACTION_GROUP_ID" ]; then
    # Update health check alerts
    for alert in "ASR-Health-Endpoint-Unhealthy" "ASR-Function-Execution-Failures"; do
      print_info "Updating alert: $alert"
      run_command "az monitor metrics alert update \
        --name '$alert' \
        --resource-group '$RESOURCE_GROUP' \
        --add-action '$CRITICAL_ACTION_GROUP_ID' \
        || echo 'Alert not found or already configured'"
    done
  fi

  print_success "Alert action groups updated"
  echo ""
}

###############################################################################
# Step 6: Validation & Summary
###############################################################################

validate_configuration() {
  print_header "Step 6: Validation & Summary"

  print_info "Listing configured alerts..."
  run_command "az monitor metrics alert list \
    --resource-group '$RESOURCE_GROUP' \
    --query \"[?contains(name, 'ASR')].{Name:name, Severity:severity, Enabled:enabled}\" \
    --output table"

  echo ""
  print_info "Listing action groups..."
  run_command "az monitor action-group list \
    --resource-group '$RESOURCE_GROUP' \
    --query \"[?contains(name, 'ag-ctn-asr')].{Name:name, ShortName:shortName, Enabled:enabled}\" \
    --output table"

  echo ""
  print_success "Alert configuration complete!"
  echo ""

  print_header "Next Steps"
  echo "1. Test alerts using: ./scripts/test-all-alerts.sh"
  echo "2. Configure Azure DevOps service hooks manually (see Step 2 output)"
  echo "3. Monitor alert history: Azure Portal > Monitor > Alerts"
  echo "4. Review documentation: docs/AZURE_MONITOR_DEPLOYMENT_ALERTS_SETUP.md"
  echo ""
}

###############################################################################
# Main Execution
###############################################################################

main() {
  # Parse command line arguments
  while [[ $# -gt 0 ]]; do
    case $1 in
      --skip-webhooks)
        SKIP_WEBHOOKS=true
        shift
        ;;
      --dry-run)
        DRY_RUN=true
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

  if [ "$DRY_RUN" = true ]; then
    print_warning "DRY-RUN MODE: Commands will be displayed but not executed"
    echo ""
  fi

  print_header "Azure Monitor Deployment Alerts Setup"
  echo "Resource Group: $RESOURCE_GROUP"
  echo "Function App: $FUNCTION_APP"
  echo "App Insights: $APP_INSIGHTS"
  echo "Subscription: $SUBSCRIPTION_ID"
  echo ""

  # Execute setup steps
  check_prerequisites
  configure_teams_webhooks
  configure_pipeline_alerts
  configure_health_alerts
  configure_app_insights_alerts
  configure_action_groups
  validate_configuration

  print_success "Setup completed successfully!"
}

# Run main function
main "$@"
