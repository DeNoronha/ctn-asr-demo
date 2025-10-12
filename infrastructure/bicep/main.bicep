// ========================================
// CTN ASR - Main Bicep Template
// ========================================
// This is the main infrastructure template for the CTN Association Register
// It orchestrates the deployment of all Azure resources

targetScope = 'subscription'

@description('Environment name (dev, staging, prod)')
@allowed(['dev', 'staging', 'prod'])
param environment string = 'dev'

@description('Primary Azure region')
param location string = 'westeurope'

@description('Resource name prefix')
param resourcePrefix string = 'ctn-asr'

// Variables
var resourceGroupName = 'rg-${resourcePrefix}-${environment}'
var tags = {
  Environment: environment
  Project: 'CTN-ASR'
  ManagedBy: 'Bicep'
}

// Resource Group
resource resourceGroup 'Microsoft.Resources/resourceGroups@2021-04-01' = {
  name: resourceGroupName
  location: location
  tags: tags
}

// Deploy core infrastructure
module coreInfrastructure './modules/core-infrastructure.bicep' = {
  name: 'core-infrastructure-deployment'
  scope: resourceGroup
  params: {
    environment: environment
    location: location
    resourcePrefix: resourcePrefix
    tags: tags
  }
}

// Deploy function app
module functionApp './modules/function-app.bicep' = {
  name: 'function-app-deployment'
  scope: resourceGroup
  params: {
    environment: environment
    location: location
    resourcePrefix: resourcePrefix
    tags: tags
    storageAccountName: coreInfrastructure.outputs.storageAccountName
  }
}

// Deploy static web apps
module staticWebApps './modules/static-web-apps.bicep' = {
  name: 'static-web-apps-deployment'
  scope: resourceGroup
  params: {
    environment: environment
    location: location
    resourcePrefix: resourcePrefix
    tags: tags
  }
}

// Deploy database
@description('Database administrator password')
@secure()
param databaseAdminPassword string

module database './modules/database.bicep' = {
  name: 'database-deployment'
  scope: resourceGroup
  params: {
    environment: environment
    location: location
    resourcePrefix: resourcePrefix
    tags: tags
    adminPassword: databaseAdminPassword
  }
}

// Deploy AI services
module aiServices './modules/ai-services.bicep' = {
  name: 'ai-services-deployment'
  scope: resourceGroup
  params: {
    environment: environment
    location: location
    resourcePrefix: resourcePrefix
    tags: tags
  }
}

// Deploy Event Grid and Communication Services
module messaging './modules/messaging.bicep' = {
  name: 'messaging-deployment'
  scope: resourceGroup
  params: {
    environment: environment
    location: location
    resourcePrefix: resourcePrefix
    tags: tags
  }
}

// Outputs
output resourceGroupName string = resourceGroup.name
output functionAppName string = functionApp.outputs.functionAppName
output staticWebAppName string = staticWebApps.outputs.adminPortalName
output memberPortalName string = staticWebApps.outputs.memberPortalName
output databaseServerName string = database.outputs.serverName
