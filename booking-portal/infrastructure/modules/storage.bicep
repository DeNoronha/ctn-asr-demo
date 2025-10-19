// Azure Blob Storage for CTN Booking Portal

@description('Storage account name')
param storageAccountName string

@description('Location for resources')
param location string

@description('Resource tags')
param tags object

@description('Deployment mode')
param mode string

@description('Tenant ID (for self-hosted mode)')
param tenantId string = ''

resource storageAccount 'Microsoft.Storage/storageAccounts@2023-01-01' = {
  name: take(toLower(replace(storageAccountName, '-', '')), 24)
  location: location
  tags: tags
  sku: {
    name: 'Standard_LRS'
  }
  kind: 'StorageV2'
  properties: {
    accessTier: 'Hot'
    supportsHttpsTrafficOnly: true
    minimumTlsVersion: 'TLS1_2'
    allowBlobPublicAccess: false
    networkAcls: {
      bypass: 'AzureServices'
      defaultAction: 'Allow'
    }
  }
}

resource blobService 'Microsoft.Storage/storageAccounts/blobServices@2023-01-01' = {
  parent: storageAccount
  name: 'default'
  properties: {
    cors: {
      corsRules: [
        {
          allowedOrigins: ['*']
          allowedMethods: ['GET', 'POST', 'PUT']
          allowedHeaders: ['*']
          exposedHeaders: ['*']
          maxAgeInSeconds: 3600
        }
      ]
    }
    deleteRetentionPolicy: {
      enabled: true
      days: 7
    }
  }
}

// Create containers based on mode
resource documentsContainer 'Microsoft.Storage/storageAccounts/blobServices/containers@2023-01-01' = if (mode == 'self-hosted') {
  parent: blobService
  name: 'documents-${tenantId}'
  properties: {
    publicAccess: 'None'
  }
}

// For SaaS mode, containers are created dynamically per tenant via API
// Create a default admin container for SaaS mode
resource adminContainer 'Microsoft.Storage/storageAccounts/blobServices/containers@2023-01-01' = if (mode == 'saas') {
  parent: blobService
  name: 'admin'
  properties: {
    publicAccess: 'None'
  }
}

output storageAccountName string = storageAccount.name
output storageAccountId string = storageAccount.id
output blobEndpoint string = storageAccount.properties.primaryEndpoints.blob
