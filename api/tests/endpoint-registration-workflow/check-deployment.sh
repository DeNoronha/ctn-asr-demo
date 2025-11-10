#!/bin/bash

# ============================================
# Check Deployment Status
# ============================================
# Purpose: Verify if new endpoint registration functions are deployed
# Last Updated: November 10, 2025
# ============================================

echo "============================================"
echo "Endpoint Registration Workflow"
echo "Deployment Status Check"
echo "============================================"
echo ""

echo "Last commit:"
git log -1 --format="%h - %ar - %s"
echo ""

echo "Azure DevOps Build URL:"
echo "https://dev.azure.com/ctn-demo/ASR/_build"
echo ""

echo "Checking deployed functions..."
echo ""

FUNCTIONS=$(func azure functionapp list-functions func-ctn-demo-asr-dev 2>&1)

echo "Looking for new registration workflow functions:"
echo ""

FOUND=0

if echo "$FUNCTIONS" | grep -q "InitiateEndpointRegistration"; then
  echo "✅ InitiateEndpointRegistration - DEPLOYED"
  FOUND=$((FOUND + 1))
else
  echo "❌ InitiateEndpointRegistration - NOT FOUND"
fi

if echo "$FUNCTIONS" | grep -q "SendEndpointVerificationEmail"; then
  echo "✅ SendEndpointVerificationEmail - DEPLOYED"
  FOUND=$((FOUND + 1))
else
  echo "❌ SendEndpointVerificationEmail - NOT FOUND"
fi

if echo "$FUNCTIONS" | grep -q "VerifyEndpointToken"; then
  echo "✅ VerifyEndpointToken - DEPLOYED"
  FOUND=$((FOUND + 1))
else
  echo "❌ VerifyEndpointToken - NOT FOUND"
fi

if echo "$FUNCTIONS" | grep -q "TestEndpoint"; then
  echo "✅ TestEndpoint - DEPLOYED"
  FOUND=$((FOUND + 1))
else
  echo "❌ TestEndpoint - NOT FOUND (Note: Generic name, may have false negatives)"
fi

if echo "$FUNCTIONS" | grep -q "ActivateEndpoint"; then
  echo "✅ ActivateEndpoint - DEPLOYED"
  FOUND=$((FOUND + 1))
else
  echo "❌ ActivateEndpoint - NOT FOUND"
fi

echo ""
echo "============================================"

if [ $FOUND -eq 5 ]; then
  echo "✅ DEPLOYMENT COMPLETE"
  echo "============================================"
  echo ""
  echo "All 5 new functions are deployed."
  echo "You can now run the test suite:"
  echo ""
  echo "  ./00-comprehensive-e2e-test.sh"
  echo "  ./99-error-scenarios-test.sh"
  echo ""
  exit 0
else
  echo "⏳ DEPLOYMENT IN PROGRESS"
  echo "============================================"
  echo ""
  echo "Found: $FOUND / 5 functions"
  echo ""
  echo "Wait 2-3 more minutes and run this script again:"
  echo "  ./check-deployment.sh"
  echo ""
  exit 1
fi
