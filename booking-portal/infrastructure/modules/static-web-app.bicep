// Azure Static Web App for CTN Booking Portal Frontend

@description('Static Web App name')
param staticWebAppName string

@description('Location for resources')
param location string

@description('Resource tags')
param tags object

@description('Function App URL for API proxy')
param functionAppUrl string

resource staticWebApp 'Microsoft.Web/staticSites@2022-09-01' = {
  name: staticWebAppName
  location: location
  tags: tags
  sku: {
    name: 'Standard'
    tier: 'Standard'
  }
  properties: {
    buildProperties: {
      skipGithubActionWorkflowGeneration: true
    }
    stagingEnvironmentPolicy: 'Enabled'
    allowConfigFileUpdates: true
  }
}

output staticWebAppUrl string = 'https://${staticWebApp.properties.defaultHostname}'
output staticWebAppId string = staticWebApp.id
output staticWebAppName string = staticWebApp.name
