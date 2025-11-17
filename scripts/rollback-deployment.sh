#!/bin/bash
# ========================================
# CTN ASR - Automated Deployment Rollback
# ========================================
# Performs rollback of API or Portal deployments
#
# Usage: ./rollback-deployment.sh [component] [optional-commit-hash]
#
# Components:
#   api            - Rollback Azure Functions API (slot swap)
#   admin-portal   - Rollback Admin Portal (redeploy previous commit)
#   member-portal  - Rollback Member Portal (redeploy previous commit)
#
# Requirements:
# - Azure CLI installed and authenticated
# - Appropriate permissions on resources
# - For portals: Azure Static Web Apps deployment token in Key Vault

set -e

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
CYAN='\033[0;36m'
NC='\033[0m' # No Color

# Configuration
FUNCTION_APP="func-ctn-demo-asr-dev"
RESOURCE_GROUP="rg-ctn-demo-asr-dev"
ADMIN_SWA="calm-tree-03352ba03"
MEMBER_SWA="calm-pebble-043b2db03"
KEY_VAULT="kv-ctn-demo-asr-dev"

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

function log_header() {
  echo ""
  echo -e "${CYAN}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
  echo -e "${CYAN}$1${NC}"
  echo -e "${CYAN}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
  echo ""
}

function check_azure_login() {
  if ! az account show &>/dev/null; then
    log_error "Not logged in to Azure CLI"
    echo "Run: az login"
    exit 1
  fi
  log_success "Azure CLI authenticated"
}

function confirm_rollback() {
  local component=$1
  local target_version=$2

  log_warning "You are about to rollback: $component"
  echo ""
  echo "Target version: $target_version"
  echo "Current production will be replaced with this version"
  echo ""

  read -p "Are you sure you want to proceed? (yes/no): " confirm
  if [[ "$confirm" != "yes" ]]; then
    log_info "Rollback cancelled by user"
    exit 0
  fi
}

function rollback_api() {
  log_header "Rolling Back API (Azure Functions)"

  # Health check on staging (previous version)
  log_info "Checking staging slot health (previous version)..."
  STAGING_URL="https://${FUNCTION_APP}-staging.azurewebsites.net/api/health"

  STAGING_HEALTH=$(curl -s -o /dev/null -w "%{http_code}" "$STAGING_URL")

  if [ "$STAGING_HEALTH" != "200" ]; then
    log_warning "Staging slot health check returned HTTP $STAGING_HEALTH"
    log_warning "Previous version may have issues"
    read -p "Continue with rollback anyway? (yes/no): " continue_rollback
    if [[ "$continue_rollback" != "yes" ]]; then
      log_info "Rollback cancelled"
      exit 0
    fi
  else
    log_success "Staging slot is healthy (HTTP 200)"
  fi

  confirm_rollback "API (Azure Functions)" "Previous deployment in staging slot"

  # Perform slot swap (rollback)
  log_info "Swapping slots: production ↔ staging (rollback)..."
  az functionapp deployment slot swap \
    --name "$FUNCTION_APP" \
    --resource-group "$RESOURCE_GROUP" \
    --slot staging \
    --target-slot production

  log_success "Slot swap completed"

  # Verify production after rollback
  log_info "Verifying production after rollback..."
  sleep 10

  PROD_URL="https://${FUNCTION_APP}.azurewebsites.net/api/health"
  PROD_HEALTH=$(curl -s -o /dev/null -w "%{http_code}" "$PROD_URL")

  if [ "$PROD_HEALTH" = "200" ]; then
    log_header "✅ API ROLLBACK SUCCESSFUL"
    echo "Production health check: PASSED (HTTP 200)"
    echo ""
    curl -s "$PROD_URL" | jq '.'
    echo ""
    log_success "Production restored to previous working version"
  else
    log_header "❌ API ROLLBACK VERIFICATION FAILED"
    echo "Production health check: FAILED (HTTP $PROD_HEALTH)"
    log_error "Manual intervention required"
    exit 1
  fi
}

function rollback_admin_portal() {
  local target_commit=$1

  log_header "Rolling Back Admin Portal"

  # Determine target commit
  if [ -z "$target_commit" ]; then
    log_info "Finding previous successful deployment..."

    # Get last 5 commits that touched admin-portal
    target_commit=$(git log -5 --oneline --no-merges -- admin-portal/ | \
      awk '{print $1}' | \
      sed -n '2p')  # Get 2nd commit (1st is current, 2nd is previous)

    if [ -z "$target_commit" ]; then
      log_error "Could not find previous admin-portal commit"
      exit 1
    fi

    log_info "Previous commit: $target_commit"
    git log -1 --oneline "$target_commit"
  fi

  confirm_rollback "Admin Portal" "Commit: $target_commit"

  # Get deployment token from Key Vault
  log_info "Fetching deployment token from Key Vault..."
  DEPLOYMENT_TOKEN=$(az keyvault secret show \
    --vault-name "$KEY_VAULT" \
    --name "AZURE-STATIC-WEB-APPS-API-TOKEN-ADMIN" \
    --query "value" \
    --output tsv)

  if [ -z "$DEPLOYMENT_TOKEN" ]; then
    log_error "Failed to fetch deployment token from Key Vault"
    exit 1
  fi

  log_success "Deployment token retrieved"

  # Checkout target commit
  log_info "Checking out commit: $target_commit"
  git checkout "$target_commit" -- admin-portal/

  # Install dependencies
  log_info "Installing dependencies..."
  npm ci --legacy-peer-deps --silent

  # Build admin portal
  log_info "Building Admin Portal..."
  cd admin-portal
  npm run build

  # Deploy to Azure Static Web Apps
  log_info "Deploying to Azure Static Web Apps..."
  npx @azure/static-web-apps-cli@latest deploy build \
    --deployment-token "$DEPLOYMENT_TOKEN" \
    --env production

  cd ..

  # Restore git working directory
  git restore admin-portal/

  # Verify deployment
  log_info "Verifying deployment..."
  sleep 10

  PORTAL_URL="https://${ADMIN_SWA}.1.azurestaticapps.net"
  PORTAL_STATUS=$(curl -s -o /dev/null -w "%{http_code}" "$PORTAL_URL")

  if [ "$PORTAL_STATUS" = "200" ]; then
    log_header "✅ ADMIN PORTAL ROLLBACK SUCCESSFUL"
    echo "Portal URL: $PORTAL_URL"
    echo "Rolled back to commit: $target_commit"
  else
    log_header "❌ ADMIN PORTAL ROLLBACK VERIFICATION FAILED"
    echo "Portal returned HTTP $PORTAL_STATUS"
    log_error "Manual intervention required"
    exit 1
  fi
}

function rollback_member_portal() {
  local target_commit=$1

  log_header "Rolling Back Member Portal"

  # Determine target commit
  if [ -z "$target_commit" ]; then
    log_info "Finding previous successful deployment..."

    target_commit=$(git log -5 --oneline --no-merges -- member-portal/ | \
      awk '{print $1}' | \
      sed -n '2p')

    if [ -z "$target_commit" ]; then
      log_error "Could not find previous member-portal commit"
      exit 1
    fi

    log_info "Previous commit: $target_commit"
    git log -1 --oneline "$target_commit"
  fi

  confirm_rollback "Member Portal" "Commit: $target_commit"

  # Get deployment token from Key Vault
  log_info "Fetching deployment token from Key Vault..."
  DEPLOYMENT_TOKEN=$(az keyvault secret show \
    --vault-name "$KEY_VAULT" \
    --name "AZURE-STATIC-WEB-APPS-API-TOKEN-MEMBER" \
    --query "value" \
    --output tsv)

  if [ -z "$DEPLOYMENT_TOKEN" ]; then
    log_error "Failed to fetch deployment token from Key Vault"
    exit 1
  fi

  log_success "Deployment token retrieved"

  # Checkout target commit
  log_info "Checking out commit: $target_commit"
  git checkout "$target_commit" -- member-portal/

  # Install dependencies
  log_info "Installing dependencies..."
  npm ci --legacy-peer-deps --silent

  # Build member portal
  log_info "Building Member Portal..."
  cd member-portal
  npm run build

  # Deploy to Azure Static Web Apps
  log_info "Deploying to Azure Static Web Apps..."
  npx @azure/static-web-apps-cli@latest deploy build \
    --deployment-token "$DEPLOYMENT_TOKEN" \
    --env production

  cd ..

  # Restore git working directory
  git restore member-portal/

  # Verify deployment
  log_info "Verifying deployment..."
  sleep 10

  PORTAL_URL="https://${MEMBER_SWA}.1.azurestaticapps.net"
  PORTAL_STATUS=$(curl -s -o /dev/null -w "%{http_code}" "$PORTAL_URL")

  if [ "$PORTAL_STATUS" = "200" ]; then
    log_header "✅ MEMBER PORTAL ROLLBACK SUCCESSFUL"
    echo "Portal URL: $PORTAL_URL"
    echo "Rolled back to commit: $target_commit"
  else
    log_header "❌ MEMBER PORTAL ROLLBACK VERIFICATION FAILED"
    echo "Portal returned HTTP $PORTAL_STATUS"
    log_error "Manual intervention required"
    exit 1
  fi
}

function show_deployment_history() {
  log_header "Recent Deployment History"

  echo "Last 10 deployments:"
  echo ""

  # API deployments (commits to api/)
  echo "API (Azure Functions):"
  git log -10 --oneline --no-merges -- api/ | head -5
  echo ""

  # Admin Portal deployments
  echo "Admin Portal:"
  git log -10 --oneline --no-merges -- admin-portal/ | head -5
  echo ""

  # Member Portal deployments
  echo "Member Portal:"
  git log -10 --oneline --no-merges -- member-portal/ | head -5
  echo ""

  log_info "Current production versions:"
  echo ""

  # Check API version
  API_HEALTH=$(curl -s "https://${FUNCTION_APP}.azurewebsites.net/api/health")
  API_VERSION=$(echo "$API_HEALTH" | jq -r '.version // "unknown"')
  echo "API: $API_VERSION"

  # Check portal accessibility
  ADMIN_STATUS=$(curl -s -o /dev/null -w "%{http_code}" "https://${ADMIN_SWA}.1.azurestaticapps.net")
  echo "Admin Portal: HTTP $ADMIN_STATUS"

  MEMBER_STATUS=$(curl -s -o /dev/null -w "%{http_code}" "https://${MEMBER_SWA}.1.azurestaticapps.net")
  echo "Member Portal: HTTP $MEMBER_STATUS"

  echo ""
}

function show_help() {
  cat << EOF

CTN ASR - Automated Deployment Rollback

Usage: $0 [component] [optional-commit-hash]

Components:
  api              Rollback Azure Functions API (slot swap)
  admin-portal     Rollback Admin Portal (redeploy previous commit)
  member-portal    Rollback Member Portal (redeploy previous commit)
  history          Show recent deployment history

Examples:
  # Rollback API to previous deployment
  $0 api

  # Rollback Admin Portal to specific commit
  $0 admin-portal abc1234

  # Rollback Member Portal to previous deployment
  $0 member-portal

  # Show deployment history
  $0 history

Rollback Mechanisms:
  API (Azure Functions):
    - Swaps production and staging slots
    - Previous version must be in staging slot
    - Zero downtime rollback
    - Time to rollback: ~60 seconds

  Portals (Static Web Apps):
    - Redeploys previous commit
    - Automatically finds last successful commit
    - Can specify exact commit hash
    - Time to rollback: ~2-3 minutes

Environment:
  FUNCTION_APP:   $FUNCTION_APP
  RESOURCE_GROUP: $RESOURCE_GROUP
  ADMIN_SWA:      $ADMIN_SWA
  MEMBER_SWA:     $MEMBER_SWA
  KEY_VAULT:      $KEY_VAULT

EOF
}

# Main execution
check_azure_login

COMPONENT=$1
TARGET_COMMIT=$2

case "$COMPONENT" in
  api)
    rollback_api
    ;;
  admin-portal)
    rollback_admin_portal "$TARGET_COMMIT"
    ;;
  member-portal)
    rollback_member_portal "$TARGET_COMMIT"
    ;;
  history)
    show_deployment_history
    ;;
  help|--help|-h|"")
    show_help
    ;;
  *)
    log_error "Unknown component: $COMPONENT"
    show_help
    exit 1
    ;;
esac
