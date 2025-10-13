# Database Migration 009 - Deployment Instructions

## Migration File
`009_create_audit_log_table.sql`

## What It Does
Creates the `audit_log` table for comprehensive security auditing:
- 20+ audit event types (auth, CRUD, admin actions)
- Tracks user ID, email, IP address, user-agent
- JSONB details field for flexible data
- Comprehensive indexing for performance
- Severity levels (INFO, WARNING, ERROR, CRITICAL)

## Deployment Methods

### Option 1: Azure Portal (Recommended)
1. Go to Azure Portal
2. Navigate to `psql-ctn-demo-asr-dev.postgres.database.azure.com`
3. Click "Connection strings" and note the connection details
4. Use Azure Cloud Shell or Query Editor
5. Run the SQL script from `009_create_audit_log_table.sql`

### Option 2: psql Command Line
```bash
# Add your IP to firewall first:
az postgres flexible-server firewall-rule create \
  --resource-group rg-ctn-demo-asr-dev \
  --name psql-ctn-demo-asr-dev \
  --rule-name AllowMyIP \
  --start-ip-address YOUR_IP \
  --end-ip-address YOUR_IP

# Run migration:
PGPASSWORD='<YOUR_POSTGRES_PASSWORD>' psql \
  -h psql-ctn-demo-asr-dev.postgres.database.azure.com \
  -U asradmin \
  -d asr_dev \
  -p 5432 \
  -f 009_create_audit_log_table.sql
```

### Option 3: pgAdmin or DBeaver
1. Connect to the database using GUI tool
2. Open `009_create_audit_log_table.sql`
3. Execute the script

## Verification
After running the migration, verify:
```sql
-- Check table exists
\dt audit_log

-- Check sample record
SELECT * FROM audit_log WHERE event_type = 'system_migration';

-- Verify indexes
\d audit_log
```

## Rollback (if needed)
```sql
DROP TABLE IF EXISTS audit_log CASCADE;
```
