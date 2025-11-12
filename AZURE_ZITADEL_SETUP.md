# 🚀 Deploy Zitadel to Azure - Complete Guide

**Last Updated:** November 11, 2025
**Deployment Time:** 20-30 minutes
**Monthly Cost Estimate:** ~$50-75 USD

---

## 🎯 What You'll Deploy

- **Zitadel** on Azure Container Apps (managed containers)
- **PostgreSQL Flexible Server** for Zitadel data
- **Custom domain** with HTTPS (zitadel.ctn-asr.com)
- **Automatic scaling** (1-2 replicas)
- **Full M2M authentication** for CTN ASR API

---

## 📋 Prerequisites

- [ ] Azure subscription with contributor access
- [ ] Azure CLI installed
- [ ] Logged into Azure (`az login`)
- [ ] Domain name for Zitadel (e.g., zitadel.ctn-asr.com)
- [ ] DNS access to add CNAME record

---

## ⚡ Quick Start (One Command)

```bash
cd /Users/ramondenoronha/Dev/DIL/DEV-CTN-ASR

# Make script executable
chmod +x infrastructure/deploy-zitadel-azure.sh

# Run deployment
./infrastructure/deploy-zitadel-azure.sh
```

**The script will:**
1. ✅ Generate secure credentials
2. ✅ Create PostgreSQL Flexible Server (5-10 min)
3. ✅ Deploy Zitadel Container App (3-5 min)
4. ✅ Configure HTTPS and scaling
5. ✅ Save credentials to `.credentials` file

---

## 📊 What Gets Created

### Azure Resources:

| Resource | Type | Purpose | Cost/Month |
|----------|------|---------|------------|
| `ctn-zitadel` | Container App | Zitadel instance | ~$30 |
| `ctn-zitadel-env` | Container App Environment | Hosting environment | ~$5 |
| `psql-ctn-zitadel-dev` | PostgreSQL Flexible Server | Zitadel database | ~$20 |
| | | **Total** | **~$55** |

### Configuration:

- **CPU:** 1.0 vCPU
- **Memory:** 2.0 GB
- **Scaling:** 1-2 replicas (auto-scale)
- **Database:** Burstable tier (32 GB storage)
- **HTTPS:** Automatic with managed certificates

---

## 🔐 Generated Credentials

All saved to `.credentials` file:

```bash
# ZITADEL AZURE DEPLOYMENT
ZITADEL_AZURE_DB_PASSWORD=<generated-32-chars>
ZITADEL_AZURE_MASTER_KEY=<generated-48-chars>
ZITADEL_AZURE_ADMIN_PASSWORD=<generated-20-chars>
ZITADEL_AZURE_ADMIN_USERNAME=admin
ZITADEL_AZURE_URL=https://zitadel.ctn-asr.com
```

**⚠️ CRITICAL:** Backup `.credentials` file to secure location!

---

## 🎬 Step-by-Step Deployment

### STEP 0: Pre-Deployment Check

```bash
# Check Azure CLI
az --version

# Login to Azure
az login

# Verify subscription
az account show

# Set correct subscription if needed
az account set --subscription "Your Subscription Name"
```

---

### STEP 1: Configure Domain (Before Deployment)

**Option A: Use Azure-provided domain (for testing)**
- No DNS setup required
- URL: `https://ctn-zitadel.<random>.westeurope.azurecontainerapps.io`
- Skip to STEP 2

**Option B: Use custom domain (recommended for production)**

Edit `infrastructure/deploy-zitadel-azure.sh`:
```bash
DOMAIN_NAME="zitadel.ctn-asr.com"  # Change to your domain
```

Have DNS access ready for later step.

---

### STEP 2: Run Deployment Script

```bash
cd /Users/ramondenoronha/Dev/DIL/DEV-CTN-ASR
./infrastructure/deploy-zitadel-azure.sh
```

**Progress:**
```
    _
   /_\    _____   _ _ __ ___
  //_\\  |_  / | | | '__/ _ \
 /  _  \  / /| |_| | | |  __/
 \_/ \_/ /___|\__,_|_|  \___|

 Zitadel Deployment for Azure

ℹ️  This script will deploy Zitadel to Azure Container Apps
ℹ️  Estimated time: 15-20 minutes

Press ENTER to begin...
```

---

### STEP 3: Monitor Deployment

**PostgreSQL creation (5-10 min):**
```
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
STEP 2: Creating PostgreSQL Flexible Server
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

ℹ️  Creating PostgreSQL server: psql-ctn-zitadel-dev
ℹ️  This may take 5-10 minutes...

✅ PostgreSQL server created
✅ Database 'zitadel' created
```

**Container App deployment (3-5 min):**
```
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
STEP 4: Deploying Zitadel Container App
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

ℹ️  Deploying Zitadel container...
✅ Zitadel container deployed
ℹ️  Container FQDN: https://ctn-zitadel.<random>.westeurope.azurecontainerapps.io
```

---

### STEP 4: Configure Custom Domain (If Using)

**Add DNS CNAME record:**

| Type | Name | Value |
|------|------|-------|
| CNAME | zitadel | `ctn-zitadel.<random>.westeurope.azurecontainerapps.io` |

**Wait for DNS propagation (1-5 minutes):**
```bash
# Check DNS
nslookup zitadel.ctn-asr.com

# Should resolve to: ctn-zitadel.<random>.westeurope.azurecontainerapps.io
```

**Add custom domain to Container App:**
```bash
az containerapp hostname add \
  --name ctn-zitadel \
  --resource-group ctn-demo \
  --hostname zitadel.ctn-asr.com

# Bind managed TLS certificate
az containerapp hostname bind \
  --name ctn-zitadel \
  --resource-group ctn-demo \
  --hostname zitadel.ctn-asr.com \
  --environment ctn-zitadel-env \
  --validation-method CNAME
```

**Wait for certificate (1-2 minutes)**

---

### STEP 5: Verify Deployment

**Access Zitadel Console:**
- Temporary URL: `https://ctn-zitadel.<random>.westeurope.azurecontainerapps.io/ui/console`
- Custom domain: `https://zitadel.ctn-asr.com/ui/console`

**Login:**
- Username: `admin`
- Password: Check `.credentials` file → `ZITADEL_AZURE_ADMIN_PASSWORD`

**Expected:** Zitadel console loads successfully

---

### STEP 6: Create Service Accounts

**Run setup script against Azure instance:**

```bash
# Set Zitadel URL from Azure
export ZITADEL_URL="https://zitadel.ctn-asr.com"

# Or use temporary URL
export ZITADEL_URL="https://ctn-zitadel.<random>.westeurope.azurecontainerapps.io"

# Get admin password from .credentials
export ZITADEL_ADMIN_PASSWORD=$(grep ZITADEL_AZURE_ADMIN_PASSWORD .credentials | cut -d'=' -f2)

# Run setup script
./scripts/setup-zitadel-m2m.sh --azure
```

**Creates:**
- CTN ASR API project
- 4 service accounts
- Saves to `zitadel-credentials.json`

---

### STEP 7: Database Mapping

**Same as before, but using Azure Zitadel URL:**

```bash
# Connect to ASR database
psql -h psql-ctn-demo-asr-dev.postgres.database.azure.com \
     -p 5432 \
     -U asradmin \
     -d asr_dev
```

```sql
-- Get values from zitadel-credentials.json
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
  (SELECT party_id FROM party_reference WHERE party_type = 'Terminal Operator' LIMIT 1),
  'USER_ID@PROJECT_ID',
  'PROJECT_ID',
  'USER_ID',
  'terminal-operator',
  'Terminal operator M2M authentication',
  'zitadel',
  'https://zitadel.ctn-asr.com',  -- Azure URL
  ARRAY['api.access', 'containers.read', 'eta.write'],
  (SELECT party_id FROM party_reference WHERE party_type = 'System' LIMIT 1)
);

-- Repeat for all 4 service accounts
-- Verify
SELECT * FROM v_zitadel_m2m_active;
```

---

### STEP 8: Configure Azure Functions

```bash
# Get values from zitadel-credentials.json
PROJECT_ID=$(jq -r '.project_id' zitadel-credentials.json)
API_CLIENT_ID=$(jq -r '.api_client_id' zitadel-credentials.json)

# Update Azure Function App
az functionapp config appsettings set \
  --name func-ctn-demo-asr-dev \
  --resource-group ctn-demo \
  --settings \
    ZITADEL_ISSUER="https://zitadel.ctn-asr.com" \
    ZITADEL_PROJECT_ID="$PROJECT_ID" \
    ZITADEL_API_CLIENT_ID="$API_CLIENT_ID"
```

**Verify:**
```bash
az functionapp config appsettings list \
  --name func-ctn-demo-asr-dev \
  --resource-group ctn-demo \
  | grep ZITADEL
```

---

### STEP 9: Test M2M Authentication

```bash
# Get access token from Azure Zitadel
CLIENT_ID=$(jq -r '.service_accounts[0].client_id' zitadel-credentials.json)
CLIENT_SECRET=$(jq -r '.service_accounts[0].client_secret' zitadel-credentials.json)

TOKEN=$(curl -s -X POST "https://zitadel.ctn-asr.com/oauth/v2/token" \
  -u "$CLIENT_ID:$CLIENT_SECRET" \
  -d "grant_type=client_credentials" \
  -d "scope=openid profile email urn:zitadel:iam:org:project:id:zitadel:aud" \
  | jq -r '.access_token')

echo "Token: $TOKEN"

# Test API endpoint
curl -H "Authorization: Bearer $TOKEN" \
  "https://func-ctn-demo-asr-dev.azurewebsites.net/api/v1/containers/status?containerNumber=TEST001" \
  | jq '.'

# Expected: 200 OK with container data
```

---

## ✅ Success Criteria

You know it's working when:

- [ ] Zitadel console accessible at https://zitadel.ctn-asr.com
- [ ] Can login with admin credentials
- [ ] 4 service accounts created in `zitadel-credentials.json`
- [ ] Database has 4 mappings in `v_zitadel_m2m_active`
- [ ] Azure Functions environment variables set
- [ ] M2M test returns 200 OK

---

## 🔧 Management Commands

### View Logs:
```bash
az containerapp logs show \
  --name ctn-zitadel \
  --resource-group ctn-demo \
  --follow
```

### Restart Zitadel:
```bash
az containerapp revision restart \
  --name ctn-zitadel \
  --resource-group ctn-demo
```

### Scale Replicas:
```bash
az containerapp update \
  --name ctn-zitadel \
  --resource-group ctn-demo \
  --min-replicas 1 \
  --max-replicas 3
```

### View Container Status:
```bash
az containerapp show \
  --name ctn-zitadel \
  --resource-group ctn-demo \
  --query "properties.{status:provisioningState,replicas:template.scale,url:configuration.ingress.fqdn}"
```

### Database Connection:
```bash
psql "host=psql-ctn-zitadel-dev.postgres.database.azure.com port=5432 dbname=zitadel user=zitadeladmin sslmode=require"
# Password from .credentials: ZITADEL_AZURE_DB_PASSWORD
```

---

## 💰 Cost Optimization

### Development/Testing:
```bash
# Scale down when not in use
az containerapp update \
  --name ctn-zitadel \
  --resource-group ctn-demo \
  --min-replicas 0 \
  --max-replicas 1

# Use smaller database tier
az postgres flexible-server update \
  --name psql-ctn-zitadel-dev \
  --resource-group ctn-demo \
  --sku-name Standard_B1ms
```

### Production:
```bash
# Scale up for high availability
az containerapp update \
  --name ctn-zitadel \
  --resource-group ctn-demo \
  --min-replicas 2 \
  --max-replicas 5

# Upgrade database tier
az postgres flexible-server update \
  --name psql-ctn-zitadel-dev \
  --resource-group ctn-demo \
  --sku-name Standard_D2s_v3
```

---

## 🐛 Troubleshooting

### Container not starting:
```bash
# Check events
az containerapp revision list \
  --name ctn-zitadel \
  --resource-group ctn-demo

# View detailed logs
az containerapp logs show \
  --name ctn-zitadel \
  --resource-group ctn-demo \
  --tail 100
```

### Database connection errors:
```bash
# Check firewall rules
az postgres flexible-server firewall-rule list \
  --name psql-ctn-zitadel-dev \
  --resource-group ctn-demo

# Allow Azure services
az postgres flexible-server firewall-rule create \
  --name AllowAzureServices \
  --server-name psql-ctn-zitadel-dev \
  --resource-group ctn-demo \
  --start-ip-address 0.0.0.0 \
  --end-ip-address 0.0.0.0
```

### Certificate not binding:
```bash
# Check hostname status
az containerapp hostname list \
  --name ctn-zitadel \
  --resource-group ctn-demo

# Retry certificate binding
az containerapp hostname bind \
  --name ctn-zitadel \
  --resource-group ctn-demo \
  --hostname zitadel.ctn-asr.com \
  --environment ctn-zitadel-env \
  --validation-method CNAME
```

---

## 🔒 Security Best Practices

1. **Rotate credentials regularly:**
   ```bash
   # Change admin password in Zitadel console
   # Update ZITADEL_AZURE_ADMIN_PASSWORD in .credentials
   ```

2. **Use Azure Key Vault for secrets:**
   ```bash
   # Store master key
   az keyvault secret set \
     --vault-name ctn-asr-keyvault \
     --name ZitadelMasterKey \
     --value "$(grep ZITADEL_AZURE_MASTER_KEY .credentials | cut -d'=' -f2)"
   ```

3. **Enable database backups:**
   ```bash
   az postgres flexible-server backup create \
     --name psql-ctn-zitadel-dev \
     --resource-group ctn-demo
   ```

4. **Monitor access logs:**
   ```bash
   # Enable Application Insights
   az containerapp logs show \
     --name ctn-zitadel \
     --resource-group ctn-demo \
     --type system
   ```

---

## 📚 Next Steps

After successful deployment:

1. **Configure monitoring**
   - Set up Azure Monitor alerts
   - Configure log analytics

2. **Backup strategy**
   - Automate PostgreSQL backups
   - Export Zitadel configuration

3. **Disaster recovery**
   - Document restoration procedure
   - Test backup/restore process

4. **Distribute credentials**
   - Send client credentials to partners securely
   - Provide API documentation
   - Set up support channel

---

## 🆘 Need Help?

- **Azure Container Apps docs:** https://docs.microsoft.com/en-us/azure/container-apps/
- **Zitadel docs:** https://zitadel.com/docs
- **This project:** See `docs/ZITADEL_M2M_SETUP.md`

---

**Ready to deploy? Run:**

```bash
./infrastructure/deploy-zitadel-azure.sh
```
