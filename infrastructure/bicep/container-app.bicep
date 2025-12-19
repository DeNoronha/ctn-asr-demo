// Container Apps Infrastructure for CTN ASR API
// Replaces Azure Functions with Container Apps for better reliability

@description('Environment name')
param environmentName string = 'dev'

@description('Location for resources')
param location string = resourceGroup().location

@description('Container image to deploy')
param containerImage string

@description('Key Vault name for secrets')
param keyVaultName string = 'kv-ctn-demo-asr-${environmentName}'

@description('Log Analytics workspace name (shared across services)')
param logAnalyticsWorkspaceName string = 'log-ctn-demo'

// Variables
var containerAppName = 'ca-ctn-asr-api-${environmentName}'
var containerAppEnvName = 'cae-ctn-asr-${environmentName}'
var containerRegistryName = 'crctnasrdev'

// Reference existing Log Analytics Workspace (shared with Application Insights)
resource logAnalytics 'Microsoft.OperationalInsights/workspaces@2022-10-01' existing = {
  name: logAnalyticsWorkspaceName
}

// Container Apps Environment
resource containerAppEnv 'Microsoft.App/managedEnvironments@2023-05-01' = {
  name: containerAppEnvName
  location: location
  properties: {
    appLogsConfiguration: {
      destination: 'log-analytics'
      logAnalyticsConfiguration: {
        customerId: logAnalytics.properties.customerId
        sharedKey: logAnalytics.listKeys().primarySharedKey
      }
    }
  }
}

// Reference existing Key Vault
resource keyVault 'Microsoft.KeyVault/vaults@2023-07-01' existing = {
  name: keyVaultName
}

// Container App
resource containerApp 'Microsoft.App/containerApps@2023-05-01' = {
  name: containerAppName
  location: location
  identity: {
    type: 'SystemAssigned'
  }
  properties: {
    managedEnvironmentId: containerAppEnv.id
    configuration: {
      ingress: {
        external: true
        targetPort: 8080
        transport: 'http'
        corsPolicy: {
          allowedOrigins: [
            'https://calm-tree-03352ba03.1.azurestaticapps.net'
            'https://calm-pebble-043b2db03.1.azurestaticapps.net'
            'https://admin-ctn-dev-gma8fnethbetbjgj.z02.azurefd.net'
            'https://portal-ctn-dev-fdb5cpeagdendtck.z02.azurefd.net'
            'http://localhost:3000'
          ]
          allowedMethods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH', 'OPTIONS']
          allowedHeaders: ['*']
          allowCredentials: true
        }
      }
      registries: [
        {
          server: '${containerRegistryName}.azurecr.io'
          identity: 'system'
        }
      ]
      secrets: [
        {
          name: 'postgres-password'
          keyVaultUrl: '${keyVault.properties.vaultUri}secrets/POSTGRES-PASSWORD'
          identity: 'system'
        }
        {
          name: 'azure-storage-connection-string'
          keyVaultUrl: '${keyVault.properties.vaultUri}secrets/AZURE-STORAGE-CONNECTION-STRING'
          identity: 'system'
        }
        {
          name: 'doc-intelligence-key'
          keyVaultUrl: '${keyVault.properties.vaultUri}secrets/DOC-INTELLIGENCE-KEY'
          identity: 'system'
        }
        {
          name: 'kvk-api-key'
          keyVaultUrl: '${keyVault.properties.vaultUri}secrets/KVK-API-KEY'
          identity: 'system'
        }
        {
          name: 'jwt-secret'
          keyVaultUrl: '${keyVault.properties.vaultUri}secrets/JWT-SECRET'
          identity: 'system'
        }
      ]
    }
    template: {
      containers: [
        {
          name: 'api'
          image: containerImage
          resources: {
            cpu: json('0.5')
            memory: '1Gi'
          }
          env: [
            { name: 'PORT', value: '8080' }
            { name: 'NODE_ENV', value: 'production' }
            { name: 'ENVIRONMENT', value: environmentName }
            { name: 'API_VERSION', value: '1.0.0' }
            // Database
            { name: 'POSTGRES_HOST', value: 'psql-ctn-demo-asr-${environmentName}.postgres.database.azure.com' }
            { name: 'POSTGRES_PORT', value: '5432' }
            { name: 'POSTGRES_DATABASE', value: 'asr_${environmentName}' }
            { name: 'POSTGRES_USER', value: 'asradmin' }
            { name: 'POSTGRES_PASSWORD', secretRef: 'postgres-password' }
            // Azure Storage
            { name: 'AZURE_STORAGE_CONNECTION_STRING', secretRef: 'azure-storage-connection-string' }
            // Document Intelligence
            { name: 'DOC_INTELLIGENCE_ENDPOINT', value: 'https://westeurope.api.cognitive.microsoft.com/' }
            { name: 'DOC_INTELLIGENCE_KEY', secretRef: 'doc-intelligence-key' }
            // KvK API
            { name: 'KVK_API_BASE_URL', value: 'https://api.kvk.nl' }
            { name: 'KVK_API_KEY', secretRef: 'kvk-api-key' }
            // Azure AD
            { name: 'AZURE_AD_TENANT_ID', value: '598664e7-725c-4daa-bd1f-89c4ada717ff' }
            { name: 'AZURE_AD_CLIENT_ID', value: 'd3037c11-a541-4f21-8862-8079137a0cde' }
            // JWT
            { name: 'JWT_SECRET', secretRef: 'jwt-secret' }
            // Application Insights
            { name: 'APPINSIGHTS_INSTRUMENTATIONKEY', value: '303479d6-d426-4dbb-8961-e629d054f740' }
            { name: 'APPLICATIONINSIGHTS_CONNECTION_STRING', value: 'InstrumentationKey=303479d6-d426-4dbb-8961-e629d054f740;IngestionEndpoint=https://westeurope-5.in.applicationinsights.azure.com/;LiveEndpoint=https://westeurope.livediagnostics.monitor.azure.com/' }
          ]
          probes: [
            {
              type: 'Liveness'
              httpGet: {
                path: '/api/health'
                port: 8080
              }
              initialDelaySeconds: 10
              periodSeconds: 30
            }
            {
              type: 'Readiness'
              httpGet: {
                path: '/api/health'
                port: 8080
              }
              initialDelaySeconds: 5
              periodSeconds: 10
            }
          ]
        }
      ]
      scale: {
        minReplicas: 0
        maxReplicas: 1
        rules: [
          {
            name: 'http-rule'
            http: {
              metadata: {
                concurrentRequests: '50'
              }
            }
          }
        ]
      }
    }
  }
}

// Grant Container App access to Key Vault
resource keyVaultRoleAssignment 'Microsoft.Authorization/roleAssignments@2022-04-01' = {
  name: guid(keyVault.id, containerApp.id, 'Key Vault Secrets User')
  scope: keyVault
  properties: {
    roleDefinitionId: subscriptionResourceId('Microsoft.Authorization/roleDefinitions', '4633458b-17de-408a-b874-0445c86b69e6') // Key Vault Secrets User
    principalId: containerApp.identity.principalId
    principalType: 'ServicePrincipal'
  }
}

// Grant Container App access to Container Registry
resource acrRoleAssignment 'Microsoft.Authorization/roleAssignments@2022-04-01' = {
  name: guid(containerApp.id, 'AcrPull')
  properties: {
    roleDefinitionId: subscriptionResourceId('Microsoft.Authorization/roleDefinitions', '7f951dda-4ed3-4680-a7ca-43fe172d538d') // AcrPull
    principalId: containerApp.identity.principalId
    principalType: 'ServicePrincipal'
  }
}

// Deploy monitoring alerts
module containerAppAlerts './modules/container-app-alerts.bicep' = {
  name: 'container-app-alerts-deployment'
  params: {
    environment: environmentName
    resourcePrefix: 'ctn-asr'
    tags: {
      Environment: environmentName
      Component: 'Monitoring'
    }
    containerAppId: containerApp.id
  }
}

// Outputs
output containerAppUrl string = 'https://${containerApp.properties.configuration.ingress.fqdn}'
output containerAppName string = containerApp.name
output containerAppId string = containerApp.id
output alertsDeployed bool = true
