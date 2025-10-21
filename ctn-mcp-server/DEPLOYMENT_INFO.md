# CTN MCP Server - Deployment Information

**Deployment Date:** October 21, 2025
**Environment:** Production

## Azure Resources

### Resource Group
- **Name:** `rg-ctn-mcp-prod`
- **Location:** West Europe
- **Subscription:** Azure-abonnement 1 (add6a89c-7fb9-4f8a-9d63-7611a617430e)

### Container Registry
- **Name:** `acrctnmcp`
- **Login Server:** `acrctnmcp.azurecr.io`
- **SKU:** Basic
- **Admin Enabled:** Yes

### Container Apps Environment
- **Name:** `cae-ctn-mcp-prod`
- **Default Domain:** `happyocean-bb29b9ec.westeurope.azurecontainerapps.io`
- **Workload Profile:** Consumption

### Container App
- **Name:** `ca-ctn-mcp-server`
- **URL:** `https://ca-ctn-mcp-server.happyocean-bb29b9ec.westeurope.azurecontainerapps.io`
- **Image:** `acrctnmcp.azurecr.io/ctn-mcp-server:latest`
- **CPU:** 0.25 vCPU
- **Memory:** 0.5 Gi
- **Min Replicas:** 0 (scale to zero)
- **Max Replicas:** 1
- **Target Port:** 3000
- **Ingress:** External

## Environment Variables

```
DOCUMENTATION_URL=https://delightful-desert-0e783ed03.1.azurestaticapps.net
REFRESH_API_KEY=l6rwSukIO+1xBMCPN4Wzij215EaARnyiZjhRV8y4/Aw=
MCP_TRANSPORT=http
NODE_ENV=production
REFRESH_SCHEDULE=0 2 * * *
PORT=3000
```

## API Key (CONFIDENTIAL)

**Refresh API Key:** `l6rwSukIO+1xBMCPN4Wzij215EaARnyiZjhRV8y4/Aw=`

⚠️ **IMPORTANT**: This API key is used to trigger documentation refresh from Azure DevOps pipelines.
Store this securely in Azure DevOps pipeline variables as a secret.

## MCP Server Endpoints

- **Root:** `https://ca-ctn-mcp-server.happyocean-bb29b9ec.westeurope.azurecontainerapps.io/`
- **Health:** `https://ca-ctn-mcp-server.happyocean-bb29b9ec.westeurope.azurecontainerapps.io/health`
- **Refresh:** `POST https://ca-ctn-mcp-server.happyocean-bb29b9ec.westeurope.azurecontainerapps.io/refresh`
  - Requires: `X-API-Key` header with the API key above
- **MCP SSE:** `https://ca-ctn-mcp-server.happyocean-bb29b9ec.westeurope.azurecontainerapps.io/mcp/sse`
- **MCP Message:** `POST https://ca-ctn-mcp-server.happyocean-bb29b9ec.westeurope.azurecontainerapps.io/mcp/message`

## Initial Deployment Stats

- **Documentation Pages Loaded:** 59
- **Memory Usage:** 0.28 MB
- **First Refresh Completed:** 2025-10-21T04:41:16.641Z
- **Status:** ✅ Healthy

## Claude Desktop Configuration

Team members should add this to their `claude_desktop_config.json`:

```json
{
  "mcpServers": {
    "ctn-documentation": {
      "url": "https://ca-ctn-mcp-server.happyocean-bb29b9ec.westeurope.azurecontainerapps.io/mcp/sse",
      "transport": "sse"
    }
  }
}
```

## Azure DevOps Pipeline Variables

Add these variables to documentation deployment pipelines:

- **MCP_SERVER_URL:** `ca-ctn-mcp-server.happyocean-bb29b9ec.westeurope.azurecontainerapps.io`
- **MCP_API_KEY:** `l6rwSukIO+1xBMCPN4Wzij215EaARnyiZjhRV8y4/Aw=` (mark as secret)

## Management Commands

### View Logs
```bash
az containerapp logs show \
  --name ca-ctn-mcp-server \
  --resource-group rg-ctn-mcp-prod \
  --tail 100 \
  --follow
```

### Update Container Image
```bash
# Rebuild and push new image
cd /Users/ramondenoronha/Dev/DIL/ASR-full/ctn-mcp-server
az acr build \
  --registry acrctnmcp \
  --image ctn-mcp-server:latest \
  --file Dockerfile \
  .

# Update container app
az containerapp update \
  --name ca-ctn-mcp-server \
  --resource-group rg-ctn-mcp-prod \
  --image acrctnmcp.azurecr.io/ctn-mcp-server:latest
```

### Trigger Manual Refresh
```bash
curl -X POST https://ca-ctn-mcp-server.happyocean-bb29b9ec.westeurope.azurecontainerapps.io/refresh \
  -H "X-API-Key: l6rwSukIO+1xBMCPN4Wzij215EaARnyiZjhRV8y4/Aw="
```

### Check Health
```bash
curl https://ca-ctn-mcp-server.happyocean-bb29b9ec.westeurope.azurecontainerapps.io/health
```

## Cost Optimization

- **Scale to Zero:** Container scales to 0 instances after 5 minutes of inactivity (default cooldown)
- **Cold Start:** First request after idle takes 5-10 seconds (container wakes up)
- **Warm Response:** Subsequent requests are fast (<100ms)
- **Estimated Monthly Cost:** €7-10 for 5 non-concurrent users

## Security Notes

1. API key is stored as a secret in Container Apps
2. HTTPS only (enforced by Azure Container Apps)
3. Container runs as non-root user (nodejs:nodejs)
4. No secrets logged to console
5. Input validation on all endpoints

## Next Steps

1. ✅ Add API key to Azure DevOps pipeline variables
2. ✅ Share HowTo guide with team members
3. ✅ Update documentation deployment pipeline to trigger refresh
4. ⏳ Monitor usage and costs in first month
5. ⏳ Consider adding additional API keys for team members if needed

## Support

- **Health Check:** https://ca-ctn-mcp-server.happyocean-bb29b9ec.westeurope.azurecontainerapps.io/health
- **Logs:** Use Azure CLI commands above
- **Issues:** Contact DevOps team

---

**Last Updated:** October 21, 2025
