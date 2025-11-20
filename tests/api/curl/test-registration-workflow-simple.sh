#!/bin/bash
set -e

API_BASE="https://ca-ctn-asr-api-dev.calmriver-700a8c55.westeurope.azurecontainerapps.io/api/v1"
TOKEN=$(cat /tmp/asr-api-token.txt)

# Use Contargo's legal_entity_id (from .credentials file)
LEGAL_ENTITY_ID="fbc4bcdc-a9f9-4621-a153-c5deb6c49519"

echo "============================================"
echo "Quick Endpoint Registration Workflow Test"
echo "============================================"
echo ""
echo "Using entity: $LEGAL_ENTITY_ID (Contargo)"
echo ""

# Step 1: Initiate registration
echo "Step 1: Initiate registration..."
RESPONSE=$(curl -s -w "\nHTTP:%{http_code}" -X POST \
  "$API_BASE/entities/$LEGAL_ENTITY_ID/endpoints/register" \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "endpoint_name": "Test Endpoint Registration",
    "endpoint_url": "https://api.test.example.com/webhook",
    "endpoint_description": "Quick test of registration workflow",
    "data_category": "DATA_EXCHANGE",
    "endpoint_type": "REST_API"
  }')

STATUS=$(echo "$RESPONSE" | tail -1 | cut -d':' -f2)
BODY=$(echo "$RESPONSE" | sed '$d')

echo "Status: $STATUS"

if [ "$STATUS" = "201" ]; then
  echo "✓ Success!"
  echo "$BODY"
  
  ENDPOINT_ID=$(echo "$BODY" | grep -o '"legal_entity_endpoint_id":"[^"]*' | cut -d'"' -f4 || echo "")
  
  if [ -n "$ENDPOINT_ID" ]; then
    echo ""
    echo "Endpoint ID: $ENDPOINT_ID"
    echo "$ENDPOINT_ID" > /tmp/test-endpoint-id.txt
    
    # Step 2: Send verification
    echo ""
    echo "Step 2: Send verification email..."
    RESPONSE2=$(curl -s -w "\nHTTP:%{http_code}" -X POST \
      "$API_BASE/endpoints/$ENDPOINT_ID/send-verification" \
      -H "Authorization: Bearer $TOKEN")
    
    STATUS2=$(echo "$RESPONSE2" | tail -1 | cut -d':' -f2)
    BODY2=$(echo "$RESPONSE2" | sed '$d')
    
    echo "Status: $STATUS2"
    
    if [ "$STATUS2" = "200" ]; then
      echo "✓ Success!"
      echo "$BODY2"
      
      TOKEN_VALUE=$(echo "$BODY2" | grep -o '"token":"[^"]*' | cut -d'"' -f4 || echo "")
      
      if [ -n "$TOKEN_VALUE" ]; then
        echo ""
        echo "Verification Token: ${TOKEN_VALUE:0:30}..."
        
        # Step 3: Verify token
        echo ""
        echo "Step 3: Verify token..."
        RESPONSE3=$(curl -s -w "\nHTTP:%{http_code}" -X POST \
          "$API_BASE/endpoints/$ENDPOINT_ID/verify-token" \
          -H "Authorization: Bearer $TOKEN" \
          -H "Content-Type: application/json" \
          -d "{\"token\": \"$TOKEN_VALUE\"}")
        
        STATUS3=$(echo "$RESPONSE3" | tail -1 | cut -d':' -f2)
        echo "Status: $STATUS3"
        
        if [ "$STATUS3" = "200" ]; then
          echo "✓ Token verified!"
          
          # Step 4: Test endpoint
          echo ""
          echo "Step 4: Test endpoint..."
          RESPONSE4=$(curl -s -w "\nHTTP:%{http_code}" -X POST \
            "$API_BASE/endpoints/$ENDPOINT_ID/test" \
            -H "Authorization: Bearer $TOKEN")
          
          STATUS4=$(echo "$RESPONSE4" | tail -1 | cut -d':' -f2)
          echo "Status: $STATUS4"
          
          if [ "$STATUS4" = "200" ]; then
            echo "✓ Endpoint tested!"
            
            # Step 5: Activate
            echo ""
            echo "Step 5: Activate endpoint..."
            RESPONSE5=$(curl -s -w "\nHTTP:%{http_code}" -X POST \
              "$API_BASE/endpoints/$ENDPOINT_ID/activate" \
              -H "Authorization: Bearer $TOKEN")
            
            STATUS5=$(echo "$RESPONSE5" | tail -1 | cut -d':' -f2)
            echo "Status: $STATUS5"
            
            if [ "$STATUS5" = "200" ]; then
              echo "✓ Endpoint activated!"
              echo ""
              echo "============================================"
              echo "✓ ALL STEPS PASSED!"
              echo "============================================"
              exit 0
            fi
          fi
        fi
      fi
    fi
  fi
fi

echo ""
echo "✗ Test failed at some step"
echo "Last response:"
echo "$RESPONSE"
exit 1
