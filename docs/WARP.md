# WARP.md

This file provides guidance to WARP (warp.dev) when working with code in this repository.

**Repository Path:** `/Users/ramondenoronha/Dev/DIL/DEV-CTN-ASR`

---

## Prerequisites

- Node.js 20.x
- Azure CLI (for deployment operations)
- PostgreSQL client (for database operations)
- Access to Azure subscription (for production deployments)

---

## Essential Commands

### Development

```bash
# Install dependencies (from root)
npm install

# Start development servers
cd admin-portal && npm start           # Admin Portal (Vite dev server)
cd member-portal && npm start          # Member Portal (Vite dev server)
cd api && npm start                    # API (Azure Functions Core Tools)

# Build for production
cd admin-portal && npm run build       # TypeScript check + Vite build
cd member-portal && npm run build      # TypeScript check + Vite build
cd api && npm run build                # TypeScript compile + copy templates/openapi.json
```

### Code Quality

```bash
# Type checking
cd admin-portal && npm run typecheck
cd member-portal && npm run typecheck

# Linting (Biome)
cd admin-portal && npm run lint
cd admin-portal && npm run lint:fix
cd admin-portal && npm run format

# Security audits
cd admin-portal && npm run security:audit
cd admin-portal && npm run security:summary

# Combined review (lint + security)
cd admin-portal && npm run review
```

### Testing

```bash
# E2E Tests (Playwright) - Root level (multi-portal)
npx playwright test                              # All portals
npx playwright test --project=setup              # Re-authenticate
npx playwright test --project=admin-portal       # Admin portal only
npx playwright test --project=member-portal      # Member portal only
npx playwright test --ui                         # Interactive UI mode
npx playwright test --headed                     # See browser
npx playwright show-report                       # View last test report

# E2E Tests - Portal specific
cd admin-portal && npm run test:e2e
cd admin-portal && npm run test:e2e:ui
cd admin-portal && npm run test:e2e:report

# Unit Tests (Vitest - Admin Portal only)
cd admin-portal && npm test
cd admin-portal && npm run test:ui
cd admin-portal && npm run test:coverage
```

### Database Operations

```bash
# Apply migration
psql "host=psql-ctn-demo-asr-dev.postgres.database.azure.com port=5432 \
  dbname=asr_dev user=asradmin sslmode=require" \
  -f database/migrations/XXX_migration_name.sql

# Extract current schema
pg_dump \
  -h psql-ctn-demo-asr-dev.postgres.database.azure.com \
  -p 5432 \
  -U asradmin \
  -d asr_dev \
  --schema-only \
  --no-owner \
  --no-privileges \
  --no-tablespaces \
  -f database/schema/current_schema.sql
```

### Deployment

```bash
# Deploy API to Azure Functions
cd api
func azure functionapp publish func-ctn-demo-asr-dev --typescript --build remote

# View API logs
func azure functionapp logstream func-ctn-demo-asr-dev

# Check deployment sync (run BEFORE debugging)
./scripts/quick-check.sh

# Full deployment verification (run AFTER commits)
./scripts/verify-deployment-sync.sh
./scripts/verify-deployment-sync.sh --skip-build-check  # If Azure CLI unavailable
```

---

## Architecture Overview

### Monorepo Structure

This is a **monorepo** containing multiple independent applications with different architectures:

```
DEV-CTN-ASR/
├── api/                    # Central ASR API (Azure Functions, shared by Admin + Member)
├── admin-portal/           # Admin Portal (React + Mantine + MSAL)
├── member-portal/          # Member Portal (React + Mantine + MSAL)
├── packages/
│   └── api-client/        # Shared API client package
│   └── vite-config-base/  # Shared Vite configuration
├── shared/                # Shared utilities
├── database/              # PostgreSQL schema + migrations
├── infrastructure/        # Azure Bicep templates
├── tests/                 # Shared Playwright auth setup
├── scripts/               # Deployment verification scripts
└── .azure-pipelines/      # CI/CD pipeline definitions

Note: DocuFlow (booking-portal) and Orchestration Register (orchestrator-portal)
extracted to separate repositories on November 11, 2025.
```

### Application Architecture

**ASR (Association Register)**
- **Folders:** `api/`, `admin-portal/`, `member-portal/`, `packages/`, `shared/`
- **Backend:** Azure Functions API (`func-ctn-demo-asr-dev`)
- **Database:** PostgreSQL (`psql-ctn-demo-asr-dev`)
- **Pipelines:** `asr-api.yml`, `admin-portal.yml`, `member-portal.yml`
- **Coupling:** Tightly integrated (API changes trigger portal rebuilds)
- **Shared Code:** `packages/api-client/` used by both portals

### Technology Stack

**Frontend:**
- React 18.3.1 + TypeScript 5.9.3
- UI Library: Mantine v8.3.6 (admin, member portals)
- Build Tool: Vite 7.1.10
- State Management: React Context + hooks
- Data Tables: mantine-datatable 8.2.0
- Authentication: Azure AD (MSAL)
  - Admin: @azure/msal-browser 4.x + @azure/msal-react 3.x
  - Member: @azure/msal-browser 3.x + @azure/msal-react 2.x

**Backend (ASR API):**
- Azure Functions v4 (Node.js 20 + TypeScript)
- Authentication: Azure AD JWT (RS256 for BDI)
- Database: PostgreSQL 14 (Azure Flexible Server)
- Storage: Azure Blob Storage
- AI: Azure Document Intelligence

**Development Tools:**
- Linting: Biome 1.9.4
- Testing: Playwright 1.56 (E2E), Vitest 4.0 (unit tests - admin only)
- Security: Aikido scanning, npm audit
- CI/CD: Azure DevOps Pipelines

---

## Pipeline Architecture

### Trigger Rules

**ASR API Pipeline** (`asr-api.yml`):
- Triggers on: `api/**` changes
- Excludes: `booking-portal/**`, `orchestrator-portal/**`, `docs/**`
- Deploys: Azure Functions API
- Then triggers: Admin + Member portal pipelines

**Admin Portal Pipeline** (`admin-portal.yml`):
- Triggers on: `admin-portal/**` changes OR triggered by ASR API pipeline
- Excludes: All other portal folders
- Verifies: ASR API health before build
- Deploys: Azure Static Web App (admin only)

**Member Portal Pipeline** (`member-portal.yml`):
- Triggers on: `member-portal/**` changes OR triggered by ASR API pipeline
- Excludes: All other portal folders
- Verifies: ASR API health before build
- Deploys: Azure Static Web App (member only)

**Pipeline Isolation:**
- Admin and Member portals have independent pipelines
- Changes to one portal do NOT trigger the other
- Path filters ensure correct pipeline triggering

### Git Workflow

**CRITICAL:** All work happens directly on `main` branch. NO feature branches allowed.

**Rationale:** After multiple Git disasters from branch management in monorepo (October 26, 2025), all development now happens on main. Commit frequently, push regularly.

**Workflow:**
1. Run `./scripts/quick-check.sh` BEFORE starting work (verify sync)
2. Make changes directly on main
3. Commit frequently with descriptive messages
4. Push to origin/main
5. Wait ~2 minutes for pipeline
6. Run `./scripts/verify-deployment-sync.sh` to ensure deployment
7. Test APIs with curl (BEFORE testing UI)

---

## Key Architectural Patterns

### Authentication Flow

**Frontend (Admin/Member Portals):**
- Azure AD authentication via MSAL
- Scopes: `api://{client-id}/.default`
- Token acquisition → Attach to API requests

**Backend (API):**
- JWT validation middleware
- Azure AD token verification
- Role-Based Access Control (RBAC)
- Multi-tenant data isolation validation (CRITICAL for security)

### API Structure

**Entry Points:**
- `api/src/index.ts` - Main entry point
- `api/src/essential-index.ts` - Essential functions (used by package.json "main" field)
- Functions must be imported in entry file to register with Azure Functions runtime

**Middleware:**
- Located in `api/src/middleware/`
- Applied to functions for auth, logging, rate limiting
- Method binding required for `request.json()`, `request.text()`

**Route Params:**
- Azure Functions v4 lowercases route parameters
- Use `{legalentityid}` not `{legalEntityId}` in function.json

### Frontend Architecture

**Build Configuration:**
- Vite config uses `process.env` directly for environment variables
- Do NOT use `loadEnv()` pattern for CI/CD
- Define individual vars in `vite.config.ts`, don't replace `process.env` object

**Paginated API Responses:**
- Extract data array: `response.data.data`
- Backend returns: `{ data: [...], pagination: {...} }`

**i18n Configuration:**
- Do NOT use `i18next-http-backend` when translations are embedded in bundle
- Set `useSuspense: false` to prevent React blocking and white page errors

**Mantine DataTable Patterns:**
- Use `useDataTableColumns` hook for column toggle/resize/persistence
- Controlled pagination requires manual data slicing: `records={data.slice(from, to)}`
- Calculate `from = (page - 1) * pageSize`, `to = from + pageSize`
- Enable persistence: `storeColumnsKey="portal-grid-name"`

### Database Management

**Schema:**
- Single source of truth: `database/schema/current_schema.sql`
- Update after applying changes, before production deployment
- Migration files in `database/migrations/` (numbered sequentially)

**Best Practices:**
- Use foreign key constraints to prevent orphaned references
- Parameterized queries only (prevent SQL/Gremlin injection)
- Input validation at all API endpoints
- Always verify party involvement before returning data (prevent IDOR vulnerabilities)

---

## Testing Strategy

### Testing Hierarchy (CRITICAL ORDER)

**1. API Tests FIRST (curl)**
- Catch 404/500 errors before UI testing
- Isolates backend issues from frontend
- Example: `curl https://func-ctn-demo-asr-dev.azurewebsites.net/api/health`

**2. E2E Tests SECOND (Playwright)**
- Only after API tests pass
- Shared auth setup in `tests/auth.setup.ts`
- Test credentials: `test-e2@denoronha.consulting` (MFA excluded)

**3. Unit Tests (Vitest - Admin Portal only)**
- Component-level testing
- Run with `npm test`

### Playwright Configuration

**Multi-Portal Setup:**
- Root `playwright.config.ts` - Multi-portal configuration
- Shared auth: `tests/auth.setup.ts` → `playwright/.auth/user.json`
- Portal-specific configs: `{portal}/playwright.config.ts`

**Test Credentials:**
- Email: `test-e2@denoronha.consulting`
- Password: `Madu5952`
- Role: SystemAdmin
- Object ID: `7e093589-f654-4e53-9522-898995d1201b`
- MFA: Excluded (for automated testing)

**Common Issues:**
- If tests fail with auth errors → Run `npx playwright test --project=setup`
- Session expires → Re-run auth setup
- Tests pass locally but fail in CI → Check environment variables

---

## Security Practices

### Secrets Management
- **Azure Key Vault ONLY** - Never commit secrets to Git
- Check `.credentials` file first before searching Azure Portal
- Store secrets as environment variables in commands
- Never reveal or consume secrets in plain-text in terminal commands

### Authentication & Authorization
- Authentication ≠ Authorization
- Always verify party involvement before returning data (multi-tenant isolation)
- Return 404 (not 403) to prevent information disclosure
- Log IDOR attempts with `security_issue` flag

### Code Security
- No TypeScript `any` (use proper types or `unknown` with guards)
- Input validation at all API endpoints
- Parameterized queries (no string concatenation)
- Content Security Policy (CSP) hardening:
  - Admin/Member: `script-src 'self'` (no unsafe-inline, no unsafe-eval)
  - `style-src 'self' 'unsafe-inline'` (for Mantine components)

### Security Scanning
- Aikido scanning in pipelines
- npm audit before commits
- Biome linting includes security checks

---

## Common Issues & Solutions

### Deployment Problems

**"Old version in production" / "Missing features"**
- **NOT a code issue** - Deployment sync issue
- Run: `./scripts/quick-check.sh`
- Check: Last commit time vs Azure DevOps last build time
- Solution: Push latest commits to trigger pipeline

**"Members not showing" / "Dashboard shows 0 data"**
- **NOT a frontend issue** - API deployment issue
- Check API health FIRST: `curl https://func-ctn-demo-asr-dev.azurewebsites.net/api/health`
- If 404/empty → API not deployed
- Solution: `cd api && func azure functionapp publish func-ctn-demo-asr-dev --typescript --build remote`

**Pipeline shows green ✅ but API not working**
- Azure Functions deployment can silently fail
- Always verify API health endpoint after deployment
- Check Function App logs: `func azure functionapp logstream func-ctn-demo-asr-dev`

### Build Errors

**"Module not found" in Azure Pipeline**
- Root cause: Stale `package-lock.json` after workspace changes
- Solution: `rm -f package-lock.json && npm install` (regenerate lockfile)

**API 404 errors**
- Check `api/src/essential-index.ts` - function must be imported
- Check `api/package.json` - "main" field determines entry point
- Check route params - Azure Functions v4 lowercases params: use `{legalentityid}`

### Frontend Errors

**White page / React not rendering**
- Check i18n config - `useSuspense: false` if translations are embedded
- Check browser console for CSP violations
- Check MSAL config - scopes must match API

**Cascading failures hiding functionality**
- Each API call in useEffect needs separate try-catch
- One failing resource should NOT block other resources
- Use graceful degradation (empty arrays, null states)

### Error Handling Pattern

**BAD (cascading failure):**
```typescript
try {
  const data1 = await getEndpoints();  // Throws on 404
  const data2 = await getKvKRegistry(); // Never runs
} catch (error) {
  console.error("Failed to load data"); // Generic error hides real issue
}
```

**GOOD (isolated errors):**
```typescript
try {
  const data1 = await getEndpoints();
  setEndpoints(data1);
} catch (error) {
  console.error("Failed to load endpoints:", error);
  setEndpoints([]); // Fallback
}

try {
  const data2 = await getKvKRegistry();
  setRegistry(data2);
} catch (error) {
  console.error("Failed to load KvK registry:", error);
  setRegistry([]); // Fallback
}
```

---

## Documentation Resources

### Essential Files
- **README.md** - Quick start, Azure resources, common commands
- **CLAUDE.md** - Comprehensive way of working, agent registry, lessons learned (38,000+ lines)
- **~/Desktop/ROADMAP.md** - Next actions and priorities (NOT in repo, synced across devices)
- **docs/COMPLETED_ACTIONS.md** - Historical record of completed work
- **docs/DEPLOYMENT_GUIDE.md** - Deployment instructions and troubleshooting
- **docs/LESSONS_LEARNED.md** - Detailed lessons with examples
- **docs/MANTINE_LLMS.txt** - Complete Mantine UI documentation (79,408 lines)
- **docs/MANTINE_DATATABLE_REFERENCE.md** - mantine-datatable component reference

### Azure Resources

**Front Door URLs (with WAF):**
- Admin: https://admin-ctn-dev-gma8fnethbetbjgj.z02.azurefd.net
- Member: https://portal-ctn-dev-fdb5cpeagdendtck.z02.azurefd.net

**Direct URLs (Static Web Apps):**
- Admin: https://calm-tree-03352ba03.1.azurestaticapps.net
- Member: https://calm-pebble-043b2db03.1.azurestaticapps.net
- Orchestrator: https://blue-dune-0353f1303.1.azurestaticapps.net

**Backend:**
- API: https://func-ctn-demo-asr-dev.azurewebsites.net/api/v1
- Database: psql-ctn-demo-asr-dev.postgres.database.azure.com
- Azure DevOps: https://dev.azure.com/ctn-demo/ASR

---

## Best Practices from CLAUDE.md

### Pre-Work Checklist (MANDATORY)

Run BEFORE starting ANY work:
```bash
# 1. Check current branch
git branch --show-current  # MUST be on 'main'

# 2. Check latest build status
git log -1 --format="%ar - %s"
# Compare to: https://dev.azure.com/ctn-demo/ASR/_build

# 3. Verify clean status
git status
```

### Commit Workflow

1. Work directly on main (no feature branches)
2. Commit frequently with descriptive messages
3. Push regularly: `git push origin main`
4. Wait ~2 minutes for pipeline
5. Verify deployment: `./scripts/verify-deployment-sync.sh`
6. Test APIs with curl (before UI testing)

### Code Quality Standards

- TypeScript strict mode (no `any` - use proper types or `unknown` with guards)
- Biome 1.9.4 for linting and formatting
- Input validation at all entry points (use Zod schemas)
- Proper error boundaries and fallbacks
- Accessibility (WCAG 2.1 AA) for all UI components
- Parameterized SQL queries only (never string concatenation)

### Naming Conventions

**Database:**
- Tables: `snake_case` (e.g., `legal_entity`, `endpoint_authorization`)
- Columns: `snake_case` with consistent prefixes (e.g., `kvk_document_url`, `kvk_verification_status`)
- Timestamps: `dt_created`, `dt_modified` (always `TIMESTAMP WITH TIME ZONE`)

**API:**
- Routes: `kebab-case` (e.g., `/v1/legal-entities/{legalEntityId}`)
- Route params: `camelCase` but accessed lowercase (e.g., `request.params.legalentityid`)
- Query params: `snake_case` (e.g., `?task_type=kvk_verification`)

**TypeScript:**
- Variables/Functions: `camelCase`
- Interfaces/Types: `PascalCase`
- Constants: `UPPER_SNAKE_CASE`
- Files: Functions `PascalCase.ts`, Components `PascalCase.tsx`, Utilities `camelCase.ts`

### Date/Time Handling

**Database:**
- Always use `TIMESTAMP WITH TIME ZONE` (stored as UTC, auto-converts)
- Never use `TIMESTAMP WITHOUT TIME ZONE`

**API Responses:**
- Return ISO 8601 format with UTC: `"2025-10-16T14:30:00.000Z"`
- Never return ambiguous formats or dates without timezone

**Frontend:**
- Use centralized `dateUtils.ts` utilities
- Never hardcode locale strings (use `getUserLocale()`)
- Show timezone info for absolute timestamps, relative time for recency

---

## Critical Anti-Patterns (DON'T DO THESE)

### Deployment & Testing
1. **NEVER assume code is deployed** - Always run `./scripts/quick-check.sh` before debugging
2. **NEVER skip API testing** - Test with curl BEFORE testing UI (isolates issues)
3. **NEVER test on Azure CLI unavailable systems** - Use `--skip-build-check` flag
4. **NEVER assume pipeline success means API deployed** - Always verify health endpoint

### Code Organization
5. **NEVER use TypeScript `any`** - Use proper types or `unknown` with type guards
6. **NEVER concatenate user input into queries** - Use parameterized queries only
7. **NEVER hardcode secrets** - Use Azure Key Vault + environment variables only
8. **NEVER commit secrets** - Check `.credentials` file, use .gitignore

### Error Handling
9. **NEVER wrap multiple unrelated API calls in single try-catch** - Each call needs separate error handling
10. **NEVER return 403 for IDOR** - Return 404 to prevent information disclosure
11. **NEVER assume Authentication = Authorization** - Always verify party involvement

### Frontend
12. **NEVER use `i18next-http-backend` with embedded translations** - Causes white page
13. **NEVER hardcode locale strings** - Use `getUserLocale()` from dateUtils
14. **NEVER use `loadEnv()` in Vite config for CI/CD** - Define vars individually in config

### Database
15. **NEVER use `TIMESTAMP WITHOUT TIME ZONE`** - Always use `TIMESTAMP WITH TIME ZONE`
16. **NEVER skip foreign key constraints** - Prevents orphaned data
17. **NEVER modify schema without updating** `database/schema/current_schema.sql`

### Monorepo
18. **NEVER run concurrent Claude Code sessions** - Causes mixed commits, triggers all pipelines
19. **NEVER create feature branches** - Work directly on main (lesson learned from Git disasters)
20. **NEVER delete branches without checking all folders** - Monorepo branches can affect multiple projects

---

## When Things Go Wrong

### Recovery Scripts

```bash
# Quick status check (run before debugging)
./scripts/quick-check.sh

# Find missing commits (last 7 days)
./scripts/find-missing-commits.sh 7

# Full deployment verification
./scripts/verify-deployment-sync.sh
```

### Debugging Checklist

1. **Check deployment status FIRST** (saves hours)
   - Run pre-work checklist
   - Compare git log vs Azure DevOps last build
   
2. **Test API before UI**
   - curl health endpoint
   - curl data endpoints with auth
   - Only then debug frontend

3. **Check logs**
   - Function App: `func azure functionapp logstream func-ctn-demo-asr-dev`
   - Browser console for frontend errors
   - Azure DevOps pipeline logs

4. **Common Root Causes**
   - 99% of "old version" issues = deployment not synced
   - 99% of "data not showing" = API deployment failed
   - 99% of "white page" = CSP violation or i18n config

---

## Agent Registry (from CLAUDE.md)

**Note:** This project uses specialized AI agents for different tasks. Agent configs are in `.claude/agents/`.

**Key Agents:**
- **TE (Test Engineer)** - API tests (curl) FIRST, then Playwright. Autonomous bug investigation.
- **TW (Technical Writer)** - Maintains ROADMAP.md and docs/COMPLETED_ACTIONS.md
- **CR (Code Reviewer)** - SOLID principles, security validation
- **SA (Security Analyst)** - Secrets, auth/authz, injection prevention
- **DA (Design Analyst)** - UI/UX, WCAG 2.1 AA accessibility, Mantine validation
- **DE (Database Expert)** - Schema review, migrations, maintains `database/schema/current_schema.sql`
- **DG (DevOps Guardian)** - Cross-portal impact analysis, secret detection, pipeline validation
- **AR (Architecture Reviewer)** - Validates alignment between code, Azure infra, Arc42, IcePanel

**Auto-invoke When:**
- Bugs encountered → TE (API tests first)
- Before DB migrations → DE
- After features → TE, CR, TW (mandatory)
- Security code → SA
- UI/UX changes → DA
- Infrastructure/auth changes → AR

### MCP Server Integration

Active MCP servers (config: `/Users/ramondenoronha/.config/claude-code/mcp.json`):
- `@playwright/mcp` - E2E testing (TE)
- `chrome-devtools-mcp` - Browser debugging (TE, DA, SA)
- `@icepanel/mcp-server` - Architecture diagrams (TW, AR)

Mantine UI docs available locally: `docs/MANTINE_LLMS.txt` (79,408 lines)

---

## Additional Context

**Project Name:** CTN Association Register (ASR)  
**Purpose:** Member management system for container transport ecosystem  
**Development Stage:** Active development, production deployments  
**Team Size:** One-person operation (autonomous workflows)  
**Deployment Model:** Azure Static Web Apps (frontends) + Azure Functions (API)  
**Authentication:** Azure AD (Entra ID) with MSAL  
**Database:** PostgreSQL 14 on Azure Flexible Server

**Important:** This is a monorepo with multiple independent applications. Always verify which application you're working on before making changes. ASR (admin/member/api) is tightly coupled. Booking and Orchestrator portals are completely independent.
