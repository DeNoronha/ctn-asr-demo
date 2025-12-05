# Pre-Commit Hook - Quick Reference Card

**Version:** 3.0 (November 16, 2025)
**Location:** `.git/hooks/pre-commit`
**Prevents:** 70% of pipeline failures

---

## 7 Checks (in order)

| # | Check | Status | What It Does | Speed |
|---|-------|--------|--------------|-------|
| 1 | API Client Build | BLOCKING | Ensures dist/ files rebuilt when src/ changes | 1s |
| 2 | Secret Scanner | BLOCKING | Detects hardcoded secrets, API keys, passwords | 2-3s |
| 3 | TypeScript | BLOCKING | Compiles TS to check for errors (no output) | 10-15s |
| 4 | JSON Validation | BLOCKING | Validates JSON syntax with jq | 1s |
| 5 | Linting (Biome) | WARNING | Code quality checks | 3-5s |
| 6 | Common Mistakes | BLOCKING | debugger, hardcoded URLs | 1s |
| 7 | Impact Analysis | WARNING | Warns about cross-portal changes | 1s |

**Total time:** 5-30 seconds (depends on what changed)

---

## If Blocked - Quick Fixes

### TypeScript Errors
```bash
cd admin-portal  # or api, member-portal
npm run typecheck
# Fix errors shown
git commit
```

### Secret Detected
```bash
# Remove hardcoded secret
# Use environment variable:
const apiKey = process.env.VITE_API_KEY;
git commit
```

### JSON Syntax Error
```bash
jq empty path/to/file.json
# Fix syntax error at line shown
git commit
```

### debugger Statement
```bash
# Remove or comment out:
// debugger;
git commit
```

### Hardcoded localhost URL
```bash
# Replace:
- const url = "http://localhost:7071/api";
+ const url = process.env.VITE_API_URL;
git commit
```

---

## Bypass (Emergency Only)

```bash
git commit --no-verify -m "hotfix: production emergency"
```

**Warning:** Pipeline may still fail!

---

## What This Prevents

| Issue | Without Hook | With Hook |
|-------|--------------|-----------|
| TypeScript errors | Fail in pipeline (5-10 min) | Caught in 15s |
| Invalid JSON | Fail in pipeline | Caught in 1s |
| Hardcoded secrets | Exposed in production | Blocked |
| Unbuild API client | Pipeline failure | Blocked |
| Cross-portal impact | Surprise cascading builds | Warning |

**Result:** 60-70% fewer failed builds

---

## Example Output (Success)

```
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
🛡️  CTN ASR Pre-Commit Validation (v3.0)
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

🔨 [1/7] API Client Build Verification...
✅ API client check passed

🔒 [2/7] Secret Scanner...
✅ No secrets detected

🔨 [3/7] TypeScript Compilation Check...
  Checking Admin Portal...
✅ TypeScript compilation passed

📄 [4/7] JSON Syntax Validation...
✅ JSON syntax valid

🎨 [5/7] Linting Check (Biome)...
✅ Linting check complete (non-blocking)

🔍 [6/7] Common Mistake Detection...
✅ No critical mistakes detected

🔄 [7/7] Cross-Portal Impact Analysis...
✅ Impact analysis complete

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
✅ All Pre-Commit Checks Passed
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

⏱️  Validation completed in 18s

Next steps:
  1. Push to trigger pipeline: git push origin main
  2. Monitor build: https://dev.azure.com/ctn-demo/ASR/_build
  3. Verify deployment after ~2-3 minutes

Estimated pipeline success rate: 70% higher with these checks!
```

---

## Common Scenarios

### Scenario 1: Changing TypeScript in Admin Portal
```bash
vim admin-portal/src/pages/Dashboard.tsx
git add admin-portal/src/pages/Dashboard.tsx
git commit -m "feat: improve dashboard"
# Hook runs TypeScript check (~15s)
# If passes → Commit succeeds
# If fails → Fix errors, try again
```

### Scenario 2: Changing Shared Package
```bash
vim packages/api-client/src/endpoints/members.ts
cd packages/api-client && npm run build && cd ../..
git add packages/api-client/
git commit -m "feat: add new member endpoint"
# Hook warns: "SHARED CODE MODIFIED - Affects ALL portals"
# Commit succeeds with warning
```

### Scenario 3: Multiple Portal Changes
```bash
git add api/ admin-portal/ member-portal/
git commit -m "feat: cross-cutting feature"
# Hook warns: "MULTIPLE AREAS MODIFIED"
# Shows which pipelines will trigger
# Commit succeeds with warning
```

### Scenario 4: Docs-Only Change
```bash
vim README.md
git add README.md
git commit -m "docs: update README"
# Hook runs fast (~3s)
# Most checks skipped (no code changed)
# Commit succeeds
```

---

## Troubleshooting

### Hook not running
```bash
chmod +x .git/hooks/pre-commit
```

### "command not found: jq"
```bash
brew install jq  # macOS
```

### "command not found: npx"
```bash
node --version  # Should be 20.x
npm --version   # Should be 10.x
```

### Hook too slow
```bash
# Most time spent on TypeScript check
# To test without hook:
npm run typecheck -w admin-portal  # Manual check
git commit --no-verify  # Bypass (not recommended)
```

---

## Related Docs

- **Full Guide:** `docs/PRE_COMMIT_HOOK_GUIDE.md`
- **Failure Analysis:** `docs/PIPELINE_FAILURE_ANALYSIS_2025-11-16.md`
- **Summary:** `docs/BUILD_FAILURE_SUMMARY_2025-11-16.md`

---

## Statistics

**Recent Pipeline Failures (Nov 16, 2025):**
- 7 failed builds
- 5 of 7 were TypeScript errors (71%)
- 1 of 7 was config error (14%)
- 1 of 7 was test config (14%)

**With v3.0 Hook:**
- TypeScript errors: Prevented before commit
- Config errors: Caught by JSON validation
- Test config: Would be caught by TypeScript check

**Expected reduction:** 70% fewer failures

---

**Last Updated:** November 16, 2025
**Hook Version:** 3.0
**Maintainer:** DevOps Guardian
