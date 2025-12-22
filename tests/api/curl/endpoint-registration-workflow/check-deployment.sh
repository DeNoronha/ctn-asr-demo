#!/bin/bash

# ============================================
# Check Deployment Status
# ============================================
# Purpose: Verify if API endpoints are deployed and accessible
# Last Updated: December 22, 2025
# ============================================

echo "============================================"
echo "Endpoint Registration Workflow"
echo "Deployment Status Check"
echo "============================================"
echo ""

echo "Last commit:"
git log -1 --format="%h - %ar - %s"
echo ""

echo "GitHub Actions URL:"
echo "https://github.com/DeNoronha/ctn-asr-demo/actions"
echo ""

echo "Checking API health..."
echo ""

API_BASE="https://ca-ctn-asr-api-dev.calmriver-700a8c55.westeurope.azurecontainerapps.io"

# Check API health
HEALTH_RESPONSE=$(curl -s -w '\n%{http_code}' "$API_BASE/api/health")
HEALTH_CODE=$(echo "$HEALTH_RESPONSE" | tail -n1)
HEALTH_BODY=$(echo "$HEALTH_RESPONSE" | sed '$d')

if [ "$HEALTH_CODE" -eq 200 ]; then
  echo "API Health: OK (HTTP $HEALTH_CODE)"
  echo "$HEALTH_BODY" | python3 -m json.tool 2>/dev/null || echo "$HEALTH_BODY"
  echo ""
else
  echo "API Health: FAILED (HTTP $HEALTH_CODE)"
  echo "Deployment may still be in progress."
  echo ""
  echo "Check GitHub Actions: https://github.com/DeNoronha/ctn-asr-demo/actions"
  exit 1
fi

echo ""
echo "============================================"
echo "Checking endpoint availability..."
echo "============================================"
echo ""

FOUND=0
ENDPOINTS=(
  "/api/v1/entities"
  "/api/v1/tiers/requirements"
)

for endpoint in "${ENDPOINTS[@]}"; do
  RESPONSE=$(curl -s -w '\n%{http_code}' -X GET "$API_BASE$endpoint" -H "Content-Type: application/json")
  HTTP_CODE=$(echo "$RESPONSE" | tail -n1)

  if [ "$HTTP_CODE" -eq 200 ] || [ "$HTTP_CODE" -eq 401 ]; then
    echo "Endpoint available: $endpoint (HTTP $HTTP_CODE)"
    FOUND=$((FOUND + 1))
  else
    echo "Endpoint NOT available: $endpoint (HTTP $HTTP_CODE)"
  fi
done

echo ""
echo "============================================"

if [ $FOUND -eq ${#ENDPOINTS[@]} ]; then
  echo "DEPLOYMENT COMPLETE"
  echo "============================================"
  echo ""
  echo "All endpoints are accessible."
  echo "You can now run the test suite:"
  echo ""
  echo "  ./00-comprehensive-e2e-test.sh"
  echo "  ./99-error-scenarios-test.sh"
  echo ""
  exit 0
else
  echo "DEPLOYMENT IN PROGRESS"
  echo "============================================"
  echo ""
  echo "Found: $FOUND / ${#ENDPOINTS[@]} endpoints"
  echo ""
  echo "Wait 2-3 more minutes and run this script again:"
  echo "  ./check-deployment.sh"
  echo ""
  exit 1
fi
