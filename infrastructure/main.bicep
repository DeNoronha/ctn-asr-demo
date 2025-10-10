// ============================================================================
// CTN Association Register - Infrastructure as Code (Bicep)
// ============================================================================
// Deploy: az deployment sub create --location westeurope --template-file main.bicep
// ============================================================================

targetScope = 'subscription'

// Parameters
@description('Environment name (dev, staging, prod)')
@allowed(['dev', 'staging', 'prod'])
param environment string = 'dev'

@description('Azure region for resources')
param location string = 'westeurope'

@description('Project name prefix')
param projectName string = 'ctn'

@description('Azure Entra ID Tenant ID')
param entraIdTenantId string

@description('Azure Entra ID Client ID')
param entraIdClientId string

@description('Database administrator password')
@secure()
param dbAdminPassword string

// Variables
var resourceGroupName = 'rg-${projectName}-${environment}'
var sqlServerName = 'sql-${projectName}-${environment}-${uniqueString(subscription().subscriptionId)}'
var sqlDatabaseName = 'asr-${environment}'
var functionAppName = 'func-${projectName}-${environment}'
var staticWebAppName = 'swa-${projectName}-${environment}'
var storageAccountName = 'st${projectName}${environment}${uniqueString(subscription().subscriptionId)}'
var appInsightsName = 'appi-${projectName}-${environment}'
var keyVaultName = 'kv-${projectName}-${environment}'
var appServicePlanName = 'asp-${projectName}-${environment}'

// Tags
var commonTags = {
  Environment: environment
  Project: projectName
  ManagedBy: 'Bicep'
  CostCenter: 'CTN'
}

// ============================================================================
// Resource Group
// ============================================================================
resource resourceGroup 'Microsoft.Resources/resourceGroups@2021-04-01' = {
  name: resourceGroupName
  location: location
  tags: commonTags
}

// ============================================================================
// Azure SQL Database
// ============================================================================
module sqlServer 'modules/sql-server.bicep' = {
  scope: resourceGroup
  name: 'sql-server-deployment'
  params: {
    sqlServerName: sqlServerName
    location: location
    administratorLogin: 'asradmin'
    administratorPassword: dbAdminPassword
    databaseName: sqlDatabaseName
    tags: commonTags
  }
}

// ============================================================================
// Storage Account (for Azure Functions)
// ============================================================================
module storageAccount 'modules/storage-account.bicep' = {
  scope: resourceGroup
  name: 'storage-deployment'
  params: {
    storageAccountName: storageAccountName
    location: location
    tags: commonTags
  }
}

// ============================================================================
// Application Insights
// ============================================================================
module appInsights 'modules/app-insights.bicep' = {
  scope: resourceGroup
  name: 'appinsights-deployment'
  params: {
    appInsightsName: appInsightsName
    location: location
    tags: commonTags
  }
}

// ============================================================================
// Key Vault (for secrets)
// ============================================================================
module keyVault 'modules/key-vault.bicep' = {
  scope: resourceGroup
  name: 'keyvault-deployment'
  params: {
    keyVaultName: keyVaultName
    location: location
    tenantId: subscription().tenantId
    tags: commonTags
  }
}

// ============================================================================
// App Service Plan (for Azure Functions)
// ============================================================================
module appServicePlan 'modules/app-service-plan.bicep' = {
  scope: resourceGroup
  name: 'app-service-plan-deployment'
  params: {
    appServicePlanName: appServicePlanName
    location: location
    sku: environment == 'prod' ? 'P1v2' : 'Y1'
    tags: commonTags
  }
}

// ============================================================================
// Azure Functions (API Backend)
// ============================================================================
module functionApp 'modules/function-app.bicep' = {
  scope: resourceGroup
  name: 'function-app-deployment'
  params: {
    functionAppName: functionAppName
    location: location
    appServicePlanId: appServicePlan.outputs.appServicePlanId
    storageAccountName: storageAccountName
    appInsightsConnectionString: appInsights.outputs.connectionString
    sqlConnectionString: sqlServer.outputs.connectionString
    entraIdTenantId: entraIdTenantId
    entraIdClientId: entraIdClientId
    tags: commonTags
  }
  dependsOn: [
    storageAccount
    appInsights
  ]
}

// ============================================================================
// Azure Static Web App (React Frontend)
// ============================================================================
module staticWebApp 'modules/static-web-app.bicep' = {
  scope: resourceGroup
  name: 'static-web-app-deployment'
  params: {
    staticWebAppName: staticWebAppName
    location: location
    sku: environment == 'prod' ? 'Standard' : 'Free'
    tags: commonTags
  }
}

// ============================================================================
// Outputs
// ============================================================================
output resourceGroupName string = resourceGroup.name
output sqlServerName string = sqlServer.outputs.sqlServerName
output sqlDatabaseName string = sqlDatabaseName
output functionAppName string = functionApp.outputs.functionAppName
output functionAppUrl string = functionApp.outputs.functionAppUrl
output staticWebAppName string = staticWebApp.outputs.staticWebAppName
output staticWebAppUrl string = staticWebApp.outputs.staticWebAppUrl
output keyVaultName string = keyVault.outputs.keyVaultName
