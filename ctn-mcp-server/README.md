# CTN MCP Server

Model Context Protocol (MCP) server for serving CTN documentation to AI tools like Claude Desktop.

## Overview

This server fetches and indexes CTN documentation from the Static Web App, then serves it via the Model Context Protocol. It enables AI assistants to access up-to-date CTN documentation for answering questions and providing guidance.

### Features

- **MCP Protocol**: Full implementation of Model Context Protocol
- **Documentation Indexing**: Automatic crawling and parsing of documentation
- **Search Capability**: Fast full-text search across all documentation
- **Refresh Endpoint**: HTTP endpoint for pipeline integration
- **Scheduled Refresh**: Automatic daily documentation updates
- **Cost Optimized**: Designed for minimal Azure costs (scale to zero)
- **Dual Transport**: Supports stdio (local) and HTTP/SSE (Azure) modes

## Cost Analysis

### Estimated Monthly Costs (5 Non-Concurrent Users)

| Resource | Specification | Monthly Cost (EUR) |
|----------|--------------|-------------------|
| Azure Container Apps | Consumption plan, 0.25 vCPU, 0.5 GB RAM, ~10 hours active/month | €2-5 |
| Container Registry | Basic tier, ~50 MB image | €4.23 |
| Bandwidth | Minimal (documentation refresh + API calls) | <€1 |
| **Total** | | **~€7-10/month** |

### Cost Optimization Features

1. **Scale to Zero**: Container scales to 0 instances when not in use (5 min idle timeout)
2. **Minimal Resources**: 0.25 vCPU, 0.5 GB RAM (smallest available)
3. **Consumption Plan**: Pay only for actual usage, not reserved capacity
4. **Small Image**: Alpine-based Docker image (~30-50 MB)
5. **Efficient Caching**: In-memory cache with 128 MB limit
6. **No Premium Services**: No Application Insights, premium storage, etc.

### Usage Pattern (Cost Estimate)

- 5 team members, non-concurrent usage
- Average 2 hours/day active time = ~40 hours/month
- Cold start: 5-10 seconds (acceptable trade-off for cost)
- Warm response: <100ms

## Quick Start

### Local Development (stdio mode)

1. Install dependencies:
```bash
npm install
```

2. Set environment variables:
```bash
export DOCUMENTATION_URL="https://delightful-desert-0e783ed03.1.azurestaticapps.net"
export MCP_TRANSPORT="stdio"
```

3. Run server:
```bash
npm run dev
```

### Production (HTTP mode)

1. Set environment variables:
```bash
export DOCUMENTATION_URL="https://delightful-desert-0e783ed03.1.azurestaticapps.net"
export REFRESH_API_KEY="your-secure-api-key-here"
export MCP_TRANSPORT="http"
export PORT="3000"
export NODE_ENV="production"
```

2. Run server:
```bash
npm run prod
```

## Azure Container Apps Deployment

### Prerequisites

- Azure CLI installed and configured
- Docker installed (for building images)
- Azure Container Registry (or Docker Hub)

### Step 1: Create Azure Resources

```bash
# Variables
RESOURCE_GROUP="rg-ctn-mcp"
LOCATION="westeurope"
ACR_NAME="acrctnmcp"
CONTAINER_APP_NAME="ca-ctn-mcp-server"
CONTAINER_ENV_NAME="cae-ctn-mcp"

# Create resource group
az group create \
  --name $RESOURCE_GROUP \
  --location $LOCATION

# Create container registry (Basic tier for cost optimization)
az acr create \
  --resource-group $RESOURCE_GROUP \
  --name $ACR_NAME \
  --sku Basic \
  --admin-enabled true

# Create Container Apps environment (Consumption plan)
az containerapp env create \
  --name $CONTAINER_ENV_NAME \
  --resource-group $RESOURCE_GROUP \
  --location $LOCATION
```

### Step 2: Build and Push Docker Image

```bash
# Build image
docker build -t ctn-mcp-server:latest .

# Tag for ACR
docker tag ctn-mcp-server:latest $ACR_NAME.azurecr.io/ctn-mcp-server:latest

# Login to ACR
az acr login --name $ACR_NAME

# Push image
docker push $ACR_NAME.azurecr.io/ctn-mcp-server:latest
```

### Step 3: Deploy Container App

```bash
# Generate secure API key
API_KEY=$(openssl rand -base64 32)

# Get ACR credentials
ACR_PASSWORD=$(az acr credential show --name $ACR_NAME --query "passwords[0].value" -o tsv)

# Create container app with cost-optimized settings
az containerapp create \
  --name $CONTAINER_APP_NAME \
  --resource-group $RESOURCE_GROUP \
  --environment $CONTAINER_ENV_NAME \
  --image $ACR_NAME.azurecr.io/ctn-mcp-server:latest \
  --registry-server $ACR_NAME.azurecr.io \
  --registry-username $ACR_NAME \
  --registry-password $ACR_PASSWORD \
  --target-port 3000 \
  --ingress external \
  --min-replicas 0 \
  --max-replicas 1 \
  --cpu 0.25 \
  --memory 0.5Gi \
  --env-vars \
    DOCUMENTATION_URL="https://delightful-desert-0e783ed03.1.azurestaticapps.net" \
    REFRESH_API_KEY="$API_KEY" \
    MCP_TRANSPORT="http" \
    NODE_ENV="production" \
    REFRESH_SCHEDULE="0 2 * * *" \
  --scale-rule-name "http-scale" \
  --scale-rule-type "http" \
  --scale-rule-http-concurrency 10

# Save API key for later use
echo "REFRESH_API_KEY: $API_KEY" > .api-key.txt
echo "Container App URL: https://$(az containerapp show --name $CONTAINER_APP_NAME --resource-group $RESOURCE_GROUP --query properties.configuration.ingress.fqdn -o tsv)"
```

### Step 4: Verify Deployment

```bash
# Get app URL
APP_URL=$(az containerapp show \
  --name $CONTAINER_APP_NAME \
  --resource-group $RESOURCE_GROUP \
  --query properties.configuration.ingress.fqdn -o tsv)

# Test health endpoint
curl https://$APP_URL/health

# Test refresh endpoint
curl -X POST https://$APP_URL/refresh \
  -H "X-API-Key: $API_KEY"
```

### Step 5: Configure Claude Desktop

Add to your Claude Desktop MCP configuration (`~/Library/Application Support/Claude/claude_desktop_config.json` on Mac):

```json
{
  "mcpServers": {
    "ctn-documentation": {
      "url": "https://YOUR_APP_URL/mcp/sse",
      "transport": "sse"
    }
  }
}
```

**Note**: When you first connect, expect a 5-10 second delay (cold start) if the container scaled to zero. This is normal and saves costs.

## Azure DevOps Pipeline Integration

### Example Pipeline Task

Add this task to your documentation pipeline to trigger refresh after deployment:

```yaml
- task: Bash@3
  displayName: 'Refresh MCP Server Documentation'
  inputs:
    targetType: 'inline'
    script: |
      curl -X POST https://$(MCP_SERVER_URL)/refresh \
        -H "X-API-Key: $(MCP_API_KEY)" \
        -f -s -S
  continueOnError: true
```

### Pipeline Variables

Add these variables to your pipeline (mark `MCP_API_KEY` as secret):

- `MCP_SERVER_URL`: Your Container App URL (e.g., `ca-ctn-mcp-server.kindwave-a1b2c3d4.westeurope.azurecontainerapps.io`)
- `MCP_API_KEY`: API key from deployment step

## Configuration Reference

### Environment Variables

| Variable | Required | Default | Description |
|----------|----------|---------|-------------|
| `DOCUMENTATION_URL` | Yes | - | URL of documentation Static Web App |
| `REFRESH_API_KEY` | Yes (prod) | - | API key(s) for refresh endpoint (comma-separated) |
| `PORT` | No | `3000` | Server port |
| `MCP_TRANSPORT` | No | `http` | Transport mode: `stdio` or `http` |
| `NODE_ENV` | No | `development` | Node environment: `development` or `production` |
| `REFRESH_SCHEDULE` | No | `0 2 * * *` | Cron expression for scheduled refresh (2 AM UTC daily) |
| `ENABLE_SCHEDULED_REFRESH` | No | `true` | Enable scheduled refresh |
| `LOG_LEVEL` | No | `info` | Logging level: `debug`, `info`, `warn`, `error` |
| `CACHE_MAX_SIZE_MB` | No | `128` | Maximum cache size in MB |
| `REFRESH_TIMEOUT_MS` | No | `30000` | Documentation refresh timeout in milliseconds |

### API Endpoints

| Endpoint | Method | Description | Auth |
|----------|--------|-------------|------|
| `/` | GET | Server info and stats | None |
| `/health` | GET | Health check | None |
| `/refresh` | POST | Trigger documentation refresh | X-API-Key header |
| `/mcp/sse` | GET | MCP SSE connection endpoint | None |
| `/mcp/message` | POST | MCP message endpoint | None |

### MCP Tools

| Tool | Description | Parameters |
|------|-------------|------------|
| `search_documentation` | Search across all documentation | `query` (required), `maxResults` (optional) |
| `get_page` | Get specific documentation page | `path` or `title` (one required) |
| `list_topics` | List all documentation topics | None |

### MCP Resources

| Resource | Description |
|----------|-------------|
| `ctn-doc://<path>` | Individual documentation pages |

## Troubleshooting

### Cold Start Delays

**Symptom**: First connection takes 5-10 seconds

**Cause**: Container Apps scale to zero when idle (cost optimization)

**Solution**: This is normal and expected. Subsequent requests will be fast (~100ms) while container is warm.

### Refresh Fails

**Symptom**: 401 Unauthorized on `/refresh` endpoint

**Solution**:
- Check `X-API-Key` header is set
- Verify API key matches `REFRESH_API_KEY` environment variable
- For multiple keys, ensure comma-separated in environment variable

### Documentation Not Loading

**Symptom**: Empty results from MCP tools

**Solution**:
1. Check health endpoint: `GET /health` - should show `lastRefresh` timestamp
2. Manually trigger refresh: `POST /refresh` with API key
3. Check logs for errors during crawl
4. Verify `DOCUMENTATION_URL` is accessible

### High Memory Usage

**Symptom**: Container restarts or out-of-memory errors

**Solution**:
- Reduce `CACHE_MAX_SIZE_MB` environment variable
- Check documentation size - may need to increase container memory
- Increase memory allocation: `--memory 1.0Gi` (will increase costs)

### MCP Connection Issues

**Symptom**: Claude Desktop can't connect to server

**Solution**:
1. Verify Container App URL is correct and accessible
2. Check ingress is set to `external`
3. Test SSE endpoint: `curl https://YOUR_APP_URL/mcp/sse`
4. Check Claude Desktop logs for connection errors

## Security Considerations

1. **API Keys**: Store `REFRESH_API_KEY` in Azure Key Vault or pipeline secrets
2. **HTTPS Only**: Always use HTTPS in production (enforced by Container Apps)
3. **Non-Root User**: Container runs as user `nodejs` (UID 1001)
4. **No Secrets in Logs**: Sensitive data is never logged
5. **Input Validation**: All user inputs are validated before processing

## Monitoring

### Basic Monitoring (No Cost)

```bash
# View logs
az containerapp logs show \
  --name $CONTAINER_APP_NAME \
  --resource-group $RESOURCE_GROUP \
  --tail 100 \
  --follow

# View metrics
az monitor metrics list \
  --resource $(az containerapp show --name $CONTAINER_APP_NAME --resource-group $RESOURCE_GROUP --query id -o tsv) \
  --metric Requests
```

### Optional: Application Insights

If you have Application Insights already:

```bash
# Add Application Insights connection string
az containerapp update \
  --name $CONTAINER_APP_NAME \
  --resource-group $RESOURCE_GROUP \
  --set-env-vars APPLICATIONINSIGHTS_CONNECTION_STRING="InstrumentationKey=..."
```

## Maintenance

### Update Documentation

Trigger manual refresh:
```bash
curl -X POST https://YOUR_APP_URL/refresh \
  -H "X-API-Key: YOUR_API_KEY"
```

### Update Container Image

```bash
# Build and push new image
docker build -t ctn-mcp-server:latest .
docker tag ctn-mcp-server:latest $ACR_NAME.azurecr.io/ctn-mcp-server:latest
docker push $ACR_NAME.azurecr.io/ctn-mcp-server:latest

# Update container app
az containerapp update \
  --name $CONTAINER_APP_NAME \
  --resource-group $RESOURCE_GROUP \
  --image $ACR_NAME.azurecr.io/ctn-mcp-server:latest
```

### Add Team Member API Keys

```bash
# Generate new API key
NEW_KEY=$(openssl rand -base64 32)

# Get current keys
CURRENT_KEYS=$(az containerapp show \
  --name $CONTAINER_APP_NAME \
  --resource-group $RESOURCE_GROUP \
  --query "properties.template.containers[0].env[?name=='REFRESH_API_KEY'].value" -o tsv)

# Update with comma-separated keys
az containerapp update \
  --name $CONTAINER_APP_NAME \
  --resource-group $RESOURCE_GROUP \
  --set-env-vars REFRESH_API_KEY="$CURRENT_KEYS,$NEW_KEY"

echo "New API key: $NEW_KEY"
```

## Project Structure

```
ctn-mcp-server/
├── src/
│   ├── index.js                 # Main server entry point
│   ├── config.js                # Configuration management
│   ├── documentation-loader.js  # Documentation fetching and indexing
│   ├── mcp-server.js           # MCP protocol implementation
│   ├── refresh-endpoint.js     # HTTP refresh endpoint
│   └── scheduler.js            # Scheduled refresh
├── Dockerfile                   # Multi-stage production Dockerfile
├── .dockerignore               # Docker build exclusions
├── .gitignore                  # Git exclusions
├── package.json                # Node.js dependencies
└── README.md                   # This file
```

## Development

### Running Tests

```bash
npm test
```

### Local Testing with Claude Desktop

1. Run server in stdio mode:
```bash
npm run dev
```

2. Configure Claude Desktop to use local server:
```json
{
  "mcpServers": {
    "ctn-documentation": {
      "command": "node",
      "args": ["/absolute/path/to/ctn-mcp-server/src/index.js"],
      "env": {
        "DOCUMENTATION_URL": "https://delightful-desert-0e783ed03.1.azurestaticapps.net",
        "MCP_TRANSPORT": "stdio"
      }
    }
  }
}
```

3. Restart Claude Desktop

## Support

For issues or questions:
- Check troubleshooting section above
- Review logs: `az containerapp logs show ...`
- Contact CTN DevOps team

## License

MIT
