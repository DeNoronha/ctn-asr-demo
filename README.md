# CTN Association Register (ASR)

A full-stack web application for managing CTN member organizations, their endpoints, tokens, and KvK document verification.

[![Status](https://img.shields.io/badge/status-deployed-success)](https://calm-tree-03352ba03.1.azurestaticapps.net)
[![Azure](https://img.shields.io/badge/azure-functions%20%7C%20static%20web%20apps-blue)](https://portal.azure.com)

---

## 🚀 Quick Links

- **Live Application:** https://calm-tree-03352ba03.1.azurestaticapps.net
- **API Endpoint:** https://func-ctn-demo-asr-dev.azurewebsites.net/api/v1
- **Azure DevOps:** https://dev.azure.com/ctn-demo/ASR

---

## 📚 Documentation

### For New Developers - Start Here

1. **[docs/README.md](./docs/README.md)** - Documentation index
2. **[docs/ARCHITECTURE.md](./docs/ARCHITECTURE.md)** - System design and technology stack
3. **[docs/DEPLOYMENT_GUIDE.md](./docs/DEPLOYMENT_GUIDE.md)** - How to deploy locally and to production
4. **[docs/TESTING_GUIDE.md](./docs/TESTING_GUIDE.md)** - Testing procedures
5. **[docs/ROADMAP.md](./docs/ROADMAP.md)** - Current status and future plans

### For Claude AI Assistant

**[PROJECT_REFERENCE.md](./PROJECT_REFERENCE.md)** - **⚠️ READ THIS FIRST IN EVERY NEW CONVERSATION**
- Azure credentials and resources
- Deployment commands
- Common issues and solutions
- Working method and preferences
- **This file is for Claude only** - contains sensitive info and AI-specific instructions

---

## 🎯 What This Application Does

### Admin Portal
- Manage member organizations (CRUD operations)
- Review and approve KvK documents
- Issue BVAD access tokens
- View dashboard analytics
- User management
- Audit log viewer

### Member Portal
- View organization details
- Manage contacts and endpoints
- Upload KvK verification documents
- Request access tokens

### KvK Document Verification (NEW)
Automated verification of Chamber of Commerce documents:
1. Member uploads PDF KvK statement
2. Azure AI extracts company data
3. System validates against KvK API
4. Auto-flags suspicious cases
5. Admin reviews flagged cases
6. System sends notifications

---

## 🏗️ Technology Stack

**Frontend:**
- React 18 + TypeScript
- Kendo React UI components
- Azure Static Web Apps

**Backend:**
- Azure Functions (Node.js 20 + TypeScript)
- PostgreSQL (Azure Database)
- Azure Blob Storage (documents)
- Azure AI Document Intelligence
- Azure Event Grid + Communication Services (email)

**Infrastructure:**
- Bicep (planned)
- Azure DevOps Repos
- Manual deployment (CI/CD pipeline planned)

---

## 📦 Project Structure

```
ASR-full/
├── api/                    # Azure Functions (TypeScript)
│   ├── src/
│   │   ├── functions/      # API endpoints
│   │   └── services/       # Business logic
│   └── dist/               # Built output
├── web/                    # React frontend
│   ├── src/
│   │   ├── components/     # React components
│   │   └── services/       # API client
│   ├── public/
│   │   └── staticwebapp.config.json  # Required for routing
│   ├── .env.local          # Local dev config (NOT in git)
│   └── .env.production     # Production config (in git)
├── database/
│   └── migrations/         # SQL migration scripts
├── infrastructure/         # Bicep templates (planned)
└── docs/                   # Documentation
    ├── README.md           # Documentation index
    ├── ROADMAP.md          # Action items
    ├── ARCHITECTURE.md     # System design
    ├── DEPLOYMENT_GUIDE.md # How to deploy
    ├── TESTING_GUIDE.md    # How to test
    └── archive/            # Historical docs
```

---

## 🚀 Quick Start

### Prerequisites
- Node.js 20.x
- Azure CLI
- Git
- Access to Azure subscription

### Clone and Setup

```bash
# Clone repository
git clone https://dev.azure.com/ctn-demo/_git/ASR
cd ASR

# Install dependencies
cd api && npm install
cd ../web && npm install
```

### Local Development

See [docs/DEPLOYMENT_GUIDE.md](./docs/DEPLOYMENT_GUIDE.md#local-development) for detailed instructions.

```bash
# Terminal 1 - API
cd api
func start --cors http://localhost:3000

# Terminal 2 - Frontend
cd web
npm start
```

Access: http://localhost:3000

### Deploy to Production

See [docs/DEPLOYMENT_GUIDE.md](./docs/DEPLOYMENT_GUIDE.md#production-deployment) for detailed instructions.

---

## 📊 Current Status

**Admin Portal:** ✅ Production-ready, all features working  
**Member Portal:** ✅ Infrastructure complete, authentication working  
**Database:** ✅ 11 tables + 2 views deployed  
**API:** ✅ 28+ endpoints operational  
**Email Notifications:** ✅ Configured and tested  
**KvK Verification:** 🟡 85% complete (awaiting KvK API key and SAS tokens)  

See [docs/ROADMAP.md](./docs/ROADMAP.md) for detailed status and next steps.

---

## 🔐 Security

- Authentication: Azure Entra ID (OAuth2/OIDC)
- Authorization: Role-based (admin/member)
- API: JWT validation, CORS configured
- Storage: Private blob containers (SAS tokens for access)
- Database: SSL required, parameterized queries
- Secrets: Azure Function App Settings (not in repo)

---

## 🆘 Support

### Common Issues

See [PROJECT_REFERENCE.md](./PROJECT_REFERENCE.md#common-issues--solutions) for:
- Production redirect issues
- 404 errors on direct URLs
- Multipart form data parsing
- Azure Blob Storage access
- CORS errors

### Getting Help

1. Check [docs/DEPLOYMENT_GUIDE.md](./docs/DEPLOYMENT_GUIDE.md#troubleshooting)
2. Check [PROJECT_REFERENCE.md](./PROJECT_REFERENCE.md)
3. Review Azure Function logs
4. Contact project team

---

## 👥 Project Team

- **Solution Architect:** Ramon de Noronha
- **Organization:** CTN (Connecting the Netherlands)
- **Repository:** Azure DevOps - https://dev.azure.com/ctn-demo/ASR

---

## 📅 Recent Updates

**October 12, 2025:**
- ✅ KvK document verification (85% complete)
- ✅ Email notifications infrastructure
- ✅ Dashboard analytics
- ✅ Documentation restructured

See [docs/ROADMAP.md](./docs/ROADMAP.md) for complete changelog.

---

**Live Application:** https://calm-tree-03352ba03.1.azurestaticapps.net

**Target Production Date:** November 1, 2025
