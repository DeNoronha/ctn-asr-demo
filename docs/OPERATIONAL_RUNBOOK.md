# ASR API Operational Runbook

## Quick Reference

**API Health:** https://func-ctn-demo-asr-dev.azurewebsites.net/api/health
**Admin Portal:** https://admin-ctn-dev-gma8fnethbetbjgj.z02.azurefd.net
**Member Portal:** https://portal-ctn-dev-fdb5cpeagdendtck.z02.azurefd.net
**Azure DevOps:** https://dev.azure.com/ctn-demo/ASR
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
./scripts/check-pipeline-status.sh
```

## Deployment Verification

**After Pipeline Success (2-3 minutes):**

```bash
# 1. Check API health
curl https://func-ctn-demo-asr-dev.azurewebsites.net/api/health | jq

# 2. Verify function deployment
curl -I https://func-ctn-demo-asr-dev.azurewebsites.net/api/v1/members

# 3. Check portal accessibility
curl -I https://admin-ctn-dev-gma8fnethbetbjgj.z02.azurefd.net
curl -I https://portal-ctn-dev-fdb5cpeagdendtck.z02.azurefd.net

# 4. Verify latest version deployed
git log -1 --format="%ar - %s"
# Compare to Azure DevOps build time
```

## Common Issues & Solutions

### Issue 1: API Returns 404

**Symptoms:** Endpoint returns 404 instead of expected response

**Causes:**
1. Function not registered in index.ts
2. Route mismatch (lowercase params: {legalentityid} not {legalEntityId})
3. Deployment sync issue

**Solutions:**

```bash
# Check function registration
grep "FunctionName" api/src/index.ts

# Check deployment status
func azure functionapp logstream func-ctn-demo-asr-dev --timeout 20

# Force redeploy
cd api
npm run build
func azure functionapp publish func-ctn-demo-asr-dev --typescript --build remote
```

### Issue 2: "Old Version" in Production

**Symptoms:** Code changes not reflected in deployed API

**Cause:** Deployment succeeded but Azure cached old version

**Solution:**

```bash
# 1. Verify deployment time
git log -1 --format="%ar - %s"

# 2. Check Azure build time
# Visit: https://dev.azure.com/ctn-demo/ASR/_build

# 3. If mismatch, restart function app
# Azure Portal → Function App → Overview → Restart

# 4. Wait 2 minutes and verify again
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

# Check connection pool
# In API logs, look for "pool" errors

# Verify environment variables
echo $POSTGRES_HOST
echo $POSTGRES_PORT
echo $POSTGRES_DB
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

### Issue 5: Pipeline Failures

**Symptoms:** Azure Pipeline shows red X

**Common Causes & Fixes:**

```yaml
# Build failure:
# → Check TypeScript errors: npm run build
# → Fix type errors, commit, push

# Test failure:
# → Run tests locally: npm test
# → Fix failing tests, commit, push

# Secret scanner blocked:
# → Remove secrets from code
# → Use environment variables
# → Re-commit

# Deployment failure:
# → Check Azure Portal for function app status
# → Verify service plan not paused
# → Check function app logs
```

## Monitoring & Alerts

### Health Check Endpoint

```bash
# Automated monitoring (every 5 minutes)
curl -f https://func-ctn-demo-asr-dev.azurewebsites.net/api/health || \
  echo "ALERT: API health check failed"
```

**Response Format:**
```json
{
  "status": "healthy",
  "timestamp": "2025-11-13T20:00:00Z",
  "uptime": 3600,
  "environment": "production",
  "version": "1.0.0",
  "checks": {
    "database": { "status": "up", "responseTime": 45 },
    "applicationInsights": { "status": "up" },
    "azureKeyVault": { "status": "up" },
    "staticWebApps": { "status": "up" }
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

# 4. Monitor deployment
./scripts/check-pipeline-status.sh
```

### Database Recovery

```bash
# 1. Connect to database
psql "host=psql-ctn-demo-asr-dev.postgres.database.azure.com \
      port=5432 dbname=asr_dev user=asradmin sslmode=require"

# 2. Check recent changes
SELECT * FROM audit_logs ORDER BY dt_created DESC LIMIT 50;

# 3. If data corruption, restore from backup
# Contact Azure support for point-in-time restore
```

### Clear Azure Function Cache

```bash
# Sometimes function app caches old code
# 1. Stop function app
# 2. Wait 30 seconds
# 3. Start function app
# 4. Verify health endpoint returns new version
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

## Contact & Escalation

**On-Call:** [TBD]
**Slack Channel:** [TBD]
**Incident Tracking:** [TBD]

## Useful Commands Reference

```bash
# API Deployment
func azure functionapp publish func-ctn-demo-asr-dev --typescript --build remote

# View API Logs
func azure functionapp logstream func-ctn-demo-asr-dev --timeout 20

# Database Query
psql "host=psql-ctn-demo-asr-dev.postgres.database.azure.com port=5432 dbname=asr_dev user=asradmin sslmode=require"

# Run Tests
npm test                  # Run all tests
npm run test:coverage     # With coverage report
npm run test:verbose      # Verbose output

# Build
npm run build            # Compile TypeScript
npm run watch            # Watch mode

# Git
git status              # Check uncommitted changes
git log -1              # Last commit
git diff                # See changes

# Pipeline Status
./scripts/check-pipeline-status.sh
```
