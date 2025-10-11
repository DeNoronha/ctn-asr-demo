// ============================================================================
// Azure Communication Services Module
// Used for sending email notifications
// ============================================================================

@description('Communication Services name')
param communicationServicesName string

@description('Azure region')
param location string

@description('Resource tags')
param tags object = {}

@description('Email domain name')
param emailDomainName string = 'AzureManagedDomain'

// ============================================================================
// Communication Services Resource
// ============================================================================
resource communicationService 'Microsoft.Communication/communicationServices@2023-04-01' = {
  name: communicationServicesName
  location: 'global' // Communication Services is a global resource
  tags: tags
  properties: {
    dataLocation: location == 'westeurope' ? 'Europe' : 'UnitedStates'
  }
}

// ============================================================================
// Email Service (linked to Communication Services)
// ============================================================================
resource emailService 'Microsoft.Communication/emailServices@2023-04-01' = {
  name: '${communicationServicesName}-email'
  location: 'global'
  tags: tags
  properties: {
    dataLocation: location == 'westeurope' ? 'Europe' : 'UnitedStates'
  }
}

// ============================================================================
// Email Domain (Azure Managed Domain or Custom Domain)
// ============================================================================
resource emailDomain 'Microsoft.Communication/emailServices/domains@2023-04-01' = {
  parent: emailService
  name: emailDomainName
  location: 'global'
  tags: tags
  properties: {
    domainManagement: emailDomainName == 'AzureManagedDomain' ? 'AzureManaged' : 'CustomerManaged'
  }
}

// ============================================================================
// Link Email Domain to Communication Services
// ============================================================================
resource emailDomainLink 'Microsoft.Communication/communicationServices/domains@2023-04-01' = {
  parent: communicationService
  name: emailDomain.name
  location: 'global'
  properties: {
    domainId: emailDomain.id
  }
}

// ============================================================================
// Outputs
// ============================================================================
output communicationServicesId string = communicationService.id
output communicationServicesName string = communicationService.name
output connectionString string = communicationService.listKeys().primaryConnectionString
output emailServiceId string = emailService.id
output emailDomainId string = emailDomain.id
output senderAddress string = 'DoNotReply@${emailDomain.properties.mailFromSenderDomain}'
