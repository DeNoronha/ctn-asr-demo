# 🇫🇷 Cloud IAM (Keycloak) Setup Guide

**Last Updated:** November 13, 2025
**Provider:** Cloud IAM (France) - https://www.cloud-iam.com
**Deployment Time:** 20 minutes
**Monthly Cost:** €0 (free tier: 100 users, 1 realm, unlimited clients)

---

## 📋 What You're Setting Up

- **Cloud IAM Keycloak** managed instance (France-based, GDPR-compliant)
- **M2M authentication** for legal entities (terminal operators, carriers, portals)
- **Dual authentication** (Entra ID for humans, Keycloak for machines)
- **Zero infrastructure management** (fully managed)

---

## ✅ Prerequisites

- [x] Cloud IAM account created (you've done this!)
- [ ] Azure CLI installed and logged in
- [ ] Database access (psql-ctn-demo-asr-dev)
- [ ] Azure Functions deployment permissions

---

## 🎯 Architecture Overview

```
┌──────────────────────────────────────────────────────┐
│ MEMBER PORTAL (Humans)                               │
│ React 18 + MSAL → Entra ID (Azure AD)               │
│ ✓ No changes needed                                  │
└────────────────────┬─────────────────────────────────┘
                     │
                     ▼
┌──────────────────────────────────────────────────────┐
│ CTN ASR API (Azure Functions)                        │
│ Middleware: authenticateDual()                       │
│ ┌────────────────────┬─────────────────────┐        │
│ │ Entra ID JWT       │ Keycloak JWT        │        │
│ │ (member portal)    │ (M2M clients)       │        │
│ └────────────────────┴─────────────────────┘        │
└────────────────────┬─────────────────────────────────┘
                     │
                     ▼
┌──────────────────────────────────────────────────────┐
│ M2M CLIENTS (Machines)                               │
│ Cloud IAM Keycloak (France)                          │
│ • Terminal operators (container tracking)            │
│ • Carriers (ETA updates)                             │
│ • External portals (bookings)                        │
└──────────────────────────────────────────────────────┘
```

---

## 🚀 Step-by-Step Setup

### STEP 1: Get Your Cloud IAM Instance Details

Once your Cloud IAM instance is provisioned, you'll receive:

```
Instance URL: https://YOUR-REALM.cloud-iam.com
Realm: YOUR-REALM-NAME (e.g., ctn-asr-m2m)
Admin Username: admin
Admin Password: <provided by Cloud IAM>
```

**Example:**
```
Instance URL: https://ctn-asr-m2m.cloud-iam.com
Realm: ctn-asr-m2m
```

---

### STEP 2: Login to Keycloak Admin Console

1. Open browser: `https://YOUR-REALM.cloud-iam.com/admin`
2. Login with admin credentials
3. You should see the Keycloak admin console

**Expected:** Keycloak dashboard loads with your realm

---

### STEP 3: Create API Client (Resource Server)

This client represents your CTN ASR API.

**In Keycloak Admin Console:**

1. **Navigate:** Clients → Create Client

2. **General Settings:**
   - Client type: `OpenID Connect`
   - Client ID: `ctn-asr-api`
   - Name: `CTN ASR Backend API`
   - Description: `Resource server for CTN ASR API authentication`
   - Click **Next**

3. **Capability config:**
   - Client authentication: **ON** ✓
   - Authorization: **OFF**
   - Standard flow: **OFF**
   - Direct access grants: **OFF**
   - Service accounts roles: **ON** ✓
   - Click **Next**

4. **Login settings:**
   - Root URL: `https://func-ctn-demo-asr-dev.azurewebsites.net`
   - Valid redirect URIs: `*` (for M2M, not used)
   - Click **Save**

5. **Get Client Secret:**
   - Go to **Credentials** tab
   - Copy **Client Secret**
   - Save to your `.credentials` file:

```bash
# Add to .credentials file
KEYCLOAK_API_CLIENT_ID=ctn-asr-api
KEYCLOAK_API_CLIENT_SECRET=<secret-from-credentials-tab>
```

---

### STEP 4: Create Service Accounts (M2M Clients)

Create one service account for each partner type.

#### Example: Terminal Operator

1. **Navigate:** Clients → Create Client

2. **General Settings:**
   - Client type: `OpenID Connect`
   - Client ID: `terminal-operator-acme`
   - Name: `Acme Terminal Operator`
   - Description: `M2M client for Acme Terminal container tracking`
   - Click **Next**

3. **Capability config:**
   - Client authentication: **ON** ✓
   - Authorization: **OFF**
   - Service accounts roles: **ON** ✓
   - All other options: **OFF**
   - Click **Next**

4. **Login settings:**
   - Leave defaults
   - Click **Save**

5. **Get Client Secret:**
   - Go to **Credentials** tab
   - Copy **Client Secret**
   - Save to secure location (provide to partner)

6. **Assign Roles (Custom Scopes):**
   - Go to **Service account roles** tab
   - Click **Assign role**
   - Select roles: `containers.read`, `eta.write`, `api.access`
   - Click **Assign**

**Repeat for each partner:**
- `carrier-xyz` (Carrier Company XYZ)
- `portal-docuflow` (DocuFlow Integration)
- `terminal-operator-rotterdam` (Rotterdam Terminal)

---

### STEP 5: Create Custom Roles (Scopes)

Define roles that match your API permissions.

1. **Navigate:** Realm roles (left sidebar)

2. **Create roles:**
   - Click **Create role**
   - Role name: `api.access`
   - Description: `Basic API access for all M2M clients`
   - Click **Save**

3. **Repeat for all roles:**
   - `containers.read` - Read container data
   - `containers.write` - Update container status
   - `eta.read` - Read ETA information
   - `eta.write` - Update ETA data
   - `members.read` - Read member data (admin only)
   - `members.write` - Manage members (admin only)
   - `bookings.read` - Read bookings
   - `bookings.write` - Create/update bookings

---

### STEP 6: Database Migration

Apply the migration to rename Zitadel columns to generic M2M naming.

```bash
# Connect to database
psql "host=psql-ctn-demo-asr-dev.postgres.database.azure.com \
  port=5432 \
  dbname=asr_dev \
  user=asradmin \
  sslmode=require"
```

```sql
-- Run migration
\i database/migrations/026-rename-zitadel-to-generic-m2m.sql

-- Expected output:
-- NOTICE: Step 1: Renamed columns to generic M2M naming
-- NOTICE: Step 2: Updated constraints
-- ...
-- NOTICE: ✓ Migration 026 completed successfully!
```

---

### STEP 7: Map Service Accounts to Parties

Map each Keycloak client to a CTN ASR party.

```sql
-- Example: Terminal Operator Acme
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
  created_by
) VALUES (
  (SELECT party_id FROM party_reference WHERE party_name = 'Acme Terminal Operator' LIMIT 1),
  'terminal-operator-acme',  -- Keycloak client ID
  'ctn-asr-m2m',             -- Your realm name
  'terminal-operator-acme',  -- Service account user ID (same as client ID)
  'Terminal Operator - Acme',
  'M2M authentication for Acme Terminal container tracking',
  'keycloak',                -- Changed from 'zitadel'
  'https://ctn-asr-m2m.cloud-iam.com/realms/ctn-asr-m2m',  -- Full issuer URL
  ARRAY['api.access', 'containers.read', 'eta.write'],
  (SELECT party_id FROM party_reference WHERE party_type = 'System' LIMIT 1)
);

-- Repeat for each service account
-- INSERT INTO ctn_m2m_credentials (...) VALUES (...);

-- Verify mappings
SELECT * FROM v_m2m_credentials_active;
```

**Expected:** View shows all your M2M credentials with `auth_provider = 'keycloak'`

---

### STEP 8: Configure Azure Functions

Update environment variables to use Keycloak.

```bash
# Get your Cloud IAM instance details
KEYCLOAK_ISSUER="https://ctn-asr-m2m.cloud-iam.com"
KEYCLOAK_REALM="ctn-asr-m2m"
KEYCLOAK_CLIENT_ID="ctn-asr-api"

# Update Azure Functions
az functionapp config appsettings set \
  --name func-ctn-demo-asr-dev \
  --resource-group rg-ctn-demo-asr-dev \
  --settings \
    KEYCLOAK_ISSUER="$KEYCLOAK_ISSUER" \
    KEYCLOAK_REALM="$KEYCLOAK_REALM" \
    KEYCLOAK_CLIENT_ID="$KEYCLOAK_CLIENT_ID"
```

**Verify:**
```bash
az functionapp config appsettings list \
  --name func-ctn-demo-asr-dev \
  --resource-group rg-ctn-demo-asr-dev \
  | grep KEYCLOAK
```

---

### STEP 9: Update API Code

Update your API functions to use Keycloak middleware.

**Option A: Replace all Zitadel references (recommended)**

```typescript
// OLD (Zitadel)
import { authenticateZitadel } from '../middleware/zitadel-auth';

// NEW (Keycloak)
import { authenticateKeycloak } from '../middleware/keycloak-auth';
```

**Option B: Use dual authentication (supports both)**

```typescript
// Supports both Entra ID AND Keycloak
import { authenticateDual } from '../middleware/keycloak-auth';

app.http('GetMembers', {
  methods: ['GET'],
  authLevel: 'anonymous',
  route: 'v1/members',
  handler: wrapEndpoint(getMembersHandler, {
    authenticate: authenticateDual, // Automatic provider detection
  }),
});
```

---

### STEP 10: Deploy Updated API

```bash
cd api

# Build
npm run build

# Deploy (with remote build)
func azure functionapp publish func-ctn-demo-asr-dev --typescript --build remote

# Wait for deployment (2-3 minutes)
# Verify deployment
curl https://func-ctn-demo-asr-dev.azurewebsites.net/api/health
```

---

### STEP 11: Test M2M Authentication

**Test Script:** Use the generated test script (see next step)

**Manual curl test:**

```bash
# 1. Get access token from Cloud IAM Keycloak
TOKEN=$(curl -s -X POST \
  "https://ctn-asr-m2m.cloud-iam.com/realms/ctn-asr-m2m/protocol/openid-connect/token" \
  -H "Content-Type: application/x-www-form-urlencoded" \
  -d "grant_type=client_credentials" \
  -d "client_id=terminal-operator-acme" \
  -d "client_secret=YOUR_CLIENT_SECRET" \
  | jq -r '.access_token')

echo "Token: $TOKEN"

# 2. Decode token (optional - verify claims)
echo $TOKEN | cut -d'.' -f2 | base64 -d | jq '.'

# Expected claims:
# - iss: https://ctn-asr-m2m.cloud-iam.com/realms/ctn-asr-m2m
# - aud: ctn-asr-api
# - azp: terminal-operator-acme
# - realm_access.roles: ["api.access", "containers.read", ...]

# 3. Call API
curl -X GET \
  "https://func-ctn-demo-asr-dev.azurewebsites.net/api/v1/members" \
  -H "Authorization: Bearer $TOKEN" \
  -H "Accept: application/json" \
  | jq '.'

# Expected: 200 OK with member data
# If you get 401: Check token issuer matches KEYCLOAK_ISSUER
# If you get 403: Check roles/scopes assigned
```

---

## ✅ Success Criteria

You know it's working when:

- [ ] Keycloak admin console accessible at `https://YOUR-REALM.cloud-iam.com/admin`
- [ ] Service accounts created with client secrets
- [ ] Database has mappings in `v_m2m_credentials_active` with `auth_provider='keycloak'`
- [ ] Azure Functions environment variables set
- [ ] M2M test returns 200 OK with data
- [ ] Member portal still works (Entra ID authentication unchanged)

---

## 📊 What You've Achieved

| Before (Zitadel Self-Hosted) | After (Cloud IAM Keycloak) |
|------------------------------|----------------------------|
| $55/month Azure infrastructure | **€0/month** (free tier) |
| 30-minute deployment script | **10-minute web UI setup** |
| Manual SSL/TLS configuration | **Automatic SSL** |
| Self-managed backups | **Automatic backups** |
| Self-managed updates | **Automatic updates** |
| Azure Container Apps + PostgreSQL | **Zero infrastructure** |
| Limited to 100 users? Scale up infrastructure | Limited to 100 users? Upgrade to €110/month |

---

## 🔐 Credential Storage

**Store in `.credentials` file:**

```bash
# CLOUD IAM KEYCLOAK (FRANCE)
# ============================================
# Deployed: November 13, 2025
# Region: France (Cloud IAM)
# Instance: https://ctn-asr-m2m.cloud-iam.com

KEYCLOAK_ISSUER=https://ctn-asr-m2m.cloud-iam.com
KEYCLOAK_REALM=ctn-asr-m2m
KEYCLOAK_ADMIN_USERNAME=admin
KEYCLOAK_ADMIN_PASSWORD=<from-cloud-iam>
KEYCLOAK_API_CLIENT_ID=ctn-asr-api
KEYCLOAK_API_CLIENT_SECRET=<from-credentials-tab>

# Service Account Credentials (share with partners)
TERMINAL_OPERATOR_ACME_CLIENT_ID=terminal-operator-acme
TERMINAL_OPERATOR_ACME_CLIENT_SECRET=<from-credentials-tab>

CARRIER_XYZ_CLIENT_ID=carrier-xyz
CARRIER_XYZ_CLIENT_SECRET=<from-credentials-tab>
```

---

## 🐛 Troubleshooting

### Issue: "Invalid audience" error

**Symptoms:**
```json
{
  "error": "unauthorized",
  "message": "Invalid audience. Expected API client ID."
}
```

**Solution:**
1. Check token audience claim:
   ```bash
   echo $TOKEN | cut -d'.' -f2 | base64 -d | jq '.aud'
   ```
2. Verify it matches `KEYCLOAK_CLIENT_ID` environment variable
3. If not, update client configuration in Keycloak

---

### Issue: "No party found for Keycloak client ID"

**Symptoms:**
- API returns 401
- Logs show: "No party found for Keycloak client ID: terminal-operator-acme"

**Solution:**
```sql
-- Verify mapping exists
SELECT * FROM ctn_m2m_credentials
WHERE m2m_client_id = 'terminal-operator-acme';

-- If missing, insert mapping (see STEP 7)
```

---

### Issue: Member portal broken after migration

**Symptoms:**
- Member portal users can't login
- "Unknown token issuer" error

**Solution:**
- Member portal should still use Entra ID (no changes needed!)
- Check `authenticateDual()` is detecting `microsoftonline.com` issuer correctly
- Verify Entra ID environment variables unchanged:
  ```bash
  az functionapp config appsettings list \
    --name func-ctn-demo-asr-dev \
    --resource-group rg-ctn-demo-asr-dev \
    | grep -E 'AZURE_CLIENT_ID|AZURE_TENANT_ID'
  ```

---

### Issue: Cloud IAM instance slow or unavailable

**Note:** Free tier uses shared infrastructure

**Options:**
1. **Wait:** Shared infrastructure may have brief delays
2. **Upgrade:** €110/month for dedicated infrastructure
3. **Check status:** Contact Cloud IAM support

---

## 📚 Next Steps

After successful setup:

1. **Distribute credentials** to partners
   - Send client_id and client_secret securely (encrypted email)
   - Provide token endpoint URL
   - Share API documentation

2. **Monitor usage**
   ```sql
   -- Check usage statistics
   SELECT
     service_account_name,
     m2m_client_id,
     last_used_at,
     total_requests
   FROM v_m2m_credentials_active
   ORDER BY last_used_at DESC;
   ```

3. **Set up alerts**
   - Monitor authentication failures
   - Track unusual request patterns
   - Alert on inactive accounts

4. **Document M2M onboarding**
   - Create partner onboarding guide
   - Include token request examples
   - Provide API endpoint documentation

---

## 💰 Cost Planning

### Free Tier (Current)
- **Cost:** €0/month
- **Limits:** 100 users, 1 realm, unlimited clients
- **Suitable for:** Testing, development, small production (<100 users)

### When to Upgrade (€110/month)
- [ ] Exceed 100 users
- [ ] Need custom domain (auth.ctn-asr.com)
- [ ] Require SLA guarantees
- [ ] Need dedicated infrastructure (performance)
- [ ] Require multiple realms (staging + production)

---

## 🆘 Support

- **Cloud IAM Support:** https://www.cloud-iam.com/support
- **Cloud IAM Documentation:** https://documentation.cloud-iam.com
- **Keycloak Docs:** https://www.keycloak.org/documentation
- **This Repository:** See `/docs` folder for additional guides

---

**Deployment Complete! 🎉**

Your M2M authentication is now powered by Cloud IAM Keycloak (France), giving you:
- ✅ Zero infrastructure management
- ✅ EU data residency (GDPR compliant)
- ✅ Free tier for testing and small-scale production
- ✅ Professional managed service with 24/7 support
