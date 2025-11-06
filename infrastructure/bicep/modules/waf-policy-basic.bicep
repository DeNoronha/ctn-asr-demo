// ========================================
// Basic Web Application Firewall (WAF) Policy Module
// ========================================
// WAF policy for Azure Front Door - WITHOUT managed rules for initial deployment
// Managed rules can be added later via Azure Portal or CLI

@description('Environment name')
param environment string

@description('Resource prefix')
param resourcePrefix string

@description('Resource tags')
param tags object

// Variables
var wafPolicyName = 'waf${resourcePrefix}${environment}' // No hyphens - ARM resource ID validation requirement
var isProd = environment == 'prod'

// WAF Policy for Front Door - Basic configuration
resource wafPolicy 'Microsoft.Network/FrontDoorWebApplicationFirewallPolicies@2022-05-01' = {
  name: wafPolicyName
  location: 'Global' // Front Door WAF policies are global resources
  tags: tags
  sku: {
    name: 'Premium_AzureFrontDoor' // Premium required for managed rules (can be added later)
  }
  properties: {
    policySettings: {
      enabledState: 'Enabled'
      mode: isProd ? 'Prevention' : 'Detection' // Detection mode in dev, Prevention in prod
      requestBodyCheck: 'Enabled'
    }
    customRules: {
      rules: [
        // Rate limiting rule - 100 requests per minute per IP
        {
          name: 'RateLimitRule'
          priority: 1
          ruleType: 'RateLimitRule'
          rateLimitThreshold: 100
          rateLimitDurationInMinutes: 1
          matchConditions: [
            {
              matchVariable: 'RequestUri'
              operator: 'Contains'
              matchValue: [
                '/'
              ]
            }
          ]
          action: 'Block'
          enabledState: 'Enabled'
        }
        // Block suspicious user agents
        {
          name: 'BlockSuspiciousUserAgents'
          priority: 2
          ruleType: 'MatchRule'
          matchConditions: [
            {
              matchVariable: 'RequestHeader'
              selector: 'User-Agent'
              operator: 'Contains'
              matchValue: [
                'sqlmap'
                'nikto'
                'masscan'
                'nmap'
                'wpscan'
              ]
            }
          ]
          action: 'Block'
          enabledState: 'Enabled'
        }
      ]
    }
    // Note: Managed rules removed for initial deployment due to Bicep compatibility issues
    // Add Microsoft_DefaultRuleSet and Microsoft_BotManagerRuleSet via Azure Portal after deployment
  }
}

// Outputs
output wafPolicyId string = wafPolicy.id
output wafPolicyName string = wafPolicy.name
