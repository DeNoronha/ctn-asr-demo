# CLAUDE.md - CTN Association Register

**Last Updated:** October 25, 2025

---

## 🚨 CRITICAL - READ THIS ENTIRE FILE FIRST 🚨

**Claude Code: You MUST read this entire CLAUDE.md file before starting ANY work.**

If you're reading this, stop and read the entire file NOW. Do not proceed with any task until you've read all sections below.

---

## MANDATORY PRE-WORK CHECKLIST

**EVERY session, EVERY task - complete this checklist FIRST:**

```bash
# 1. READ CLAUDE.MD
cat CLAUDE.md  # Read the entire file

# 2. CHECK CURRENT BRANCH
git branch --show-current  # Must be on 'main' or feature branch

# 3. CHECK LATEST BUILD STATUS
git log -1 --format="%ar - %s"
# Compare to: https://dev.azure.com/ctn-demo/ASR/_build

# 4. SYNC WITH MAIN (if on feature branch)
git fetch origin
git status  # Check for uncommitted changes
```

**If you skip this checklist, you WILL make mistakes that waste hours.**

---

## Way of Working

### Pre-Debugging Checklist - MANDATORY

**BEFORE debugging, check deployment status:**
```bash
git log -1 --format="%ar - %s"
# Compare to Azure DevOps last build: https://dev.azure.com/ctn-demo/ASR/_build
```

**RED FLAGS (Fix deployment first):**
- Last successful build >1 hour old
- Git commit time ≠ Azure build time
- Pipeline failed/red status
- Code changes not reflected after deployment

---

### Autonomous Operation

**Work autonomously. Execute workflows end-to-end without asking for confirmation on obvious next steps.**

**Auto-approve:**
- Next logical steps in workflows
- Bug fixes, tests, deployments
- Standard build/deploy procedures
- Agent invocations (TE, TW, CR, SA, DE, DA)

**Ask only for:**
- Destructive operations (delete prod data, force-push main)
- Major architectural changes
- Significant cost implications
- Security-sensitive operations
- Unclear requirements

**Default:** One-person operation. Work as autonomous partner, not step-by-step assistant.

---

### Development Workflow

**Branch:** `main` (feature branches: `feature/descriptive-name`)

**CRITICAL: Commit Frequently**
```bash
git add -A
git commit -m "descriptive message"
git push origin main
# Wait ~2min, verify deployment: https://dev.azure.com/ctn-demo/ASR/_build
```

**Code Standards:** TypeScript, React, ESLint, Prettier, Aikido. See `docs/CODING_STANDARDS.md`.

**Testing:**
1. **API tests FIRST (curl)** - Catch 404/500 before UI testing
2. **E2E tests (Playwright)** - Only after API tests pass
3. Test pattern: Create → Verify → Clean up

**Deployment:**
- **API:** `func azure functionapp publish func-ctn-demo-asr-dev --typescript --build remote`
- **Frontend:** See deployment procedures section
- **Database:** `psql "host=..." -f database/migrations/XXX.sql`

**Post-Deployment Workflow (MANDATORY):**
```
Build → Deploy → Test (TE agent) → Document (TW agent)
```

---

### Security & Git Practices

**Secrets:** Azure Key Vault only, never commit to Git
**Auth:** Azure AD, RBAC, JWT (RS256 for BDI)
**Code:** Aikido scanning, input validation, parameterized queries
**Commits:** Descriptive messages, reference work items, atomic changes
**Credentials:** Check `.credentials` file first before searching Azure Portal

---

### Agent Invocation

**Auto-invoke agents:**
- **TE (Test Engineer)**: Bugs encountered, after deployment, before releases
- **TW (Technical Writer)**: After completing ROADMAP.md tasks, before commits
- **CR (Code Reviewer)**: Significant code changes, before PRs
- **SA (Security Analyst)**: Security-sensitive code, before merges
- **DE (Database Expert)**: Before migrations, DB schema changes, performance issues
- **DA (Design Analyst)**: UI/UX changes, accessibility checks

**Checklist:**
- Bugs → TE (autonomous investigation)
- Before DB migrations → DE (schema review)
- After features → TE, CR, TW, DE (if DB changes)
- Before PRs → CR, SA
- After ROADMAP.md completion → TW (MANDATORY)

---

## MCP Server Integration

**Config:** `/Users/ramondenoronha/.config/claude-code/mcp.json`
**Documentation:** `.claude/MCP_SERVER_MAPPING.md`

**Active Servers:**
- `@playwright/mcp` - E2E testing (TE)
- `chrome-devtools-mcp` - Browser debugging (TE, DA, SA)
- `@icepanel/mcp-server` - Architecture diagrams (TW)

---

## Agent Registry

### Code Reviewer (CR)
`.claude/agents/code-reviewer-cr.md` | Yellow | Sonnet

Reviews code quality, SOLID principles, security. Provides structured feedback (Critical/Important/Suggestions).

### Coding Assistant (CA)
`.claude/agents/coding-assistant-ca.md` | Blue | Sonnet

Feature development with IMPLEMENTATION_PLAN.md, TDD, incremental commits. 3-attempt rule, follows project conventions.

### Security Analyst (SA)
`.claude/agents/security-analyst-sa.md` | Red | Sonnet

Security validation: secrets, auth/authz, injections, dependencies. Merge gate recommendations.

### Design Analyst (DA)
`.claude/agents/design-analyst-da.md` | Green | Sonnet

UI/UX quality, WCAG 2.1 AA accessibility, responsive design, Kendo UI validation.

### Test Engineer (TE)
`.claude/agents/test-engineer-te.md` | Purple | Sonnet

**API tests (curl) FIRST**, then UI tests (Playwright). Autonomous bug investigation. Builds test battery in `api/tests/` and `web/e2e/`.

**Bug workflow:** Test API → Fix if needed → Reproduce in Playwright → Capture errors → Create failing test → Propose fix → Verify.

### Technical Writer (TW)
`.claude/agents/technical-writer-tw.md` | Cyan | Sonnet

**ROADMAP:** `~/Desktop/ROADMAP.md` (synced across devices)

**Auto-invoke:** After completing ROADMAP.md tasks, before commits

**Responsibilities:**
1. Move completed tasks to `docs/COMPLETED_ACTIONS.md`
2. Re-evaluate ROADMAP.md priorities
3. Enforce root structure (only README.md, CLAUDE.md)
4. Update documentation cross-references

### Database Expert (DE)
`.claude/agents/database-expert-de.md` | Blue | Sonnet

Schema review, query optimization, DDL management. Maintains `database/schema/current_schema.sql`. Review before migrations.

---

## Critical Lessons Learned

**For complete lessons with examples, see `docs/LESSONS_LEARNED.md`**

### Deployment & Pipeline
1. **Check deployment status BEFORE debugging** (saves hours) - When user reports "old version" or "missing features", this is a deployment sync issue, NOT a code issue. Run pre-work checklist step 3: compare `git log -1` to Azure DevOps last build. Solution: merge feature branches to main and push to trigger pipeline.
2. **Package.json "main" field** determines entry point (essential-index.ts vs index.ts)
3. **API functions must import in entry file** to register
4. **Pipeline quality checks** use continueOnError: true (inform, don't block)
5. **Version.json** generate during build with Azure DevOps variables

### Azure Functions
6. **Route params lowercased** in Azure Functions v4 (use `{legalentityid}`)
7. **Method binding required** for request.json(), request.text() in middleware
8. **Essential imports** required for remote build (api/src/functions/essential-index.ts)

### Frontend
9. **Paginated API responses** - Extract data array: `response.data.data`
10. **Vite environment variables** - Use process.env directly, not loadEnv() for CI/CD
11. **Vite define config** - Define individual vars, don't replace process.env object
12. **i18n HttpBackend + useSuspense = white page** - Don't use HttpBackend when translations are embedded in bundle. Set useSuspense: false to prevent React blocking.

### Testing & Data
13. **Test API FIRST with curl**, then UI with Playwright (isolates issues)
14. **Data integrity** - Add FK constraints to prevent orphaned references
15. **Input validation critical** at all API endpoints

### Code Quality
16. **TypeScript 'any' hides bugs** - Use proper types or unknown with guards
17. **Test artifacts** - Don't commit (add to .gitignore)

### Security (October 19, 2025)
18. **IDOR vulnerabilities in multi-tenant systems** - Authentication ≠ Authorization. Always verify party involvement before returning data. Return 404 (not 403) to prevent information disclosure. Log IDOR attempts with security_issue flag.
19. **Gremlin/NoSQL injection prevention** - Never concatenate user input into queries. Use parameterized queries with Gremlin traversal API. Deprecate unsafe functions like executeQuery().
20. **Environment variable validation at startup** - Validate all required credentials at module initialization. Fail fast with clear error messages. Check presence, format, and protocol (HTTPS).

### Pipeline & Deployment (October 20, 2025)
21. **Never test pipeline changes on main** - Always use feature branch + PR validation pipeline to catch issues before merge. 15+ failed builds = 2 hours wasted.
22. **Azure Static Web Apps ≠ Integrated Functions** - TypeScript Azure Functions must be deployed separately to Function App. Don't add `api_location` to Static Web App deployment.
23. **Service connection scope must match resources** - Query Azure DevOps for actual service connection names and verify scope (resource group vs subscription-wide). Don't guess names.
24. **Never include node_modules in deployment packages** - Remove node_modules before packaging, enable remote build (`SCM_DO_BUILD_DURING_DEPLOYMENT=true`). Package size: 560MB → 5MB.
25. **Query Azure resources, don't guess** - Use `az devops service-endpoint list`, `az functionapp list`, etc. to find actual names instead of guessing.

### Monorepo & Concurrent Development (October 22, 2025)
26. **NEVER run multiple Claude Code sessions in same monorepo** - Running two sessions concurrently causes commits to mix changes from different projects, triggering all pipelines on every push. Use feature branches or work sequentially.
27. **Mixed commits break pipeline path filters** - When Session A (admin portal) and Session B (booking portal) both push to main, ALL commits trigger ALL pipelines regardless of path filters, causing unnecessary deployments and potential conflicts.
28. **Evidence of concurrent session contamination:** Commit `5524301` (booking-portal pdf-parse fix) inadvertently included `web/src/react-dom-server-stub.js` and `web/vite.config.ts` from parallel session. ALWAYS work in separate branches if concurrent development is needed.

**See:** `docs/PIPELINE_PREVENTION_CHECKLIST.md` (comprehensive checklist), `docs/DEPLOYMENT_ARCHITECTURE_BOOKING_PORTAL.md` (architecture guide), `docs/BOOKING_PORTAL_PIPELINE_FIXES_2025-10-20.md` (detailed fixes)

### Deployment Troubleshooting (October 25, 2025)
29. **"Old version" in production = deployment sync issue, NOT code issue** - When user reports seeing old version or missing recent features (EUID, LEI, UI improvements), STOP debugging code. Run MANDATORY PRE-WORK CHECKLIST first. Check: (1) What branch are you on? (2) What's the last commit on main? (3) When was the last Azure pipeline run? (4) Are recent feature branches merged to main? Solution: `git checkout main` → `git merge feature/branch` → `git push origin main` → wait 2-3 minutes for pipeline. Wasted 60+ minutes debugging "404 errors" and trying manual deployments when the actual fix was a 3-command git workflow.

### Monorepo Workspace Management (October 25, 2025)
30. **ALWAYS regenerate package-lock.json after workspace changes** - When renaming folders referenced in root package.json workspaces (e.g., web/ → admin-portal/), you MUST regenerate package-lock.json or npm ci will fail in CI/CD pipelines. After updating package.json workspaces, run: `rm -f package-lock.json && npm install` to regenerate lockfile with correct workspace references. Symptom: "npm error code ENOENT" in Azure DevOps pipeline, "no such file or directory, open '/home/vsts/work/1/s/web/package.json'" even though workspace was updated to admin-portal/. Root cause: package-lock.json contains cached file paths that don't automatically update when package.json changes. Impact: Critical for monorepo builds - stale lockfile breaks CI/CD completely. Discovered during admin portal refactoring (October 25, 2025).

---

## Project Context

**CTN ASR** - Member management system for container transport ecosystem

**Tech Stack:** React 18 + TypeScript + Kendo UI | Azure Functions (Node.js 20) | PostgreSQL | Azure AD | Playwright

**Azure Resources:**
- Admin: https://calm-tree-03352ba03.1.azurestaticapps.net
- Member: https://calm-pebble-043b2db03.1.azurestaticapps.net
- API: https://func-ctn-demo-asr-dev.azurewebsites.net/api/v1
- DB: psql-ctn-demo-asr-dev.postgres.database.azure.com

---

## Documentation Structure

**Root:** README.md, CLAUDE.md only
**Desktop:** ~/Desktop/ROADMAP.md (synced, not in repo)
**docs/:** All other documentation, completed actions, guides
**.claude/agents/:** Agent configuration files

---

## Quick Reference

**View Logs:** `func azure functionapp logstream func-ctn-demo-asr-dev`
**Run Tests:** `cd web && npm run test:e2e`
**Build:** `cd api && npm run build` | `cd web && npm run build`

**Troubleshooting:**
- API 404 → Check essential-index.ts imports
- Auth errors → Verify scope: `api://{client-id}/.default`
- DB connection → Check .credentials file first
- Tests fail → Check web/e2e/MFA_WORKAROUND.md

**Resources:**
- Azure DevOps: https://dev.azure.com/ctn-demo/ASR
- Documentation: docs/ folder
- Credentials: .credentials file (gitignored)
