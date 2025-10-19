# Migration Guide: API v1 to v2

**Version:** 1.0
**Last Updated:** 2025-10-19
**Status:** Example Template

---

## Overview

This document provides a comprehensive guide for migrating from CTN ASR API v1 to v2. API v2 introduces improved data consistency, better pagination, and cleaner field naming conventions.

---

## Timeline

| Date | Event |
|------|-------|
| **2026-01-01** | API v2 released, v1 marked as current |
| **2026-06-01** | API v1 deprecated (Deprecation header added) |
| **2026-12-01** | API v1 sunset (returns 410 Gone) |

**Action Required:** Migrate to API v2 before **2026-12-01**

---

## Breaking Changes Summary

### 1. Field Renames in Members Endpoint

| v1 Field | v2 Field | Type | Notes |
|----------|----------|------|-------|
| `legal_name` | `name` | string | Simplified field name |
| `status` | `state` | string | Consistent with other entities |
| `kvk_number` | `registration_number` | string | More generic, international-friendly |

### 2. Pagination Format Change

**v1 Pagination:**
```json
{
  "total": 150,
  "page": 1,
  "page_size": 25,
  "data": [...]
}
```

**v2 Pagination:**
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

### 3. Error Response Format

**v1 Errors:**
```json
{
  "error": "Not found"
}
```

**v2 Errors:**
```json
{
  "error": {
    "code": "RESOURCE_NOT_FOUND",
    "message": "Member not found",
    "details": {
      "resource_type": "member",
      "resource_id": "abc123"
    }
  }
}
```

### 4. Date Format Standardization

- **v1:** Mixed formats (ISO 8601 and Unix timestamps)
- **v2:** ISO 8601 only (`2025-10-19T10:30:00Z`)

---

## Migration Steps

### Step 1: Update Base URL

**Before (v1):**
```javascript
const API_BASE = 'https://func-ctn-demo-asr-dev.azurewebsites.net/api/v1';
```

**After (v2):**
```javascript
const API_BASE = 'https://func-ctn-demo-asr-dev.azurewebsites.net/api/v2';
```

### Step 2: Update Member Field Names

**Before (v1):**
```javascript
// Fetch members
fetch(`${API_BASE}/members`)
  .then(response => response.json())
  .then(data => {
    data.data.forEach(member => {
      console.log(member.legal_name);      // v1 field
      console.log(member.status);          // v1 field
      console.log(member.kvk_number);      // v1 field
    });
  });

// Create member
const newMember = {
  legal_name: 'Acme Corporation',
  status: 'ACTIVE',
  kvk_number: '12345678',
  domain: 'acme.com'
};
```

**After (v2):**
```javascript
// Fetch members
fetch(`${API_BASE}/members`)
  .then(response => response.json())
  .then(data => {
    data.data.forEach(member => {
      console.log(member.name);                  // v2 field
      console.log(member.state);                 // v2 field
      console.log(member.registration_number);   // v2 field
    });
  });

// Create member
const newMember = {
  name: 'Acme Corporation',
  state: 'ACTIVE',
  registration_number: '12345678',
  domain: 'acme.com'
};
```

### Step 3: Update Pagination Handling

**Before (v1):**
```javascript
async function fetchAllMembers() {
  let page = 1;
  let allMembers = [];

  while (true) {
    const response = await fetch(`${API_BASE}/members?page=${page}&page_size=50`);
    const data = await response.json();

    allMembers.push(...data.data);

    // Check if we have more pages
    if (page * data.page_size >= data.total) {
      break;
    }

    page++;
  }

  return allMembers;
}
```

**After (v2):**
```javascript
async function fetchAllMembers() {
  let allMembers = [];
  let nextCursor = null;

  while (true) {
    const url = nextCursor
      ? `${API_BASE}/members?cursor=${nextCursor}&limit=50`
      : `${API_BASE}/members?limit=50`;

    const response = await fetch(url);
    const data = await response.json();

    allMembers.push(...data.data);

    // Check if we have more pages
    if (!data.pagination.has_more) {
      break;
    }

    nextCursor = data.pagination.next_cursor;
  }

  return allMembers;
}
```

### Step 4: Update Error Handling

**Before (v1):**
```javascript
fetch(`${API_BASE}/members/abc123`)
  .then(response => {
    if (!response.ok) {
      return response.json().then(err => {
        throw new Error(err.error);  // Simple string error
      });
    }
    return response.json();
  })
  .catch(error => {
    console.error('Error:', error.message);
  });
```

**After (v2):**
```javascript
fetch(`${API_BASE}/members/abc123`)
  .then(response => {
    if (!response.ok) {
      return response.json().then(err => {
        const error = new Error(err.error.message);
        error.code = err.error.code;
        error.details = err.error.details;
        throw error;
      });
    }
    return response.json();
  })
  .catch(error => {
    console.error('Error code:', error.code);
    console.error('Error message:', error.message);
    console.error('Error details:', error.details);
  });
```

### Step 5: Update Date Handling

**Before (v1):**
```javascript
// v1 might return Unix timestamp or ISO string
const member = await fetchMember('abc123');

// Handle both formats
const createdAt = typeof member.created_at === 'number'
  ? new Date(member.created_at * 1000)
  : new Date(member.created_at);
```

**After (v2):**
```javascript
// v2 always returns ISO 8601
const member = await fetchMember('abc123');
const createdAt = new Date(member.created_at);  // Always ISO 8601
```

---

## Endpoint Changes

### Members Endpoints

| v1 Endpoint | v2 Endpoint | Changes |
|-------------|-------------|---------|
| `GET /v1/members` | `GET /v2/members` | Pagination format, field names |
| `POST /v1/members` | `POST /v2/members` | Request body field names |
| `GET /v1/members/{id}` | `GET /v2/members/{id}` | Response field names |
| `PUT /v1/members/{id}` | `PUT /v2/members/{id}` | Request body field names |
| `DELETE /v1/members/{id}` | `DELETE /v2/members/{id}` | No changes |

### New Endpoints in v2

| Endpoint | Method | Description |
|----------|--------|-------------|
| `GET /v2/members/search` | GET | Advanced search with filters |
| `GET /v2/health` | GET | API health check |

### Removed Endpoints

| v1 Endpoint | v2 Replacement | Notes |
|-------------|----------------|-------|
| `GET /v1/search` | `GET /v2/members/search` | Deprecated simple search |

---

## Testing Your Migration

### 1. Test in Staging Environment

```bash
# Set staging API base
export API_BASE="https://func-ctn-demo-asr-staging.azurewebsites.net/api/v2"

# Test member fetch
curl "$API_BASE/members?limit=10" \
  -H "Authorization: Bearer YOUR_TOKEN"

# Test member creation
curl -X POST "$API_BASE/members" \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "name": "Test Corp",
    "state": "ACTIVE",
    "registration_number": "TEST123",
    "domain": "test.com"
  }'
```

### 2. Verify Response Format

Check that responses match v2 format:

```javascript
// Expected v2 response
{
  "data": [
    {
      "id": "abc123",
      "name": "Acme Corp",              // NOT legal_name
      "state": "ACTIVE",                // NOT status
      "registration_number": "12345678", // NOT kvk_number
      "created_at": "2025-10-19T10:30:00Z"
    }
  ],
  "pagination": {
    "total": 1,
    "page": 1,
    "limit": 25,
    "has_more": false
  }
}
```

### 3. Run Automated Tests

```bash
# Update your test suite to use v2
npm test -- --grep "API v2"

# Run integration tests
npm run test:integration:v2
```

---

## Code Examples

### Complete Example: Fetch and Display Members

**Before (v1):**
```javascript
class MemberService {
  constructor() {
    this.baseUrl = 'https://func-ctn-demo-asr-dev.azurewebsites.net/api/v1';
  }

  async getMembers(page = 1, pageSize = 25) {
    const response = await fetch(
      `${this.baseUrl}/members?page=${page}&page_size=${pageSize}`,
      {
        headers: {
          'Authorization': `Bearer ${this.token}`
        }
      }
    );

    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.error);
    }

    const data = await response.json();

    return {
      members: data.data.map(m => ({
        id: m.org_id,
        legalName: m.legal_name,
        status: m.status,
        kvkNumber: m.kvk_number,
        createdAt: new Date(m.created_at)
      })),
      total: data.total,
      hasMore: (page * pageSize) < data.total
    };
  }
}
```

**After (v2):**
```javascript
class MemberService {
  constructor() {
    this.baseUrl = 'https://func-ctn-demo-asr-dev.azurewebsites.net/api/v2';
  }

  async getMembers(cursor = null, limit = 25) {
    const url = cursor
      ? `${this.baseUrl}/members?cursor=${cursor}&limit=${limit}`
      : `${this.baseUrl}/members?limit=${limit}`;

    const response = await fetch(url, {
      headers: {
        'Authorization': `Bearer ${this.token}`
      }
    });

    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.error.message);
    }

    const data = await response.json();

    return {
      members: data.data.map(m => ({
        id: m.id,
        name: m.name,                        // Changed from legal_name
        state: m.state,                      // Changed from status
        registrationNumber: m.registration_number,  // Changed from kvk_number
        createdAt: new Date(m.created_at)
      })),
      total: data.pagination.total,
      hasMore: data.pagination.has_more,
      nextCursor: data.pagination.next_cursor
    };
  }
}
```

### Complete Example: Create Member

**Before (v1):**
```javascript
async function createMember(memberData) {
  const response = await fetch(
    'https://func-ctn-demo-asr-dev.azurewebsites.net/api/v1/members',
    {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        org_id: memberData.orgId,
        legal_name: memberData.legalName,
        status: memberData.status,
        kvk_number: memberData.kvkNumber,
        domain: memberData.domain
      })
    }
  );

  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.error);
  }

  return await response.json();
}
```

**After (v2):**
```javascript
async function createMember(memberData) {
  const response = await fetch(
    'https://func-ctn-demo-asr-dev.azurewebsites.net/api/v2/members',
    {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        org_id: memberData.orgId,
        name: memberData.name,                           // Changed from legal_name
        state: memberData.state,                         // Changed from status
        registration_number: memberData.registrationNumber,  // Changed from kvk_number
        domain: memberData.domain
      })
    }
  );

  if (!response.ok) {
    const error = await response.json();
    const err = new Error(error.error.message);
    err.code = error.error.code;
    err.details = error.error.details;
    throw err;
  }

  return await response.json();
}
```

---

## TypeScript Type Definitions

### Before (v1)

```typescript
interface MemberV1 {
  org_id: string;
  legal_name: string;
  status: 'ACTIVE' | 'INACTIVE' | 'PENDING';
  kvk_number: string;
  domain: string;
  created_at: string | number;  // Mixed format
}

interface PaginatedResponseV1<T> {
  total: number;
  page: number;
  page_size: number;
  data: T[];
}

interface ErrorResponseV1 {
  error: string;
}
```

### After (v2)

```typescript
interface MemberV2 {
  id: string;
  name: string;
  state: 'ACTIVE' | 'INACTIVE' | 'PENDING';
  registration_number: string;
  domain: string;
  created_at: string;  // Always ISO 8601
}

interface PaginationV2 {
  total: number;
  page: number;
  limit: number;
  has_more: boolean;
  next_cursor: string | null;
}

interface PaginatedResponseV2<T> {
  data: T[];
  pagination: PaginationV2;
}

interface ErrorResponseV2 {
  error: {
    code: string;
    message: string;
    details?: Record<string, any>;
  };
}
```

---

## Common Pitfalls

### 1. Forgetting to Update Field Names

❌ **Wrong:**
```javascript
const member = await fetchMember(id);
console.log(member.legal_name);  // Undefined in v2!
```

✅ **Correct:**
```javascript
const member = await fetchMember(id);
console.log(member.name);  // Correct v2 field
```

### 2. Using Old Pagination Logic

❌ **Wrong:**
```javascript
// v1 pagination logic won't work with v2
if (page * pageSize >= data.total) {
  // This won't work - v2 uses has_more flag
}
```

✅ **Correct:**
```javascript
// Use v2 pagination
if (!data.pagination.has_more) {
  // Correct v2 pagination check
}
```

### 3. Incorrect Error Handling

❌ **Wrong:**
```javascript
catch (error) {
  console.log(error.error);  // v2 error has nested structure
}
```

✅ **Correct:**
```javascript
catch (error) {
  console.log(error.error.message);  // Correct v2 error access
}
```

---

## Support and Resources

### Documentation
- **API v2 Documentation:** https://docs.ctn.cloud/api/v2
- **API Reference:** https://docs.ctn.cloud/api/v2/reference
- **Changelog:** https://docs.ctn.cloud/api/changelog

### Support
- **Email:** api-support@ctn.cloud
- **Migration Help:** Schedule a call at https://calendly.com/ctn-api-support
- **GitHub Issues:** https://github.com/ctn/asr/issues

### Testing Environments
- **Staging API:** https://func-ctn-demo-asr-staging.azurewebsites.net/api/v2
- **Production API:** https://func-ctn-demo-asr-dev.azurewebsites.net/api/v2

---

## Checklist

Use this checklist to track your migration progress:

- [ ] Read this migration guide completely
- [ ] Update base URL to v2
- [ ] Update member field names (legal_name → name, status → state, kvk_number → registration_number)
- [ ] Update pagination logic (page/page_size → cursor/limit)
- [ ] Update error handling (error string → error object)
- [ ] Update date handling (mixed format → ISO 8601 only)
- [ ] Update TypeScript type definitions
- [ ] Test in staging environment
- [ ] Run automated tests
- [ ] Verify all endpoints work
- [ ] Update documentation
- [ ] Deploy to production
- [ ] Monitor error rates
- [ ] Remove v1 code after successful migration

---

## FAQ

### Q: Can I use both v1 and v2 at the same time?

**A:** Yes! During the transition period (2026-01-01 to 2026-12-01), both versions will work. You can migrate incrementally.

### Q: What happens if I don't migrate before the sunset date?

**A:** After 2026-12-01, all v1 requests will return HTTP 410 Gone. Your application will break.

### Q: How do I know if I'm using v1 or v2?

**A:** Check the URL path. v1 uses `/api/v1/`, v2 uses `/api/v2/`. Also check the `API-Version` response header.

### Q: Are there any rate limit changes?

**A:** No, rate limits are the same across all versions.

### Q: What if I find a bug during migration?

**A:** Report it to api-support@ctn.cloud or create a GitHub issue.

---

**Last Updated:** 2025-10-19
**Version:** 1.0
