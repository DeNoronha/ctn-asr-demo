# Branch Protection Protocol

**Created:** October 26, 2025
**Purpose:** Prevent accidental code loss during branch management in monorepo

---

## ⚠️ IMPORTANT UPDATE (October 26, 2025)

**NEW WORKFLOW: NO FEATURE BRANCHES**

After the October 2025 branch deletion disaster, the team has adopted a new workflow:

- **ALL work happens on `main` branch**
- **NO feature branches allowed**
- **CTN-documentation is a separate repository**

**This document is NOW FOR:**
- **Emergency recovery reference** (if old branches are discovered)
- **Historical context** (understanding what went wrong)
- **Git reflog recovery procedures** (in case of accidental deletions)

**This document is NO LONGER FOR:**
- Active branch management (we don't create branches anymore)
- Pre-deletion checklists (we don't delete branches anymore)

If you're reading this for the current workflow, skip to the **Emergency Recovery** section below.

---

## 🚨 MANDATORY CHECKLIST - Before Deleting ANY Branch

**STOP. Run this checklist EVERY TIME before `git branch -D` or `git push origin --delete`:**

### 1. Identify What's In The Branch

```bash
# Get branch tip commit
BRANCH_NAME="feature/your-branch"
TIP_COMMIT=$(git rev-parse $BRANCH_NAME)

# List all commits in branch NOT in main
git log main..$BRANCH_NAME --oneline --no-merges

# Count unmerged commits
UNMERGED=$(git log main..$BRANCH_NAME --oneline --no-merges | wc -l)
echo "⚠️  $UNMERGED commits NOT in main"
```

### 2. Check Which Projects/Folders Are Affected

```bash
# See which top-level folders have changes
git log main..$BRANCH_NAME --name-only --pretty=format: | \
  cut -d/ -f1 | sort -u | grep -v '^$'
```

**CRITICAL:** In our monorepo, a branch might have changes to:
- `admin-portal/` - ASR Admin Portal
- `member-portal/` - ASR Member Portal
- `booking-portal/` - CTN DocuFlow (Booking Portal)
- `api/` - Shared API functions
- `database/` - Database migrations

**If ANY folder shows up, those changes will be LOST unless merged!**

### 3. Create Safety Tag BEFORE Deletion

```bash
# Always tag the branch tip before deleting
git tag "archive/$BRANCH_NAME-$(date +%Y%m%d)" $BRANCH_NAME
git push origin "archive/$BRANCH_NAME-$(date +%Y%m%d)"
```

**This gives you 30 days to recover via `git checkout tags/archive/...`**

### 4. Verify Main Has Everything You Need

```bash
# For each file you care about, check it exists in main
git show main:booking-portal/web/src/components/validation/TransportJourneyTimeline.tsx

# If it doesn't exist or is outdated, STOP DELETION
```

### 5. Document What You're Deleting

Add to `/tmp/deleted_branches_log.txt`:
```
[2025-10-26] Deleted feature/xyz
  - Commits: 5 (all in main)
  - Projects: admin-portal, api
  - Verified with: git log main..feature/xyz --oneline
  - Safety tag: archive/feature/xyz-20251026
```

---

## ❌ NEVER DELETE If:

1. **Unmerged commits exist** (`git log main..branch` shows commits)
2. **You haven't tested main** (the code might be broken)
3. **You're unsure what's in the branch** (audit first)
4. **No safety tag created** (always tag before delete)
5. **Pipeline is failing** (main might be broken, branch might have fix)

---

## ✅ Safe to Delete Only If:

1. **Zero unmerged commits:** `git log main..branch --oneline` returns nothing
2. **All changed files exist in main:** Manual verification completed
3. **Safety tag created:** Tag pushed to remote
4. **Main pipeline green:** All tests passing
5. **Documented in log:** Added to deleted_branches_log.txt

---

## 🚑 Emergency Recovery

If you accidentally deleted a branch:

### Within 30 Days (if tag created):
```bash
git checkout tags/archive/feature/xyz-20251026
git checkout -b feature/xyz-recovered
```

### Within Git Reflog Period (~30-90 days):
```bash
# Find deleted branch in reflog
git reflog --all | grep "feature/xyz"

# Recover from commit hash
git checkout -b feature/xyz-recovered abc1234
```

### After Reflog Expires:
**You're screwed. Data is gone forever. This is why we CREATE TAGS.**

---

## 📋 Monorepo Folder Structure

**This is a MONOREPO containing 4 independent projects:**

```
ASR-full/
├── admin-portal/     # ASR Admin Portal (React + Kendo UI)
├── member-portal/    # ASR Member Portal (React + Kendo UI)
├── booking-portal/   # CTN DocuFlow (React - SEPARATE customer)
├── api/              # Shared Azure Functions
└── database/         # PostgreSQL migrations (shared)
```

**CRITICAL:** A branch named `feature/booking-portal-xyz` can still contain changes to `admin-portal/` and `api/`. **ALWAYS check all folders.**

---

## 🔐 Branch Naming Convention (New Standard)

**From now on, use this format:**

```
<project>/<type>/<description>

Examples:
- admin-portal/feature/kvk-registry
- member-portal/fix/icon-display
- booking-portal/feature/multi-leg-journey
- api/refactor/cosmos-services
- database/migration/add-audit-table
- monorepo/chore/branch-cleanup  # (affects multiple projects)
```

**This makes it OBVIOUS which project(s) a branch affects.**

---

## 📊 Weekly Branch Health Check

**Every Monday, run this audit:**

```bash
# List all branches with last commit date
git for-each-ref --sort=-committerdate refs/heads/ \
  --format='%(committerdate:short) %(refname:short) %(committername)'

# Identify stale branches (>30 days old)
git for-each-ref --sort=-committerdate refs/heads/ \
  --format='%(committerdate:short) %(refname:short)' | \
  awk '$1 < "'$(date -d '30 days ago' +%Y-%m-%d)'"'

# For each stale branch, run the deletion checklist above
```

---

## 🎯 Post-Merge Cleanup Protocol

**After merging a feature branch to main:**

1. **Verify merge completed:**
   ```bash
   git log main..feature/xyz --oneline  # Should return NOTHING
   ```

2. **Tag the branch:**
   ```bash
   git tag "merged/feature/xyz-$(date +%Y%m%d)" feature/xyz
   git push origin "merged/feature/xyz-$(date +%Y%m%d)"
   ```

3. **Delete local and remote:**
   ```bash
   git branch -d feature/xyz  # Lowercase -d (safe delete)
   git push origin --delete feature/xyz
   ```

4. **Document in log:**
   ```
   [2025-10-26] Merged & deleted feature/xyz
     - Merged to main in commit abc1234
     - Safety tag: merged/feature/xyz-20251026
   ```

---

## 📖 Lessons From October 2025 Branch Cleanup Disaster

### What Went Wrong:

1. **Assumed branch names indicated content**
   - Branch `feature/booking-portal-xyz` was assumed to ONLY contain booking-portal changes
   - Actually contained changes to multiple projects

2. **Deleted branches without verifying merge status**
   - Used `git branch -D` (force delete) without checking `git log main..branch`
   - Lost 16 commits that were NOT in main

3. **No safety tags created**
   - Had to dig through reflog to find deleted commits
   - Some commits were hard to locate

4. **Mistook monorepo for separate repositories**
   - Treated `booking-portal/` as if it was a separate repo
   - Didn't realize `admin-portal/`, `member-portal/`, and `booking-portal/` all live together

### What We Recovered:

- 74 files (12,920 insertions) of booking portal work
- Multi-leg journey visualization
- Async document processing
- Week 3 & 4 UX improvements
- Security fixes (rate limiting, CORS)
- Service refactoring
- Comprehensive test coverage

**Total recovery time: 3 hours**
**User frustration level: Maximum**

---

## 🎓 Training Checklist for New Team Members

Before touching branches, every developer must:

- [ ] Read this entire document
- [ ] Understand monorepo structure (4 projects in 1 repo)
- [ ] Practice the deletion checklist on a test branch
- [ ] Create a safety tag on a test branch
- [ ] Successfully recover a test branch from a tag
- [ ] Review the October 2025 disaster case study above

---

## 📞 When In Doubt

**STOP. ASK. DON'T DELETE.**

- Post in Slack: "About to delete feature/xyz, anyone need it?"
- Wait 24 hours for responses
- Run the mandatory checklist above
- Still uncertain? Tag it and leave it alone.

**Better to have 100 old branches than lose 1 day of work.**

---

## 🔄 This Protocol Is Mandatory

**Violation consequences:**
1. First time: Warning + re-training
2. Second time: Pull request privileges revoked (must pair with senior dev)
3. Third time: Git access revoked (seriously, read the damn protocol)

**This protocol was written in blood (metaphorical developer tears). Learn from our mistakes.**

---

Last updated: October 26, 2025
Maintained by: Technical Lead
Review frequency: Quarterly
