# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

**Last Updated:** November 19, 2025

---

## 🚨 CRITICAL - READ FIRST 🚨

**EVERY session, EVERY task - complete this checklist FIRST:**

```bash
# 1. CHECK CURRENT BRANCH
git branch --show-current  # MUST be on 'main' - NO feature branches allowed

# 2. CHECK DEPLOYMENT STATUS
git log -1 --format="%ar - %s"
# Compare to: https://dev.azure.com/ctn-demo/ASR/_build

# 3. VERIFY CLEAN STATUS
git status

# 4. RUN VERIFICATION SCRIPT (optional)
./scripts/quick-check.sh  # Automated checks
```

**Why this matters:** 90% of "bugs" are actually deployment sync issues. Checking deployment status BEFORE debugging saves hours.

---

## Architecture Overview

### Repository Structure

**As of November 11, 2025:** This repository contains ONLY the Association Register (ASR) system.

```
ctn-asr-monorepo/
├── api/                    # Container Apps backend (Node.js 20 + Express)
├── admin-portal/           # Admin UI (React 18 + Mantine v8)
├── member-portal/          # Member UI (React 18 + Mantine v8)
├── database/               # PostgreSQL schema & migrations
├── packages/
│   └── api-client/         # Shared TypeScript API client
├── shared/
│   └── vite-config-base/   # Shared Vite config
├── infrastructure/         # Azure Bicep IaC
└── .azure-pipelines/       # CI/CD pipelines
```

**Workspaces:** Root `package.json` defines workspaces: `["admin-portal", "member-portal", "api", "packages/*"]`

**Related Systems (Separate Repositories):**
- **[DocuFlow](https://dev.azure.com/ctn-demo/DocuFlow/_git/DocuFlow)** - Document submission and approval workflows (extracted Nov 11, 2025)
- **[Orchestration Register](https://dev.azure.com/ctn-demo/Orchestrator%20Portal/_git/Orchestrator%20Portal)** - Cross-system workflow orchestration (extracted Nov 11, 2025)

### Pipeline Architecture

```
┌──────────────────────────────────────┐
│  1. Association-Register-Backend     │
│  .azure-pipelines/container-app-api.yml│
└─────────┬────────────────────────────┘
          │ Triggers on: api/* changes
          │ Deploys to: ca-ctn-asr-api-dev (Container Apps)
          │
  ┌───────┴────────┐
  ↓                ↓
┌──────────────┐ ┌──────────────┐
│2. Admin      │ │3. Member     │
│   Portal     │ │   Portal     │
│   Pipeline   │ │   Pipeline   │
└──────────────┘ └──────────────┘
  admin-portal.yml  member-portal.yml
  (triggered by API OR admin-portal/* changes)
```

**Additional Pipelines:**
- `bicep-infrastructure.yml` - Infrastructure as Code deployments (Azure Bicep)
- `playwright-tests.yml` - E2E test execution pipeline
- `container-app.bicep` - Container Apps infrastructure definition

**Path Filters:**
- Changes to `api/*` → Triggers ASR API + Admin + Member pipelines
- Changes to `admin-portal/*` → ONLY Admin portal pipeline
- Changes to `member-portal/*` → ONLY Member portal pipeline

### API Architecture (Container Apps)

**As of November 19, 2025:** API migrated from Azure Functions to Azure Container Apps for improved reliability.

**Key Files:**
- `api/src/server.ts` - Express server entry point
- `api/src/routes.ts` - API route definitions
- `api/Dockerfile` - Multi-stage Docker build
- `infrastructure/container-app.bicep` - Container Apps infrastructure

**Container Configuration:**
- Runtime: Node.js 20 + Express.js
- Port: 8080
- Scale: 0-10 replicas (auto-scale on HTTP requests)
- Health probes: Liveness and Readiness on `/api/health`
- Graceful shutdown: SIGTERM/SIGINT handlers with 30s timeout
- Structured logging: JSON format for Application Insights integration

**Middleware Chain:**
```
Request → CORS → JSON Parsing → Request Logging → Auth Check →
Business Logic → Response
```

**RBAC Model (5 roles):**
1. `SystemAdmin` - All permissions
2. `AssociationAdmin` - Manage all entities
3. `MemberAdmin` - Manage own entity
4. `MemberUser` - Self-service access
5. `MemberReadOnly` - Read-only access

### M2M Authentication (Keycloak)

**Dual Authentication Support:**
The system supports TWO authentication modes for different client types:
- **Azure AD (MSAL)** - Human users accessing Admin/Member portals
- **Keycloak (Cloud IAM)** - Machine-to-Machine (M2M) clients from external systems

**M2M Endpoints:**
Express routes supporting M2M authentication use `authenticateDual()` middleware that accepts both Azure AD and Keycloak JWTs:

```typescript
// api/src/middleware/keycloak-auth.ts - Keycloak JWT validation & dual auth
import { authenticateDual } from '../middleware/keycloak-auth';

// M2M-enabled routes (defined in api/src/routes.ts):
- POST /api/v1/bookings: Requires Booking.Write scope
- GET /api/v1/bookings: Requires Booking.Read scope
- GET /api/v1/eta-updates: Requires ETA.Read scope
- GET /api/v1/container-status: Requires Container.Read scope
```

**Key M2M Files:**
- `api/src/middleware/keycloak-auth.ts` - Keycloak JWT validation & dual authentication middleware
- `api/src/controllers/bookings.ts` - M2M booking operations (GET/POST/PUT)
- `api/src/controllers/eta.ts` - Shipping ETA information retrieval
- `api/src/controllers/container.ts` - Container tracking queries
- Database migration 026 - Renamed Zitadel tables to generic M2M (originally implemented for Zitadel, migrated to Keycloak)

**Authentication Flow:**
```
External System → Keycloak Token → API validates JWT (JWKS endpoint) →
Scope Check (Booking.Read, etc.) → Business Logic → Response
```

**API Key Files:**
- `api/src/server.ts` - Express server initialization, middleware setup, graceful shutdown
- `api/src/routes.ts` - Route definitions and controller registration
- `api/src/middleware/auth.ts` - JWT validation (Azure AD JWKS)
- `api/src/middleware/rbac.ts` - Permission enforcement
- `api/src/utils/database.ts` - PostgreSQL 15 pool (5-20 connections, SSL required)
- `api/src/utils/queryPerformance.ts` - Database query performance monitoring
- `api/Dockerfile` - Multi-stage Docker build configuration
- `api/.dockerignore` - Docker build optimization (excludes node_modules, tests, docs)

### Database Schema

**Core Tables:**
- `party_reference` - Root entity (UUID primary key)
- `legal_entity` - Organizations/companies (FK to party_reference)
- `legal_entity_contact` - Contact persons (PRIMARY, BILLING, TECHNICAL, ADMIN)
- `legal_entity_number` - Identifiers (KvK, LEI, EURI, DUNS)
- `legal_entity_endpoint` - M2M communication endpoints

**Conventions:**
- All tables have `dt_created`, `dt_modified` timestamps
- **Soft deletes:** `is_deleted = false` in WHERE clauses (preserves audit trail)
- UUIDs for all primary keys
- CHECK constraints for enums (e.g., `status IN ('PENDING', 'ACTIVE', 'SUSPENDED')`)

**Migrations:** Located in `database/migrations/XXX_description.sql` (sequential numbering)

### Frontend Architecture

**Admin Portal & Member Portal:**
- React 18.3.1 + TypeScript 5.9.3
- Mantine v8.3.6 (complete UI library)
- Vite 7.1.10 (build tool)
- Azure MSAL for authentication:
  - Admin Portal: @azure/msal-browser v4.24.1, @azure/msal-react v3.0.20
  - Member Portal: @azure/msal-browser v3.7.1, @azure/msal-react v2.0.22
  - **NOTE:** Version difference intentional (admin portal uses newer MSAL v4)
- i18next for internationalization
- Playwright for E2E testing
- Shared `@ctn/api-client` package for API calls

**Build Optimization:** Vite manual chunk splitting:
- `react-vendor`, `mantine-core`, `mantine-datatable`, `mantine-forms`, `auth`, `i18n`, `icons`
- Minification: Terser
- Target: ES2020

**Code Quality:**
- Linter/Formatter: Biome v1.9.4 (unified tooling replacing ESLint + Prettier)
- Fast, single-tool solution for both linting and formatting
- Configuration: `biome.json` in each portal root
- Integration: Pre-commit hooks and CI/CD pipeline checks

**Authentication Flow:**
```
User → Azure AD Login → MSAL Token → API Client Interceptor →
Inject Bearer Token → API Validates JWT → RBAC Check → Response
```

**Orchestrator Portal (Different Stack):**
- Zustand for state management (no MSAL, internal system)
- TanStack Query (v5) for server state
- Tailwind CSS (not Mantine)
- Mock API server (json-server) for offline development

### Shared Code

**API Client Package (`packages/api-client/`):**

```typescript
// Exported client with type-safe endpoints
export class AsrApiClient {
  public members: MembersEndpoint
  public legalEntities: LegalEntitiesEndpoint
  public contacts: ContactsEndpoint
  public identifiers: IdentifiersEndpoint
  public endpoints: EndpointsEndpoint
  public auditLogs: AuditLogsEndpoint
  public orchestrations: OrchestrationsEndpoint
}

// Usage in portals
const client = new AsrApiClient({
  baseURL: 'https://ca-ctn-asr-api-dev.calmriver-700a8c55.westeurope.azurecontainerapps.io/api/v1',
  getAccessToken: async () => { /* MSAL token */ },
  retryAttempts: 3
});
```

**Benefits:** Type safety, centralized retry logic, automatic token injection, prevents API drift.

---

## Development Commands

### API (Container Apps)

```bash
cd api

# Build (compiles TypeScript + copies templates/openapi.json)
npm run build

# Local development (Express server)
npm start  # Runs on http://localhost:8080

# Watch mode (TypeScript compilation)
npm run watch

# Docker local testing
npm run docker:build  # Build Docker image
npm run docker:run    # Run container locally on port 8080

# Deployment (via Azure DevOps Pipeline)
# Push to main branch triggers: .azure-pipelines/container-app-api.yml
# Pipeline builds Docker image → pushes to ACR → deploys to Container Apps

# View logs (Azure CLI)
az containerapp logs show \
  --name ca-ctn-asr-api-dev \
  --resource-group rg-ctn-demo-dev \
  --type console \
  --follow

# Check Container App status
az containerapp show \
  --name ca-ctn-asr-api-dev \
  --resource-group rg-ctn-demo-dev \
  --query "properties.{status:provisioningState,health:runningStatus}"
```

### Admin Portal / Member Portal

```bash
cd admin-portal  # or member-portal

# Local development
npm start  # Runs on http://localhost:3000

# Build for production
npm run build  # Output: dist/

# Type check (no emit)
npm run typecheck

# Linting & formatting (Biome)
npm run lint
npm run lint:fix
npm run format

# E2E tests (Playwright)
npm run test:e2e          # Headless
npm run test:e2e:headed   # With browser UI
npm run test:e2e:debug    # Debug mode
npm run test:e2e:ui       # Playwright UI mode
npm run test:e2e:report   # View HTML report

# Unit tests (admin-portal only, Vitest)
npm run test              # Watch mode
npm run test:ui           # Vitest UI
npm run test:coverage     # Coverage report

# Security
npm run security:audit
npm run security:aikido:scan  # Requires env vars
```

### Database

```bash
# Connect to PostgreSQL 15
psql "host=psql-ctn-demo-asr-dev.postgres.database.azure.com \
      port=5432 dbname=asr_dev user=asradmin sslmode=require"

# Apply migration
psql "host=... sslmode=require" -f database/migrations/025_new_migration.sql

# Common queries
SELECT org_id, legal_name, status FROM members ORDER BY legal_name;
SELECT legal_entity_id, identifier_type, identifier_value
FROM legal_entity_number WHERE is_deleted = false;
```

### Testing Strategy

**API Testing (Test Engineer Pattern):**
1. **Test API FIRST with curl** - Catch 404/500 before UI testing
2. **E2E tests (Playwright)** - Only after API tests pass

**Test User (MFA Excluded):**
```
Email: test-e2@denoronha.consulting
Password: Madu5952
Object ID: 7e093589-f654-4e53-9522-898995d1201b
Role: SystemAdmin
```

**Playwright Setup:**
- Auth state stored in `playwright/.auth/user.json`
- Serial execution (no parallelization) to avoid auth conflicts
- Screenshots/videos on failure
- 60-second timeout per test

---

## Way of Working

### Workflow (NO Feature Branches)

**ALL work happens on main branch** (October 26, 2025 decision after monorepo branch disasters)

**Standard Flow:**
```bash
# 1. Ensure clean state
git status

# 2. Make changes, commit frequently
git add -A
git commit -m "feat: descriptive message"

# 3. Push to trigger pipeline
git push origin main

# 4. Wait ~2-3 minutes, verify deployment
# Check: https://dev.azure.com/ctn-demo/ASR/_build

# 5. Test deployed changes (TE agent pattern: API curl first, then UI)
```

**Verification Scripts:**
```bash
# Quick check before debugging (verify you're on main, clean state, latest pushed)
./scripts/quick-check.sh

# Full deployment verification after push
./scripts/verify-deployment-sync.sh
```

### Git Configuration

**ALL commits MUST use the following author information:**

```bash
Name:  Ramon de Noronha
Email: ramon@denoronha.consulting
```

**Setup (required once per machine):**
```bash
# Configure git for this repository
git config user.name "Ramon de Noronha"
git config user.email "ramon@denoronha.consulting"

# Verify configuration
git config user.name && git config user.email
```

**Fixing incorrect commits:**
```bash
# Check recent commit authors
git log -5 --format="%h - %an <%ae> - %s"

# Fix last N commits with wrong author (e.g., N=2)
GIT_SEQUENCE_EDITOR=: git rebase -i HEAD~2 \
  --exec "git commit --amend --author='Ramon de Noronha <ramon@denoronha.consulting>' --no-edit"

# Force push corrected commits
git push --force-with-lease origin main
```

**Common incorrect emails to watch for:**
- `ramon@MacBookPro.local` ❌
- `claude@anthropic.com` ❌
- Any other variations ❌

**Only `ramon@denoronha.consulting` is correct** ✅

### Autonomous Operation

**Auto-approve (no asking):**
- Next logical steps in workflows
- Bug fixes, tests, deployments
- Standard build/deploy procedures
- Agent invocations (TE, TW, CR, SA, DE, DA, AR, DG)

**Ask only for:**
- Destructive operations (delete prod data, force-push main)
- Major architectural changes
- Significant cost implications
- Security-sensitive operations
- Unclear requirements

### Agent Registry (Auto-Invoke)

**When to invoke:**

| Agent | When | Purpose |
|-------|------|---------|
| **TE** (Test Engineer) | Bugs encountered, after deployment | API curl tests → Playwright E2E |
| **TW** (Technical Writer) | After ROADMAP.md tasks, before commits | Update docs/COMPLETED_ACTIONS.md |
| **CR** (Code Reviewer) | Significant code changes | SOLID, security, quality |
| **SA** (Security Analyst) | Security-sensitive code | Secrets, IDOR, injections |
| **DE** (Database Expert) | Before migrations, schema changes | DDL review, query optimization |
| **DA** (Design Analyst) | UI/UX changes | WCAG 2.1 AA, responsive |
| **AR** (Architecture Reviewer) | New Azure services, auth changes | Arc42/IcePanel alignment |
| **DG** (DevOps Guardian) | Commits, shared code changes, pipeline mods | Secret scan, cross-impact |

**Files:** `.claude/agents/*.md`

---

## Critical Patterns & Gotchas

### Container Apps & Express

1. **Environment variables in Container Apps** → Defined in Bicep infrastructure and injected at runtime (see `infrastructure/container-app.bicep`)
2. **Health probes required** → Liveness and readiness probes on `/api/health` ensure Container Apps traffic routing
3. **Port 8080 is standard** → Express server listens on port 8080 (configurable via PORT env var)
4. **Graceful shutdown implemented** → SIGTERM/SIGINT handlers close HTTP server → drain connections → close DB pool → exit (30s timeout)
5. **Docker multi-stage builds** → Production image uses Node.js 20 Alpine, build stage compiles TypeScript
6. **Structured JSON logging** → All logs output as JSON for Application Insights parsing and querying
7. **.dockerignore is critical** → Excludes node_modules, tests, and docs from Docker context (faster builds, smaller images)

### Database

6. **CHECK constraints prevent data corruption** → Enums (status, type) MUST have DB constraints, not just TypeScript
7. **Soft delete pattern** → Always filter `WHERE is_deleted = false` in queries
8. **Foreign key constraints** → Prevent orphaned references (add in migrations)

### Frontend

9. **Paginated API responses** → Extract data: `response.data.data` (double `.data`)
10. **Vite environment variables** → Use `process.env` directly, DON'T use `loadEnv()` for CI/CD
11. **Mantine DataTable v8 pagination** → Manual slicing: `records={data.slice((page - 1) * pageSize, page * pageSize)}`
12. **i18n HttpBackend + useSuspense = white page** → Set `useSuspense: false` when translations embedded in bundle

### Testing

13. **Test API FIRST with curl, THEN UI** → Isolates backend vs frontend issues
14. **E2E auth state** → Stored in `playwright/.auth/user.json`, reused across tests
15. **Serial execution only** → No parallelization to avoid auth conflicts

### Security

16. **IDOR prevention in multi-tenant** → Always verify party involvement before returning data, return 404 (not 403)
17. **Gremlin injection** → Use parameterized queries, NEVER concatenate user input
18. **Environment variable validation** → Validate at startup, fail fast with clear errors

### Deployment

19. **"Old version" in production = deployment sync issue** → Run PRE-WORK CHECKLIST, compare git log to Azure build time
20. **Container App revision management** → Each deployment creates new revision, old revisions auto-deactivated after success
21. **Package.json workspace renames** → MUST regenerate `package-lock.json` after updating root workspaces array
22. **Mixed commits break path filters** → Running multiple Claude sessions concurrently triggers ALL pipelines

### Cascading Failures

23. **Wrap each API call in separate try-catch** → One failing resource shouldn't block others (defensive programming)
24. **Graceful degradation** → Set fallback states ([], null) on error instead of cascading failures

---

## Documentation Structure

**Root:** README.md, CLAUDE.md only
**Desktop:** `~/Desktop/ROADMAP.md` (synced, not in repo)
**docs/:** Project documentation (`COMPLETED_ACTIONS.md`, `LESSONS_LEARNED.md`, test reports)
**docs/MANTINE_LLMS.txt:** Complete Mantine UI library reference (79K lines)
**docs/MANTINE_DATATABLE_REFERENCE.md:** mantine-datatable component patterns
**.claude/agents/:** Agent configuration files

**Arc42 Documentation (Separate Repository: DEV-CTN-Documentation):**
- [Three-Tier Authentication](https://github.com/ramondenoronha/DEV-CTN-Documentation/blob/main/docs/arc42/05-building-blocks/ctn-three-tier-authentication.md)
- [Deployment Procedures](https://github.com/ramondenoronha/DEV-CTN-Documentation/blob/main/docs/arc42/07-deployment/ctn-asr-deployment-procedures.md)
- [Coding Standards](https://github.com/ramondenoronha/DEV-CTN-Documentation/blob/main/docs/arc42/08-crosscutting/ctn-coding-standards.md)
- [Security Hardening](https://github.com/ramondenoronha/DEV-CTN-Documentation/blob/main/docs/arc42/08-crosscutting/ctn-security-hardening.md)
- [Accessibility (WCAG)](https://github.com/ramondenoronha/DEV-CTN-Documentation/blob/main/docs/arc42/10-quality/ctn-accessibility-wcag-compliance.md)

---

## Azure Resources

### Front Door URLs (with WAF)
- **Admin:** https://admin-ctn-dev-gma8fnethbetbjgj.z02.azurefd.net
- **Member:** https://portal-ctn-dev-fdb5cpeagdendtck.z02.azurefd.net

### Direct URLs (Static Web Apps)
- **Admin:** https://calm-tree-03352ba03.1.azurestaticapps.net
- **Member:** https://calm-pebble-043b2db03.1.azurestaticapps.net
- **Orchestrator:** https://blue-dune-0353f1303.1.azurestaticapps.net

### Backend
- **API (Container Apps):** https://ca-ctn-asr-api-dev.calmriver-700a8c55.westeurope.azurecontainerapps.io/api
- **Database:** psql-ctn-demo-asr-dev.postgres.database.azure.com
- **Azure DevOps:** https://dev.azure.com/ctn-demo/ASR
- **Container Registry:** crctnasrdev.azurecr.io

**Note:** Front Door may show DeploymentStatus: NotStarted. Use Direct URLs if Front Door returns 404.

---

## Troubleshooting Quick Reference

| Issue | Check |
|-------|-------|
| API 404 | Check Container App revision status: `az containerapp revision list` |
| Auth errors | Scope must be `api://{client-id}/.default` |
| DB connection | Check `.credentials` file first |
| "Old version" | Run `git log -1`, compare to Azure DevOps build time |
| Members not showing | Test API health: `curl https://ca-ctn-asr-api-dev.calmriver-700a8c55.westeurope.azurecontainerapps.io/api/health` |
| E2E tests failing | Verify auth state in `playwright/.auth/user.json` |
| Pipeline path filters not working | Ensure no mixed commits from concurrent sessions |
| Container App not starting | Check logs: `az containerapp logs show --type console` |
| 404s after successful deployment | Check Container App revision status, verify route in routes.ts |

**Credentials:** Check `.credentials` file (gitignored) before searching Azure Portal.

**For complete lessons with examples, see `docs/LESSONS_LEARNED.md`**

---

## Technology Stack

- **Frontend:** React 18.3.1 + TypeScript 5.9.3 + Mantine v8.3.6 + Vite 7.1.10
- **Backend:** Azure Container Apps (Node.js 20 + Express.js + TypeScript 5.9.3)
- **Database:** PostgreSQL 15 (Azure Flexible Server)
- **Auth:** Azure AD (MSAL), RBAC with JWT (RS256)
- **Testing:** Playwright (E2E), Vitest (unit tests)
- **CI/CD:** Azure DevOps Pipelines
- **Containerization:** Docker, Azure Container Registry
- **Security:** Aikido scanning, Content Security Policy, rate limiting
- **Monitoring:** Application Insights
