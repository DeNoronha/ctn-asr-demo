# Lessons Learned - Detailed Examples

**Last Updated:** October 17, 2025

This file contains detailed explanations and code examples for lessons learned during ASR development. For quick reference, see CLAUDE.md.

---

## Deployment & Pipeline Issues

### 1. Always Check Deployment Status BEFORE Debugging (October 15, 2025)

**What Happened:** Spent entire day debugging 404/500 errors when real issue was failed CI/CD deployments blocking all code changes.

**Why It Matters:** Wasted 8+ hours fixing code that was never deployed, endless frustration testing non-existent changes.

**How to Avoid:**
```bash
# FIRST STEP before debugging:
git log -1 --format="%ar - %s"
# Visit: https://dev.azure.com/ctn-demo/ASR/_build
# Compare timestamps: git commit time vs last successful build

# RED FLAG: If last build >1 hour old → deployment is broken
# DON'T DEBUG until deployment works
```

---

### 2. Check package.json "main" Field for Entry Point (October 15, 2025)

**What Happened:** Spent HOURS adding imports to `src/index.ts` when Azure was actually loading `src/essential-index.ts` (defined in package.json "main" field).

**Why It Matters:** Functions compiled correctly but NEVER loaded in production.

**How to Avoid:**
```bash
# FIRST: Check which file is the entry point
cat api/package.json | grep "main"
# "main": "dist/essential-index.js" → use essential-index.ts, NOT index.ts

# Add ALL function imports to the file specified in "main"
# Verify after deployment:
func azure functionapp list-functions func-ctn-demo-asr-dev
```

Cost: 4+ hours of debugging.

---

### 3. API Functions Must Import in Entry Point (October 15, 2025)

**What Happened:** Identifier functions compiled to dist/ but not imported in CORRECT entry point file.

**Why It Matters:** Functions existed but returned 404 in production.

**How to Avoid:**
```typescript
// In api/src/functions/essential-index.ts (or whatever "main" points to):
import './functions/CreateIdentifier';
import './functions/UpdateIdentifier';
import './functions/GetIdentifiers';
// ... all other functions

// Missing imports = invisible functions in production
```

---

### 4. Pipeline Quality Checks Must Use continueOnError (October 16, 2025)

**What Happened:** Biome lint found 242 errors + 109 warnings, exited with code 1, blocked ALL deployments for 12+ hours despite continueOnError: true in pipeline config.

**Why It Matters:** Production frozen, wasted time debugging when real issue was pipeline configuration.

**Root Cause:**
- Azure DevOps continueOnError: true wasn't working as expected
- Quality check failures marked build as "partiallySucceeded"
- Deployment steps skipped due to non-green status

**How to Avoid:**
```yaml
# azure-pipelines.yml
- script: npm run lint
  continueOnError: true
  displayName: 'Code quality checks (non-blocking)'

# Quality checks should INFORM, not BLOCK
# Only actual build failures should prevent deployment
# Monitor "succeeded" vs "partiallySucceeded" status
```

---

### 5. Version.json Must Be Generated During Build (October 16, 2025)

**What Happened:** version.json committed to git with old build info, never updated during pipeline, About page always showed "October 16, 08:10" all day.

**Why It Matters:** Couldn't verify deployments reaching production.

**How to Avoid:**
```yaml
# azure-pipelines.yml - BEFORE npm run build
- script: |
    cat > web/src/version.json << EOF
    {
      "buildNumber": "$(Build.BuildNumber)",
      "commitHash": "$(Build.SourceVersion)",
      "buildTime": "$(date -u +%Y-%m-%dT%H:%M:%SZ)"
    }
    EOF
  displayName: 'Generate version.json'

- script: npm run build
  displayName: 'Build frontend'
```

Never commit version.json with actual build info - generate dynamically.

---

### 6. CI/CD Pipeline Failures Block All Deployments (October 15, 2025)

**What Happened:** Biome lint checks failing with exit code 1, blocking ALL deployments since 08:10.

**Why It Matters:** No code changes reached production all day.

**How to Avoid:**
- Pipeline lint/quality checks use continueOnError: true
- Monitor Azure DevOps build status, not just local builds
- Failed pipelines = production frozen at last successful build
- Fix pipeline issues IMMEDIATELY

---

### 7. Unified CI/CD Pipeline for Related Components (October 15, 2025)

**What Happened:** Admin portal, member portal, and API had separate/missing pipelines, causing deployment drift.

**Why It Matters:** Frontend and backend out of sync, API changes don't deploy with UI changes.

**How to Avoid:**
- Unified pipeline deploys web + API together
- Admin and member portals both deploy API
- Infrastructure stays separate pipeline
- Ensures full-stack deployment consistency

---

## Azure Functions Issues

### 8. Azure Functions v4 Lowercases All Route Parameters (October 15, 2025)

**What Happened:** Routes defined as `{legalEntityId}` became `{legalentityid}` in Azure, code accessed wrong param name.

**Why It Matters:** 400 Bad Request errors because `request.params.legalEntityId` was undefined.

**How to Avoid:**
```typescript
// ❌ WRONG
app.http('GetIdentifier', {
  route: 'legal-entities/{legalEntityId}/identifiers/{identifierId}',
  handler: async (request, context) => {
    const entityId = request.params.legalEntityId; // undefined in Azure!
  }
});

// ✅ CORRECT - Always use lowercase
app.http('GetIdentifier', {
  route: 'legal-entities/{legalentityid}/identifiers/{identifierid}',
  handler: async (request, context) => {
    const entityId = request.params.legalentityid; // works!
  }
});
```

This is Azure Functions v4 behavior, not configurable.

---

### 9. Method Binding Required for Request Methods (October 16, 2025)

**What Happened:** Spent 2 days debugging "Cannot read private member from an object whose class did not declare it" error when calling `request.json()`.

**Why It Matters:** Cryptic error prevented ALL identifier creation/update operations.

**Root Cause:**
- Azure Functions v4 HttpRequest methods internally access Headers object with private members
- Passing method references directly loses binding to original request
- Calling unbound methods triggers "Cannot read private member" error

**How to Avoid:**
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

Files affected: `auth.ts`, `endpointWrapper.ts` - anywhere AuthenticatedRequest is created.

**Debug tip:** If you see "Cannot read private member" in Azure Functions, check method binding first.

---

### 10. API Deployment Requires Correct Essential Imports (October 15, 2025)

**What Happened:** API functions failed after deployment despite local success.

**Why It Matters:** Remote build process requires explicit essential imports.

**How to Avoid:**
```typescript
// api/src/functions/essential-index.ts
import './CreateMember';
import './GetMembers';
import './UpdateMember';
// ... all functions must be imported here

// Check after deployment:
// func azure functionapp list-functions func-ctn-demo-asr-dev
```

---

## Frontend Issues

### 11. Paginated API Response Parsing (October 16, 2025)

**What Happened:** Identifiers saved to database via API but didn't display in UI. Browser showed "No identifiers registered yet" despite data existing.

**Why It Matters:** Created silent failure - API worked, data in database, but users couldn't see it. Two days debugging API when bug was in frontend.

**Root Cause:**
- API returns paginated format: `{ data: [items], pagination: {...} }`
- Frontend expected direct array: `[items]`
- Frontend tried to iterate over paginated object, silently failed

**How to Avoid:**
```typescript
// ❌ WRONG - Tries to use paginated object as array
const response = await axios.get<Identifier[]>('/identifiers');
return response.data; // Returns {data: [], pagination: {}}

// ✅ CORRECT - Extract data array from paginated response
const response = await axios.get<{data: Identifier[]; pagination: any}>('/identifiers');
return response.data.data; // Returns actual array
```

File fixed: `web/src/services/apiV2.ts` line 286

**Test both API and frontend** - don't assume frontend parses correctly just because API returns 200.

---

### 12. Vite loadEnv() vs Shell Environment Variables (October 17, 2025)

**What Happened:** After Vite migration, authentication failed with "AADSTS90102: redirect_uri value must be a valid absolute URI" error. redirect_uri was undefined in production builds.

**Why It Matters:** Broke authentication on both portals in production.

**Root Cause:**
- Vite's `loadEnv()` ONLY reads .env files in filesystem
- Azure DevOps pipelines set variables via shell (env: block in YAML)
- `loadEnv()` cannot access shell environment variables
- Production builds had undefined values

**How to Avoid:**
```typescript
// ❌ WRONG - loadEnv() only reads .env files
const env = loadEnv(mode, process.cwd(), '');
define: {
  'process.env': env
}

// ✅ CORRECT - process.env reads shell variables
define: {
  'process.env.REACT_APP_API_BASE_URL': JSON.stringify(process.env.REACT_APP_API_BASE_URL),
  'process.env.REACT_APP_AZURE_CLIENT_ID': JSON.stringify(process.env.REACT_APP_AZURE_CLIENT_ID)
}
```

Files fixed: `web/vite.config.ts`, `portal/vite.config.ts`

Don't mix approaches - either .env files (local) OR shell variables (CI/CD), not both.

---

### 13. Vite define Configuration (October 17, 2025)

**What Happened:** Attempted to replace entire `process.env` object with `define: { 'process.env': {...} }`.

**Why It Matters:** Breaks Vite's internal variable resolution.

**How to Avoid:**
```typescript
// ❌ WRONG - Replacing entire process.env object
define: {
  'process.env': {
    REACT_APP_API_BASE_URL: JSON.stringify(process.env.REACT_APP_API_BASE_URL)
  }
}

// ✅ CORRECT - Define individual variables
define: {
  'process.env.REACT_APP_API_BASE_URL': JSON.stringify(process.env.REACT_APP_API_BASE_URL),
  'process.env.REACT_APP_AZURE_CLIENT_ID': JSON.stringify(process.env.REACT_APP_AZURE_CLIENT_ID)
}
```

Use individual `'process.env.VAR_NAME': JSON.stringify(process.env.VAR_NAME)` entries.

---

### 14. Azure DevOps Pipeline Environment Variables with Vite (October 17, 2025)

**What Happened:** Environment variables set in Azure DevOps pipeline YAML weren't being read by Vite during build.

**Why It Matters:** Production builds had undefined configuration values.

**How to Avoid:**
```yaml
# azure-pipelines.yml
- script: npm run build
  env:
    REACT_APP_API_BASE_URL: $(REACT_APP_API_BASE_URL)
    REACT_APP_AZURE_CLIENT_ID: $(REACT_APP_AZURE_CLIENT_ID)
```

```typescript
// vite.config.ts
define: {
  'process.env.REACT_APP_API_BASE_URL': JSON.stringify(process.env.REACT_APP_API_BASE_URL)
}
```

Pipeline variables at job/stage level must be passed to script via `env:` block.

---

## Testing Issues

### 15. Test API FIRST with curl, Then UI with Playwright (October 15, 2025)

**What Happened:** Endless 404/500 errors went undetected for hours because only UI was tested.

**Why It Matters:** API failures cascade to UI, but UI tests don't catch API deployment issues. Testing UI when API is broken wastes time.

**How to Avoid:**
```bash
# 1. Test API FIRST with curl
# Create test data
IDENTIFIER_ID=$(curl -X POST https://api/legal-entities/123/identifiers \
  -H "Authorization: Bearer $TOKEN" \
  -d '{"registry":"KVK","value":"12345678"}' | jq -r '.id')

# Verify operation
curl https://api/legal-entities/123/identifiers/$IDENTIFIER_ID \
  -H "Authorization: Bearer $TOKEN"

# Clean up
curl -X DELETE https://api/legal-entities/123/identifiers/$IDENTIFIER_ID \
  -H "Authorization: Bearer $TOKEN"

# 2. ONLY THEN test UI with Playwright
cd web && npm run test:e2e
```

**Separation of concerns:**
- API tests catch 404/500 errors, route registration, deployment failures
- UI tests catch button clicks, form validation, user workflows

Don't waste time testing UI if API is broken!

---

## Data & Security Issues

### 16. IDOR Vulnerabilities in Multi-Tenant Systems (October 19, 2025)

**What Happened:** Orchestration API initially implemented without verifying party involvement before returning data. GetOrchestrationDetails and GetEvents allowed any authenticated user to access orchestrations by ID, regardless of party membership.

**Why It Matters:** This is an Insecure Direct Object Reference (IDOR) vulnerability - authentication alone is insufficient for authorization in multi-tenant systems. Party A could access Party B's confidential orchestration data, event streams, and business information.

**Root Cause:**
- Initial implementation verified authentication (valid token) but not authorization (party membership)
- Assumed that knowing an orchestration ID meant user should have access
- Forgot that authentication ≠ authorization in multi-tenant systems

**How to Avoid:**
```typescript
// ❌ WRONG - Only checks authentication
app.http('GetOrchestrationDetails', {
  authLevel: 'anonymous',
  handler: async (request: HttpRequest, context: InvocationContext) => {
    const user = await extractUserFromToken(request, context);
    if (!user) return { status: 401 };

    // BUG: Any authenticated user can access any orchestration
    const details = await getOrchestrationDetails(orchestrationId);
    return { status: 200, jsonBody: details };
  }
});

// ✅ CORRECT - Checks authentication AND authorization
app.http('GetOrchestrationDetails', {
  authLevel: 'anonymous',
  handler: async (request: HttpRequest, context: InvocationContext) => {
    const user = await extractUserFromToken(request, context);
    if (!user) return { status: 401 };

    // VERIFY: Is this party involved in the orchestration?
    const isInvolved = await isPartyInvolvedInOrchestration(orchestrationId, user.partyId);

    if (!isInvolved) {
      // Log IDOR attempt for security monitoring
      await logAuditEvent({
        event_type: AuditEventType.ACCESS_DENIED,
        severity: AuditSeverity.WARNING,
        details: {
          reason: 'party_not_involved',
          security_issue: 'IDOR_ATTEMPT'
        }
      }, context);

      // Return 404 (not 403) to prevent information disclosure
      return { status: 404, jsonBody: { error: 'Orchestration not found' } };
    }

    const details = await getOrchestrationDetails(orchestrationId);
    return { status: 200, jsonBody: details };
  }
});
```

**Critical Security Patterns:**

1. **Return 404, not 403** - Prevents information disclosure
   - 403 confirms the resource exists but user lacks access
   - 404 gives no information about resource existence
   - Prevents enumeration attacks

2. **Log IDOR attempts** - Security monitoring
   - Flag with `security_issue: 'IDOR_ATTEMPT'`
   - Capture party_id, resource_id, IP address, user agent
   - Enable detection of malicious activity

3. **Verify at every endpoint** - Defense in depth
   - Don't rely on client-side checks
   - Verify party involvement for every data access
   - Apply to GET, POST, PUT, DELETE operations

**Files Fixed:**
- `api/src/functions/GetOrchestrationDetails.ts` (IDOR-001)
- `api/src/functions/GetEvents.ts` (IDOR-002)
- `api/src/utils/gremlinClient.ts` (added isPartyInvolvedInOrchestration helper)

**Reference:** SA agent security review, October 18, 2025 | Fix commit: 41bc2c6

---

### 17. Gremlin/NoSQL Injection Prevention (October 19, 2025)

**What Happened:** Initial gremlinClient.ts included executeQuery() function that accepted raw Gremlin query strings, enabling potential injection attacks if user input was concatenated into queries.

**Why It Matters:** Gremlin injection is similar to SQL injection - attackers can manipulate queries to access unauthorized data, modify the database, or extract sensitive information.

**Root Cause:**
- Direct query string execution without parameterization
- No input validation or sanitization
- Assumed developer usage would be safe (dangerous assumption)

**How to Avoid:**
```typescript
// ❌ WRONG - Vulnerable to injection
async function executeQuery(gremlinQuery: string) {
  const result = await client.submit(gremlinQuery);
  return result;
}

// If called like this:
const orchestrationId = request.query.get('id'); // User input!
const query = `g.V().hasLabel('Orchestration').has('id', '${orchestrationId}')`;
await executeQuery(query); // INJECTION VULNERABILITY

// ✅ CORRECT - Use parameterized queries
async function getOrchestrationDetails(orchestrationId: string) {
  // Use Gremlin traversal API with parameters, not string concatenation
  const result = await client.submit(
    'g.V().hasLabel("Orchestration").has("id", orchestrationId)',
    { orchestrationId } // Parameters passed separately
  );
  return result;
}

// ✅ EVEN BETTER - Deprecate unsafe functions entirely
async function executeQuery(gremlinQuery: string): Promise<never> {
  throw new Error(
    'executeQuery() is deprecated for security reasons. ' +
    'Use parameterized helper functions instead (getOrchestrationDetails, etc.)'
  );
}
```

**Security Pattern:**
1. **Never concatenate user input into queries** - Use parameterized queries
2. **Deprecate unsafe functions** - Remove temptation to use them
3. **Create safe helper functions** - Encapsulate parameterization logic
4. **Code review enforcement** - Block PRs that use string concatenation for queries

**Safe Helper Functions Created:**
- `getOrchestrationsForParty(partyId, statusFilter, skip, limit)`
- `getOrchestrationDetails(orchestrationId)`
- `isPartyInvolvedInOrchestration(orchestrationId, partyId)`
- `getEventsForOrchestration(orchestrationId, eventType, limit)`

All use Gremlin traversal API with parameters, not string concatenation.

**Files Fixed:**
- `api/src/utils/gremlinClient.ts` (INJ-001)

**Reference:** SA agent security review, October 18, 2025 | Fix commit: 41bc2c6

---

### 18. Environment Variable Validation at Startup (October 19, 2025)

**What Happened:** Cosmos DB client initialized without validating required environment variables (COSMOS_ORCHESTRATION_ENDPOINT, COSMOS_ORCHESTRATION_KEY). Application would fail at runtime when first request tried to access database.

**Why It Matters:** Runtime failures are harder to debug than startup failures. Missing configuration should fail fast with clear error messages, not cryptic errors during user requests.

**Root Cause:**
- Assumed environment variables would always be present
- No validation before using credentials
- Error only surfaced when client.submit() was called

**How to Avoid:**
```typescript
// ❌ WRONG - Fails at runtime with cryptic error
const endpoint = process.env.COSMOS_ORCHESTRATION_ENDPOINT;
const primaryKey = process.env.COSMOS_ORCHESTRATION_KEY;

const client = new gremlin.driver.Client(
  endpoint, // Could be undefined!
  { /* config using primaryKey */ }
);

// Error happens HERE, during user request:
const result = await client.submit('g.V().hasLabel("Orchestration")');
// TypeError: Cannot read property 'submit' of undefined

// ✅ CORRECT - Fail fast at startup with clear message
const endpoint = process.env.COSMOS_ORCHESTRATION_ENDPOINT;
const primaryKey = process.env.COSMOS_ORCHESTRATION_KEY;

if (!endpoint) {
  throw new Error(
    'COSMOS_ORCHESTRATION_ENDPOINT environment variable is required but not set. ' +
    'Please configure this in Azure Function App Settings.'
  );
}

if (!primaryKey) {
  throw new Error(
    'COSMOS_ORCHESTRATION_KEY environment variable is required but not set. ' +
    'Please configure this in Azure Function App Settings.'
  );
}

if (!endpoint.startsWith('https://')) {
  throw new Error(
    'COSMOS_ORCHESTRATION_ENDPOINT must start with https:// for security. ' +
    `Received: ${endpoint}`
  );
}

// Now safe to initialize client
const client = new gremlin.driver.Client(endpoint, { /* config */ });
```

**Validation Checklist:**
1. **Check presence** - Is variable defined?
2. **Check format** - Does it match expected pattern?
3. **Check protocol** - HTTPS required for endpoints?
4. **Provide clear error** - Tell user exactly what's wrong
5. **Validate at module load** - Fail before any requests

**Benefits:**
- Faster debugging (immediate feedback)
- Better error messages (actionable)
- Prevents partial failures (all-or-nothing)
- Operations team can fix before deployment

**Files Fixed:**
- `api/src/utils/gremlinClient.ts` (SEC-001)

**Reference:** SA agent security review, October 18, 2025 | Fix commit: 41bc2c6

---

### 19. Data Integrity Between Members and Legal Entities (October 16, 2025)

**What Happened:** Members had `legal_entity_id` values but corresponding legal entity records didn't exist in database.

**Why It Matters:** Blocked users from managing identifiers, causing production errors and UI failures.

**How to Avoid:**
```sql
-- Add FK constraints to prevent orphaned references
ALTER TABLE members
ADD CONSTRAINT fk_members_legal_entities
FOREIGN KEY (legal_entity_id)
REFERENCES legal_entities(id)
ON DELETE RESTRICT;

-- Migration 013: Ensure all members have legal entities
-- Added UI fallback with "Create Legal Entity" button for edge cases
```

Implement conditional UI rendering that checks for actual entity existence, not just ID presence.

---

### 17. Input Validation is Critical

**What Happened:** Multiple debugging sessions due to missing input validation.

**Why It Matters:** Prevents security vulnerabilities and runtime errors.

**How to Avoid:**
```typescript
// ALWAYS validate all user input at API endpoints
if (!kvkNumber || !/^\d{8}$/.test(kvkNumber)) {
  return context.res = { status: 400, body: 'Invalid KvK number' };
}
```

---

### 18. Authentication Headers Must Match Azure AD Configuration

**What Happened:** Admin portal API requests failed due to incorrect authentication headers.

**Why It Matters:** Azure AD requires exact match between requested scope and API configuration.

**How to Avoid:**
```typescript
// ✅ CORRECT scope
const scope = `api://${clientId}/.default`;

// ❌ WRONG
const scope = `https://func-ctn-demo-asr-dev.azurewebsites.net/.default`;
```

---

## Code Quality Issues

### 19. TypeScript 'any' Types Hide Bugs

**What Happened:** Runtime errors that TypeScript couldn't catch due to `any` usage.

**Why It Matters:** Lost type safety benefits, harder to refactor.

**How to Avoid:**
```typescript
// ❌ WRONG
function processData(data: any) {
  return data.value; // No type checking
}

// ✅ CORRECT
interface DataItem {
  value: string;
}
function processData(data: DataItem | unknown) {
  if (typeof data === 'object' && data !== null && 'value' in data) {
    return (data as DataItem).value;
  }
  throw new Error('Invalid data');
}
```

Use proper types, interfaces, or `unknown` with type guards.

---

### 20. Test Artifacts Should Not Be Committed

**What Happened:** Playwright test reports and error contexts committed to Git.

**Why It Matters:** Repository bloat, merge conflicts.

**How to Avoid:**
```gitignore
# .gitignore
playwright-report/
test-results/
.playwright/
```

---

## Database Issues

### 21. Database Migrations Need Careful Planning

**What Happened:** Migration 011 (BDI) and 012 (International registries) required coordination.

**Why It Matters:** Database schema changes affect multiple services.

**How to Avoid:**
- Test migrations in dev environment first
- Coordinate with API deployments
- Invoke DE (Database Expert) agent before applying

---

## Miscellaneous

### 22. Language Switcher Page Reloads Break UX

**What Happened:** Language changes caused full page reload, losing application state.

**Why It Matters:** Poor user experience, loss of unsaved work.

**How to Avoid:** Use i18n library state changes without page reload (implemented with react-i18next).

---

### 23. BDI Integration Requires Multiple Registry Identifiers

**What Happened:** Initial implementation only supported KvK numbers.

**Why It Matters:** International companies need their local registry identifiers.

**How to Avoid:** Design for international support from the start (EUID, LEI, HRB, etc.).

---

### 24. i18n Configuration: Avoid HttpBackend with Embedded Translations (October 21, 2025)

**What Happened:** Both Admin and Member Portals showed white pages after deployment. Investigation revealed i18n was configured with `HttpBackend` to load translations from `/locales/{{lng}}/{{ns}}.json` AND `useSuspense: true`, causing React to wait forever for translations that didn't exist in the deployment.

**Why It Matters:** Application completely unusable - white page, no errors in Network tab, successful build. User frustration, deployment appeared successful but application broken.

**Root Cause:**
```typescript
// web/src/i18n.ts - BROKEN CONFIGURATION
import HttpBackend from 'i18next-http-backend';

i18n
  .use(HttpBackend)  // ← Trying to load from HTTP
  .use(LanguageDetector)
  .use(initReactI18next)
  .init({
    resources: {
      // Translations already embedded in bundle
      en: { translation: enTranslations },
      nl: { translation: nlTranslations },
      de: { translation: deTranslations },
    },
    backend: {
      loadPath: '/locales/{{lng}}/{{ns}}.json',  // ← File doesn't exist
    },
    react: {
      useSuspense: true,  // ← React waits forever for HTTP load
    },
  });
```

**How to Avoid:**
```typescript
// CORRECT: No HttpBackend when translations are embedded
import i18n from 'i18next';
import LanguageDetector from 'i18next-browser-languagedetector';
import { initReactI18next } from 'react-i18next';

// Import translations directly (bundled in JavaScript)
import enTranslations from './locales/en/translation.json';
import nlTranslations from './locales/nl/translation.json';
import deTranslations from './locales/de/translation.json';

i18n
  .use(LanguageDetector)  // No HttpBackend
  .use(initReactI18next)
  .init({
    resources: {
      en: { translation: enTranslations },
      nl: { translation: nlTranslations },
      de: { translation: deTranslations },
    },
    react: {
      useSuspense: false,  // Don't block - translations immediately available
    },
  });
```

**Key Principles:**
- **HttpBackend is for loading translations from external URLs/APIs**
- **Embedded translations (imported from JSON) don't need HttpBackend**
- **useSuspense: true blocks React rendering until translations load**
- **White page + successful build = check for Suspense/lazy loading issues**

**Debugging Tip:**
```bash
# Check if translation files exist in deployment
curl -I https://your-app.azurestaticapps.net/locales/en/translation.json
# If returns HTML (404 page), translations aren't deployed as static files
# → Remove HttpBackend and use embedded translations
```

Cost: 2+ hours debugging, complete application outage.

---

### 25. Session Summaries Capture Critical Context

**What Happened:** Detailed session summaries helped reconstruct decisions weeks later.

**Why It Matters:** Institutional knowledge preservation, onboarding.

**How to Avoid:** Always create session summaries after significant work.

---

### 25. Environment Variables Must Be Synced Across Environments

**What Happened:** Production deployment failed due to missing environment variables.

**Why It Matters:** Runtime errors, security issues.

**How to Avoid:** Maintain checklist of required env vars, validate before deployment.

---

**Total time saved by these lessons: 120+ hours of debugging**

**October 19, 2025 Security Lessons:**
- IDOR vulnerabilities (lessons 16-18): Would have caused production security breach requiring emergency patching, customer notifications, potential data exposure incidents. Estimated cost: 20+ hours emergency response + reputation damage + potential regulatory fines.
