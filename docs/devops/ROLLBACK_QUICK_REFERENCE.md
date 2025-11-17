# Rollback Quick Reference

**Quick access guide for emergency rollback procedures**

## When to Rollback

### Automatic Rollback (API)
- Pipeline automatically rolls back if post-deployment health checks fail
- No action needed - monitor pipeline logs

### Manual Rollback Required
- Production errors spike (>10/min in Application Insights)
- Users report broken functionality
- Performance degradation (>2x slower)
- Security incident in new deployment

## Quick Commands

### Check Current Deployment Status
```bash
./scripts/deployment-history.sh
```

### Rollback API
```bash
# Automatic (slot swap)
./scripts/rollback-deployment.sh api
```

### Rollback Admin Portal
```bash
# Auto-detect previous commit
./scripts/rollback-deployment.sh admin-portal

# Specific commit
./scripts/deployment-history.sh  # Find commit hash
./scripts/rollback-deployment.sh admin-portal abc1234
```

### Rollback Member Portal
```bash
# Auto-detect previous commit
./scripts/rollback-deployment.sh member-portal

# Specific commit
./scripts/rollback-deployment.sh member-portal def5678
```

## Rollback Timeline

| Component | Method | Time | Downtime |
|-----------|--------|------|----------|
| **API** | Slot swap | <60 seconds | None |
| **Admin Portal** | Redeploy | ~2-3 minutes | Minimal |
| **Member Portal** | Redeploy | ~2-3 minutes | Minimal |

## Verification Steps

### After Rollback

1. **Check health endpoints:**
   ```bash
   # API
   curl https://func-ctn-demo-asr-dev.azurewebsites.net/api/health

   # Admin Portal
   curl https://calm-tree-03352ba03.1.azurestaticapps.net

   # Member Portal
   curl https://calm-pebble-043b2db03.1.azurestaticapps.net
   ```

2. **Verify Application Insights:**
   - Error rate returns to baseline
   - Response times normal
   - No spike in exceptions

3. **Test critical functionality:**
   - Login works
   - Dashboard loads
   - Critical workflows function

## Troubleshooting

### Rollback Script Fails

**Not logged into Azure?**
```bash
az login
```

**Key Vault access denied?**
```bash
az keyvault show --name kv-ctn-demo-asr-dev
# Contact Azure admin if this fails
```

**Git repository dirty?**
```bash
git status
git stash  # Save changes
```

### Rollback Completed But Still Issues

**Check infrastructure:**
```bash
# Database connectivity
psql "host=psql-ctn-demo-asr-dev.postgres.database.azure.com port=5432 dbname=asr_dev user=asradmin sslmode=require"

# Azure service health
az resource list --resource-group rg-ctn-demo-asr-dev --output table
```

**Rollback to earlier version:**
```bash
./scripts/deployment-history.sh
# Pick commit 3-4 back instead of just previous
./scripts/rollback-deployment.sh [component] [older-commit]
```

## Emergency Contacts

**If rollback fails or situation escalates:**

1. **Azure Support:** Open support ticket in Azure Portal
2. **DevOps Lead:** Check team documentation for contact
3. **On-Call Engineer:** Check rotation schedule

## Post-Rollback Checklist

Within 5 minutes:
- [ ] Verify production health checks pass
- [ ] Check Application Insights error rate
- [ ] Notify stakeholders

Within 1 hour:
- [ ] Review failed deployment logs
- [ ] Document incident
- [ ] Identify root cause

Within 24 hours:
- [ ] Create fix for failed deployment
- [ ] Update tests to prevent recurrence
- [ ] Conduct post-mortem if needed

## Related Documentation

- Full guide: `docs/devops/AUTOMATED_ROLLBACK.md`
- Deployment procedures: Arc42 documentation
- DORA metrics: `docs/devops/TASK-DG-MONITOR-001-DORA-METRICS-SUMMARY.md`

---

**Keep this guide bookmarked for quick access during incidents!**
