#!/bin/bash

# ========================================
# Create M2M App Roles in Azure AD
# ========================================
# Adds application roles for machine-to-machine authentication
# Usage: ./create-m2m-app-roles.sh

set -e

echo "=== Creating M2M App Roles for CTN API ==="

# Configuration
API_APP_ID="d3037c11-a541-4f21-8862-8079137a0cde"
TENANT_ID="598664e7-725c-4daa-bd1f-89c4ada717ff"

# Get existing app roles
echo "1. Fetching existing app roles..."
EXISTING_ROLES=$(az ad app show --id $API_APP_ID --query "appRoles" --output json)

# Generate UUIDs for new roles
ETA_READ_ID=$(uuidgen | tr '[:upper:]' '[:lower:]')
CONTAINER_READ_ID=$(uuidgen | tr '[:upper:]' '[:lower:]')
BOOKING_READ_ID=$(uuidgen | tr '[:upper:]' '[:lower:]')
BOOKING_WRITE_ID=$(uuidgen | tr '[:upper:]' '[:lower:]')
ORCHESTRATION_READ_ID=$(uuidgen | tr '[:upper:]' '[:lower:]')

echo "Generated role IDs:"
echo "  ETA.Read: $ETA_READ_ID"
echo "  Container.Read: $CONTAINER_READ_ID"
echo "  Booking.Read: $BOOKING_READ_ID"
echo "  Booking.Write: $BOOKING_WRITE_ID"
echo "  Orchestration.Read: $ORCHESTRATION_READ_ID"

# Create new roles array by combining existing and new roles
cat > /tmp/app-roles.json << EOF
[
  {
    "allowedMemberTypes": ["User"],
    "description": "Can access Member Portal for self-service",
    "displayName": "Member",
    "id": "57bda310-6a99-4314-8f81-6d4ad8759eaa",
    "isEnabled": true,
    "value": "Member"
  },
  {
    "allowedMemberTypes": ["User"],
    "description": "Can manage association data via Admin Portal",
    "displayName": "Association Admin",
    "id": "e9443ad1-e3db-4df2-a9ee-bf7fb83554c5",
    "isEnabled": true,
    "value": "AssociationAdmin"
  },
  {
    "allowedMemberTypes": ["User"],
    "description": "Can create and manage Association Admins",
    "displayName": "System Admin",
    "id": "6961205d-4251-45c9-b711-38023005b01b",
    "isEnabled": true,
    "value": "SystemAdmin"
  },
  {
    "allowedMemberTypes": ["Application"],
    "description": "Read ETA updates for bookings",
    "displayName": "ETA.Read",
    "id": "$ETA_READ_ID",
    "isEnabled": true,
    "value": "ETA.Read"
  },
  {
    "allowedMemberTypes": ["Application"],
    "description": "Read container status information",
    "displayName": "Container.Read",
    "id": "$CONTAINER_READ_ID",
    "isEnabled": true,
    "value": "Container.Read"
  },
  {
    "allowedMemberTypes": ["Application"],
    "description": "Read booking information",
    "displayName": "Booking.Read",
    "id": "$BOOKING_READ_ID",
    "isEnabled": true,
    "value": "Booking.Read"
  },
  {
    "allowedMemberTypes": ["Application"],
    "description": "Create and update booking information",
    "displayName": "Booking.Write",
    "id": "$BOOKING_WRITE_ID",
    "isEnabled": true,
    "value": "Booking.Write"
  },
  {
    "allowedMemberTypes": ["Application"],
    "description": "Access orchestration register data",
    "displayName": "Orchestration.Read",
    "id": "$ORCHESTRATION_READ_ID",
    "isEnabled": true,
    "value": "Orchestration.Read"
  }
]
EOF

echo ""
echo "2. Updating app registration with M2M roles..."
az ad app update --id $API_APP_ID --app-roles @/tmp/app-roles.json

echo ""
echo "3. Verifying app roles..."
az ad app show --id $API_APP_ID --query "appRoles[].{DisplayName:displayName, Value:value, MemberTypes:allowedMemberTypes}" --output table

echo ""
echo "✅ Successfully created M2M app roles!"
echo ""
echo "Next steps:"
echo "1. Verify roles in Azure Portal: https://portal.azure.com"
echo "2. Navigate to: App Registrations → CTN API → App roles"
echo "3. Create test M2M client app registration"

# Clean up
rm /tmp/app-roles.json
