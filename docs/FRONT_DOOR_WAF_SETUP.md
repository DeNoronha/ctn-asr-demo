# Azure Front Door with WAF - Setup Guide

**Last Updated:** November 6, 2025

## Overview

This guide covers the Azure Front Door and Web Application Firewall (WAF) implementation for the CTN ASR admin and member portals.

## Architecture

### Components

1. **Azure Front Door** - Global load balancer, CDN, and routing service
2. **Web Application Firewall (WAF)** - Security protection layer
3. **Static Web Apps** - Backend origins for admin and member portals

### Data Flow

```
User Request
    ↓
[Azure Front Door]
    ↓ (Global routing + Caching)
[WAF Policy Evaluation]
    ↓ (Security checks)
If Allowed → [Admin/Member Portal Static Web App]
If Blocked → 403 Forbidden
```

### Resources Created

- **WAF Policy:** `waf-ctn-asr-{environment}`
- **Front Door Profile:** `fd-ctn-asr-{environment}`
- **Admin Endpoint:** `admin-ctn-asr-{environment}.z01.azurefd.net`
- **Member Endpoint:** `portal-ctn-asr-{environment}.z01.azurefd.net`

## Features

### Front Door Capabilities

1. **Global Load Balancing**
   - Routes traffic to nearest/healthiest backend
   - Session affinity (sticky sessions) enabled
   - Health probes every 100 seconds

2. **Performance Optimization**
   - Content caching at edge locations worldwide
   - SSL/TLS termination
   - Traffic acceleration via Microsoft global network

3. **High Availability**
   - Automatic failover
   - DDoS protection (L3/L4)
   - 99.99% SLA (Standard) / 99.995% SLA (Premium)

### WAF Security Features

1. **OWASP Protection**
   - Microsoft Default Rule Set 2.1 (based on OWASP CRS)
   - Blocks SQL injection, XSS, RCE, LFI, RFI, etc.
   - Automatic threat intelligence updates

2. **Rate Limiting**
   - 100 requests per minute per IP address
   - Prevents brute force attacks
   - Mitigates DDoS attacks

3. **Bot Management**
   - Microsoft Bot Manager Rule Set 1.0
   - Blocks malicious bots
   - Allows legitimate search engine crawlers

4. **Custom Rules**
   - **Suspicious User Agent Blocking**: Blocks sqlmap, nikto, masscan, nmap, wpscan
   - **Geo-Restriction** (Production only): Only allows NL, BE, DE, FR, GB, US

5. **Mode Selection**
   - **Detection Mode** (dev): Logs threats but doesn't block
   - **Prevention Mode** (prod): Actively blocks threats

## Deployment

### Prerequisites

- Azure subscription with permissions to create resources
- Static Web Apps already deployed (admin and member portals)
- Azure CLI or Bicep deployment pipeline

### Deployment via Bicep

The Front Door and WAF are deployed as part of the main infrastructure:

```bash
# Deploy entire infrastructure (includes Front Door + WAF)
# Set password as environment variable first
# export DB_PASSWORD=YourSecurePasswordHere
az deployment sub create \
  --location westeurope \
  --template-file infrastructure/bicep/main.bicep \
  --parameters environment=dev \
  --parameters databaseAdminPassword=$DB_PASSWORD
```

### Deploy Only Front Door and WAF

```bash
# 1. Deploy WAF Policy
az deployment group create \
  --resource-group rg-ctn-asr-dev \
  --template-file infrastructure/bicep/modules/waf-policy.bicep \
  --parameters environment=dev \
  --parameters location=westeurope \
  --parameters resourcePrefix=ctn-asr

# 2. Deploy Front Door (requires WAF Policy ID and Static Web App hostnames)
WAF_POLICY_ID=$(az deployment group show \
  --resource-group rg-ctn-asr-dev \
  --name waf-policy-deployment \
  --query properties.outputs.wafPolicyId.value -o tsv)

ADMIN_HOSTNAME=$(az staticwebapp show \
  --name stapp-ctn-demo-asr-dev \
  --query defaultHostname -o tsv)

MEMBER_HOSTNAME=$(az staticwebapp show \
  --name ctn-member-portal \
  --query defaultHostname -o tsv)

az deployment group create \
  --resource-group rg-ctn-asr-dev \
  --template-file infrastructure/bicep/modules/front-door.bicep \
  --parameters environment=dev \
  --parameters resourcePrefix=ctn-asr \
  --parameters wafPolicyId=$WAF_POLICY_ID \
  --parameters adminPortalHostname=$ADMIN_HOSTNAME \
  --parameters memberPortalHostname=$MEMBER_HOSTNAME
```

## Configuration

### WAF Policy Settings

**File:** `infrastructure/bicep/modules/waf-policy.bicep`

#### Policy Mode

```bicep
mode: isProd ? 'Prevention' : 'Detection'
```

- **Detection Mode (dev)**: Logs threats, allows traffic
- **Prevention Mode (prod)**: Blocks threats

#### Rate Limiting

```bicep
{
  name: 'RateLimitRule'
  rateLimitThreshold: 100        // requests
  rateLimitDurationInMinutes: 1  // per minute
  action: 'Block'
}
```

#### Geo-Restriction

```bicep
{
  name: 'GeoRestriction'
  matchValue: ['NL', 'BE', 'DE', 'FR', 'GB', 'US']
  negateCondition: true  // Block all EXCEPT these countries
  action: isProd ? 'Block' : 'Log'
  enabledState: isProd ? 'Enabled' : 'Disabled'
}
```

**Note:** Only enforced in production environment.

#### Managed Rule Sets

1. **Microsoft_DefaultRuleSet 2.1**
   - OWASP CRS-based rules
   - SQL injection, XSS, RCE, etc.
   - Action: Block

2. **Microsoft_BotManagerRuleSet 1.0**
   - Bad bot detection
   - Good bot allowlist
   - Action: Block

### Front Door Settings

**File:** `infrastructure/bicep/modules/front-door.bicep`

#### Origin Configuration

```bicep
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
```

#### Health Probes

```bicep
healthProbeSettings: {
  probePath: '/'
  probeRequestType: 'GET'
  probeProtocol: 'Https'
  probeIntervalInSeconds: 100
}
```

#### Load Balancing

```bicep
loadBalancingSettings: {
  sampleSize: 4
  successfulSamplesRequired: 3
  additionalLatencyInMilliseconds: 50
}
```

#### HTTPS Enforcement

```bicep
properties: {
  supportedProtocols: ['Https']     // HTTPS only
  forwardingProtocol: 'HttpsOnly'   // Always forward as HTTPS
  httpsRedirect: 'Enabled'          // Redirect HTTP → HTTPS
}
```

## Custom Domains (Production)

### Prerequisites

1. Domain ownership verification
2. DNS management access
3. SSL certificate (managed by Azure)

### Setup Steps

1. **Add Custom Domain to Front Door**

```bash
# Admin Portal
az afd custom-domain create \
  --profile-name fd-ctn-asr-prod \
  --custom-domain-name admin-ctn-nl \
  --resource-group rg-ctn-asr-prod \
  --host-name admin.ctn.nl \
  --minimum-tls-version TLS12

# Member Portal
az afd custom-domain create \
  --profile-name fd-ctn-asr-prod \
  --custom-domain-name portal-ctn-nl \
  --resource-group rg-ctn-asr-prod \
  --host-name portal.ctn.nl \
  --minimum-tls-version TLS12
```

2. **Create DNS CNAME Records**

```
admin.ctn.nl    CNAME   admin-ctn-asr-prod.z01.azurefd.net
portal.ctn.nl   CNAME   portal-ctn-asr-prod.z01.azurefd.net
```

3. **Enable Managed Certificate**

```bash
az afd custom-domain update \
  --profile-name fd-ctn-asr-prod \
  --custom-domain-name admin-ctn-nl \
  --resource-group rg-ctn-asr-prod \
  --certificate-type ManagedCertificate
```

4. **Associate Domain with Route**

```bash
az afd route update \
  --profile-name fd-ctn-asr-prod \
  --endpoint-name admin-ctn-asr-prod \
  --route-name admin-portal-route \
  --resource-group rg-ctn-asr-prod \
  --custom-domains admin-ctn-nl
```

## Monitoring

### Key Metrics to Monitor

1. **Request Count** - Total requests per endpoint
2. **Error Rate** - 4xx/5xx response codes
3. **Latency** - Response time at edge
4. **WAF Blocks** - Threats blocked by WAF
5. **Origin Health** - Backend availability

### Azure Monitor Queries

#### WAF Blocks by Rule

```kql
AzureDiagnostics
| where ResourceType == "FRONTDOORWEBAPPLICATIONFIREWALLPOLICIES"
| where action_s == "Block"
| summarize count() by ruleName_s
| order by count_ desc
```

#### Top Blocked IPs

```kql
AzureDiagnostics
| where ResourceType == "FRONTDOORWEBAPPLICATIONFIREWALLPOLICIES"
| where action_s == "Block"
| summarize count() by clientIP_s
| order by count_ desc
| take 10
```

#### Request Latency P95

```kql
AzureDiagnostics
| where ResourceType == "FRONTDOOR"
| summarize percentile(timeTaken_d, 95) by bin(TimeGenerated, 5m)
| render timechart
```

### Alerts

Recommended alerts:

1. **High Error Rate**: > 5% 5xx errors in 5 minutes
2. **WAF Attack Surge**: > 100 blocks in 1 minute
3. **Origin Unhealthy**: Health probe failures
4. **High Latency**: P95 latency > 2 seconds

## Troubleshooting

### Issue: 403 Forbidden

**Possible Causes:**
1. WAF blocking legitimate traffic
2. Geo-restriction blocking user's country
3. Rate limit exceeded

**Solution:**
```bash
# Check WAF logs
az monitor diagnostic-settings list \
  --resource waf-ctn-asr-dev \
  --resource-type Microsoft.Network/FrontDoorWebApplicationFirewallPolicies

# Temporarily switch to Detection mode for testing
az network front-door waf-policy update \
  --name waf-ctn-asr-dev \
  --resource-group rg-ctn-asr-dev \
  --mode Detection
```

### Issue: Origin Unreachable

**Possible Causes:**
1. Static Web App down
2. Origin hostname incorrect
3. Certificate validation failure

**Solution:**
```bash
# Check origin health
az afd origin show \
  --profile-name fd-ctn-asr-dev \
  --origin-group-name admin-portal-origin-group \
  --origin-name admin-portal-origin \
  --resource-group rg-ctn-asr-dev

# Test origin directly
curl -I https://calm-tree-03352ba03.1.azurestaticapps.net
```

### Issue: Slow Performance

**Possible Causes:**
1. Cache not configured properly
2. Origin response time slow
3. TLS handshake overhead

**Solution:**
```bash
# Check cache statistics
az monitor metrics list \
  --resource fd-ctn-asr-dev \
  --resource-type Microsoft.Cdn/profiles \
  --metric CacheHitRatio

# Enable query string caching
az afd route update \
  --profile-name fd-ctn-asr-dev \
  --endpoint-name admin-ctn-asr-dev \
  --route-name admin-portal-route \
  --query-string-caching-behavior IgnoreQueryString
```

## Security Best Practices

1. **Always Use Prevention Mode in Production**
   - Detection mode logs but doesn't block
   - Only use Detection for testing/debugging

2. **Monitor WAF Logs Regularly**
   - Review blocked requests
   - Identify false positives
   - Tune custom rules

3. **Keep Managed Rule Sets Updated**
   - Azure automatically updates rule sets
   - Review change logs for new rules

4. **Use Geo-Restriction Wisely**
   - Only block countries if necessary
   - Consider legitimate international users
   - Azure AD auth may require US endpoints

5. **Test Rate Limits**
   - Ensure legitimate traffic isn't blocked
   - Consider API usage patterns
   - Adjust thresholds based on metrics

6. **Enable HTTPS Only**
   - Enforce HTTPS at Front Door level
   - Redirect HTTP → HTTPS automatically
   - Use TLS 1.2 minimum

7. **Review Custom Domain Setup**
   - Verify domain ownership
   - Use managed certificates
   - Monitor certificate expiration

## Cost Optimization

### SKU Selection

- **Standard** (dev/staging):
  - Basic WAF features
  - Standard managed rules
  - Cost: ~$35/month base + usage

- **Premium** (production):
  - Advanced WAF features
  - Private Link support
  - Bot protection
  - Cost: ~$330/month base + usage

### Usage Charges

- **Data Transfer**: $0.05/GB (first 10TB)
- **Requests**: $0.0075 per 10,000 requests
- **WAF Requests**: $0.00025 per request

### Cost Saving Tips

1. Enable caching to reduce origin requests
2. Use Standard SKU for non-production
3. Set appropriate cache TTLs
4. Monitor and optimize request patterns

## References

- [Azure Front Door Documentation](https://learn.microsoft.com/en-us/azure/frontdoor/)
- [Azure WAF on Front Door](https://learn.microsoft.com/en-us/azure/web-application-firewall/afds/afds-overview)
- [OWASP CRS Documentation](https://coreruleset.org/)
- [Azure DDoS Protection](https://learn.microsoft.com/en-us/azure/ddos-protection/)

## Support

For issues or questions:
1. Check Azure Monitor logs
2. Review this documentation
3. Contact Azure Support
4. Consult CLAUDE.md for project-specific guidance
