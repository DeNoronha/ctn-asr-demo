// ========================================
// Azure Front Door Module
// ========================================
// Provides global load balancing, caching, and WAF protection for portals
// Routes traffic to Admin Portal and Member Portal Static Web Apps

@description('Environment name')
param environment string

@description('Resource prefix')
param resourcePrefix string

@description('Resource tags')
param tags object

@description('WAF Policy ID')
param wafPolicyId string

@description('Admin Portal default hostname (from Static Web App)')
param adminPortalHostname string

@description('Member Portal default hostname (from Static Web App)')
param memberPortalHostname string

// Variables
var frontDoorName = 'fd-${resourcePrefix}-${environment}'
var isProd = environment == 'prod'

// Azure Front Door Profile
resource frontDoorProfile 'Microsoft.Cdn/profiles@2023-05-01' = {
  name: frontDoorName
  location: 'Global'
  tags: tags
  sku: {
    name: 'Premium_AzureFrontDoor' // Premium required for WAF with Managed Rules
  }
  properties: {
    originResponseTimeoutSeconds: 60
  }
}

// Admin Portal Origin Group
resource adminOriginGroup 'Microsoft.Cdn/profiles/originGroups@2023-05-01' = {
  parent: frontDoorProfile
  name: 'admin-portal-origin-group'
  properties: {
    loadBalancingSettings: {
      sampleSize: 4
      successfulSamplesRequired: 3
      additionalLatencyInMilliseconds: 50
    }
    healthProbeSettings: {
      probePath: '/'
      probeRequestType: 'GET'
      probeProtocol: 'Https'
      probeIntervalInSeconds: 100
    }
    sessionAffinityState: 'Enabled'
  }
}

// Admin Portal Origin
resource adminOrigin 'Microsoft.Cdn/profiles/originGroups/origins@2023-05-01' = {
  parent: adminOriginGroup
  name: 'admin-portal-origin'
  properties: {
    hostName: adminPortalHostname
    httpPort: 80
    httpsPort: 443
    originHostHeader: adminPortalHostname
    priority: 1
    weight: 1000
    enabledState: 'Enabled'
    enforceCertificateNameCheck: true
  }
}

// Member Portal Origin Group
resource memberOriginGroup 'Microsoft.Cdn/profiles/originGroups@2023-05-01' = {
  parent: frontDoorProfile
  name: 'member-portal-origin-group'
  properties: {
    loadBalancingSettings: {
      sampleSize: 4
      successfulSamplesRequired: 3
      additionalLatencyInMilliseconds: 50
    }
    healthProbeSettings: {
      probePath: '/'
      probeRequestType: 'GET'
      probeProtocol: 'Https'
      probeIntervalInSeconds: 100
    }
    sessionAffinityState: 'Enabled'
  }
}

// Member Portal Origin
resource memberOrigin 'Microsoft.Cdn/profiles/originGroups/origins@2023-05-01' = {
  parent: memberOriginGroup
  name: 'member-portal-origin'
  properties: {
    hostName: memberPortalHostname
    httpPort: 80
    httpsPort: 443
    originHostHeader: memberPortalHostname
    priority: 1
    weight: 1000
    enabledState: 'Enabled'
    enforceCertificateNameCheck: true
  }
}

// Admin Portal Endpoint
resource adminEndpoint 'Microsoft.Cdn/profiles/afdEndpoints@2023-05-01' = {
  parent: frontDoorProfile
  name: 'admin-${resourcePrefix}-${environment}'
  location: 'Global'
  properties: {
    enabledState: 'Enabled'
  }
}

// Member Portal Endpoint
resource memberEndpoint 'Microsoft.Cdn/profiles/afdEndpoints@2023-05-01' = {
  parent: frontDoorProfile
  name: 'portal-${resourcePrefix}-${environment}'
  location: 'Global'
  properties: {
    enabledState: 'Enabled'
  }
}

// Admin Portal Route
resource adminRoute 'Microsoft.Cdn/profiles/afdEndpoints/routes@2023-05-01' = {
  parent: adminEndpoint
  name: 'admin-portal-route'
  dependsOn: [
    adminOrigin
  ]
  properties: {
    customDomains: []
    originGroup: {
      id: adminOriginGroup.id
    }
    ruleSets: []
    supportedProtocols: [
      'Https'
    ]
    patternsToMatch: [
      '/*'
    ]
    forwardingProtocol: 'HttpsOnly'
    linkToDefaultDomain: 'Enabled'
    httpsRedirect: 'Enabled'
    enabledState: 'Enabled'
  }
}

// Member Portal Route
resource memberRoute 'Microsoft.Cdn/profiles/afdEndpoints/routes@2023-05-01' = {
  parent: memberEndpoint
  name: 'member-portal-route'
  dependsOn: [
    memberOrigin
  ]
  properties: {
    customDomains: []
    originGroup: {
      id: memberOriginGroup.id
    }
    ruleSets: []
    supportedProtocols: [
      'Https'
    ]
    patternsToMatch: [
      '/*'
    ]
    forwardingProtocol: 'HttpsOnly'
    linkToDefaultDomain: 'Enabled'
    httpsRedirect: 'Enabled'
    enabledState: 'Enabled'
  }
}

// WAF Security Policy for Admin Portal
resource adminSecurityPolicy 'Microsoft.Cdn/profiles/securityPolicies@2023-05-01' = {
  parent: frontDoorProfile
  name: 'admin-security-policy'
  dependsOn: [
    adminRoute
  ]
  properties: {
    parameters: {
      type: 'WebApplicationFirewall'
      wafPolicy: {
        id: wafPolicyId
      }
      associations: [
        {
          domains: [
            {
              id: adminEndpoint.id
            }
          ]
          patternsToMatch: [
            '/*'
          ]
        }
      ]
    }
  }
}

// WAF Security Policy for Member Portal
resource memberSecurityPolicy 'Microsoft.Cdn/profiles/securityPolicies@2023-05-01' = {
  parent: frontDoorProfile
  name: 'member-security-policy'
  dependsOn: [
    memberRoute
  ]
  properties: {
    parameters: {
      type: 'WebApplicationFirewall'
      wafPolicy: {
        id: wafPolicyId
      }
      associations: [
        {
          domains: [
            {
              id: memberEndpoint.id
            }
          ]
          patternsToMatch: [
            '/*'
          ]
        }
      ]
    }
  }
}

// Outputs
output frontDoorId string = frontDoorProfile.id
output frontDoorName string = frontDoorProfile.name
output adminEndpointHostname string = adminEndpoint.properties.hostName
output memberEndpointHostname string = memberEndpoint.properties.hostName
output adminEndpointUrl string = 'https://${adminEndpoint.properties.hostName}'
output memberEndpointUrl string = 'https://${memberEndpoint.properties.hostName}'
