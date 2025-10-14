# CLAUDE.md - CTN Association Register

**Last Updated:** October 14, 2025

---

## Way of Working

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

### Test Engineer (TE)
**File:** `.claude/agents/test-engineer-te.md`
**Color:** Purple
**Model:** Sonnet

**Purpose:** Creates and manages Playwright automated tests

**When to Use:**
- After implementing new features
- Before major releases (regression testing)
- When test failures occur
- For TDD (write tests before implementation)

**Capabilities:**
- Builds ever-growing test library in `web/e2e/` directory
- Creates Playwright tests with TypeScript
- Executes tests across browsers, monitors console errors
- Integrates with Azure DevOps test management
- Performs regression testing before major releases

---

### Technical Writer (TW)
**File:** `.claude/agents/technical-writer-tw.md`
**Color:** Cyan
**Model:** Sonnet

**Purpose:** Maintains and organizes repository documentation

**When to Use:**
- After completing features (document changes)
- When documentation is outdated
- For cleaning up misplaced documentation files
- When updating ROADMAP.md or COMPLETED_ACTIONS.md

**Capabilities:**
- Manages documentation structure (README.md, ROADMAP.md, COMPLETED_ACTIONS.md, CLAUDE.md)
- Organizes `docs/` folder
- Updates agent registry and lessons learned
- Creates clear, concise technical documentation with Mermaid diagrams

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

### Root Files (Governance)
- **README.md** - Main entry point
- **ROADMAP.md** - Next actions only (pending tasks)
- **COMPLETED_ACTIONS.md** - Historical record of completed work
- **CLAUDE.md** - This file (way of working, agent registry, lessons learned)

### docs/ Folder (Technical Documentation)
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
