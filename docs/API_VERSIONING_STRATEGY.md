# CTN ASR API Versioning Strategy

**Version:** 1.0
**Last Updated:** 2025-10-19
**Status:** Active

---

## 1. Versioning Scheme

### 1.1 Format

We use **URL path versioning** with semantic versioning:

- **Format:** `/api/v{MAJOR}/resource`
- **Example:** `/api/v1/members`, `/api/v2/members`

### 1.2 Semantic Versioning

- **MAJOR (v1 → v2):** Breaking changes that require client updates
- **MINOR:** New features, backward compatible
- **PATCH:** Bug fixes, backward compatible

MINOR and PATCH changes do NOT change the URL version.

### 1.3 Why URL Path Versioning?

**Pros:**
- ✅ Clear and explicit
- ✅ Easy to cache (by URL)
- ✅ Works with all HTTP clients
- ✅ No custom headers required
- ✅ Simple to test in browser or curl
- ✅ Follows REST best practices

**Cons of Header Versioning:**
- ❌ Harder to test (can't test in browser)
- ❌ Caching issues
- ❌ Client must remember to set header
- ❌ Not visible in URL

---

## 2. What Constitutes a Breaking Change?

### 2.1 Breaking Changes (Require Major Version Bump)

**Response Structure Changes:**
- Removing or renaming a field
- Changing field types (string → number, object → array)
- Changing response envelope structure
- Making a field required that was optional

**Endpoint Changes:**
- Removing an endpoint
- Renaming an endpoint
- Changing URL structure

**Authentication/Authorization:**
- Changing authentication mechanism
- Changing required scopes or permissions
- Changing token format

**Request Changes:**
- Making optional parameters required
- Removing support for query parameters
- Changing parameter validation rules (stricter)

**Example:**
```json
// v1 response
{
  "legal_name": "Acme Corp",
  "status": "ACTIVE",
  "kvk_number": "12345678"
}

// v2 response (BREAKING - renamed fields)
{
  "name": "Acme Corp",           // ❌ Breaking: "legal_name" removed
  "state": "ACTIVE",             // ❌ Breaking: "status" removed
  "registration_number": "12345678"  // ❌ Breaking: "kvk_number" removed
}
```

### 2.2 Non-Breaking Changes (Minor/Patch)

**Additive Changes:**
- Adding new optional fields
- Adding new endpoints
- Adding new optional query parameters
- Adding new enum values (with proper default handling)

**Fixes:**
- Bug fixes
- Performance improvements
- Security patches

**Documentation:**
- Documentation updates
- Error message improvements

**Example:**
```json
// v1 response
{
  "legal_name": "Acme Corp",
  "status": "ACTIVE"
}

// v1.1 response (NON-BREAKING - new optional field)
{
  "legal_name": "Acme Corp",
  "status": "ACTIVE",
  "created_at": "2025-01-01T00:00:00Z",  // ✅ OK: New optional field
  "industry": "Technology"                // ✅ OK: New optional field
}
```

---

## 3. Deprecation Policy

### 3.1 Support Timeline

- **Current version (v2):** Fully supported, all new features
- **Previous version (v1):** Maintained for **12 months** after v2 release
- **Older versions (v0, legacy):** No support, will return **410 Gone**

### 3.2 Deprecation Process

**Timeline: 12 months from announcement to sunset**

#### Phase 1: Announce (T-12 months)
- Add `Deprecation` header to all v1 responses
- Update documentation with migration guide
- Email all registered API consumers
- Post announcement in developer portal
- Add warning banner to API documentation

#### Phase 2: Warn (T-6 months)
- Add `Sunset` header with specific shutdown date
- Return deprecation warning in response body (non-breaking)
- Monitor usage metrics and reach out to heavy users
- Provide dedicated support for migration questions

#### Phase 3: Final Notice (T-3 months)
- Email final warning to all consumers
- Add deprecation notice to error logs
- Increase monitoring frequency
- Prepare sunset response handlers

#### Phase 4: Sunset (T-0)
- Return **410 Gone** for all deprecated version requests
- Provide clear error message with migration link
- Monitor error rates and support tickets

### 3.3 HTTP Headers

**Deprecation Headers (added to v1 responses):**

```http
HTTP/1.1 200 OK
API-Version: v1
Deprecation: Sun, 01 Jun 2026 00:00:00 GMT
Sunset: Sun, 01 Dec 2026 00:00:00 GMT
Link: <https://docs.ctn.cloud/migrations/v1-to-v2>; rel="deprecation"
Content-Type: application/json

{
  "data": [...],
  "_deprecation_notice": {
    "message": "API v1 is deprecated and will be sunset on 2026-12-01",
    "migration_guide": "https://docs.ctn.cloud/migrations/v1-to-v2"
  }
}
```

**Sunset Response (after sunset date):**

```http
HTTP/1.1 410 Gone
API-Version: v1
Content-Type: application/json

{
  "error": "API Version Sunset",
  "message": "API version v1 is no longer supported as of 2026-12-01",
  "sunset_date": "2026-12-01T00:00:00Z",
  "current_version": "v2",
  "migration_guide": "https://docs.ctn.cloud/migrations/v1-to-v2"
}
```

---

## 4. Version Migration Guide

### 4.1 Creating a New API Version

**Step 1: Plan the Changes**

Document all breaking changes:
- Field renames
- Removed fields
- New required fields
- Changed validation rules
- New response structures

**Step 2: Create Version Directory Structure**

```
api/src/functions/
  v1/
    members/
      GetMembers.ts
      CreateMember.ts
      UpdateMember.ts
    parties/
      GetParties.ts
      CreateParty.ts
  v2/
    members/
      GetMembers.ts      # New version with breaking changes
      CreateMember.ts    # New version
      UpdateMember.ts    # New version
    parties/
      GetParties.ts      # New version
      CreateParty.ts     # New version
```

**Step 3: Update Route Prefixes**

```typescript
// v2/members/GetMembers.ts
import { app, HttpRequest, HttpResponseInit, InvocationContext } from '@azure/functions';

app.http('GetMembersV2', {
  methods: ['GET'],
  authLevel: 'anonymous',
  route: 'v2/members',  // Note: v2 prefix
  handler: GetMembersV2
});

export async function GetMembersV2(
  request: HttpRequest,
  context: InvocationContext
): Promise<HttpResponseInit> {
  // New implementation with v2 response format
}
```

**Step 4: Add Deprecation Headers to Previous Version**

```typescript
// v1/members/GetMembers.ts
import { addVersionHeaders } from '../../middleware/versioning';

export async function GetMembers(
  request: HttpRequest,
  context: InvocationContext
): Promise<HttpResponseInit> {
  // Existing v1 logic
  const response = {
    status: 200,
    jsonBody: {
      data: members,
      _deprecation_notice: {
        message: 'API v1 is deprecated. Please migrate to v2.',
        migration_guide: 'https://docs.ctn.cloud/migrations/v1-to-v2',
        sunset_date: '2026-12-01'
      }
    }
  };

  return addVersionHeaders(response, 'v1');
}
```

**Step 5: Register Both Versions**

```typescript
// api/src/functions/essential-index.ts
import './v1/members/GetMembers';
import './v1/members/CreateMember';

import './v2/members/GetMembers';
import './v2/members/CreateMember';
```

### 4.2 Code Sharing Between Versions

**Option A: Shared Business Logic (Recommended)**

```typescript
// src/services/memberService.ts
export class MemberService {
  async getMembers(filters: MemberFilters): Promise<Member[]> {
    // Database query logic (shared)
    return await this.repository.findAll(filters);
  }

  async createMember(data: CreateMemberInput): Promise<Member> {
    // Business logic (shared)
    return await this.repository.create(data);
  }
}

// v1/members/GetMembers.ts
import { MemberService } from '../../services/memberService';
import { transformToV1Response } from './transformers';

export async function GetMembers(request: HttpRequest): Promise<HttpResponseInit> {
  const service = new MemberService();
  const members = await service.getMembers(parseFilters(request));

  return {
    status: 200,
    jsonBody: transformToV1Response(members)  // v1 format
  };
}

// v2/members/GetMembers.ts
import { MemberService } from '../../services/memberService';
import { transformToV2Response } from './transformers';

export async function GetMembersV2(request: HttpRequest): Promise<HttpResponseInit> {
  const service = new MemberService();
  const members = await service.getMembers(parseFilters(request));

  return {
    status: 200,
    jsonBody: transformToV2Response(members)  // v2 format
  };
}
```

**Option B: Shared Utilities**

```typescript
// src/utils/transformers.ts
export function transformToV1(member: Member) {
  return {
    legal_name: member.name,
    status: member.state,
    kvk_number: member.registrationNumber
  };
}

export function transformToV2(member: Member) {
  return {
    name: member.name,
    state: member.state,
    registration_number: member.registrationNumber
  };
}
```

### 4.3 Database Migrations

**Key Principle:** Database schema supports ALL active API versions.

**Approach:**

1. **Additive Schema Changes Only**
   - Add new columns, don't remove old ones during overlap period
   - Use views or aliases for renamed columns
   - Maintain backward compatibility

2. **Example: Field Rename**

```sql
-- Add new column (v2)
ALTER TABLE members ADD COLUMN name VARCHAR(255);

-- Copy data from old column
UPDATE members SET name = legal_name WHERE name IS NULL;

-- During overlap period: Keep both columns
-- v1 reads/writes: legal_name
-- v2 reads/writes: name
-- Sync both columns via triggers

-- After v1 sunset: Drop old column
ALTER TABLE members DROP COLUMN legal_name;
```

3. **Database Views for Version-Specific Data**

```sql
-- View for v1 API
CREATE VIEW members_v1 AS
SELECT
  id,
  legal_name,
  status,
  kvk_number
FROM members;

-- View for v2 API
CREATE VIEW members_v2 AS
SELECT
  id,
  name,
  state,
  registration_number
FROM members;
```

---

## 5. Client Communication

### 5.1 Changelog

Maintain `CHANGELOG.md` with format:

```markdown
# CTN ASR API Changelog

All notable changes to this API will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [2.0.0] - 2026-01-01

### Breaking Changes
- **Renamed fields in members endpoint:**
  - `legal_name` → `name`
  - `status` → `state`
  - `kvk_number` → `registration_number`
- **Removed deprecated `/api/v1/search` endpoint** (use `/api/v2/members?search=` instead)
- **Changed pagination format:**
  - Old: `{ total, page, page_size, data }`
  - New: `{ data, pagination: { total, page, limit, has_more } }`

### Added
- **New `/api/v2/members/search` endpoint** with advanced filtering
- **Pagination support** for all list endpoints (limit, offset, cursor)
- **Sorting support** via `?sort=field:asc` query parameter
- **Field selection** via `?fields=name,state` for reduced payload

### Fixed
- Fixed race condition in member creation
- Fixed timezone handling in date filters
- Corrected error codes (404 instead of 500 for not found)

### Deprecated
- API v1 is now deprecated and will be sunset on 2026-12-01
- Migration guide: https://docs.ctn.cloud/migrations/v1-to-v2

## [1.2.0] - 2025-09-01

### Added
- New optional `industry` field in member response
- New `/api/v1/members/{id}/roles` endpoint

### Fixed
- Performance improvement for member list queries

## [1.1.0] - 2025-06-01

### Added
- New optional `created_at` field in all responses
- New `/api/v1/health` endpoint

---

## Migration Guides
- [v1 to v2 Migration Guide](./migrations/v1-to-v2.md)
```

### 5.2 Release Notes

For each release, create detailed release notes:

**File:** `docs/releases/v2.0.0.md`

```markdown
# API v2.0.0 Release Notes

**Release Date:** 2026-01-01
**Status:** Current Version
**Previous Version:** v1 (deprecated)

## Overview

API v2.0.0 introduces improved data consistency, better pagination, and cleaner field naming.

## What's New

### 1. Consistent Field Naming
All fields now use `snake_case` consistently:
- `legal_name` → `name`
- `status` → `state`
- `kvk_number` → `registration_number`

### 2. Improved Pagination
New pagination format with cursor support:

```json
{
  "data": [...],
  "pagination": {
    "total": 150,
    "page": 1,
    "limit": 25,
    "has_more": true,
    "next_cursor": "eyJpZCI6MTAwfQ=="
  }
}
```

### 3. Advanced Filtering
New search endpoint with powerful filters:

```bash
GET /api/v2/members?search=acme&state=ACTIVE&sort=created_at:desc
```

## Breaking Changes

See [Migration Guide](../migrations/v1-to-v2.md) for full details.

## Deprecation Notice

**API v1 is deprecated** and will be sunset on **2026-12-01**.

Please migrate to v2 before this date.

## Support

- Migration support: api-support@ctn.cloud
- Documentation: https://docs.ctn.cloud/api/v2
- Migration guide: https://docs.ctn.cloud/migrations/v1-to-v2
```

### 5.3 Email Communication Templates

**Email 1: Deprecation Announcement (T-12 months)**

```
Subject: API v1 Deprecation Notice - Action Required

Dear CTN ASR API Consumer,

We're writing to inform you that API v1 will be deprecated on June 1, 2026, and sunset on December 1, 2026.

Timeline:
- June 1, 2026: v1 marked as deprecated
- December 1, 2026: v1 sunset (returns 410 Gone)

What You Need to Do:
1. Review the migration guide: https://docs.ctn.cloud/migrations/v1-to-v2
2. Test your integration with API v2 in our staging environment
3. Migrate to v2 before December 1, 2026

Key Changes:
- Field renames (legal_name → name, status → state)
- Improved pagination format
- New advanced filtering capabilities

Resources:
- Migration guide: https://docs.ctn.cloud/migrations/v1-to-v2
- API v2 documentation: https://docs.ctn.cloud/api/v2
- Support: api-support@ctn.cloud

We're here to help! Reply to this email with any questions.

Best regards,
CTN API Team
```

**Email 2: Final Warning (T-3 months)**

```
Subject: API v1 Sunset in 3 Months - Final Notice

Dear CTN ASR API Consumer,

This is a final reminder that API v1 will be sunset in 3 months on December 1, 2026.

After this date, all v1 requests will return HTTP 410 Gone.

Our records show your application is still using v1. Please migrate to v2 immediately.

Need Help?
Schedule a migration support call: https://calendly.com/ctn-api-support
Email us: api-support@ctn.cloud

Migration guide: https://docs.ctn.cloud/migrations/v1-to-v2

Best regards,
CTN API Team
```

---

## 6. Monitoring and Metrics

### 6.1 Version Usage Tracking

Log all API requests with version information in Application Insights:

```typescript
import { InvocationContext } from '@azure/functions';

export function logApiRequest(
  context: InvocationContext,
  version: string,
  endpoint: string,
  request: HttpRequest
) {
  context.log('API Request', {
    version: version,
    endpoint: endpoint,
    method: request.method,
    client_ip: request.headers.get('x-forwarded-for'),
    user_agent: request.headers.get('user-agent'),
    client_id: request.headers.get('x-client-id'), // If clients register
    timestamp: new Date().toISOString()
  });
}
```

### 6.2 Deprecation Metrics

Track deprecated version usage and log warnings:

```typescript
export function logDeprecatedVersionUsage(
  context: InvocationContext,
  version: string,
  endpoint: string,
  request: HttpRequest
) {
  context.warn('Deprecated API version used', {
    version: version,
    endpoint: endpoint,
    client_ip: request.headers.get('x-forwarded-for'),
    user_agent: request.headers.get('user-agent'),
    sunset_date: '2026-12-01',
    migration_guide: 'https://docs.ctn.cloud/migrations/v1-to-v2'
  });
}
```

### 6.3 Application Insights Queries

**Query 1: Requests by Version**

```kusto
requests
| where timestamp > ago(30d)
| extend version = tostring(customDimensions.version)
| summarize count() by version, bin(timestamp, 1d)
| render timechart
```

**Query 2: Deprecated Version Usage**

```kusto
traces
| where timestamp > ago(7d)
| where message contains "Deprecated API version"
| extend version = tostring(customDimensions.version)
| extend endpoint = tostring(customDimensions.endpoint)
| extend client_ip = tostring(customDimensions.client_ip)
| summarize count() by version, endpoint, client_ip
| order by count_ desc
```

**Query 3: Error Rates by Version**

```kusto
requests
| where timestamp > ago(7d)
| extend version = tostring(customDimensions.version)
| summarize
    total = count(),
    errors = countif(resultCode >= 400)
    by version
| extend error_rate = (errors * 100.0) / total
| project version, total, errors, error_rate
```

### 6.4 Dashboard Metrics

Create Application Insights dashboard with:

1. **Version Distribution Pie Chart**
   - % of requests by version (v1, v2, etc.)

2. **Version Adoption Timeline**
   - Line chart showing v1 decline, v2 growth

3. **Deprecated Version Alert**
   - Alert when v1 usage > 10% after deprecation date

4. **Top Clients Still on v1**
   - Table of IP addresses or client IDs using v1

---

## 7. Implementation Checklist

### Pre-Launch (New Version)
- [ ] Document all breaking changes in CHANGELOG.md
- [ ] Create migration guide (docs/migrations/vX-to-vY.md)
- [ ] Implement new version in separate directory (v2/)
- [ ] Add version detection middleware
- [ ] Add version headers to responses
- [ ] Test backward compatibility (v1 still works)
- [ ] Update OpenAPI/Swagger documentation
- [ ] Create release notes

### Launch Day
- [ ] Deploy new version to production
- [ ] Verify both versions work in production
- [ ] Monitor error rates for both versions
- [ ] Send deprecation announcement email
- [ ] Update documentation website
- [ ] Add deprecation banner to v1 docs

### Deprecation Period (T-12 to T-0)
- [ ] Add Deprecation header to old version responses
- [ ] Add Sunset header 6 months before sunset
- [ ] Monitor usage metrics weekly
- [ ] Send reminder emails (T-6mo, T-3mo, T-1mo)
- [ ] Reach out to heavy users of old version
- [ ] Provide migration support

### Sunset Day
- [ ] Update version info to mark v1 as sunset
- [ ] Deploy sunset response (410 Gone)
- [ ] Monitor error rates and support tickets
- [ ] Be ready to provide emergency support
- [ ] Document any issues for future sunsets

### Post-Sunset (T+1 month)
- [ ] Remove v1 code from codebase (optional)
- [ ] Archive v1 documentation
- [ ] Document lessons learned
- [ ] Update database schema (remove dual-support columns)

---

## 8. References

### Industry Best Practices
- [Stripe API Versioning](https://stripe.com/docs/api/versioning) - Header-based with date versions
- [GitHub API Versioning](https://docs.github.com/en/rest/overview/api-versions) - URL path versioning
- [Twilio API Versioning](https://www.twilio.com/docs/usage/api/versioning) - Date-based versions
- [Google Cloud API Versioning](https://cloud.google.com/apis/design/versioning) - Major version in URL

### Standards
- [RFC 7231 - HTTP/1.1 Semantics](https://tools.ietf.org/html/rfc7231) - HTTP status codes
- [RFC 8594 - Sunset Header](https://tools.ietf.org/html/rfc8594) - Sunset header specification
- [Semantic Versioning](https://semver.org/) - Version numbering scheme

### Articles
- [Best Practices for REST API Versioning](https://www.freecodecamp.org/news/rest-api-best-practices-rest-endpoint-design-examples/)
- [API Versioning: Choosing the Right Strategy](https://nordicapis.com/api-versioning-methods-a-brief-reference/)

---

## 9. Contact

For questions about API versioning:

- **Technical Lead:** [your-email]
- **Documentation:** https://docs.ctn.cloud/api
- **Support:** api-support@ctn.cloud
- **Migration Help:** Schedule a call at https://calendly.com/ctn-api-support

---

## Appendix A: Version Comparison Matrix

| Feature | v1 | v2 |
|---------|----|----|
| Field naming | `legal_name`, `status` | `name`, `state` |
| Pagination | `{ total, page, page_size, data }` | `{ data, pagination: {...} }` |
| Filtering | Query params only | Advanced search endpoint |
| Sorting | Not supported | `?sort=field:asc` |
| Field selection | Not supported | `?fields=name,state` |
| Cursor pagination | Not supported | Supported |
| Error format | Inconsistent | Standardized |
| Date format | Mixed | ISO 8601 only |
| Status | Deprecated (sunset 2026-12-01) | Current |

---

## Appendix B: HTTP Status Codes

| Code | Meaning | When to Use |
|------|---------|-------------|
| 200 OK | Success | Successful GET, PUT, PATCH |
| 201 Created | Resource created | Successful POST |
| 204 No Content | Success, no body | Successful DELETE |
| 400 Bad Request | Invalid input | Validation errors |
| 401 Unauthorized | Not authenticated | Missing/invalid token |
| 403 Forbidden | Not authorized | Valid token, insufficient permissions |
| 404 Not Found | Resource not found | Resource doesn't exist |
| 409 Conflict | Conflict | Duplicate resource |
| 410 Gone | Permanently removed | Sunset API version |
| 429 Too Many Requests | Rate limited | Rate limit exceeded |
| 500 Internal Server Error | Server error | Unhandled exceptions |

---

**End of API Versioning Strategy Document**
