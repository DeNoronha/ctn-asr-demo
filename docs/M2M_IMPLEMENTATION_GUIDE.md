# M2M Authentication Implementation Guide

**For:** Claude Code  
**Date:** October 25, 2025  
**Goal:** Implement Phase 1 (Azure AD Client Credentials) + Phase 2 (Azure APIM) for M2M authentication

---

## 🚨 READ FIRST

**Before starting:**
1. Read `/Users/ramondenoronha/Dev/DIL/ASR-full/CLAUDE.md` completely
2. Complete the MANDATORY PRE-WORK CHECKLIST
3. Read this entire implementation guide
4. Create feature branch: `feature/m2m-authentication`

**Do NOT push directly to main. Test everything on feature branch first.**

---

## Overview

Implement machine-to-machine (M2M) authentication for external container systems to access CTN API.

**What we're building:**
1. **Phase 1:** Azure AD Client Credentials Flow with scope-based permissions
2. **Phase 2:** Azure API Management for rate limiting and analytics

**Time estimate:** 2-3 days

---

## Prerequisites

**Required Access:**
- Azure Portal (Contributor on CTN subscription)
- Azure AD (Application Administrator role)
- Azure DevOps (Build Administrator)

**Required Tools:**
- Azure CLI installed and logged in
- Node.js 20.x
- Postman or curl for testing

**Credentials:**
- Check `/Users/ramondenoronha/Dev/DIL/ASR-full/.credentials` file
- Azure subscription ID, tenant ID, resource group names

---

## Phase 1: Azure AD Client Credentials

### Step 1: Define API Scopes in Azure AD

**Location:** Azure Portal → App Registrations → CTN API App Registration

**Task:** Add application scopes for M2M clients

```bash
# 1. Get current API app registration ID
API_APP_ID="d3037c11-a541-4f21-8862-8079137a0cde"  # From .credentials

# 2. Define scopes in Azure AD
az ad app update --id $API_APP_ID --app-roles @- << EOF
[
  {
    "allowedMemberTypes": ["Application"],
    "description": "Read ETA updates",
    "displayName": "ETA.Read",
    "id": "$(uuidgen)",
    "isEnabled": true,
    "value": "ETA.Read"
  },
  {
    "allowedMemberTypes": ["Application"],
    "description": "Read container status",
    "displayName": "Container.Read",
    "id": "$(uuidgen)",
    "isEnabled": true,
    "value": "Container.Read"
  },
  {
    "allowedMemberTypes": ["Application"],
    "description": "Read booking information",
    "displayName": "Booking.Read",
    "id": "$(uuidgen)",
    "isEnabled": true,
    "value": "Booking.Read"
  },
  {
    "allowedMemberTypes": ["Application"],
    "description": "Create/update bookings",
    "displayName": "Booking.Write",
    "id": "$(uuidgen)",
    "isEnabled": true,
    "value": "Booking.Write"
  },
  {
    "allowedMemberTypes": ["Application"],
    "description": "Access orchestration register",
    "displayName": "Orchestration.Read",
    "id": "$(uuidgen)",
    "isEnabled": true,
    "value": "Orchestration.Read"
  }
]
EOF
```

**Verify:**
- Azure Portal → App Registrations → CTN API → App roles
- Should see 5 new application roles

---

### Step 2: Create Test M2M Client App Registration

**Task:** Create app registration for testing M2M flow

```bash
# Create test client app registration
TEST_CLIENT_NAME="CTN-M2M-TestClient"

az ad app create \
  --display-name "$TEST_CLIENT_NAME" \
  --sign-in-audience AzureADMyOrg

# Get the app ID
TEST_CLIENT_ID=$(az ad app list --display-name "$TEST_CLIENT_NAME" --query "[0].appId" -o tsv)

echo "Test Client ID: $TEST_CLIENT_ID"

# Create client secret
CLIENT_SECRET=$(az ad app credential reset \
  --id $TEST_CLIENT_ID \
  --append \
  --query password -o tsv)

echo "Client Secret: $CLIENT_SECRET"
echo "SAVE THIS SECRET - it won't be shown again"

# Store in Key Vault
az keyvault secret set \
  --vault-name "kv-ctn-demo-asr-dev" \
  --name "M2M-TestClient-Secret" \
  --value "$CLIENT_SECRET"
```

---

### Step 3: Assign Permissions to Test Client

```bash
# Get API app object ID
API_OBJECT_ID=$(az ad app show --id $API_APP_ID --query id -o tsv)

# Get role IDs
ETA_READ_ROLE_ID=$(az ad app show --id $API_APP_ID --query "appRoles[?value=='ETA.Read'].id" -o tsv)
CONTAINER_READ_ROLE_ID=$(az ad app show --id $API_APP_ID --query "appRoles[?value=='Container.Read'].id" -o tsv)

# Create service principal for test client if not exists
az ad sp create --id $TEST_CLIENT_ID

# Assign ETA.Read role
az rest --method POST \
  --uri "https://graph.microsoft.com/v1.0/servicePrincipals/$API_OBJECT_ID/appRoleAssignments" \
  --headers "Content-Type=application/json" \
  --body "{
    \"principalId\": \"$(az ad sp show --id $TEST_CLIENT_ID --query id -o tsv)\",
    \"resourceId\": \"$API_OBJECT_ID\",
    \"appRoleId\": \"$ETA_READ_ROLE_ID\"
  }"

# Assign Container.Read role
az rest --method POST \
  --uri "https://graph.microsoft.com/v1.0/servicePrincipals/$API_OBJECT_ID/appRoleAssignments" \
  --headers "Content-Type=application/json" \
  --body "{
    \"principalId\": \"$(az ad sp show --id $TEST_CLIENT_ID --query id -o tsv)\",
    \"resourceId\": \"$API_OBJECT_ID\",
    \"appRoleId\": \"$CONTAINER_READ_ROLE_ID\"
  }"
```

**Verify:**
- Azure Portal → App Registrations → CTN-M2M-TestClient → API permissions
- Should see ETA.Read and Container.Read granted

---

### Step 4: Update API to Validate Scopes

**File:** `api/src/middleware/auth.ts`

**Task:** Add scope validation to existing MSAL middleware

```typescript
import { app, HttpRequest, HttpResponseInit, InvocationContext } from '@azure/functions';

interface TokenPayload {
  appid: string;      // Client ID
  roles?: string[];   // App roles (scopes)
  oid: string;        // Object ID
  tid: string;        // Tenant ID
  exp: number;        // Expiration
  iss: string;        // Issuer
}

export async function validateM2MToken(
  request: HttpRequest,
  context: InvocationContext,
  requiredScopes: string[]
): Promise<{ isValid: boolean; clientId?: string; error?: string }> {
  
  const authHeader = request.headers.get('authorization');
  
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return { isValid: false, error: 'Missing or invalid authorization header' };
  }

  const token = authHeader.substring(7);

  try {
    // Decode token (your existing MSAL middleware already validates signature)
    const payload = decodeToken(token) as TokenPayload;

    // Check if token has expired
    if (payload.exp * 1000 < Date.now()) {
      return { isValid: false, error: 'Token expired' };
    }

    // Check issuer
    const expectedIssuer = `https://sts.windows.net/${process.env.AZURE_TENANT_ID}/`;
    if (payload.iss !== expectedIssuer) {
      return { isValid: false, error: 'Invalid token issuer' };
    }

    // Check required scopes
    const tokenScopes = payload.roles || [];
    const hasRequiredScopes = requiredScopes.every(scope => 
      tokenScopes.includes(scope)
    );

    if (!hasRequiredScopes) {
      context.log(`Missing required scopes. Has: ${tokenScopes.join(', ')}, Needs: ${requiredScopes.join(', ')}`);
      return { 
        isValid: false, 
        error: `Missing required scopes: ${requiredScopes.join(', ')}` 
      };
    }

    // Log successful M2M authentication
    context.log(`M2M client authenticated: ${payload.appid} with scopes: ${tokenScopes.join(', ')}`);

    return { 
      isValid: true, 
      clientId: payload.appid 
    };

  } catch (error) {
    context.log(`Token validation error: ${error.message}`);
    return { isValid: false, error: 'Token validation failed' };
  }
}

function decodeToken(token: string): any {
  const parts = token.split('.');
  if (parts.length !== 3) {
    throw new Error('Invalid token format');
  }
  
  const payload = parts[1];
  const decoded = Buffer.from(payload, 'base64').toString('utf-8');
  return JSON.parse(decoded);
}

// Middleware wrapper for Azure Functions
export function requireScopes(...scopes: string[]) {
  return async (request: HttpRequest, context: InvocationContext): Promise<HttpResponseInit | null> => {
    const validation = await validateM2MToken(request, context, scopes);
    
    if (!validation.isValid) {
      return {
        status: 403,
        jsonBody: {
          error: 'Forbidden',
          message: validation.error
        }
      };
    }

    // Store client ID in context for logging
    context.extraInputs.set('clientId', validation.clientId);
    
    return null; // Continue to next middleware/handler
  };
}
```

---

### Step 5: Apply Scope Requirements to Endpoints

**File:** `api/src/functions/eta-updates.ts` (example)

```typescript
import { app, HttpRequest, HttpResponseInit, InvocationContext } from '@azure/functions';
import { requireScopes } from '../middleware/auth';

// ETA Updates endpoint - requires ETA.Read scope
export async function getETAUpdates(
  request: HttpRequest,
  context: InvocationContext
): Promise<HttpResponseInit> {
  
  // Validate scopes
  const authResult = await requireScopes('ETA.Read')(request, context);
  if (authResult) return authResult; // Return 403 if validation failed

  const clientId = context.extraInputs.get('clientId');
  context.log(`ETA updates requested by M2M client: ${clientId}`);

  // Your existing logic here
  const bookingRef = request.query.get('bookingRef');
  
  // ... fetch ETA data ...

  return {
    status: 200,
    jsonBody: {
      bookingRef,
      eta: '2025-11-01T14:30:00Z',
      // ... other data
    }
  };
}

app.http('eta-updates', {
  methods: ['GET'],
  authLevel: 'anonymous', // Auth handled by middleware
  route: 'v1/eta/updates',
  handler: getETAUpdates
});
```

**Repeat for other endpoints:**
- `/v1/containers/status` → `Container.Read`
- `/v1/bookings` (GET) → `Booking.Read`
- `/v1/bookings` (POST/PUT) → `Booking.Write`
- `/v1/orchestration` → `Orchestration.Read`

---

### Step 6: Test M2M Authentication

**Create test script:** `api/tests/test-m2m-auth.sh`

```bash
#!/bin/bash

# Configuration
TENANT_ID="598664e7-725c-4daa-bd1f-89c4ada717ff"
API_APP_ID="d3037c11-a541-4f21-8862-8079137a0cde"
TEST_CLIENT_ID="<your-test-client-id>"
TEST_CLIENT_SECRET="<your-test-client-secret>"
API_URL="http://localhost:7071/api/v1"  # Change for production

echo "=== Testing M2M Authentication ==="

# Step 1: Get access token
echo "1. Requesting access token..."

TOKEN_RESPONSE=$(curl -s -X POST \
  "https://login.microsoftonline.com/$TENANT_ID/oauth2/v2.0/token" \
  -H "Content-Type: application/x-www-form-urlencoded" \
  -d "client_id=$TEST_CLIENT_ID" \
  -d "client_secret=$TEST_CLIENT_SECRET" \
  -d "scope=api://$API_APP_ID/.default" \
  -d "grant_type=client_credentials")

ACCESS_TOKEN=$(echo $TOKEN_RESPONSE | jq -r '.access_token')

if [ "$ACCESS_TOKEN" = "null" ]; then
  echo "❌ Failed to get access token"
  echo $TOKEN_RESPONSE | jq
  exit 1
fi

echo "✅ Access token received"

# Step 2: Test ETA endpoint (should succeed - has ETA.Read)
echo ""
echo "2. Testing ETA endpoint (should succeed)..."

ETA_RESPONSE=$(curl -s -w "\nHTTP_CODE:%{http_code}" \
  -X GET "$API_URL/eta/updates?bookingRef=BK123456" \
  -H "Authorization: Bearer $ACCESS_TOKEN")

HTTP_CODE=$(echo "$ETA_RESPONSE" | grep "HTTP_CODE:" | cut -d':' -f2)

if [ "$HTTP_CODE" = "200" ]; then
  echo "✅ ETA endpoint succeeded (200)"
else
  echo "❌ ETA endpoint failed ($HTTP_CODE)"
  echo $ETA_RESPONSE
fi

# Step 3: Test Booking Write endpoint (should fail - missing Booking.Write)
echo ""
echo "3. Testing Booking Write endpoint (should fail - missing scope)..."

BOOKING_RESPONSE=$(curl -s -w "\nHTTP_CODE:%{http_code}" \
  -X POST "$API_URL/bookings" \
  -H "Authorization: Bearer $ACCESS_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"containerNo":"CONT123"}')

HTTP_CODE=$(echo "$BOOKING_RESPONSE" | grep "HTTP_CODE:" | cut -d':' -f2)

if [ "$HTTP_CODE" = "403" ]; then
  echo "✅ Booking Write correctly forbidden (403)"
else
  echo "❌ Booking Write should have been forbidden but got ($HTTP_CODE)"
fi

# Step 4: Test without token (should fail)
echo ""
echo "4. Testing without token (should fail)..."

NO_TOKEN_RESPONSE=$(curl -s -w "\nHTTP_CODE:%{http_code}" \
  -X GET "$API_URL/eta/updates?bookingRef=BK123456")

HTTP_CODE=$(echo "$NO_TOKEN_RESPONSE" | grep "HTTP_CODE:" | cut -d':' -f2)

if [ "$HTTP_CODE" = "403" ] || [ "$HTTP_CODE" = "401" ]; then
  echo "✅ No token correctly rejected ($HTTP_CODE)"
else
  echo "❌ Should have rejected request without token but got ($HTTP_CODE)"
fi

echo ""
echo "=== M2M Authentication Tests Complete ==="
```

**Run tests:**
```bash
chmod +x api/tests/test-m2m-auth.sh
./api/tests/test-m2m-auth.sh
```

---

## Phase 2: Azure API Management

### Step 1: Create APIM Instance

```bash
# Configuration
RG_NAME="rg-ctn-demo-asr-dev"
APIM_NAME="apim-ctn-demo"
LOCATION="westeurope"
PUBLISHER_EMAIL="ramon@swi.nl"
PUBLISHER_NAME="CTN"

# Create APIM (Consumption tier)
az apim create \
  --name $APIM_NAME \
  --resource-group $RG_NAME \
  --location $LOCATION \
  --publisher-email $PUBLISHER_EMAIL \
  --publisher-name $PUBLISHER_NAME \
  --sku-name Consumption \
  --enable-managed-identity true

echo "⏳ APIM creation takes 5-10 minutes..."
```

---

### Step 2: Import CTN API into APIM

```bash
# Get Function App URL
FUNCTION_APP_URL="https://func-ctn-demo-asr-dev.azurewebsites.net"

# Create API in APIM
az apim api create \
  --resource-group $RG_NAME \
  --service-name $APIM_NAME \
  --api-id ctn-api \
  --path /v1 \
  --display-name "CTN API" \
  --protocols https \
  --service-url "$FUNCTION_APP_URL/api/v1"
```

---

### Step 3: Add Rate Limiting Policy

**File:** `infrastructure/apim/rate-limit-policy.xml`

```xml
<policies>
  <inbound>
    <!-- Validate JWT token from Azure AD -->
    <validate-jwt 
      header-name="Authorization" 
      failed-validation-httpcode="401" 
      failed-validation-error-message="Unauthorized. Token validation failed.">
      <openid-config url="https://login.microsoftonline.com/598664e7-725c-4daa-bd1f-89c4ada717ff/v2.0/.well-known/openid-configuration" />
      <audiences>
        <audience>api://d3037c11-a541-4f21-8862-8079137a0cde</audience>
      </audiences>
      <issuers>
        <issuer>https://sts.windows.net/598664e7-725c-4daa-bd1f-89c4ada717ff/</issuer>
      </issuers>
      <required-claims>
        <claim name="roles" match="any">
          <value>ETA.Read</value>
          <value>Container.Read</value>
          <value>Booking.Read</value>
          <value>Booking.Write</value>
          <value>Orchestration.Read</value>
        </claim>
      </required-claims>
    </validate-jwt>
    
    <!-- Rate limiting by client ID -->
    <rate-limit-by-key 
      calls="1000" 
      renewal-period="3600" 
      counter-key="@(context.Request.Headers.GetValueOrDefault("Authorization","").AsJwt()?.Subject)" />
    
    <!-- Set backend URL -->
    <set-backend-service base-url="https://func-ctn-demo-asr-dev.azurewebsites.net/api/v1" />
  </inbound>
  
  <backend>
    <forward-request />
  </backend>
  
  <outbound>
    <!-- Add rate limit headers -->
    <set-header name="X-Rate-Limit-Limit" exists-action="override">
      <value>1000</value>
    </set-header>
  </outbound>
  
  <on-error>
    <base />
  </on-error>
</policies>
```

**Apply policy:**
```bash
az apim api policy create \
  --resource-group $RG_NAME \
  --service-name $APIM_NAME \
  --api-id ctn-api \
  --xml-policy @infrastructure/apim/rate-limit-policy.xml
```

---

## Testing Checklist

- [ ] Phase 1 - Azure AD scopes defined
- [ ] Test client app registration created
- [ ] Test client has correct permissions
- [ ] API validates tokens correctly
- [ ] Scope enforcement works (403 for missing scopes)
- [ ] Phase 2 - APIM instance created
- [ ] CTN API imported into APIM
- [ ] Rate limiting policy applied
- [ ] Integration tests pass

---

## Deployment

```bash
# Commit all changes
git add -A
git commit -m "feat: Implement M2M authentication with Azure AD + APIM"
git push origin feature/m2m-authentication

# Wait for pipeline, then merge to main
```

---

## Rollback Plan

```bash
# Revert API code changes
git revert <commit-hash>
git push origin main
```

---

**END OF IMPLEMENTATION GUIDE**
