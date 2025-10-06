# CTN Demo ASR - Association Register

Association Register demonstration for the Connected Trade Network initiative.

## Project Structure

```
ASR/
├── .azure-pipelines/       # CI/CD pipeline definitions
│   └── terraform.yml       # Infrastructure deployment pipeline
├── backend/                # Azure Functions (Node.js/TypeScript)
│   ├── src/               # Function source code
│   └── tests/             # Unit tests
├── frontend/              # React Static Web App
│   ├── src/               # React components
│   └── public/            # Static assets
├── infrastructure/        # Terraform IaC
│   ├── main.tf           # Main infrastructure
│   ├── variables.tf      # Variable definitions
│   ├── outputs.tf        # Output values
│   └── runbooks/         # PowerShell automation scripts
└── docs/                 # Documentation
```

## Infrastructure Components

### Azure Resources

- **Resource Group**: `rg-ctn-demo-asr-dev`
- **Function App**: API endpoints (Node.js 20)
- **Static Web App**: Member portal (React)
- **PostgreSQL**: Flexible Server B1ms (member data)
- **Storage Account**: Documents and function packages
- **Key Vault**: Secrets management
- **Application Insights**: Monitoring and logging
- **Automation Account**: Auto-shutdown scheduling

### Cost Optimization

- PostgreSQL auto-shutdown: Weekdays 17:00-09:00, all weekend
- Function App: Consumption plan (auto-scales to zero)
- Static Web App: Free tier
- Estimated monthly cost: **€17-22**

## Deployment

### Prerequisites

- Azure CLI installed
- Terraform installed
- Azure DevOps project configured
- Service connection: `azure-ctn-demo`
- Variable group: `ctn-demo-variables`

### Deploy Infrastructure

```bash
# Navigate to infrastructure directory
cd infrastructure

# Initialize Terraform
terraform init

# Plan deployment
terraform plan -out=tfplan

# Apply deployment
terraform apply tfplan
```

Or use Azure DevOps pipeline:
- Push to `main` branch
- Pipeline automatically validates and deploys

## Auto-Shutdown Schedule

Database automatically stops/starts to minimize costs:

**Weekdays (Mon-Fri):**
- Start: 09:00 CET
- Stop: 17:00 CET
- Running: 8 hours/day

**Weekends:**
- Stopped all day

**Monthly running time:** ~160 hours vs. 720 hours (78% cost reduction)

## Manual Database Control

```bash
# Stop database
az postgres flexible-server stop \
  --resource-group rg-ctn-demo-asr-dev \
  --name psql-ctn-demo-asr-dev

# Start database
az postgres flexible-server start \
  --resource-group rg-ctn-demo-asr-dev \
  --name psql-ctn-demo-asr-dev

# Check status
az postgres flexible-server show \
  --resource-group rg-ctn-demo-asr-dev \
  --name psql-ctn-demo-asr-dev \
  --query state -o tsv
```

## Development

### Backend (Azure Functions)

```bash
cd backend
npm install
npm run dev
```

### Frontend (React)

```bash
cd frontend
npm install
npm run dev
```

## Environment Variables

Stored in Azure DevOps Variable Group: `ctn-demo-variables`

Key variables:
- `AZURE_SUBSCRIPTION_ID`
- `AZURE_LOCATION`
- `PROJECT_PREFIX`
- `ENVIRONMENT`
- `TF_STATE_*` variables

## Documentation

- [Architecture Overview](docs/ARCHITECTURE.md)
- [API Documentation](docs/API.md)
- [Deployment Guide](docs/DEPLOYMENT.md)

## Support

For issues or questions, contact: Ramon de Noronha
