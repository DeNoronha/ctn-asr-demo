// ========================================
// Static Web Apps Module
// ========================================
// Admin Portal and Member Portal Static Web Apps

@description('Environment name')
param environment string

@description('Azure region')
param location string

@description('Resource prefix')
param resourcePrefix string

@description('Resource tags')
param tags object

// Variables
var adminPortalName = 'ctn-admin-portal'
var memberPortalName = 'ctn-member-portal'

// Admin Portal Static Web App
resource adminPortal 'Microsoft.Web/staticSites@2023-01-01' = {
  name: adminPortalName
  location: location
  tags: union(tags, {
    Portal: 'Admin'
  })
  sku: {
    name: 'Free'
    tier: 'Free'
  }
  properties: {
    buildProperties: {
      appLocation: '/web'
      apiLocation: ''
      outputLocation: 'build'
    }
    stagingEnvironmentPolicy: 'Enabled'
    allowConfigFileUpdates: true
    provider: 'None'
    enterpriseGradeCdnStatus: 'Disabled'
  }
}

// Admin Portal Custom Domain (if in prod)
resource adminPortalCustomDomain 'Microsoft.Web/staticSites/customDomains@2023-01-01' = if (environment == 'prod') {
  parent: adminPortal
  name: 'admin.ctn.nl'
  properties: {}
}

// Member Portal Static Web App
resource memberPortal 'Microsoft.Web/staticSites@2023-01-01' = {
  name: memberPortalName
  location: location
  tags: union(tags, {
    Portal: 'Member'
  })
  sku: {
    name: 'Free'
    tier: 'Free'
  }
  properties: {
    buildProperties: {
      appLocation: '/member-portal'
      apiLocation: ''
      outputLocation: 'build'
    }
    stagingEnvironmentPolicy: 'Enabled'
    allowConfigFileUpdates: true
    provider: 'None'
    enterpriseGradeCdnStatus: 'Disabled'
  }
}

// Member Portal Custom Domain (if in prod)
resource memberPortalCustomDomain 'Microsoft.Web/staticSites/customDomains@2023-01-01' = if (environment == 'prod') {
  parent: memberPortal
  name: 'portal.ctn.nl'
  properties: {}
}

// Outputs
output adminPortalName string = adminPortal.name
output adminPortalId string = adminPortal.id
output adminPortalUrl string = adminPortal.properties.defaultHostname
output adminPortalDeploymentToken string = adminPortal.listSecrets().properties.apiKey

output memberPortalName string = memberPortal.name
output memberPortalId string = memberPortal.id
output memberPortalUrl string = memberPortal.properties.defaultHostname
output memberPortalDeploymentToken string = memberPortal.listSecrets().properties.apiKey
