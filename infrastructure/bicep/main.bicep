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

// Deploy WAF Policy for Front Door
module wafPolicy './modules/waf-policy.bicep' = {
  name: 'waf-policy-deployment'
  scope: resourceGroup
  params: {
    environment: environment
    location: location
    resourcePrefix: resourcePrefix
    tags: tags
  }
}

// Deploy Front Door with WAF protection
module frontDoor './modules/front-door.bicep' = {
  name: 'front-door-deployment'
  scope: resourceGroup
  params: {
    environment: environment
    resourcePrefix: resourcePrefix
    tags: tags
    wafPolicyId: wafPolicy.outputs.wafPolicyId
    adminPortalHostname: staticWebApps.outputs.adminPortalUrl
    memberPortalHostname: staticWebApps.outputs.memberPortalUrl
  }
  dependsOn: [
    wafPolicy
    staticWebApps
  ]
}

// Deploy Cosmos DB for Orchestrator Portal
module cosmosDb './modules/cosmos-db.bicep' = {
  name: 'cosmos-db-deployment'
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

// Deploy API Management
module apiManagement './modules/api-management.bicep' = {
  name: 'api-management-deployment'
  scope: resourceGroup
  params: {
    environment: environment
    location: location
    resourcePrefix: resourcePrefix
    tags: tags
    backendApiUrl: 'https://${functionApp.outputs.functionAppHostName}/api'
    publisherEmail: 'admin@ctn-network.org'
    publisherName: 'CTN Network'
  }
}

// Optional: Deploy secrets to Key Vault (only when secrets are provided)
@description('Enable Key Vault secrets deployment (set to true when providing secrets)')
param enableSecretsDeployment bool = false

@description('Aikido CI API Key')
@secure()
param aikidoCiApiKey string = ''

@description('Admin Portal Deploy Token')
@secure()
param adminPortalDeployToken string = ''

@description('Member Portal Deploy Token')
@secure()
param memberPortalDeployToken string = ''

module keyVaultSecrets './modules/key-vault-secrets.bicep' = if (enableSecretsDeployment) {
  name: 'key-vault-secrets-deployment'
  scope: resourceGroup
  params: {
    keyVaultName: coreInfrastructure.outputs.keyVaultName
    aikidoCiApiKey: aikidoCiApiKey
    adminPortalDeployToken: adminPortalDeployToken
    memberPortalDeployToken: memberPortalDeployToken
    databaseAdminPassword: databaseAdminPassword
    enableSecretCreation: true
  }
  dependsOn: [
    coreInfrastructure
    database
  ]
}

// Grant Function App access to Key Vault secrets
resource keyVaultSecretsUserRole 'Microsoft.Authorization/roleAssignments@2022-04-01' = {
  name: guid(resourceGroup.id, functionApp.outputs.functionAppPrincipalId, 'Key Vault Secrets User')
  scope: resourceGroup
  properties: {
    roleDefinitionId: subscriptionResourceId('Microsoft.Authorization/roleDefinitions', '4633458b-17de-408a-b874-0445c86b69e6') // Key Vault Secrets User
    principalId: functionApp.outputs.functionAppPrincipalId
    principalType: 'ServicePrincipal'
  }
}

// Outputs
output resourceGroupName string = resourceGroup.name
output functionAppName string = functionApp.outputs.functionAppName
output functionAppUrl string = 'https://${functionApp.outputs.functionAppHostName}'
output staticWebAppName string = staticWebApps.outputs.adminPortalName
output memberPortalName string = staticWebApps.outputs.memberPortalName
output orchestratorPortalName string = staticWebApps.outputs.orchestratorPortalName
output databaseServerName string = database.outputs.serverName
output keyVaultName string = coreInfrastructure.outputs.keyVaultName
output cosmosAccountName string = cosmosDb.outputs.cosmosAccountName
output cosmosEndpoint string = cosmosDb.outputs.cosmosEndpoint
output apimGatewayUrl string = apiManagement.outputs.apimGatewayUrl
output apimName string = apiManagement.outputs.apimName
output frontDoorId string = frontDoor.outputs.frontDoorId
output frontDoorName string = frontDoor.outputs.frontDoorName
output adminFrontDoorUrl string = frontDoor.outputs.adminEndpointUrl
output memberFrontDoorUrl string = frontDoor.outputs.memberEndpointUrl
output wafPolicyName string = wafPolicy.outputs.wafPolicyName
