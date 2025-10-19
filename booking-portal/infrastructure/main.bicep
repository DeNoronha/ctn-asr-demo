// CTN Booking Portal - Main Bicep Template
// Deploys complete infrastructure for SaaS or self-hosted mode

targetScope = 'subscription'

@description('Deployment mode: saas or self-hosted')
@allowed([
  'saas'
  'self-hosted'
])
param mode string = 'saas'

@description('Environment: dev, test, or prod')
@allowed([
  'dev'
  'test'
  'prod'
])
param environment string = 'dev'

@description('Azure region for resources')
param location string = 'westeurope'

@description('Tenant ID (required for self-hosted mode, format: organizationId-terminalId)')
param tenantId string = ''

@description('Organization name (for resource naming)')
param organizationName string = 'ctn'

@description('Tags for all resources')
param tags object = {
  Project: 'CTN-Booking-Portal'
  Environment: environment
  Mode: mode
  ManagedBy: 'Bicep'
}

// Naming conventions
var resourceGroupName = mode == 'saas'
  ? 'rg-${organizationName}-booking-${environment}'
  : 'rg-${organizationName}-booking-${tenantId}-${environment}'

var cosmosDbAccountName = mode == 'saas'
  ? 'cosmos-${organizationName}-booking-${environment}'
  : 'cosmos-booking-${tenantId}-${environment}'

var functionAppName = mode == 'saas'
  ? 'func-${organizationName}-booking-${environment}'
  : 'func-booking-${tenantId}-${environment}'

var staticWebAppName = mode == 'saas'
  ? 'swa-${organizationName}-booking-${environment}'
  : 'swa-booking-${tenantId}-${environment}'

var storageAccountName = mode == 'saas'
  ? replace('stbooking${environment}${uniqueString(organizationName)}', '-', '')
  : replace('stbooking${tenantId}${environment}', '-', '')

var keyVaultName = mode == 'saas'
  ? 'kv-booking-${environment}'
  : 'kv-booking-${tenantId}-${take(uniqueString(tenantId), 5)}'

var docIntelligenceName = mode == 'saas'
  ? 'di-${organizationName}-booking-${environment}'
  : 'di-booking-${tenantId}-${environment}'

var appInsightsName = mode == 'saas'
  ? 'ai-${organizationName}-booking-${environment}'
  : 'ai-booking-${tenantId}-${environment}'

// Resource Group
resource rg 'Microsoft.Resources/resourceGroups@2023-07-01' = {
  name: resourceGroupName
  location: location
  tags: tags
}

// Cosmos DB Module
module cosmosDb 'modules/cosmosdb.bicep' = {
  name: 'cosmosdb-deployment'
  scope: rg
  params: {
    accountName: cosmosDbAccountName
    location: location
    tags: tags
    mode: mode
  }
}

// Storage Account Module
module storage 'modules/storage.bicep' = {
  name: 'storage-deployment'
  scope: rg
  params: {
    storageAccountName: storageAccountName
    location: location
    tags: tags
    mode: mode
    tenantId: tenantId
  }
}

// Key Vault Module
module keyVault 'modules/keyvault.bicep' = {
  name: 'keyvault-deployment'
  scope: rg
  params: {
    keyVaultName: keyVaultName
    location: location
    tags: tags
    tenantId: subscription().tenantId
  }
}

// Document Intelligence Module
module docIntelligence 'modules/document-intelligence.bicep' = {
  name: 'doc-intelligence-deployment'
  scope: rg
  params: {
    accountName: docIntelligenceName
    location: location
    tags: tags
  }
}

// Application Insights Module
module appInsights 'modules/app-insights.bicep' = {
  name: 'app-insights-deployment'
  scope: rg
  params: {
    appInsightsName: appInsightsName
    location: location
    tags: tags
  }
}

// Azure Functions Module
module functionApp 'modules/function-app.bicep' = {
  name: 'function-app-deployment'
  scope: rg
  params: {
    functionAppName: functionAppName
    location: location
    tags: tags
    storageAccountName: storage.outputs.storageAccountName
    appInsightsConnectionString: appInsights.outputs.connectionString
    keyVaultName: keyVault.outputs.keyVaultName
    cosmosDbEndpoint: cosmosDb.outputs.endpoint
    docIntelligenceEndpoint: docIntelligence.outputs.endpoint
  }
}

// Static Web App Module
module staticWebApp 'modules/static-web-app.bicep' = {
  name: 'static-web-app-deployment'
  scope: rg
  params: {
    staticWebAppName: staticWebAppName
    location: location
    tags: tags
    functionAppUrl: functionApp.outputs.functionAppUrl
  }
}

// Outputs
output resourceGroupName string = rg.name
output cosmosDbEndpoint string = cosmosDb.outputs.endpoint
output functionAppUrl string = functionApp.outputs.functionAppUrl
output staticWebAppUrl string = staticWebApp.outputs.staticWebAppUrl
output keyVaultName string = keyVault.outputs.keyVaultName
output storageAccountName string = storage.outputs.storageAccountName
output docIntelligenceEndpoint string = docIntelligence.outputs.endpoint
output appInsightsInstrumentationKey string = appInsights.outputs.instrumentationKey
