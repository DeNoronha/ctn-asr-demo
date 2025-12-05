# Build Failure Post-Mortem: Member Portal (November 14, 2025)

**Date:** November 14, 2025
**Severity:** HIGH (Production pipeline broken)
**Detection Time:** ~2 hours after push (user reported)
**Resolution Time:** 15 minutes
**Impact:** Member portal deployment blocked, manual intervention required

---

## Executive Summary

The member portal build failed in Azure DevOps with:
```
error during build:
Could not resolve "./endpoints/member" from "../packages/api-client/dist/index.js"
```

**Root Cause:** The `packages/api-client/dist/endpoints/member.js` file was built locally but never committed to git due to `.gitignore` excluding `dist/` folders globally.

**Why It Wasn't Caught:**
1. No automated post-push build verification
2. Post-commit hook only showed a reminder message (not enforced)
3. Local builds worked (dist files present locally)
4. No CI/CD notifications configured

---

## Timeline

| Time | Event |
|------|-------|
| 09:09 | Commit `27f6b9d` pushed (database migrations + documentation) |
| 09:09 | Azure DevOps pipelines triggered |
| 09:10 | Admin Portal build: ✅ PASSED |
| 09:10 | ASR API build: ✅ PASSED |
| 09:10 | Member Portal build: ❌ **FAILED** (unnoticed) |
| 11:15 | User reports breaking build |
| 11:15 | Investigation begins |
| 11:20 | Root cause identified (missing member.js in git) |
| 11:25 | Fix committed and pushed (commit `1b13196`) |
| 11:30 | Member Portal build: ✅ PASSED |

**Gap:** 2 hours and 5 minutes between failure and detection

---

## Root Cause Analysis

### 1. The Missing File

**File:** `packages/api-client/dist/endpoints/member.js` (and .d.ts, .d.ts.map)

**Why it was missing from git:**
```bash
# Global .gitignore (line 7)
dist/
```

This excludes ALL dist folders repository-wide.

### 2. Why Other Endpoint Files Were Committed

Earlier commits used `git add -f` (force add) to override .gitignore:
```bash
git add -f packages/api-client/dist/endpoints/audit.js
git add -f packages/api-client/dist/endpoints/auth.js
git add -f packages/api-client/dist/endpoints/contacts.js
# ... etc
```

But when `member.ts` was added later, the corresponding dist files were **never force-added**.

### 3. Why Local Builds Worked

TypeScript compiler (`tsc`) builds the package locally:
```bash
cd packages/api-client
npm run build  # Creates dist/endpoints/member.js locally
```

So local development and testing worked fine. Only Azure DevOps (clean checkout) failed.

### 4. Why It Wasn't Detected

**Current post-commit hook:**
```bash
#!/bin/bash
echo "Tip: After 'git push', wait 2-3 minutes then run:"
echo "  ./scripts/check-pipeline-status.sh"
```

**Problems:**
- ❌ Shows reminder only (not enforced)
- ❌ Relies on manual action
- ❌ No automatic verification
- ❌ No CI/CD failure notifications

---

## Impact Assessment

### Immediate Impact

| Component | Status | Impact |
|-----------|--------|--------|
| ASR API | ✅ Working | No impact |
| Admin Portal | ✅ Working | No impact |
| Member Portal | ❌ Broken | **Deployments blocked** |
| Production | ⚠️  Risk | Could not deploy member portal updates |

### Business Impact

- **Deployment velocity:** Blocked for 2+ hours
- **Developer productivity:** Investigation/fix time
- **Production risk:** Could have deployed broken code if auto-deploy enabled
- **User trust:** None (caught before production deployment)

---

## Prevention Measures Implemented

### 1. Immediate Fix (Commit `1b13196`)

```bash
git add -f packages/api-client/dist/endpoints/member.js
git add -f packages/api-client/dist/endpoints/member.d.ts
git add -f packages/api-client/dist/endpoints/member.d.ts.map
git commit -m "fix(api-client): add missing member endpoint files"
git push origin main
```

**Result:** ✅ Member portal build restored

### 2. Updated Post-Commit Hook

Enhanced `.git/hooks/post-commit` with explicit warning:
```bash
⚠️  IMPORTANT: Always verify builds succeed before
   considering your changes complete.

   Recent lesson: Member portal build failed due to
   missing api-client dist files (gitignored but needed)
```

### 3. Documentation

Created this post-mortem document to:
- Document the incident for future reference
- Provide clear root cause analysis
- Establish prevention procedures

---

## Recommended Long-Term Solutions

### Option 1: Remove dist/ from .gitignore ✅ **RECOMMENDED**

**Pros:**
- Simplest solution
- No build step required in CI/CD
- Eliminates entire class of issues

**Cons:**
- Slightly larger repository size
- Requires discipline to rebuild before committing

**Implementation:**
```bash
# 1. Remove "dist/" from .gitignore
# 2. Commit all dist files
git add packages/api-client/dist/
git commit -m "chore: track api-client dist files (prevent CI/CD issues)"

# 3. Add pre-commit hook to verify dist is up-to-date
```

### Option 2: Build api-client in Azure DevOps

**Pros:**
- Dist folder stays gitignored
- Always fresh build

**Cons:**
- Slower CI/CD pipeline
- Requires dependency installation
- More complex pipeline configuration

**Implementation:**
```yaml
# .azure-pipelines/asr-api.yml
steps:
  - script: |
      cd packages/api-client
      npm install
      npm run build
    displayName: 'Build API Client'

  - script: |
      cd admin-portal
      npm install
      npm run build
    displayName: 'Build Admin Portal'
```

### Option 3: Automated Build Verification

**Note:** Git doesn't support post-push hooks natively.

**Alternatives:**
1. **Azure DevOps Build Notifications** (email/Slack)
2. **GitHub Actions** (if migrating from Azure DevOps)
3. **Pre-push hook** (blocks push if local build fails)

**Pre-push hook example:**
```bash
#!/bin/bash
# .git/hooks/pre-push

echo "🔨 Running local build verification..."

cd packages/api-client && npm run build
cd ../../admin-portal && npm run build
cd ../member-portal && npm run build

if [ $? -ne 0 ]; then
  echo "❌ Local build failed! Fix errors before pushing."
  exit 1
fi

echo "✅ Local builds passed"
exit 0
```

---

## Action Items

### Immediate (Done ✅)

- [x] Fix member portal build (commit `1b13196`)
- [x] Update post-commit hook with warning
- [x] Document incident in post-mortem

### Short-Term (Recommended)

- [ ] **Decide:** Remove dist/ from .gitignore OR build in CI/CD
- [ ] **Implement:** Chosen solution (1 week)
- [ ] **Test:** Verify solution with test commit
- [ ] **Document:** Update CLAUDE.md with new process

### Long-Term (Optional)

- [ ] Enable Azure DevOps build notifications (email/Slack)
- [ ] Create pre-push hook for local build verification
- [ ] Add monorepo build dependency graph to pipeline
- [ ] Consider migrating to GitHub Actions (better hook support)

---

## Key Takeaways

### For Developers

1. ✅ **Always check builds after pushing**
   - Run `./scripts/check-pipeline-status.sh`
   - Don't assume "it worked locally" = "it works in CI/CD"

2. ✅ **Understand .gitignore implications**
   - If dist/ is ignored globally, use `git add -f` for exceptions
   - Better: don't ignore critical build artifacts

3. ✅ **Test with clean checkouts**
   ```bash
   git clone <repo> test-clone
   cd test-clone
   npm install
   npm run build
   ```

### For Repository Maintainers

1. ✅ **Eliminate silent failures**
   - Automated notifications for build failures
   - Pre-push hooks to catch issues locally

2. ✅ **Document build dependencies clearly**
   - Which folders are tracked/ignored
   - Why (and when to override)

3. ✅ **Make the right thing easy**
   - If dist files are needed, don't gitignore them
   - If building in CI/CD, make it obvious and fast

---

## References

- **Failed Build:** https://dev.azure.com/ctn-demo/ASR/_build/results?buildId=XXX
- **Fix Commit:** `1b13196` - fix(api-client): add missing member endpoint files
- **Related:** CLAUDE.md Section "Git Workflow" (needs update)

---

**Reviewed By:** Development Team
**Status:** ✅ RESOLVED
**Prevention Status:** ⚠️ PARTIAL (short-term actions needed)

**END OF POST-MORTEM**
