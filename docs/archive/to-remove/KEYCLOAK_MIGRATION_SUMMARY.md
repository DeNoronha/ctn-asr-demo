# Keycloak Migration Summary

**Date:** November 13, 2025
**Status:** ✅ Ready for deployment (awaiting Cloud IAM instance details)

---

## 📦 Prepared Artifacts

All migration artifacts have been prepared while waiting for your Cloud IAM instance:

### 1. **Keycloak Middleware** ✅
- **File:** `api/src/middleware/keycloak-auth.ts`
- **Purpose:** JWT authentication for Cloud IAM Keycloak
- **Features:**
  - OAuth2.0 client credentials support
  - JWKS public key validation
  - Dual authentication (Entra ID + Keycloak)
  - Party ID resolution from database
  - Role-based access control
- **Compatible with:** Cloud IAM (France), any Keycloak provider

### 2. **Database Migration** ✅
- **File:** `database/migrations/026-rename-zitadel-to-generic-m2m.sql`
- **Purpose:** Rename Zitadel-specific columns to generic M2M naming
- **Changes:**
  - `zitadel_client_id` → `m2m_client_id`
  - `zitadel_project_id` → `m2m_realm_id`
  - `zitadel_user_id` → `m2m_user_id`
  - All indexes, constraints, views, and functions updated
- **Backward compatible:** Existing Zitadel records continue to work
- **Status:** Ready to execute

### 3. **Setup Guide** ✅
- **File:** `CLOUD_IAM_SETUP_GUIDE.md`
- **Content:**
  - Complete Cloud IAM setup (11 steps)
  - Service account creation
  - Database mapping examples
  - Azure Functions configuration
  - Testing procedures
  - Troubleshooting guide
- **Status:** Ready to follow

### 4. **Test Script** ✅
- **File:** `scripts/test-keycloak-m2m.sh`
- **Purpose:** End-to-end M2M authentication testing
- **Features:**
  - Token request (OAuth2.0 client credentials)
  - JWT decoding and validation
  - API health check
  - Authenticated endpoint test
  - Detailed troubleshooting output
- **Status:** Executable, ready to run

---

## 🔄 Migration Steps (When Ready)

Once your Cloud IAM instance is provisioned:

### Phase 1: Database Migration (5 minutes)

```bash
# Connect to database
psql "host=psql-ctn-demo-asr-dev.postgres.database.azure.com \
  port=5432 \
  dbname=asr_dev \
  user=asradmin \
  sslmode=require"

# Run migration
\i database/migrations/026-rename-zitadel-to-generic-m2m.sql
```

**Expected output:** `✓ Migration 026 completed successfully!`

---

### Phase 2: Cloud IAM Setup (20 minutes)

Follow: `CLOUD_IAM_SETUP_GUIDE.md`

**Key tasks:**
1. Login to Keycloak admin console
2. Create API client (`ctn-asr-api`)
3. Create service accounts (one per partner)
4. Create custom roles/scopes
5. Map service accounts to database parties

---

### Phase 3: Azure Functions Configuration (5 minutes)

```bash
# Set your Cloud IAM details
KEYCLOAK_ISSUER="https://YOUR-REALM.cloud-iam.com"
KEYCLOAK_REALM="YOUR-REALM-NAME"
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

---

### Phase 4: API Code Updates (10 minutes)

**Update imports in API functions:**

```typescript
// OLD (Zitadel)
import { authenticateZitadel } from '../middleware/zitadel-auth';

// NEW (Keycloak - dual auth)
import { authenticateDual } from '../middleware/keycloak-auth';
```

**Files to update:**
- Check functions that use M2M authentication
- Most likely: Functions in `api/src/functions/` that handle M2M requests
- Search for: `authenticateZitadel` → replace with `authenticateDual`

---

### Phase 5: Deploy & Test (10 minutes)

```bash
# Build and deploy
cd api
npm run build
func azure functionapp publish func-ctn-demo-asr-dev --typescript --build remote

# Test M2M authentication
./scripts/test-keycloak-m2m.sh <client_id> <client_secret>
```

**Expected:** All tests pass ✓

---

## 📋 Environment Variables

### Cloud IAM (New)

```bash
# Azure Functions Application Settings
KEYCLOAK_ISSUER=https://YOUR-REALM.cloud-iam.com
KEYCLOAK_REALM=YOUR-REALM-NAME
KEYCLOAK_CLIENT_ID=ctn-asr-api
```

### Entra ID (Unchanged)

```bash
# Member portal authentication (no changes)
AZURE_CLIENT_ID=<existing>
AZURE_TENANT_ID=<existing>
AZURE_CLIENT_SECRET=<existing>
```

### Local Development

Create `api/local.settings.json`:

```json
{
  "IsEncrypted": false,
  "Values": {
    "KEYCLOAK_ISSUER": "https://YOUR-REALM.cloud-iam.com",
    "KEYCLOAK_REALM": "YOUR-REALM-NAME",
    "KEYCLOAK_CLIENT_ID": "ctn-asr-api",
    "AZURE_CLIENT_ID": "<existing>",
    "AZURE_TENANT_ID": "<existing>"
  }
}
```

---

## 🔐 Credential Storage

Update `.credentials` file with Cloud IAM details:

```bash
# CLOUD IAM KEYCLOAK (FRANCE)
# ============================================
KEYCLOAK_ISSUER=https://YOUR-REALM.cloud-iam.com
KEYCLOAK_REALM=YOUR-REALM-NAME
KEYCLOAK_ADMIN_USERNAME=admin
KEYCLOAK_ADMIN_PASSWORD=<from-cloud-iam>
KEYCLOAK_API_CLIENT_ID=ctn-asr-api
KEYCLOAK_API_CLIENT_SECRET=<from-keycloak-credentials-tab>

# Service Account Credentials (share with partners)
TERMINAL_OPERATOR_ACME_CLIENT_ID=terminal-operator-acme
TERMINAL_OPERATOR_ACME_CLIENT_SECRET=<from-keycloak>

CARRIER_XYZ_CLIENT_ID=carrier-xyz
CARRIER_XYZ_CLIENT_SECRET=<from-keycloak>
```

---

## ✅ Verification Checklist

Before considering migration complete:

### Database
- [ ] Migration 026 executed successfully
- [ ] View `v_m2m_credentials_active` returns results
- [ ] Function `update_m2m_credentials_usage()` exists
- [ ] Index `idx_m2m_credentials_client_id` exists

### Cloud IAM
- [ ] Admin console accessible
- [ ] API client created (`ctn-asr-api`)
- [ ] Service accounts created with secrets
- [ ] Custom roles/scopes defined

### Azure Functions
- [ ] Environment variables set
- [ ] API deployed with Keycloak middleware
- [ ] Health endpoint returns 200
- [ ] Member portal still works (Entra ID)

### Testing
- [ ] Test script runs successfully
- [ ] Token request succeeds (200)
- [ ] Token claims valid (issuer, audience, roles)
- [ ] Authenticated API call succeeds (200)
- [ ] Database usage tracking works

---

## 📊 Comparison: Before vs After

| Aspect | Zitadel (Self-Hosted) | Cloud IAM Keycloak |
|--------|----------------------|-------------------|
| **Monthly Cost** | $55 (Azure infrastructure) | **€0** (free tier) |
| **Setup Time** | 30 minutes (deployment script) | **10 minutes** (web UI) |
| **Infrastructure** | Container Apps + PostgreSQL | **Zero** (fully managed) |
| **SSL/TLS** | Manual configuration | **Automatic** |
| **Backups** | Self-managed | **Automatic** |
| **Updates** | Self-managed | **Automatic** |
| **Support** | Community | **24/7 professional** |
| **Data Location** | Azure West Europe | **France** (GDPR) |
| **Scaling** | Manual replica configuration | **Automatic** |

---

## 🆘 Next Actions

### When Cloud IAM Instance is Ready:

1. **Share instance details:**
   - Instance URL (e.g., `https://ctn-asr-m2m.cloud-iam.com`)
   - Realm name
   - Admin credentials

2. **I will then:**
   - Update environment variable examples in this document
   - Walk you through Phase 1-5 deployment
   - Run tests to verify everything works
   - Help troubleshoot any issues

3. **Optional: API Code Review**
   - Identify which API functions use M2M authentication
   - Create a list of files to update
   - Batch update all imports

---

## 📚 Documentation Structure

```
DEV-CTN-ASR/
├── CLOUD_IAM_SETUP_GUIDE.md          # Complete setup guide (11 steps)
├── KEYCLOAK_MIGRATION_SUMMARY.md     # This file - migration overview
├── api/
│   └── src/
│       └── middleware/
│           ├── keycloak-auth.ts      # New Keycloak middleware ✅
│           └── zitadel-auth.ts       # Old (can keep for reference)
├── database/
│   └── migrations/
│       └── 026-rename-zitadel-to-generic-m2m.sql  # Migration script ✅
└── scripts/
    └── test-keycloak-m2m.sh          # M2M test script ✅
```

---

## 💡 Key Benefits

1. **Cost Savings:** $660/year → €0 (free tier)
2. **Zero Infrastructure:** No Container Apps, no PostgreSQL to manage
3. **EU Data Residency:** France-based, GDPR compliant
4. **Professional Support:** 24/7 Cloud IAM expert team
5. **Automatic Everything:** SSL, backups, updates, scaling
6. **Backward Compatible:** Existing Zitadel credentials still work during transition

---

## 🎯 Success Criteria

Migration is successful when:

✅ Cloud IAM Keycloak instance running
✅ Service accounts created and mapped to parties
✅ API authenticates M2M requests via Keycloak
✅ Member portal unchanged (Entra ID still works)
✅ Test script passes all checks
✅ Database tracks M2M usage
✅ Partners can obtain tokens and call API

---

**Status:** ✅ All artifacts ready
**Awaiting:** Cloud IAM instance details from you
**ETA:** 50 minutes total deployment time (once instance is ready)
