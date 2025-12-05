# Pre-Commit Hook Guide

## Overview

The CTN ASR pre-commit hook (v3.0) validates your code before committing to prevent Azure Pipeline failures. Based on analysis of recent pipeline failures, this hook prevents approximately **60-70% of build failures**.

**Location:** `.git/hooks/pre-commit`

**Target Execution Time:** Under 30 seconds

## What It Checks

### 1. API Client Build Verification (CHECK 1)
**Status:** BLOCKING

Ensures that when you modify `packages/api-client/src/`, the compiled `dist/` files are also staged.

**Why:** Prevents CI/CD failures due to outdated built files (Lesson #22 from Nov 14, 2025).

**If blocked:**
```bash
cd packages/api-client
npm run build
cd ../..
git add packages/api-client/dist/
git commit
```

### 2. Secret Scanner (CHECK 2)
**Status:** BLOCKING

Scans for hardcoded secrets, API keys, passwords, and sensitive files.

**Detected patterns:**
- Password/API key/secret assignments
- Bearer tokens
- AWS keys (AKIA...)
- OpenAI keys (sk-...)
- Slack tokens (xox...)
- Database connection strings
- Private keys (RSA, PEM)

**Blocked files:**
- `.env` (except `.env.example`, `.env.template`)
- `.credentials`
- Any file in BLOCKED_FILES list

**If blocked:**
1. Remove secrets from code
2. Use environment variables (`.env` locally, gitignored)
3. Use Azure Key Vault for production secrets
4. Update `.gitignore` if needed

**Bypass (NOT RECOMMENDED):**
```bash
git commit --no-verify
```

### 3. TypeScript Compilation (CHECK 3) - NEW
**Status:** BLOCKING

**Prevents:** 60% of recent pipeline failures

Runs TypeScript compilation check (`tsc --noEmit`) for changed workspaces:
- API
- Admin Portal
- Member Portal

**If blocked:**
```bash
# Check which workspace has errors
cd admin-portal  # or api, or member-portal
npm run typecheck

# Fix TypeScript errors, then commit
```

**Why it matters:** Recent failures (builds 1093, 1092, 1091, 1090, 1089) were all TypeScript compilation errors that reached the pipeline.

### 4. JSON Syntax Validation (CHECK 4) - NEW
**Status:** BLOCKING

Validates all modified `.json` files using `jq`.

**Common failures:**
- `package.json` syntax errors
- `tsconfig.json` errors
- `staticwebapp.config.json` errors (CSP, routing)
- Pipeline YAML that gets converted to JSON

**If blocked:**
```bash
# jq will show the exact line with the error
jq empty path/to/file.json
```

### 5. Linting Check (CHECK 5) - NEW
**Status:** NON-BLOCKING (warnings only)

Runs Biome linting on changed source files.

**Why non-blocking:** Matches pipeline behavior (`continueOnError: true`).

### 6. Common Mistake Detection (CHECK 6) - NEW
**Status:** BLOCKING for critical issues, WARNINGS for others

**Blocking issues:**
- `debugger` statements in production code
- Hardcoded `localhost:` URLs (use env vars)

**Warning issues (non-blocking):**
- `console.log` in production code
- Async functions without `await`

**If blocked:**
```bash
# Remove debugger statements
# Replace hardcoded URLs with environment variables:
const apiUrl = process.env.VITE_API_BASE_URL || 'http://localhost:7071';
```

### 7. Cross-Portal Impact Analysis (CHECK 7) - NEW
**Status:** INFORMATIONAL (warnings only)

Warns when:
- Shared code modified (`shared/`, `packages/`)
- Multiple portals modified in single commit

**Example output:**
```
⚠️  SHARED CODE MODIFIED - Affects ALL portals:
packages/api-client/src/endpoints/members.ts

This change will trigger:
  • API pipeline
  • Admin Portal pipeline
  • Member Portal pipeline

Ensure backward compatibility!
```

**Why it matters:** Prevents Lesson #21 (mixed commits triggering all pipelines).

## Execution Flow

```
COMMIT ATTEMPT
    ↓
[1/7] API Client Build Check
    ↓ (pass)
[2/7] Secret Scanner
    ↓ (pass)
[3/7] TypeScript Compilation ← PREVENTS 60% OF FAILURES
    ↓ (pass)
[4/7] JSON Syntax Validation ← PREVENTS 10% OF FAILURES
    ↓ (pass)
[5/7] Linting Check (Biome)
    ↓ (warnings only)
[6/7] Common Mistakes
    ↓ (pass)
[7/7] Cross-Portal Impact
    ↓ (warnings only)
SUCCESS - Commit Allowed
```

## Performance

**Typical execution times:**
- No TypeScript changes: **5-8 seconds**
- TypeScript changes (1 portal): **15-20 seconds**
- TypeScript changes (all portals): **25-30 seconds**

**Optimization:** Checks are skipped when not applicable:
- No TS files changed → Skip TypeScript check
- No JSON files changed → Skip JSON validation
- No source files → Skip linting

## Troubleshooting

### Hook not running
```bash
# Ensure hook is executable
chmod +x .git/hooks/pre-commit

# Verify it exists
ls -la .git/hooks/pre-commit
```

### "command not found: jq"
```bash
# macOS
brew install jq

# Ubuntu/Debian
sudo apt-get install jq
```

### "command not found: npx"
```bash
# Ensure Node.js is installed and in PATH
node --version
npm --version

# If missing, install Node.js 20
```

### TypeScript check too slow
The hook uses `--skipLibCheck` to speed up compilation. If still slow:
```bash
# Option 1: Update tsconfig.json
{
  "compilerOptions": {
    "incremental": true,  # Faster subsequent checks
    "skipLibCheck": true
  }
}

# Option 2: Bypass hook (NOT RECOMMENDED)
git commit --no-verify
```

### False positive on secrets
If the hook incorrectly flags something as a secret:

1. **Check the pattern** - Is it actually sensitive?
2. **Update the hook** - Modify PATTERNS array in `.git/hooks/pre-commit`
3. **Use bypass** (last resort):
   ```bash
   git commit --no-verify
   ```

## Integration with Pipeline

The pre-commit hook mirrors pipeline checks:

| Hook Check | Pipeline Stage | Pipeline Behavior |
|------------|----------------|-------------------|
| API Client Build | N/A | Assumes dist/ is committed |
| Secret Scanner | Trivy Secret, Gitleaks | BLOCKING |
| TypeScript | Build step | BLOCKING |
| JSON Syntax | Build step | BLOCKING (implicit) |
| Linting | Biome check | NON-BLOCKING (`continueOnError: true`) |
| Common Mistakes | N/A | Caught during build/runtime |
| Impact Analysis | Path filters | Determines which pipelines trigger |

## Version History

### v3.0 (November 16, 2025)
- Added TypeScript compilation check (prevents 60% of failures)
- Added JSON syntax validation
- Added Biome linting check
- Added common mistake detection
- Added cross-portal impact analysis
- Enhanced output formatting

### v2.0 (November 14, 2025)
- Added API Client build verification

### v1.0 (October 18, 2025)
- Initial secret scanner implementation

## Related Documentation

- **Pipeline Failure Analysis:** `docs/PIPELINE_FAILURE_ANALYSIS_2025-11-16.md`
- **Lessons Learned:** `docs/LESSONS_LEARNED.md`
- **CLAUDE.md:** Root project guide
- **Pipeline Configs:**
  - `.azure-pipelines/asr-api.yml`
  - `.azure-pipelines/admin-portal.yml`
  - `.azure-pipelines/member-portal.yml`

## Statistics

Based on analysis of builds from November 16, 2025:

- **Total builds analyzed:** 20
- **Failed builds:** 7 (35%)
- **Partially succeeded:** 10 (50%)
- **Successful builds:** 3 (15%)

**With enhanced pre-commit hook:**
- **Estimated prevention rate:** 60-70%
- **TypeScript check alone:** Prevents 60% (5 of 7 failed builds)
- **JSON validation:** Prevents 10% (1 of 7 failed builds)
- **Secret scanning:** Already working (0 secret-related failures in sample)

**Expected new failure rate:** 10-15% (infrastructure issues, dependency vulnerabilities)

## Tips

1. **Run checks manually before commit:**
   ```bash
   # TypeScript
   npm run typecheck -w admin-portal

   # Linting
   npm run lint -w admin-portal

   # Build (includes all checks)
   npm run build -w admin-portal
   ```

2. **Test hook without committing:**
   ```bash
   # Stage files
   git add .

   # Run hook manually
   .git/hooks/pre-commit

   # If it passes, commit
   git commit -m "message"
   ```

3. **Skip hook for urgent fixes:**
   ```bash
   git commit --no-verify -m "hotfix: urgent production issue"
   # ONLY use for genuine emergencies
   ```

4. **Monitor pipeline success:**
   After pushing, check:
   - https://dev.azure.com/ctn-demo/ASR/_build
   - Verify build turns green within 2-3 minutes

## Contributing

If you find a false positive or want to add a check:

1. Edit `.git/hooks/pre-commit`
2. Test thoroughly
3. Update this guide
4. Share with team

**Note:** `.git/hooks/` is not tracked in git. To share updates:
1. Create a template in `scripts/pre-commit.template`
2. Add installation instructions to README
3. OR: Use `git config core.hooksPath .githooks/` and track hooks in repo
