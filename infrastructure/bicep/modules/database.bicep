// ========================================
// Database Module
// ========================================
// Azure Database for PostgreSQL

@description('Environment name')
param environment string

@description('Azure region')
param location string

@description('Resource prefix')
param resourcePrefix string

@description('Resource tags')
param tags object

@description('Database administrator username')
@secure()
param adminUsername string = 'ctnadmin'

@description('Database administrator password')
@secure()
param adminPassword string

// Variables
var serverName = 'psql-${resourcePrefix}-${environment}'
var databaseName = 'ctn_asr_${environment}'

// PostgreSQL Flexible Server
resource postgresqlServer 'Microsoft.DBforPostgreSQL/flexibleServers@2023-03-01-preview' = {
  name: serverName
  location: location
  tags: tags
  sku: {
    name: environment == 'prod' ? 'Standard_D4s_v3' : 'Standard_B2s'
    tier: environment == 'prod' ? 'GeneralPurpose' : 'Burstable'
  }
  properties: {
    version: '15'
    administratorLogin: adminUsername
    administratorLoginPassword: adminPassword
    storage: {
      storageSizeGB: environment == 'prod' ? 128 : 32
      autoGrow: 'Enabled'
    }
    backup: {
      backupRetentionDays: environment == 'prod' ? 30 : 7
      geoRedundantBackup: environment == 'prod' ? 'Enabled' : 'Disabled'
    }
    highAvailability: {
      mode: environment == 'prod' ? 'ZoneRedundant' : 'Disabled'
    }
    maintenanceWindow: {
      customWindow: 'Enabled'
      dayOfWeek: 0 // Sunday
      startHour: 2
      startMinute: 0
    }
    availabilityZone: environment == 'prod' ? '1' : ''
    network: {
      publicNetworkAccess: 'Enabled'
    }
  }
}

// Firewall rule to allow Azure services
resource firewallRuleAzureServices 'Microsoft.DBforPostgreSQL/flexibleServers/firewallRules@2023-03-01-preview' = {
  parent: postgresqlServer
  name: 'AllowAllAzureServicesAndResourcesWithinAzureIps'
  properties: {
    startIpAddress: '0.0.0.0'
    endIpAddress: '0.0.0.0'
  }
}

// Firewall rule for development (allow all IPs in dev/staging only)
resource firewallRuleDev 'Microsoft.DBforPostgreSQL/flexibleServers/firewallRules@2023-03-01-preview' = if (environment != 'prod') {
  parent: postgresqlServer
  name: 'AllowAllIPs'
  properties: {
    startIpAddress: '0.0.0.0'
    endIpAddress: '255.255.255.255'
  }
}

// Database
resource database 'Microsoft.DBforPostgreSQL/flexibleServers/databases@2023-03-01-preview' = {
  parent: postgresqlServer
  name: databaseName
  properties: {
    charset: 'UTF8'
    collation: 'en_US.utf8'
  }
}

// PostgreSQL Configuration - Connection Pooling
resource configConnectionPooling 'Microsoft.DBforPostgreSQL/flexibleServers/configurations@2023-03-01-preview' = {
  parent: postgresqlServer
  name: 'max_connections'
  properties: {
    value: environment == 'prod' ? '200' : '100'
    source: 'user-override'
  }
}

// PostgreSQL Configuration - Logging
resource configLogging 'Microsoft.DBforPostgreSQL/flexibleServers/configurations@2023-03-01-preview' = {
  parent: postgresqlServer
  name: 'log_min_duration_statement'
  properties: {
    value: '1000' // Log queries taking longer than 1 second
    source: 'user-override'
  }
}

// Outputs
output serverName string = postgresqlServer.name
output serverId string = postgresqlServer.id
output serverFqdn string = postgresqlServer.properties.fullyQualifiedDomainName
output databaseName string = database.name
output connectionString string = 'Server=${postgresqlServer.properties.fullyQualifiedDomainName};Database=${databaseName};Port=5432;User Id=${adminUsername};Password=${adminPassword};Ssl Mode=Require;'
