#!/bin/bash

# Transport Order Validation Test Script
# Tests the deployed booking portal transport order validation

set -e

API_BASE="https://func-ctn-booking-prod.azurewebsites.net"
FRONTEND_URL="https://calm-mud-024a8ce03.1.azurestaticapps.net"

echo "=== Booking Portal Transport Order Validation Test ==="
echo "Start time: $(date)"
echo ""

# 1. Check API availability
echo "1. Checking API availability..."
HTTP_CODE=$(curl -s -o /dev/null -w "%{http_code}" "${API_BASE}/api/diagnostic")
if [ "$HTTP_CODE" -eq 200 ]; then
    echo "   ✅ API is available (200)"
    curl -s "${API_BASE}/api/diagnostic" | jq '.'
else
    echo "   ❌ API returned $HTTP_CODE"
    exit 1
fi
echo ""

# 2. Check frontend availability
echo "2. Checking frontend availability..."
HTTP_CODE=$(curl -s -o /dev/null -w "%{http_code}" "${FRONTEND_URL}")
if [ "$HTTP_CODE" -eq 200 ]; then
    echo "   ✅ Frontend is available (200)"
else
    echo "   ❌ Frontend returned $HTTP_CODE"
    exit 1
fi
echo ""

# 3. Test schema compilation (check TypeScript types)
echo "3. Verifying schema types..."
cd /Users/ramondenoronha/Dev/DIL/ASR-full/booking-portal/api
if npm run build > /tmp/build.log 2>&1; then
    echo "   ✅ TypeScript compilation successful"
else
    echo "   ❌ TypeScript compilation failed:"
    cat /tmp/build.log
    exit 1
fi
echo ""

# 4. Test frontend compilation
echo "4. Verifying frontend types..."
cd /Users/ramondenoronha/Dev/DIL/ASR-full/booking-portal/web
if npm run build > /tmp/frontend-build.log 2>&1; then
    echo "   ✅ Frontend TypeScript compilation successful"
else
    echo "   ❌ Frontend compilation failed:"
    cat /tmp/frontend-build.log
    exit 1
fi
echo ""

echo "=== Test Complete ==="
echo "End time: $(date)"
echo ""
echo "Manual UI testing steps:"
echo "1. Navigate to: ${FRONTEND_URL}"
echo "2. Find a transport order (documentType: 'transport_order')"
echo "3. Click 'View' button"
echo "4. Verify all fields display:"
echo "   - Order Information: transportOrderNumber, deliveryOrderNumber, carrierBookingReference, orderDate"
echo "   - Transport Details: carrier, truckingCompany"
echo "   - Consignee: name, address"
echo "   - Pickup Details: facilityName, address, plannedPickupDate"
echo "   - Delivery Details: facilityName, address, plannedDeliveryDate"
echo "   - Container Information: containerNumber, containerType"
echo "   - Cargo Information: cargoDescription, specialInstructions"
echo "5. Verify confidence badges display next to fields"
echo "6. Verify low-confidence highlighting works"
