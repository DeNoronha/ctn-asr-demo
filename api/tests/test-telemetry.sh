#!/bin/bash
# Test Application Insights telemetry integration
# Generates test traffic to verify telemetry is working

API_URL="https://func-ctn-demo-asr-dev.azurewebsites.net/api/v1"

echo "================================================================"
echo "Testing Application Insights Telemetry"
echo "================================================================"
echo ""
echo "API Base URL: ${API_URL}"
echo ""

# Test 1: Health Check (unauthenticated)
echo "Test 1: Health Check..."
curl -s -X GET "${API_URL}/../health" > /dev/null
echo "✅ Health check sent"
sleep 1

# Test 2: Version Endpoint (unauthenticated)
echo "Test 2: Version endpoint..."
curl -s -X GET "${API_URL}/version" > /dev/null
echo "✅ Version request sent"
sleep 1

# Test 3: Multiple requests to generate metrics
echo ""
echo "Test 3: Generating traffic (10 requests)..."
for i in {1..10}; do
  echo "  Request $i..."
  curl -s -X GET "${API_URL}/health" > /dev/null
  sleep 0.5
done
echo "✅ Traffic generated"

echo ""
echo "================================================================"
echo "✅ Test requests sent successfully!"
echo "================================================================"
echo ""
echo "Expected telemetry in Application Insights:"
echo "  - Custom events: health_check_request, version_request"
echo "  - Custom metrics: request_duration, database_query_duration"
echo "  - Dependencies: PostgreSQL queries (if authenticated)"
echo "  - Requests: HTTP GET requests"
echo ""
echo "View telemetry in Azure Portal:"
echo "https://portal.azure.com/#@/resource/subscriptions/add6a89c-7fb9-4f8a-9d63-7611a617430e/resourceGroups/rg-ctn-demo-asr-dev/providers/microsoft.insights/components/appi-ctn-demo-asr-dev"
echo ""
echo "Wait 2-3 minutes for telemetry to appear in Azure Portal."
echo ""
echo "Useful queries in Log Analytics:"
echo ""
echo "1. Recent custom events:"
echo "   customEvents"
echo "   | where timestamp > ago(1h)"
echo "   | project timestamp, name, customDimensions"
echo "   | order by timestamp desc"
echo ""
echo "2. Performance metrics:"
echo "   customMetrics"
echo "   | where name contains 'duration'"
echo "   | where timestamp > ago(1h)"
echo "   | summarize avg(value), percentile(value, 95), percentile(value, 99) by name"
echo ""
echo "3. Database performance:"
echo "   dependencies"
echo "   | where type == 'SQL'"
echo "   | where timestamp > ago(1h)"
echo "   | summarize avg(duration), percentile(duration, 95) by name"
echo ""
echo "4. Error rate:"
echo "   requests"
echo "   | where timestamp > ago(1h)"
echo "   | summarize TotalRequests = count(),"
echo "               FailedRequests = countif(success == false),"
echo "               ErrorRate = (countif(success == false) * 100.0 / count())"
echo ""
