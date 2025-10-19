// Azure AI Document Intelligence for CTN Booking Portal

@description('Document Intelligence account name')
param accountName string

@description('Location for resources')
param location string

@description('Resource tags')
param tags object

resource docIntelligence 'Microsoft.CognitiveServices/accounts@2023-05-01' = {
  name: accountName
  location: location
  tags: tags
  kind: 'FormRecognizer'
  sku: {
    name: 'S0' // Standard tier
  }
  properties: {
    customSubDomainName: accountName
    publicNetworkAccess: 'Enabled'
    networkAcls: {
      defaultAction: 'Allow'
    }
  }
}

output endpoint string = docIntelligence.properties.endpoint
output accountName string = docIntelligence.name
output accountId string = docIntelligence.id
