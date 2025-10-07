# ASR Deployment - Quick Reference Checklist

## Pre-Deployment ✓

- [ ] Azure CLI installed (`az --version`)
- [ ] Terraform installed (`terraform --version`)
- [ ] Azure login completed (`az login`)
- [ ] Correct subscription selected (`az account show`)
- [ ] Resource providers registered (see DEPLOYMENT_GUIDE.md)

## Configuration Fixes ✓

- [ ] Updated `enable_https_traffic_only` → `https_traffic_only_enabled` (line 78)
- [ ] Updated timezone `"W. Europe Standard Time"` → `"Europe/Amsterdam"` (lines 353, 365)

## Deployment Commands ✓

```bash
cd ~/Desktop/Projects/Data\ in\ Logistics/repo/ASR/infrastructure

# 1. Initialize
terraform init

# 2. Review plan
terraform plan

# 3. Deploy (15-20 minutes)
terraform apply

# 4. Save outputs
terraform output > ../deployment-outputs.txt
```

## Post-Deployment ✓

- [ ] Retrieve PostgreSQL password from Key Vault
- [ ] Create `.env` file with connection details
- [ ] Test database connectivity
- [ ] Verify auto-shutdown schedules
- [ ] Document resource names and URLs

## Auto-Shutdown Schedule

| Day | Start | Stop | Active Hours |
|-----|-------|------|--------------|
| Mon-Fri | 9:00 AM | 5:00 PM | 8 hours |
| Sat-Sun | Stopped | Stopped | 0 hours |

**Monthly Runtime:** ~176 hours (vs 720 always-on)  
**Cost Savings:** ~75%

## Key Resource Names (Default)

```
Resource Group:       rg-ctn-demo-asr-dev
PostgreSQL Server:    psql-ctn-demo-asr-dev
Database Name:        asr_dev
Key Vault:           kv-ctn-demo-asr-dev
Function App:        func-ctn-demo-asr-dev
Static Web App:      stapp-ctn-demo-asr-dev
Storage Account:     stctndemoasrdev
Automation Account:  auto-ctn-demo-asr-dev
```

## Manual Database Control

```bash
# Stop database (save money)
az postgres flexible-server stop \
  --resource-group rg-ctn-demo-asr-dev \
  --name psql-ctn-demo-asr-dev

# Start database (for testing)
az postgres flexible-server start \
  --resource-group rg-ctn-demo-asr-dev \
  --name psql-ctn-demo-asr-dev

# Check status
az postgres flexible-server show \
  --resource-group rg-ctn-demo-asr-dev \
  --name psql-ctn-demo-asr-dev \
  --query state -o tsv
```

## Emergency Commands

```bash
# View all resources
az resource list --resource-group rg-ctn-demo-asr-dev --output table

# Force unlock Terraform state
terraform force-unlock LOCK_ID

# Destroy everything
terraform destroy
```

## Next Steps After Deployment

1. **Database Setup** - Deploy schema (members, tokens tables)
2. **API Development** - Member registration, OAuth endpoints
3. **Frontend Deployment** - Member portal UI
4. **Testing** - End-to-end verification

## Estimated Costs

| Component | Monthly Cost |
|-----------|--------------|
| PostgreSQL (with auto-shutdown) | €4-8 |
| Storage Account | €1-2 |
| Function App (consumption) | €2-5 |
| Static Web App | Free tier |
| Key Vault | €0.50 |
| Application Insights | Free (5GB) |
| Automation | Free (500 min) |
| **TOTAL** | **€20-30** |

## Support

- **Full Guide:** `DEPLOYMENT_GUIDE.md`
- **Architecture Docs:** `/CTN/arc42/`
- **Technical Deep Dive:** See Part 1 & Part 2 documents
