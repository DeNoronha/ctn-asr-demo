// ========================================
// Container Apps Monitoring Alerts Module
// ========================================
// Defines metric alerts for Container Apps health monitoring

@description('Environment name')
param environment string

@description('Resource prefix')
param resourcePrefix string

@description('Resource tags')
param tags object

@description('Container App resource ID')
param containerAppId string

// Variables
var alertNamePrefix = 'ASR'

// Alert 1: HTTP 5xx Errors
resource alert5xxErrors 'Microsoft.Insights/metricAlerts@2018-03-01' = {
  name: '${alertNamePrefix}-Container-App-5xx-Errors'
  location: 'global'
  tags: tags
  properties: {
    description: 'Critical: Container App HTTP 5xx errors exceed 10 in 5 minutes'
    severity: 1
    enabled: true
    scopes: [
      containerAppId
    ]
    evaluationFrequency: 'PT1M'
    windowSize: 'PT5M'
    criteria: {
      'odata.type': 'Microsoft.Azure.Monitor.SingleResourceMultipleMetricCriteria'
      allOf: [
        {
          name: '5xx-errors'
          metricName: 'Requests'
          metricNamespace: 'microsoft.app/containerapps'
          operator: 'GreaterThan'
          threshold: 10
          timeAggregation: 'Total'
          criterionType: 'StaticThresholdCriterion'
          dimensions: [
            {
              name: 'statusCodeCategory'
              operator: 'Include'
              values: [
                '5xx'
              ]
            }
          ]
        }
      ]
    }
  }
}

// Alert 2: High Request Rate
resource alertHighRequestRate 'Microsoft.Insights/metricAlerts@2018-03-01' = {
  name: '${alertNamePrefix}-High-Request-Rate'
  location: 'global'
  tags: tags
  properties: {
    description: 'Warning: Container App request rate exceeds 1000 per 5 minutes'
    severity: 2
    enabled: true
    scopes: [
      containerAppId
    ]
    evaluationFrequency: 'PT1M'
    windowSize: 'PT5M'
    criteria: {
      'odata.type': 'Microsoft.Azure.Monitor.SingleResourceMultipleMetricCriteria'
      allOf: [
        {
          name: 'high-request-rate'
          metricName: 'Requests'
          metricNamespace: 'microsoft.app/containerapps'
          operator: 'GreaterThan'
          threshold: 1000
          timeAggregation: 'Total'
          criterionType: 'StaticThresholdCriterion'
        }
      ]
    }
  }
}

// Alert 3: High Memory Usage
resource alertHighMemory 'Microsoft.Insights/metricAlerts@2018-03-01' = {
  name: '${alertNamePrefix}-High-Memory-Usage'
  location: 'global'
  tags: tags
  properties: {
    description: 'Warning: Container App memory exceeds 800MB for 15 minutes'
    severity: 2
    enabled: true
    scopes: [
      containerAppId
    ]
    evaluationFrequency: 'PT5M'
    windowSize: 'PT15M'
    criteria: {
      'odata.type': 'Microsoft.Azure.Monitor.SingleResourceMultipleMetricCriteria'
      allOf: [
        {
          name: 'high-memory'
          metricName: 'WorkingSetBytes'
          metricNamespace: 'microsoft.app/containerapps'
          operator: 'GreaterThan'
          threshold: 838860800 // 800MB in bytes
          timeAggregation: 'Average'
          criterionType: 'StaticThresholdCriterion'
        }
      ]
    }
  }
}

// Alert 4: Slow Response Time
resource alertSlowResponse 'Microsoft.Insights/metricAlerts@2018-03-01' = {
  name: '${alertNamePrefix}-Slow-Response-Time'
  location: 'global'
  tags: tags
  properties: {
    description: 'Warning: Container App average response time exceeds 5 seconds'
    severity: 2
    enabled: true
    scopes: [
      containerAppId
    ]
    evaluationFrequency: 'PT1M'
    windowSize: 'PT5M'
    criteria: {
      'odata.type': 'Microsoft.Azure.Monitor.SingleResourceMultipleMetricCriteria'
      allOf: [
        {
          name: 'slow-response'
          metricName: 'ResponseTime'
          metricNamespace: 'microsoft.app/containerapps'
          operator: 'GreaterThan'
          threshold: 5000 // 5 seconds in milliseconds
          timeAggregation: 'Average'
          criterionType: 'StaticThresholdCriterion'
        }
      ]
    }
  }
}

// Outputs
output alert5xxErrorsId string = alert5xxErrors.id
output alertHighRequestRateId string = alertHighRequestRate.id
output alertHighMemoryId string = alertHighMemory.id
output alertSlowResponseId string = alertSlowResponse.id
