// ========================================
// Messaging Module
// ========================================
// Event Grid and Azure Communication Services

@description('Environment name')
param environment string


@description('Resource prefix')
param resourcePrefix string

@description('Resource tags')
param tags object

// Variables
var communicationServicesName = 'acs-${resourcePrefix}-${environment}'
var emailServiceName = 'email-${resourcePrefix}-${environment}'

// NOTE: An Event Grid topic was removed here. Its only subscription was a dead webhook
// (empty endpoint, left over from the decommissioned Function App), nothing consumed its
// outputs, and the live topic has been deleted. Re-add if an event-driven consumer returns.

// Communication Services for Email
resource communicationServices 'Microsoft.Communication/communicationServices@2023-04-01' = {
  name: communicationServicesName
  location: 'global'
  tags: tags
  properties: {
    dataLocation: 'Europe'
    // Link the Azure-managed email domain. This is the supported way to connect a
    // domain to ACS — the previous child resource type
    // Microsoft.Communication/communicationServices/domains does not exist and caused
    // a ResourceTypeRegistrationNotFound preflight failure.
    linkedDomains: [
      emailDomain.id
    ]
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
output communicationServicesName string = communicationServices.name
output communicationServicesId string = communicationServices.id
output communicationServicesConnectionString string = communicationServices.listKeys().primaryConnectionString

output emailServiceName string = emailService.name
output emailServiceId string = emailService.id
output emailDomainName string = emailDomain.name
output emailSenderAddress string = 'DoNotReply@${emailDomain.properties.mailFromSenderDomain}'
