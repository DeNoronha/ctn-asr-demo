#!/bin/bash

# =====================================================
# Deploy Zitadel to Azure Container Apps
# =====================================================
# This script deploys Zitadel as a containerized app on Azure
# with PostgreSQL Flexible Server and custom domain support
#
# Usage:
#   chmod +x infrastructure/deploy-zitadel-azure.sh
#   ./infrastructure/deploy-zitadel-azure.sh
# =====================================================

set -e  # Exit on error

# Colors
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
CYAN='\033[0;36m'
NC='\033[0m'

# Configuration
RESOURCE_GROUP="ctn-demo"
LOCATION="westeurope"
CONTAINER_APP_ENV="ctn-zitadel-env"
CONTAINER_APP_NAME="ctn-zitadel"
DB_SERVER_NAME="psql-ctn-zitadel-dev"
DB_NAME="zitadel"
DB_ADMIN_USER="zitadeladmin"
DOMAIN_NAME="zitadel.ctn-asr.com"  # Update with your domain

# Helper functions
log_info() { echo -e "${CYAN}ℹ️  $1${NC}"; }
log_success() { echo -e "${GREEN}✅ $1${NC}"; }
log_warning() { echo -e "${YELLOW}⚠️  $1${NC}"; }
log_error() { echo -e "${RED}❌ $1${NC}"; }
log_step() {
    echo ""
    echo -e "${BLUE}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
    echo -e "${BLUE}$1${NC}"
    echo -e "${BLUE}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
}

# Check prerequisites
check_prerequisites() {
    log_step "STEP 0: Checking Prerequisites"

    # Check Azure CLI
    if ! command -v az &> /dev/null; then
        log_error "Azure CLI is not installed"
        log_info "Install: https://docs.microsoft.com/en-us/cli/azure/install-azure-cli"
        exit 1
    fi
    log_success "Azure CLI installed"

    # Check logged in
    if ! az account show &> /dev/null; then
        log_error "Not logged into Azure"
        log_info "Run: az login"
        exit 1
    fi
    log_success "Logged into Azure"

    # Check subscription
    SUBSCRIPTION=$(az account show --query name -o tsv)
    log_info "Using subscription: $SUBSCRIPTION"

    # Check jq
    if ! command -v jq &> /dev/null; then
        log_warning "jq not installed, installing..."
        brew install jq || {
            log_error "Failed to install jq"
            exit 1
        }
    fi
    log_success "jq installed"

    echo ""
    log_info "Resource Group: $RESOURCE_GROUP"
    log_info "Location: $LOCATION"
    log_info "Container App: $CONTAINER_APP_NAME"
    log_info "Database: $DB_SERVER_NAME"
    log_info "Domain: $DOMAIN_NAME"

    echo ""
    read -p "Press ENTER to continue or Ctrl+C to abort..."
}

# Generate secure passwords
generate_passwords() {
    log_step "STEP 1: Generating Secure Credentials"

    # Database password
    DB_PASSWORD=$(openssl rand -base64 32 | tr -d "=+/" | cut -c1-25)
    log_success "Database password generated"

    # Zitadel master key (32+ characters required)
    MASTER_KEY=$(openssl rand -base64 48 | tr -d "=+/" | cut -c1-48)
    log_success "Master encryption key generated"

    # Zitadel admin password
    ADMIN_PASSWORD=$(openssl rand -base64 24 | tr -d "=+/" | cut -c1-20)
    log_success "Admin password generated"

    # Save to credentials file
    if [ ! -f .credentials ]; then
        log_warning ".credentials file not found, creating..."
        touch .credentials
    fi

    # Append Zitadel Azure credentials
    cat >> .credentials << EOF

# ZITADEL AZURE DEPLOYMENT
# ============================================
# Deployed: $(date)
# Region: $LOCATION
# Domain: https://$DOMAIN_NAME

ZITADEL_AZURE_DB_PASSWORD=$DB_PASSWORD
ZITADEL_AZURE_MASTER_KEY=$MASTER_KEY
ZITADEL_AZURE_ADMIN_PASSWORD=$ADMIN_PASSWORD
ZITADEL_AZURE_ADMIN_USERNAME=admin
ZITADEL_AZURE_URL=https://$DOMAIN_NAME

EOF

    log_success "Credentials saved to .credentials file"
    log_warning "BACKUP THIS FILE SECURELY!"
}

# Create PostgreSQL Flexible Server
create_postgresql() {
    log_step "STEP 2: Creating PostgreSQL Flexible Server"

    log_info "Creating PostgreSQL server: $DB_SERVER_NAME"
    log_info "This may take 5-10 minutes..."

    az postgres flexible-server create \
        --resource-group $RESOURCE_GROUP \
        --name $DB_SERVER_NAME \
        --location $LOCATION \
        --admin-user $DB_ADMIN_USER \
        --admin-password "$DB_PASSWORD" \
        --sku-name Standard_B1ms \
        --tier Burstable \
        --storage-size 32 \
        --version 14 \
        --public-access 0.0.0.0 \
        --yes

    log_success "PostgreSQL server created"

    # Create Zitadel database
    log_info "Creating zitadel database..."
    az postgres flexible-server db create \
        --resource-group $RESOURCE_GROUP \
        --server-name $DB_SERVER_NAME \
        --database-name $DB_NAME

    log_success "Database '$DB_NAME' created"

    # Get connection string
    DB_HOST="$DB_SERVER_NAME.postgres.database.azure.com"
    DB_CONNECTION_STRING="host=$DB_HOST port=5432 user=$DB_ADMIN_USER password=$DB_PASSWORD dbname=$DB_NAME sslmode=require"

    log_info "Database host: $DB_HOST"
}

# Create Container Apps Environment
create_container_env() {
    log_step "STEP 3: Creating Container Apps Environment"

    log_info "Creating environment: $CONTAINER_APP_ENV"

    az containerapp env create \
        --name $CONTAINER_APP_ENV \
        --resource-group $RESOURCE_GROUP \
        --location $LOCATION

    log_success "Container Apps environment created"
}

# Deploy Zitadel Container App
deploy_zitadel() {
    log_step "STEP 4: Deploying Zitadel Container App"

    log_info "Deploying Zitadel container..."
    log_info "Image: ghcr.io/zitadel/zitadel:latest"

    # Create container app
    az containerapp create \
        --name $CONTAINER_APP_NAME \
        --resource-group $RESOURCE_GROUP \
        --environment $CONTAINER_APP_ENV \
        --image ghcr.io/zitadel/zitadel:latest \
        --target-port 8080 \
        --ingress external \
        --min-replicas 1 \
        --max-replicas 2 \
        --cpu 1.0 \
        --memory 2.0Gi \
        --env-vars \
            "ZITADEL_EXTERNALDOMAIN=$DOMAIN_NAME" \
            "ZITADEL_EXTERNALPORT=443" \
            "ZITADEL_EXTERNALSECURE=true" \
            "ZITADEL_TLS_ENABLED=false" \
            "ZITADEL_MASTERKEY=$MASTER_KEY" \
            "ZITADEL_DATABASE_POSTGRES_HOST=$DB_HOST" \
            "ZITADEL_DATABASE_POSTGRES_PORT=5432" \
            "ZITADEL_DATABASE_POSTGRES_DATABASE=$DB_NAME" \
            "ZITADEL_DATABASE_POSTGRES_USER_USERNAME=$DB_ADMIN_USER" \
            "ZITADEL_DATABASE_POSTGRES_USER_PASSWORD=$DB_PASSWORD" \
            "ZITADEL_DATABASE_POSTGRES_ADMIN_USERNAME=$DB_ADMIN_USER" \
            "ZITADEL_DATABASE_POSTGRES_ADMIN_PASSWORD=$DB_PASSWORD" \
            "ZITADEL_FIRSTINSTANCE_ORG_NAME=CTN Association Register" \
            "ZITADEL_FIRSTINSTANCE_ORG_HUMAN_USERNAME=admin" \
            "ZITADEL_FIRSTINSTANCE_ORG_HUMAN_PASSWORD=$ADMIN_PASSWORD"

    log_success "Zitadel container deployed"

    # Get the FQDN
    CONTAINER_FQDN=$(az containerapp show \
        --name $CONTAINER_APP_NAME \
        --resource-group $RESOURCE_GROUP \
        --query properties.configuration.ingress.fqdn \
        -o tsv)

    log_info "Container FQDN: https://$CONTAINER_FQDN"
}

# Configure custom domain
configure_domain() {
    log_step "STEP 5: Configure Custom Domain (Manual)"

    log_warning "Custom domain configuration requires DNS setup"

    echo ""
    log_info "To configure custom domain '$DOMAIN_NAME':"
    echo ""
    echo "1. Add CNAME record in your DNS:"
    echo "   Type: CNAME"
    echo "   Name: zitadel"
    echo "   Value: $CONTAINER_FQDN"
    echo ""
    echo "2. Add custom domain to Container App:"
    echo "   az containerapp hostname add \\"
    echo "     --name $CONTAINER_APP_NAME \\"
    echo "     --resource-group $RESOURCE_GROUP \\"
    echo "     --hostname $DOMAIN_NAME"
    echo ""
    echo "3. Bind TLS certificate (managed certificate):"
    echo "   az containerapp hostname bind \\"
    echo "     --name $CONTAINER_APP_NAME \\"
    echo "     --resource-group $RESOURCE_GROUP \\"
    echo "     --hostname $DOMAIN_NAME \\"
    echo "     --environment $CONTAINER_APP_ENV \\"
    echo "     --validation-method CNAME"
    echo ""

    log_info "For now, you can access Zitadel at:"
    log_info "  https://$CONTAINER_FQDN"

    echo ""
    read -p "Press ENTER when ready to continue..."
}

# Test deployment
test_deployment() {
    log_step "STEP 6: Testing Deployment"

    log_info "Waiting for Zitadel to initialize (30 seconds)..."
    sleep 30

    log_info "Testing health endpoint..."

    HEALTH_URL="https://$CONTAINER_FQDN/debug/healthz"

    if curl -f -s "$HEALTH_URL" > /dev/null; then
        log_success "Zitadel is healthy!"
    else
        log_warning "Health check failed, but container may still be initializing"
        log_info "Check logs: az containerapp logs show --name $CONTAINER_APP_NAME --resource-group $RESOURCE_GROUP"
    fi

    echo ""
    log_info "Zitadel Console: https://$CONTAINER_FQDN/ui/console"
    log_info "Admin Username: admin"
    log_info "Admin Password: (check .credentials file - ZITADEL_AZURE_ADMIN_PASSWORD)"
}

# Summary
show_summary() {
    log_step "✅ DEPLOYMENT COMPLETE!"

    echo ""
    log_success "Zitadel is now running on Azure!"

    echo ""
    log_info "Access Points:"
    log_info "  - Temporary URL: https://$CONTAINER_FQDN"
    log_info "  - Custom Domain: https://$DOMAIN_NAME (after DNS setup)"

    echo ""
    log_info "Credentials (saved in .credentials file):"
    log_info "  - Admin Username: admin"
    log_info "  - Admin Password: ZITADEL_AZURE_ADMIN_PASSWORD"
    log_info "  - Database Password: ZITADEL_AZURE_DB_PASSWORD"
    log_info "  - Master Key: ZITADEL_AZURE_MASTER_KEY"

    echo ""
    log_info "Resources Created:"
    log_info "  - Container App: $CONTAINER_APP_NAME"
    log_info "  - Container Environment: $CONTAINER_APP_ENV"
    log_info "  - PostgreSQL Server: $DB_SERVER_NAME"
    log_info "  - Database: $DB_NAME"

    echo ""
    log_info "Next Steps:"
    log_info "  1. Configure DNS (see STEP 5 output above)"
    log_info "  2. Run setup script: ./scripts/setup-zitadel-m2m.sh --azure"
    log_info "  3. Map service accounts to database"
    log_info "  4. Configure Azure Functions with Zitadel URL"
    log_info "  5. Test M2M authentication"

    echo ""
    log_info "Useful Commands:"
    log_info "  - View logs:"
    log_info "    az containerapp logs show --name $CONTAINER_APP_NAME --resource-group $RESOURCE_GROUP --follow"
    echo ""
    log_info "  - Restart app:"
    log_info "    az containerapp revision restart --name $CONTAINER_APP_NAME --resource-group $RESOURCE_GROUP"
    echo ""
    log_info "  - Scale app:"
    log_info "    az containerapp update --name $CONTAINER_APP_NAME --resource-group $RESOURCE_GROUP --min-replicas 1 --max-replicas 3"

    echo ""
    log_warning "IMPORTANT: Backup .credentials file securely!"
}

# Main execution
main() {
    clear

    echo -e "${CYAN}"
    cat << "EOF"
    _
   /_\    _____   _ _ __ ___
  //_\\  |_  / | | | '__/ _ \
 /  _  \  / /| |_| | | |  __/
 \_/ \_/ /___|\__,_|_|  \___|

 Zitadel Deployment for Azure
EOF
    echo -e "${NC}"

    log_info "This script will deploy Zitadel to Azure Container Apps"
    log_info "Estimated time: 15-20 minutes"

    echo ""
    read -p "Press ENTER to begin or Ctrl+C to abort..."

    check_prerequisites
    generate_passwords
    create_postgresql
    create_container_env
    deploy_zitadel
    configure_domain
    test_deployment
    show_summary
}

# Run main
main
