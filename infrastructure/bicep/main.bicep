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

// NOTE: Function App module removed - migrated to Container Apps (November 19, 2025)
// See: infrastructure/bicep/container-app.bicep for Container Apps deployment
// Deployment handled by: .azure-pipelines/container-app-api.yml

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

// NOTE: Front Door Premium and WAF disabled for cost savings (December 19, 2025)
// Front Door Premium costs €170/month - use Static Web Apps direct URLs instead
// Re-enable if production requires CDN/WAF protection
//
// module wafPolicy './modules/waf-policy.bicep' = {
//   name: 'waf-policy-deployment'
//   scope: resourceGroup
//   params: {
//     environment: environment
//     location: location
//     resourcePrefix: resourcePrefix
//     tags: tags
//   }
// }

// module frontDoor './modules/front-door.bicep' = {
//   name: 'front-door-deployment'
//   scope: resourceGroup
//   params: {
//     environment: environment
//     resourcePrefix: resourcePrefix
//     tags: tags
//     wafPolicyId: wafPolicy.outputs.wafPolicyId
//     adminPortalHostname: staticWebApps.outputs.adminPortalUrl
//     memberPortalHostname: staticWebApps.outputs.memberPortalUrl
//   }
//   dependsOn: [
//     wafPolicy
//     staticWebApps
//   ]
// }

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
// NOTE: Commented out - API Management not currently used with Container Apps
// If re-enabled, update backendApiUrl to Container Apps endpoint
// module apiManagement './modules/api-management.bicep' = {
//   name: 'api-management-deployment'
//   scope: resourceGroup
//   params: {
//     environment: environment
//     location: location
//     resourcePrefix: resourcePrefix
//     tags: tags
//     backendApiUrl: 'https://ca-ctn-asr-api-${environment}.azurecontainerapps.io/api'
//     publisherEmail: 'admin@ctn-network.org'
//     publisherName: 'CTN Network'
//   }
// }

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
    database
  ]
}

// NOTE: Key Vault access for Container Apps configured in container-app.bicep
// Container Apps uses managed identity to access Key Vault secrets

// Outputs
output resourceGroupName string = resourceGroup.name
// NOTE: Container Apps outputs now in container-app.bicep
output staticWebAppName string = staticWebApps.outputs.adminPortalName
output memberPortalName string = staticWebApps.outputs.memberPortalName
output databaseServerName string = database.outputs.serverName
output keyVaultName string = coreInfrastructure.outputs.keyVaultName
// NOTE: API Management commented out - see line 142
// output apimGatewayUrl string = apiManagement.outputs.apimGatewayUrl
// output apimName string = apiManagement.outputs.apimName
// NOTE: Front Door outputs disabled - Front Door removed for cost savings
// output frontDoorId string = frontDoor.outputs.frontDoorId
// output frontDoorName string = frontDoor.outputs.frontDoorName
// output adminFrontDoorUrl string = frontDoor.outputs.adminEndpointUrl
// output memberFrontDoorUrl string = frontDoor.outputs.memberEndpointUrl
// output wafPolicyName string = wafPolicy.outputs.wafPolicyName

// Direct Static Web App URLs (use these instead of Front Door)
output adminPortalUrl string = staticWebApps.outputs.adminPortalUrl
output memberPortalUrl string = staticWebApps.outputs.memberPortalUrl
