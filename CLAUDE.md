# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

**Last Updated:** December 22, 2025

---

## 🚨 CRITICAL - READ FIRST 🚨

**EVERY session, EVERY task - complete this checklist FIRST:**

```bash
# 1. CHECK CURRENT BRANCH
git branch --show-current  # MUST be on 'main' - NO feature branches allowed

# 2. CHECK DEPLOYMENT STATUS
git log -1 --format="%ar - %s"
# Compare to: https://github.com/DeNoronha/ctn-asr-demo/actions

# 3. VERIFY CLEAN STATUS
git status

# 4. READ DATABASE SCHEMA (before any DB work)
# Open: database/asr_dev.sql
# Check: Existing tables, fields, views, constraints

# 5. RUN VERIFICATION SCRIPT (optional)
./scripts/quick-check.sh  # Automated checks
```

**Why this matters:**
- 90% of "bugs" are actually deployment sync issues. Checking deployment status BEFORE debugging saves hours.
- Reading the schema FIRST prevents creating duplicate tables/fields and ensures proper data modeling.

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
├── infrastructure/
│   └── bicep/              # Azure Bicep IaC (unified location)
│       ├── main.bicep      # Main infrastructure template
│       ├── container-app.bicep  # Container Apps deployment
│       ├── parameters.*.json    # Environment parameters
│       └── modules/        # Bicep modules
└── .github/
    ├── workflows/          # GitHub Actions CI/CD
    │   ├── api.yml         # API build & deploy
    │   ├── admin-portal.yml    # Admin portal deploy
    │   ├── member-portal.yml   # Member portal deploy
    │   └── bicep-infrastructure.yml  # Infrastructure deploy
    └── dependabot.yml      # Automated dependency updates
```

**Workspaces:** Root `package.json` defines workspaces: `["admin-portal", "member-portal", "api", "packages/*"]`

**Related Systems (Separate Repositories):**
- **[DocuFlow](https://dev.azure.com/ctn-demo/DocuFlow/_git/DocuFlow)** - Document submission and approval workflows (extracted Nov 11, 2025)
- **[Orchestration Register](https://dev.azure.com/ctn-demo/Orchestrator%20Portal/_git/Orchestrator%20Portal)** - Cross-system workflow orchestration (extracted Nov 11, 2025)

### CI/CD Architecture (GitHub Actions)

**As of December 22, 2025:** CI/CD migrated from Azure DevOps to GitHub Actions.

```
┌──────────────────────────────────────┐
│  1. API Workflow                     │
│  .github/workflows/api.yml           │
└─────────┬────────────────────────────┘
          │ Triggers on: api/* changes
          │ Deploys to: ca-ctn-asr-api-dev (Container Apps)
          │
  ┌───────┴────────┐
  ↓                ↓
┌──────────────┐ ┌──────────────┐
│2. Admin      │ │3. Member     │
│   Portal     │ │   Portal     │
│   Workflow   │ │   Workflow   │
└──────────────┘ └──────────────┘
  admin-portal.yml  member-portal.yml
```

**GitHub Actions Workflows:**
- `api.yml` - API build, Docker image push to ACR, Container Apps deployment
- `admin-portal.yml` - Admin portal build and deploy to Azure Static Web Apps
- `member-portal.yml` - Member portal build and deploy to Azure Static Web Apps
- `bicep-infrastructure.yml` - Infrastructure as Code deployments (Azure Bicep)

**Automated Dependency Updates:**
- Dependabot configured for npm packages and GitHub Actions
- Auto-creates PRs for security updates

**Path Filters:**
- Changes to `api/*` → Triggers API workflow
- Changes to `admin-portal/*` → Triggers Admin portal workflow
- Changes to `member-portal/*` → Triggers Member portal workflow
- Changes to `infrastructure/bicep/*` → Triggers Bicep infrastructure workflow

### API Architecture (Container Apps)

**As of November 19, 2025:** API migrated from Azure Functions to Azure Container Apps for improved reliability.

**Key Files:**
- `api/src/server.ts` - Express server entry point
- `api/src/routes.ts` - API route definitions
- `api/Dockerfile` - Multi-stage Docker build
- `infrastructure/bicep/container-app.bicep` - Container Apps infrastructure
- `infrastructure/bicep/main.bicep` - Main infrastructure orchestration

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

**Archived Legacy Code (Nov 21, 2025):**
- `api/src/functions-legacy-archive/` - Contains 70+ Azure Functions files from pre-Container Apps era
- **Status:** NO LONGER REFERENCED - All functionality migrated to Express routes
- **Reason:** Migration to Container Apps completed Nov 19, 2025
- See: `api/src/functions-legacy-archive/README.md` for migration details

### Database Schema

**🚨 CRITICAL: ALWAYS CHECK SCHEMA FIRST**

**Before creating new features or debugging:**
1. **Read `database/asr_dev.sql`** - This is the authoritative source of truth (exported Nov 21, 2025)
2. **Check existing tables** - Avoid creating duplicate tables or fields
3. **Review relationships** - Understand FK constraints and cascading behaviors
4. **Verify views** - Use existing views like `vw_legal_entities`

**Complete Table List (21 active tables):**

**Core Entity Model:**
- `party_reference` - Root entity (UUID primary key)
- `legal_entity` - Organizations/companies (FK to party_reference) - **THE source of truth for members**
  - Includes `azure_ad_object_id` for Azure AD integration (added Dec 12, 2025)
- `legal_entity_contact` - Contact persons (PRIMARY, BILLING, TECHNICAL, ADMIN)
- `legal_entity_number` - Identifiers (KvK, LEI, EUID, EORI, DUNS)
  - **EUID**: European Unique Identifier (auto-generated from KvK, format: NL.KVK.12345678)
  - **EORI**: Economic Operators Registration & Identification (customs/import-export, format: NL123456789)
  - **Note**: EURI was removed (not a recognized identifier system)
- `legal_entity_endpoint` - M2M communication endpoints

**Application & Onboarding:**
- `applications` - Member registration applications
- `admin_tasks` - Admin task management (assignments, status tracking)

**Authentication & Authorization:**
- `m2m_clients` - Azure AD service principals for M2M auth
- `m2m_client_secrets_audit` - Secret generation/revocation audit trail
- `ctn_m2m_credentials` - Keycloak M2M credentials (service accounts)
- `ctn_m2m_secret_audit` - Keycloak secret audit trail
- `issued_tokens` - Generic token tracking (FK to `legal_entity.legal_entity_id`)
- `authorization_log` - Three-tier authorization decision logs

**Identity Verification:**
- `kvk_registry_data` - KvK API response cache and validation
- `identifier_verification_history` - Document verification workflow
- `dns_verification_tokens` - Domain ownership verification
- `legal_entity_number_type` - Lookup table for identifier types (KVK, LEI, etc.) with validation patterns

**Audit & Compliance:**
- `audit_log` - System-wide audit trail

**Dropped Tables (Schema Cleanup):**
- ~~`company_registries`~~ - Dropped Dec 12, 2025 (migration 039) - replaced by `legal_entity_number_type`
- ~~`vetting_records`~~ - Dropped Dec 12, 2025 (migration 040) - never implemented
- ~~`oauth_clients`~~ - Dropped Dec 12, 2025 (migration 040) - Keycloak used instead via `ctn_m2m_credentials`
- ~~`audit_log_pii_access`~~ - Dropped Dec 12, 2025 (migration 040) - no active code references
- ~~`endpoint_authorization`~~ - Dropped Dec 12, 2025 (migration 041) - API endpoints never implemented
- ~~`bdi_external_systems`~~ - Dropped Dec 12, 2025 (migration 041) - BDI feature never implemented
- ~~`bdi_orchestration_participants`~~ - Dropped Dec 12, 2025 (migration 041) - BDI feature never implemented
- ~~`bvod_validation_log`~~ - Dropped Dec 12, 2025 (migration 042) - BDI feature never implemented
- ~~`bvad_issued_tokens`~~ - Dropped Dec 12, 2025 (migration 042) - BDI feature never implemented
- ~~`bdi_orchestrations`~~ - Dropped Dec 12, 2025 (migration 042) - BDI feature never implemented
- ~~`audit_log_pii_mapping`~~ - Dropped Dec 12, 2025 (migration 042) - pseudonymization feature removed
- ~~`members`~~ - **Dropped Dec 12, 2025 (migration 045)** - KISS simplification: `legal_entity` is the single source of truth
- ~~`legal_entity_backup_20251113`~~ - Dropped Nov 21, 2025 (migration 032)
- ~~`members_backup_20251113`~~ - Dropped Nov 21, 2025 (migration 032)

**Database Views (5 views - all use vw_ prefix):**
- `vw_legal_entities` - **Primary view for member listing** (replaces vw_members_full, Dec 12, 2025)
  - Pivoted identifier columns (kvk, lei, euid, eori, duns, vat)
  - contact_count, endpoint_count aggregations
- `vw_identifiers_with_type` - Identifiers enriched with type metadata from lookup table
- `vw_m2m_clients_active` - Active M2M clients with secret counts
- `vw_m2m_credentials_active` - Active Keycloak credentials
- `vw_audit_log_summary` - Audit log summary view

**Dropped Views (Dec 12, 2025):**
- ~~`vw_members_full`~~ - Replaced by `vw_legal_entities` (migration 045)
- ~~`vw_members_list`~~ - No longer needed (migration 045)
- ~~`vw_members`~~ - No longer needed (migration 045)
- ~~`vw_legal_entity_full`~~ - Dropped earlier (migration 044)

**Schema Conventions:**
- All tables have `dt_created`, `dt_modified` timestamps (or `created_at`, `updated_at`)
- **Soft deletes:** `is_deleted = false` in WHERE clauses (preserves audit trail)
- UUIDs for all primary keys
- CHECK constraints for enums (e.g., `status IN ('PENDING', 'ACTIVE', 'SUSPENDED')`)
- Foreign keys with appropriate CASCADE/RESTRICT behaviors

**Schema File Location:** `database/asr_dev.sql` (last updated Dec 12, 2025)
**Migrations:** Located in `database/migrations/XXX_description.sql` (sequential numbering)

**Common Pitfalls to Avoid:**
1. ❌ Creating new tables without checking `asr_dev.sql` first
2. ❌ Adding duplicate fields (e.g., `authentication_tier` already exists in `legal_entity`)
3. ❌ Ignoring existing views (e.g., use `vw_members_full` instead of complex joins)
4. ❌ Breaking foreign key constraints when modifying data
5. ❌ Forgetting soft delete filters (`WHERE is_deleted = false`)

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

# Deployment (via GitHub Actions)
# Push to main branch triggers: .github/workflows/api.yml
# Workflow builds Docker image → pushes to ACR → deploys to Container Apps

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
SELECT legal_entity_id, primary_legal_name, status, kvk, lei FROM vw_legal_entities ORDER BY primary_legal_name;
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

# 3. CHECK FOR RUNNING WORKFLOWS BEFORE PUSHING
gh run list --branch main --limit 3
# WAIT if any workflows show "in_progress" status!

# 4. Push to trigger workflow (only if no workflows running)
git push origin main

# 5. Wait ~2-3 minutes, verify deployment
# Check: https://github.com/DeNoronha/ctn-asr-demo/actions

# 6. Test deployed changes (TE agent pattern: API curl first, then UI)
```

**⚠️ CRITICAL: Never push while another workflow is running!**
- Concurrent workflows can cause deployment conflicts and race conditions
- Always check `gh run list` before pushing new changes
- Wait for "completed" status before pushing new changes

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

1. **Environment variables in Container Apps** → Defined in Bicep infrastructure and injected at runtime (see `infrastructure/bicep/container-app.bicep`)
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

### Infrastructure as Code

25. **Log Analytics workspace is shared** → `log-ctn-demo` (consolidated Nov 20, 2025) - used by Application Insights AND Container Apps Environment
26. **Alerts defined in Bicep** → `infrastructure/bicep/modules/container-app-alerts.bicep` contains 4 metric alerts for Container Apps monitoring
27. **No App Service Plan needed** → Container Apps use managed environments (Microsoft.App/managedEnvironments), not App Service Plans
28. **Bicep parameter files** → `parameters.dev.json` and `parameters.prod.json` for environment-specific configs
29. **Workflow auto-deploys Bicep** → Changes to `infrastructure/bicep/*` trigger `bicep-infrastructure.yml` workflow

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

## Identifier Types Reference

The system supports multiple legal entity identifier types stored in the `legal_entity_number` table:

### **EUID (European Unique Identifier)**
- **Purpose:** Standardized company identification across EU business registers (BRIS system)
- **Format:** `{Country}.{Registry}.{Number}` (e.g., `NL.KVK.12345678`, `DEK1101R.HRB116737`)
- **Auto-generation:** ✅ Yes (from KvK via `/v1/entities/{id}/identifiers/generate-euid`)
- **Service:** `api/src/services/euidService.ts`
- **Validation:** Regex: `/^[A-Z]{2}\.[A-Z0-9.]{1,50}$/`
- **Registry:** https://e-justice.europa.eu/489/EN/business_registers
- **Who needs it:** All EU companies for cross-border transparency

### **EORI (Economic Operators Registration and Identification)**
- **Purpose:** Customs clearance for import/export operations in EU
- **Format:** 2-letter country code + up to 15 alphanumeric characters
  - Netherlands: `NL123456789` (9 digits)
  - Germany: `DE12345678912345` (14 digits)
  - Belgium: `BE0123456789` (VAT-based)
- **Auto-generation:** ❌ No (manual entry, obtained from customs authorities)
- **Validation:** Regex: `/^[A-Z]{2}[A-Z0-9]{1,15}$/`
- **Registry:** https://ec.europa.eu/taxation_customs/dds2/eos/eori_validation.jsp
- **Who needs it:** Companies doing import/export with non-EU countries, freight forwarders, customs brokers

### **Other Supported Identifiers:**
- **LEI** (Legal Entity Identifier): Global 20-character code for financial entities
- **KVK** (Kamer van Koophandel): Dutch Chamber of Commerce number (8 digits)
- **DUNS** (Dun & Bradstreet): Global business identifier (9 digits)
- **VAT** (Value Added Tax): EU VAT registration numbers
- **HRB/HRA** (Handelsregister): German commercial register numbers
- **KBO** (Kruispuntbank van Ondernemingen): Belgian business register (10 digits)
- **SIREN/SIRET**: French business identifiers
- **CRN** (Company Registration Number): UK/GB companies

### **Database Views:**
- `vw_members_full`: Returns `kvk`, `lei`, `euid`, `eori`, `duns` columns
- `vw_members`: Simplified version with same identifier columns

### **Historical Note:**
- **EURI** was removed in migration 031 (November 21, 2025) as it is not a recognized identifier system. The correct identifiers are EUID and EORI.

---

## Azure Resources

### Front Door URLs (with WAF)
- **Admin:** https://admin-ctn-dev-gma8fnethbetbjgj.z02.azurefd.net
- **Member:** https://portal-ctn-dev-fdb5cpeagdendtck.z02.azurefd.net

### Direct URLs (Static Web Apps)
- **Admin:** https://calm-tree-03352ba03.1.azurestaticapps.net
- **Member:** https://calm-pebble-043b2db03.1.azurestaticapps.net
- **Orchestrator:** https://blue-dune-0353f1303.1.azurestaticapps.net

### Backend & Infrastructure
- **API (Container Apps):** https://ca-ctn-asr-api-dev.calmriver-700a8c55.westeurope.azurecontainerapps.io/api
- **Database:** psql-ctn-demo-asr-dev.postgres.database.azure.com (PostgreSQL 15)
- **GitHub Repository:** https://github.com/DeNoronha/ctn-asr-demo
- **GitHub Actions:** https://github.com/DeNoronha/ctn-asr-demo/actions
- **Container Registry:** crctnasrdev.azurecr.io
- **Key Vault:** kv-ctn-demo-asr-dev

### Monitoring & Logging
- **Log Analytics Workspace:** `log-ctn-demo` (consolidated, Nov 20, 2025)
  - 30-day retention, PerGB2018 pricing tier
  - Shared by Application Insights and Container Apps Environment
- **Application Insights:** appi-ctn-demo-asr-dev
  - Instrumentation Key: 303479d6-d426-4dbb-8961-e629d054f740
  - Connected to unified Log Analytics workspace

### Active Alerts (Container Apps)
| Alert | Severity | Metric | Threshold |
|-------|----------|--------|-----------|
| ASR-Container-App-5xx-Errors | 1 (Critical) | Requests (5xx) | > 10 in 5 min |
| ASR-High-Request-Rate | 2 (Warning) | Requests (total) | > 1000 in 5 min |
| ASR-High-Memory-Usage | 2 (Warning) | WorkingSetBytes | > 800MB for 15 min |
| ASR-Slow-Response-Time | 2 (Warning) | ResponseTime | > 5s avg in 5 min |

**Note:**
- Front Door may show DeploymentStatus: NotStarted. Use Direct URLs if Front Door returns 404.
- Alerts defined in `infrastructure/bicep/modules/container-app-alerts.bicep`

---

## Troubleshooting Quick Reference

| Issue | Check |
|-------|-------|
| API 404 | Check Container App revision status: `az containerapp revision list` |
| Auth errors | Scope must be `api://{client-id}/.default` |
| DB connection | Check `.credentials` file first |
| DB schema questions | Read `database/asr_dev.sql` (authoritative source) |
| Missing table/field | Check `database/asr_dev.sql` - table likely exists with different name |
| Data modeling questions | Review views: `vw_members_full`, `vw_members`, etc. |
| "Old version" | Run `git log -1`, compare to GitHub Actions workflow run time |
| Members not showing | Test API health: `curl https://ca-ctn-asr-api-dev.calmriver-700a8c55.westeurope.azurecontainerapps.io/api/health` |
| E2E tests failing | Verify auth state in `playwright/.auth/user.json` |
| Workflow path filters not working | Ensure no mixed commits from concurrent sessions |
| Container App not starting | Check logs: `az containerapp logs show --type console --name ca-ctn-asr-api-dev` |
| 404s after successful deployment | Check Container App revision status, verify route in routes.ts |
| Alerts not firing | Verify alerts exist: `az monitor metrics alert list --resource-group rg-ctn-demo-asr-dev` |
| Log Analytics queries failing | Use workspace: `log-ctn-demo` (consolidated Nov 20, 2025) |

**Credentials:** Check `.credentials` file (gitignored) before searching Azure Portal.

**Monitoring Commands:**
```bash
# View Container App logs
az containerapp logs show --name ca-ctn-asr-api-dev --resource-group rg-ctn-demo-asr-dev --type console --follow

# Check Container App health
az containerapp show --name ca-ctn-asr-api-dev --resource-group rg-ctn-demo-asr-dev --query "{status:properties.runningStatus, health:properties.health}"

# Query Log Analytics (requires workspace ID)
az monitor log-analytics query --workspace log-ctn-demo --analytics-query "ContainerAppConsoleLogs_CL | take 100"

# List active alerts
az monitor metrics alert list --resource-group rg-ctn-demo-asr-dev --output table
```

**For complete lessons with examples, see `docs/LESSONS_LEARNED.md`**

---

## Claude Desktop & Claude Code

This project can be worked on using both **Claude Code** (CLI tool) and **Claude Desktop** (chat interface with MCP tools).

### Desktop Commander (MCP Server)

When working via Claude Desktop, the **Desktop Commander** MCP server provides direct file system access on the local Mac:

**Capabilities:**
- Read/write/delete files and directories
- Search files by name or content
- Execute shell commands (bash/zsh)
- Move/rename files
- Get file metadata

**When to use Desktop Commander:**
- File operations on the local machine (outside of Claude's container environment)
- Quick file deletions, moves, or renames
- Reading local config files or logs
- Running shell commands that need local environment access

**Example operations:**
```bash
# These are handled via Desktop Commander MCP tools, not direct bash
- Delete screenshots: rm "/path/to/file.png"
- List directory: ls -la /path/to/dir
- Search files: find /path -name "pattern"
- Read file contents: cat /path/to/file
```

**Note:** Desktop Commander operates on the user's local filesystem. Files in `/mnt/user-data/` or `/home/claude/` are on Claude's remote container, not accessible via Desktop Commander.

---

## Technology Stack

- **Frontend:** React 18.3.1 + TypeScript 5.9.3 + Mantine v8.3.6 + Vite 7.1.10
- **Backend:** Azure Container Apps (Node.js 20 + Express.js + TypeScript 5.9.3)
- **Database:** PostgreSQL 15 (Azure Flexible Server)
- **Auth:** Azure AD (MSAL), RBAC with JWT (RS256)
- **Testing:** Playwright (E2E), Vitest (unit tests)
- **CI/CD:** GitHub Actions
- **Containerization:** Docker, Azure Container Registry
- **Security:** Aikido scanning, Content Security Policy, rate limiting
- **Monitoring:** Application Insights
