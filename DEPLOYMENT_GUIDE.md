# ASR Demo Application - Deployment Guide

**Version:** 2.0  
**Date:** October 6, 2025  
**Author:** Ramon de Noronha  
**Status:** Production Ready - All Known Issues Pre-Fixed

---

## Overview

This guide provides step-by-step instructions for deploying the CTN Association Register (ASR) demo application to Azure. All known deployment issues have been pre-integrated into the proper steps, so you can deploy successfully on the first try.

**What You'll Deploy:**
- 26 Azure resources via Terraform
- PostgreSQL database with auto-shutdown (75% cost savings)
- Node.js/TypeScript API on Azure Functions
- React frontend on Azure Static Web Apps

**Estimated Monthly Cost:** €20-30 (with auto-shutdown)  
**Total Deployment Time:** 30-40 minutes  

---

## Table of Contents

1. [Prerequisites](#prerequisites)
2. [Infrastructure Deployment](#infrastructure-deployment)
3. [API Deployment](#api-deployment)
4. [Frontend Deployment](#frontend-deployment)
5. [Verification & Testing](#verification--testing)
6. [Cost Management](#cost-management)
7. [Troubleshooting](#troubleshooting)
8. [Teardown](#teardown)

---

## Prerequisites

### Required Tools

Install these tools before starting:

```bash
# Azure CLI (v2.50.0 or later)
brew update && brew install azure-cli
az --version

# Terraform (v1.5.0 or later)
brew tap hashicorp/tap
brew install hashicorp/tap/terraform
terraform --version

# Node.js (v18 or later)
brew install node
node --version

# PostgreSQL client (for testing)
brew install postgresql

# Azure Static Web Apps CLI
npm install -g @azure/static-web-apps-cli
```

### Azure Account

- Active Azure subscription
- Owner or Contributor role
- Ability to create resource groups and resources

### Authentication

```bash
# Login to Azure
az login

# Set your subscription
az account set --subscription "YOUR_SUBSCRIPTION_NAME"

# Verify
az account show --output table
```

---

## Infrastructure Deployment

### Step 1: Navigate to Project

```bash
cd ~/Desktop/Projects/Data\ in\ Logistics/repo/ASR/infrastructure
```

### Step 2: Fix Known Terraform Issues

Before running Terraform, apply these critical fixes to `main.tf`:

```bash
# Fix 1: Update deprecated storage account property
sed -i '' 's/enable_https_traffic_only/https_traffic_only_enabled/g' main.tf

# Fix 2: Update timezone format (Windows to IANA)
sed -i '' 's/timezone                = "W. Europe Standard Time"/timezone                = "Europe\/Amsterdam"/g' main.tf

# Verify the fixes were applied
grep -n "https_traffic_only_enabled" main.tf
grep -n "Europe/Amsterdam" main.tf
```

**Expected output:**
```
78:  https_traffic_only_enabled = true
353:  timezone                = "Europe/Amsterdam"
365:  timezone                = "Europe/Amsterdam"
```

### Step 3: Initialize Terraform

```bash
terraform init
```

**Expected output:**
```
Terraform has been successfully initialized!
```

### Step 4: Review Deployment Plan

```bash
terraform plan
```

**Expected output:**
```
Plan: 26 to add, 0 to change, 0 to destroy.
```

**Resources to be created:**
- Resource Group
- PostgreSQL Flexible Server (with auto-shutdown)
- Function App + App Service Plan
- Static Web App
- Storage Account
- Key Vault
- Application Insights
- Automation Account with start/stop schedules
- Supporting resources (VNets, subnets, etc.)

### Step 5: Deploy Infrastructure

```bash
terraform apply
```

Type `yes` when prompted.

**Deployment takes 15-20 minutes.** Watch for:
- ✅ Green "Creation complete" messages
- ❌ Red errors (stop and check troubleshooting)

### Step 6: Save Deployment Outputs

```bash
# Display all outputs
terraform output

# Save outputs for reference
terraform output > ../deployment-outputs.txt

# Get specific values you'll need
terraform output -raw function_app_name
terraform output -raw static_web_app_name
terraform output -raw key_vault_name
```

---

## API Deployment

### Step 7: Setup Database Schema

```bash
cd ~/Desktop/Projects/Data\ in\ Logistics/repo/ASR

# Get database password from Key Vault
export DB_PASSWORD=$(az keyvault secret show \
  --vault-name kv-ctn-demo-asr-dev \
  --name postgres-admin-password \
  --query value -o tsv)

# Connect to database
psql "host=psql-ctn-demo-asr-dev.postgres.database.azure.com \
      port=5432 \
      dbname=asr_dev \
      user=psqladmin \
      password=$DB_PASSWORD \
      sslmode=require"
```

**In psql, create the schema:**
```sql
-- Create organizations table
CREATE TABLE IF NOT EXISTS organizations (
    org_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    legal_name VARCHAR(255) NOT NULL,
    lei VARCHAR(20),
    kvk VARCHAR(8),
    domain VARCHAR(255) NOT NULL UNIQUE,
    status VARCHAR(20) DEFAULT 'pending' CHECK (status IN ('pending', 'active', 'suspended', 'revoked')),
    membership_level VARCHAR(20) DEFAULT 'bronze' CHECK (membership_level IN ('bronze', 'silver', 'gold', 'platinum')),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    metadata JSONB
);

-- Insert test data
INSERT INTO organizations (legal_name, domain, lei, kvk, status, membership_level)
VALUES 
    ('Acme Logistics B.V.', 'acme-logistics.nl', '724500ABCD1234567890', '12345678', 'active', 'gold'),
    ('Transport Solutions Inc.', 'transport-solutions.com', '724500EFGH0987654321', '87654321', 'active', 'silver');

-- Verify
SELECT * FROM organizations;

-- Exit
\q
```

### Step 8: Build and Deploy API

```bash
cd ~/Desktop/Projects/Data\ in\ Logistics/repo/ASR/api

# Install dependencies
npm install

# Build TypeScript
npm run build

# Deploy to Azure Functions
func azure functionapp publish func-ctn-demo-asr-dev
```

**Expected output:**
```
Deployment successful.
```

### Step 9: Test API Endpoints

```bash
# Test: Get all members
curl https://func-ctn-demo-asr-dev.azurewebsites.net/api/v1/members

# Expected: JSON array with 2 test members
```

---

## Frontend Deployment

### Step 10: Fix TypeScript Issues (CRITICAL)

The React app has a TypeScript compilation issue with axios that must be fixed before building:

```bash
cd ~/Desktop/Projects/Data\ in\ Logistics/repo/ASR/web
```

**Replace the entire `src/services/api.ts` file:**

```bash
cat > src/services/api.ts << 'EOF'
import axios from 'axios';

const API_BASE_URL = process.env.REACT_APP_API_URL || 'http://localhost:7071/api/v1';

export interface Member {
  org_id: string;
  legal_name: string;
  lei?: string;
  kvk?: string;
  domain: string;
  status: string;
  membership_level: string;
  created_at: string;
  metadata?: any;
}

interface MembersResponse {
  data: Member[];
  count: number;
}

interface TokenResponse {
  access_token: string;
  token_type: string;
  expires_in: number;
  scope: string;
}

export const api = {
  async getMembers(): Promise<Member[]> {
    const response = await axios.get<MembersResponse>(`${API_BASE_URL}/members`);
    return response.data.data;
  },

  async getMember(orgId: string): Promise<Member> {
    const response = await axios.get<Member>(`${API_BASE_URL}/members/${orgId}`);
    return response.data;
  },

  async createMember(member: Partial<Member>): Promise<Member> {
    const response = await axios.post<Member>(`${API_BASE_URL}/members`, member);
    return response.data;
  },

  async issueToken(orgId: string): Promise<{ access_token: string }> {
    const response = await axios.post<TokenResponse>(`${API_BASE_URL}/oauth/token`, { org_id: orgId });
    return response.data;
  }
};
EOF
```

**What changed:** Used generic type parameters `axios.get<Type>()` instead of importing `AxiosResponse` which causes compilation errors.

### Step 11: Configure Production API URL (CRITICAL)

Without this, the deployed app will try to connect to `http://localhost:7071`:

```bash
# Create production environment configuration
cat > .env.production << 'EOF'
REACT_APP_API_URL=https://func-ctn-demo-asr-dev.azurewebsites.net/api/v1
EOF
```

**Verify the file was created:**
```bash
cat .env.production
```

### Step 12: Build React Application

```bash
# Install dependencies
npm install

# Build for production (uses .env.production)
npm run build
```

**Expected output:**
```
Compiled successfully.

File sizes after gzip:

  76.86 kB  build/static/js/main.2b4cd807.js
  1.76 kB   build/static/js/453.99c07213.chunk.js
  943 B     build/static/css/main.458ed80b.css

The build folder is ready to be deployed.
```

**If build fails:**
- Verify Step 10 was completed (api.ts fix)
- Check for TypeScript errors: `npm run build`
- Ensure `public/index.html` exists

### Step 13: Deploy to Azure Static Web Apps

```bash
# Get deployment token
export DEPLOYMENT_TOKEN=$(az staticwebapp secrets list \
  --name stapp-ctn-demo-asr-dev \
  --resource-group rg-ctn-demo-asr-dev \
  --query "properties.apiKey" \
  --output tsv)

# Deploy
swa deploy ./build \
  --deployment-token $DEPLOYMENT_TOKEN \
  --app-name stapp-ctn-demo-asr-dev \
  --env production
```

**Expected output:**
```
Deploying project to Azure Static Web Apps...
✔ Deployment complete
```

**If deployment fails with "Failed to find a default file":**
- The build didn't complete successfully
- Go back to Step 12 and check for build errors

### Step 14: Configure CORS (CRITICAL)

The Function App must allow requests from the Static Web App domain:

```bash
# Allow Static Web App
az functionapp cors add \
  --name func-ctn-demo-asr-dev \
  --resource-group rg-ctn-demo-asr-dev \
  --allowed-origins "https://calm-tree-03352ba03.1.azurestaticapps.net"

# Also allow localhost for local development
az functionapp cors add \
  --name func-ctn-demo-asr-dev \
  --resource-group rg-ctn-demo-asr-dev \
  --allowed-origins "http://localhost:3000"

# Verify CORS configuration
az functionapp cors show \
  --name func-ctn-demo-asr-dev \
  --resource-group rg-ctn-demo-asr-dev
```

**Expected output:**
```json
{
  "allowedOrigins": [
    "https://calm-tree-03352ba03.1.azurestaticapps.net",
    "http://localhost:3000"
  ]
}
```

---

## Verification & Testing

### Step 15: Test the Live Application

1. **Open the application:**
   ```
   https://calm-tree-03352ba03.1.azurestaticapps.net
   ```

2. **Open browser Developer Tools (F12)**
   - **Console tab:** Should have NO errors
   - **Network tab:** API calls should return 200 status

3. **Test Member Directory:**
   - Should display 2 test members
   - Click on a member to see details

4. **Test Registration Form:**
   - Fill in a new member:
     - Legal Name: "Test Company B.V."
     - Domain: "testcompany.nl"
     - Membership Level: "bronze"
   - Submit form
   - New member should appear in the directory immediately

### Step 16: Verify Auto-Shutdown Schedule

```bash
# Check automation schedules
az automation schedule list \
  --resource-group rg-ctn-demo-asr-dev \
  --automation-account-name auto-ctn-demo-asr-dev \
  --output table
```

**Expected schedules:**
- `start-postgres-09h` - Starts Mon-Fri at 9:00 AM
- `stop-postgres-17h` - Stops Mon-Fri at 5:00 PM

---

## Cost Management

### Auto-Shutdown Schedule

**Configured automatically during deployment:**
- **Active Hours:** Monday-Friday, 9:00 AM - 5:00 PM CET
- **Inactive Hours:** Evenings and weekends
- **Cost Savings:** ~75% on database costs

### Monthly Cost Estimate

| Service | Cost (€) |
|---------|----------|
| PostgreSQL (with auto-shutdown) | 15-20 |
| Function App (Consumption) | 10-15 |
| Static Web App (Free tier) | 0 |
| Storage Account | 5-10 |
| Other resources | 1-2 |
| **Total** | **€31-47** |

**Without auto-shutdown:** €76-107/month

### Manual Database Control

```bash
# Stop database now
az postgres flexible-server stop \
  --resource-group rg-ctn-demo-asr-dev \
  --name psql-ctn-demo-asr-dev

# Start database now
az postgres flexible-server start \
  --resource-group rg-ctn-demo-asr-dev \
  --name psql-ctn-demo-asr-dev
```

### Monitor Costs

```bash
# View costs for last 30 days
az consumption usage list \
  --start-date $(date -v-30d +%Y-%m-%d) \
  --end-date $(date +%Y-%m-%d) \
  --output table
```

---

## Troubleshooting

### Build Issues

**Problem:** React build fails with axios error

**Solution:** Verify Step 10 was completed correctly. The `api.ts` file must use generic type parameters.

---

**Problem:** "insecure content blocked" in browser console

**Solution:** Verify Step 11 was completed. Check `.env.production` exists:
```bash
cat web/.env.production
```

---

### Deployment Issues

**Problem:** swa deploy fails with "Failed to find default file"

**Solution:** Build didn't complete. Run `npm run build` again and check for errors.

---

**Problem:** CORS errors in browser console

**Solution:** Complete Step 14. Verify CORS configuration:
```bash
az functionapp cors show \
  --name func-ctn-demo-asr-dev \
  --resource-group rg-ctn-demo-asr-dev
```

---

### Database Issues

**Problem:** Cannot connect to database

**Solution:**
```bash
# Check if database is running
az postgres flexible-server show \
  --resource-group rg-ctn-demo-asr-dev \
  --name psql-ctn-demo-asr-dev \
  --query state

# If stopped, start it
az postgres flexible-server start \
  --resource-group rg-ctn-demo-asr-dev \
  --name psql-ctn-demo-asr-dev

# Add your IP to firewall
az postgres flexible-server firewall-rule create \
  --resource-group rg-ctn-demo-asr-dev \
  --name psql-ctn-demo-asr-dev \
  --rule-name AllowMyIP \
  --start-ip-address $(curl -s ifconfig.me) \
  --end-ip-address $(curl -s ifconfig.me)
```

---

### Terraform Issues

**Problem:** Provider registration timeout

**Solution:**
```bash
# Manually register providers
az provider register --namespace Microsoft.DBforPostgreSQL
az provider register --namespace Microsoft.Storage
az provider register --namespace Microsoft.Web

# Wait 5 minutes, then retry
terraform apply
```

---

**Problem:** Terraform state locked

**Solution:**
```bash
# If previous apply was interrupted
terraform force-unlock LOCK_ID
```

---

## Teardown

### Complete Resource Removal

To delete everything and stop all costs:

```bash
cd ~/Desktop/Projects/Data\ in\ Logistics/repo/ASR/infrastructure

# Preview destruction
terraform plan -destroy

# Destroy all resources
terraform destroy
```

Type `yes` when prompted.

**⚠️ Warning:** This is irreversible and will delete:
- All data in the database
- All secrets in Key Vault
- All deployed applications
- All configuration

**Before destroying:**
1. Export any important data from the database
2. Save configuration files
3. Document any custom changes

---

## Next Steps

### Your Application is Now Deployed! 🎉

**Live URLs:**
- **Web App:** https://calm-tree-03352ba03.1.azurestaticapps.net
- **API:** https://func-ctn-demo-asr-dev.azurewebsites.net/api/v1

### Optional Enhancements

1. **CI/CD Pipeline**
   - Set up GitHub Actions for automated deployments
   - Add automated testing

2. **Authentication**
   - Integrate Azure AD B2C
   - Add user roles and permissions

3. **Monitoring**
   - Configure Application Insights alerts
   - Set up cost alerts

4. **Custom Domain**
   - Add your own domain name
   - Configure SSL certificates

---

## Support

**Documentation:**
- This deployment guide
- README.md in project root
- Individual component READMEs in api/ and web/ directories

**Azure Resources:**
- Azure Portal: https://portal.azure.com
- Azure Documentation: https://docs.microsoft.com/azure

**Project Contact:**
- Ramon de Noronha

---

## Deployment Checklist Summary

- ✅ Infrastructure deployed (26 resources via Terraform)
- ✅ Database schema created with test data
- ✅ API deployed to Azure Functions
- ✅ Frontend built with correct API URL
- ✅ Frontend deployed to Static Web Apps
- ✅ CORS configured
- ✅ Auto-shutdown schedule active (75% cost savings)
- ✅ Application tested and working

**Total Time:** 30-40 minutes  
**Monthly Cost:** €31-47 (with auto-shutdown)  
**Status:** Production Ready ✨

---

**Document Version:** 2.0  
**Last Updated:** October 6, 2025  
**All Known Issues:** Pre-Fixed in Steps
