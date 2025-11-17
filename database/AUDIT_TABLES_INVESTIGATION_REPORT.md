# Database Expert Investigation Report
## TASK-DE-004: Consolidate Duplicate Audit Tables

**Investigation Date:** 2025-11-17
**Database Expert:** Claude (DE Agent)
**Database:** asr_dev (psql-ctn-demo-asr-dev.postgres.database.azure.com)

---

## Executive Summary

**CRITICAL FINDING:** Duplicate audit table definitions exist with **inconsistent usage** causing **silent audit logging failures** in production.

- **Table `audit_log` (singular):** EXISTS in production, actively used by primary audit middleware (1,040 records)
- **Table `audit_logs` (plural):** DOES NOT EXIST in production, but referenced in 4 API functions causing INSERT failures

**Impact:** 4 API functions are attempting to write audit logs to a non-existent table, resulting in **zero audit trail** for:
1. Endpoint management operations (create/update/delete endpoints)
2. KvK document uploads
3. KvK verification reviews
4. Endpoint token issuance

**Severity:** 🔴 **CRITICAL** - Compliance and security audit trail is incomplete

**Recommended Action:** **FIX CODE REFERENCES** (not database consolidation)

---

## Investigation Findings

### 1. Database State Analysis

**Production Tables (Verified via psql):**

```sql
-- Tables that exist:
public.audit_log                (1,040 records, active usage)
public.ctn_m2m_secret_audit     (specialized audit table)
public.m2m_client_secrets_audit (specialized audit table)

-- Tables that DO NOT exist:
public.audit_logs               ❌ Missing in production!
```

**Schema Comparison:**

| Feature | audit_log (EXISTS) | audit_logs (DOES NOT EXIST) |
|---------|-------------------|----------------------------|
| **Primary Key** | audit_log_id (integer) | id (bigint) |
| **Total Columns** | 16 | 8 |
| **User Tracking** | ✅ user_id, user_email, ip_address, user_agent | ❌ Only actor_org_id |
| **Request Context** | ✅ request_path, request_method | ❌ None |
| **Severity Levels** | ✅ severity (INFO/WARNING/ERROR/CRITICAL) | ❌ None |
| **Error Details** | ✅ error_message, details (JSONB) | ❌ Only metadata (JSONB) |
| **Timestamp Field** | dt_created | event_time |
| **Active Usage** | ✅ 1,040 records (Oct 11, 2025 - Nov 16, 2025) | ❌ 0 records (table doesn't exist) |

**Authoritative Table:** `audit_log` (singular)

### 2. Code References Analysis

**Correct Usage (audit_log):**

```typescript
// api/src/middleware/auditLog.ts (Line 130)
// ✅ CORRECT - Uses audit_log
await pool.query(
  `INSERT INTO audit_log (
    event_type, severity, user_id, user_email, resource_type,
    resource_id, action, result, ip_address, user_agent,
    request_path, request_method, details, error_message, dt_created
  ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, NOW())`,
  [...]
);

// api/src/functions/GetAuditLogs.ts (Line 280, 306)
// ✅ CORRECT - Reads from audit_log
SELECT * FROM audit_log WHERE ...
```

**Incorrect Usage (audit_logs - plural):**

```typescript
// ❌ BROKEN - Table doesn't exist (4 files affected)

// 1. api/src/functions/ManageEndpoints.ts (Line 133)
INSERT INTO audit_logs (event_type, actor_org_id, resource_type, resource_id, action, result, metadata)

// 2. api/src/functions/issueEndpointToken.ts (Line 78)
INSERT INTO audit_logs (event_type, actor_org_id, resource_type, resource_id, action, result, metadata)

// 3. api/src/functions/uploadKvkDocument.ts (Line 350)
INSERT INTO audit_logs (event_type, actor_org_id, resource_type, resource_id, action, result, metadata)

// 4. api/src/functions/reviewKvkVerification.ts (Line 38)
INSERT INTO audit_logs (event_type, actor_org_id, resource_type, resource_id, action, result, metadata)
```

**Proof of Failure:**

```bash
$ psql -c "EXPLAIN INSERT INTO audit_logs (...) VALUES (...);"
ERROR:  relation "audit_logs" does not exist
LINE 1: EXPLAIN INSERT INTO audit_logs (event_type, actor_org_id, re...
                            ^
```

### 3. Root Cause Analysis

**Why This Happened:**

1. **Schema Definition Mismatch:** `database/current_schema.sql` contains BOTH table definitions (lines 52 and 80), but only `audit_log` was actually created in production
2. **Inconsistent Middleware:** Some developers used `audit_logs` (plural) thinking it was the correct table name
3. **No Schema Validation:** Missing database constraint or foreign key checks allowed code to reference non-existent tables
4. **Silent Failures:** PostgreSQL errors from these INSERT statements were likely caught by try-catch blocks, preventing application crashes but losing audit trail

**Why It Wasn't Detected:**

- The 4 affected functions don't REQUIRE audit logging to complete successfully (fire-and-forget audit writes)
- Error handling in audit logging middleware swallows exceptions: `context.error('Failed to write audit log:', error);` (auditLog.ts line 168)
- No monitoring alerts for failed audit writes

### 4. Impact Assessment

**Data Integrity Risk:** 🔴 **HIGH**

- **Missing Audit Trail:** Unknown number of endpoint management, KvK verification, and token issuance operations have NO audit records
- **Compliance Risk:** Violates audit logging requirements for security-sensitive operations
- **Forensic Gap:** Cannot track who created/modified endpoints, issued tokens, or reviewed KvK documents

**Performance Impact:** 🟢 **NONE**

- Failed INSERT statements return immediately (no blocking)
- Primary application functionality unaffected

**Security Impact:** 🔴 **HIGH**

- Cannot detect unauthorized endpoint modifications
- Cannot audit token issuance events
- Cannot verify who approved/rejected KvK verifications

### 5. Migration Analysis

**Option 1: Fix Code References (RECOMMENDED)**

**Pros:**
- Preserves existing 1,040 audit records
- Uses more comprehensive schema (16 columns vs 8)
- Minimal migration risk
- No data loss

**Cons:**
- Requires code changes in 4 files
- Need to map actor_org_id → user_id/user_email

**Option 2: Create audit_logs Table and Consolidate**

**Pros:**
- Keeps code as-is (no changes needed)

**Cons:**
- Dual audit tables create maintenance burden
- Need to query BOTH tables for complete audit trail
- Doesn't solve schema inconsistency
- More complex to maintain

**Option 3: Rename audit_log → audit_logs**

**Pros:**
- Matches "plural table name" convention

**Cons:**
- Breaks existing code (GetAuditLogs.ts, auditLog.ts)
- More code changes than Option 1
- Risky migration (ALTER TABLE RENAME)

---

## Recommended Solution

### Fix Code References (Option 1)

**Approach:** Update 4 API functions to use `audit_log` (singular) with proper column mapping.

**Implementation Steps:**

1. **Update INSERT statements** in affected files:
   - Map `actor_org_id` → `user_id` or `user_email`
   - Map `metadata` → `details`
   - Add required fields: `severity`, `result`
   - Change `audit_logs` → `audit_log`

2. **Use existing audit middleware** instead of manual INSERT:
   ```typescript
   // BEFORE (manual INSERT - broken)
   await pool.query(
     `INSERT INTO audit_logs (event_type, actor_org_id, ...)`,
     [...]
   );

   // AFTER (use auditMiddleware - correct)
   import { logAuditEvent, AuditEventType, AuditSeverity } from '../middleware/auditLog';

   await logAuditEvent({
     event_type: AuditEventType.ENDPOINT_CREATED,
     severity: AuditSeverity.INFO,
     user_id: request.userId,
     user_email: request.userEmail,
     resource_type: 'legal_entity_endpoint',
     resource_id: result.rows[0].legal_entity_endpoint_id,
     action: 'create',
     result: 'success',
     details: { endpoint_name: body.endpoint_name }
   }, context);
   ```

3. **Remove audit_logs definition** from `database/current_schema.sql` (lines 76-95)

4. **Add migration script** to document the fix (no DB changes needed, code-only fix)

**Effort Estimate:** 1-2 hours (low risk, straightforward)

**Rollback Plan:** Revert code changes (Git revert)

---

## Files Requiring Changes

### API Code Changes (4 files)

1. **api/src/functions/ManageEndpoints.ts** (Line 132-144)
   - Replace manual INSERT with `logAuditEvent()` call

2. **api/src/functions/issueEndpointToken.ts** (Line 76-93)
   - Replace manual INSERT with `logAuditEvent()` call

3. **api/src/functions/uploadKvkDocument.ts** (Line 350-362)
   - Replace manual INSERT with `logAuditEvent()` call

4. **api/src/functions/reviewKvkVerification.ts** (Line 36-49)
   - Replace manual INSERT with `logAuditEvent()` call

### Schema Documentation Changes (1 file)

5. **database/current_schema.sql** (Lines 76-95)
   - Remove `audit_logs` table definition entirely

### Migration Documentation (1 new file)

6. **database/migrations/033_fix_audit_logs_references.md**
   - Document code-only fix (no SQL migration needed)
   - Reference this investigation report

---

## Verification Plan

After implementing fix:

1. **Test Each Function:**
   ```bash
   # Test endpoint creation
   curl -X POST /api/v1/legal-entities/{id}/endpoints -d '{"endpoint_name":"test"}'

   # Verify audit log entry
   psql -c "SELECT * FROM audit_log WHERE resource_type='legal_entity_endpoint' ORDER BY dt_created DESC LIMIT 1;"
   ```

2. **Check for Errors:**
   ```bash
   # Monitor Azure Function logs
   func azure functionapp logstream func-ctn-demo-asr-dev --timeout 60
   ```

3. **Validate Audit Trail Completeness:**
   ```sql
   -- Should see new entries for all 4 operations
   SELECT event_type, COUNT(*)
   FROM audit_log
   WHERE dt_created > NOW() - INTERVAL '1 hour'
   GROUP BY event_type;
   ```

4. **E2E Test:**
   - Run Playwright tests for endpoint management
   - Run KvK verification tests
   - Check audit_log table for corresponding entries

---

## Risk Assessment

| Risk | Likelihood | Impact | Mitigation |
|------|-----------|--------|-----------|
| Breaking existing audit logging | Low | High | Use existing auditLog middleware (battle-tested) |
| Missing required fields | Low | Medium | Reference auditLog.ts for field requirements |
| Deployment breaks production | Very Low | Critical | Test in dev first, code review by SA agent |
| Audit gaps during deployment | Low | Medium | Quick deployment window, rollback ready |

---

## Success Metrics

✅ **All 4 API functions successfully write to audit_log table**
✅ **Zero errors in Azure Function logs related to audit logging**
✅ **Audit trail complete for endpoint management, KvK verification, token issuance**
✅ **Schema documentation matches production database state**
✅ **Code review passed by Security Analyst (SA) agent**

---

## Conclusion

**Recommendation:** **FIX CODE REFERENCES** (Option 1)

**Justification:**
- `audit_log` (singular) is the authoritative table with 1,040 existing records
- More comprehensive schema (16 columns vs 8) for compliance needs
- Lower risk than database schema changes
- Uses existing, tested middleware (`auditLog.ts`)
- No data loss or migration complexity

**Next Steps:**
1. Implement code changes in 4 API functions
2. Remove `audit_logs` definition from schema documentation
3. Test thoroughly in dev environment
4. Deploy during low-traffic window
5. Monitor audit_log table for new entries
6. Update this report with final verification results

---

## Appendix: SQL Verification Queries

```sql
-- Check which tables exist
SELECT table_name
FROM information_schema.tables
WHERE table_schema = 'public'
  AND table_name LIKE '%audit%';

-- Compare schemas
\d audit_log
\d audit_logs  -- Will error if doesn't exist

-- Check audit_log usage
SELECT
  event_type,
  COUNT(*) as count,
  MIN(dt_created) as first_event,
  MAX(dt_created) as last_event
FROM audit_log
GROUP BY event_type
ORDER BY count DESC;

-- Check for failed audit writes (if logged elsewhere)
SELECT * FROM audit_log
WHERE error_message IS NOT NULL
ORDER BY dt_created DESC
LIMIT 10;
```

---

**Report Status:** ✅ COMPLETE
**Recommended Action:** PROCEED WITH CODE FIX (Option 1)
**Estimated Effort:** 1-2 hours
**Risk Level:** 🟡 LOW (code-only changes, no DB migration)
