# CLAUDE.md - CTN Association Register

**Last Updated:** October 16, 2025 (Added BUG-010 lessons learned: Pipeline quality checks and version.json generation)

---

## Way of Working

### Pre-Debugging Checklist - MANDATORY FIRST STEP

**BEFORE debugging ANY issue, ALWAYS check deployment status:**

```bash
# 1. Check last commit time
git log -1 --format="%ar - %s"

# 2. Check Azure DevOps last build
# Visit: https://dev.azure.com/ctn-demo/ASR/_build
# Compare timestamps: git commit time vs last successful build

# 3. If build is older than commit → DEPLOYMENT IS BROKEN
# Fix pipeline first, THEN debug code
```

**RED FLAGS (Fix deployment first, don't debug):**
- ❌ Last successful build is >1 hour old
- ❌ Git commit time doesn't match Azure build time
- ❌ Pipeline showing failed/red status
- ❌ Code changes not reflecting in production after "deployment"

**This check takes 30 seconds and saves hours of wasted debugging.**

---

### Autonomous Operation - CRITICAL

**Claude Code should work autonomously without asking for confirmation on obvious next steps.**

**Authorized to Continue Automatically:**
- ✅ After completing a task, proceed to the next logical step
- ✅ After fixing a bug, run tests to verify the fix
- ✅ After deployment, invoke TE agent for testing (per mandatory workflow)
- ✅ After testing, invoke TW agent for documentation (per mandatory workflow)
- ✅ When encountering errors, debug and fix them without asking permission
- ✅ When building/deploying, handle standard steps autonomously
- ✅ When a workflow has clear next steps, execute them

**DO NOT Ask:**
- ❌ "Do you want to continue? Yes/No" - The answer is YES
- ❌ "Should I proceed with the next step?" - YES, proceed
- ❌ "Would you like me to fix this?" - YES, fix it
- ❌ "Shall I run tests now?" - YES, run them
- ❌ "Do you want me to deploy?" - If it's part of the workflow, YES

**When to Ask for Confirmation:**
- ⚠️ Destructive operations (deleting production data, force-pushing to main)
- ⚠️ Major architectural changes that affect multiple systems
- ⚠️ Spending significant money (large Azure resource deployments)
- ⚠️ Security-sensitive operations (rotating production secrets, changing auth configs)
- ⚠️ When genuinely unclear about requirements or user intent

**Default Mindset:**
This is a **one-person operation**. You are working as an autonomous partner, not a step-by-step assistant. Execute workflows end-to-end, handle errors proactively, and only pause for genuinely critical decisions.

**Examples:**

✅ **Good (Autonomous):**
```
User: "Fix BUG-001"
Assistant: [Analyzes bug] → [Implements fix] → [Runs tests] → [Deploys if tests pass] → [Invokes TE for regression testing] → [Invokes TW to update docs] → "BUG-001 fixed, deployed, tested, and documented. Release readiness increased to 85%."
```

❌ **Bad (Too Many Confirmations):**
```
User: "Fix BUG-001"
Assistant: "I've analyzed the bug. Should I proceed with the fix? Yes/No"
User: "Yes"
Assistant: "Fix implemented. Should I run tests? Yes/No"
User: "Yes"
Assistant: "Tests passed. Should I deploy? Yes/No"
User: "Yes"
Assistant: "Deployed. Should I invoke TE agent? Yes/No"
[... frustrating cycle continues ...]
```

**This is persistent knowledge.** Work autonomously, follow established workflows, and make obvious decisions without asking permission.

---

### Development Workflow

**Branch Strategy:**
- Main branch: `main`
- Feature branches: `feature/descriptive-name`
- Create pull requests for significant changes
- Commit messages follow conventional commits format

**CRITICAL: Commit Frequently to Trigger Automatic Builds**
- **Commit after EVERY change** - don't batch changes
- Push to Azure DevOps immediately after each commit
- Azure DevOps triggers automatic builds on every push
- Automatic builds deploy to production within minutes
- **VERIFY deployment** before continuing with next feature
- This ensures user always sees latest code in browser
- Prevents "testing old code" scenarios (Oct 15, 2025 lesson)

**Commit Workflow:**
```bash
# After ANY code change:
git add -A
git commit -m "descriptive message"
git push origin main

# Wait ~2 minutes for Azure DevOps build
# Check build status: https://dev.azure.com/ctn-demo/ASR/_build
# Verify deployment succeeded before next change
```

**Benefits of Frequent Commits:**
- User always has latest code in browser
- Build failures detected immediately
- Easy to rollback if something breaks
- Clear history of what changed when
- Automatic deployment verification

**Code Standards:**
- TypeScript for all API code (minimize `any` types)
- React + TypeScript for frontend
- ESLint + Prettier for code formatting
- Aikido for security scanning
- **See `docs/CODING_STANDARDS.md` for complete naming conventions, date/timezone handling, and code organization standards**

### Testing Requirements

**Test Strategy:**
- **API Tests (FIRST):** Direct curl tests BEFORE UI testing
- **Unit Tests:** Required for critical business logic
- **E2E Tests:** Playwright for critical user journeys
- **Manual Testing:** Required before production deployment

**API Testing with curl - MANDATORY FIRST STEP:**
- **Test API endpoints BEFORE testing UI** to isolate issues
- Use curl to test:
  - Create operations (POST): Add KvK number, create contact, add member
  - Read operations (GET): List identifiers, get member details
  - Update operations (PUT): Change address, update identifier
  - Delete operations (DELETE): Clean up test data
- **Test pattern:**
  1. Create test data (save IDs from responses)
  2. Verify operations work via API
  3. Clean up: Delete all created test data
- **API tests catch 404/500 errors early** before UI testing
- Example test script: `api/tests/api-smoke-test.sh`

**E2E Testing with Playwright:**
- Test files located in `web/e2e/`
- Run locally: `npm run test:e2e`
- Run in CI: Azure DevOps pipeline
- Test coverage builds incrementally with each release
- See `PLAYWRIGHT_SETUP.md` for setup instructions
- **ONLY run after API tests pass** - don't waste time on UI if API is broken

### Deployment Procedures

**API Deployment:**
```bash
cd api
func azure functionapp publish func-ctn-demo-asr-dev --typescript --build remote
```

**Admin Portal Deployment:**
```bash
cd web
mv .env.local .env.local.backup
npm run build
npx @azure/static-web-apps-cli deploy ./build \
  --deployment-token <token> \
  --env production
mv .env.local.backup .env.local
```

**Database Migrations:**
```bash
psql "host=psql-ctn-demo-asr-dev.postgres.database.azure.com port=5432 \
  dbname=asr_dev user=asradmin sslmode=require" \
  -f database/migrations/XXX_migration.sql
```

### Production Deployment & Testing Workflow - MANDATORY

**CRITICAL:** After each big update or change, follow this workflow to ensure quality and prevent regression issues.

#### Step 1: Build and Deploy to Production

After completing a significant feature or update:

1. **Build Everything:**
   ```bash
   # Build API
   cd api
   npm run build

   # Build Frontend
   cd web
   npm run build
   ```

2. **Deploy to Azure Production:**
   ```bash
   # Deploy API
   cd api
   func azure functionapp publish func-ctn-demo-asr-dev --typescript --build remote

   # Deploy Admin Portal
   cd web
   mv .env.local .env.local.backup
   npx @azure/static-web-apps-cli deploy ./build \
     --deployment-token <token> \
     --env production
   mv .env.local.backup .env.local
   ```

3. **Verify Deployment:**
   - Check API is responding: https://func-ctn-demo-asr-dev.azurewebsites.net/api/v1
   - Check Admin Portal loads: https://calm-tree-03352ba03.1.azurestaticapps.net
   - Review deployment logs for any errors

#### Step 2: Invoke Test Engineer (TE) - MANDATORY

**IMMEDIATELY after deployment completes**, invoke the TE agent to:

1. **Test New Features Thoroughly:**
   - TE will create comprehensive Playwright tests for the new functionality
   - TE will test against the LIVE production environment
   - TE will verify all user journeys work end-to-end

2. **Add Test Cases to Test Battery:**
   - **CRITICAL:** New test cases MUST be added to the existing test suite in `web/e2e/`
   - This creates an ever-growing regression test library
   - Each release adds more tests, catching issues earlier
   - Test battery prevents regression bugs in production

3. **Run Full Regression Suite:**
   - TE will execute ALL existing tests to ensure nothing broke
   - This catches unintended side effects of the changes
   - Ensures backward compatibility

**TE Invocation Example:**
```
"Please invoke the TE agent to:
1. Test the new [feature name] functionality in production
2. Create comprehensive test cases and add them to the test battery
3. Run full regression suite to ensure no breaking changes"
```

#### Step 3: Invoke Technical Writer (TW) - MANDATORY

**After TE completes testing**, invoke the TW agent to:

1. **Update Documentation:**
   - Move completed tasks from ROADMAP.md to docs/COMPLETED_ACTIONS.md
   - Document any bugs found during testing
   - Update feature documentation if needed

2. **Re-evaluate Priorities:**
   - Assess remaining tasks in ROADMAP.md
   - Prioritize bug fixes discovered during testing

3. **Verify Repository Structure:**
   - Ensure root folder contains only 3 files
   - Confirm all documentation is properly organized

**TW Invocation Example:**
```
"Please invoke the TW agent to update documentation after testing completion"
```

#### Why This Workflow Matters

**Growing Test Coverage:**
- Each deployment adds new tests to the battery
- Regression issues are caught earlier with each release
- Test suite becomes comprehensive over time
- Reduces manual testing burden

**Quality Gates:**
- No feature goes live without automated test coverage
- Production deployments are verified immediately
- Documentation stays current with codebase

**Prevents Regression:**
- Old features are tested every time new features deploy
- Catches unintended breaking changes
- Ensures system stability over time

**One Command Away:**
After any major change, you should think:
```
Build → Deploy → Test (TE) → Document (TW)
```

This workflow is **MANDATORY** and should be followed **automatically** without needing to ask each time.

---

### Security Practices

**Secret Management:**
- All secrets stored in Azure Key Vault
- Never commit secrets to Git
- Use environment variables for configuration
- Follow SECRET_ROTATION_GUIDE.md for rotation procedures

**Authentication:**
- Azure AD for user authentication
- Role-based access control (RBAC)
- JWT tokens for API authentication
- RS256 for BDI token signing

**Code Security:**
- Aikido security scanning in CI pipeline
- Regular dependency updates
- Input validation on all endpoints
- SQL parameterized queries (never string concatenation)

### Git Practices

**Commit Guidelines:**
- Use descriptive commit messages
- Reference work items when applicable
- Keep commits focused and atomic
- Use co-authoring for pair programming:
  ```
  Co-Authored-By: Claude <noreply@anthropic.com>
  ```

**Before Committing:**
- Run build: `npm run build`
- Fix linting errors: `npm run lint`
- Run tests if available
- Review `git status` and `git diff`

### Credentials and Configuration File

**Location:** `.credentials` (in project root)

**Purpose:** Central repository for all Azure resources, secrets, deployment tokens, and quick reference commands. This file makes it easy to find credentials without searching through Azure Portal or Key Vault.

**Contents:**
- Azure Static Web Apps URLs and deployment tokens
- Azure Functions API URLs and names
- PostgreSQL database credentials (with multiple password sources)
- Azure AD authentication configuration
- Azure DevOps links
- Resource group and environment info
- Quick reference commands for deployment, logging, and database queries

**Security:**
- This file is `.gitignored` and **NEVER committed** to the repository
- Safe to store secrets locally for this development/playground environment
- Passwords come from both user-provided values and Azure Key Vault

**Usage:**
```bash
# View all credentials
cat .credentials

# Use in commands
source .credentials
export PGPASSWORD=$POSTGRES_PASSWORD
psql "$POSTGRES_CONNECTION_STRING"
```

**Maintenance:**
- Update this file when passwords change
- Add new resources as they're created
- Keep deployment tokens current
- Document any authentication issues in comments

**Note:** If you can't find a credential, **ALWAYS check `.credentials` first** before searching Azure Portal or Key Vault.

### Agent Invocation Workflow

**When to Invoke Agents:**

1. **When Bugs Are Encountered (IMMEDIATE):**
   - Test Engineer (TE) - Autonomously investigate and fix bugs using Playwright
   - TE will reproduce bug, capture errors, create failing test, propose fix
   - No need to manually check console logs or debug yourself

2. **After Significant Code Changes:**
   - Code Reviewer (CR) - Review code quality and best practices
   - Security Analyst (SA) - Check for security vulnerabilities
   - Technical Writer (TW) - Update documentation

3. **After UI/UX Changes:**
   - Design Analyst (DA) - Review interface design and accessibility
   - Technical Writer (TW) - Update UI documentation

4. **After Completing Features:**
   - Test Engineer (TE) - Create E2E tests for new functionality
   - Code Reviewer (CR) - Final code quality check
   - Technical Writer (TW) - Update feature documentation and COMPLETED_ACTIONS.md

5. **Before Pull Requests:**
   - Security Analyst (SA) - Security validation
   - Code Reviewer (CR) - Code quality review
   - Test Engineer (TE) - Ensure test coverage

6. **Before Major Releases:**
   - Test Engineer (TE) - Run full regression test suite
   - Security Analyst (SA) - Security audit
   - Design Analyst (DA) - UX/UI review

7. **Documentation Updates:**
   - Technical Writer (TW) - For any documentation changes, structure audits, or completed action tracking

8. **Database Changes (NEW):**
   - Database Expert (DE) - Before applying migrations, after schema changes, when performance issues arise
   - DE will review schema design, validate referential integrity, optimize queries
   - DE will maintain current DDL in `database/schema/current_schema.sql`

**Agent Invocation Checklist:**
- [ ] **When encountering bugs** → Invoke TE (autonomous bug investigation with Playwright)
- [ ] **Before database migrations** → Invoke DE (schema review, migration safety check)
- [ ] After completing a feature → Invoke TE (tests), CR (review), TW (docs), DE (if DB changes)
- [ ] After UI changes → Invoke DA (design review), TW (docs)
- [ ] Before committing security-sensitive code → Invoke SA (security)
- [ ] Before pull requests → Invoke CR (code), SA (security), DE (if DB changes)
- [ ] After major work session → Invoke TW (update COMPLETED_ACTIONS.md)
- [ ] Before major release → Invoke TE (regression), SA (audit), DA (UX review), DE (schema audit)
- [ ] After adding database queries → Invoke DE (query optimization)
- [ ] When performance issues reported → Invoke DE (analyze and optimize)

### Technical Writer (TW) Agent Workflow - MANDATORY

**CRITICAL:** The Technical Writer (TW) agent MUST be invoked automatically after completing ANY task from ROADMAP.md.

**TW Agent Responsibilities (Every Invocation):**

1. **Move Completed Tasks:**
   - Identify completed tasks from ROADMAP.md
   - Move them to `docs/COMPLETED_ACTIONS.md` with today's date
   - Maintain chronological order (most recent first)
   - Use concise, clear descriptions

2. **Re-evaluate Priorities:**
   - Review remaining tasks in ROADMAP.md
   - Re-assess priorities based on:
     - Security risks (CRITICAL)
     - Production stability (HIGH)
     - Code quality impact (MEDIUM)
     - Future enhancements (LOW)
   - Reorganize ROADMAP.md if priorities have shifted
   - Update "Last Updated" date

3. **Verify Repository Structure:**
   - **Root folder MUST contain ONLY 3 files:**
     - `README.md` - Main entry point
     - `CLAUDE.md` - Way of working (this file)
     - `ROADMAP.md` - Pending actions
   - **ALL other markdown files MUST be in `docs/` folder:**
     - `docs/COMPLETED_ACTIONS.md` - Historical record
     - `docs/DEPLOYMENT_GUIDE.md`
     - `docs/SECRET_ROTATION_GUIDE.md`
     - `docs/BDI_INTEGRATION.md`
     - `docs/testing/` - Testing documentation
     - `docs/archive/` - Historical documents
   - Move any misplaced files immediately

4. **Update Documentation:**
   - Ensure all cross-references are correct
   - Update links if files were moved
   - Verify markdown formatting is clean

**When to Invoke TW (Automatically):**
- ✅ **ALWAYS** after marking a ROADMAP.md task as complete
- ✅ **ALWAYS** after a significant work session ends
- ✅ **ALWAYS** when asked to "update documentation"
- ✅ **ALWAYS** before committing changes

**TW Invocation Pattern:**
```
User: "I've completed [task from ROADMAP.md]"
Assistant: "Great! Let me invoke the Technical Writer (TW) agent to:
1. Move this completed task to docs/COMPLETED_ACTIONS.md
2. Re-evaluate remaining task priorities
3. Verify repository structure
4. Update documentation links"
```

**One-Person Operation Note:**
Since this is a one-person project, the TW agent serves as your persistent memory and organizational assistant. It ensures nothing is forgotten and the repository stays clean and organized.

---

## MCP Server Integration

**CRITICAL: MCP Configuration Location**
- **Global MCP Config:** `/Users/ramondenoronha/.config/claude-code/mcp.json`
- **ALWAYS check this location** - not `~/Library/Application Support/Claude/`
- **Detailed Mapping:** `.claude/MCP_SERVER_MAPPING.md`

This project uses Model Context Protocol (MCP) servers to extend agent capabilities:

### Active MCP Servers

1. **playwright** (`@playwright/mcp`) - Browser automation and E2E testing
2. **chrome-devtools** (`chrome-devtools-mcp`) - Browser debugging and inspection
3. **icepanel** (`@icepanel/mcp-server`) - Architecture diagram generation

**Note:** BrowserMCPServer (`@agentdeskai/browser-tools-mcp`) is DISABLED as logs are not accessible in Claude Code environment.

### Agent → MCP Server Mapping

- **Test Engineer (TE)**: Uses `playwright`, `chrome-devtools` for testing and debugging
- **Design Analyst (DA)**: Uses `chrome-devtools` for UI inspection and accessibility checks
- **Security Analyst (SA)**: Uses `chrome-devtools` for security header analysis and auth testing
- **Technical Writer (TW)**: Uses `icepanel` for architecture diagram generation
- **Code Reviewer (CR)**: No MCP servers required (static analysis)
- **Database Expert (DE)**: No MCP servers required (direct database access)

**For complete MCP server documentation and usage guidelines, see `.claude/MCP_SERVER_MAPPING.md`**

---

## Agent Registry

### Code Reviewer (CR)
**File:** `.claude/agents/code-reviewer-cr.md`
**Color:** Yellow
**Model:** Sonnet

**Purpose:** Reviews code changes for quality, best practices, and maintainability

**When to Use:**
- After completing significant code changes
- Before creating pull requests
- When uncertain about code quality
- For security-sensitive code

**Capabilities:**
- Evaluates against SOLID principles, DRY, security best practices
- Integrates Aikido security scanning results
- Provides structured feedback (Critical Issues, Important Improvements, Suggestions)
- Checks performance, error handling, documentation completeness

---

### Security Analyst (SA)
**File:** `.claude/agents/security-analyst-sa.md`
**Color:** Red
**Model:** Sonnet

**Purpose:** Security validation of code changes before merging

**When to Use:**
- Before merging to main branch
- After modifying authentication/authorization code
- When touching database queries or user input handling
- After dependency updates

**Capabilities:**
- Scans for secrets and sensitive data exposure
- Checks authentication/authorization (IDOR, privilege escalation)
- Identifies injection vulnerabilities (SQL, XSS, SSRF, etc.)
- Reviews cryptography, dependencies, cloud/IaC configurations
- Provides merge gate recommendations (Approve/Block)

---

### Design Analyst (DA)
**File:** `.claude/agents/design-analyst-da.md`
**Color:** Green
**Model:** Sonnet

**Purpose:** Evaluates UI/UX quality and interface design

**When to Use:**
- After implementing new UI components
- When redesigning user workflows
- Before major frontend releases
- For accessibility compliance checks

**Capabilities:**
- Reviews visual hierarchy, consistency, accessibility (WCAG 2.1 AA)
- Checks responsive design, internationalization, dark mode
- Validates Kendo UI component usage
- Provides accessibility checklists and multi-language support analysis

---

### Test Engineer (TE) - Bug Hunter & Test Automation
**File:** `.claude/agents/test-engineer-te.md`
**Color:** Purple
**Model:** Sonnet

**Purpose:** Creates API tests (curl) and UI tests (Playwright), autonomously investigates and fixes bugs

**When to Use:**
- ✅ **When bugs are encountered** - Invoke TE to investigate autonomously
- ✅ **After deployment** - Run API tests FIRST, then UI tests
- After implementing new features
- Before major releases (regression testing)
- When test failures occur
- For TDD (write tests before implementation)

**Testing Workflow (MANDATORY ORDER):**
1. **API Tests FIRST (curl-based)**
   - Test all CRUD operations directly via API
   - Create test data, verify operations, clean up
   - Example: Add KvK number → Get identifier → Update metadata → Delete identifier
   - Saves test data IDs for cleanup phase
   - Catches 404/500 errors before UI testing
   - Creates reusable test scripts in `api/tests/`

2. **UI Tests SECOND (Playwright)**
   - Only run after API tests pass
   - Tests user workflows through browser
   - Verifies UI correctly calls API endpoints
   - Builds test battery in `web/e2e/`

**Bug Investigation Workflow:**
When a bug is reported, the TE agent will:
1. **Test API first** - Use curl to verify endpoint works
2. If API fails → Fix API, redeploy, test again
3. If API works → Use Playwright to reproduce UI bug
4. Capture console errors, network requests, stack traces
5. Create failing test that reproduces the issue
6. Analyze root cause using debugging tools
7. Propose fix with test coverage
8. Verify fix with test suite
9. Document the bug and resolution

**Capabilities:**
- **API Testing with curl:**
  - Direct endpoint testing (no browser needed)
  - Tests CRUD operations: Create, Read, Update, Delete
  - Cleanup scripts to remove test data
  - Faster than UI testing, isolates API issues
  - Creates bash scripts in `api/tests/` directory
- **UI Testing with Playwright:**
  - Autonomous bug investigation
  - Captures console errors, network failures, visual regressions
  - Creates failing tests that reproduce bugs before fixing
  - Builds ever-growing test library in `web/e2e/`
  - Executes tests across browsers
- **Integration:**
  - Integrates with Azure DevOps test management
  - Performs regression testing before major releases
  - Verifies API health checks, route registration

**Test Separation Philosophy:**
- API tests catch deployment issues (404 not found, 500 internal error)
- UI tests catch interface issues (buttons not working, forms broken)
- Test API FIRST to save time - don't test UI if API is broken
- This approach saved hours during Oct 15, 2025 deployment debugging

**You don't need to check console logs yourself** - the TE agent handles all debugging autonomously.

---

### Technical Writer (TW) - Documentation Gatekeeper
**File:** `.claude/agents/technical-writer-tw.md`
**Color:** Cyan
**Model:** Sonnet

**Purpose:** Maintains and organizes repository documentation, tracks completed actions, manages ROADMAP.md priorities

**When to Use (AUTOMATIC):**
- ✅ **ALWAYS** after completing ANY ROADMAP.md task
- ✅ **ALWAYS** after significant work sessions
- ✅ **ALWAYS** when documentation needs updating
- ✅ **ALWAYS** before committing changes

**Primary Responsibilities:**
1. Move completed tasks from ROADMAP.md to `docs/COMPLETED_ACTIONS.md`
2. Re-evaluate and reorganize ROADMAP.md priorities
3. Enforce root folder structure (only 3 files: README.md, CLAUDE.md, ROADMAP.md)
4. Maintain clean `docs/` folder organization
5. Update documentation cross-references

**Capabilities:**
- Tracks completed actions with dates
- Manages ROADMAP.md priorities (CRITICAL → HIGH → MEDIUM → LOW)
- Enforces repository structure rules
- Creates clear, concise technical documentation
- Verifies all markdown files are in correct locations

---

### Database Expert (DE)
**File:** `.claude/agents/database-expert-de.md`
**Color:** Blue
**Model:** Sonnet

**Purpose:** Database schema design review, query optimization, and DDL maintenance

**When to Use:**
- ✅ **Before applying database migrations** - Review migration for safety and performance
- ✅ **After major feature completion** - Ensure DDL is current in repository
- ✅ **When adding new database queries** - Optimize performance
- ✅ **Before major releases** - Full schema audit
- After modifying database-heavy code
- When performance issues are reported
- During schema design discussions
- When adding new tables/columns

**Primary Responsibilities:**
1. **Schema Design Review** - Evaluate normalization, data types, constraints, naming conventions, index strategy
2. **Referential Integrity** - Verify foreign keys, CASCADE/RESTRICT strategies, orphaned record prevention
3. **Query Optimization** - Analyze queries for performance, identify N+1 problems, review query plans
4. **DDL Management** - Generate current schema DDL from production, maintain `database/schema/current_schema.sql`
5. **Migration Review** - Review migrations before applying, check backward compatibility, validate rollback procedures

**Capabilities:**
- PostgreSQL-specific checks for Azure Flexible Server
- Schema review reports with strengths, issues, and recommendations
- Query optimization reports (before/after comparisons)
- Index analysis and recommendations
- Foreign key constraint validation
- Connection pooling and performance configuration review
- Integration with TE, SA, CR, TW agents for full workflow

**Deliverables:**
- Schema review reports documenting issues and fixes
- Updated `database/schema/current_schema.sql` (single source of truth)
- Query optimization recommendations with EXPLAIN ANALYZE results
- Migration safety analysis before applying changes

**File Locations:**
- `database/schema/current_schema.sql` - Current production DDL
- `database/migrations/` - Migration files
- `database/schema/erd.md` or `erd.png` - Entity-relationship diagrams
- `docs/database/schema_reviews/` - Schema review documentation

---

## Lessons Learned

### Input Validation is Critical
**What Happened:** Multiple debugging sessions due to missing input validation
**Why It Matters:** Prevents security vulnerabilities and runtime errors
**How to Avoid:** Always validate all user input at API endpoints before processing

### API Deployment Requires Correct Essential Imports
**What Happened:** API functions failed after deployment despite local success
**Why It Matters:** Remote build process requires explicit essential imports
**How to Avoid:** Check `api/src/functions/essential-index.ts` includes all new functions

### Authentication Headers Must Match Azure AD Configuration
**What Happened:** Admin portal API requests failed due to incorrect authentication headers
**Why It Matters:** Azure AD requires exact match between requested scope and API configuration
**How to Avoid:** Use correct API scope: `api://{client-id}/.default`

### Language Switcher Page Reloads Break UX
**What Happened:** Language changes caused full page reload, losing application state
**Why It Matters:** Poor user experience, loss of unsaved work
**How to Avoid:** Use i18n library state changes without page reload (implemented with react-i18next)

### Database Migrations Need Careful Planning
**What Happened:** Migration 011 (BDI) and 012 (International registries) required coordination
**Why It Matters:** Database schema changes affect multiple services
**How to Avoid:** Test migrations in dev environment first, coordinate with API deployments

### TypeScript 'any' Types Hide Bugs
**What Happened:** Runtime errors that TypeScript couldn't catch due to `any` usage
**Why It Matters:** Lost type safety benefits, harder to refactor
**How to Avoid:** Use proper types, interfaces, or `unknown` with type guards

### Test Artifacts Should Not Be Committed
**What Happened:** Playwright test reports and error contexts committed to Git
**Why It Matters:** Repository bloat, merge conflicts
**How to Avoid:** Add to `.gitignore`: `playwright-report/`, `test-results/`

### BDI Integration Requires Multiple Registry Identifiers
**What Happened:** Initial implementation only supported KvK numbers
**Why It Matters:** International companies need their local registry identifiers
**How to Avoid:** Design for international support from the start (EUID, LEI, HRB, etc.)

### Session Summaries Capture Critical Context
**What Happened:** Detailed session summaries helped reconstruct decisions weeks later
**Why It Matters:** Institutional knowledge preservation, onboarding new team members
**How to Avoid:** Always create session summaries after significant work

### Environment Variables Must Be Synced Across Environments
**What Happened:** Production deployment failed due to missing environment variables
**Why It Matters:** Runtime errors, security issues
**How to Avoid:** Maintain checklist of required env vars, validate before deployment

### Data Integrity Between Members and Legal Entities
**What Happened:** Members had `legal_entity_id` values but corresponding legal entity records didn't exist in the database
**Why It Matters:** Blocked users from managing identifiers, causing production errors and UI failures
**How to Avoid:**
- Add database foreign key constraints to prevent orphaned references
- Created migration 013 to ensure all members have legal entities
- Added UI fallback with "Create Legal Entity" button for edge cases
- Implement conditional UI rendering that checks for actual entity existence, not just ID presence

### CRITICAL: Always Check Deployment Status BEFORE Debugging (October 15, 2025)
**What Happened:** Spent entire day debugging 404/500 errors when the real issue was failed CI/CD deployments blocking all code changes
**Why It Matters:** Wasted 8+ hours fixing code that was never deployed, endless frustration testing non-existent changes
**How to Avoid:**
- **FIRST STEP:** Always check last successful build timestamp in Azure DevOps
- **RED FLAG:** If last build is >1 hour old, assume deployment is broken
- **DON'T DEBUG until deployment works** - no point fixing code that can't deploy
- Check: `git log -1` (last commit time) vs Azure DevOps last build time
- If they don't match → deployment is broken, fix pipeline first

### CI/CD Pipeline Failures Block All Deployments
**What Happened:** Biome lint checks were failing with exit code 1, blocking ALL deployments since morning (08:10)
**Why It Matters:** No code changes reached production all day despite multiple "deployments"
**How to Avoid:**
- Pipeline lint/quality checks should use `continueOnError: true`
- Monitor Azure DevOps build status, not just local builds
- Failed pipelines = production is frozen at last successful build
- Fix pipeline issues IMMEDIATELY, they block everything

### CRITICAL: Check package.json "main" Field for Actual Entry Point (October 15, 2025)
**What Happened:** Spent HOURS adding imports to `src/index.ts` when Azure was actually loading `src/essential-index.ts` (defined in package.json "main" field)
**Why It Matters:** Functions compiled correctly but NEVER loaded in production - wasted entire afternoon debugging the wrong file
**How to Avoid:**
- **FIRST STEP:** Check `package.json` "main" field to see which file is the entry point
- For this project: `"main": "dist/essential-index.js"` means we use `essential-index.ts`, NOT `index.ts`
- Add ALL function imports to the file specified in "main"
- Verify with `func azure functionapp list-functions` after deployment
- This cost us 4+ hours of debugging today

### API Functions Must Be Imported in Entry Point File to Register
**What Happened:** Identifier functions were compiled to dist/ but not imported in the CORRECT entry point file
**Why It Matters:** Functions existed in codebase but returned 404 in production
**How to Avoid:**
- Check `package.json` "main" field to find correct entry point (index.ts vs essential-index.ts vs production-index.ts)
- Add `import './functions/YourFunction'` to the CORRECT entry file
- Verify with `func azure functionapp list-functions` after deployment
- Missing imports = invisible functions in production

### Azure Functions v4 Lowercases All Route Parameters
**What Happened:** Routes defined as `{legalEntityId}` became `{legalentityid}` in Azure, code accessed wrong param name
**Why It Matters:** 400 Bad Request errors because `request.params.legalEntityId` was undefined
**How to Avoid:**
- **ALWAYS use lowercase route params:** `{legalentityid}` not `{legalEntityId}`
- Access params with lowercase: `request.params.legalentityid`
- This is Azure Functions v4 behavior, not configurable

### Unified CI/CD Pipeline for Related Components
**What Happened:** Admin portal, member portal, and API had separate/missing pipelines, causing deployment drift
**Why It Matters:** Frontend and backend can get out of sync, API changes don't deploy with UI changes
**How to Avoid:**
- Unified pipeline deploys web + API together (implemented Oct 15, 2025)
- Admin and member portals both deploy API now
- Infrastructure stays separate pipeline
- Ensures full-stack deployment consistency

### Test API FIRST with curl, Then Test UI with Playwright
**What Happened:** Endless 404/500 errors went undetected for hours because only UI was tested
**Why It Matters:** API failures cascade to UI, but UI tests don't catch API deployment issues. Testing UI when API is broken wastes time.
**How to Avoid:**
- **ALWAYS test API with curl BEFORE testing UI**
- Test pattern: Create test data → Verify operations → Clean up
- Example: Add KvK number via API → Verify it's saved → Delete it via API
- TE agent creates curl test scripts in `api/tests/` directory
- **Separation of concerns:**
  - API tests catch 404/500 errors, route registration issues, deployment failures
  - UI tests catch button clicks, form validation, user workflows
- Don't waste time testing UI if API is broken - test API first!
- This saves hours of debugging time and isolates issues faster

### Pipeline Quality Checks Must Use continueOnError (October 16, 2025)
**What Happened:** Biome lint found 242 errors + 109 warnings, exited with code 1, blocked ALL deployments since morning despite continueOnError: true in pipeline config
**Why It Matters:** Production frozen for 12+ hours, wasted time debugging when real issue was pipeline configuration
**Root Cause:**
- Azure DevOps continueOnError: true wasn't working as expected
- Quality check failures marked build as "partiallySucceeded"
- Deployment steps might have been skipped due to non-green status
**How to Avoid:**
- Keep quality checks simple with continueOnError: true
- Don't use || echo workarounds to hide exit codes
- Let failures be visible with proper reporting
- Quality checks should INFORM, not BLOCK
- Only actual build failures (npm run build) should prevent deployment
- Monitor "succeeded" vs "partiallySucceeded" status - only "succeeded" may trigger deployments reliably

### Version.json Must Be Generated During Build (October 16, 2025)
**What Happened:** version.json committed to git with old build info, never updated during pipeline execution, About page always showed old commit/timestamp
**Why It Matters:** Couldn't verify deployments were actually reaching production, About page showed "October 16, 08:10" all day despite multiple deployments
**How to Avoid:**
- Add scripts/generate-version.sh step BEFORE npm run build
- Use Azure DevOps environment variables: BUILD_BUILDNUMBER, BUILD_SOURCEVERSION, BUILD_TIMESTAMP
- Never commit version.json with actual build info - use template or generate dynamically
- Generate during build, not during local development

### CRITICAL: Method Binding Required for Azure Functions Request Methods (October 16, 2025)
**What Happened:** Spent 2 days debugging "Cannot read private member from an object whose class did not declare it" error when calling `request.json()` in Azure Functions handlers
**Why It Matters:** This cryptic error prevented ALL identifier creation/update operations. The error message didn't point to the real problem - method references lost their binding to the original request object.
**Root Cause:**
- Azure Functions v4 HttpRequest methods (`json()`, `text()`, `arrayBuffer()`) internally access the Headers object which has private members
- When passing method references directly (`json: request.json`), they lose binding to the original request
- Calling these unbound methods triggers "Cannot read private member" error
**How to Avoid:**
- **ALWAYS bind request methods** when creating wrapper objects in middleware:
  ```typescript
  // ❌ WRONG - Methods lose binding
  const wrappedRequest = {
    json: request.json,
    text: request.text
  };

  // ✅ CORRECT - Methods stay bound to original request
  const wrappedRequest = {
    json: request.json.bind(request),
    text: request.text.bind(request),
    arrayBuffer: request.arrayBuffer?.bind(request)
  };
  ```
- Files affected: `auth.ts`, `endpointWrapper.ts` - anywhere AuthenticatedRequest is created
- This fix resolved CreateIdentifier, UpdateIdentifier, and all other endpoints using request body parsing
- **Debug tip:** If you see "Cannot read private member" in Azure Functions, check method binding first

### Paginated API Response Parsing in Frontend (October 16, 2025)
**What Happened:** Identifiers were successfully saved to database via API but didn't display in frontend UI. Browser showed "No identifiers registered yet" despite data existing.
**Why It Matters:** Created silent failure - API worked perfectly, data was in database, but users couldn't see it. Two days of debugging wasted on API side when the bug was in frontend response parsing.
**Root Cause:**
- API returns paginated response format: `{ data: [items], pagination: {...} }`
- Frontend expected direct array: `[items]`
- Frontend tried to iterate over the paginated object, silently failed
- No error messages, just empty state in UI
**How to Avoid:**
- **Check API response structure** before writing frontend code
- When API uses pagination, extract the data array:
  ```typescript
  // ❌ WRONG - Tries to use paginated object as array
  const response = await axios.get<Identifier[]>('/identifiers');
  return response.data; // Returns {data: [], pagination: {}}

  // ✅ CORRECT - Extract data array from paginated response
  const response = await axios.get<{data: Identifier[]; pagination: any}>('/identifiers');
  return response.data.data; // Returns actual array
  ```
- File fixed: `web/src/services/apiV2.ts` line 286
- **Test both API and frontend** - don't assume frontend parses correctly just because API returns 200
- Use browser DevTools Network tab to inspect actual API response structure
- This pattern applies to all paginated endpoints: identifiers, contacts, endpoints, etc.

---

## Project Context

### What is CTN ASR?

The **Connected Trade Network Association Register (ASR)** is a member management system for organizations participating in the container transport ecosystem. It provides:

- Member onboarding and management
- Legal entity verification (KvK and international registries)
- API endpoint management
- **BDI Integration:** BVAD token generation and BVOD validation
- Admin and member portals

### Key Technologies

- **Frontend:** React 18, TypeScript, Kendo React UI
- **Backend:** Azure Functions (Node.js 20), TypeScript
- **Database:** PostgreSQL (Azure)
- **Storage:** Azure Blob Storage
- **Authentication:** Azure AD + RBAC
- **Testing:** Playwright for E2E, Jest for unit tests
- **CI/CD:** Azure DevOps Pipelines

### Azure Resources

- **Admin Portal:** https://calm-tree-03352ba03.1.azurestaticapps.net
- **Member Portal:** https://calm-pebble-043b2db03.1.azurestaticapps.net
- **API:** https://func-ctn-demo-asr-dev.azurewebsites.net/api/v1
- **Database:** psql-ctn-demo-asr-dev.postgres.database.azure.com
- **Resource Group:** rg-ctn-demo-asr-dev

---

## Documentation Structure

### Root Files (ONLY 3 Files Allowed)
- **README.md** - Main entry point for the repository
- **ROADMAP.md** - ALL pending actions (single source of truth)
- **CLAUDE.md** - This file (way of working, agent registry, lessons learned)

### docs/ Folder (ALL Other Documentation)
- `COMPLETED_ACTIONS.md` - Historical record of completed work (moved from root)
- `DEPLOYMENT_GUIDE.md` - Deployment procedures
- `SECRET_ROTATION_GUIDE.md` - Security practices
- `BDI_INTEGRATION.md` - BDI/BVAD/BVOD documentation
- `AUTH_FIX_INSTRUCTIONS.md` - Authentication troubleshooting
- `SESSION_SUMMARY_*.md` - Detailed session summaries
- `archive/` - Historical documentation

### Agent Definitions
- `.claude/agents/` - All agent configuration files

---

## Quick Reference

### Common Tasks

**View API Logs:**
```bash
func azure functionapp logstream func-ctn-demo-asr-dev
```

**Apply Database Migration:**
```bash
psql "host=psql-ctn-demo-asr-dev.postgres.database.azure.com port=5432 \
  dbname=asr_dev user=asradmin sslmode=require" \
  -f database/migrations/XXX_migration.sql
```

**Run Playwright Tests:**
```bash
cd web
npm run test:e2e
```

**Build API:**
```bash
cd api
npm run build
```

**Build Frontend:**
```bash
cd web
npm run build
```

### Troubleshooting

1. **API Functions Not Working After Deployment**
   - Check `api/src/functions/essential-index.ts` includes your function
   - Verify environment variables in Azure Portal
   - Check function logs: `func azure functionapp logstream`

2. **Authentication Errors in Admin Portal**
   - Verify API scope: `api://{client-id}/.default`
   - Check Azure AD app registration configuration
   - See `docs/AUTH_FIX_INSTRUCTIONS.md`

3. **Database Connection Issues**
   - Verify PostgreSQL password in Key Vault
   - Check Azure Function App Settings for connection string
   - Ensure IP whitelist includes Azure Function App outbound IPs

4. **Playwright Test Failures**
   - Check `web/e2e/MFA_WORKAROUND.md` for authentication issues
   - Review console logs for JavaScript errors
   - Use `--headed` mode for debugging: `npx playwright test --headed`

---

## Contact and Resources

- **Azure DevOps:** https://dev.azure.com/ctn-demo/ASR
- **Documentation:** `docs/` folder
- **Issue Tracking:** Azure DevOps work items
- **Agent Support:** Invoke specialized agents (CR, SA, DA, TE, TW) as needed

---

**Remember:** This file should be kept up-to-date as the project evolves. Update the agent registry when new agents are added, and capture lessons learned after significant debugging sessions or implementation challenges.
