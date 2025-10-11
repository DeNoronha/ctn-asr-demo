// ============================================================================
// Azure Event Grid Module
// Used for routing events to subscribers (email notifications)
// ============================================================================

@description('Event Grid Topic name')
param eventGridTopicName string

@description('Azure region')
param location string

@description('Resource tags')
param tags object = {}

// ============================================================================
// Event Grid Topic (Custom Events)
// ============================================================================
resource eventGridTopic 'Microsoft.EventGrid/topics@2023-12-15-preview' = {
  name: eventGridTopicName
  location: location
  tags: tags
  properties: {
    inputSchema: 'EventGridSchema'
    publicNetworkAccess: 'Enabled'
  }
}

// ============================================================================
// Outputs
// ============================================================================
output eventGridTopicId string = eventGridTopic.id
output eventGridTopicName string = eventGridTopic.name
output eventGridTopicEndpoint string = eventGridTopic.properties.endpoint
output eventGridTopicKey string = eventGridTopic.listKeys().key1
