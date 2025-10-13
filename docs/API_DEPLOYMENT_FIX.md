# API Deployment Fix - October 13, 2025

## Problem Summary
After implementing international registry support, the API was returning 404 for all endpoints despite successful deployments. Both member and admin portals could not load data.

## Root Cause
The original `src/index.ts` file was importing all functions sequentially. Some functions in that list were causing the entire module to fail during initialization, preventing **any** functions from registering with Azure Functions runtime.

## Solution
Created `src/essential-index.ts` with only the critical functions needed for the demo:

### Functions Deployed (16 endpoints)
1. **Health & Monitoring**
   - `healthCheck` - `/api/health`
   - `bdiJwks` - `/api/.well-known/jwks`
   - `generateBvad` - `/api/v1/bdi/bvad/generate`

2. **Member Portal Functions**
   - `GetAuthenticatedMember` - `/api/v1/member` ✓ Critical
   - `UpdateMemberProfile` - `/api/v1/member/profile`

3. **Admin Portal - Member Management**
   - `GetMembers` - `/api/v1/members` ✓ Critical
   - `GetMember` - `/api/v1/members/{orgid}`
   - `CreateMember` - `/api/v1/members`
   - `IssueToken` - `/api/v1/oauth/token`

4. **Admin Portal - Legal Entity Management**
   - `GetLegalEntity` - `/api/v1/legal-entities/{legalentityid}` ✓ Critical
   - `UpdateLegalEntity` - `/api/v1/legal-entities/{legalentityid}`

5. **Admin Portal - Contact Management**
   - `GetContacts` - `/api/v1/contacts` & `/api/v1/legal-entities/{legalentityid}/contacts`
   - `CreateContact` - `/api/v1/contacts`
   - `UpdateContact` - `/api/v1/contacts/{contactid}`
   - `DeleteContact` - `/api/v1/contacts/{contactid}`

6. **Admin Portal - KvK Verification**
   - `getFlaggedEntities` - `/api/v1/kvk-verification/flagged`

## Configuration Changes Made
1. Added missing environment variables:
   - `AZURE_AD_TENANT_ID=598664e7-725c-4daa-bd1f-89c4ada717ff`
   - `AZURE_AD_CLIENT_ID=d3037c11-a541-4f21-8862-8079137a0cde`

2. Changed `package.json` main entry point:
   ```json
   "main": "dist/essential-index.js"
   ```

## Testing Results
- ✅ Health check: Healthy, database connected (75ms response time)
- ✅ Admin portal accessible: https://calm-tree-03352ba03.1.azurestaticapps.net
- ✅ Member portal accessible: https://calm-pebble-043b2db03.1.azurestaticapps.net
- ✅ API endpoints responding correctly
- ✅ International registry support included in deployed functions

## Functions NOT Deployed (Non-Critical for Demo)
The following functions from the original index.ts were excluded to ensure stability:
- Member self-service endpoints (contacts, tokens)
- Multi-system endpoint management
- Newsletter/subscription management
- Task management
- Swagger documentation
- Event Grid handler
- KvK document upload and review
- BVOD validation

These can be added gradually after the demo once we identify which specific function was causing the initialization failure.

## Portal URLs
- **Admin Portal**: https://calm-tree-03352ba03.1.azurestaticapps.net
- **Member Portal**: https://calm-pebble-043b2db03.1.azurestaticapps.net
- **API Base**: https://func-ctn-demo-asr-dev.azurewebsites.net/api

## Authentication
Both portals use Entra ID authentication with App Registration:
- **App ID**: d3037c11-a541-4f21-8862-8079137a0cde
- **Tenant ID**: 598664e7-725c-4daa-bd1f-89c4ada717ff

Test login with: ramon@denoronha.consulting

## International Registry Support
The deployed API includes full support for international registries:
- Database migrations 011 (BDI) and 012 (International registries) applied
- Legal entities can have multiple registry identifiers (KvK, LEI, EUID, HRB, etc.)
- Registry identifiers include:
  - `identifier_type` (KVK, LEI, EUID, HRB, KBO, SIREN, CRN, etc.)
  - `identifier_value`
  - `country_code` (ISO 3166-1 alpha-2)
  - `registry_name` (e.g., "IHK Berlin", "KvK")
  - `registry_url`
  - `validation_status`

Both portals display registry identifiers with proper formatting.

## Next Steps (After Demo)
1. Identify which function in the original index.ts was causing the failure
2. Add back remaining functions one by one with proper error handling
3. Re-enable startup validation (currently disabled for debugging)
4. Set up proper production environment (currently in "dev")
5. Configure BDI RSA keys for JWKS/BVAD generation
6. Add comprehensive error logging

## Files Modified
- `api/src/essential-index.ts` - NEW (production entry point)
- `api/src/minimal-index.ts` - NEW (testing only)
- `api/src/test-index.ts` - NEW (testing only)
- `api/package.json` - Updated main entry point
- `api/src/index.ts` - Temporarily disabled startup validation

## Deployment Command
```bash
cd /Users/ramondenoronha/Dev/DIL/ASR-full/api
npm run build
func azure functionapp publish func-ctn-demo-asr-dev --javascript
```

**Status**: ✅ READY FOR DEMO

---
*Document created: October 13, 2025, 10:55 PM*
