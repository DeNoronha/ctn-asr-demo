// ========================================
// Key Vault Secrets Module
// ========================================
// Manages secrets for CI/CD pipelines and application configuration

@description('Key Vault name')
param keyVaultName string

@description('Aikido CI API Key for security scanning')
@secure()
param aikidoCiApiKey string

@description('Azure Static Web Apps API Token for Admin Portal')
@secure()
param adminPortalDeployToken string

@description('Azure Static Web Apps API Token for Member Portal')
@secure()
param memberPortalDeployToken string

@description('Azure Static Web Apps API Token for Orchestrator Portal')
@secure()
param orchestratorPortalDeployToken string = ''

@description('Database administrator password')
@secure()
param databaseAdminPassword string

@description('KVK API Key for registry validation')
@secure()
param kvkApiKey string = ''

@description('Azure Document Intelligence Key for KVK document processing')
@secure()
param docIntelligenceKey string = ''

@description('Anthropic API Key for DocuFlow AI features')
@secure()
param anthropicApiKey string = ''

@description('Enable secret creation (set to false to skip secrets on first deploy)')
param enableSecretCreation bool = true

// Reference existing Key Vault
resource keyVault 'Microsoft.KeyVault/vaults@2023-07-01' existing = {
  name: keyVaultName
}

// Aikido CI API Key Secret
resource aikidoSecret 'Microsoft.KeyVault/vaults/secrets@2023-07-01' = if (enableSecretCreation) {
  parent: keyVault
  name: 'AIKIDO-CI-API-KEY'
  properties: {
    value: aikidoCiApiKey
    contentType: 'text/plain'
    attributes: {
      enabled: true
    }
  }
}

// Admin Portal Deploy Token
resource adminPortalTokenSecret 'Microsoft.KeyVault/vaults/secrets@2023-07-01' = if (enableSecretCreation) {
  parent: keyVault
  name: 'AZURE-STATIC-WEB-APPS-API-TOKEN-ADMIN'
  properties: {
    value: adminPortalDeployToken
    contentType: 'text/plain'
    attributes: {
      enabled: true
    }
  }
}

// Member Portal Deploy Token
resource memberPortalTokenSecret 'Microsoft.KeyVault/vaults/secrets@2023-07-01' = if (enableSecretCreation) {
  parent: keyVault
  name: 'AZURE-STATIC-WEB-APPS-API-TOKEN-MEMBER'
  properties: {
    value: memberPortalDeployToken
    contentType: 'text/plain'
    attributes: {
      enabled: true
    }
  }
}

// Database Admin Password
resource databasePasswordSecret 'Microsoft.KeyVault/vaults/secrets@2023-07-01' = if (enableSecretCreation) {
  parent: keyVault
  name: 'DATABASE-ADMIN-PASSWORD'
  properties: {
    value: databaseAdminPassword
    contentType: 'text/plain'
    attributes: {
      enabled: true
    }
  }
}

// Orchestrator Portal Deploy Token
resource orchestratorPortalTokenSecret 'Microsoft.KeyVault/vaults/secrets@2023-07-01' = if (enableSecretCreation && orchestratorPortalDeployToken != '') {
  parent: keyVault
  name: 'AZURE-STATIC-WEB-APPS-API-TOKEN-ORCHESTRATOR'
  properties: {
    value: orchestratorPortalDeployToken
    contentType: 'text/plain'
    attributes: {
      enabled: true
    }
  }
}

// KVK API Key
resource kvkApiKeySecret 'Microsoft.KeyVault/vaults/secrets@2023-07-01' = if (enableSecretCreation && kvkApiKey != '') {
  parent: keyVault
  name: 'KVK-API-KEY'
  properties: {
    value: kvkApiKey
    contentType: 'text/plain'
    attributes: {
      enabled: true
    }
  }
}

// Document Intelligence Key
resource docIntelligenceKeySecret 'Microsoft.KeyVault/vaults/secrets@2023-07-01' = if (enableSecretCreation && docIntelligenceKey != '') {
  parent: keyVault
  name: 'DOC-INTELLIGENCE-KEY'
  properties: {
    value: docIntelligenceKey
    contentType: 'text/plain'
    attributes: {
      enabled: true
    }
  }
}

// Anthropic API Key
resource anthropicApiKeySecret 'Microsoft.KeyVault/vaults/secrets@2023-07-01' = if (enableSecretCreation && anthropicApiKey != '') {
  parent: keyVault
  name: 'ANTHROPIC-API-KEY'
  properties: {
    value: anthropicApiKey
    contentType: 'text/plain'
    attributes: {
      enabled: true
    }
  }
}

// Outputs
output aikidoSecretUri string = enableSecretCreation ? aikidoSecret.properties.secretUri : ''
output adminPortalTokenSecretUri string = enableSecretCreation ? adminPortalTokenSecret.properties.secretUri : ''
output memberPortalTokenSecretUri string = enableSecretCreation ? memberPortalTokenSecret.properties.secretUri : ''
output databasePasswordSecretUri string = enableSecretCreation ? databasePasswordSecret.properties.secretUri : ''
