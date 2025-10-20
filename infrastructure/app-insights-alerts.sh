#!/bin/bash
# Configure Application Insights alerts for CTN ASR API
# Run this script to create monitoring alerts in Azure

RESOURCE_GROUP="rg-ctn-demo-asr-dev"
APP_INSIGHTS_NAME="appi-ctn-demo-asr-dev"
SUBSCRIPTION_ID=$(az account show --query id -o tsv)
APP_INSIGHTS_RESOURCE_ID="/subscriptions/${SUBSCRIPTION_ID}/resourceGroups/${RESOURCE_GROUP}/providers/microsoft.insights/components/${APP_INSIGHTS_NAME}"

echo "Creating Application Insights alerts..."
echo "Resource: ${APP_INSIGHTS_RESOURCE_ID}"
echo ""

# Alert 1: High API Error Rate
echo "Creating alert: High API Error Rate..."
az monitor metrics alert create \
  --name "CTN ASR - High API Error Rate" \
  --resource-group "${RESOURCE_GROUP}" \
  --scopes "${APP_INSIGHTS_RESOURCE_ID}" \
  --condition "count customEvents where name contains 'failure' > 10" \
  --window-size 5m \
  --evaluation-frequency 1m \
  --severity 2 \
  --description "Alert when API error rate exceeds 10 failures in 5 minutes" \
  --enabled true

echo "✅ High API Error Rate alert created"
echo ""

# Alert 2: Slow Response Time
echo "Creating alert: Slow API Response..."
az monitor metrics alert create \
  --name "CTN ASR - Slow API Response" \
  --resource-group "${RESOURCE_GROUP}" \
  --scopes "${APP_INSIGHTS_RESOURCE_ID}" \
  --condition "avg customMetrics where name contains 'duration' > 1000" \
  --window-size 5m \
  --evaluation-frequency 1m \
  --severity 3 \
  --description "Alert when average response time exceeds 1 second" \
  --enabled true

echo "✅ Slow API Response alert created"
echo ""

# Alert 3: Database Query Performance
echo "Creating alert: Slow Database Queries..."
az monitor metrics alert create \
  --name "CTN ASR - Slow Database Queries" \
  --resource-group "${RESOURCE_GROUP}" \
  --scopes "${APP_INSIGHTS_RESOURCE_ID}" \
  --condition "avg dependencies where dependencyType == 'SQL' duration > 500" \
  --window-size 5m \
  --evaluation-frequency 1m \
  --severity 3 \
  --description "Alert when database queries exceed 500ms average" \
  --enabled true

echo "✅ Slow Database Queries alert created"
echo ""

# Alert 4: High Exception Rate
echo "Creating alert: High Exception Rate..."
az monitor metrics alert create \
  --name "CTN ASR - High Exception Rate" \
  --resource-group "${RESOURCE_GROUP}" \
  --scopes "${APP_INSIGHTS_RESOURCE_ID}" \
  --condition "count exceptions > 5" \
  --window-size 5m \
  --evaluation-frequency 1m \
  --severity 2 \
  --description "Alert when exception count exceeds 5 in 5 minutes" \
  --enabled true

echo "✅ High Exception Rate alert created"
echo ""

# Alert 5: Authentication Failures
echo "Creating alert: Authentication Failures..."
az monitor metrics alert create \
  --name "CTN ASR - Authentication Failures" \
  --resource-group "${RESOURCE_GROUP}" \
  --scopes "${APP_INSIGHTS_RESOURCE_ID}" \
  --condition "count customEvents where name == 'resolve_party_failure' > 3" \
  --window-size 5m \
  --evaluation-frequency 1m \
  --severity 1 \
  --description "Critical: Multiple authentication failures detected" \
  --enabled true

echo "✅ Authentication Failures alert created"
echo ""

echo "================================================"
echo "✅ All Application Insights alerts created!"
echo "================================================"
echo ""
echo "View alerts in Azure Portal:"
echo "https://portal.azure.com/#@/resource${APP_INSIGHTS_RESOURCE_ID}/alerts"
echo ""
