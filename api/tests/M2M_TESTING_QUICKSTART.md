# M2M Authentication - Testing Quick Start

**Quick reference for testing M2M authentication after deployment**

---

## Prerequisites

```bash
# Verify tools installed
command -v curl >/dev/null 2>&1 || echo "Install curl"
command -v jq >/dev/null 2>&1 || echo "Install jq: brew install jq"
command -v az >/dev/null 2>&1 || echo "Install Azure CLI"

# Login to Azure
az login
```

---

## Step 1: Deploy Feature (If Not Already Deployed)

### Check if deployed
```bash
./api/tests/m2m-endpoints-smoke-test.sh
```

**If all tests pass (5/5):** Skip to Step 2
**If all tests fail (0/5):** Continue with deployment

### Deploy the feature

```bash
# 1. Add import to essential-index.ts (if not present)
grep -q "ManageM2MClients" api/src/essential-index.ts || \
  echo "import './functions/ManageM2MClients';" >> api/src/essential-index.ts

# 2. Build and deploy
cd api
func azure functionapp publish func-ctn-demo-asr-dev --typescript --build remote

# 3. Wait for deployment
echo "Waiting 2 minutes for deployment..."
sleep 120

# 4. Verify deployment
cd ../
./api/tests/m2m-endpoints-smoke-test.sh
```

**Expected output:**
```
Total Tests:  5
Passed:       5
Failed:       0

✅ ALL ENDPOINTS REGISTERED AND PROTECTED!
```

---

## Step 2: Verify Database Schema

```bash
export PGPASSWORD='<your-db-password>'

psql -h psql-ctn-demo-asr-dev.postgres.database.azure.com \
     -p 5432 -U asradmin asr_dev \
     -f /tmp/check_m2m_schema.sql
```

**Expected output:**
```
          table_name
------------------------------
 m2m_client_secrets_audit
 m2m_clients
(2 rows)
```

**If tables don't exist, run migration:**
```bash
psql -h psql-ctn-demo-asr-dev.postgres.database.azure.com \
     -p 5432 -U asradmin asr_dev \
     -f database/migrations/012-create-m2m-clients.sql
```

---

## Step 3: Run API Tests

### Get authentication token
```bash
export AUTH_TOKEN=$(az account get-access-token \
  --resource "api://d3037c11-a541-4f21-8862-8079137a0cde" \
  --query accessToken -o tsv)

# Verify token
echo "Token length: ${#AUTH_TOKEN} chars"
# Should be ~1500-2000 characters
```

### Run comprehensive CRUD tests
```bash
./api/tests/m2m-clients-crud-test.sh
```

**Expected output:**
```
Total Tests:  25+
Passed:       25+
Failed:       0

✅ ALL TESTS PASSED!
```

---

## Step 4: Run UI Tests (Playwright)

**Note:** UI tests not created yet. After deployment, create:

```bash
cd admin-portal
npx playwright test e2e/m2m-clients.spec.ts --headed
```

---

## Step 5: Manual Integration Test

### Create M2M client via API
```bash
LEGAL_ENTITY_ID="<your-legal-entity-id>"

curl -X POST \
  "https://func-ctn-demo-asr-dev.azurewebsites.net/api/v1/legal-entities/$LEGAL_ENTITY_ID/m2m-clients" \
  -H "Authorization: Bearer $AUTH_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "client_name": "Integration Test Client",
    "description": "Testing OAuth flow",
    "assigned_scopes": ["ETA.Read", "Container.Read"]
  }' | jq '.'
```

**Save the response:**
```json
{
  "m2m_client_id": "...",
  "azure_client_id": "...",
  "client_name": "Integration Test Client",
  "assigned_scopes": ["ETA.Read", "Container.Read"]
}
```

### Generate secret
```bash
M2M_CLIENT_ID="<from-previous-response>"

curl -X POST \
  "https://func-ctn-demo-asr-dev.azurewebsites.net/api/v1/m2m-clients/$M2M_CLIENT_ID/generate-secret" \
  -H "Authorization: Bearer $AUTH_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"expires_in_days": 365}' | jq '.'
```

**Save the secret:**
```json
{
  "secret": "SAVE_THIS_IMMEDIATELY",
  "client_id": "...",
  "expires_at": "2026-10-26T...",
  "warning": "Save this secret immediately. It will not be shown again."
}
```

### Test OAuth flow (Future - requires Azure AD setup)
```bash
CLIENT_ID="<azure_client_id>"
CLIENT_SECRET="<secret>"
TENANT_ID="598664e7-725c-4daa-bd1f-89c4ada717ff"
API_APP_ID="d3037c11-a541-4f21-8862-8079137a0cde"

# Get access token
curl -X POST \
  "https://login.microsoftonline.com/$TENANT_ID/oauth2/v2.0/token" \
  -H "Content-Type: application/x-www-form-urlencoded" \
  -d "client_id=$CLIENT_ID&client_secret=$CLIENT_SECRET&scope=api://$API_APP_ID/.default&grant_type=client_credentials"
```

---

## Troubleshooting

### Endpoints return 404
```bash
# Check if ManageM2MClients is imported
grep "ManageM2MClients" api/src/essential-index.ts

# If missing, add it and redeploy
echo "import './functions/ManageM2MClients';" >> api/src/essential-index.ts
cd api && func azure functionapp publish func-ctn-demo-asr-dev --typescript --build remote
```

### Endpoints return 401
```bash
# Refresh auth token
export AUTH_TOKEN=$(az account get-access-token \
  --resource "api://d3037c11-a541-4f21-8862-8079137a0cde" \
  --query accessToken -o tsv)

# Verify token is fresh
echo $AUTH_TOKEN | cut -d'.' -f2 | base64 -d 2>/dev/null | jq '.exp'
```

### Tests fail with database errors
```bash
# Check if tables exist
export PGPASSWORD='<your-db-password>'
psql -h psql-ctn-demo-asr-dev.postgres.database.azure.com \
     -p 5432 -U asradmin asr_dev \
     -c "\dt m2m*"

# If no tables, run migration
psql -h psql-ctn-demo-asr-dev.postgres.database.azure.com \
     -p 5432 -U asradmin asr_dev \
     -f database/migrations/012-create-m2m-clients.sql
```

### Azure CLI not authenticated
```bash
az login
az account show
```

---

## Quick Commands Reference

```bash
# Smoke test (no auth needed)
./api/tests/m2m-endpoints-smoke-test.sh

# Full CRUD test (requires auth)
export AUTH_TOKEN=$(az account get-access-token --resource "api://d3037c11-a541-4f21-8862-8079137a0cde" --query accessToken -o tsv)
./api/tests/m2m-clients-crud-test.sh

# Deploy API
cd api && func azure functionapp publish func-ctn-demo-asr-dev --typescript --build remote

# Check function app logs
func azure functionapp logstream func-ctn-demo-asr-dev --timeout 20

# List all functions
func azure functionapp list-functions func-ctn-demo-asr-dev | grep -i m2m
```

---

## Test Results Interpretation

### Smoke Test
- **5/5 pass:** Endpoints deployed and protected ✅
- **0/5 pass:** Endpoints not registered ❌ → Add import and redeploy
- **Some pass:** Partial deployment ⚠️ → Check logs

### CRUD Test
- **All pass:** Feature working correctly ✅
- **Auth failures:** Token expired or invalid ⚠️
- **404 errors:** Endpoints not deployed ❌
- **500 errors:** Database or code errors 🔴 → Check logs

---

**Last Updated:** October 26, 2025
**Branch:** feature/m2m-authentication
