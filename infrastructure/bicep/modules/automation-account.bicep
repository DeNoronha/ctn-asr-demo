// ========================================
// Automation Account Module
// ========================================
// Azure Automation Account for PostgreSQL start/stop scheduling

@description('Environment name')
param environment string

@description('Azure region')
param location string

@description('Resource prefix')
param resourcePrefix string

@description('Resource tags')
param tags object

// Variables
var automationAccountName = 'auto-${resourcePrefix}-${environment}'

// Automation Account
resource automationAccount 'Microsoft.Automation/automationAccounts@2022-08-08' = {
  name: automationAccountName
  location: location
  tags: union(tags, {
    Purpose: 'PostgreSQL Start/Stop Scheduling'
  })
  properties: {
    sku: {
      name: 'Free'
    }
    encryption: {
      keySource: 'Microsoft.Automation'
    }
    publicNetworkAccess: true
  }
}

// Runbook for starting PostgreSQL server
resource startPostgreSqlRunbook 'Microsoft.Automation/automationAccounts/runbooks@2022-08-08' = {
  parent: automationAccount
  name: 'Start-PostgreSQL'
  location: location
  properties: {
    runbookType: 'PowerShell'
    logProgress: true
    logVerbose: false
    description: 'Start PostgreSQL flexible server'
    publishContentLink: {
      uri: 'https://raw.githubusercontent.com/Azure/azure-quickstart-templates/master/quickstarts/microsoft.automation/automation-start-stop-vm/Start-AzureV2Vm.ps1'
    }
  }
}

// Runbook for stopping PostgreSQL server
resource stopPostgreSqlRunbook 'Microsoft.Automation/automationAccounts/runbooks@2022-08-08' = {
  parent: automationAccount
  name: 'Stop-PostgreSQL'
  location: location
  properties: {
    runbookType: 'PowerShell'
    logProgress: true
    logVerbose: false
    description: 'Stop PostgreSQL flexible server'
    publishContentLink: {
      uri: 'https://raw.githubusercontent.com/Azure/azure-quickstart-templates/master/quickstarts/microsoft.automation/automation-start-stop-vm/Stop-AzureV2Vm.ps1'
    }
  }
}

// Schedule for starting PostgreSQL (weekdays 7 AM UTC)
resource startSchedule 'Microsoft.Automation/automationAccounts/schedules@2022-08-08' = if (environment != 'prod') {
  parent: automationAccount
  name: 'Start-PostgreSQL-Schedule'
  properties: {
    description: 'Start PostgreSQL server at 7 AM UTC on weekdays'
    startTime: dateTimeAdd(utcNow(), 'P1D', 'yyyy-MM-ddTHH:mm:ssZ')
    expiryTime: dateTimeAdd(utcNow(), 'P1Y', 'yyyy-MM-ddTHH:mm:ssZ')
    interval: 1
    frequency: 'Day'
    timeZone: 'UTC'
    advancedSchedule: {
      weekDays: [
        'Monday'
        'Tuesday'
        'Wednesday'
        'Thursday'
        'Friday'
      ]
    }
  }
}

// Schedule for stopping PostgreSQL (weekdays 7 PM UTC)
resource stopSchedule 'Microsoft.Automation/automationAccounts/schedules@2022-08-08' = if (environment != 'prod') {
  parent: automationAccount
  name: 'Stop-PostgreSQL-Schedule'
  properties: {
    description: 'Stop PostgreSQL server at 7 PM UTC on weekdays'
    startTime: dateTimeAdd(utcNow(), 'P1D', 'yyyy-MM-ddTHH:mm:ssZ')
    expiryTime: dateTimeAdd(utcNow(), 'P1Y', 'yyyy-MM-ddTHH:mm:ssZ')
    interval: 1
    frequency: 'Day'
    timeZone: 'UTC'
    advancedSchedule: {
      weekDays: [
        'Monday'
        'Tuesday'
        'Wednesday'
        'Thursday'
        'Friday'
      ]
    }
  }
}

// Outputs
output automationAccountName string = automationAccount.name
output automationAccountId string = automationAccount.id
