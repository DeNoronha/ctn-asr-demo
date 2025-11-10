# Zitadel M2M Authentication - Setup Status

**Date:** November 6, 2025
**Status:** Partially Completed - Manual Docker Setup Required

---

## ✅ Completed Steps

### 1. Code Deployment
- **Commit:** `d42adb9` - feat(auth): add Zitadel M2M authentication infrastructure
- **Status:** ✅ Pushed to main branch
- **Pipeline:** Triggered (check Azure DevOps)
- **Files Deployed:**
  - `api/src/middleware/zitadel-auth.ts` - JWT validation middleware
  - Database migration
  - Documentation and examples

### 2. Database Migration
- **Status:** ✅ Applied to Azure PostgreSQL
- **Database:** psql-ctn-demo-asr-dev.postgres.database.azure.com
- **Tables Created:**
  - `ctn_m2m_credentials` (M2M client to party mapping)
  - `ctn_zitadel_secret_audit` (secret lifecycle audit)
- **Indexes:** 10 indexes created for performance
- **Views:** `v_zitadel_m2m_active` (active credentials view)
- **Functions:**
  - `update_zitadel_m2m_modified()` - automatic timestamp updates
  - `update_zitadel_m2m_usage()` - usage tracking

### 3. Configuration Files
- **Status:** ✅ Created `.env.zitadel` with secure passwords
- **Location:** `/Users/ramondenoronha/Dev/DIL/ASR-full/.env.zitadel`
- **Credentials:** All Zitadel credentials stored in `.credentials` file
  - See section: ZITADEL M2M AUTHENTICATION
  - Variables: `ZITADEL_ADMIN_PASSWORD`, `ZITADEL_DB_PASSWORD`, `ZITADEL_MASTER_KEY`

---

## ⏳ Pending Steps - Manual Action Required

### Step 1: Start Zitadel Docker Containers

**Why:** Docker is not available in the automation environment. You must run this on your local machine.

**Commands:**
```bash
# Navigate to project directory
cd /Users/ramondenoronha/Dev/DIL/ASR-full

# Start Zitadel and PostgreSQL
docker compose -f docker-compose.zitadel.yml --env-file .env.zitadel up -d

# Verify containers are running
docker compose -f docker-compose.zitadel.yml ps

# Should show:
# NAME              STATUS
# ctn-zitadel       Up (healthy)
# ctn-zitadel-db    Up (healthy)

# Check logs for "successfully started"
docker compose -f docker-compose.zitadel.yml logs -f zitadel
```

**Expected:** After 30-60 seconds, you should see "successfully started" in the logs.

**Access:** http://localhost:8080/ui/console

### Step 2: Run Zitadel Setup Script

**Purpose:** Creates Zitadel project, API application, and service accounts.

**Command:**
```bash
cd /Users/ramondenoronha/Dev/DIL/ASR-full

./scripts/setup-zitadel-m2m.sh
```

**This script will:**
1. Authenticate as admin user
2. Create "CTN ASR API" project
3. Create API application for token validation
4. Create 4 service accounts:
   - test-client
   - terminal-operator
   - carrier
   - portal-integration
5. Generate client credentials for each
6. Save all credentials to `zitadel-credentials.json`

**Output File:** `zitadel-credentials.json` (NEVER commit this!)

**Example output:**
```json
{
  "project_id": "123456789",
  "api_client_id": "123456789@project",
  "service_accounts": [
    {
      "name": "terminal-operator",
      "client_id": "987654321@123456789",
      "client_secret": "secret-shown-only-once"
    }
  ]
}
```

### Step 3: Map Service Accounts to Parties

**Purpose:** Link Zitadel service accounts to CTN parties in the database.

**Connect to database:**
```bash
# Use password from .credentials file (POSTGRES_PASSWORD variable)
psql -h psql-ctn-demo-asr-dev.postgres.database.azure.com -p 5432 -U asradmin -d asr_dev
# You will be prompted for password - get it from .credentials file
```

**Insert mapping (example):**
```sql
-- Replace placeholders with actual values from zitadel-credentials.json

INSERT INTO ctn_m2m_credentials (
  party_id,
  zitadel_client_id,
  zitadel_project_id,
  zitadel_user_id,
  service_account_name,
  description,
  auth_provider,
  auth_issuer,
  assigned_scopes,
  created_by
) VALUES (
  -- Get party_id for your test party:
  (SELECT party_id FROM party_reference WHERE party_type = 'Terminal Operator' LIMIT 1),

  -- From zitadel-credentials.json:
  '987654321@123456789',  -- client_id
  '123456789',             -- project_id
  '987654321',             -- user_id
  'terminal-operator',
  'Terminal operator M2M authentication for testing',
  'zitadel',
  'http://localhost:8080',
  ARRAY['api.access', 'containers.read', 'eta.write'],

  -- System user as creator:
  (SELECT party_id FROM party_reference WHERE party_type = 'System' LIMIT 1)
);

-- Verify insertion
SELECT * FROM v_zitadel_m2m_active;
```

**Repeat** for each service account (terminal-operator, carrier, portal-integration, test-client).

### Step 4: Configure Azure Functions

**Purpose:** Tell Azure Functions where Zitadel is and how to validate tokens.

**Get values from `zitadel-credentials.json`:**
- `ZITADEL_PROJECT_ID` - Project ID (e.g., "123456789")
- `ZITADEL_API_CLIENT_ID` - API client ID (e.g., "123456789@project")

**For production (hosted Zitadel):**
```bash
az functionapp config appsettings set \
  --name func-ctn-demo-asr-dev \
  --resource-group ctn-demo \
  --settings \
    ZITADEL_ISSUER="https://zitadel.ctn-asr.com" \
    ZITADEL_PROJECT_ID="<project-id-from-json>" \
    ZITADEL_API_CLIENT_ID="<api-client-id-from-json>"
```

**For local development testing:**

Update `api/local.settings.json`:
```json
{
  "IsEncrypted": false,
  "Values": {
    "ZITADEL_ISSUER": "http://localhost:8080",
    "ZITADEL_PROJECT_ID": "<project-id-from-json>",
    "ZITADEL_API_CLIENT_ID": "<api-client-id-from-json>"
  }
}
```

### Step 5: Test M2M Authentication Flow

**Purpose:** Verify end-to-end authentication works.

**Test with example script:**
```bash
cd /Users/ramondenoronha/Dev/DIL/ASR-full

node examples/m2m-auth-flow.js test-client
```

**Expected output:**
```
======================================
Step 1: Requesting Access Token from Zitadel
======================================

✓ Access token received

Token Details:
  Token Type: Bearer
  Expires In: 3600 seconds
  Scope: openid profile email

JWT Claims:
  Issuer: http://localhost:8080
  Subject: 987654321
  Audience: ["123456789"]

======================================
Step 2: Calling CTN ASR API
======================================

✓ API responded with status: 200

======================================
Success! M2M Authentication Flow Complete
======================================
```

**Test with curl:**
```bash
# 1. Get access token
TOKEN=$(curl -s -X POST "http://localhost:8080/oauth/v2/token" \
  -u "<client-id>:<client-secret>" \
  -d "grant_type=client_credentials" \
  -d "scope=openid profile email urn:zitadel:iam:org:project:id:zitadel:aud" \
  | jq -r '.access_token')

echo "Token: $TOKEN"

# 2. Call API (local Azure Functions)
curl -X GET "http://localhost:7071/api/v1/health" \
  -H "Authorization: Bearer $TOKEN" \
  | jq '.'

# Expected: 200 OK
```

---

## 📊 Database Verification

Run these queries to verify setup:

```sql
-- Check tables exist
\dt ctn_m2m_credentials
\dt ctn_zitadel_secret_audit

-- Check indexes
\di idx_zitadel_m2m_*

-- View active credentials
SELECT * FROM v_zitadel_m2m_active;

-- Should return empty until you insert mappings in Step 3
```

---

## 🔒 Security Checklist

- [x] Actual secrets (.env.zitadel, zitadel-credentials.json) are in .gitignore
- [x] Strong passwords generated for admin and database
- [x] Master encryption key is 32+ characters
- [x] Database tables created with proper constraints
- [x] Indexes created for performance
- [x] Audit tables track secret lifecycle
- [ ] Service account credentials stored in Azure Key Vault (after setup)
- [ ] Zitadel deployed with HTTPS/TLS (for production)
- [ ] Regular secret rotation policy established
- [ ] Monitoring and alerting configured

---

## 📚 Documentation

- **Quick Start:** `ZITADEL_README.md`
- **Complete Guide:** `docs/ZITADEL_M2M_SETUP.md` (800+ lines)
- **API Integration:** `api/src/middleware/zitadel-auth.ts`
- **Example Code:** `examples/m2m-auth-flow.js`

---

## 🛠️ Troubleshooting

### Zitadel won't start
```bash
# Check Docker is running
docker ps

# Check port 8080 is available
lsof -i :8080

# Check logs
docker compose -f docker-compose.zitadel.yml logs zitadel
```

### Token validation fails
```bash
# Verify issuer matches
echo $TOKEN | cut -d'.' -f2 | base64 -d | jq '.iss'
# Should match: http://localhost:8080

# Check JWKS endpoint
curl http://localhost:8080/oauth/v2/keys | jq '.'
```

### Party not found error
```sql
-- Verify mapping exists
SELECT * FROM ctn_m2m_credentials
WHERE zitadel_client_id = '<client-id>';

-- If empty, insert mapping (see Step 3)
```

---

## ⏭️ Next Actions

1. **Immediate (5 minutes):**
   - [ ] Start Zitadel Docker containers
   - [ ] Run setup script
   - [ ] Save `zitadel-credentials.json` securely

2. **Short-term (15 minutes):**
   - [ ] Map service accounts to parties
   - [ ] Test M2M authentication flow
   - [ ] Verify API calls work with tokens

3. **Production Deployment (1-2 hours):**
   - [ ] Deploy Zitadel to production server
   - [ ] Configure HTTPS/TLS with Let's Encrypt
   - [ ] Update Azure Functions with production Zitadel URL
   - [ ] Store client secrets in Azure Key Vault
   - [ ] Set up monitoring and alerting

---

## 📞 Support

- **Zitadel Docs:** https://zitadel.com/docs
- **CTN ASR Docs:** `docs/ZITADEL_M2M_SETUP.md`
- **Issues:** File in project management system

---

**Setup Progress:** 60% Complete (3 of 5 steps)
**Last Updated:** November 6, 2025
