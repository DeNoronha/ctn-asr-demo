# ASR API Operational Runbook

## Quick Reference

**API Health:** https://ca-ctn-asr-api-dev.calmriver-700a8c55.westeurope.azurecontainerapps.io/api/health
**Admin Portal:** https://admin-ctn-dev-gma8fnethbetbjgj.z02.azurefd.net
**Member Portal:** https://portal-ctn-dev-fdb5cpeagdendtck.z02.azurefd.net
**GitHub Actions:** https://github.com/DeNoronha/ctn-asr-demo/actions
**Database:** psql-ctn-demo-asr-dev.postgres.database.azure.com

## Pre-Deployment Checklist

```bash
# 1. Verify on main branch
git branch --show-current  # Should be 'main'

# 2. Pull latest
git pull origin main

# 3. Run tests
cd api && npm test
cd ../admin-portal && npm test

# 4. Build locally
cd ../api && npm run build
cd ../admin-portal && npm run build

# 5. Check for secrets
git diff --cached | grep -i "password\|secret\|key" || echo "✓ No secrets found"

# 6. Commit with semantic versioning
git commit -m "feat: description" # or fix:, refactor:, etc.

# 7. Push and monitor
git push origin main
gh run list --branch main --limit 3
```

## Deployment Verification

**After Workflow Success (2-3 minutes):**

```bash
# 1. Check API health
curl https://ca-ctn-asr-api-dev.calmriver-700a8c55.westeurope.azurecontainerapps.io/api/health | jq

# 2. Verify API endpoint
curl -I https://ca-ctn-asr-api-dev.calmriver-700a8c55.westeurope.azurecontainerapps.io/api/v1/entities

# 3. Check portal accessibility
curl -I https://admin-ctn-dev-gma8fnethbetbjgj.z02.azurefd.net
curl -I https://portal-ctn-dev-fdb5cpeagdendtck.z02.azurefd.net

# 4. Verify latest version deployed
git log -1 --format="%ar - %s"
# Compare to GitHub Actions workflow run time
gh run list --branch main --limit 1
```

## Common Issues & Solutions

### Issue 1: API Returns 404

**Symptoms:** Endpoint returns 404 instead of expected response

**Causes:**
1. Route not registered in routes.ts
2. Route mismatch (lowercase params: {legalentityid} not {legalEntityId})
3. Container App revision not active

**Solutions:**

```bash
# Check route registration
grep -r "router\." api/src/routes/

# Check Container App revision status
az containerapp revision list \
  --name ca-ctn-asr-api-dev \
  --resource-group rg-ctn-demo-asr-dev \
  --output table

# Check Container App logs
az containerapp logs show \
  --name ca-ctn-asr-api-dev \
  --resource-group rg-ctn-demo-asr-dev \
  --type console \
  --follow
```

### Issue 2: "Old Version" in Production

**Symptoms:** Code changes not reflected in deployed API

**Cause:** Deployment succeeded but old Container App revision still serving traffic

**Solution:**

```bash
# 1. Verify deployment time
git log -1 --format="%ar - %s"

# 2. Check GitHub Actions workflow time
gh run list --branch main --limit 5

# 3. Check active revision
az containerapp revision list \
  --name ca-ctn-asr-api-dev \
  --resource-group rg-ctn-demo-asr-dev \
  --query "[?properties.active].name" -o tsv

# 4. If mismatch, force new deployment
# Push an empty commit or trigger workflow manually
gh workflow run api.yml
```

### Issue 3: Database Connection Errors

**Symptoms:** 500 errors with "connection timeout" or "SSL required"

**Causes:**
1. PostgreSQL server firewall rules
2. SSL configuration missing
3. Connection pool exhausted

**Solutions:**

```bash
# Test connection
psql "host=psql-ctn-demo-asr-dev.postgres.database.azure.com \
      port=5432 dbname=asr_dev user=asradmin sslmode=require"

# Check connection pool in Container App logs
az containerapp logs show \
  --name ca-ctn-asr-api-dev \
  --resource-group rg-ctn-demo-asr-dev \
  --type console | grep -i "pool\|connection"
```

### Issue 4: Auth Errors (401/403)

**Symptoms:** Valid user getting 401 Unauthorized or 403 Forbidden

**Causes:**
1. MSAL token expired
2. Token scope incorrect
3. RBAC permissions mismatch

**Solutions:**

```typescript
// Check token in browser console
const token = await msalInstance.acquireTokenSilent({
  scopes: [`api://${process.env.REACT_APP_CLIENT_ID}/.default`]
});
console.log(jwt_decode(token.accessToken));

// Verify roles in token
// Should have: roles: ['SystemAdmin', 'AssociationAdmin', etc.]
```

### Issue 5: Workflow Failures

**Symptoms:** GitHub Actions workflow shows red X

**Common Causes & Fixes:**

```yaml
# Build failure:
# → Check TypeScript errors: npm run build
# → Fix type errors, commit, push

# Test failure:
# → Run tests locally: npm test
# → Fix failing tests, commit, push

# Docker build failure:
# → Check Dockerfile syntax
# → Verify base image availability

# Deployment failure:
# → Check Azure Container Apps status
# → Verify ACR credentials in GitHub secrets
# → Check Container App logs
```

```bash
# View workflow run details
gh run view --log-failed

# Re-run failed workflow
gh run rerun
```

## Monitoring & Alerts

### Health Check Endpoint

```bash
# Automated monitoring (every 5 minutes)
curl -f https://ca-ctn-asr-api-dev.calmriver-700a8c55.westeurope.azurecontainerapps.io/api/health || \
  echo "ALERT: API health check failed"
```

**Response Format:**
```json
{
  "status": "healthy",
  "timestamp": "2025-12-22T20:00:00Z",
  "uptime": 3600,
  "environment": "production",
  "version": "1.0.0",
  "checks": {
    "database": { "status": "up", "responseTime": 45 },
    "applicationInsights": { "status": "up" }
  }
}
```

### Application Insights Queries

**Most Common Errors (Last 24h):**
```kusto
exceptions
| where timestamp > ago(24h)
| summarize count() by outerMessage
| order by count_ desc
| take 10
```

**Slow Requests (>2 seconds):**
```kusto
requests
| where timestamp > ago(1h)
| where duration > 2000
| project timestamp, name, duration, resultCode
| order by duration desc
| take 20
```

**Failed Authentication Attempts:**
```kusto
traces
| where message contains "authentication failed"
| where timestamp > ago(1h)
| project timestamp, message
```

## Emergency Procedures

### Rollback Deployment

```bash
# 1. Find last working commit
git log --oneline -20

# 2. Revert to working commit
git revert <commit-hash>

# 3. Push rollback
git push origin main

# 4. Monitor workflow
gh run watch
```

### Database Recovery

```bash
# 1. Connect to database
psql "host=psql-ctn-demo-asr-dev.postgres.database.azure.com \
      port=5432 dbname=asr_dev user=asradmin sslmode=require"

# 2. Check recent changes
SELECT * FROM audit_log ORDER BY created_at DESC LIMIT 50;

# 3. If data corruption, restore from backup
# Contact Azure support for point-in-time restore
```

### Restart Container App

```bash
# Restart the Container App (creates new revision)
az containerapp revision restart \
  --name ca-ctn-asr-api-dev \
  --resource-group rg-ctn-demo-asr-dev \
  --revision <revision-name>

# Or scale down and up
az containerapp update \
  --name ca-ctn-asr-api-dev \
  --resource-group rg-ctn-demo-asr-dev \
  --min-replicas 0 \
  --max-replicas 0

# Wait 30 seconds, then scale back up
az containerapp update \
  --name ca-ctn-asr-api-dev \
  --resource-group rg-ctn-demo-asr-dev \
  --min-replicas 0 \
  --max-replicas 10
```

## Scheduled Maintenance

**Weekly (Monday 9 AM):**
- Review Application Insights dashboards
- Check database performance metrics
- Review error logs
- Update dependencies if needed

**Monthly (First Monday):**
- Database backup verification
- Security patch review
- Performance optimization review
- Documentation updates

## Useful Commands Reference

```bash
# View Container App Logs
az containerapp logs show \
  --name ca-ctn-asr-api-dev \
  --resource-group rg-ctn-demo-asr-dev \
  --type console \
  --follow

# Check Container App Status
az containerapp show \
  --name ca-ctn-asr-api-dev \
  --resource-group rg-ctn-demo-asr-dev \
  --query "{status:properties.runningStatus}"

# Database Query
psql "host=psql-ctn-demo-asr-dev.postgres.database.azure.com port=5432 dbname=asr_dev user=asradmin sslmode=require"

# Run Tests
npm test                  # Run all tests
npm run test:coverage     # With coverage report

# Build
npm run build            # Compile TypeScript
npm run watch            # Watch mode

# Git
git status              # Check uncommitted changes
git log -1              # Last commit
git diff                # See changes

# GitHub Actions Status
gh run list --branch main --limit 5
gh run view --log-failed
./scripts/quick-check.sh
```
