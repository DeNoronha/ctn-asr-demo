// Cosmos DB NoSQL Account for CTN Booking Portal
// OPTIMIZED VERSION - Addresses performance issues identified in performance review

@description('Cosmos DB account name')
param accountName string

@description('Location for resources')
param location string

@description('Resource tags')
param tags object

@description('Deployment mode')
param mode string

@description('Enable autoscale throughput (recommended for production)')
param enableAutoscale bool = true

@description('Maximum autoscale throughput (RU/s)')
param maxAutoscaleThroughput int = 4000

@description('Fixed throughput (RU/s) - only used if autoscale is disabled')
param fixedThroughput int = 1000

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
    options: enableAutoscale ? {
      autoscaleSettings: {
        maxThroughput: maxAutoscaleThroughput
      }
    } : {
      throughput: fixedThroughput
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
          // Exclude large nested objects from indexing to save RUs
          {
            path: '/rawFormRecognizerData/*'
          }
          // Optionally exclude dcsaPlusData if not used in WHERE clauses
          // Uncomment if you only query top-level fields
          // {
          //   path: '/dcsaPlusData/*'
          // }
        ]
        // PERFORMANCE OPTIMIZATION: Composite indexes for common query patterns
        compositeIndexes: [
          // Pattern 1: List bookings ordered by timestamp (most common)
          // Query: WHERE c.tenantId = X ORDER BY c.uploadTimestamp DESC
          [
            {
              path: '/tenantId'
              order: 'ascending'
            }
            {
              path: '/uploadTimestamp'
              order: 'descending'
            }
          ]
          // Pattern 2: Filter by status and order by timestamp
          // Query: WHERE c.tenantId = X AND c.processingStatus = 'pending' ORDER BY c.uploadTimestamp DESC
          [
            {
              path: '/tenantId'
              order: 'ascending'
            }
            {
              path: '/processingStatus'
              order: 'ascending'
            }
            {
              path: '/uploadTimestamp'
              order: 'descending'
            }
          ]
          // Pattern 3: Filter by confidence and order by timestamp
          // Query: WHERE c.tenantId = X AND c.overallConfidence < 0.8 ORDER BY c.uploadTimestamp DESC
          [
            {
              path: '/tenantId'
              order: 'ascending'
            }
            {
              path: '/overallConfidence'
              order: 'ascending'
            }
            {
              path: '/uploadTimestamp'
              order: 'descending'
            }
          ]
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
        // Composite index for validation history queries
        compositeIndexes: [
          [
            {
              path: '/tenantId'
              order: 'ascending'
            }
            {
              path: '/bookingId'
              order: 'ascending'
            }
            {
              path: '/timestamp'
              order: 'descending'
            }
          ]
        ]
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
      defaultTtl: 2592000 // 30 days - auto-delete old learning data
    }
  }
}

// Outputs
output endpoint string = cosmosDbAccount.properties.documentEndpoint
output accountName string = cosmosDbAccount.name
output databaseName string = database.name
output throughputMode string = enableAutoscale ? 'autoscale' : 'fixed'
output maxThroughput int = enableAutoscale ? maxAutoscaleThroughput : fixedThroughput

// DEPLOYMENT NOTES:
// 1. Deploying this will update the indexing policy on the 'bookings' container
// 2. Cosmos DB will rebuild indexes in the background (takes 10-30 minutes depending on data volume)
// 3. Queries will continue to work during reindexing, but may not use new indexes until complete
// 4. Monitor index progress: Azure Portal > Cosmos DB > Data Explorer > Container > Settings > Indexing Policy
// 5. After deployment, update API code to use partition-scoped queries (see performance review doc)

// COST COMPARISON:
// - Development (400 RU/s fixed): ~$24/month
// - Production (1000 RU/s fixed): ~$58/month
// - Production (autoscale 400-4000 RU/s): ~$29-234/month (scales based on actual usage)
// - Recommended: Start with autoscale, monitor usage, adjust max throughput as needed

// PERFORMANCE EXPECTATIONS:
// - Point reads (with correct partition key): 1-3 RU, <10ms
// - Partition-scoped query (50 items): 50-100 RU, 50-100ms
// - Cross-partition query (100 items): 500-1000 RU, 500-1000ms (AVOID!)
// - With composite indexes: 30-50% RU reduction on filtered sorted queries
