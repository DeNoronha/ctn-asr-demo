# ID Usage Audit: organizationId vs legalEntityId

**Date:** November 10, 2025
**Status:** ✅ RESOLVED
**Impact:** CRITICAL - Was causing endpoints not to appear in UI

---

## Executive Summary

The ASR system uses **two different IDs** for member entities, which were being confused throughout the codebase:

1. **`org_id`** (from `members` table) - Exposed as `organizationId`
2. **`legal_entity_id`** (from `legal_entity` table) - Exposed as `legalEntityId`

**Critical Bug:** API endpoints with `{legalentityid}` in routes expect `legal_entity_id`, but the UI was sometimes passing `org_id`, causing data mismatches.

---

## The Two ID Types

### 1. Organization ID (`org_id`)

- **Source:** `members` table
- **Type:** String (not UUID)
- **Example:** `"ORG-001"`, custom format
- **Purpose:** Display identifier, human-readable
- **Exposed as:** `organizationId` in member-portal

### 2. Legal Entity ID (`legal_entity_id`)

- **Source:** `legal_entity` table
- **Type:** UUID
- **Example:** `"96eb64b2-31e9-4e11-b4c2-e8d8a58f1d0a"`
- **Purpose:** Database primary key, foreign key relationships
- **Exposed as:** `legalEntityId` in member-portal
- **⚠️ This is what ALL API endpoints with `{legalentityid}` expect!**

---

## API Endpoints - Which ID They Expect

All API endpoints with `{legalentityid}` in the route parameter expect **`legal_entity_id` (UUID)**, NOT `org_id`.

### Endpoint Registration (Fixed ✅)

| Endpoint | Route | ID Parameter | Status |
|----------|-------|--------------|--------|
| Initiate Registration | `POST /entities/{legalentityid}/endpoints/register` | legal_entity_id | ✅ Fixed |
| Send Verification Email | `POST /endpoints/{endpointid}/send-verification` | endpoint_id | ✅ OK |
| Verify Token | `POST /endpoints/{endpointid}/verify-token` | endpoint_id | ✅ OK |
| Test Endpoint | `POST /endpoints/{endpointid}/test` | endpoint_id | ✅ OK |
| Activate Endpoint | `POST /endpoints/{endpointid}/activate` | endpoint_id | ✅ OK |
| Get Member Endpoints | `GET /member-endpoints` | Uses partyId from JWT | ✅ OK |

### DNS Verification (Fixed ✅)

| Endpoint | Route | ID Parameter | Status |
|----------|-------|--------------|--------|
| Get DNS Tokens | `GET /entities/{legalentityid}/dns/tokens` | legal_entity_id | ✅ Fixed |
| Generate DNS Token | `POST /entities/{legalentityid}/dns/token` | legal_entity_id | ✅ Fixed |

### Tier Management (Fixed ✅)

| Endpoint | Route | ID Parameter | Status |
|----------|-------|--------------|--------|
| Get Tier Info | `GET /entities/{legalentityid}/tier` | legal_entity_id | ✅ Fixed |
| Update Tier | `POST /entities/{legalentityid}/tier` | legal_entity_id | ✅ Fixed |

### Other Entity-Scoped Endpoints

All follow the pattern: `/entities/{legalentityid}/*` → Expect `legal_entity_id`

---

## UI Components - Which ID They Use

### Member Portal Components (Fixed ✅)

| Component | API Calls | ID Used (Before) | ID Used (After) | Status |
|-----------|-----------|------------------|-----------------|--------|
| `EndpointsView.tsx` | Endpoint registration | ❌ organizationId | ✅ legalEntityId | ✅ Fixed |
| `DnsVerificationView.tsx` | DNS token generation | ❌ organizationId | ✅ legalEntityId | ✅ Fixed |
| `Dashboard.tsx` | Tier information | ❌ organizationId | ✅ legalEntityId | ✅ Fixed |

### Type Definitions (Updated ✅)

```typescript
// member-portal/src/types.ts
export interface MemberData {
  organizationId: string;      // org_id - for display only
  legalEntityId?: string;       // legal_entity_id - for API calls ✅ Added
  legalName: string;
  lei?: string;
  // ... other fields
}
```

---

## Backend Functions

### GetAuthenticatedMember (Returns Both IDs)

**File:** `api/src/functions/GetAuthenticatedMember.ts`

**Query:**
```sql
SELECT
  m.org_id as "organizationId",           -- String identifier
  le.legal_entity_id as "legalEntityId",  -- UUID for API calls
  ...
FROM members m
LEFT JOIN legal_entity le ON m.legal_entity_id = le.legal_entity_id
```

**Returns:**
```json
{
  "organizationId": "ORG-001",
  "legalEntityId": "96eb64b2-31e9-4e11-b4c2-e8d8a58f1d0a",
  "legalName": "Example Corp",
  ...
}
```

### GetMemberEndpoints (Fixed ✅)

**File:** `api/src/functions/GetMemberEndpoints.ts`

**Issue:** Missing soft-delete filter
**Fix:** Added `AND is_deleted = false` to WHERE clause

```sql
SELECT * FROM legal_entity_endpoint
WHERE legal_entity_id = $1
  AND is_deleted = false  -- ✅ Added
ORDER BY dt_created DESC
```

---

## Root Cause Analysis

### The Bug

1. `GetAuthenticatedMember` API returns both `organizationId` and `legalEntityId`
2. UI components were using `memberData.organizationId` (wrong!)
3. API endpoints with `/entities/{legalentityid}/*` expect `legal_entity_id` (UUID)
4. **Result:** Endpoints created with one ID, queries using another ID → No match!

### Example Failure Flow

```
1. User creates endpoint in wizard
   → Calls: POST /entities/ORG-001/endpoints/register
   → Backend tries to find legal_entity with legal_entity_id = 'ORG-001'
   → ❌ No match! (ORG-001 is org_id, not legal_entity_id)

2. Backend actually needs:
   → POST /entities/96eb64b2-31e9-4e11-b4c2-e8d8a58f1d0a/endpoints/register
   → ✅ Finds legal_entity correctly
```

---

## Fixes Applied

### Commit: f8d2f0f - Fix legalEntityId usage

**Files Changed:**
1. `member-portal/src/components/EndpointsView.tsx`
   - Changed: `legalEntityId={memberData.organizationId}`
   - To: `legalEntityId={memberData.legalEntityId!}`

2. `member-portal/src/components/DnsVerificationView.tsx`
   - Changed: `/entities/${memberData.organizationId}/dns/*`
   - To: `/entities/${memberData.legalEntityId}/dns/*`

3. `member-portal/src/components/Dashboard.tsx`
   - Changed: `/entities/${memberData.organizationId}/tier`
   - To: `/entities/${memberData.legalEntityId}/tier`

4. `member-portal/src/types.ts`
   - Added: `legalEntityId?: string;` to MemberData interface

5. `api/src/functions/GetMemberEndpoints.ts`
   - Added: `AND is_deleted = false` soft-delete filter

---

## Testing Results

### Before Fix
```bash
# Endpoints in database but not showing in UI
SELECT * FROM legal_entity_endpoint
WHERE legal_entity_id = '96eb64b2-31e9-4e11-b4c2-e8d8a58f1d0a';
# Returns: 2 rows

# But UI query was using:
WHERE legal_entity_id = 'ORG-001';
# Returns: 0 rows ❌
```

### After Fix
```bash
# UI now correctly uses legal_entity_id
WHERE legal_entity_id = '96eb64b2-31e9-4e11-b4c2-e8d8a58f1d0a';
# Returns: 2 rows ✅
```

---

## Recommendations

### 1. Naming Convention (Future)

Consider renaming to avoid confusion:
- `org_id` → `organization_code` or `member_code`
- Keep `legal_entity_id` as is (clear it's the UUID)

### 2. Type Safety (Completed ✅)

- TypeScript interfaces now clearly distinguish both IDs
- Non-null assertion (`!`) used where legalEntityId is required

### 3. Validation

Add runtime validation in UI:
```typescript
if (!memberData.legalEntityId) {
  throw new Error('Legal entity ID required for this operation');
}
```

### 4. Database Constraints

Ensure all queries include soft-delete filter:
```sql
WHERE is_deleted = false  -- Always include this!
```

### 5. Documentation

- API docs should clearly state which endpoints expect which ID
- Add JSDoc comments to interfaces explaining the difference

---

## Lessons Learned

1. **Multiple IDs are confusing** - Consider consolidating or using more descriptive names
2. **Route parameters must match expectations** - Azure Functions lowercases route params, but backend must use correct column
3. **Always include soft-delete filters** - Per CLAUDE.md requirements
4. **Test with actual data** - The bug was invisible until testing with real endpoints in database
5. **Type safety helps** - TypeScript caught some issues after adding proper types

---

## Status: ✅ RESOLVED

All ID inconsistencies have been identified and fixed. Both packages build successfully with full type safety.

**Deployed:** Commit f8d2f0f + follow-up type safety fixes
**Verified:** Endpoints now appear in UI after creation
