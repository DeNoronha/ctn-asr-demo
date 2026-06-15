// ========================================
// AI Services Module
// ========================================
// Azure AI Document Intelligence and Cognitive Services

@description('Environment name')
param environment string

@description('Azure region')
param location string

@description('Resource prefix')
param resourcePrefix string

@description('Resource tags')
param tags object

// Variables
var documentIntelligenceName = 'di-${resourcePrefix}-${environment}'

// Azure AI Document Intelligence (Form Recognizer)
resource documentIntelligence 'Microsoft.CognitiveServices/accounts@2023-10-01-preview' = {
  name: documentIntelligenceName
  location: location
  tags: tags
  kind: 'FormRecognizer'
  sku: {
    name: environment == 'prod' ? 'S0' : 'F0'
  }
  identity: {
    type: 'SystemAssigned'
  }
  properties: {
    customSubDomainName: documentIntelligenceName
    publicNetworkAccess: 'Enabled'
    networkAcls: {
      defaultAction: 'Allow'
    }
    disableLocalAuth: false
  }
}

// NOTE: A multi-service Microsoft.CognitiveServices/accounts (kind 'CognitiveServices')
// account was removed here. It was unused (no consumers of its outputs), did not exist in
// the live environment, and the dev SKU 'F0' is invalid for that account kind ('CognitiveServices'
// has no free tier), which broke the infra deployment's preflight validation. Re-add a
// correctly-tiered account (S0) when a feature actually needs it.

// Outputs
output documentIntelligenceName string = documentIntelligence.name
output documentIntelligenceId string = documentIntelligence.id
output documentIntelligenceEndpoint string = documentIntelligence.properties.endpoint
output documentIntelligenceKey string = documentIntelligence.listKeys().key1
