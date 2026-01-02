# PostgreSQL Scheduled Start/Stop Automation

Automatically stops and starts the PostgreSQL Flexible Server to save costs outside office hours.

## Schedule

| Action | Time (CET) | Time (UTC) |
|--------|------------|------------|
| Stop   | 20:00      | 19:00      |
| Start  | 08:00      | 07:00      |

## Cost Savings

The PostgreSQL Flexible Server is billed per hour while running. By stopping it for 12 hours daily (20:00-08:00) and on weekends, you save approximately:

- **Weekday savings**: 12 hours × 5 days = 60 hours/week
- **Weekend savings**: 48 hours/week (if manually stopped Friday evening)
- **Monthly savings**: ~50% of compute costs

## Files

| File | Description |
|------|-------------|
| `automation-account.bicep` | Bicep template for Automation Account, runbooks, and schedules |
| `Start-PostgreSQL.ps1` | PowerShell runbook to start the server |
| `Stop-PostgreSQL.ps1` | PowerShell runbook to stop the server |
| `deploy.sh` | Deployment script |

## Deployment

```bash
cd /Users/ramon/DEV/CTN-ASR/infrastructure/automation
chmod +x deploy.sh
./deploy.sh
```

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
