# Keycloak M2M Authentication

**Last Updated:** November 13, 2025
**Status:** ✅ Production Ready

---

## Overview

This document describes the Machine-to-Machine (M2M) authentication system using Cloud IAM Keycloak for the CTN ASR API. This system enables external partners (terminal operators, carriers, shipping lines) to access API endpoints securely using OAuth2.0 client credentials flow.

### Why Keycloak?

- **Managed Service**: Cloud IAM handles infrastructure, updates, backups
- **EU Data Residency**: Hosted in France (GDPR compliant)
- **Free Tier**: 100 users, 1 realm, unlimited clients
- **OAuth2.0/OIDC**: Industry-standard authentication protocols
- **Scalable**: Can upgrade to paid tiers as needed

### Dual Authentication Architecture

```
┌─────────────────────────────────────────────────────────────┐
│                    CTN ASR API                               │
│                  (Azure Functions)                           │
└───────────────────┬─────────────────────────────────────────┘
                    │
        ┌───────────┴───────────┐
        │                       │
        ▼                       ▼
┌───────────────┐       ┌──────────────┐
│  Entra ID     │       │  Keycloak    │
│  (Azure AD)   │       │  (Cloud IAM) │
└───────┬───────┘       └──────┬───────┘
        │                      │
        ▼                      ▼
  Human Users             M2M Clients
  (Member Portal)         (Terminal Operators,
                           Carriers, External Systems)
```

**Authentication is determined by token issuer:**
- `login.microsoftonline.com` → Entra ID validation
- `lemur-8.cloud-iam.com` → Keycloak validation

---

## Cloud IAM Keycloak Instance

### Instance Details

| Property | Value |
|----------|-------|
| **Provider** | Cloud IAM (France) |
| **Base URL** | `https://lemur-8.cloud-iam.com/auth` |
| **Realm** | `ctn-test` |
| **Issuer** | `https://lemur-8.cloud-iam.com/auth/realms/ctn-test` |
| **JWKS Endpoint** | `https://lemur-8.cloud-iam.com/auth/realms/ctn-test/protocol/openid-connect/certs` |
| **Token Endpoint** | `https://lemur-8.cloud-iam.com/auth/realms/ctn-test/protocol/openid-connect/token` |
| **Free Tier Limits** | 100 users, 1 realm, unlimited clients |

### Admin Access

**Admin Console:** https://lemur-8.cloud-iam.com/auth/admin/ctn-test/console/

Credentials stored in: `/Users/ramondenoronha/Dev/DIL/DEV-CTN-ASR/.credentials`

---

## API Configuration

### Azure Functions Environment Variables

The following environment variables must be configured in Azure Functions:

```bash
# Keycloak Configuration
KEYCLOAK_ISSUER=https://lemur-8.cloud-iam.com/auth/realms/ctn-test
KEYCLOAK_JWKS_URI=https://lemur-8.cloud-iam.com/auth/realms/ctn-test/protocol/openid-connect/certs
KEYCLOAK_AUDIENCE=account

# Existing Entra ID config (unchanged)
AZURE_AD_TENANT_ID=<tenant-id>
AZURE_AD_CLIENT_ID=<client-id>
```

**Current Status:** ✅ Variables configured in Azure Functions (func-ctn-demo-asr-dev)

### Middleware Architecture

**File:** `api/src/middleware/keycloak-auth.ts`

**Key Functions:**

```typescript
// Validate Keycloak JWT using JWKS
export async function validateKeycloakToken(
  token: string,
  context: InvocationContext
): Promise<KeycloakJwtPayload>

// Resolve party_id from client_id via database
export async function resolvePartyIdFromKeycloak(
  clientId: string,
  context: InvocationContext
): Promise<string | null>

// Keycloak-only authentication
export async function authenticateKeycloak(
  request: HttpRequest,
  context: InvocationContext
): Promise<{ request: AuthenticatedRequest } | HttpResponseInit>

// Dual authentication (Entra ID or Keycloak)
export async function authenticateDual(
  request: HttpRequest,
  context: InvocationContext
): Promise<{ request: AuthenticatedRequest } | HttpResponseInit>
```

**Authentication Flow:**

```
1. Extract Bearer token from Authorization header
2. Detect issuer (microsoftonline.com or lemur-8.cloud-iam.com)
3. If Keycloak:
   a. Fetch JWKS public keys
   b. Verify JWT signature (RS256)
   c. Validate claims (exp, iss, aud)
   d. Extract realm roles
   e. Resolve party_id from database (ctn_m2m_credentials)
   f. Attach to AuthenticatedRequest
4. Continue to RBAC scope check (requireScopes)
5. Execute business logic
```

---

## Realm Roles (Scopes)

### Available Roles

Realm roles are assigned to service accounts and map to API endpoint permissions:

| Role | Description | Endpoints |
|------|-------------|-----------|
| `api.access` | Basic API access for all M2M clients | Required for all M2M calls |
| `Container.Read` | Read container tracking data | `GET /v1/containers/status` |
| `Container.Write` | Update container information | `PUT /v1/containers/{id}` |
| `ETA.Read` | Read ETA information | `GET /v1/eta/updates` |
| `ETA.Write` | Update ETA information | `POST /v1/eta/updates` |
| `Booking.Read` | Read container booking data | `GET /v1/bookings` |
| `Booking.Write` | Create/update booking data | `POST /v1/bookings` |
| `members.read` | Read member information | `GET /v1/members` |
| `members.write` | Update member information | `PUT /v1/members/{id}` |

**Note:** Role names are **case-sensitive** and must match exactly.

### Creating New Roles

1. Login to Keycloak Admin Console
2. Navigate to: **Realm roles**
3. Click **Create role**
4. Enter role name (e.g., `Shipment.Read`)
5. Add description (e.g., "Read shipment tracking data")
6. Save

---

## Service Account Setup

### Creating a New M2M Client

#### Step 1: Create Client in Keycloak

1. **Login to Keycloak Admin Console**
   - URL: https://lemur-8.cloud-iam.com/auth/admin/ctn-test/console/

2. **Navigate to Clients**
   - Left menu → **Clients** → **Create client**

3. **Configure Client Settings**
   - **Client type:** OpenID Connect
   - **Client ID:** `terminal-acme-operator` (lowercase, no spaces)
   - **Name:** ACME Terminal Operator
   - **Description:** M2M client for ACME Terminal
   - Click **Next**

4. **Capability Config**
   - ✅ **Client authentication:** ON
   - ✅ **Service accounts roles:** ON (enables M2M)
   - ❌ Standard flow: OFF
   - ❌ Direct access grants: OFF
   - Click **Next**

5. **Login Settings**
   - Leave blank (not used for M2M)
   - Click **Save**

6. **Get Client Secret**
   - Navigate to **Credentials** tab
   - Copy the **Client secret**
   - **IMPORTANT:** Store securely, shown only once!

#### Step 2: Assign Realm Roles

1. Navigate to **Service Account Roles** tab
2. Click **Assign role**
3. Select roles needed for this client:
   - Example: `api.access`, `Container.Read`, `ETA.Read`
4. Click **Assign**

#### Step 3: Map to Database Party

**Find the party_id for this organization:**

```sql
-- Find party by legal name
SELECT party_id, primary_legal_name
FROM legal_entity
WHERE primary_legal_name ILIKE '%ACME%'
  AND is_deleted = false;
```

**Insert M2M credentials mapping:**

```sql
INSERT INTO ctn_m2m_credentials (
  party_id,
  m2m_client_id,
  m2m_realm_id,
  m2m_user_id,
  service_account_name,
  description,
  auth_provider,
  auth_issuer,
  assigned_scopes,
  is_active
) VALUES (
  '<party-id-from-above>',                                    -- party_id
  'terminal-acme-operator',                                   -- m2m_client_id
  'ctn-test',                                                 -- m2m_realm_id
  'service-account-terminal-acme-operator',                   -- m2m_user_id
  'ACME Terminal Operator',                                   -- service_account_name
  'M2M client for ACME Terminal container tracking access',  -- description
  'keycloak',                                                 -- auth_provider
  'https://lemur-8.cloud-iam.com/auth/realms/ctn-test',     -- auth_issuer
  ARRAY['api.access', 'Container.Read', 'ETA.Read'],        -- assigned_scopes
  true                                                        -- is_active
);
```

**Verify mapping:**

```sql
SELECT
  service_account_name,
  m2m_client_id,
  auth_provider,
  assigned_scopes,
  is_active,
  party_name
FROM v_m2m_credentials_active
WHERE m2m_client_id = 'terminal-acme-operator';
```

---

## Testing M2M Authentication

### Manual Testing with curl

#### Step 1: Request Access Token

```bash
curl -X POST 'https://lemur-8.cloud-iam.com/auth/realms/ctn-test/protocol/openid-connect/token' \
  -H 'Content-Type: application/x-www-form-urlencoded' \
  -d 'grant_type=client_credentials' \
  -d 'client_id=terminal-acme-operator' \
  -d 'client_secret=<client-secret>'
```

**Expected Response:**

```json
{
  "access_token": "eyJhbGciOiJSUzI1NiIsInR5cCI6IkpXVCIsImtpZCI6InJSaFZRWDFoUG5sc...",
  "expires_in": 300,
  "refresh_expires_in": 0,
  "token_type": "Bearer",
  "not-before-policy": 0,
  "scope": "email profile"
}
```

#### Step 2: Extract Access Token

```bash
TOKEN=$(curl -s -X POST '...' | jq -r '.access_token')
```

#### Step 3: Call API Endpoint

```bash
# Test Container Status endpoint
curl -X GET 'https://func-ctn-demo-asr-dev.azurewebsites.net/api/v1/containers/status?containerNumber=CONT123456' \
  -H "Authorization: Bearer $TOKEN" \
  -H 'Accept: application/json'
```

**Expected Response (200 OK):**

```json
{
  "success": true,
  "data": {
    "containerNumber": "CONT123456",
    "type": "20FT_STANDARD",
    "status": "LOADED",
    "location": {
      "terminal": "Rotterdam Terminal",
      "position": "Block A, Row 12, Bay 5"
    }
  },
  "requestedBy": "M2M",
  "timestamp": "2025-11-13T15:54:07.782Z"
}
```

### Automated Testing Script

Use the provided test script:

```bash
./scripts/test-keycloak-m2m.sh terminal-acme-operator <client-secret>
```

**Script performs:**
1. ✅ Token request
2. ✅ JWT decoding and validation
3. ✅ API health check
4. ✅ Authenticated endpoint test
5. ✅ Database mapping verification

---

## Current Test Service Account

**For development/testing purposes:**

| Property | Value |
|----------|-------|
| **Client ID** | `test-terminal-operator` |
| **Client Secret** | `<stored-in-.credentials-file>` |
| **Party ID** | `96eb64b2-31e9-4e11-b4c2-e8d8a58f1d0a` |
| **Party Name** | Test Terminal Operator Inc |
| **Assigned Roles** | `api.access`, `Container.Read`, `ETA.Read`, `Booking.Read`, `Booking.Write` |

**Status:** ✅ Fully tested and working

**Tested Endpoints:**
- ✅ `GET /v1/containers/status` - Returns container tracking data
- ✅ `GET /v1/eta/updates` - Returns ETA information
- ✅ `GET /v1/bookings` - Returns booking data
- ✅ `POST /v1/bookings` - Creates new booking

---

## Database Schema

### Table: ctn_m2m_credentials

Maps Keycloak service accounts to CTN parties.

```sql
CREATE TABLE ctn_m2m_credentials (
  credential_id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  party_id UUID NOT NULL REFERENCES party_reference(party_id),

  -- M2M Provider Info (generic naming)
  m2m_client_id VARCHAR(500) NOT NULL,        -- Keycloak: client_id
  m2m_realm_id VARCHAR(500),                  -- Keycloak: realm name
  m2m_user_id VARCHAR(500),                   -- Keycloak: service account user ID

  -- Metadata
  service_account_name VARCHAR(500) NOT NULL,
  description TEXT,

  -- Provider Configuration
  auth_provider VARCHAR(50) NOT NULL,         -- 'keycloak', 'azure_ad', 'okta'
  auth_issuer VARCHAR(500) NOT NULL,          -- Full issuer URL

  -- Permissions
  assigned_scopes TEXT[],                     -- Array of scopes/roles
  allowed_endpoints TEXT[],                   -- Optional endpoint restrictions

  -- Status
  is_active BOOLEAN DEFAULT true,
  is_deleted BOOLEAN DEFAULT false,

  -- Audit
  dt_created TIMESTAMPTZ DEFAULT NOW(),
  dt_modified TIMESTAMPTZ DEFAULT NOW(),
  created_by UUID REFERENCES party_reference(party_id),
  modified_by UUID REFERENCES party_reference(party_id),

  -- Usage Tracking
  last_used_at TIMESTAMPTZ,
  total_requests INTEGER DEFAULT 0,
  last_request_ip VARCHAR(45),

  CONSTRAINT chk_m2m_auth_provider
    CHECK (auth_provider IN ('keycloak', 'azure_ad', 'okta', 'zitadel'))
);
```

### View: v_m2m_credentials_active

Convenience view for active M2M credentials with party information.

```sql
CREATE OR REPLACE VIEW v_m2m_credentials_active AS
SELECT
  c.credential_id,
  c.party_id,
  c.m2m_client_id,
  c.service_account_name,
  c.auth_provider,
  c.auth_issuer,
  c.assigned_scopes,
  c.is_active,
  c.last_used_at,
  c.total_requests,
  p.party_type,
  le.primary_legal_name as party_name
FROM ctn_m2m_credentials c
LEFT JOIN party_reference p ON c.party_id = p.party_id
LEFT JOIN legal_entity le ON c.party_id = le.party_id AND le.is_deleted = false
WHERE c.is_deleted = false
  AND c.is_active = true;
```

---

## Error Handling

### Common Error Responses

#### 401 Unauthorized - Authentication Failed

```json
{
  "error": "unauthorized",
  "error_description": "Invalid or expired token"
}
```

**Causes:**
- Token expired (300 seconds default)
- Invalid JWT signature
- Token not from expected issuer
- Malformed Authorization header

**Solution:** Request new access token

#### 403 Forbidden - Insufficient Scopes

```json
{
  "error": "forbidden",
  "error_description": "Missing required scopes: Container.Read",
  "required_scopes": ["Container.Read"],
  "missing_scopes": ["Container.Read"]
}
```

**Causes:**
- Service account missing required realm role
- Scope name mismatch (case-sensitive)
- Role not assigned in Keycloak

**Solution:** Assign missing roles in Keycloak admin console

#### 404 Not Found - Party Not Mapped

**Logged in Azure Functions:**
```
WARNING: Keycloak client 'terminal-xyz' not found in ctn_m2m_credentials table
```

**Causes:**
- Missing database mapping for client_id
- Party record not created
- is_deleted = true or is_active = false

**Solution:** Insert mapping into `ctn_m2m_credentials` table

---

## Security Considerations

### Token Expiration

- **Default:** 300 seconds (5 minutes)
- **Recommendation:** Request new token before expiration
- **Best Practice:** Implement token caching with refresh logic

### Secret Management

- **Storage:** Never commit secrets to git
- **Rotation:** Rotate secrets every 90 days
- **Access:** Limit secret access to authorized personnel only
- **Logging:** Never log client secrets

### Rate Limiting

**Current:** No M2M-specific rate limiting (uses Azure Functions default)

**Recommended for Production:**
- Implement per-client rate limits (e.g., 100 req/min)
- Use Azure API Management for advanced policies
- Monitor via `ctn_m2m_credentials.total_requests`

### Audit Logging

All M2M requests are logged with:
- Client ID
- Timestamp
- IP address
- Endpoint accessed
- Scopes used
- Success/failure status

**Query recent M2M activity:**

```sql
SELECT
  m2m_client_id,
  service_account_name,
  last_used_at,
  total_requests,
  last_request_ip
FROM v_m2m_credentials_active
ORDER BY last_used_at DESC NULLS LAST;
```

---

## Migration from Zitadel

### Database Migration

**File:** `database/migrations/026-rename-zitadel-to-generic-m2m-fixed-v2.sql`

**Changes:**
- Renamed `zitadel_client_id` → `m2m_client_id`
- Renamed `zitadel_project_id` → `m2m_realm_id`
- Renamed `zitadel_user_id` → `m2m_user_id`
- Updated constraints to support multiple providers
- Renamed table `ctn_zitadel_secret_audit` → `ctn_m2m_secret_audit`
- Renamed view `v_zitadel_m2m_active` → `v_m2m_credentials_active`

**Status:** ✅ Applied successfully (November 13, 2025)

### Middleware Changes

**Removed:** `api/src/middleware/zitadel-auth.ts`
**Replaced with:** `api/src/middleware/keycloak-auth.ts`

**Updated Functions:**
- `api/src/functions/GetContainerStatus.ts`
- `api/src/functions/GetETAUpdates.ts`
- `api/src/functions/ManageBookings.ts`

All now use `authenticateDual` from `keycloak-auth.ts`

---

## Production Checklist

### Before Onboarding New Partners

- [ ] Create Keycloak service account client
- [ ] Assign appropriate realm roles (minimum required scopes)
- [ ] Generate and securely share client secret
- [ ] Verify party_id exists in database
- [ ] Insert mapping into `ctn_m2m_credentials`
- [ ] Test authentication with test script
- [ ] Provide partner with API documentation
- [ ] Set up monitoring/alerting for this client

### Monitoring

**Key Metrics:**
- Token request rate (Keycloak admin console)
- API call volume per client (`total_requests`)
- Failed authentication attempts (Azure Application Insights)
- Average response time per endpoint

**Alerts:**
- Unusual spike in failed auth attempts (potential attack)
- Client not used for >30 days (cleanup candidate)
- High error rate for specific client (investigate)

---

## Troubleshooting

### Issue: "Invalid issuer"

**Symptom:** 401 Unauthorized with "Token issuer does not match"

**Check:**
1. Verify `KEYCLOAK_ISSUER` environment variable matches token `iss` claim
2. Token issuer should be: `https://lemur-8.cloud-iam.com/auth/realms/ctn-test`
3. No trailing slashes in environment variable

### Issue: "JWKS fetch failed"

**Symptom:** 401 Unauthorized with "Failed to fetch JWKS"

**Check:**
1. Network connectivity from Azure Functions to Cloud IAM
2. JWKS endpoint accessible: `https://lemur-8.cloud-iam.com/auth/realms/ctn-test/protocol/openid-connect/certs`
3. No firewall blocking outbound HTTPS

### Issue: "Party not found"

**Symptom:** 404 Not Found or 403 Forbidden after successful authentication

**Check:**
1. Query database: `SELECT * FROM v_m2m_credentials_active WHERE m2m_client_id = 'client-id'`
2. Verify `is_active = true` and `is_deleted = false`
3. Check party_id exists in `party_reference` table
4. Verify legal_entity mapping (for party_name)

### Issue: "Scope check failed"

**Symptom:** 403 Forbidden with "Missing required scopes"

**Check:**
1. Token contains required roles in `realm_access.roles`
2. Role names match exactly (case-sensitive: `Container.Read` not `container.read`)
3. Service account has roles assigned in Keycloak
4. Refresh token to get updated roles

---

## References

### Documentation

- [Cloud IAM Keycloak Documentation](https://www.cloud-iam.com/documentation)
- [Keycloak OAuth2.0 Guide](https://www.keycloak.org/docs/latest/securing_apps/#_client_credentials_grant)
- [OAuth2.0 Client Credentials Flow](https://oauth.net/2/grant-types/client-credentials/)

### Code Files

- Middleware: `api/src/middleware/keycloak-auth.ts`
- RBAC: `api/src/middleware/auth.ts` (requireScopes)
- Test Script: `scripts/test-keycloak-m2m.sh`
- Database Migration: `database/migrations/026-rename-zitadel-to-generic-m2m-fixed-v2.sql`

### Related Documents

- `CLOUD_IAM_SETUP_GUIDE.md` - Initial setup guide
- `TASK_MANAGER.md` - Database schema refactoring tasks
- `.credentials` - Keycloak admin credentials (gitignored)

---

**Document Version:** 1.0
**Created:** November 13, 2025
**Author:** Development Team
**Status:** ✅ Production Ready
