#!/bin/bash
# API Deployment Script
# Purpose: Deploy API to Azure Function App with pre/post validation

set -e  # Exit on error

API_BASE="https://func-ctn-demo-asr-dev.azurewebsites.net/api"
FUNCTION_APP="func-ctn-demo-asr-dev"

echo "=========================================="
echo "API DEPLOYMENT SCRIPT"
echo "=========================================="
echo ""

# Pre-deployment validation
echo "Step 1: Pre-deployment validation..."
echo "Checking if Function App is reachable..."
if curl -s -f "$API_BASE" > /dev/null; then
    echo "✓ Function App is online"
else
    echo "✗ Function App is not reachable - check Azure portal"
    exit 1
fi
echo ""

# Build
echo "Step 2: Building API..."
npm run build
if [ $? -eq 0 ]; then
    echo "✓ Build successful"
else
    echo "✗ Build failed"
    exit 1
fi
echo ""

# Deploy
echo "Step 3: Deploying to Azure..."
echo "This will take 2-3 minutes..."
echo ""

func azure functionapp publish "$FUNCTION_APP" --typescript --build remote

if [ $? -eq 0 ]; then
    echo ""
    echo "✓ Deployment successful"
else
    echo ""
    echo "✗ Deployment failed"
    exit 1
fi

# Wait for deployment to stabilize
echo ""
echo "Step 4: Waiting for deployment to stabilize (30 seconds)..."
sleep 30

# Post-deployment validation
echo ""
echo "Step 5: Post-deployment validation..."
echo ""

echo "Testing health endpoint..."
HEALTH_STATUS=$(curl -s -w "%{http_code}" "$API_BASE/health" -o /dev/null)
if [ "$HEALTH_STATUS" == "200" ] || [ "$HEALTH_STATUS" == "404" ]; then
    if [ "$HEALTH_STATUS" == "200" ]; then
        echo "✓ Health endpoint responding (200)"
    else
        echo "⚠ Health endpoint not found (404) - may need to be added"
    fi
else
    echo "⚠ Health endpoint returned $HEALTH_STATUS"
fi

echo ""
echo "Testing version endpoint..."
VERSION_STATUS=$(curl -s -w "%{http_code}" "$API_BASE/v1/version" -o /dev/null)
if [ "$VERSION_STATUS" == "200" ] || [ "$VERSION_STATUS" == "404" ]; then
    if [ "$VERSION_STATUS" == "200" ]; then
        echo "✓ Version endpoint responding (200)"
    else
        echo "⚠ Version endpoint not found (404) - may need to be added"
    fi
else
    echo "⚠ Version endpoint returned $VERSION_STATUS"
fi

echo ""
echo "Testing members endpoint..."
MEMBERS_STATUS=$(curl -s -w "%{http_code}" "$API_BASE/v1/all-members" -o /dev/null)
if [ "$MEMBERS_STATUS" == "200" ] || [ "$MEMBERS_STATUS" == "401" ]; then
    echo "✓ Members endpoint responding ($MEMBERS_STATUS)"
else
    echo "⚠ Members endpoint returned $MEMBERS_STATUS"
fi

echo ""
echo "=========================================="
echo "DEPLOYMENT COMPLETE"
echo "=========================================="
echo ""
echo "Run comprehensive tests:"
echo "  ./tests/admin-portal-404-investigation.sh"
echo ""
echo "Check Azure logs:"
echo "  func azure functionapp logstream $FUNCTION_APP"
echo ""
