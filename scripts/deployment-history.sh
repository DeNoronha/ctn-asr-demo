#!/bin/bash
# ========================================
# Deployment History Tracker
# ========================================
# Displays deployment history and current production versions
#
# Usage: ./deployment-history.sh [--json]

set -e

# Configuration
FUNCTION_APP="func-ctn-demo-asr-dev"
RESOURCE_GROUP="rg-ctn-demo-asr-dev"
ADMIN_SWA="calm-tree-03352ba03"
MEMBER_SWA="calm-pebble-043b2db03"

# Colors
GREEN='\033[0;32m'
BLUE='\033[0;34m'
CYAN='\033[0;36m'
YELLOW='\033[1;33m'
NC='\033[0m'

OUTPUT_JSON=false

if [[ "$1" == "--json" ]]; then
  OUTPUT_JSON=true
fi

function get_api_version() {
  local health_url="https://${FUNCTION_APP}.azurewebsites.net/api/health"
  local health_response=$(curl -s "$health_url" 2>/dev/null || echo '{}')

  echo "$health_response" | jq -r '.version // "unknown"'
}

function get_api_commit() {
  local health_url="https://${FUNCTION_APP}.azurewebsites.net/api/health"
  local health_response=$(curl -s "$health_url" 2>/dev/null || echo '{}')

  echo "$health_response" | jq -r '.commit // "unknown"'
}

function get_deployment_time() {
  local component=$1
  local path=""

  case "$component" in
    api)
      path="api/"
      ;;
    admin-portal)
      path="admin-portal/"
      ;;
    member-portal)
      path="member-portal/"
      ;;
  esac

  # Get most recent commit timestamp for path
  git log -1 --format="%ar" -- "$path" 2>/dev/null || echo "unknown"
}

function get_last_n_deployments() {
  local component=$1
  local count=$2
  local path=""

  case "$component" in
    api)
      path="api/"
      ;;
    admin-portal)
      path="admin-portal/"
      ;;
    member-portal)
      path="member-portal/"
      ;;
  esac

  # Get last N commits with hash, timestamp, and message
  git log -"$count" --oneline --no-merges --format="%h|%ar|%s" -- "$path"
}

function check_portal_status() {
  local portal_url=$1
  local status=$(curl -s -o /dev/null -w "%{http_code}" "$portal_url" 2>/dev/null || echo "000")

  if [ "$status" = "200" ]; then
    echo "healthy"
  else
    echo "unhealthy"
  fi
}

if [ "$OUTPUT_JSON" = true ]; then
  # JSON output for programmatic consumption
  cat << EOF
{
  "timestamp": "$(date -u +"%Y-%m-%dT%H:%M:%SZ")",
  "api": {
    "production": {
      "version": "$(get_api_version)",
      "commit": "$(get_api_commit)",
      "lastDeployed": "$(get_deployment_time api)",
      "status": "$(check_portal_status "https://${FUNCTION_APP}.azurewebsites.net/api/health")"
    },
    "recentDeployments": [
$(get_last_n_deployments api 5 | while IFS='|' read -r hash time message; do
  echo "      {\"commit\": \"$hash\", \"time\": \"$time\", \"message\": \"$message\"}"
done | sed '$!s/$/,/')
    ]
  },
  "adminPortal": {
    "production": {
      "url": "https://${ADMIN_SWA}.1.azurestaticapps.net",
      "lastDeployed": "$(get_deployment_time admin-portal)",
      "status": "$(check_portal_status "https://${ADMIN_SWA}.1.azurestaticapps.net")"
    },
    "recentDeployments": [
$(get_last_n_deployments admin-portal 5 | while IFS='|' read -r hash time message; do
  echo "      {\"commit\": \"$hash\", \"time\": \"$time\", \"message\": \"$message\"}"
done | sed '$!s/$/,/')
    ]
  },
  "memberPortal": {
    "production": {
      "url": "https://${MEMBER_SWA}.1.azurestaticapps.net",
      "lastDeployed": "$(get_deployment_time member-portal)",
      "status": "$(check_portal_status "https://${MEMBER_SWA}.1.azurestaticapps.net")"
    },
    "recentDeployments": [
$(get_last_n_deployments member-portal 5 | while IFS='|' read -r hash time message; do
  echo "      {\"commit\": \"$hash\", \"time\": \"$time\", \"message\": \"$message\"}"
done | sed '$!s/$/,/')
    ]
  }
}
EOF
else
  # Human-readable output
  echo ""
  echo -e "${CYAN}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
  echo -e "${CYAN}                   CTN ASR - Deployment History${NC}"
  echo -e "${CYAN}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
  echo ""

  # Current Production Versions
  echo -e "${BLUE}📦 Current Production Versions${NC}"
  echo ""

  # API
  API_VERSION=$(get_api_version)
  API_COMMIT=$(get_api_commit)
  API_STATUS=$(check_portal_status "https://${FUNCTION_APP}.azurewebsites.net/api/health")

  echo -e "API (Azure Functions):"
  echo "  Version: $API_VERSION"
  echo "  Commit:  $API_COMMIT"
  echo "  Status:  $API_STATUS"
  echo "  URL:     https://${FUNCTION_APP}.azurewebsites.net"
  echo ""

  # Admin Portal
  ADMIN_STATUS=$(check_portal_status "https://${ADMIN_SWA}.1.azurestaticapps.net")
  ADMIN_DEPLOYED=$(get_deployment_time admin-portal)

  echo -e "Admin Portal:"
  echo "  Deployed: $ADMIN_DEPLOYED"
  echo "  Status:   $ADMIN_STATUS"
  echo "  URL:      https://${ADMIN_SWA}.1.azurestaticapps.net"
  echo ""

  # Member Portal
  MEMBER_STATUS=$(check_portal_status "https://${MEMBER_SWA}.1.azurestaticapps.net")
  MEMBER_DEPLOYED=$(get_deployment_time member-portal)

  echo -e "Member Portal:"
  echo "  Deployed: $MEMBER_DEPLOYED"
  echo "  Status:   $MEMBER_STATUS"
  echo "  URL:      https://${MEMBER_SWA}.1.azurestaticapps.net"
  echo ""

  # Recent Deployments
  echo -e "${CYAN}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
  echo -e "${BLUE}📜 Recent Deployments (Last 10 commits)${NC}"
  echo ""

  echo -e "${GREEN}API (Azure Functions):${NC}"
  get_last_n_deployments api 10 | while IFS='|' read -r hash time message; do
    echo "  $hash - $time - $message"
  done
  echo ""

  echo -e "${GREEN}Admin Portal:${NC}"
  get_last_n_deployments admin-portal 10 | while IFS='|' read -r hash time message; do
    echo "  $hash - $time - $message"
  done
  echo ""

  echo -e "${GREEN}Member Portal:${NC}"
  get_last_n_deployments member-portal 10 | while IFS='|' read -r hash time message; do
    echo "  $hash - $time - $message"
  done
  echo ""

  # Rollback Instructions
  echo -e "${CYAN}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
  echo -e "${YELLOW}💡 Rollback Instructions${NC}"
  echo ""
  echo "To rollback a component to a previous version:"
  echo ""
  echo "  # API (swap slots)"
  echo "  ./scripts/rollback-deployment.sh api"
  echo ""
  echo "  # Admin Portal (redeploy specific commit)"
  echo "  ./scripts/rollback-deployment.sh admin-portal <commit-hash>"
  echo ""
  echo "  # Member Portal (redeploy specific commit)"
  echo "  ./scripts/rollback-deployment.sh member-portal <commit-hash>"
  echo ""
  echo -e "${CYAN}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
  echo ""
fi
