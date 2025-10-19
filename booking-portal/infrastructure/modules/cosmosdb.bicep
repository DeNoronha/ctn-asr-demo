// Cosmos DB NoSQL Account for CTN Booking Portal

@description('Cosmos DB account name')
param accountName string

@description('Location for resources')
param location string

@description('Resource tags')
param tags object

@description('Deployment mode')
param mode string

resource cosmosDbAccount 'Microsoft.DocumentDB/databaseAccounts@2023-04-15' = {
  name: accountName
  location: location
  tags: tags
  kind: 'GlobalDocumentDB'
  properties: {
    databaseAccountOfferType: 'Standard'
    consistencyPolicy: {
      defaultConsistencyLevel: 'Session'
    }
    locations: [
      {
        locationName: location
        failoverPriority: 0
        isZoneRedundant: false
      }
    ]
    enableAutomaticFailover: false
    enableMultipleWriteLocations: false
    enableFreeTier: false
    publicNetworkAccess: 'Enabled'
    capabilities: []
  }
}

resource database 'Microsoft.DocumentDB/databaseAccounts/sqlDatabases@2023-04-15' = {
  parent: cosmosDbAccount
  name: 'ctn-bookings-db'
  properties: {
    resource: {
      id: 'ctn-bookings-db'
    }
    options: {
      throughput: 400 // Shared throughput for all containers
    }
  }
}

resource bookingsContainer 'Microsoft.DocumentDB/databaseAccounts/sqlDatabases/containers@2023-04-15' = {
  parent: database
  name: 'bookings'
  properties: {
    resource: {
      id: 'bookings'
      partitionKey: {
        paths: ['/tenantId']
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
      defaultTtl: -1
    }
  }
}

resource tenantConfigContainer 'Microsoft.DocumentDB/databaseAccounts/sqlDatabases/containers@2023-04-15' = {
  parent: database
  name: 'tenant-config'
  properties: {
    resource: {
      id: 'tenant-config'
      partitionKey: {
        paths: ['/tenantId']
        kind: 'Hash'
      }
      defaultTtl: -1
    }
  }
}

resource validationHistoryContainer 'Microsoft.DocumentDB/databaseAccounts/sqlDatabases/containers@2023-04-15' = {
  parent: database
  name: 'validation-history'
  properties: {
    resource: {
      id: 'validation-history'
      partitionKey: {
        paths: ['/tenantId']
        kind: 'Hash'
      }
      defaultTtl: -1
    }
  }
}

resource learningDataContainer 'Microsoft.DocumentDB/databaseAccounts/sqlDatabases/containers@2023-04-15' = {
  parent: database
  name: 'learning-data'
  properties: {
    resource: {
      id: 'learning-data'
      partitionKey: {
        paths: ['/tenantId']
        kind: 'Hash'
      }
      defaultTtl: 2592000 // 30 days
    }
  }
}

output endpoint string = cosmosDbAccount.properties.documentEndpoint
output accountName string = cosmosDbAccount.name
output databaseName string = database.name
