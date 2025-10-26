# MANDATORY WORKFLOW - Preventing Lost Fixes

**Last Updated:** October 26, 2025
**Status:** MANDATORY - Must be followed for EVERY change

---

## 🚨 THE PROBLEM

Multiple UI fixes completed but never deployed to production because:
1. Changes made on feature branches
2. Feature branches never merged to main
3. No verification that fixes reached production
4. User relies on memory to track what was fixed

**Result:** Production missing critical fixes, user frustrated, trust eroded

---

## ✅ MANDATORY WORKFLOW (EVERY CHANGE)

### Step 1: ALWAYS Work on Main (or Merge Immediately)

```bash
# Option A: Work directly on main for small fixes
git checkout main
git pull origin main
# Make changes
git add -A
git commit -m "fix: Description"
git push origin main

# Option B: Feature branch MUST be merged within 24 hours
git checkout -b feature/short-description
# Make changes
git add -A
git commit -m "fix: Description"
git push origin feature/short-description
# IMMEDIATELY merge to main:
git checkout main
git merge feature/short-description --no-ff
git push origin main
# Delete feature branch:
git branch -d feature/short-description
git push origin --delete feature/short-description
```

**RULE:** No feature branch lives longer than 24 hours. If not ready to merge, don't create the branch.

---

### Step 2: Verify Deployment (MANDATORY)

After pushing to main, wait 3-5 minutes and verify:

```bash
# Check latest build
git log -1 --format="%ar - %s"

# Compare to Azure DevOps last build
# URL: https://dev.azure.com/ctn-demo/ASR/_build

# Check build status
az pipelines runs list --org https://dev.azure.com/ctn-demo --project ASR --top 1 \
  --query "[].{ID:id, Pipeline:definition.name, Status:status, Result:result}" -o table
```

**RED FLAGS (Fix deployment first):**
- Last successful build >5 minutes old after push
- Pipeline failed (red status)
- Build time ≠ commit time

---

### Step 3: Test APIs with TE Agent (MANDATORY)

**After EVERY deployment that touches API code:**

```bash
# Invoke TE agent to test all affected API endpoints
# TE agent will create curl tests in api/tests/
# These tests become regression suite
```

**TE Agent Task:**
1. Test all API endpoints that changed
2. Verify 200 responses for GET endpoints
3. Verify POST/PUT/DELETE with sample data
4. Save curl tests to `api/tests/[feature-name].sh`
5. Report any failures immediately

**User checks frontend manually** - No exceptions

---

### Step 4: Document in COMPLETED_ACTIONS.md (MANDATORY)

```bash
# Update docs/COMPLETED_ACTIONS.md with:
# | YYYY-MM-DD | **Feature Name** - Description of what was completed |
```

**TW Agent does this automatically** if invoked after work completes.

---

## 🔍 RECOVERY PROCESS (Finding Missing Fixes)

### Method 1: Check Feature Branches

```bash
# List all feature branches
git branch -a | grep -v "HEAD\|main"

# For each branch, find commits not in main
git log feature/branch-name --oneline --not main

# Find admin portal specific changes
git log feature/branch-name --oneline --not main -- admin-portal/

# Show details of specific commit
git show COMMIT_HASH --stat
```

### Method 2: Check COMPLETED_ACTIONS.md

```bash
# Read completed actions
cat docs/COMPLETED_ACTIONS.md

# For each entry dated in last 7 days:
# 1. Search for commit with that description
# 2. Check if commit is in main
# 3. If not in main, merge immediately
```

### Method 3: Use Git Reflog

```bash
# Find all commits in last 7 days
git reflog --all --since="7 days ago" --date=short --format="%gd %gs"

# Check if each commit is in main
git branch --contains COMMIT_HASH | grep main
```

---

## 📋 CURRENT RECOVERY ACTIONS

### Missing Admin Portal Fixes on feature/ux-improvements:

1. **3258004** - Add MapPin icon for KvK Registry component
2. **1e6b2f8** - Add comprehensive KvK registry data storage and display
3. **bbf74e1** - Replace Kendo Badge with custom styled badge (About page)
4. **a030bc0** - Match Subscriptions page styling to Newsletters page
5. **27c049a** - Move Subscriptions and Newsletters just above About in sidebar
6. **6ab5ce7** - Remove unused subscription/newsletter/task features
7. **05b57dd** - Reorder sidebar menu and simplify Subscriptions page

**Action Required:** Review each commit, determine if needed, merge to main.

---

## 🛡️ PREVENTION RULES

### Rule 1: No Long-Lived Feature Branches
- Feature branch max lifetime: 24 hours
- If not ready to merge, don't create branch
- Work on main for small fixes

### Rule 2: Merge ≠ Deployment
- Merging to main triggers pipeline
- Pipeline must succeed
- Verify deployment before considering "done"

### Rule 3: Test Before "Done"
- TE agent tests APIs (curl)
- User tests frontend (manual)
- No "done" until both pass in production

### Rule 4: Document Everything
- COMPLETED_ACTIONS.md for all features
- TW agent updates documentation
- Never rely on memory

### Rule 5: One Source of Truth
- Main branch = production
- Feature branches = temporary workspace
- If not in main, it doesn't exist

---

## 🔧 AUTOMATED PREVENTION

### Git Hooks (To Be Implemented)

```bash
# .git/hooks/pre-push
# Check if pushing to feature branch older than 24 hours
# Warn user to merge to main first

# .git/hooks/post-commit
# Check if commit contains "fix:" or "feat:"
# Remind user to update COMPLETED_ACTIONS.md
```

### CI/CD Checks (To Be Implemented)

```yaml
# .azure-pipelines/verify-deployment.yml
# After deployment:
# 1. Run TE agent API tests
# 2. Check version.json matches deployed commit
# 3. Verify health endpoints
# 4. Post results to commit status
```

---

## 📞 ESCALATION

**If fixes are missing from production:**

1. **STOP** - Don't make more changes
2. **RECOVER** - Use recovery process to find missing commits
3. **MERGE** - Merge all missing commits to main
4. **VERIFY** - Test in production with TE agent
5. **DOCUMENT** - Update COMPLETED_ACTIONS.md
6. **PREVENT** - Review why merge was skipped

---

## ✅ CHECKLIST (Print This)

**Before Considering Any Work "Done":**

- [ ] Changes committed to main branch
- [ ] Pipeline triggered and succeeded
- [ ] Deployment verified (build time = commit time)
- [ ] TE agent tested APIs (if API changes)
- [ ] User tested frontend (always)
- [ ] COMPLETED_ACTIONS.md updated
- [ ] Feature branch deleted (if used)

**If ANY checkbox is unchecked, work is NOT done.**

---

## 📚 Related Documents

- `docs/LESSONS_LEARNED.md` - Why we needed this workflow
- `docs/PIPELINE_PREVENTION_CHECKLIST.md` - Pipeline-specific checks
- `CLAUDE.md` - Integration with Claude workflow
- `.claude/agents/test-engineer-te.md` - TE agent responsibilities

---

**Remember:** Production = main branch. If it's not in main, it's not done.
