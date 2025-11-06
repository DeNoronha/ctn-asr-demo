// ========================================
// Web Application Firewall (WAF) Policy Module
// ========================================
// WAF policy for Azure Front Door
// Provides protection against OWASP Top 10 threats, bot attacks, and DDoS

@description('Environment name')
param environment string

@description('Azure region')
param location string

@description('Resource prefix')
param resourcePrefix string

@description('Resource tags')
param tags object

// Variables
var wafPolicyName = 'waf-${resourcePrefix}-${environment}'
var isProd = environment == 'prod'

// WAF Policy for Front Door
resource wafPolicy 'Microsoft.Network/FrontDoorWebApplicationFirewallPolicies@2022-05-01' = {
  name: wafPolicyName
  location: 'Global' // Front Door WAF policies are global resources
  tags: tags
  sku: {
    name: isProd ? 'Premium_AzureFrontDoor' : 'Standard_AzureFrontDoor'
  }
  properties: {
    policySettings: {
      enabledState: 'Enabled'
      mode: isProd ? 'Prevention' : 'Detection' // Detection mode in dev, Prevention in prod
      requestBodyCheck: 'Enabled'
      maxRequestBodySizeInKb: 128
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
        // Geo-restriction (optional - allow only EU and NL)
        {
          name: 'GeoRestriction'
          priority: 3
          ruleType: 'MatchRule'
          matchConditions: [
            {
              matchVariable: 'RemoteAddr'
              operator: 'GeoMatch'
              negateCondition: true
              matchValue: [
                'NL' // Netherlands
                'BE' // Belgium
                'DE' // Germany
                'FR' // France
                'GB' // United Kingdom
                'US' // United States (for Azure AD authentication)
              ]
            }
          ]
          action: isProd ? 'Block' : 'Log' // Only block in production
          enabledState: isProd ? 'Enabled' : 'Disabled'
        }
      ]
    }
    managedRules: {
      managedRuleSets: [
        // Microsoft Default Rule Set (Core Rule Set based on OWASP)
        {
          ruleSetType: 'Microsoft_DefaultRuleSet'
          ruleSetVersion: '2.1'
          ruleSetAction: 'Block'
          ruleGroupOverrides: []
          exclusions: []
        }
        // Microsoft Bot Manager Rule Set
        {
          ruleSetType: 'Microsoft_BotManagerRuleSet'
          ruleSetVersion: '1.0'
          ruleSetAction: 'Block'
          ruleGroupOverrides: []
        }
      ]
    }
  }
}

// Outputs
output wafPolicyId string = wafPolicy.id
output wafPolicyName string = wafPolicy.name
