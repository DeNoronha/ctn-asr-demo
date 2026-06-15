# PostgreSQL Scheduled Start/Stop Automation

Automatically stops and starts the PostgreSQL Flexible Server to save costs outside office hours.

## Schedule

Runs **Monday–Friday only**. The server stays stopped all weekend.

| Action | Time (CET) | Days      |
|--------|------------|-----------|
| Stop   | 20:00      | Mon–Fri   |
| Start  | 08:00      | Mon–Fri   |

## Cost Savings

The PostgreSQL Flexible Server is billed per hour while running. With this schedule the
server only runs ~12 hours on weekdays and is off the entire weekend:

- **Weekday off-hours**: 12 hours × 5 days = 60 hours/week
- **Weekend**: 48 hours/week (Fri 20:00 → Mon 08:00, fully automatic)
- **Monthly savings**: ~60% of compute costs (server runs ~60 of 168 hours/week)

## Files

| File | Description |
|------|-------------|
| `automation-account.bicep` | Bicep template for Automation Account, runbooks, and schedules |
| `Start-PostgreSQL.ps1` | PowerShell runbook to start the server |
| `Stop-PostgreSQL.ps1` | PowerShell runbook to stop the server |
| `deploy.sh` | Deployment script |

## Deployment

Deployed automatically via the **Infrastructure - PostgreSQL Automation** GitHub Actions
workflow (`.github/workflows/postgres-automation.yml`) on changes to this directory, or run
manually via *workflow_dispatch*.

To deploy locally:

```bash
cd infrastructure/automation
chmod +x deploy.sh
./deploy.sh
```

The deploy creates the Automation Account, runbooks, the **Contributor role assignment** on
the PostgreSQL server (required — without it the runbooks fail and the DB runs 24/7), and the
weekday schedules.

## Manual Control

### Stop immediately
```bash
az automation runbook start \
    --resource-group rg-ctn-demo-asr-dev \
    --automation-account-name aa-ctn-asr-dev \
    --name Stop-PostgreSQL
```

### Start immediately
```bash
az automation runbook start \
    --resource-group rg-ctn-demo-asr-dev \
    --automation-account-name aa-ctn-asr-dev \
    --name Start-PostgreSQL
```

### Check server status
```bash
az postgres flexible-server show \
    --resource-group rg-ctn-demo-asr-dev \
    --name psql-ctn-demo-asr-dev \
    --query "state" -o tsv
```

## Troubleshooting

### Runbook fails with authentication error
The Managed Identity needs Contributor access to the PostgreSQL server:
```bash
PRINCIPAL_ID=$(az automation account show -g rg-ctn-demo-asr-dev -n aa-ctn-asr-dev --query "identity.principalId" -o tsv)
az role assignment create --assignee-object-id $PRINCIPAL_ID --role Contributor --scope /subscriptions/add6a89c-7fb9-4f8a-9d63-7611a617430e/resourceGroups/rg-ctn-demo-asr-dev/providers/Microsoft.DBforPostgreSQL/flexibleServers/psql-ctn-demo-asr-dev
```

### Module not found error
Wait 5-10 minutes after deployment for PowerShell modules to import, or check module status:
```bash
az automation module show -g rg-ctn-demo-asr-dev --automation-account-name aa-ctn-asr-dev -n Az.PostgreSql --query "provisioningState" -o tsv
```

## Modifying the Schedule

To change the schedule times, update the `stopTimeUtc` and `startTimeUtc` parameters in the Bicep file and redeploy, or modify directly in Azure Portal.
