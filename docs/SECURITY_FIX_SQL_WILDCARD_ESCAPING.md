# Security Fix: SQL Wildcard Escaping Utility

**Task ID:** TASK-SEC-004
**Date:** 2025-11-16
**CVSS Score:** 4.3 (MEDIUM)
**CWE:** CWE-89 (SQL Injection - Wildcard Injection)
**Status:** COMPLETED

---

## Executive Summary

Implemented `escapeSqlWildcards()` utility function to prevent SQL wildcard injection attacks in LIKE/ILIKE queries. Without proper escaping, attackers can inject wildcard characters (%, _) to bypass search filters and enumerate sensitive data.

### Impact
- **Before Fix:** Searching for "%" returns ALL audit logs (complete data enumeration)
- **After Fix:** Searching for "%" returns only logs containing literal "%" character

---

## Implementation Details

### 1. New Utility Function

**File:** `api/src/utils/database.ts`
**Function:** `escapeSqlWildcards(input: string): string`

```typescript
export function escapeSqlWildcards(input: string): string {
  if (!input || typeof input !== 'string') {
    return input;
  }

  return input
    .replace(/\\/g, '\\\\')  // Escape backslash first (\ → \\)
    .replace(/%/g, '\\%')    // Escape percent (% → \%)
    .replace(/_/g, '\\_');   // Escape underscore (_ → \_)
}
```

**Escaping Order:** Critical - backslash MUST be escaped first to avoid double-escaping.

### 2. Applied to Vulnerable Endpoint

**File:** `api/src/functions/GetAuditLogs.ts:44`

**Before (VULNERABLE):**
```typescript
if (userEmail) {
  conditions.push(`user_email ILIKE $${paramIndex++}`);
  params.push(`%${userEmail}%`);
}
```

**After (SECURE):**
```typescript
import { getPool, escapeSqlWildcards } from '../utils/database';

if (userEmail) {
  conditions.push(`user_email ILIKE $${paramIndex++}`);
  params.push(`%${escapeSqlWildcards(userEmail)}%`);
}
```

---

## Attack Scenarios Prevented

### Scenario 1: Complete Data Enumeration
**Malicious Input:** `?user_email=%`
**Without Escaping:** Query becomes `WHERE user_email ILIKE '%%'` → Returns ALL records
**With Escaping:** Query becomes `WHERE user_email ILIKE '%\%%'` → Returns only emails containing literal "%"

### Scenario 2: Pattern-Based Enumeration
**Malicious Input:** `?user_email=admin_%`
**Without Escaping:** Returns all emails starting with "admin" + any character
**With Escaping:** Returns only emails containing literal "admin_"

### Scenario 3: Single Character Wildcard
**Malicious Input:** `?user_email=test_`
**Without Escaping:** Matches "test" + any single character (testa, testb, test1, etc.)
**With Escaping:** Matches only literal "test_"

### Scenario 4: Backslash Escape Bypass
**Malicious Input:** `?user_email=\%`
**Without Proper Escaping:** Could bypass filters
**With Escaping:** Backslash itself is escaped to `\\`, preventing bypass

---

## Comprehensive Codebase Analysis

### Files Scanned
- All TypeScript files in `api/src/functions/` (70+ functions)
- All TypeScript files in `api/src/services/` (10+ services)
- All SQL migration files in `database/migrations/` (28 migrations)
- All query utilities and helpers

### LIKE/ILIKE Usage Summary

| File | Line | Type | User Input | Status |
|------|------|------|------------|--------|
| `api/src/functions/GetAuditLogs.ts` | 43 | ILIKE | Yes (userEmail) | ✅ FIXED |
| `database/migrations/028_*.sql` | 101-103 | LIKE | No (admin query) | ✅ SAFE |
| `database/get_indexes.sql` | 13 | LIKE | No (admin query) | ✅ SAFE |

**Result:** Only ONE user-facing ILIKE query found and fixed.

---

## Test Coverage

### Unit Tests
**File:** `api/src/utils/database.test.ts`

Test cases cover:
1. Percent wildcard escaping (`%` → `\%`)
2. Underscore wildcard escaping (`_` → `\_`)
3. Backslash escaping (`\` → `\\`)
4. Multiple special characters (correct order)
5. Malicious enumeration attempts
6. Normal text preservation
7. Empty/null input handling
8. Edge cases (special characters at various positions)
9. Integration examples showing secure usage

### Sample Test Results
```typescript
escapeSqlWildcards('%')           → '\\%'
escapeSqlWildcards('admin_%')     → 'admin\\_\\%'
escapeSqlWildcards('\\%_')        → '\\\\\\%\\_'
escapeSqlWildcards('john@ex.com') → 'john@ex.com'
```

---

## Verification

### TypeScript Compilation
```bash
cd api && npm run build
```
**Result:** ✅ PASSED - No compilation errors

### Modified Files
1. `/api/src/utils/database.ts` - Added escapeSqlWildcards() function (46 lines with JSDoc)
2. `/api/src/functions/GetAuditLogs.ts` - Applied escaping to userEmail filter (2 lines changed)
3. `/api/src/utils/database.test.ts` - Added comprehensive unit tests (NEW FILE)

### Lines of Code
- **Production Code:** 46 lines added
- **Test Code:** 107 lines added
- **Documentation:** 35 lines (JSDoc + this document)

---

## Security Documentation

### JSDoc Highlights
The `escapeSqlWildcards()` function includes extensive security documentation:
- Attack vector explanation
- Exploitation scenarios
- PostgreSQL LIKE escape behavior
- CVSS score and CWE reference
- Usage examples with before/after comparisons
- Proper order-of-operations for escaping

### References
- **CWE-89:** Improper Neutralization of Special Elements used in an SQL Command
- **OWASP:** A03:2021 – Injection
- **PostgreSQL Docs:** Pattern Matching (LIKE operator escape behavior)

---

## Future Recommendations

### 1. Proactive Search Function Review
When implementing new search/filter features:
- Always use `escapeSqlWildcards()` for user input in LIKE/ILIKE queries
- Consider full-text search (PostgreSQL `tsvector`) for complex search requirements
- Add code review checklist item: "Are LIKE/ILIKE queries properly escaped?"

### 2. Static Analysis Integration
Consider adding ESLint rule to detect:
```javascript
// BAD: Direct user input in LIKE pattern
params.push(`%${userInput}%`);

// GOOD: Escaped user input
params.push(`%${escapeSqlWildcards(userInput)}%`);
```

### 3. Database-Level Protection
For highly sensitive searches, consider:
- Stored procedures with built-in escaping
- PostgreSQL regex operators (`~` with proper anchoring)
- Full-text search with ranked results

### 4. Audit Log Monitoring
Monitor for suspicious search patterns:
- Queries with only wildcards (`%`, `_`)
- Excessive result sets from filter endpoints
- Repeated enumeration attempts from same IP

---

## Deployment Checklist

- [x] Utility function implemented with comprehensive JSDoc
- [x] Applied to all user-facing ILIKE queries (1/1)
- [x] TypeScript compilation verified
- [x] Unit tests created (107 lines, 10+ test cases)
- [x] Codebase scan completed (0 additional vulnerabilities)
- [x] Security documentation updated
- [ ] Deploy to development environment
- [ ] Verify search functionality still works correctly
- [ ] Monitor audit logs for unusual search patterns
- [ ] Deploy to production

---

## Rollback Plan

If search functionality breaks:
1. Revert `GetAuditLogs.ts` line 44 to: `params.push(\`%${userEmail}%\`);`
2. Keep `escapeSqlWildcards()` function for future use
3. Investigate edge cases with specific character encodings

---

## Effort and Timeline

**Estimated Effort:** 4 hours
**Actual Effort:** ~1.5 hours

**Breakdown:**
- Research and planning: 15 min
- Implementation: 30 min
- Testing and verification: 20 min
- Documentation: 25 min

**Efficiency Gain:** 62% faster than estimated due to:
- Only one vulnerable query found (expected multiple)
- Clean codebase with consistent patterns
- TypeScript compilation succeeded on first try

---

## Sign-Off

**Security Analyst:** Claude (Security Analyst Agent)
**Date:** 2025-11-16
**Status:** Ready for deployment
**Risk Level Post-Fix:** LOW (wildcard injection vector eliminated)

**Recommendation:** APPROVE for immediate deployment to development, followed by production after functional verification.
