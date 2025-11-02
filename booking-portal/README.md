# CTN Booking Document Processing Portal
**Auto-trigger test - October 30, 2025**

Multi-tenant SaaS portal for processing multimodal transport booking documents using AI extraction and human validation.

## Overview

The CTN Booking Portal processes PDF/email/Excel booking documents from inland terminals, extracts data using Azure AI Document Intelligence, enables human validation, and learns from corrections to improve future processing.

## Architecture

### Frontend
- **Technology**: React 18 + TypeScript + Vite
- **UI Framework**: Mantine v8 + mantine-datatable
- **Styling**: CTN brand colors (Dark Blue #1a4d6d, Orange #ff8c00, Light Blue #00a3e0)
- **Authentication**: Azure AD B2B (External Identities)
- **Deployment**: Azure Static Web Apps

### Backend
- **Technology**: Azure Functions (.NET 8 C#)
- **Database**: Azure Cosmos DB NoSQL (dedicated instance)
- **Storage**: Azure Blob Storage (tenant-isolated containers)
- **AI**: Azure AI Document Intelligence (custom models)
- **Authentication**: Azure AD JWT validation

### Infrastructure
- **IaC**: Bicep templates (parameterized for SaaS vs self-hosted)
- **CI/CD**: Azure DevOps / GitHub Actions
- **Monitoring**: Azure Application Insights

## Multi-Tenancy Model

### Tenant Hierarchy
```
Organization (ITG, ITV, Contargo)
  └─ Terminals (ITG Hengelo, ITG Amsterdam)
      └─ Users (Planners) - 5-10 per terminal
```

### Data Isolation
- **Cosmos DB**: Partition key `/tenantId` (format: `organizationId-terminalId`)
- **Blob Storage**: Container per tenant (`documents-itg-hengelo`)
- **Azure AD B2B**: Guest users with claims-based tenant assignment

## Project Structure

```
booking-portal/
├── web/                    # React frontend
│   ├── src/
│   │   ├── components/    # React components
│   │   ├── pages/        # Page components
│   │   ├── services/     # API clients
│   │   ├── auth/         # Authentication
│   │   ├── hooks/        # Custom hooks
│   │   └── styles/       # Global styles
│   ├── public/           # Static assets
│   └── package.json
│
├── api/                    # Azure Functions backend
│   ├── Functions/         # HTTP-triggered functions
│   ├── Services/          # Business logic
│   ├── Models/            # Data models
│   ├── Repositories/      # Cosmos DB repositories
│   └── BookingApi.csproj
│
├── infrastructure/         # Bicep templates
│   ├── main.bicep         # Main template
│   ├── modules/           # Module templates
│   └── parameters/        # Environment parameters
│
└── docs/                   # Documentation
    ├── deployment.md
    ├── user-guide.md
    └── api-reference.md
```

## Getting Started

### Prerequisites
- Node.js 20+
- .NET 8 SDK
- Azure CLI
- Azure subscription

### Local Development

#### Frontend
```bash
cd web
npm install
npm run dev
```

#### Backend
```bash
cd api
dotnet restore
func start
```

### Deployment

#### SaaS Mode (Centralized)
```bash
cd infrastructure
az deployment sub create \
  --location westeurope \
  --template-file main.bicep \
  --parameters mode=saas environment=prod
```

#### Self-Hosted Mode
```bash
cd infrastructure
az deployment sub create \
  --location westeurope \
  --template-file main.bicep \
  --parameters mode=self-hosted tenantId=itg-hengelo
```

## Features

### Phase 1: MVP (Complete)
- ✅ Document upload (PDF, email, Excel)
- ✅ AI extraction with Azure Document Intelligence
- ✅ Human validation UI with side-by-side viewer
- ✅ DCSA-Plus data format
- ✅ Cosmos DB storage with tenant isolation

### Phase 2: Multi-Tenancy (Complete)
- ✅ Azure AD B2B authentication
- ✅ Tenant configuration management
- ✅ Multi-tenant data isolation
- ✅ Role-based access control

### Phase 3: Learning Loop (In Progress)
- ⏳ Correction analytics
- ⏳ Model retraining pipeline
- ⏳ Confidence threshold tuning

### Phase 4: Orchestration Integration (Planned)
- ⏳ Transform to orchestration format
- ⏳ Export to orchestration register
- ⏳ Status synchronization

## API Endpoints

### Documents
- `POST /api/v1/documents` - Upload document
- `GET /api/v1/documents` - List documents (tenant-scoped)
- `GET /api/v1/documents/{id}` - Get document details
- `DELETE /api/v1/documents/{id}` - Delete document

### Bookings
- `POST /api/v1/bookings` - Create booking
- `GET /api/v1/bookings` - List bookings (tenant-scoped)
- `GET /api/v1/bookings/{id}` - Get booking details
- `PUT /api/v1/bookings/{id}` - Update booking
- `POST /api/v1/bookings/{id}/validate` - Submit validation

### Tenants (Admin Only)
- `POST /api/v1/tenants` - Create tenant
- `GET /api/v1/tenants` - List tenants
- `GET /api/v1/tenants/{id}` - Get tenant details
- `PUT /api/v1/tenants/{id}` - Update tenant settings

## Database Schema

### Cosmos DB Containers

#### `bookings`
- Partition key: `/tenantId`
- Contains: Complete booking documents with DCSA-Plus data
- Indexes: containerNumber, carrierBookingReference, uploadTimestamp

#### `tenant-config`
- Partition key: `/tenantId`
- Contains: Tenant settings, subscription info, feature flags

#### `validation-history`
- Partition key: `/tenantId`
- Contains: Validation records, corrections, learning data

## Environment Variables

### Frontend (.env)
```
VITE_API_BASE_URL=https://func-ctn-booking-prod.azurewebsites.net/api/v1
VITE_AZURE_CLIENT_ID=<client-id>
VITE_AZURE_TENANT_ID=<tenant-id>
VITE_AZURE_REDIRECT_URI=https://booking.ctninland.com
```

### Backend (local.settings.json)
```json
{
  "Values": {
    "AzureWebJobsStorage": "<storage-connection>",
    "COSMOS_DB_ENDPOINT": "<cosmos-endpoint>",
    "COSMOS_DB_KEY": "@Microsoft.KeyVault(...)",
    "DOCUMENT_INTELLIGENCE_ENDPOINT": "<doc-intel-endpoint>",
    "DOCUMENT_INTELLIGENCE_KEY": "@Microsoft.KeyVault(...)",
    "BLOB_STORAGE_CONNECTION": "<blob-connection>",
    "AZURE_AD_TENANT_ID": "<tenant-id>",
    "AZURE_AD_CLIENT_ID": "<client-id>"
  }
}
```

## Security

### Authentication
- Azure AD B2B for user authentication
- JWT token validation in Azure Functions
- Tenant assignment via claims mapping

### Authorization
- Role-based access control (admin, data-steward, viewer, api-user)
- Tenant-scoped data access
- Resource-level permissions

### Data Protection
- Partition-level tenant isolation
- Encrypted storage (at-rest and in-transit)
- SAS tokens for blob access
- Key Vault for secrets

## Monitoring

### Application Insights
- Request tracing
- Exception logging
- Performance metrics
- Custom events (validations, corrections, exports)

### Dashboards
- Documents processed per tenant
- Extraction accuracy by carrier
- Validation queue depth
- Learning loop effectiveness

## Documentation

- **[Implementation Summary](docs/IMPLEMENTATION_SUMMARY.md)** - Detailed implementation overview and technical architecture
- **[Deployment Guide](docs/DEPLOYMENT_GUIDE.md)** - Complete deployment instructions for SaaS and self-hosted modes

## Support

For technical support, contact the CTN platform team at support@ctninland.com.

## License

Proprietary - © 2025 Container Transport Network (CTN)
