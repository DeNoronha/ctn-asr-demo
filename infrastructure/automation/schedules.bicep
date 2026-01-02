// Azure Automation Schedules for PostgreSQL start/stop
// Part 2: Schedules and job links (deploy AFTER runbooks are published)

@description('Environment name')
@allowed(['dev', 'prod'])
param environment string = 'dev'

@description('Resource prefix for naming')
param resourcePrefix string = 'ctn-asr'

@description('Base time for schedule creation (used internally)')
param baseTime string = utcNow()

@description('Stop time (hour in 24h format, CET timezone)')
param stopHour int = 20  // 20:00 CET

@description('Start time (hour in 24h format, CET timezone)')
param startHour int = 8  // 08:00 CET

// Reference existing automation account
resource automationAccount 'Microsoft.Automation/automationAccounts@2023-11-01' existing = {
  name: 'aa-${resourcePrefix}-${environment}'
}

// Reference existing runbooks
resource stopRunbook 'Microsoft.Automation/automationAccounts/runbooks@2023-11-01' existing = {
  parent: automationAccount
  name: 'Stop-PostgreSQL'
}

resource startRunbook 'Microsoft.Automation/automationAccounts/runbooks@2023-11-01' existing = {
  parent: automationAccount
  name: 'Start-PostgreSQL'
}

// Calculate tomorrow's date for schedule start
var tomorrow = dateTimeAdd(baseTime, 'P1D')
var tomorrowDate = substring(tomorrow, 0, 10) // Extract YYYY-MM-DD

// Schedule - Stop at 20:00 CET
resource stopSchedule 'Microsoft.Automation/automationAccounts/schedules@2023-11-01' = {
  parent: automationAccount
  name: 'StopPostgreSQL-Evening'
  properties: {
    description: 'Stop PostgreSQL at 20:00 CET'
    startTime: '${tomorrowDate}T${padLeft(stopHour, 2, '0')}:00:00+01:00'
    frequency: 'Day'
    interval: 1
    timeZone: 'W. Europe Standard Time'
  }
}

// Schedule - Start at 08:00 CET
resource startSchedule 'Microsoft.Automation/automationAccounts/schedules@2023-11-01' = {
  parent: automationAccount
  name: 'StartPostgreSQL-Morning'
  properties: {
    description: 'Start PostgreSQL at 08:00 CET'
    startTime: '${tomorrowDate}T${padLeft(startHour, 2, '0')}:00:00+01:00'
    frequency: 'Day'
    interval: 1
    timeZone: 'W. Europe Standard Time'
  }
}

// Link schedules to runbooks
resource stopJobSchedule 'Microsoft.Automation/automationAccounts/jobSchedules@2023-11-01' = {
  parent: automationAccount
  name: guid(automationAccount.id, stopSchedule.name, stopRunbook.name)
  properties: {
    runbook: {
      name: stopRunbook.name
    }
    schedule: {
      name: stopSchedule.name
    }
  }
}

resource startJobSchedule 'Microsoft.Automation/automationAccounts/jobSchedules@2023-11-01' = {
  parent: automationAccount
  name: guid(automationAccount.id, startSchedule.name, startRunbook.name)
  properties: {
    runbook: {
      name: startRunbook.name
    }
    schedule: {
      name: startSchedule.name
    }
  }
}
