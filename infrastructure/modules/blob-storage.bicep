// ============================================================================
// Azure Blob Storage Module
// Used for storing KvK documents
// ============================================================================

@description('Storage Account name')
param storageAccountName string

@description('Azure region')
param location string

@description('Resource tags')
param tags object = {}

// ============================================================================
// Storage Account (already exists, just reference containers)
// ============================================================================
resource storageAccount 'Microsoft.Storage/storageAccounts@2023-01-01' existing = {
  name: storageAccountName
}

// ============================================================================
// Blob Container for KvK Documents
// ============================================================================
resource kvkDocumentsContainer 'Microsoft.Storage/storageAccounts/blobServices/containers@2023-01-01' = {
  name: '${storageAccountName}/default/kvk-documents'
  properties: {
    publicAccess: 'None'
  }
}

// ============================================================================
// Outputs
// ============================================================================
output storageAccountName string = storageAccount.name
output kvkContainerName string = 'kvk-documents'
output storageAccountId string = storageAccount.id
