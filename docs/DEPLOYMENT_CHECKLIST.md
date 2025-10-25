# Deployment Checklist

**Purpose:** Prevent "forgot to deploy" issues in monorepo
**Last Updated:** 2025-10-25

---

## Pre-Deployment Checklist

Before starting any deployment, verify:

- [ ] You are on the correct branch (`main` or approved feature branch)
- [ ] All tests pass locally
- [ ] No uncommitted changes (or commit them first)
- [ ] You know which components changed:
  - [ ] API (`api/`)
  - [ ] Admin Portal (`admin-portal/`)
  - [ ] Member Portal (`member-portal/`)
  - [ ] Database schema (`database/`)

---

## Component-Specific Deployment

### API (Azure Functions)

**When to deploy:**
- ANY changes in `api/` directory
- Database schema changes (API connects to DB)
- New endpoints added
- Authentication/authorization changes

**How to deploy:**
```bash
cd /Users/ramondenoronha/Dev/DIL/ASR-full/api
./deploy-api.sh
```

**Verification:**
```bash
./tests/admin-portal-404-investigation.sh
```

**Pipeline:** Currently MANUAL (no pipeline exists yet)

---

### Admin Portal (Static Web App)

**When to deploy:**
- Changes in `admin-portal/` directory
- Frontend UI updates
- Component changes

**How to deploy:**
- Automatic via Azure DevOps pipeline
- Triggered by push to `main` with changes in `admin-portal/`

**Pipeline:** `.azure-pipelines/admin-portal.yml`

**Verification:**
```bash
# Check build status
git log -1 --format="%ar - %s"
# Compare to: https://dev.azure.com/ctn-demo/ASR/_build

# Test live site
curl https://calm-tree-03352ba03.1.azurestaticapps.net
```

---

### Member Portal (Static Web App)

**When to deploy:**
- Changes in `member-portal/` directory
- Member-facing features

**How to deploy:**
- Automatic via Azure DevOps pipeline
- Triggered by push to `main` with changes in `member-portal/`

**Pipeline:** `.azure-pipelines/member-portal.yml`

**Verification:**
```bash
curl https://calm-pebble-043b2db03.1.azurestaticapps.net
```

---

### Database Migrations

**When to deploy:**
- Schema changes (`database/migrations/*.sql`)
- New tables, columns, indexes
- Seed data updates

**How to deploy:**
```bash
# Check .credentials file for connection string
psql "$(grep POSTGRES_CONNECTION .credentials | cut -d'=' -f2)" -f database/migrations/XXX_description.sql
```

**IMPORTANT:**
- Always deploy DB migrations BEFORE deploying API
- Test migrations on dev environment first
- Create rollback script for each migration

---

## Multi-Component Deployment Order

When multiple components change:

1. **Database** (if schema changed)
2. **API** (if backend logic changed)
3. **Frontend(s)** (admin-portal, member-portal)

**Example:**
```bash
# 1. Database migration
psql "..." -f database/migrations/012_add_identifiers.sql

# 2. API deployment
cd api && ./deploy-api.sh

# 3. Frontend deployment (automatic via pipeline)
git push origin main
```

---

## Post-Deployment Verification

After ANY deployment:

- [ ] Check Azure DevOps build status
- [ ] Verify deployment timestamp matches git commit
- [ ] Test affected endpoints/pages
- [ ] Check Application Insights for errors
- [ ] Monitor for 5-10 minutes

**Commands:**
```bash
# Check API logs
func azure functionapp logstream func-ctn-demo-asr-dev

# Test API health
curl https://func-ctn-demo-asr-dev.azurewebsites.net/api/health

# Check frontend
curl https://calm-tree-03352ba03.1.azurestaticapps.net
```

---

## Common Mistakes (Lessons Learned)

### ❌ Deploying Frontend Without API

**Symptom:** Admin portal works but shows 404 on all API calls
**Cause:** Frontend deployed, API not deployed
**Fix:** Deploy API immediately
**Prevention:** Check this checklist!

**Example:** Oct 25, 2025 - Renamed `web/` to `admin-portal/`, deployed frontend, forgot API. Spent 60 minutes debugging before realizing API wasn't deployed.

### ❌ Database Migration After API

**Symptom:** API crashes with "column does not exist" errors
**Cause:** API expects new schema, database still has old schema
**Fix:** Run migration, restart API
**Prevention:** Always migrate DB BEFORE deploying API

### ❌ Deploying to Wrong Environment

**Symptom:** Changes appear in wrong portal
**Cause:** Wrong Azure resource name in command
**Fix:** Check `.azure-pipelines/*.yml` for correct names
**Prevention:** Use deployment scripts (they have correct names)

---

## Emergency Rollback

If deployment breaks production:

### API Rollback
```bash
# Deploy previous version from git
git checkout <previous-commit>
cd api && ./deploy-api.sh
git checkout main
```

### Frontend Rollback
```bash
# Azure Portal → Static Web Apps → Deployments → Redeploy previous version
# OR
# Revert commit and push
git revert <bad-commit>
git push origin main
```

### Database Rollback
```bash
# Run rollback script
psql "..." -f database/migrations/XXX_rollback.sql
```

---

## Automation Recommendations

### High Priority

- [ ] Create `.azure-pipelines/api.yml` for automatic API deployment
- [ ] Add deployment notifications to Teams/Slack
- [ ] Create smoke tests that run post-deployment

### Medium Priority

- [ ] Database migration automation
- [ ] Deployment approval gates for production
- [ ] Automated rollback triggers

### Low Priority

- [ ] Blue-green deployments
- [ ] Canary releases
- [ ] Feature flags for gradual rollout

---

## Quick Reference

| Component | Deploy Command | Pipeline | Verification |
|-----------|---------------|----------|--------------|
| API | `cd api && ./deploy-api.sh` | None (manual) | `./tests/admin-portal-404-investigation.sh` |
| Admin Portal | `git push` (automatic) | `.azure-pipelines/admin-portal.yml` | `curl https://calm-tree-...` |
| Member Portal | `git push` (automatic) | `.azure-pipelines/member-portal.yml` | `curl https://calm-pebble-...` |
| Database | `psql "..." -f migration.sql` | None (manual) | Test queries |

---

## When in Doubt

**Ask these questions:**

1. Did I change code in `api/`? → Deploy API
2. Did I change code in `admin-portal/`? → Push to main (auto-deploy)
3. Did I change code in `member-portal/`? → Push to main (auto-deploy)
4. Did I change database schema? → Run migration first

**Remember:** In a monorepo, **each component deploys independently**. Changing one does NOT deploy others!

