# CTN Association Register - Documentation

## Essential Documents for Developers

### [ROADMAP.md](./ROADMAP.md)
Current action items and completed work. **Read this first** to understand project status.

### [ARCHITECTURE.md](./ARCHITECTURE.md)
System architecture, technology stack, and data flows. Essential for understanding how everything works.

### [DEPLOYMENT_GUIDE.md](./DEPLOYMENT_GUIDE.md)
Step-by-step deployment instructions for local development and production.

### [TESTING_GUIDE.md](./TESTING_GUIDE.md)
Comprehensive testing procedures for local, production, and integration testing.

---

## For Claude AI Assistant Only

### [../PROJECT_REFERENCE.md](../PROJECT_REFERENCE.md) 
**⚠️ CRITICAL - READ THIS FIRST IN EVERY NEW CONVERSATION**

This file contains:
- Azure credentials and sensitive information
- Deployment commands with tokens
- Common issues and solutions
- Claude's working method and preferences
- Ramon's communication style preferences

**This file is not for developers** - it's specifically designed for Claude to read at the start of every conversation to maintain context and efficiency.

## Quick Links

- **Frontend:** https://calm-tree-03352ba03.1.azurestaticapps.net
- **API:** https://func-ctn-demo-asr-dev.azurewebsites.net/api/v1
- **Azure DevOps:** https://dev.azure.com/ctn-demo/ASR

## Project Structure

```
ASR-full/
├── api/                    # Azure Functions (TypeScript)
├── web/                    # React frontend
├── database/               # SQL migrations
├── infrastructure/         # Bicep templates
└── docs/                   # This directory
```

## Deployment

See [PROJECT_REFERENCE.md](../PROJECT_REFERENCE.md#deployment-commands) for deployment commands.

## Archive

Historical documentation moved to `docs/archive/` directory.
