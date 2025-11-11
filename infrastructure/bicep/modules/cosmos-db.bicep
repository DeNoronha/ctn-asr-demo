// ========================================
// Cosmos DB Module
// ========================================
//
// ⚠️ NOTE: This module is NOT currently deployed by main.bicep
//
// This module was originally used for the Orchestrator Portal, which was
// extracted to a separate repository on November 11, 2025. The module is
// preserved for historical reference and potential future use if ASR requires
// Cosmos DB for other purposes.
//
// To use this module, uncomment the deployment in main.bicep and add the
// required outputs.

@description('Environment name')
param environment string

@description('Azure region')
param location string

@description('Resource prefix')
param resourcePrefix string

@description('Resource tags')
param tags object

// Variables
var cosmosAccountName = 'cosmos-ctn-orchestrator-${environment}'
var databaseName = 'orchestrator-db'

// Cosmos DB Account
resource cosmosAccount 'Microsoft.DocumentDB/databaseAccounts@2023-04-15' = {
  name: cosmosAccountName
  location: location
  tags: union(tags, {
    Service: 'Orchestrator'
  })
  kind: 'GlobalDocumentDB'
  properties: {
    databaseAccountOfferType: 'Standard'
    locations: [
      {
        locationName: location
        failoverPriority: 0
        isZoneRedundant: false
      }
    ]
    consistencyPolicy: {
      defaultConsistencyLevel: 'Session'
      maxIntervalInSeconds: 5
      maxStalenessPrefix: 100
    }
    enableAutomaticFailover: false
    enableMultipleWriteLocations: false
    enableFreeTier: environment == 'dev' ? true : false
    capabilities: [
      {
        name: 'EnableServerless'
      }
    ]
  }
}

// Cosmos DB Database
resource database 'Microsoft.DocumentDB/databaseAccounts/sqlDatabases@2023-04-15' = {
  parent: cosmosAccount
  name: databaseName
  properties: {
    resource: {
      id: databaseName
    }
  }
}

// Container for orchestrations
resource orchestrationsContainer 'Microsoft.DocumentDB/databaseAccounts/sqlDatabases/containers@2023-04-15' = {
  parent: database
  name: 'orchestrations'
  properties: {
    resource: {
      id: 'orchestrations'
      partitionKey: {
        paths: [
          '/partyId'
        ]
        kind: 'Hash'
      }
      indexingPolicy: {
        indexingMode: 'consistent'
        automatic: true
        includedPaths: [
          {
            path: '/*'
          }
        ]
        excludedPaths: [
          {
            path: '/"_etag"/?'
          }
        ]
      }
    }
  }
}

// Container for workflow definitions
resource workflowsContainer 'Microsoft.DocumentDB/databaseAccounts/sqlDatabases/containers@2023-04-15' = {
  parent: database
  name: 'workflows'
  properties: {
    resource: {
      id: 'workflows'
      partitionKey: {
        paths: [
          '/workflowType'
        ]
        kind: 'Hash'
      }
    }
  }
}

// Outputs
output cosmosAccountName string = cosmosAccount.name
output cosmosAccountId string = cosmosAccount.id
output cosmosEndpoint string = cosmosAccount.properties.documentEndpoint
output cosmosPrimaryKey string = cosmosAccount.listKeys().primaryMasterKey
output databaseName string = database.name
