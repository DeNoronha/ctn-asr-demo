# Azure Functions Legacy Code Archive

**Archived:** November 21, 2025  
**Reason:** Migration to Azure Container Apps completed (November 19, 2025)

## What's in this archive

This directory contains the original Azure Functions implementation of the ASR API that was used before migrating to Azure Container Apps + Express.js.

**Original location:** `api/src/functions-legacy/`

## Migration Timeline

- **Before Nov 19, 2025:** API ran as Azure Functions (func-ctn-demo-asr-dev.azurewebsites.net)
- **Nov 19, 2025:** Migrated to Azure Container Apps (ca-ctn-asr-api-dev.calmriver-700a8c55.westeurope.azurecontainerapps.io)
- **Nov 21, 2025:** Legacy Functions code archived (no longer referenced by any active code)

## Why Container Apps?

The migration to Container Apps provided:
- Better reliability and uptime
- Improved health probes and graceful shutdown
- Easier debugging with structured logging
- More control over HTTP server configuration
- Simpler deployment process

## Current Architecture

The API is now implemented in:
- `api/src/server.ts` - Express server entry point
- `api/src/routes.ts` - API route definitions (to be modularized)
- `api/src/controllers/` - Request handlers
- `api/src/middleware/` - Auth, RBAC, logging
- `api/Dockerfile` - Multi-stage Docker build

## Can this code be deleted?

**Yes**, after verifying:
1. All functionality migrated to Container Apps (✅ Verified Nov 21, 2025)
2. No production traffic to old Functions endpoint (✅ Verified)
3. Archive retained for reference (✅ This archive)

## Reference Documentation

- Migration decision: CLAUDE.md (Container Apps section)
- Architecture: docs/COMPREHENSIVE_CODEBASE_REVIEW_2025-11-21.md
- Infrastructure: infrastructure/bicep/container-app.bicep
