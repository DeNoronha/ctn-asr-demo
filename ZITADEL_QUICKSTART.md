# Zitadel M2M Authentication - Quick Start Guide

**Status:** Ready for deployment testing
**Last Updated:** November 11, 2025
**Time Required:** 30-45 minutes

---

## 📋 What's Already Done

✅ **Code deployed (3 hours ago):**
- Zitadel JWT validation middleware (`api/src/middleware/zitadel-auth.ts`)
- Database migration applied (tables created)
- M2M endpoints updated to support dual auth (Azure AD OR Zitadel):
  - `GET /api/v1/containers/status` (GetContainerStatus.ts)
  - `GET /api/v1/eta/updates` (GetETAUpdates.ts)
  - `GET /api/v1/bookings` + `POST /api/v1/bookings` (ManageBookings.ts)

✅ **Documentation:**
- Complete setup guide: `docs/ZITADEL_M2M_SETUP.md` (800+ lines)
- Example M2M flow script: `examples/m2m-auth-flow.js`
- Setup automation script: `scripts/setup-zitadel-m2m.sh`

---

## 🚀 Remaining Steps (DO THIS NOW)

### Step 1: Start Zitadel (5 minutes)

```bash
cd /Users/ramondenoronha/Dev/DIL/DEV-CTN-ASR

# Start containers
docker compose -f docker-compose.zitadel.yml --env-file .env.zitadel up -d

# Verify startup (wait for "successfully started")
docker compose -f docker-compose.zitadel.yml logs -f zitadel

# Check status
docker compose -f docker-compose.zitadel.yml ps
```

**Expected output:**
```
NAME              STATUS
ctn-zitadel       Up (healthy)
ctn-zitadel-db    Up (healthy)
```

**Access Zitadel console:** http://localhost:8080/ui/console
**Login:** admin / (password from `.env.zitadel`)

---

### Step 2: Run Setup Script (10 minutes)

```bash
# Install jq if needed
brew install jq

# Run automated setup
./scripts/setup-zitadel-m2m.sh
```

**This creates:**
- CTN ASR API project in Zitadel
- API application for token validation
- 4 service accounts:
  - `test-client` (for testing)
  - `terminal-operator` (terminal systems)
  - `carrier` (shipping lines)
  - `portal-integration` (external portals)

**Output file:** `zitadel-credentials.json`

**⚠️ CRITICAL:** Save this file securely! Contains client secrets (shown only once).

**Example output:**
```json
{
  "project_id": "ZITADEL_PROJECT_ID_HERE",
  "api_client_id": "ZITADEL_PROJECT_ID_HERE@ctn_asr",
  "service_accounts": [
    {
      "name": "terminal-operator",
      "client_id": "USER_ID_HERE@PROJECT_ID_HERE",
      "client_secret": "SECRET_SHOWN_ONLY_ONCE_SAVE_IT_NOW"
    }
  ]
}
```

---

### Step 3: Map Service Accounts to Parties (10 minutes)

Connect to Azure PostgreSQL and map Zitadel clients to CTN parties:

```bash
# Get password from .credentials file (POSTGRES_PASSWORD variable)
psql -h psql-ctn-demo-asr-dev.postgres.database.azure.com \
     -p 5432 \
     -U asradmin \
     -d asr_dev
```

**Insert mappings:**
```sql
-- Example: Map terminal-operator to a party
INSERT INTO ctn_m2m_credentials (
  party_id,
  zitadel_client_id,        -- From zitadel-credentials.json
  zitadel_project_id,
  zitadel_user_id,          -- Part before @ in client_id
  service_account_name,
  description,
  auth_provider,
  auth_issuer,
  assigned_scopes,
  created_by
) VALUES (
  -- Get an existing party (or create test party first)
  (SELECT party_id FROM party_reference WHERE party_type = 'Terminal Operator' LIMIT 1),

  'USER_ID@PROJECT_ID',     -- client_id from zitadel-credentials.json
  'PROJECT_ID',             -- project_id from zitadel-credentials.json
  'USER_ID',                -- user_id (part before @ in client_id)
  'terminal-operator',
  'Terminal operator M2M authentication',
  'zitadel',
  'http://localhost:8080',
  ARRAY['api.access', 'containers.read', 'eta.write'],

  -- System user as creator
  (SELECT party_id FROM party_reference WHERE party_type = 'System' LIMIT 1)
);

-- Verify insertion
SELECT * FROM v_zitadel_m2m_active;
```

**⚠️ Repeat for each service account** (test-client, carrier, portal-integration).

**If you need a test party:**
```sql
-- Create test party reference
INSERT INTO party_reference (party_name, party_type)
VALUES ('Test Terminal Operator', 'Terminal Operator')
RETURNING party_id;

-- Use the returned party_id in the mapping above
```

---

### Step 4: Configure Azure Functions (5 minutes)

**Option A: Local Development Testing**

Update `api/local.settings.json`:
```json
{
  "IsEncrypted": false,
  "Values": {
    "ZITADEL_ISSUER": "http://localhost:8080",
    "ZITADEL_PROJECT_ID": "<project_id from zitadel-credentials.json>",
    "ZITADEL_API_CLIENT_ID": "<api_client_id from zitadel-credentials.json>"
  }
}
```

**Option B: Production Deployment**

```bash
# From zitadel-credentials.json, get:
# - project_id
# - api_client_id

az functionapp config appsettings set \
  --name func-ctn-demo-asr-dev \
  --resource-group ctn-demo \
  --settings \
    ZITADEL_ISSUER="https://zitadel.ctn-asr.com" \
    ZITADEL_PROJECT_ID="<project-id>" \
    ZITADEL_API_CLIENT_ID="<api-client-id>"
```

**Note:** For production, change `ZITADEL_ISSUER` to your hosted Zitadel URL.

---

### Step 5: Deploy Updated Endpoints (5 minutes)

```bash
# Commit Zitadel integration
git add -A
git commit -m "feat(m2m): enable Zitadel authentication for M2M endpoints

- Updated GetContainerStatus to use dual auth (Azure AD or Zitadel)
- Updated GetETAUpdates to use dual auth
- Updated ManageBookings (GET/POST) to use dual auth
- Endpoints now support both user tokens (Azure AD) and M2M tokens (Zitadel)
- Enables terminal operators, carriers, and external portals to access APIs

🤖 Generated with Claude Code
Co-Authored-By: Claude <noreply@anthropic.com>"

# Push to trigger pipeline
git push origin main

# Wait ~2-3 minutes, verify deployment
# Check: https://dev.azure.com/ctn-demo/ASR/_build
```

---

### Step 6: Test M2M Authentication (10 minutes)

**Test with example script:**
```bash
node examples/m2m-auth-flow.js test-client
```

**Expected output:**
```
======================================
Step 1: Requesting Access Token from Zitadel
======================================

✓ Access token received

JWT Claims:
  Issuer: http://localhost:8080
  Subject: <service-account-user-id>
  Audience: ["<project-id>"]

======================================
Step 2: Calling CTN ASR API
======================================

✓ API responded with status: 200

======================================
Success! M2M Authentication Flow Complete
======================================
```

**Manual test with curl:**
```bash
# 1. Get access token from Zitadel
TOKEN=$(curl -s -X POST "http://localhost:8080/oauth/v2/token" \
  -u "<client_id>:<client_secret>" \
  -d "grant_type=client_credentials" \
  -d "scope=openid profile email urn:zitadel:iam:org:project:id:zitadel:aud" \
  | jq -r '.access_token')

echo "Token: $TOKEN"

# 2. Call container status endpoint
curl -X GET "http://localhost:7071/api/v1/containers/status?containerNumber=CONT123456" \
  -H "Authorization: Bearer $TOKEN" \
  -H "Accept: application/json" \
  | jq '.'

# Expected: 200 OK with container data
```

**Test all M2M endpoints:**
```bash
# Container status
curl -H "Authorization: Bearer $TOKEN" \
  "http://localhost:7071/api/v1/containers/status?containerNumber=TEST001"

# ETA updates
curl -H "Authorization: Bearer $TOKEN" \
  "http://localhost:7071/api/v1/eta/updates?bookingRef=BK123456"

# List bookings
curl -H "Authorization: Bearer $TOKEN" \
  "http://localhost:7071/api/v1/bookings"

# Create booking
curl -X POST "http://localhost:7071/api/v1/bookings" \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "containerNumber": "CONT789",
    "carrier": "Maersk",
    "origin": "Hamburg",
    "destination": "Rotterdam"
  }'
```

---

## 🎯 Success Criteria

✅ **Zitadel running:** http://localhost:8080 accessible
✅ **Service accounts created:** 4 accounts in zitadel-credentials.json
✅ **Database mappings:** All service accounts mapped to parties
✅ **Environment configured:** ZITADEL_* variables set
✅ **Deployment successful:** Pipeline green in Azure DevOps
✅ **M2M auth working:** Example script returns 200 OK
✅ **Token validation:** JWT signature verified, party resolved

---

## 🔐 Security Checklist

- [ ] `zitadel-credentials.json` added to `.gitignore` (already done)
- [ ] Client secrets saved in secure location (Azure Key Vault for prod)
- [ ] Zitadel admin password changed from default
- [ ] Master encryption key backed up securely
- [ ] Audit logs enabled for secret generation
- [ ] Token expiration set to 1 hour (default)
- [ ] Scope validation enforced in API endpoints

---

## 🐛 Troubleshooting

### "Connection refused" to Zitadel
```bash
# Check if running
docker compose -f docker-compose.zitadel.yml ps

# Check logs
docker compose -f docker-compose.zitadel.yml logs zitadel

# Restart if needed
docker compose -f docker-compose.zitadel.yml restart
```

### "Invalid token: signature verification failed"
```bash
# Verify issuer matches
echo $TOKEN | cut -d'.' -f2 | base64 -d | jq '.iss'
# Should match: ZITADEL_ISSUER (http://localhost:8080)

# Check JWKS endpoint
curl http://localhost:8080/oauth/v2/keys | jq '.'
```

### "No party found for Zitadel client ID"
```sql
-- Verify mapping exists
SELECT * FROM ctn_m2m_credentials
WHERE zitadel_client_id = '<client-id-from-token>';

-- If empty, insert mapping (see Step 3)
```

### "Invalid audience"
```bash
# Verify audience in token
echo $TOKEN | cut -d'.' -f2 | base64 -d | jq '.aud'
# Should match: ZITADEL_PROJECT_ID

# Check configuration
echo $ZITADEL_PROJECT_ID
echo $ZITADEL_API_CLIENT_ID
```

---

## 📚 Reference Documentation

- **Complete Setup Guide:** `docs/ZITADEL_M2M_SETUP.md`
- **Setup Status:** `docs/ZITADEL_SETUP_COMPLETED.md`
- **Example Flow:** `examples/m2m-auth-flow.js`
- **Database Migration:** `database/migrations/023-zitadel-m2m-credentials.sql`
- **Middleware:** `api/src/middleware/zitadel-auth.ts`

---

## 🚀 Next Steps (Production)

After local testing succeeds:

1. **Deploy Zitadel to Production**
   - Docker Swarm or Kubernetes
   - Managed PostgreSQL (Azure/AWS/GCP)
   - HTTPS/TLS with reverse proxy (Nginx + Let's Encrypt)
   - Domain: `https://zitadel.ctn-asr.com`

2. **Store Secrets in Azure Key Vault**
   ```bash
   az keyvault secret set \
     --vault-name ctn-asr-keyvault \
     --name ZitadelProjectId \
     --value "<project-id>"
   ```

3. **Configure Production Environment**
   - Update `ZITADEL_ISSUER` to production URL
   - Set up monitoring and alerting
   - Implement secret rotation policy (30-90 days)
   - Enable backup strategy for Zitadel database

4. **Distribute Client Credentials**
   - Send client_id + client_secret to organizations securely
   - Provide API documentation and examples
   - Set up support channel for M2M issues

---

**Questions?** See complete guide: `docs/ZITADEL_M2M_SETUP.md`
