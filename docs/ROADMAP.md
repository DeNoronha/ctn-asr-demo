# CTN ASR Roadmap

**Last Updated:** October 13, 2025

## Recent Major Completions (October 2025)

### BDI Integration (BVAD & BVOD) ✅
**Completed:** October 13, 2025

Implemented the **BDI (Basic Data Infrastructure) Reference Architecture** for verifiable trust and authorization in the container transport ecosystem.

**Features:**
- **BVAD (BDI Verifiable Assurance Document)** - "Can this member be trusted?"
  - JWT token generation with RS256 signing
  - JWKS endpoint for public key distribution
  - Comprehensive audit logging
  - Support for multiple registry identifiers
- **BVOD (BDI Verifiable Orchestration Document) Validation** - "Is this member involved in this orchestration?"
  - Token signature validation
  - Orchestration participant verification
  - Security audit logging

**Implementation:**
- Migration 011: BDI orchestration support (415 lines)
- 3 new API endpoints: `bdiJwks`, `generateBvad`, `validateBvod`
- JWT service with RS256 asymmetric signing
- Complete documentation in `BDI_INTEGRATION.md`

**Database Tables:**
- `bdi_orchestrations` - Track transport orchestration instances
- `bdi_orchestration_participants` - Member involvement tracking
- `bvad_issued_tokens` - BVAD audit trail
- `bvod_validation_log` - Security audit log
- `bdi_external_systems` - Authorized BDI systems

### International Registry Support ✅
**Completed:** October 13, 2025

Expanded beyond Dutch KvK to support companies registered with Chambers of Commerce worldwide.

**Supported Registries:**
- **Netherlands:** KvK (Kamer van Koophandel)
- **Germany:** IHK Berlin, IHK Munich, Handelsregister (HRA/HRB)
- **Belgium:** KBO/BCE (Kruispuntbank van Ondernemingen)
- **France:** SIREN (9 digits), SIRET (14 digits)
- **United Kingdom:** Companies House
- **European Union:** EUID (European Unique Identifier)
- **Global:** LEI (Legal Entity Identifier)

**Implementation:**
- Migration 012: International registry support (367 lines)
- Extended `legal_entity_number` table with `registry_name`, `registry_url`, `country_code`
- Created `company_registries` reference table with validation patterns
- Updated BVAD tokens to include all registry identifiers with full context
- Helper view: `company_identifiers_with_registry`

**Benefits:**
- Support for companies registered anywhere in Europe (and globally)
- Multiple identifier types per entity (LEI, EUID, national registry)
- Country and registry context in BVAD tokens
- Extensible design for adding new registries

---

## Remaining Action Items

### BDI Deployment (HIGH PRIORITY)
- [ ] Apply database migration 011 (BDI orchestration support)
- [ ] Apply database migration 012 (International registry support)
- [ ] Generate production RSA key pair for BDI JWT signing
- [ ] Store RSA keys in Azure Key Vault (BDI_PRIVATE_KEY, BDI_PUBLIC_KEY)
- [ ] Configure BDI_KEY_ID in Function App Settings
- [ ] Deploy updated API functions to Azure
- [ ] Test BVAD generation with international companies
- [ ] Test BVOD validation with sample orchestrations
- [ ] Register external BDI systems (DHL, Maersk, etc.) in `bdi_external_systems` table
- [ ] Configure Keycloak realm for BDI (if using external Keycloak)

### Security (CRITICAL)
- [ ] Rotate PostgreSQL password and remove from Git history
- [ ] Move all secrets to Azure Key Vault
- [ ] Configure KvK API key in Function App Settings (blocked: waiting for key)

### Code Quality
- [ ] Refactor language switcher to remove page reload
- [ ] Remove remaining TypeScript 'any' types

### Post-Launch Enhancements
- [x] ~~Enable Swagger/OpenAPI documentation~~ ✅ Completed
- [x] ~~Add health check endpoint~~ ✅ Completed
- [x] ~~Add pagination to list endpoints~~ ✅ Completed (3 endpoints)
- [x] ~~Add database indexes for performance~~ ✅ Completed (52 indexes)
- [x] ~~Configure timeouts for external API calls~~ ✅ Completed
- [ ] Configure Application Insights telemetry
- [ ] Implement database transactions for multi-step operations
- [ ] Define API versioning strategy
- [ ] Standardize naming conventions
- [ ] Handle locale/timezone consistently

### Testing
- [ ] Add E2E tests with Playwright
- [ ] Add comprehensive unit tests
- [ ] Performance testing and optimization

### Future Features
- [x] ~~Keycloak integration for member-facing APIs~~ ✅ Completed (BDI BVAD/BVOD integration)
- [x] ~~International KvK support~~ ✅ Completed (Multi-registry support with EUID, LEI, HRB, SIREN, etc.)
- [ ] DNS verification for onboarding
- [ ] WAF/Firewall configuration
- [ ] Registry API integrations for automated verification (KvK API, Companies House API, etc.)
- [ ] Validation rules for international registry identifiers (regex patterns)
- [ ] Registry verification UI in admin portal
- [ ] Additional European registries (Spain, Italy, Poland, etc.)
- [ ] Additional agents: Performance Tuner, Technical Writer, Database Expert, Architecture Reviewer, Quality Auditor, Research Manager

---

## Project Statistics

### Database
- **Migrations:** 12 (11 applied + 2 pending BDI/International)
- **Tables:** 35+ (including BDI orchestration tables)
- **Indexes:** 52+ (performance optimized)
- **Views:** Multiple (including `company_identifiers_with_registry`)

### API Endpoints
- **Total Functions:** 35+
- **Member Management:** 8 endpoints
- **Legal Entity Management:** 5 endpoints
- **Contact Management:** 4 endpoints
- **Endpoint Management:** 5 endpoints
- **KvK Verification:** 3 endpoints
- **BDI Integration:** 3 endpoints (NEW)
- **Admin Portal:** 6 endpoints (subscriptions, newsletters, tasks)
- **Documentation:** Swagger/OpenAPI endpoint
- **Health Check:** 1 endpoint

### Security
- **Authentication:** Azure AD + RBAC
- **Authorization:** Role-based with granular permissions
- **JWT Signing:** RS256 asymmetric encryption (BDI)
- **Audit Logging:** Comprehensive (BVAD issuance, BVOD validation, KvK verification)
- **Rate Limiting:** Configured per external system

### Documentation
- **Main Docs:** README.md, ARCHITECTURE.md, DEPLOYMENT_GUIDE.md
- **Integration Guides:** BDI_INTEGRATION.md (500+ lines)
- **Session Summaries:** Multiple detailed summaries
- **Agent Definitions:** 4 specialized agents (CR, SA, DA, TE)

### Code Quality
- **TypeScript:** Fully typed API with minimal 'any' types
- **Testing:** Test Engineer agent integration ready
- **Linting:** ESLint + Prettier configured
- **Security Scanning:** Aikido CI integration
- **Build:** Automated with Azure Pipelines
