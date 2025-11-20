#!/bin/bash
# Azure Monitor Alerts Configuration for Container Apps Resilience
# Creates comprehensive alerts for health monitoring

set -e

RESOURCE_GROUP="rg-ctn-demo-asr-dev"
CONTAINER_APP_NAME="ca-ctn-asr-api-dev"
ACTION_GROUP_NAME="ag-ctn-demo-asr-critical"
LOCATION="westeurope"

# Get Container App resource ID
CONTAINER_APP_ID=$(az containerapp show \
  --name "$CONTAINER_APP_NAME" \
  --resource-group "$RESOURCE_GROUP" \
  --query "id" -o tsv)

echo "✅ Container App ID: $CONTAINER_APP_ID"

# Create Action Group for email/SMS notifications
echo "📧 Creating Action Group for notifications..."
az monitor action-group create \
  --name "$ACTION_GROUP_NAME" \
  --resource-group "$RESOURCE_GROUP" \
  --short-name "CTN-ASR" \
  --email-receiver name=admin email=ops@ctn.com 2>/dev/null || echo "⚠️  Action group already exists"

ACTION_GROUP_ID=$(az monitor action-group show \
  --name "$ACTION_GROUP_NAME" \
  --resource-group "$RESOURCE_GROUP" \
  --query "id" -o tsv)

echo "✅ Action Group ID: $ACTION_GROUP_ID"

# Alert 1: High Error Rate (>5% of requests failing)
echo "🚨 Creating alert: High Error Rate..."
az monitor metrics alert create \
  --name "Container App - High Error Rate" \
  --resource-group "$RESOURCE_GROUP" \
  --scopes "$CONTAINER_APP_ID" \
  --condition "avg Http5xx > 5" \
  --description "Container App is experiencing high error rate (>5 HTTP 5xx errors/min)" \
  --evaluation-frequency 1m \
  --window-size 5m \
  --severity 1 \
  --action "$ACTION_GROUP_ID" 2>/dev/null || echo "⚠️  Alert already exists"

# Alert 2: Container App Down (no successful requests)
echo "🚨 Creating alert: Container App Down..."
az monitor metrics alert create \
  --name "Container App - No Successful Requests" \
  --resource-group "$RESOURCE_GROUP" \
  --scopes "$CONTAINER_APP_ID" \
  --condition "total Http2xx == 0" \
  --description "Container App has no successful HTTP requests in the last 5 minutes" \
  --evaluation-frequency 1m \
  --window-size 5m \
  --severity 0 \
  --action "$ACTION_GROUP_ID" 2>/dev/null || echo "⚠️  Alert already exists"

# Alert 3: High Response Time (>5 seconds average)
echo "🚨 Creating alert: High Response Time..."
az monitor metrics alert create \
  --name "Container App - High Response Time" \
  --resource-group "$RESOURCE_GROUP" \
  --scopes "$CONTAINER_APP_ID" \
  --condition "avg HttpResponseTime > 5000" \
  --description "Container App response time is >5 seconds" \
  --evaluation-frequency 1m \
  --window-size 5m \
  --severity 2 \
  --action "$ACTION_GROUP_ID" 2>/dev/null || echo "⚠️  Alert already exists"

# Alert 4: Memory Usage Critical (>90%)
echo "🚨 Creating alert: High Memory Usage..."
az monitor metrics alert create \
  --name "Container App - High Memory Usage" \
  --resource-group "$RESOURCE_GROUP" \
  --scopes "$CONTAINER_APP_ID" \
  --condition "avg MemoryWorkingSet > 900000000" \
  --description "Container App memory usage >900MB (critical threshold)" \
  --evaluation-frequency 5m \
  --window-size 15m \
  --severity 2 \
  --action "$ACTION_GROUP_ID" 2>/dev/null || echo "⚠️  Alert already exists"

# Alert 5: Function Execution Failures
echo "🚨 Creating alert: Function Execution Failures..."
az monitor metrics alert create \
  --name "Container App - Execution Failures" \
  --resource-group "$RESOURCE_GROUP" \
  --scopes "$CONTAINER_APP_ID" \
  --condition "total FunctionExecutionCount == 0 AND total Http2xx == 0" \
  --description "No function executions detected - possible startup failure" \
  --evaluation-frequency 5m \
  --window-size 10m \
  --severity 1 \
  --action "$ACTION_GROUP_ID" 2>/dev/null || echo "⚠️  Alert already exists"

echo ""
echo "✅ Azure Monitor alerts configured successfully!"
echo "📊 View alerts: https://portal.azure.com/#@/resource$FUNCTION_APP_ID/alerts"
