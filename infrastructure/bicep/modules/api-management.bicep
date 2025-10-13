// ========================================
// Azure API Management Module
// ========================================
// API Gateway with rate limiting, security, and management features

@description('Environment name')
param environment string

@description('Azure region')
param location string

@description('Resource prefix')
param resourcePrefix string

@description('Resource tags')
param tags object

@description('Publisher email for APIM')
param publisherEmail string = 'admin@ctn-network.org'

@description('Publisher name for APIM')
param publisherName string = 'CTN Network'

@description('Backend API URL (Function App)')
param backendApiUrl string

@description('SKU tier for APIM')
@allowed(['Developer', 'Basic', 'Standard', 'Premium', 'Consumption'])
param skuName string = environment == 'prod' ? 'Standard' : 'Developer'

@description('SKU capacity (units)')
param skuCapacity int = 1

// Variables
var apimName = 'apim-${resourcePrefix}-${environment}'

// API Management Service
resource apiManagement 'Microsoft.ApiManagement/service@2023-05-01-preview' = {
  name: apimName
  location: location
  tags: tags
  sku: {
    name: skuName
    capacity: skuCapacity
  }
  properties: {
    publisherEmail: publisherEmail
    publisherName: publisherName
    notificationSenderEmail: 'noreply@ctn-network.org'
    virtualNetworkType: 'None'
    disableGateway: false
    apiVersionConstraint: {
      minApiVersion: '2021-08-01'
    }
    customProperties: {
      'Microsoft.WindowsAzure.ApiManagement.Gateway.Security.Protocols.Tls10': 'False'
      'Microsoft.WindowsAzure.ApiManagement.Gateway.Security.Protocols.Tls11': 'False'
      'Microsoft.WindowsAzure.ApiManagement.Gateway.Security.Protocols.Ssl30': 'False'
      'Microsoft.WindowsAzure.ApiManagement.Gateway.Security.Backend.Protocols.Tls10': 'False'
      'Microsoft.WindowsAzure.ApiManagement.Gateway.Security.Backend.Protocols.Tls11': 'False'
      'Microsoft.WindowsAzure.ApiManagement.Gateway.Security.Backend.Protocols.Ssl30': 'False'
      'Microsoft.WindowsAzure.ApiManagement.Gateway.Protocols.Server.Http2': 'True'
    }
  }
}

// Backend Configuration for Function App
resource backend 'Microsoft.ApiManagement/service/backends@2023-05-01-preview' = {
  parent: apiManagement
  name: 'ctn-asr-backend'
  properties: {
    description: 'CTN ASR Backend API (Azure Functions)'
    url: backendApiUrl
    protocol: 'http'
    tls: {
      validateCertificateChain: true
      validateCertificateName: true
    }
  }
}

// Global Rate Limiting Policy
resource globalPolicy 'Microsoft.ApiManagement/service/policies@2023-05-01-preview' = {
  parent: apiManagement
  name: 'policy'
  properties: {
    value: '''
    <policies>
      <inbound>
        <!-- Global rate limiting: 100 calls per minute per IP -->
        <rate-limit-by-key calls="100" renewal-period="60" counter-key="@(context.Request.IpAddress)" />

        <!-- CORS policy for frontend applications -->
        <cors allow-credentials="true">
          <allowed-origins>
            <origin>https://calm-tree-03352ba03.1.azurestaticapps.net</origin>
            <origin>https://calm-pebble-043b2db03.1.azurestaticapps.net</origin>
          </allowed-origins>
          <allowed-methods>
            <method>GET</method>
            <method>POST</method>
            <method>PUT</method>
            <method>DELETE</method>
            <method>OPTIONS</method>
          </allowed-methods>
          <allowed-headers>
            <header>*</header>
          </allowed-headers>
          <expose-headers>
            <header>*</header>
          </expose-headers>
        </cors>

        <!-- Security headers -->
        <set-header name="X-Content-Type-Options" exists-action="override">
          <value>nosniff</value>
        </set-header>
        <set-header name="X-Frame-Options" exists-action="override">
          <value>DENY</value>
        </set-header>
        <set-header name="X-XSS-Protection" exists-action="override">
          <value>1; mode=block</value>
        </set-header>
        <set-header name="Strict-Transport-Security" exists-action="override">
          <value>max-age=31536000; includeSubDomains</value>
        </set-header>

        <!-- Forward request to backend -->
        <set-backend-service backend-id="ctn-asr-backend" />
      </inbound>
      <backend>
        <forward-request timeout="60" />
      </backend>
      <outbound>
        <!-- Remove server headers for security -->
        <set-header name="X-Powered-By" exists-action="delete" />
        <set-header name="X-AspNet-Version" exists-action="delete" />
      </outbound>
      <on-error>
        <base />
      </on-error>
    </policies>
    '''
    format: 'xml'
  }
}

// API Definition for CTN ASR
resource api 'Microsoft.ApiManagement/service/apis@2023-05-01-preview' = {
  parent: apiManagement
  name: 'ctn-asr-api'
  properties: {
    displayName: 'CTN Association Register API'
    description: 'API for CTN Association Register - Member management, endpoints, tokens'
    path: 'api/v1'
    protocols: ['https']
    subscriptionRequired: false
    type: 'http'
    serviceUrl: backendApiUrl
    apiVersion: 'v1'
    isCurrent: true
  }
}

// API Operations - Member Endpoints
resource memberOperation 'Microsoft.ApiManagement/service/apis/operations@2023-05-01-preview' = {
  parent: api
  name: 'get-member'
  properties: {
    displayName: 'Get Member Information'
    method: 'GET'
    urlTemplate: '/member'
    description: 'Retrieve authenticated member information'
  }
}

resource memberProfileOperation 'Microsoft.ApiManagement/service/apis/operations@2023-05-01-preview' = {
  parent: api
  name: 'update-member-profile'
  properties: {
    displayName: 'Update Member Profile'
    method: 'PUT'
    urlTemplate: '/member/profile'
    description: 'Update member organization profile'
  }
}

// API Operations - Endpoints Management
resource endpointsOperation 'Microsoft.ApiManagement/service/apis/operations@2023-05-01-preview' = {
  parent: api
  name: 'get-endpoints'
  properties: {
    displayName: 'Get Endpoints'
    method: 'GET'
    urlTemplate: '/entities/{entityId}/endpoints'
    description: 'Retrieve all endpoints for a legal entity'
    templateParameters: [
      {
        name: 'entityId'
        type: 'string'
        required: true
        description: 'Legal Entity ID'
      }
    ]
  }
}

// Enhanced Rate Limiting Policy for API Operations
resource apiPolicy 'Microsoft.ApiManagement/service/apis/policies@2023-05-01-preview' = {
  parent: api
  name: 'policy'
  properties: {
    value: '''
    <policies>
      <inbound>
        <!-- API-specific rate limiting: 1000 calls per hour per subscription/user -->
        <rate-limit-by-key calls="1000" renewal-period="3600" counter-key="@(context.Request.Headers.GetValueOrDefault("Authorization","anonymous"))" />

        <!-- Validate JWT token if present -->
        <validate-jwt header-name="Authorization" failed-validation-httpcode="401" failed-validation-error-message="Unauthorized. Access token is missing or invalid.">
          <openid-config url="https://login.microsoftonline.com/598664e7-725c-4daa-bd1f-89c4ada717ff/v2.0/.well-known/openid-configuration" />
          <audiences>
            <audience>api://d3037c11-a541-4f21-8862-8079137a0cde</audience>
          </audiences>
        </validate-jwt>

        <base />
      </inbound>
      <backend>
        <base />
      </backend>
      <outbound>
        <base />
      </outbound>
      <on-error>
        <base />
      </on-error>
    </policies>
    '''
    format: 'xml'
  }
}

// Diagnostic Settings for APIM
resource diagnosticSettings 'Microsoft.ApiManagement/service/diagnostics@2023-05-01-preview' = {
  parent: apiManagement
  name: 'applicationinsights'
  properties: {
    alwaysLog: 'allErrors'
    httpCorrelationProtocol: 'W3C'
    verbosity: 'information'
    logClientIp: true
    loggerId: apiManagement.id
    sampling: {
      samplingType: 'fixed'
      percentage: 100
    }
    frontend: {
      request: {
        headers: ['Authorization']
        body: {
          bytes: 1024
        }
      }
      response: {
        headers: []
        body: {
          bytes: 1024
        }
      }
    }
    backend: {
      request: {
        headers: []
        body: {
          bytes: 1024
        }
      }
      response: {
        headers: []
        body: {
          bytes: 1024
        }
      }
    }
  }
}

// Named Values for configuration
resource namedValueEnvironment 'Microsoft.ApiManagement/service/namedValues@2023-05-01-preview' = {
  parent: apiManagement
  name: 'environment'
  properties: {
    displayName: 'environment'
    value: environment
    secret: false
  }
}

// Outputs
output apimName string = apiManagement.name
output apimId string = apiManagement.id
output apimGatewayUrl string = apiManagement.properties.gatewayUrl
output apimDeveloperPortalUrl string = apiManagement.properties.developerPortalUrl
output apimManagementApiUrl string = apiManagement.properties.managementApiUrl
