// Front Door + WAF Only Deployment
// This deploys only the Front Door and WAF components to existing infrastructure

targetScope = 'subscription'

@description('Environment name (dev, staging, prod)')
param environment string = 'dev'

@description('Primary Azure region for resources')
param location string = 'westeurope'

var resourcePrefix = 'ctn'
var resourceGroupName = 'rg-${resourcePrefix}-demo-asr-${environment}'

// Use existing resource group
resource resourceGroup 'Microsoft.Resources/resourceGroups@2021-04-01' existing = {
  name: resourceGroupName
}

// Deploy WAF Policy (basic - without managed rules for initial deployment)
module wafPolicy 'modules/waf-policy-basic.bicep' = {
  scope: resourceGroup
  name: 'wafPolicyDeployment'
  params: {
    environment: environment
    resourcePrefix: resourcePrefix
    tags: {
      Environment: environment
      Project: 'CTN-ASR'
      ManagedBy: 'Bicep'
    }
  }
}

// Get existing Static Web Apps
resource existingAdminPortal 'Microsoft.Web/staticSites@2023-01-01' existing = {
  scope: resourceGroup
  name: 'stapp-${resourcePrefix}-demo-asr-${environment}'
}

resource existingMemberPortal 'Microsoft.Web/staticSites@2023-01-01' existing = {
  scope: resourceGroup
  name: '${resourcePrefix}-member-portal'
}

// Deploy Front Door
module frontDoor 'modules/front-door.bicep' = {
  scope: resourceGroup
  name: 'frontDoorDeployment'
  params: {
    environment: environment
    resourcePrefix: resourcePrefix
    wafPolicyId: wafPolicy.outputs.wafPolicyId
    adminPortalHostname: existingAdminPortal.properties.defaultHostname
    memberPortalHostname: existingMemberPortal.properties.defaultHostname
    tags: {
      Environment: environment
      Project: 'CTN-ASR'
      ManagedBy: 'Bicep'
    }
  }
}

// Outputs
output frontDoorId string = frontDoor.outputs.frontDoorId
output frontDoorName string = frontDoor.outputs.frontDoorName
output adminEndpointHostname string = frontDoor.outputs.adminEndpointHostname
output memberEndpointHostname string = frontDoor.outputs.memberEndpointHostname
output adminEndpointUrl string = frontDoor.outputs.adminEndpointUrl
output memberEndpointUrl string = frontDoor.outputs.memberEndpointUrl
output wafPolicyId string = wafPolicy.outputs.wafPolicyId
