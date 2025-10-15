# CLAUDE.md - CTN Association Register

**Last Updated:** October 15, 2025 (Added Autonomous Operation Guidelines + Mandatory Deployment Workflow)

---

## Way of Working

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

**Code Standards:**
- TypeScript for all API code (minimize `any` types)
- React + TypeScript for frontend
- ESLint + Prettier for code formatting
- Aikido for security scanning

### Testing Requirements

**Test Strategy:**
- **Unit Tests:** Required for critical business logic
- **E2E Tests:** Playwright for critical user journeys
- **Manual Testing:** Required before production deployment

**E2E Testing with Playwright:**
- Test files located in `web/e2e/`
- Run locally: `npm run test:e2e`
- Run in CI: Azure DevOps pipeline
- Test coverage builds incrementally with each release
- See `PLAYWRIGHT_SETUP.md` for setup instructions

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

**Agent Invocation Checklist:**
- [ ] **When encountering bugs** → Invoke TE (autonomous bug investigation with Playwright)
- [ ] After completing a feature → Invoke TE (tests), CR (review), TW (docs)
- [ ] After UI changes → Invoke DA (design review), TW (docs)
- [ ] Before committing security-sensitive code → Invoke SA (security)
- [ ] Before pull requests → Invoke CR (code), SA (security)
- [ ] After major work session → Invoke TW (update COMPLETED_ACTIONS.md)
- [ ] Before major release → Invoke TE (regression), SA (audit), DA (UX review)

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

**Purpose:** Creates and manages Playwright automated tests, autonomously investigates and fixes bugs

**When to Use:**
- ✅ **When bugs are encountered** - Invoke TE to investigate autonomously using Playwright
- After implementing new features
- Before major releases (regression testing)
- When test failures occur
- For TDD (write tests before implementation)

**Bug Investigation Workflow:**
When a bug is reported, the TE agent will:
1. Use Playwright to reproduce the bug (headed mode, console logging, network inspection)
2. Capture browser console errors, failed network requests, and stack traces
3. Create a failing test that reproduces the issue
4. Analyze the root cause using Playwright's debugging tools
5. Propose fix with test coverage
6. Verify fix with test suite
7. Document the bug and resolution

**Capabilities:**
- Autonomous bug investigation using Playwright debugging tools
- Captures console errors, network failures, and visual regressions
- Creates failing tests that reproduce bugs before fixing
- Builds ever-growing test library in `web/e2e/` directory
- Creates Playwright tests with TypeScript
- Executes tests across browsers, monitors console errors
- Integrates with Azure DevOps test management
- Performs regression testing before major releases

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
