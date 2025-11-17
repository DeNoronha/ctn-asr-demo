#!/bin/bash
# ========================================
# Azure Functions Deployment Slot Management
# ========================================
# Manages deployment slots for Azure Functions
# Supports: create, swap, rollback, status, delete operations
#
# Usage: ./manage-deployment-slots.sh [create|swap|rollback|status|delete]
#
# Requirements:
# - Azure CLI installed and authenticated
# - Appropriate permissions on resource group

set -e

# Configuration
FUNCTION_APP="func-ctn-demo-asr-dev"
RESOURCE_GROUP="rg-ctn-demo-asr-dev"
STAGING_SLOT="staging"

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

function log_info() {
  echo -e "${BLUE}ℹ${NC} $1"
}

function log_success() {
  echo -e "${GREEN}✅${NC} $1"
}

function log_warning() {
  echo -e "${YELLOW}⚠${NC} $1"
}

function log_error() {
  echo -e "${RED}❌${NC} $1"
}

function check_azure_login() {
  if ! az account show &>/dev/null; then
    log_error "Not logged in to Azure CLI"
    echo "Run: az login"
    exit 1
  fi
  log_success "Azure CLI authenticated"
}

function create_staging_slot() {
  log_info "Creating staging deployment slot..."

  # Check if slot already exists
  if az functionapp deployment slot list \
    --name "$FUNCTION_APP" \
    --resource-group "$RESOURCE_GROUP" \
    --query "[?name=='$STAGING_SLOT']" \
    --output tsv | grep -q "$STAGING_SLOT"; then
    log_warning "Staging slot already exists"
    return 0
  fi

  # Create staging slot
  az functionapp deployment slot create \
    --name "$FUNCTION_APP" \
    --resource-group "$RESOURCE_GROUP" \
    --slot "$STAGING_SLOT" \
    --configuration-source "$FUNCTION_APP"

  log_success "Staging slot created"

  log_info "Configuring staging-specific settings..."

  # Set sticky settings (slot-specific)
  # Note: --slot-settings must be separate from --settings
  az functionapp config appsettings set \
    --name "$FUNCTION_APP" \
    --resource-group "$RESOURCE_GROUP" \
    --slot "$STAGING_SLOT" \
    --settings ENVIRONMENT=staging LOG_LEVEL=debug \
    --output none

  # Mark settings as slot-specific (sticky)
  az functionapp config appsettings set \
    --name "$FUNCTION_APP" \
    --resource-group "$RESOURCE_GROUP" \
    --slot "$STAGING_SLOT" \
    --slot-settings ENVIRONMENT LOG_LEVEL \
    --output none

  log_success "Staging-specific settings configured"

  # Enable always-on for staging slot (only for Premium/Dedicated plans)
  log_info "Checking if always-on can be enabled..."
  PLAN_SKU=$(az functionapp show \
    --name "$FUNCTION_APP" \
    --resource-group "$RESOURCE_GROUP" \
    --query "sku" \
    --output tsv)

  if [[ "$PLAN_SKU" == "Dynamic" ]] || [[ "$PLAN_SKU" == "Y1" ]]; then
    log_warning "Consumption plan detected - always-on not supported (slot will auto-scale)"
  else
    az functionapp config set \
      --name "$FUNCTION_APP" \
      --resource-group "$RESOURCE_GROUP" \
      --slot "$STAGING_SLOT" \
      --always-on true \
      --output none
    log_success "Always-on enabled"
  fi

  echo ""
  log_success "Staging slot created and configured successfully"
  echo ""
  echo "Staging URL: https://${FUNCTION_APP}-${STAGING_SLOT}.azurewebsites.net"
  echo ""
}

function swap_slots() {
  log_info "Performing slot swap: staging → production"

  # Health check before swap
  log_info "Running pre-swap health check on staging..."
  STAGING_URL="https://${FUNCTION_APP}-${STAGING_SLOT}.azurewebsites.net/api/health"

  if ! curl -s -f "$STAGING_URL" > /dev/null; then
    log_error "Staging health check failed. Aborting swap."
    log_warning "Fix staging slot issues before swapping to production"
    exit 1
  fi

  log_success "Staging health check passed"

  # Perform swap
  log_info "Swapping slots (this may take 20-30 seconds)..."
  az functionapp deployment slot swap \
    --name "$FUNCTION_APP" \
    --resource-group "$RESOURCE_GROUP" \
    --slot "$STAGING_SLOT" \
    --target-slot production

  log_success "Slot swap completed"

  # Post-swap verification
  log_info "Verifying production after swap..."
  sleep 5

  PROD_URL="https://${FUNCTION_APP}.azurewebsites.net/api/health"
  if curl -s -f "$PROD_URL" > /dev/null; then
    log_success "Production health check passed"
  else
    log_warning "Production health check failed. Consider rollback."
  fi

  echo ""
  log_success "Slot swap completed successfully"
  echo ""
  echo "Production URL: https://${FUNCTION_APP}.azurewebsites.net"
  echo "Staging URL (now old version): https://${FUNCTION_APP}-${STAGING_SLOT}.azurewebsites.net"
  echo ""
}

function rollback_deployment() {
  log_warning "Performing emergency rollback..."

  read -p "Are you sure you want to rollback production? (yes/no): " confirm
  if [[ "$confirm" != "yes" ]]; then
    log_info "Rollback cancelled"
    exit 0
  fi

  log_info "Swapping slots: production ↔ staging (rollback)"
  log_info "This will restore the previous version to production"

  az functionapp deployment slot swap \
    --name "$FUNCTION_APP" \
    --resource-group "$RESOURCE_GROUP" \
    --slot "$STAGING_SLOT" \
    --target-slot production

  log_success "Rollback completed"

  # Verify rollback
  log_info "Verifying production after rollback..."
  sleep 5

  PROD_URL="https://${FUNCTION_APP}.azurewebsites.net/api/health"
  if curl -s -f "$PROD_URL" > /dev/null; then
    log_success "Production health check passed after rollback"
  else
    log_error "Production health check failed after rollback"
    log_warning "Manual intervention required"
  fi

  echo ""
  log_success "Rollback completed successfully"
  echo ""
  echo "Production URL: https://${FUNCTION_APP}.azurewebsites.net"
  echo ""
}

function show_slot_status() {
  echo ""
  echo "=========================================="
  echo "Deployment Slot Status"
  echo "=========================================="
  echo ""

  # List all slots
  az functionapp deployment slot list \
    --name "$FUNCTION_APP" \
    --resource-group "$RESOURCE_GROUP" \
    --output table

  echo ""
  echo "=========================================="
  echo "Slot URLs"
  echo "=========================================="
  echo ""
  echo "Production: https://${FUNCTION_APP}.azurewebsites.net"
  echo "Staging:    https://${FUNCTION_APP}-${STAGING_SLOT}.azurewebsites.net"
  echo ""

  # Health check both slots
  echo "=========================================="
  echo "Health Checks"
  echo "=========================================="
  echo ""

  PROD_URL="https://${FUNCTION_APP}.azurewebsites.net/api/health"
  STAGING_URL="https://${FUNCTION_APP}-${STAGING_SLOT}.azurewebsites.net/api/health"

  echo -n "Production: "
  if curl -s -f "$PROD_URL" > /dev/null 2>&1; then
    log_success "Healthy"
  else
    log_error "Unhealthy"
  fi

  echo -n "Staging:    "
  if curl -s -f "$STAGING_URL" > /dev/null 2>&1; then
    log_success "Healthy"
  else
    log_warning "Unhealthy or not created"
  fi

  echo ""
}

function delete_staging_slot() {
  log_warning "This will delete the staging deployment slot"

  read -p "Are you sure? (yes/no): " confirm
  if [[ "$confirm" != "yes" ]]; then
    log_info "Deletion cancelled"
    exit 0
  fi

  log_info "Deleting staging slot..."
  az functionapp deployment slot delete \
    --name "$FUNCTION_APP" \
    --resource-group "$RESOURCE_GROUP" \
    --slot "$STAGING_SLOT"

  log_success "Staging slot deleted"
  log_warning "You will need to recreate the slot for future deployments"
}

function show_help() {
  cat << EOF

Azure Functions Deployment Slot Management

Usage: $0 [command]

Commands:
  create    Create staging deployment slot
  swap      Swap staging to production (promote new version)
  rollback  Rollback production to previous version (swap back)
  status    Show current slot status and health
  delete    Delete staging slot (careful!)

Examples:
  # Create staging slot
  $0 create

  # Check slot status
  $0 status

  # Promote staging to production
  $0 swap

  # Emergency rollback
  $0 rollback

Environment:
  FUNCTION_APP:    $FUNCTION_APP
  RESOURCE_GROUP:  $RESOURCE_GROUP
  STAGING_SLOT:    $STAGING_SLOT

EOF
}

# Main execution
check_azure_login

case "$1" in
  create)
    create_staging_slot
    ;;
  swap)
    swap_slots
    ;;
  rollback)
    rollback_deployment
    ;;
  status)
    show_slot_status
    ;;
  delete)
    delete_staging_slot
    ;;
  help|--help|-h|"")
    show_help
    ;;
  *)
    log_error "Unknown command: $1"
    show_help
    exit 1
    ;;
esac
