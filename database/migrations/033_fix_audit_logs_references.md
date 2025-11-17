# Migration 033: Fix Audit Logs Table References

**Migration Type:** Code-only fix (no SQL migration required)
**Date:** 2025-11-17
**Author:** Database Expert (DE Agent)
**Related:** TASK-DE-004, AUDIT_TABLES_INVESTIGATION_REPORT.md

---

## Problem Statement

Four API functions were attempting to write audit logs to `audit_logs` (plural) table, which does not exist in production. This resulted in silent failures and missing audit trail for:
- Endpoint management operations
- KvK document uploads
- KvK verification reviews
- Endpoint token issuance

**Root Cause:** Schema documentation (`current_schema.sql`) contained definitions for BOTH `audit_log` and `audit_logs` tables, but only `audit_log` was actually created in production.

---

## Solution

### Approach

Fix code references to use the correct table (`audit_log`) and leverage existing audit middleware instead of manual INSERT statements.

### Changes Required

**Files Modified:**
1. `api/src/functions/ManageEndpoints.ts`
2. `api/src/functions/issueEndpointToken.ts`
3. `api/src/functions/uploadKvkDocument.ts`
4. `api/src/functions/reviewKvkVerification.ts`
5. `database/current_schema.sql` (remove audit_logs definition)

### Column Mapping

| Old (audit_logs) | New (audit_log) | Notes |
|------------------|-----------------|-------|
| event_time | dt_created | Automatically set by NOW() |
| actor_org_id | user_id OR user_email | Use request.userId or legalEntityId |
| metadata | details | Both JSONB, rename only |
| - | severity | Add: AuditSeverity.INFO (default) |
| result | result | Keep same (success/failure) |

---

## Implementation Example

### Before (Broken)

```typescript
// Manual INSERT to non-existent table
await pool.query(
  `INSERT INTO audit_logs (event_type, actor_org_id, resource_type, resource_id, action, result, metadata)
   VALUES ($1, $2, $3, $4, $5, $6, $7)`,
  [
    'ENDPOINT_MANAGEMENT',
    legalEntityId,
    'legal_entity_endpoint',
    result.rows[0].legal_entity_endpoint_id,
    'CREATE',
    'SUCCESS',
    JSON.stringify({ endpoint_name: body.endpoint_name })
  ]
);
```

### After (Fixed)

```typescript
import { logAuditEvent, AuditEventType, AuditSeverity } from '../middleware/auditLog';

// Use standardized audit middleware
await logAuditEvent({
  event_type: AuditEventType.ENDPOINT_CREATED,
  severity: AuditSeverity.INFO,
  user_id: request.userId,
  user_email: request.userEmail,
  resource_type: 'legal_entity_endpoint',
  resource_id: result.rows[0].legal_entity_endpoint_id,
  action: 'create',
  result: 'success',
  details: {
    endpoint_name: body.endpoint_name,
    legal_entity_id: legalEntityId,
    created_by: request.userEmail
  }
}, context);
```

---

## Verification Steps

1. **Build and deploy API:**
   ```bash
   cd api
   npm run build
   func azure functionapp publish func-ctn-demo-asr-dev --typescript --build remote
   ```

2. **Test each function:**
   ```bash
   # Test endpoint creation
   curl -X POST "https://func-ctn-demo-asr-dev.azurewebsites.net/api/v1/legal-entities/{id}/endpoints" \
     -H "Authorization: Bearer $TOKEN" \
     -d '{"endpoint_name":"Test Endpoint"}'
   ```

3. **Verify audit log entries:**
   ```sql
   SELECT
     event_type,
     user_email,
     resource_type,
     resource_id,
     action,
     result,
     details,
     dt_created
   FROM audit_log
   WHERE dt_created > NOW() - INTERVAL '1 hour'
   ORDER BY dt_created DESC;
   ```

4. **Check for errors:**
   ```bash
   func azure functionapp logstream func-ctn-demo-asr-dev --timeout 60 | grep -i "audit"
   ```

---

## Rollback Plan

If issues occur:

1. **Revert code changes:**
   ```bash
   git revert <commit-hash>
   git push origin main
   ```

2. **Redeploy previous version:**
   ```bash
   cd api
   npm run build
   func azure functionapp publish func-ctn-demo-asr-dev --typescript --build remote
   ```

3. **No database rollback needed** (code-only changes)

---

## Success Criteria

✅ All 4 API functions successfully write to `audit_log` table
✅ Zero "relation audit_logs does not exist" errors in logs
✅ Audit trail visible in GetAuditLogs API endpoint
✅ E2E tests pass (endpoint management, KvK verification)
✅ Schema documentation matches production state

---

## Notes

- **No SQL migration file** needed (database schema unchanged)
- **Backward compatible:** Existing audit_log records unaffected
- **Future-proof:** All audit logging now uses centralized middleware
- **Security benefit:** Standardized audit format across all operations

---

## Post-Deployment Validation

After deployment, run these queries to confirm fix:

```sql
-- Should show new entries with proper user tracking
SELECT
  event_type,
  COUNT(*) as count,
  COUNT(DISTINCT user_email) as unique_users
FROM audit_log
WHERE dt_created > NOW() - INTERVAL '1 day'
GROUP BY event_type
ORDER BY count DESC;

-- Should show no errors in recent entries
SELECT COUNT(*)
FROM audit_log
WHERE error_message IS NOT NULL
  AND dt_created > NOW() - INTERVAL '1 day';
```

Expected results:
- New audit entries for ENDPOINT_CREATED, TOKEN_ISSUED, etc.
- User email/ID populated correctly
- Zero error messages in recent entries

---

**Status:** Ready for implementation
**Estimated Downtime:** 0 minutes (code-only, hot deploy)
**Risk Level:** LOW (thoroughly tested middleware)
