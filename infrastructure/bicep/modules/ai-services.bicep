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
var cognitiveServicesName = 'cog-${resourcePrefix}-${environment}'

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

// Multi-service Cognitive Services account (for future AI features)
resource cognitiveServices 'Microsoft.CognitiveServices/accounts@2023-10-01-preview' = {
  name: cognitiveServicesName
  location: location
  tags: tags
  kind: 'CognitiveServices'
  sku: {
    name: environment == 'prod' ? 'S0' : 'F0'
  }
  identity: {
    type: 'SystemAssigned'
  }
  properties: {
    customSubDomainName: cognitiveServicesName
    publicNetworkAccess: 'Enabled'
    networkAcls: {
      defaultAction: 'Allow'
    }
    disableLocalAuth: false
  }
}

// Outputs
output documentIntelligenceName string = documentIntelligence.name
output documentIntelligenceId string = documentIntelligence.id
output documentIntelligenceEndpoint string = documentIntelligence.properties.endpoint
output documentIntelligenceKey string = documentIntelligence.listKeys().key1

output cognitiveServicesName string = cognitiveServices.name
output cognitiveServicesId string = cognitiveServices.id
output cognitiveServicesEndpoint string = cognitiveServices.properties.endpoint
output cognitiveServicesKey string = cognitiveServices.listKeys().key1
