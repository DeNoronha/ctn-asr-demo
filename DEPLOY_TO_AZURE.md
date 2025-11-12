# 🚀 Deploy Zitadel to Azure - Quick Start

**Recommended Approach:** Deploy to Azure Container Apps instead of local Docker

---

## Why Azure Instead of Local?

| Feature | Local Docker | Azure Container Apps |
|---------|--------------|---------------------|
| **Accessibility** | Only from your machine | Available 24/7 from anywhere |
| **HTTPS/SSL** | Manual setup required | Automatic managed certificates |
| **Cost** | Free (uses your machine) | ~$55/month |
| **Production-ready** | No | Yes |
| **Scaling** | Manual | Automatic (1-5 replicas) |
| **Backups** | Manual | Automated |
| **Monitoring** | None | Azure Monitor built-in |
| **Partner access** | VPN required | Public internet |

**Verdict:** Use Azure for production M2M authentication ✅

---

## ⚡ One-Command Deploy

```bash
cd /Users/ramondenoronha/Dev/DIL/DEV-CTN-ASR
./infrastructure/deploy-zitadel-azure.sh
```

**That's it!** Script takes 15-20 minutes and creates everything.

---

## 📋 What You Need

- [ ] Azure subscription
- [ ] Azure CLI installed (`az --version`)
- [ ] Logged in (`az login`)
- [ ] Domain name (optional, can use Azure-provided domain)

---

## 🎬 Step-by-Step

### 1. Check Prerequisites

```bash
# Install Azure CLI if needed
brew install azure-cli

# Login to Azure
az login

# Verify
az account show
```

### 2. Run Deployment Script

```bash
cd /Users/ramondenoronha/Dev/DIL/DEV-CTN-ASR
./infrastructure/deploy-zitadel-azure.sh
```

### 3. Follow Prompts

The script will:
- Generate secure passwords
- Create PostgreSQL database (5-10 min)
- Deploy Zitadel container (3-5 min)
- Give you the URL

### 4. Access Zitadel

You'll get a URL like:
```
https://ctn-zitadel.<random>.westeurope.azurecontainerapps.io
```

**Login:**
- Username: `admin`
- Password: Check `.credentials` file

### 5. Run M2M Setup

```bash
# Set the Azure Zitadel URL
export ZITADEL_URL="https://ctn-zitadel.<your-url>.azurecontainerapps.io"

# Get admin password from .credentials
export ZITADEL_ADMIN_PASSWORD=$(grep ZITADEL_AZURE_ADMIN_PASSWORD .credentials | cut -d'=' -f2)

# Run setup script
./scripts/setup-zitadel-m2m.sh --azure
```

This creates 4 service accounts and saves to `zitadel-credentials.json`

### 6. Map to Database

```bash
# Connect to ASR database
psql -h psql-ctn-demo-asr-dev.postgres.database.azure.com -p 5432 -U asradmin -d asr_dev
```

```sql
-- Use values from zitadel-credentials.json
INSERT INTO ctn_m2m_credentials (
  party_id,
  zitadel_client_id,
  zitadel_project_id,
  zitadel_user_id,
  service_account_name,
  auth_provider,
  auth_issuer,
  assigned_scopes,
  created_by
) VALUES (
  (SELECT party_id FROM party_reference WHERE party_type = 'Terminal Operator' LIMIT 1),
  'USER_ID@PROJECT_ID',  -- From zitadel-credentials.json
  'PROJECT_ID',
  'USER_ID',
  'terminal-operator',
  'zitadel',
  'https://ctn-zitadel.<your-url>.azurecontainerapps.io',  -- Your Azure URL
  ARRAY['api.access', 'containers.read', 'eta.write'],
  (SELECT party_id FROM party_reference WHERE party_type = 'System' LIMIT 1)
);

-- Repeat for all 4 accounts
-- Verify
SELECT * FROM v_zitadel_m2m_active;
```

### 7. Configure Azure Functions

```bash
# Get values from zitadel-credentials.json
PROJECT_ID=$(jq -r '.project_id' zitadel-credentials.json)
API_CLIENT_ID=$(jq -r '.api_client_id' zitadel-credentials.json)
ZITADEL_URL="https://ctn-zitadel.<your-url>.azurecontainerapps.io"

# Update Function App
az functionapp config appsettings set \
  --name func-ctn-demo-asr-dev \
  --resource-group ctn-demo \
  --settings \
    ZITADEL_ISSUER="$ZITADEL_URL" \
    ZITADEL_PROJECT_ID="$PROJECT_ID" \
    ZITADEL_API_CLIENT_ID="$API_CLIENT_ID"
```

### 8. Test M2M Flow

```bash
# Get credentials
CLIENT_ID=$(jq -r '.service_accounts[0].client_id' zitadel-credentials.json)
CLIENT_SECRET=$(jq -r '.service_accounts[0].client_secret' zitadel-credentials.json)
ZITADEL_URL="https://ctn-zitadel.<your-url>.azurecontainerapps.io"

# Get token
TOKEN=$(curl -s -X POST "$ZITADEL_URL/oauth/v2/token" \
  -u "$CLIENT_ID:$CLIENT_SECRET" \
  -d "grant_type=client_credentials" \
  -d "scope=openid profile email urn:zitadel:iam:org:project:id:zitadel:aud" \
  | jq -r '.access_token')

# Test API
curl -H "Authorization: Bearer $TOKEN" \
  "https://func-ctn-demo-asr-dev.azurewebsites.net/api/v1/containers/status?containerNumber=TEST001"

# Expected: 200 OK
```

---

## ✅ Success Checklist

- [ ] Azure deployment script completed
- [ ] Can access Zitadel console at Azure URL
- [ ] 4 service accounts created
- [ ] Database mappings inserted
- [ ] Azure Functions configured
- [ ] M2M test returns 200 OK

---

## 💰 Cost Breakdown

**Monthly estimates:**
- Container App: ~$30
- Container Environment: ~$5
- PostgreSQL Flexible Server (Burstable): ~$20
- **Total: ~$55/month**

**Can scale to $0 when not in use** (set min replicas to 0)

---

## 🔧 Useful Commands

**View logs:**
```bash
az containerapp logs show \
  --name ctn-zitadel \
  --resource-group ctn-demo \
  --follow
```

**Restart:**
```bash
az containerapp revision restart \
  --name ctn-zitadel \
  --resource-group ctn-demo
```

**Check status:**
```bash
az containerapp show \
  --name ctn-zitadel \
  --resource-group ctn-demo \
  --query "properties.{status:provisioningState,url:configuration.ingress.fqdn}"
```

---

## 🐛 Troubleshooting

### "az command not found"
```bash
brew install azure-cli
```

### "Not logged in"
```bash
az login
```

### "Container not starting"
```bash
# Check logs
az containerapp logs show \
  --name ctn-zitadel \
  --resource-group ctn-demo \
  --tail 100
```

### "Database connection failed"
```bash
# Allow Azure services
az postgres flexible-server firewall-rule create \
  --name AllowAzureServices \
  --server-name psql-ctn-zitadel-dev \
  --resource-group ctn-demo \
  --start-ip-address 0.0.0.0 \
  --end-ip-address 0.0.0.0
```

---

## 📚 Detailed Guides

- **Complete guide:** `AZURE_ZITADEL_SETUP.md`
- **Local Docker (alternative):** `ZITADEL_QUICKSTART.md`
- **M2M setup details:** `docs/ZITADEL_M2M_SETUP.md`

---

## 🚀 Ready to Deploy?

**Run this command now:**

```bash
cd /Users/ramondenoronha/Dev/DIL/DEV-CTN-ASR && ./infrastructure/deploy-zitadel-azure.sh
```

Script will guide you through the entire process! ⚡

---

**Questions?** See `AZURE_ZITADEL_SETUP.md` for detailed documentation.
