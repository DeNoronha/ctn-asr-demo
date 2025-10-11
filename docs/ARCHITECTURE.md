# CTN Association Register - Architecture

## System Overview

The CTN Association Register (ASR) is a web application for managing CTN member organizations, their endpoints, tokens, and KvK document verification.

## Technology Stack

### Frontend
- **Framework:** React 18 + TypeScript
- **UI Library:** Kendo React (Grid, Drawer, Buttons, Inputs)
- **Charts:** Recharts
- **HTTP Client:** Axios
- **Authentication:** Azure Entra ID (MSAL)
- **Hosting:** Azure Static Web Apps

### Backend
- **Runtime:** Azure Functions (Node.js 20)
- **Language:** TypeScript
- **Database:** PostgreSQL (Azure Database for PostgreSQL)
- **Storage:** Azure Blob Storage (KvK documents)
- **AI:** Azure AI Document Intelligence (KvK extraction)
- **Events:** Azure Event Grid (email notifications)
- **Email:** Azure Communication Services

### Infrastructure
- **IaC:** Bicep (future)
- **CI/CD:** Azure DevOps Pipelines (planned) + manual deployment
- **Source Control:** Azure DevOps Repos

## Architecture Diagram

```
┌─────────────────────────────────────────────────────────────┐
│  User Browser                                                │
└────────────────────────┬────────────────────────────────────┘
                         │
                         ▼
┌─────────────────────────────────────────────────────────────┐
│  Azure Static Web Apps (React Frontend)                     │
│  https://calm-tree-03352ba03.1.azurestaticapps.net         │
│  - Member Portal                                             │
│  - Admin Portal                                              │
└────────────────────────┬────────────────────────────────────┘
                         │
                         ▼
┌─────────────────────────────────────────────────────────────┐
│  Azure Functions (TypeScript API)                           │
│  https://func-ctn-demo-asr-dev.azurewebsites.net/api/v1    │
│  - REST API endpoints                                        │
│  - Business logic                                            │
│  - Token generation                                          │
└────┬──────────┬──────────┬──────────┬───────────────────────┘
     │          │          │          │
     ▼          ▼          ▼          ▼
┌─────────┐ ┌─────────┐ ┌─────────┐ ┌──────────────────────┐
│PostgreSQL│ │Blob     │ │Document │ │Event Grid + Comms    │
│Database  │ │Storage  │ │Intel    │ │Services (Email)      │
└─────────┘ └─────────┘ └─────────┘ └──────────────────────┘
```

## Database Schema

### Core Tables
- **legal_entity** - Member organizations (companies)
- **contact** - Contact persons for organizations
- **endpoint** - API endpoints per organization
- **token** - BVAD access tokens
- **user_account** - System users
- **audit_logs** - All system actions

### Views
- **member_overview** - Aggregated member data
- **token_overview** - Token statistics

### KvK Verification (New)
11 new columns in `legal_entity` table for document verification workflow.

## Key Features

### Admin Portal
- Dashboard with analytics (member stats, token usage)
- Member management (CRUD operations)
- Contact management
- Endpoint management
- Token issuance
- KvK document review queue
- User management
- Audit log viewer

### Member Portal
- View organization details
- Manage contacts
- Manage endpoints
- Request tokens
- Upload KvK documents
- View verification status

### KvK Document Verification
1. Member uploads PDF KvK statement
2. System stores in Azure Blob Storage (private)
3. Azure AI Document Intelligence extracts data
4. System validates against KvK API
5. Auto-flags suspicious cases (bankrupt, dissolved, mismatches)
6. Admin reviews flagged cases
7. System sends notifications

## API Structure

### REST Endpoints (28+)
```
/api/v1/members                                    # Member CRUD
/api/v1/legal-entities/{id}                       # Entity details
/api/v1/legal-entities/{id}/contacts              # Contacts CRUD
/api/v1/legal-entities/{id}/endpoints             # Endpoints CRUD
/api/v1/legal-entities/{id}/kvk-document          # KvK upload
/api/v1/legal-entities/{id}/kvk-verification      # KvK status
/api/v1/kvk-verification/flagged                  # Admin review queue
/api/v1/endpoints/{id}/tokens                     # Token issuance
/api/v1/oauth/token                               # OAuth2 endpoint
```

### Authentication
- Azure Entra ID for UI (OAuth2/OIDC)
- JWT tokens for API access (BVAD tokens)

## Data Flow Example: KvK Upload

```
1. User uploads PDF
   ↓
2. React → POST /api/v1/legal-entities/{id}/kvk-document
   ↓
3. Azure Function receives multipart/form-data
   ↓
4. Upload to Blob Storage (private container)
   ↓
5. Update database: status = 'pending'
   ↓
6. Document Intelligence extracts: company name, KvK number
   ↓
7. KvK API validates extracted data
   ↓
8. Update database: status = 'verified'|'failed'|'flagged'
   ↓
9. Event Grid → Email notification
   ↓
10. React polls status endpoint → Display result
```

## Security

- **Authentication:** Azure Entra ID (OAuth2)
- **Authorization:** Role-based (admin/member)
- **API Security:** JWT validation, CORS configured
- **Storage:** Private blob containers, SAS tokens for access
- **Database:** SSL required, parameterized queries
- **Secrets:** Azure Function App Settings (no .env in repo)

## Scalability

- **Frontend:** CDN-distributed (Azure Static Web Apps)
- **API:** Auto-scaling Azure Functions (consumption plan)
- **Database:** Azure Database for PostgreSQL (scalable tiers)
- **Storage:** Azure Blob Storage (unlimited scale)

## Monitoring

- Azure Application Insights (planned)
- Function App logs (Azure Portal)
- Database query logs
- Audit logs in database

## Future Enhancements

See [ROADMAP.md](./ROADMAP.md) for planned features:
- Multi-system endpoint management
- Email template engine
- Logic Apps workflow automation
- Localization (NL/EN/DE)
- Advanced analytics

---

**Architecture Version:** 1.0  
**Last Updated:** October 12, 2025
