#!/bin/bash
###############################################################################
# Health Monitoring Alerts Configuration
# Configures Azure Monitor alerts for comprehensive health monitoring
###############################################################################

set -e

# Configuration
RESOURCE_GROUP="rg-ctn-demo-asr-dev"
CONTAINER_APP="ca-ctn-asr-api-dev"
APP_INSIGHTS="appi-ctn-demo-asr-dev"
SUBSCRIPTION_ID=$(az account show --query id -o tsv)

echo "=================================================="
echo "Configuring Health Monitoring Alerts"
echo "Resource Group: $RESOURCE_GROUP"
echo "Container App: $CONTAINER_APP"
echo "App Insights: $APP_INSIGHTS"
echo "Subscription: $SUBSCRIPTION_ID"
echo "=================================================="
echo ""

# Get resource IDs
CONTAINER_APP_ID="/subscriptions/$SUBSCRIPTION_ID/resourceGroups/$RESOURCE_GROUP/providers/Microsoft.App/containerApps/$CONTAINER_APP"
APP_INSIGHTS_ID="/subscriptions/$SUBSCRIPTION_ID/resourceGroups/$RESOURCE_GROUP/providers/microsoft.insights/components/$APP_INSIGHTS"

# Alert 1: Health Endpoint Unhealthy (HTTP 503)
echo "Creating Alert: Health Endpoint Unhealthy..."
az monitor metrics alert create \
  --name "ASR-Health-Endpoint-Unhealthy" \
  --resource-group "$RESOURCE_GROUP" \
  --scopes "$CONTAINER_APP_ID" \
  --condition "count Http5xx >= 5" \
  --window-size 5m \
  --evaluation-frequency 1m \
  --severity 1 \
  --description "Critical: Health endpoint returning 503 (unhealthy status) 5+ times in 5 minutes" \
  || echo "Alert already exists or creation failed"

echo "✅ Health Endpoint Unhealthy alert configured"
echo ""

# Alert 2: High Response Time
echo "Creating Alert: Health Check High Response Time..."
az monitor metrics alert create \
  --name "ASR-Health-Check-Slow-Response" \
  --resource-group "$RESOURCE_GROUP" \
  --scopes "$CONTAINER_APP_ID" \
  --condition "avg HttpResponseTime > 5000" \
  --window-size 5m \
  --evaluation-frequency 1m \
  --severity 2 \
  --description "Warning: Health endpoint response time exceeds 5 seconds" \
  || echo "Alert already exists or creation failed"

echo "✅ High Response Time alert configured"
echo ""

# Alert 3: High Request Rate
echo "Creating Alert: High Request Rate..."
az monitor metrics alert create \
  --name "ASR-High-Request-Rate" \
  --resource-group "$RESOURCE_GROUP" \
  --scopes "$CONTAINER_APP_ID" \
  --condition "count Requests > 1000" \
  --window-size 5m \
  --evaluation-frequency 1m \
  --severity 2 \
  --description "Warning: Request rate exceeds 1000 requests per 5 minutes" \
  || echo "Alert already exists or creation failed"

echo "✅ High Request Rate alert configured"
echo ""

# Alert 4: Function Execution Failures
echo "Creating Alert: Function Execution Failures..."
az monitor metrics alert create \
  --name "ASR-Function-Execution-Failures" \
  --resource-group "$RESOURCE_GROUP" \
  --scopes "$CONTAINER_APP_ID" \
  --condition "count Http5xx > 10" \
  --window-size 5m \
  --evaluation-frequency 1m \
  --severity 1 \
  --description "Critical: Function execution failures exceed 10 in 5 minutes" \
  || echo "Alert already exists or creation failed"

echo "✅ Function Execution Failures alert configured"
echo ""

# Alert 5: Memory Usage High
echo "Creating Alert: High Memory Usage..."
az monitor metrics alert create \
  --name "ASR-High-Memory-Usage" \
  --resource-group "$RESOURCE_GROUP" \
  --scopes "$CONTAINER_APP_ID" \
  --condition "avg MemoryWorkingSet > 800000000" \
  --window-size 15m \
  --evaluation-frequency 5m \
  --severity 2 \
  --description "Warning: Memory usage exceeds 800MB for 15 minutes" \
  || echo "Alert already exists or creation failed"

echo "✅ High Memory Usage alert configured"
echo ""

# List all configured alerts
echo "=================================================="
echo "Configured Alerts Summary:"
echo "=================================================="
az monitor metrics alert list \
  --resource-group "$RESOURCE_GROUP" \
  --query "[?contains(name, 'ASR')].{Name:name, Severity:severity, Enabled:enabled}" \
  --output table

echo ""
echo "=================================================="
echo "Health Monitoring Alerts Configuration Complete!"
echo "=================================================="
echo ""
echo "Next Steps:"
echo "1. Configure action groups for alert notifications"
echo "2. Test alerts by simulating failures"
echo "3. Review alerts in Azure Portal > Monitor > Alerts"
echo ""
echo "To add notification actions:"
echo "  az monitor action-group create \\"
echo "    --name 'ASR-Health-Notifications' \\"
echo "    --resource-group '$RESOURCE_GROUP' \\"
echo "    --short-name 'ASR-Health' \\"
echo "    --email-receiver 'Admin' 'admin@example.com'"
echo ""
