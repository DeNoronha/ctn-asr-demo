// ========================================
// Messaging Module
// ========================================
// Event Grid and Azure Communication Services

@description('Environment name')
param environment string

@description('Azure region')
param location string

@description('Resource prefix')
param resourcePrefix string

@description('Resource tags')
param tags object

// Variables
var eventGridTopicName = 'egt-${resourcePrefix}-${environment}'
var communicationServicesName = 'acs-${resourcePrefix}-${environment}'
var emailServiceName = 'email-${resourcePrefix}-${environment}'

// Event Grid Topic
resource eventGridTopic 'Microsoft.EventGrid/topics@2023-12-15-preview' = {
  name: eventGridTopicName
  location: location
  tags: tags
  sku: {
    name: 'Basic'
  }
  kind: 'Azure'
  identity: {
    type: 'SystemAssigned'
  }
  properties: {
    inputSchema: 'EventGridSchema'
    publicNetworkAccess: 'Enabled'
  }
}

// Communication Services for Email
resource communicationServices 'Microsoft.Communication/communicationServices@2023-04-01' = {
  name: communicationServicesName
  location: 'global'
  tags: tags
  properties: {
    dataLocation: 'Europe'
  }
}

// Email Communication Service
resource emailService 'Microsoft.Communication/emailServices@2023-04-01' = {
  name: emailServiceName
  location: 'global'
  tags: tags
  properties: {
    dataLocation: 'Europe'
  }
}

// Email Domain (Azure Managed Domain)
resource emailDomain 'Microsoft.Communication/emailServices/domains@2023-04-01' = {
  parent: emailService
  name: 'AzureManagedDomain'
  location: 'global'
  properties: {
    domainManagement: 'AzureManaged'
    userEngagementTracking: 'Enabled'
  }
}

// Link Communication Services with Email Service
resource emailServiceLink 'Microsoft.Communication/communicationServices/domains@2023-04-01' = {
  parent: communicationServices
  name: emailDomain.name
  location: 'global'
  properties: {
    domainManagement: 'AzureManaged'
  }
}

// Event Grid System Topic for Storage Account (for blob triggers)
// Note: This requires the storage account to already exist
// resource storageEventGridTopic 'Microsoft.EventGrid/systemTopics@2023-12-15-preview' = {
//   name: 'egt-storage-${resourcePrefix}-${environment}'
//   location: location
//   tags: tags
//   properties: {
//     source: '/subscriptions/${subscription().subscriptionId}/resourceGroups/${resourceGroup().name}/providers/Microsoft.Storage/storageAccounts/st${resourcePrefix}${environment}'
//     topicType: 'Microsoft.Storage.StorageAccounts'
//   }
// }

// Outputs
output eventGridTopicName string = eventGridTopic.name
output eventGridTopicId string = eventGridTopic.id
output eventGridTopicEndpoint string = eventGridTopic.properties.endpoint
output eventGridTopicKey string = eventGridTopic.listKeys().key1

output communicationServicesName string = communicationServices.name
output communicationServicesId string = communicationServices.id
output communicationServicesConnectionString string = communicationServices.listKeys().primaryConnectionString

output emailServiceName string = emailService.name
output emailServiceId string = emailService.id
output emailDomainName string = emailDomain.name
output emailSenderAddress string = 'DoNotReply@${emailDomain.properties.mailFromSenderDomain}'
