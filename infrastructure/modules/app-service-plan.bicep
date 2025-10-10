// App Service Plan Module
param appServicePlanName string
param location string
param sku string
param tags object = {}

resource appServicePlan 'Microsoft.Web/serverfarms@2022-03-01' = {
  name: appServicePlanName
  location: location
  tags: tags
  sku: {
    name: sku
    tier: sku == 'Y1' ? 'Dynamic' : 'PremiumV2'
  }
  kind: sku == 'Y1' ? 'functionapp' : 'linux'
  properties: {
    reserved: true
  }
}

output appServicePlanId string = appServicePlan.id
output appServicePlanName string = appServicePlan.name
