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

// UTC offset that is in effect for W. Europe at the moment of deployment.
// Azure locks the recurring wall-clock time to the first occurrence, then keeps it
// DST-aware via timeZone. So this offset only needs to be correct for the *first* run:
//   - Summer (CEST, ~late Mar–late Oct): +02:00
//   - Winter (CET): +01:00
// Get it wrong and every run lands one hour off until redeployed.
@description('UTC offset in effect for W. Europe at deploy time (+02:00 summer / +01:00 winter)')
param localUtcOffset string = '+02:00'

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

// Weekdays only (Mon-Fri) - the database stays stopped all weekend to save cost
var weekDays = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday']

// Schedule - Stop at 20:00 CET, weekdays only
resource stopSchedule 'Microsoft.Automation/automationAccounts/schedules@2023-11-01' = {
  parent: automationAccount
  name: 'StopPostgreSQL-Evening'
  properties: {
    description: 'Stop PostgreSQL at 20:00 CET (Mon-Fri)'
    startTime: '${tomorrowDate}T${padLeft(stopHour, 2, '0')}:00:00${localUtcOffset}'
    frequency: 'Week'
    interval: 1
    timeZone: 'W. Europe Standard Time'
    advancedSchedule: {
      weekDays: weekDays
    }
  }
}

// Schedule - Start at 08:00 CET, weekdays only
resource startSchedule 'Microsoft.Automation/automationAccounts/schedules@2023-11-01' = {
  parent: automationAccount
  name: 'StartPostgreSQL-Morning'
  properties: {
    description: 'Start PostgreSQL at 08:00 CET (Mon-Fri)'
    startTime: '${tomorrowDate}T${padLeft(startHour, 2, '0')}:00:00${localUtcOffset}'
    frequency: 'Week'
    interval: 1
    timeZone: 'W. Europe Standard Time'
    advancedSchedule: {
      weekDays: weekDays
    }
  }
}

// Salt for the jobSchedule GUIDs. Azure Automation keeps deleted jobSchedule IDs reserved
// for a while, so reusing the same derived GUID after a delete/recreate fails with
// "A jobSchedule with same id already exists." Bump this salt to force fresh GUIDs.
var jobScheduleSalt = 'weekday-v3'

// Link schedules to runbooks
resource stopJobSchedule 'Microsoft.Automation/automationAccounts/jobSchedules@2023-11-01' = {
  parent: automationAccount
  name: guid(automationAccount.id, stopSchedule.name, stopRunbook.name, jobScheduleSalt)
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
  name: guid(automationAccount.id, startSchedule.name, startRunbook.name, jobScheduleSalt)
  properties: {
    runbook: {
      name: startRunbook.name
    }
    schedule: {
      name: startSchedule.name
    }
  }
}
