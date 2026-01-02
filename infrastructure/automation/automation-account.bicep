// Azure Automation Account for PostgreSQL scheduled start/stop
// Saves costs by stopping the database outside office hours
// Part 1: Core resources (account, runbooks, variables)

@description('Environment name')
@allowed(['dev', 'prod'])
param environment string = 'dev'

@description('Location for all resources')
param location string = resourceGroup().location

@description('Resource prefix for naming')
param resourcePrefix string = 'ctn-asr'

@description('PostgreSQL server name to manage')
param postgresServerName string = 'psql-ctn-demo-asr-dev'

@description('Resource group containing the PostgreSQL server')
param postgresResourceGroup string = 'rg-ctn-demo-asr-dev'

@description('Subscription ID')
param subscriptionId string = subscription().subscriptionId

// Automation Account
resource automationAccount 'Microsoft.Automation/automationAccounts@2023-11-01' = {
  name: 'aa-${resourcePrefix}-${environment}'
  location: location
  identity: {
    type: 'SystemAssigned'
  }
  properties: {
    sku: {
      name: 'Free'
    }
    encryption: {
      keySource: 'Microsoft.Automation'
    }
  }
}

// PowerShell Runbook - Stop PostgreSQL
resource stopRunbook 'Microsoft.Automation/automationAccounts/runbooks@2023-11-01' = {
  parent: automationAccount
  name: 'Stop-PostgreSQL'
  location: location
  properties: {
    runbookType: 'PowerShell'
    logProgress: true
    logVerbose: true
    description: 'Stops the PostgreSQL Flexible Server to save costs outside office hours'
  }
}

// PowerShell Runbook - Start PostgreSQL
resource startRunbook 'Microsoft.Automation/automationAccounts/runbooks@2023-11-01' = {
  parent: automationAccount
  name: 'Start-PostgreSQL'
  location: location
  properties: {
    runbookType: 'PowerShell'
    logProgress: true
    logVerbose: true
    description: 'Starts the PostgreSQL Flexible Server for office hours'
  }
}

// Variables for the runbooks
resource postgresServerNameVar 'Microsoft.Automation/automationAccounts/variables@2023-11-01' = {
  parent: automationAccount
  name: 'PostgresServerName'
  properties: {
    value: '"${postgresServerName}"'
    isEncrypted: false
    description: 'Name of the PostgreSQL Flexible Server'
  }
}

resource postgresResourceGroupVar 'Microsoft.Automation/automationAccounts/variables@2023-11-01' = {
  parent: automationAccount
  name: 'PostgresResourceGroup'
  properties: {
    value: '"${postgresResourceGroup}"'
    isEncrypted: false
    description: 'Resource group containing the PostgreSQL server'
  }
}

resource subscriptionIdVar 'Microsoft.Automation/automationAccounts/variables@2023-11-01' = {
  parent: automationAccount
  name: 'SubscriptionId'
  properties: {
    value: '"${subscriptionId}"'
    isEncrypted: false
    description: 'Subscription ID'
  }
}

// Outputs
output automationAccountName string = automationAccount.name
output automationAccountPrincipalId string = automationAccount.identity.principalId
output stopRunbookName string = stopRunbook.name
output startRunbookName string = startRunbook.name
