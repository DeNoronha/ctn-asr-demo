# 🔐 Secret Rotation Guide

**Last Updated:** October 13, 2025
**Security Status:** 🚨 CRITICAL - Exposed credentials require immediate rotation

---

## ⚠️ Security Incident Summary

**Date Discovered:** October 13, 2025
**Incident:** PostgreSQL database password exposed in Git history

### Exposed Credentials:
1. **PostgreSQL Password**: Exposed in 4 documentation files across 5 Git commits
   - database/migrations/DEPLOYMENT_INSTRUCTIONS.md
   - docs/CLAUDE.md
   - docs/DEPLOYMENT_GUIDE.md
   - docs/TESTING_GUIDE.md

### Immediate Actions Taken:
✅ Removed password from all documentation files (replaced with placeholders)
✅ Added `local.settings.json` to `.gitignore`
✅ Added `.claude/settings.local.json` to `.gitignore`
✅ Removed 'demo-secret' JWT fallback
✅ Added startup validation for required secrets

### Actions Required:
🔴 **URGENT**: Rotate PostgreSQL password
🔴 **URGENT**: Clean Git history to remove exposed credentials
🔴 **HIGH**: Move all secrets to Azure Key Vault
🔴 **HIGH**: Generate strong JWT secret
🔴 **MEDIUM**: Audit access logs for unauthorized database access

---

## 📋 Complete Secret Rotation Checklist

### 1. Rotate PostgreSQL Database Password

**Estimated Time:** 15-20 minutes
**Downtime:** 2-5 minutes (API restart required)

#### Step 1.1: Generate New Strong Password
```bash
# Generate a cryptographically secure password (32 characters)
openssl rand -base64 32 | tr -dc 'A-Za-z0-9!@#$%^&*()_+-=' | head -c 32
```

**Password Requirements:**
- Minimum 16 characters (32 recommended)
- Mix of uppercase, lowercase, numbers, special characters
- No dictionary words
- No previously used passwords

#### Step 1.2: Update Password in Azure

```bash
# Set variables
RESOURCE_GROUP="rg-ctn-demo-asr-dev"
SERVER_NAME="psql-ctn-demo-asr-dev"
ADMIN_USER="asradmin"
NEW_PASSWORD="<YOUR_NEW_PASSWORD>"  # From Step 1.1

# Update PostgreSQL admin password
az postgres flexible-server update \
  --resource-group $RESOURCE_GROUP \
  --name $SERVER_NAME \
  --admin-password "$NEW_PASSWORD"

echo "✅ PostgreSQL password updated successfully"
```

#### Step 1.3: Update Azure Function App Settings

```bash
# Update Function App environment variable
az functionapp config appsettings set \
  --name func-ctn-demo-asr-dev \
  --resource-group $RESOURCE_GROUP \
  --settings POSTGRES_PASSWORD="$NEW_PASSWORD"

echo "✅ Function App settings updated"
```

#### Step 1.4: Update Local Settings

**IMPORTANT:** Do NOT commit this file to Git!

```bash
# Edit api/local.settings.json manually or use this command:
cat > api/local.settings.json <<EOF
{
  "IsEncrypted": false,
  "Values": {
    "FUNCTIONS_WORKER_RUNTIME": "node",
    "AzureWebJobsStorage": "<connection_string>",
    "AZURE_STORAGE_CONNECTION_STRING": "<connection_string>",
    "POSTGRES_HOST": "psql-ctn-demo-asr-dev.postgres.database.azure.com",
    "POSTGRES_PORT": "5432",
    "POSTGRES_DATABASE": "asr_dev",
    "POSTGRES_USER": "asradmin",
    "POSTGRES_PASSWORD": "$NEW_PASSWORD"
  }
}
EOF

echo "✅ Local settings updated"
```

#### Step 1.5: Verify Connection

```bash
# Test database connection with new password
PGPASSWORD="$NEW_PASSWORD" psql \
  "host=psql-ctn-demo-asr-dev.postgres.database.azure.com port=5432 dbname=asr_dev user=asradmin sslmode=require" \
  -c "SELECT version();"

# Expected output: PostgreSQL version information
```

#### Step 1.6: Restart Function App

```bash
# Restart to apply new settings
az functionapp restart \
  --name func-ctn-demo-asr-dev \
  --resource-group $RESOURCE_GROUP

echo "✅ Function App restarted - password rotation complete"
```

---

### 2. Generate and Configure JWT Secret

**Estimated Time:** 10 minutes
**Downtime:** 2-5 minutes (API restart required)

#### Step 2.1: Generate Strong JWT Secret

```bash
# Generate 256-bit (32 byte) secret for HS256
openssl rand -hex 32

# Example output: a1b2c3d4e5f6...
```

**JWT Secret Requirements:**
- Minimum 32 characters (64 hex characters recommended)
- Cryptographically secure random generation
- Never reuse across environments (dev/staging/prod)

#### Step 2.2: Configure in Azure Function App

```bash
JWT_SECRET="<YOUR_GENERATED_SECRET>"  # From Step 2.1

az functionapp config appsettings set \
  --name func-ctn-demo-asr-dev \
  --resource-group rg-ctn-demo-asr-dev \
  --settings JWT_SECRET="$JWT_SECRET" JWT_ISSUER="https://api.ctn.nl"

echo "✅ JWT secret configured"
```

#### Step 2.3: Update Local Settings

```bash
# Add JWT_SECRET to api/local.settings.json
# (Edit manually or use jq)
```

#### Step 2.4: Restart and Verify

```bash
# Restart Function App
az functionapp restart \
  --name func-ctn-demo-asr-dev \
  --resource-group rg-ctn-demo-asr-dev

# Verify startup validation passes
az functionapp log tail \
  --name func-ctn-demo-asr-dev \
  --resource-group rg-ctn-demo-asr-dev

# Look for: "✅ Startup validation passed - all required secrets configured"
```

---

### 3. Rotate Storage Account Keys

**Estimated Time:** 15 minutes
**Downtime:** 2-5 minutes

#### Step 3.1: Rotate Key in Azure

```bash
STORAGE_ACCOUNT="stctndemoasrdev"

# Rotate key2 (while key1 is still active)
az storage account keys renew \
  --account-name $STORAGE_ACCOUNT \
  --resource-group rg-ctn-demo-asr-dev \
  --key key2

echo "✅ Storage key2 rotated"
```

#### Step 3.2: Update Connection Strings

```bash
# Get new connection string
NEW_STORAGE_CONN=$(az storage account show-connection-string \
  --name $STORAGE_ACCOUNT \
  --resource-group rg-ctn-demo-asr-dev \
  --query connectionString -o tsv)

# Update Function App
az functionapp config appsettings set \
  --name func-ctn-demo-asr-dev \
  --resource-group rg-ctn-demo-asr-dev \
  --settings \
    "AzureWebJobsStorage=$NEW_STORAGE_CONN" \
    "AZURE_STORAGE_CONNECTION_STRING=$NEW_STORAGE_CONN"

echo "✅ Storage connection string updated"
```

#### Step 3.3: Restart and Verify

```bash
# Restart Function App
az functionapp restart \
  --name func-ctn-demo-asr-dev \
  --resource-group rg-ctn-demo-asr-dev

# Verify KvK document upload still works
curl -X POST "https://func-ctn-demo-asr-dev.azurewebsites.net/api/v1/test-storage" \
  -H "Authorization: Bearer <token>"

# Expected: 200 OK
```

#### Step 3.4: Rotate Key1 (After Verification)

```bash
# Now safe to rotate key1
az storage account keys renew \
  --account-name $STORAGE_ACCOUNT \
  --resource-group rg-ctn-demo-asr-dev \
  --key key1

echo "✅ Both storage keys rotated successfully"
```

---

### 4. Rotate Event Grid Access Key

**Estimated Time:** 10 minutes
**Downtime:** None (Event Grid supports dual keys)

#### Step 4.1: Get Current Keys

```bash
EVENT_GRID_TOPIC="evgt-ctn-asr-dev"

# List current keys
az eventgrid topic key list \
  --name $EVENT_GRID_TOPIC \
  --resource-group rg-ctn-demo-asr-dev
```

#### Step 4.2: Regenerate Key2

```bash
# Regenerate key2 first
az eventgrid topic key regenerate \
  --name $EVENT_GRID_TOPIC \
  --resource-group rg-ctn-demo-asr-dev \
  --key-name key2

# Get new key2
NEW_KEY=$(az eventgrid topic key list \
  --name $EVENT_GRID_TOPIC \
  --resource-group rg-ctn-demo-asr-dev \
  --query key2 -o tsv)

echo "✅ Event Grid key2 regenerated"
```

#### Step 4.3: Update Function App

```bash
az functionapp config appsettings set \
  --name func-ctn-demo-asr-dev \
  --resource-group rg-ctn-demo-asr-dev \
  --settings EVENT_GRID_ACCESS_KEY="$NEW_KEY"

# Restart
az functionapp restart \
  --name func-ctn-demo-asr-dev \
  --resource-group rg-ctn-demo-asr-dev

echo "✅ Event Grid access key updated"
```

---

### 5. Clean Git History (Remove Exposed Credentials)

**⚠️ WARNING:** This rewrites Git history and requires force push!

**Estimated Time:** 30-45 minutes
**Risk Level:** HIGH - Coordinate with all team members

#### Step 5.1: Install git-filter-repo

```bash
# macOS
brew install git-filter-repo

# Verify installation
git-filter-repo --version
```

#### Step 5.2: Backup Current Repository

```bash
# Create backup
cd /Users/ramondenoronha/Dev/DIL
cp -r ASR-full ASR-full-backup-$(date +%Y%m%d)

cd ASR-full
```

#### Step 5.3: Remove Password from History

```bash
# Remove specific password string from all files in history
git filter-repo --replace-text <(echo '[REDACTED]==><PASSWORD_REMOVED>')

# This will:
# - Rewrite all commits containing the password
# - Replace with placeholder text
# - Update all refs and tags
```

#### Step 5.4: Verify Cleanup

```bash
# Search entire history for password
git log --all --full-history -S "[REDACTED]" --oneline

# Expected: No results (empty output)
```

#### Step 5.5: Force Push (⚠️ DANGEROUS)

**IMPORTANT:** Notify all team members before force pushing!

```bash
# Verify remote
git remote -v

# Force push to rewrite history
git push --force --all origin
git push --force --tags origin

echo "✅ Git history cleaned - password removed"
```

#### Step 5.6: Team Coordination

**Send this message to all team members:**

```
🚨 IMPORTANT: Git History Rewrite

The ASR repository history has been rewritten to remove exposed credentials.

REQUIRED ACTIONS:
1. Backup any uncommitted work
2. Delete your local repository
3. Clone fresh copy: git clone <repo-url>
4. Re-apply any local changes from backup

DO NOT:
- Pull or merge from old repository
- Push from old repository

Timeline: Complete by <DATE>
Contact: <YOUR_EMAIL>
```

---

### 6. Audit Access Logs

**Estimated Time:** 30-60 minutes

#### Step 6.1: Check Database Access Logs

```bash
# Query PostgreSQL audit logs (if enabled)
az postgres flexible-server logs list \
  --resource-group rg-ctn-demo-asr-dev \
  --server-name psql-ctn-demo-asr-dev \
  --file-name postgresql-*.log \
  --query "[?contains(name, 'connection') || contains(name, 'authentication')]"

# Download and review logs
az postgres flexible-server logs download \
  --resource-group rg-ctn-demo-asr-dev \
  --server-name psql-ctn-demo-asr-dev \
  --name <log-file-name>
```

#### Step 6.2: Check Application Insights

```bash
# Query failed authentication attempts
az monitor app-insights query \
  --app func-ctn-demo-asr-dev \
  --analytics-query "
    traces
    | where message contains 'authentication' or message contains 'unauthorized'
    | where timestamp > ago(30d)
    | project timestamp, message, severityLevel
    | order by timestamp desc
  "
```

#### Step 6.3: Review Audit Log Table

```bash
# Connect to database
PGPASSWORD="<NEW_PASSWORD>" psql \
  "host=psql-ctn-demo-asr-dev.postgres.database.azure.com port=5432 dbname=asr_dev user=asradmin sslmode=require"

# Query suspicious activity
SELECT
  event_type,
  severity,
  user_email,
  ip_address,
  request_path,
  created_at
FROM audit_log
WHERE severity IN ('WARNING', 'ERROR')
  AND created_at > NOW() - INTERVAL '30 days'
  AND (
    event_type LIKE '%denied%' OR
    event_type LIKE '%failed%' OR
    event_type LIKE '%unauthorized%'
  )
ORDER BY created_at DESC
LIMIT 100;
```

#### Step 6.4: Document Findings

Create incident report if unauthorized access detected:
- **docs/SECURITY_INCIDENT_REPORT.md**
- Include: timeline, affected data, remediation steps
- Notify: stakeholders, compliance team, affected users (if required by GDPR)

---

## 🔐 Move Secrets to Azure Key Vault

**Best Practice:** Store all secrets in Azure Key Vault instead of environment variables

### Step 1: Create Azure Key Vault

```bash
KEY_VAULT_NAME="kv-ctn-asr-dev"

az keyvault create \
  --name $KEY_VAULT_NAME \
  --resource-group rg-ctn-demo-asr-dev \
  --location westeurope \
  --enabled-for-deployment true \
  --enabled-for-template-deployment true

echo "✅ Key Vault created"
```

### Step 2: Enable Managed Identity for Function App

```bash
# Enable system-assigned managed identity
az functionapp identity assign \
  --name func-ctn-demo-asr-dev \
  --resource-group rg-ctn-demo-asr-dev

# Get principal ID
PRINCIPAL_ID=$(az functionapp identity show \
  --name func-ctn-demo-asr-dev \
  --resource-group rg-ctn-demo-asr-dev \
  --query principalId -o tsv)

echo "Principal ID: $PRINCIPAL_ID"
```

### Step 3: Grant Key Vault Access

```bash
# Grant Function App access to secrets
az keyvault set-policy \
  --name $KEY_VAULT_NAME \
  --object-id $PRINCIPAL_ID \
  --secret-permissions get list

echo "✅ Access granted to Function App"
```

### Step 4: Store Secrets in Key Vault

```bash
# Store PostgreSQL password
az keyvault secret set \
  --vault-name $KEY_VAULT_NAME \
  --name "POSTGRES-PASSWORD" \
  --value "$NEW_PASSWORD"

# Store JWT secret
az keyvault secret set \
  --vault-name $KEY_VAULT_NAME \
  --name "JWT-SECRET" \
  --value "$JWT_SECRET"

# Store storage connection string
az keyvault secret set \
  --vault-name $KEY_VAULT_NAME \
  --name "AZURE-STORAGE-CONNECTION-STRING" \
  --value "$NEW_STORAGE_CONN"

# Store Event Grid key
az keyvault secret set \
  --vault-name $KEY_VAULT_NAME \
  --name "EVENT-GRID-ACCESS-KEY" \
  --value "$NEW_KEY"

echo "✅ All secrets stored in Key Vault"
```

### Step 5: Reference Secrets from Function App

```bash
# Update Function App to reference Key Vault
az functionapp config appsettings set \
  --name func-ctn-demo-asr-dev \
  --resource-group rg-ctn-demo-asr-dev \
  --settings \
    "POSTGRES_PASSWORD=@Microsoft.KeyVault(SecretUri=https://$KEY_VAULT_NAME.vault.azure.net/secrets/POSTGRES-PASSWORD/)" \
    "JWT_SECRET=@Microsoft.KeyVault(SecretUri=https://$KEY_VAULT_NAME.vault.azure.net/secrets/JWT-SECRET/)" \
    "AZURE_STORAGE_CONNECTION_STRING=@Microsoft.KeyVault(SecretUri=https://$KEY_VAULT_NAME.vault.azure.net/secrets/AZURE-STORAGE-CONNECTION-STRING/)" \
    "EVENT_GRID_ACCESS_KEY=@Microsoft.KeyVault(SecretUri=https://$KEY_VAULT_NAME.vault.azure.net/secrets/EVENT-GRID-ACCESS-KEY/)"

echo "✅ Function App configured to use Key Vault"
```

### Step 6: Restart and Verify

```bash
# Restart Function App
az functionapp restart \
  --name func-ctn-demo-asr-dev \
  --resource-group rg-ctn-demo-asr-dev

# Verify startup validation passes
az functionapp log tail \
  --name func-ctn-demo-asr-dev \
  --resource-group rg-ctn-demo-asr-dev

# Look for: "✅ Startup validation passed"
```

---

## 📅 Secret Rotation Schedule

### Mandatory Rotation Schedule

| Secret Type | Rotation Frequency | Next Rotation Date |
|-------------|-------------------|-------------------|
| PostgreSQL Password | Every 90 days | ___ / ___ / 20___ |
| JWT Secret | Every 180 days | ___ / ___ / 20___ |
| Storage Account Keys | Every 90 days | ___ / ___ / 20___ |
| Event Grid Keys | Every 90 days | ___ / ___ / 20___ |
| Azure AD Client Secret | Every 180 days | ___ / ___ / 20___ |
| Communication Services Key | Every 90 days | ___ / ___ / 20___ |
| Document Intelligence Key | Every 90 days | ___ / ___ / 20___ |

### Trigger Immediate Rotation If:
- ✅ Secret exposed in Git history
- ✅ Secret exposed in logs or monitoring
- ✅ Unauthorized access detected
- ✅ Team member with access leaves organization
- ✅ Security vulnerability disclosed
- ✅ Compliance requirement (e.g., security audit)

---

## ✅ Post-Rotation Verification

### Checklist:

- [ ] All API endpoints responding (200 OK)
- [ ] Database connections working
- [ ] File uploads working (KvK documents)
- [ ] Email notifications sending
- [ ] Event Grid receiving events
- [ ] Audit logs recording events
- [ ] No errors in Application Insights
- [ ] Startup validation passing
- [ ] All team members notified (if Git history rewritten)
- [ ] Incident report filed (if unauthorized access detected)

### Smoke Test Script:

```bash
# Test all critical endpoints
BASE_URL="https://func-ctn-demo-asr-dev.azurewebsites.net/api"
TOKEN="<your-test-token>"

# Test database read
curl -s -o /dev/null -w "%{http_code}\n" \
  "$BASE_URL/v1/legal-entities" \
  -H "Authorization: Bearer $TOKEN"

# Expected: 200

# Test file upload
curl -s -o /dev/null -w "%{http_code}\n" \
  "$BASE_URL/v1/legal-entities/{id}/kvk-verification" \
  -X POST -F "file=@test.pdf" \
  -H "Authorization: Bearer $TOKEN"

# Expected: 200 or 201

echo "✅ All smoke tests passed"
```

---

## 📞 Emergency Contacts

**Security Incident Response Team:**
- **Primary:** <your-email>
- **Secondary:** <manager-email>
- **Azure Support:** 1-800-xxx-xxxx

**Escalation Path:**
1. Security team
2. Engineering manager
3. CTO
4. Legal/Compliance (if data breach)

---

## 📚 Additional Resources

- [Azure Key Vault Best Practices](https://learn.microsoft.com/en-us/azure/key-vault/general/best-practices)
- [Git Credential Leak Response](https://github.com/git/git/blob/master/Documentation/howto/recover-corrupted-object-harder.txt)
- [OWASP Secrets Management Cheat Sheet](https://cheatsheetseries.owasp.org/cheatsheets/Secrets_Management_Cheat_Sheet.html)

---

**Document Owner:** Security Team
**Last Review:** October 13, 2025
**Next Review:** November 13, 2025
