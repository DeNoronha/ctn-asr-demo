# Audit Log PII Protection - GDPR Compliance Documentation

**Last Updated:** November 17, 2025
**Status:** Implemented
**CVSS Score:** 2.7 (Low severity, compliance enhancement)
**Compliance:** GDPR Articles 5(1)(c), 25, 32, SOC 2 CC6.7

---

## Executive Summary

The Association Register (ASR) system implements comprehensive PII (Personally Identifiable Information) protection for audit logs to comply with GDPR data minimization and security requirements. This document describes the pseudonymization architecture, retention policies, and access controls implemented to protect user privacy while maintaining security audit trails.

**Key Features:**
- HMAC-based pseudonymization of email addresses and IP addresses
- Encrypted storage of PII mappings for emergency de-pseudonymization
- 90-day automatic retention policy with scheduled purging
- SystemAdmin-only access to original PII with full audit trail
- GDPR-compliant data protection by design

---

## GDPR Compliance Matrix

| GDPR Article | Requirement | Implementation | Status |
|--------------|-------------|----------------|--------|
| **Article 5(1)(c)** | Data Minimization | Pseudonymization of email addresses and IP addresses using HMAC-SHA256 | ✅ Compliant |
| **Article 25** | Data Protection by Design | Pseudonymization enabled by default, encrypted PII mappings, access controls | ✅ Compliant |
| **Article 32** | Security of Processing | Encryption at rest (PostgreSQL), encryption in transit (TLS), access logging | ✅ Compliant |
| **Article 5(1)(e)** | Storage Limitation | 90-day retention policy with automatic purging | ✅ Compliant |
| **Article 32** | Monitoring and Logging | Full audit trail of PII access in `audit_log_pii_access` table | ✅ Compliant |

---

## Architecture Overview

### 1. Pseudonymization Process

**Email Addresses:**
```
Input:  "john.doe@example.com"
Process: HMAC-SHA256(normalize(email), AUDIT_LOG_SECRET)
Output: "email_a1b2c3d4e5f6g7h8" (24 chars fixed length)
```

**IP Addresses:**
```
Input:  "192.168.1.1" (IPv4) or "2001:0db8::1" (IPv6)
Process: HMAC-SHA256(ip_address, AUDIT_LOG_SECRET)
Output: "ipv4_a1b2c3d4e5f6" or "ipv6_a1b2c3d4e5f6" (17 chars fixed length)
```

**Properties:**
- **Deterministic:** Same input always produces same pseudonym (enables filtering)
- **One-way:** Cannot reverse without secret (AUDIT_LOG_SECRET)
- **Collision-resistant:** SHA256 cryptographic strength
- **Fixed length:** Predictable database storage

### 2. Database Schema Changes

**New Columns in `audit_log` table:**
- `user_email_pseudonym` (VARCHAR(64)) - Pseudonymized email address
- `ip_address_pseudonym` (VARCHAR(64)) - Pseudonymized IP address

**Old columns deprecated (to be removed):**
- `user_email` - Plaintext email (DEPRECATED)
- `ip_address` - Plaintext IP (DEPRECATED)

**New Tables:**

1. **`audit_log_pii_mapping`** - Encrypted PII storage
   - `pseudonym` (VARCHAR(64), PRIMARY KEY)
   - `encrypted_value` (BYTEA) - pgcrypto encrypted with PII_ENCRYPTION_KEY
   - `created_by` (VARCHAR(255)) - User who created mapping
   - `dt_created` (TIMESTAMP) - Creation timestamp

2. **`audit_log_pii_access`** - PII access audit trail
   - `access_id` (SERIAL, PRIMARY KEY)
   - `pseudonym` (VARCHAR(64)) - Accessed pseudonym
   - `accessed_by` (VARCHAR(255)) - User who accessed PII
   - `accessed_at` (TIMESTAMP) - Access timestamp
   - `access_reason` (TEXT) - Required justification
   - `user_agent` (TEXT) - Browser/client info
   - `ip_address` (VARCHAR(45)) - Access origin

### 3. Data Flow Diagram

```
┌──────────────────────────────────────────────────────────┐
│ 1. API Request with User Action                         │
│    (email: john.doe@example.com, IP: 192.168.1.1)      │
└───────────────────┬──────────────────────────────────────┘
                    │
                    ↓
┌──────────────────────────────────────────────────────────┐
│ 2. Pseudonymization (auditLog.ts)                       │
│    - pseudonymizeEmail() → email_a1b2c3d4e5f6g7h8      │
│    - pseudonymizeIP() → ipv4_a1b2c3d4e5f6              │
└───────────────────┬──────────────────────────────────────┘
                    │
        ┌───────────┴───────────┐
        ↓                       ↓
┌─────────────────────┐  ┌──────────────────────────┐
│ 3a. Store Mapping   │  │ 3b. Store Audit Log      │
│ (async, optional)   │  │ (primary operation)      │
│                     │  │                          │
│ audit_log_pii_      │  │ audit_log table:         │
│ mapping table:      │  │ - user_email_pseudonym   │
│ - pseudonym         │  │ - ip_address_pseudonym   │
│ - encrypted_value   │  │ - event details          │
└─────────────────────┘  └──────────────────────────┘
```

---

## Configuration

### Environment Variables (Required)

**1. AUDIT_LOG_SECRET** (Required for pseudonymization)
```bash
# Azure Key Vault secret name: AUDIT-LOG-SECRET
# Type: String (minimum 32 characters, cryptographically random)
# Generation:
openssl rand -base64 32

# Example (DO NOT use this value - generate your own):
AUDIT_LOG_SECRET="$(openssl rand -base64 32)"
```

**2. PII_ENCRYPTION_KEY** (Required for de-pseudonymization)
```bash
# Azure Key Vault secret name: PII-ENCRYPTION-KEY
# Type: String (minimum 32 characters, different from AUDIT_LOG_SECRET)
# Generation:
openssl rand -base64 32

# Example (DO NOT use this value - generate your own):
PII_ENCRYPTION_KEY="$(openssl rand -base64 32)"
```

**Security Requirements:**
- Store in Azure Key Vault (NOT in code or environment files)
- Rotate annually (requires re-encryption of existing mappings)
- Different secrets for dev/staging/production environments
- Never commit to source control

### Azure Function App Configuration

```bash
# Configure via Azure CLI
az functionapp config appsettings set \
  --name func-ctn-demo-asr-dev \
  --resource-group rg-ctn-demo-asr-dev \
  --settings \
    "AUDIT_LOG_SECRET=@Microsoft.KeyVault(SecretUri=https://kv-ctn-demo.vault.azure.net/secrets/AUDIT-LOG-SECRET/)" \
    "PII_ENCRYPTION_KEY=@Microsoft.KeyVault(SecretUri=https://kv-ctn-demo.vault.azure.net/secrets/PII-ENCRYPTION-KEY/)"
```

---

## Implementation Details

### 1. Pseudonymization Utility (`api/src/utils/pseudonymization.ts`)

**Functions:**

- **`pseudonymizeEmail(email: string): string | null`**
  - Normalizes email to lowercase
  - Creates HMAC-SHA256 hash with AUDIT_LOG_SECRET
  - Returns pseudonym: `email_{first_16_hex_chars}`

- **`pseudonymizeIP(ip: string): string | null`**
  - Detects IPv4 vs IPv6 (colon presence)
  - Creates HMAC-SHA256 hash with AUDIT_LOG_SECRET
  - Returns pseudonym: `ipv4_{first_12_hex_chars}` or `ipv6_{first_12_hex_chars}`

- **`storePseudonymMapping(pseudonym, originalValue, userId, context): Promise<void>`**
  - Encrypts original value with pgcrypto (`pgp_sym_encrypt`)
  - Stores in `audit_log_pii_mapping` table
  - Non-blocking (async, doesn't fail audit log insertion)

- **`retrieveOriginalValue(pseudonym, context): Promise<string | null>`**
  - Decrypts value with pgcrypto (`pgp_sym_decrypt`)
  - Returns original PII or null if not found
  - RESTRICTED: Caller must verify SystemAdmin role

### 2. Audit Log Middleware (`api/src/middleware/auditLog.ts`)

**Modified `logAuditEvent()` function:**

```typescript
export async function logAuditEvent(
  entry: AuditLogEntry,
  context: InvocationContext
): Promise<void> {
  // 1. Pseudonymize PII
  const pseudonymizedEmail = pseudonymizeEmail(entry.user_email);
  const pseudonymizedIP = pseudonymizeIP(entry.ip_address);

  // 2. Store mappings (async, non-blocking)
  if (entry.user_email && pseudonymizedEmail) {
    storePseudonymMapping(pseudonymizedEmail, entry.user_email, entry.user_id, context)
      .catch(error => context.error('Failed to store email mapping:', error));
  }

  // 3. Insert audit log with pseudonyms
  await pool.query(
    `INSERT INTO audit_log (..., user_email_pseudonym, ip_address_pseudonym, ...)
     VALUES (..., $pseudonymizedEmail, $pseudonymizedIP, ...)`
  );
}
```

### 3. De-Pseudonymization Endpoint (`api/src/functions/GetAuditLogPII.ts`)

**Route:** `GET /api/v1/audit-logs/pii/{pseudonym}?reason=<justification>`

**Access Control:**
- Role: SystemAdmin ONLY
- MFA: Recommended (but not enforced by endpoint)
- Audit: All access logged with WARNING severity

**Response Example:**
```json
{
  "pseudonym": "email_a1b2c3d4e5f6g7h8",
  "original_value": "john.doe@example.com",
  "accessed_by": "admin-user-id",
  "accessed_at": "2025-11-17T10:30:00Z",
  "reason": "Customer support ticket #12345",
  "warning": "This is sensitive PII. Handle with care. All access is logged."
}
```

---

## Retention Policy

### Automatic Purging (90 Days)

**Database Function:**
```sql
CREATE FUNCTION purge_old_audit_logs()
RETURNS TABLE(audit_logs_deleted INTEGER, pii_mappings_deleted INTEGER)
AS $$
BEGIN
  DELETE FROM audit_log WHERE dt_created < NOW() - INTERVAL '90 days';
  DELETE FROM audit_log_pii_mapping WHERE dt_created < NOW() - INTERVAL '90 days';
  RETURN QUERY SELECT deleted_count_audit, deleted_count_pii;
END;
$$ LANGUAGE plpgsql;
```

**Scheduled Execution:**

**Option 1: Azure Function Timer Trigger** (Recommended)
```typescript
// api/src/functions/PurgeAuditLogs.ts
app.timer('PurgeAuditLogs', {
  schedule: '0 0 2 * * *', // Daily at 2:00 AM UTC
  handler: async (myTimer, context) => {
    const pool = getPool();
    const result = await pool.query('SELECT * FROM purge_old_audit_logs()');
    context.log('Purged:', result.rows[0]);
  }
});
```

**Option 2: Azure DevOps Pipeline Schedule**
```yaml
# .azure-pipelines/scheduled/purge-audit-logs.yml
schedules:
- cron: "0 2 * * *"
  displayName: Daily audit log purge
  branches:
    include:
    - main

steps:
- script: |
    ./scripts/purge-audit-logs.sh
  displayName: 'Purge audit logs older than 90 days'
```

**Option 3: Manual Execution**
```bash
# Set environment variables
export POSTGRES_HOST="psql-ctn-demo-asr-dev.postgres.database.azure.com"
export POSTGRES_DATABASE="asr_dev"
export POSTGRES_USER="asradmin"
export POSTGRES_PASSWORD="$(az keyvault secret show --vault-name kv-ctn-demo --name POSTGRES-PASSWORD --query value -o tsv)"

# Dry run first
./scripts/purge-audit-logs.sh --dry-run

# Execute purge
./scripts/purge-audit-logs.sh --retention-days 90
```

---

## Access Controls

### Role-Based Access Control (RBAC)

| Operation | Required Role | Additional Requirements | Audit Severity |
|-----------|---------------|-------------------------|----------------|
| View audit logs (pseudonymized) | SystemAdmin, AssociationAdmin | None | INFO |
| Filter audit logs by email | SystemAdmin, AssociationAdmin | Email must be pseudonymized first | INFO |
| De-pseudonymize email/IP | SystemAdmin ONLY | Reason required (min 10 chars) | WARNING |
| Access PII mapping table | SystemAdmin ONLY | Direct DB access blocked | CRITICAL |
| Purge old audit logs | SystemAdmin ONLY | Scheduled job or manual | INFO |

### Database-Level Access Control

```sql
-- Revoke public access
REVOKE ALL ON audit_log_pii_mapping FROM PUBLIC;
REVOKE ALL ON audit_log_pii_access FROM PUBLIC;

-- Grant minimal permissions to application user
GRANT SELECT, INSERT ON audit_log_pii_mapping TO asradmin;
GRANT SELECT, INSERT ON audit_log_pii_access TO asradmin;

-- NO DELETE or UPDATE permissions (audit trail preservation)
```

---

## Monitoring and Alerting

### Key Metrics to Monitor

1. **Pseudonymization Failures**
   - Metric: Count of audit log entries with NULL pseudonyms
   - Alert: > 10 failures in 1 hour
   - Action: Check AUDIT_LOG_SECRET configuration

2. **PII Access Frequency**
   - Metric: Count of GET /api/v1/audit-logs/pii/* requests
   - Alert: > 5 accesses per day
   - Action: Review access reasons in `audit_log_pii_access` table

3. **Unauthorized PII Access Attempts**
   - Metric: 403 responses on PII endpoint
   - Alert: Any unauthorized attempt
   - Action: Security investigation required

4. **Retention Policy Execution**
   - Metric: Last successful purge timestamp
   - Alert: > 25 hours since last purge
   - Action: Check scheduled job status

### Azure Application Insights Queries

```kusto
// Monitor PII access
requests
| where name contains "GetAuditLogPII"
| where resultCode != 403
| summarize count() by user_AuthenticatedId, bin(timestamp, 1h)
| where count_ > 5

// Monitor pseudonymization failures
traces
| where message contains "pseudonymization not configured"
| summarize count() by bin(timestamp, 1h)

// Monitor unauthorized access attempts
requests
| where name contains "GetAuditLogPII"
| where resultCode == 403
| project timestamp, user_AuthenticatedId, client_IP
```

---

## Testing Procedures

### 1. Unit Tests (Pseudonymization)

```typescript
// api/src/utils/pseudonymization.test.ts
import { pseudonymizeEmail, pseudonymizeIP } from './pseudonymization';

describe('Pseudonymization', () => {
  beforeAll(() => {
    process.env.AUDIT_LOG_SECRET = 'test-secret-key-32-chars-long';
  });

  test('pseudonymizeEmail is deterministic', () => {
    const email = 'john.doe@example.com';
    const pseudonym1 = pseudonymizeEmail(email);
    const pseudonym2 = pseudonymizeEmail(email);
    expect(pseudonym1).toBe(pseudonym2);
  });

  test('pseudonymizeEmail returns fixed length', () => {
    const email = 'a@b.com';
    const pseudonym = pseudonymizeEmail(email);
    expect(pseudonym).toHaveLength(24); // "email_" + 16 hex chars
    expect(pseudonym).toMatch(/^email_[a-f0-9]{16}$/);
  });

  test('pseudonymizeIP detects IPv4 vs IPv6', () => {
    const ipv4 = pseudonymizeIP('192.168.1.1');
    const ipv6 = pseudonymizeIP('2001:0db8::1');
    expect(ipv4).toMatch(/^ipv4_[a-f0-9]{12}$/);
    expect(ipv6).toMatch(/^ipv6_[a-f0-9]{12}$/);
  });

  test('pseudonymization without secret returns null', () => {
    delete process.env.AUDIT_LOG_SECRET;
    const result = pseudonymizeEmail('test@example.com');
    expect(result).toBeNull();
  });
});
```

### 2. Integration Tests (Database)

```bash
# Test migration
psql "$DATABASE_URL" -f database/migrations/036_audit_log_pseudonymization.sql

# Verify tables exist
psql "$DATABASE_URL" -c "\d audit_log_pii_mapping"
psql "$DATABASE_URL" -c "\d audit_log_pii_access"

# Verify function exists
psql "$DATABASE_URL" -c "\df purge_old_audit_logs"

# Test purge function (dry run via query)
psql "$DATABASE_URL" -c "SELECT * FROM purge_old_audit_logs();"
```

### 3. E2E Tests (API)

```bash
# Test audit log creation (should store pseudonyms)
curl -X POST "https://func-ctn-demo-asr-dev.azurewebsites.net/api/v1/members" \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"legal_name": "Test Corp"}'

# Verify pseudonym stored (not plaintext email)
psql "$DATABASE_URL" -c "SELECT user_email_pseudonym, user_email FROM audit_log ORDER BY dt_created DESC LIMIT 1;"

# Test de-pseudonymization (SystemAdmin only)
PSEUDONYM="email_a1b2c3d4e5f6g7h8"
REASON="Testing PII access controls"

curl -X GET "https://func-ctn-demo-asr-dev.azurewebsites.net/api/v1/audit-logs/pii/$PSEUDONYM?reason=$REASON" \
  -H "Authorization: Bearer $SYSTEM_ADMIN_TOKEN"

# Expected: 200 OK with original email
# Expected: Entry in audit_log_pii_access table

# Test unauthorized access (non-SystemAdmin)
curl -X GET "https://func-ctn-demo-asr-dev.azurewebsites.net/api/v1/audit-logs/pii/$PSEUDONYM?reason=$REASON" \
  -H "Authorization: Bearer $REGULAR_USER_TOKEN"

# Expected: 403 Forbidden
```

---

## Incident Response

### Scenario 1: AUDIT_LOG_SECRET Compromise

**If the pseudonymization secret is compromised:**

1. **Immediate Actions:**
   - Generate new AUDIT_LOG_SECRET: `openssl rand -base64 32`
   - Update Azure Key Vault with new secret
   - Restart Azure Function App to load new secret

2. **Data Re-Pseudonymization:**
   - Old pseudonyms still valid (deterministic based on old secret)
   - New audit logs will use new secret (different pseudonyms)
   - Consider purging old mappings after rotation

3. **Post-Incident:**
   - Review who had access to compromised secret
   - Audit PII access logs during compromise period
   - Update secret rotation procedures

### Scenario 2: Unauthorized PII Access

**If unauthorized PII access is detected:**

1. **Verification:**
   - Query `audit_log_pii_access` for access details
   - Verify reason provided for access
   - Check user role and permissions

2. **Investigation:**
   - Review associated audit log entries
   - Interview user who accessed PII
   - Determine if access was legitimate

3. **Remediation:**
   - Revoke user access if malicious
   - Update access control policies
   - Implement additional MFA requirements if needed

---

## Compliance Checklist

**Before Production Deployment:**

- [ ] AUDIT_LOG_SECRET configured in Azure Key Vault
- [ ] PII_ENCRYPTION_KEY configured in Azure Key Vault
- [ ] Database migration 036 applied successfully
- [ ] pgcrypto extension enabled in PostgreSQL
- [ ] Retention policy scheduled job configured
- [ ] Monitoring alerts configured (Application Insights)
- [ ] Access control policies documented
- [ ] Incident response procedures documented
- [ ] Team trained on PII access procedures
- [ ] Data Protection Impact Assessment (DPIA) completed

**Ongoing Compliance:**

- [ ] Weekly: Review PII access logs
- [ ] Monthly: Verify retention policy execution
- [ ] Quarterly: Secret rotation (AUDIT_LOG_SECRET, PII_ENCRYPTION_KEY)
- [ ] Annually: GDPR compliance audit
- [ ] Annually: Update Data Protection Impact Assessment

---

## References

- GDPR Article 5(1)(c): https://gdpr-info.eu/art-5-gdpr/
- GDPR Article 25: https://gdpr-info.eu/art-25-gdpr/
- GDPR Article 32: https://gdpr-info.eu/art-32-gdpr/
- NIST SP 800-122: Guide to Protecting PII
- OWASP Data Anonymization: https://cheatsheetseries.owasp.org/cheatsheets/Data_Anonymization_Cheat_Sheet.html
- PostgreSQL pgcrypto: https://www.postgresql.org/docs/current/pgcrypto.html

---

## Contact

**Data Protection Officer (DPO):** [TBD]
**Security Team:** security@ctn-demo.nl
**Support:** support@ctn-demo.nl

---

**Document Version:** 1.0
**Next Review Date:** February 17, 2026
