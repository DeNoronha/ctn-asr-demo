# CTN ASR Coding Standards

**Last Updated:** October 16, 2025

This document defines the coding standards for the CTN Association Register project. All code should follow these conventions for consistency and maintainability.

---

## 1. Naming Conventions

### 1.1 Database Schema

**Column Names: snake_case**
```sql
✓ GOOD:
legal_entity_id
dt_created
dt_modified
kvk_verification_status
document_uploaded_at

✗ BAD:
legalEntityId
dtCreated
documentUploadedAt (missing prefix when part of kvk_* group)
```

**Table Names: snake_case**
```sql
✓ GOOD:
legal_entity
legal_entity_contact
endpoint_authorization

✗ BAD:
LegalEntity
legalEntityContact
```

**Consistency Rule:** Related columns should share prefixes
```sql
✓ GOOD:
kvk_document_url
kvk_verification_status
kvk_verified_at
kvk_verified_by
kvk_extracted_company_name

✗ BAD:
kvk_document_url
verification_status  ← Missing kvk_ prefix
document_uploaded_at ← Missing kvk_ prefix
```

### 1.2 API Routes

**Path Segments: kebab-case**
```
✓ GOOD:
/v1/legal-entities/{legalEntityId}/identifiers
/v1/kvk-verification/flagged-entities
/v1/member-contacts

✗ BAD:
/v1/legalentities/...  ← No separation
/v1/kvk_verification/... ← Snake case in URL
/v1/member/contacts  ← Inconsistent (missing hyphen)
```

**Route Parameters: camelCase (forced by Azure Functions v4)**
```
✓ GOOD:
{legalEntityId}
{memberId}
{orgId}

✗ BAD:
{legal_entity_id}  ← Doesn't match code convention
{legalentityid}    ← Hard to read
```

**Note:** Azure Functions v4 lowercases all route parameters internally, so `{legalEntityId}` becomes `request.params.legalentityid`. Always access with lowercase.

**Query Parameters: snake_case**
```
✓ GOOD:
?task_type=kvk_verification
?assigned_to=admin@ctn.nl
?include_overdue=true

✗ BAD:
?taskType=...
?assignedTo=...
```

### 1.3 File Naming

**API Functions: PascalCase**
```
✓ GOOD:
GetIdentifiers.ts
CreateIdentifier.ts
UpdateLegalEntity.ts
GetMembers.ts

✗ BAD:
getIdentifiers.ts
createidentifier.ts
update-legal-entity.ts
```

**React Components: PascalCase**
```
✓ GOOD:
ContactsManager.tsx
IdentifiersManager.tsx
MemberDetailDialog.tsx

✗ BAD:
contactsManager.tsx
identifiers-manager.tsx
```

**Utilities: camelCase**
```
✓ GOOD:
dateUtils.ts
pagination.ts
auditLog.ts

✗ BAD:
DateUtils.ts
Pagination.ts
```

**Services: camelCase with Service suffix**
```
✓ GOOD:
kvkService.ts
emailService.ts
taskService.ts

✗ BAD:
KvKService.ts
email.ts  ← Missing suffix
```

### 1.4 TypeScript Code

**Variables & Functions: camelCase**
```typescript
✓ GOOD:
const legalEntityId = '123';
const userEmail = 'user@example.com';
function validateToken(token: string): boolean { ... }

✗ BAD:
const LegalEntityId = '123';
const user_email = 'user@example.com';
function ValidateToken(token: string): boolean { ... }
```

**Interfaces & Types: PascalCase**
```typescript
✓ GOOD:
interface LegalEntity { ... }
interface CreateTaskInput { ... }
type ValidationError = { ... }

✗ BAD:
interface legalEntity { ... }
interface createTaskInput { ... }
type validationError = { ... }
```

**Constants: UPPER_SNAKE_CASE**
```typescript
✓ GOOD:
const API_BASE_URL = 'https://...';
const MAX_RETRY_ATTEMPTS = 3;

✗ BAD:
const ApiBaseUrl = '...';
const maxRetryAttempts = 3;
```

**Private Class Members: camelCase with _ prefix (optional)**
```typescript
✓ GOOD:
private _internalState: State;
private cacheData: Map<string, any>;

✗ BAD:
private InternalState: State;
```

---

## 2. Date and Timezone Standards

### 2.1 Database Timestamps

**ALWAYS use `TIMESTAMP WITH TIME ZONE`**
```sql
✓ GOOD:
dt_created TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
kvk_verified_at TIMESTAMP WITH TIME ZONE
expires_at TIMESTAMP WITH TIME ZONE

✗ BAD:
created_at TIMESTAMP WITHOUT TIME ZONE  ← No timezone info
updated_at TIMESTAMP  ← Ambiguous
```

**Rationale:** `TIMESTAMP WITH TIME ZONE` stores timestamps in UTC internally and converts to/from any timezone automatically. This prevents timezone bugs.

**Unix Timestamp Conversion:**
```sql
✓ GOOD:
to_timestamp($1) AT TIME ZONE 'UTC'

✗ BAD:
to_timestamp($1)  ← Assumes server timezone
```

### 2.2 API Date Responses

**Always return dates in ISO 8601 format with UTC timezone**
```typescript
✓ GOOD:
{
  "created_at": "2025-10-16T14:30:00.000Z",  ← Z indicates UTC
  "expires_at": "2025-10-17T14:30:00.000Z"
}

✗ BAD:
{
  "created_at": "2025-10-16T14:30:00",  ← No timezone
  "expires_at": "10/17/2025"  ← Ambiguous format
}
```

**PostgreSQL Query:**
```typescript
// When selecting timestamps, always format as ISO with timezone
const result = await pool.query(`
  SELECT
    dt_created AT TIME ZONE 'UTC' as created_at,
    expires_at AT TIME ZONE 'UTC' as expires_at
  FROM table_name
`);

// Or use to_json which automatically converts to ISO 8601
const result = await pool.query(`
  SELECT to_json(dt_created) as created_at FROM table_name
`);
```

### 2.3 Frontend Date Formatting

**ALWAYS use centralized `dateUtils.ts`**
```typescript
✓ GOOD:
import { formatDate, formatDateTime } from '@/utils/dateUtils';

const display = formatDate(date);  // Uses user's locale
const displayWithTime = formatDateTime(date);

✗ BAD:
const display = new Date(date).toLocaleDateString();
const display2 = new Date(date).toLocaleString('nl-NL');  ← Hardcoded locale
```

**Available Utility Functions:**
```typescript
// web/src/utils/dateUtils.ts
export function formatDate(date: string | Date, options?: Intl.DateTimeFormatOptions): string
export function formatDateTime(date: string | Date): string
export function formatTime(date: string | Date): string
export function getRelativeTime(date: string | Date): string
export function getUserLocale(): string
```

### 2.4 Locale Handling

**NEVER hardcode locale strings**
```typescript
✓ GOOD:
const locale = getUserLocale();  // Gets from i18n or browser
date.toLocaleDateString(locale, options);

✗ BAD:
date.toLocaleDateString('nl-NL', options);  ← Hardcoded Dutch
```

**Supported Locales:** nl-NL (Dutch), en-GB (English), de-DE (German)

### 2.5 Timezone Display

**Show timezone information for absolute timestamps**
```typescript
✓ GOOD:
"Created: 2025-10-16 14:30 UTC"
"Expires: 2025-10-17 14:30 (in 23 hours)"

✗ BAD:
"Created: 2025-10-16 14:30"  ← No timezone info
```

**For relative times, timezone not needed:**
```typescript
✓ GOOD:
"Created 2 hours ago"
"Expires in 23 hours"
```

---

## 3. Error Handling Standards

### 3.1 HTTP Status Codes

```typescript
200 OK - Successful GET/PUT
201 Created - Successful POST
204 No Content - Successful DELETE
400 Bad Request - Validation error
401 Unauthorized - Missing/invalid auth token
403 Forbidden - Valid auth but no permission
404 Not Found - Resource doesn't exist
409 Conflict - Duplicate resource
422 Unprocessable Entity - Business logic error
429 Too Many Requests - Rate limit exceeded
500 Internal Server Error - Unexpected server error
```

### 3.2 Error Response Format

```typescript
✓ GOOD:
{
  "error": "Validation failed",
  "details": [
    { "field": "kvk_number", "message": "Must be 8 digits" }
  ]
}

✗ BAD:
{
  "message": "Error"  ← Not helpful
}
```

---

## 4. Security Standards

### 4.1 SQL Queries

**ALWAYS use parameterized queries**
```typescript
✓ GOOD:
await pool.query('SELECT * FROM members WHERE email = $1', [email]);

✗ BAD:
await pool.query(`SELECT * FROM members WHERE email = '${email}'`);  ← SQL injection risk
```

### 4.2 Secrets

**NEVER commit secrets to Git**
```typescript
✗ BAD:
const SECRET_KEY = 'abc123xyz';  ← Hardcoded secret

✓ GOOD:
const SECRET_KEY = process.env.SECRET_KEY;  ← From environment
```

All secrets must be stored in Azure Key Vault and accessed via environment variables.

---

## 5. Code Organization Standards

### 5.1 Import Order

```typescript
// 1. External libraries
import { app, HttpRequest, InvocationContext } from '@azure/functions';
import axios from 'axios';

// 2. Internal utilities/services
import { pool } from '../utils/database';
import { validateToken } from '../middleware/auth';

// 3. Types/interfaces
import type { LegalEntity, CreateTaskInput } from '../types';

// 4. Relative imports
import { formatDate } from './dateUtils';
```

### 5.2 File Structure

```
api/
├── src/
│   ├── functions/          ← Azure Functions (PascalCase)
│   │   ├── GetMembers.ts
│   │   └── CreateMember.ts
│   ├── services/           ← Business logic (camelCase)
│   │   ├── kvkService.ts
│   │   └── emailService.ts
│   ├── utils/              ← Utilities (camelCase)
│   │   ├── database.ts
│   │   └── pagination.ts
│   ├── middleware/         ← Middleware (camelCase)
│   │   ├── auth.ts
│   │   └── rateLimit.ts
│   └── types/              ← Type definitions
│       └── index.ts

web/
├── src/
│   ├── components/         ← React components (PascalCase)
│   │   ├── MembersGrid.tsx
│   │   └── ContactsManager.tsx
│   ├── services/           ← API clients (camelCase)
│   │   ├── api.ts
│   │   └── apiV2.ts
│   └── utils/              ← Utilities (camelCase)
│       ├── dateUtils.ts
│       └── validation.ts
```

---

## 6. Documentation Standards

### 6.1 Function Documentation

```typescript
/**
 * Creates a new legal entity identifier (KvK, LEI, EORI, etc.)
 *
 * @param legalEntityId - UUID of the legal entity
 * @param identifierData - Identifier details (type, value, country)
 * @returns The created identifier record
 * @throws {Error} If validation fails or identifier already exists
 */
export async function createIdentifier(
  legalEntityId: string,
  identifierData: CreateIdentifierInput
): Promise<LegalEntityIdentifier> {
  // Implementation
}
```

### 6.2 Complex Logic Comments

```typescript
// Calculate expiry date: 24 hours from now for BVAD tokens
const expiryDate = new Date(Date.now() + 24 * 60 * 60 * 1000);

// KvK numbers must be exactly 8 digits (Dutch Chamber of Commerce standard)
const kvkRegex = /^\d{8}$/;
```

---

## 7. Testing Standards

### 7.1 API Tests (curl)

**Test in this order:**
1. Create test data (save IDs from responses)
2. Verify operations work
3. Clean up (delete test data)

**Example:**
```bash
# 1. Create
RESPONSE=$(curl -X POST .../identifiers -d '{"type":"KVK","value":"12345678"}')
ID=$(echo $RESPONSE | jq -r '.identifier_id')

# 2. Verify
curl -X GET .../identifiers/$ID

# 3. Clean up
curl -X DELETE .../identifiers/$ID
```

### 7.2 UI Tests (Playwright)

**Run AFTER API tests pass**

```typescript
test('should display identifiers correctly', async ({ page }) => {
  // Use deterministic test data
  // Verify UI elements
  // Clean up test data
});
```

---

## 8. Commit Message Standards

Follow Conventional Commits:

```
feat: Add KvK verification review workflow
fix: Correct timezone handling in date display
docs: Update API documentation for identifiers
style: Apply CTN brand colors to task cards
refactor: Standardize naming conventions across API
test: Add E2E tests for member creation
chore: Update dependencies to latest versions
```

**Format:**
```
<type>: <short description>

<optional longer description>

<optional footer>
```

---

## 9. Summary Checklist

When writing code, verify:

- [ ] Database columns use `snake_case` with consistent prefixes
- [ ] Database timestamps use `TIMESTAMP WITH TIME ZONE`
- [ ] API routes use `kebab-case` for paths
- [ ] API functions use `PascalCase` filenames
- [ ] React components use `PascalCase`
- [ ] Variables/functions use `camelCase`
- [ ] Dates returned from API include UTC timezone (`Z`)
- [ ] Frontend uses centralized `dateUtils` for formatting
- [ ] No hardcoded locales (use `getUserLocale()`)
- [ ] SQL queries use parameterized parameters ($1, $2, etc.)
- [ ] No secrets committed to Git
- [ ] Error responses include helpful messages
- [ ] Functions have JSDoc comments
- [ ] Imports are organized (external → internal → types → relative)

---

**Questions or clarifications?** See CLAUDE.md or ask in project discussions.
