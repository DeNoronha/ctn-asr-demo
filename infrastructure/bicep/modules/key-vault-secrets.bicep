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

@description('Database administrator password')
@secure()
param databaseAdminPassword string

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

// Outputs
output aikidoSecretUri string = enableSecretCreation ? aikidoSecret.properties.secretUri : ''
output adminPortalTokenSecretUri string = enableSecretCreation ? adminPortalTokenSecret.properties.secretUri : ''
output memberPortalTokenSecretUri string = enableSecretCreation ? memberPortalTokenSecret.properties.secretUri : ''
output databasePasswordSecretUri string = enableSecretCreation ? databasePasswordSecret.properties.secretUri : ''
