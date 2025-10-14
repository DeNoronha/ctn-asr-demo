# CTN ASR Roadmap

**Last Updated:** October 14, 2025

This file contains ONLY the next actions to be taken. See [COMPLETED_ACTIONS.md](./COMPLETED_ACTIONS.md) for historical record.

---

## Priority 1 - Immediate Actions

- [ ] Mark the current working release as stable for rollback reference
- [ ] Add additional agents to Claude Code:
  - [ ] Performance Tuner (PT)
  - [ ] Database Expert (DB)
  - [ ] Architecture Reviewer (AR)
  - [ ] Quality Auditor (QA)
  - [ ] Research Manager (RM)
- [ ] Ensure agents are invoked on regular basis through workflows
- [ ] Remove remaining TypeScript 'any' types

---

## Priority 2 - BDI Production Readiness

- [ ] Generate production RSA key pair for BDI JWT signing
- [ ] Store RSA keys in Azure Key Vault (BDI_PRIVATE_KEY, BDI_PUBLIC_KEY)
- [ ] Configure BDI_KEY_ID in Function App Settings
- [ ] Test BVAD generation with international companies
- [ ] Test BVOD validation with sample orchestrations
- [ ] Register external BDI systems (DHL, Maersk, etc.) in `bdi_external_systems` table
- [ ] Configure Keycloak realm for BDI (if using external Keycloak)

---

## Security - CRITICAL

- [ ] Rotate PostgreSQL password and remove from Git history
- [ ] Move all remaining secrets to Azure Key Vault
- [ ] Configure KvK API key in Function App Settings (blocked: waiting for API key)

---

## Code Quality

- [ ] Configure Application Insights telemetry
- [ ] Implement database transactions for multi-step operations
- [ ] Define API versioning strategy
- [ ] Standardize naming conventions across codebase
- [ ] Handle locale/timezone consistently

---

## Testing

- [ ] Expand E2E test coverage with Playwright
  - [ ] Member portal critical paths
  - [ ] Admin portal workflows
  - [ ] BDI token generation and validation
- [ ] Add comprehensive unit tests
- [ ] Performance testing and optimization

---

## Future Features

### DNS and Security
- [ ] DNS verification for member onboarding
- [ ] WAF/Firewall configuration

### Registry Integrations
- [ ] KvK API integration for automated verification
- [ ] Companies House API integration (UK)
- [ ] Validation rules for international registry identifiers (regex patterns)
- [ ] Registry verification UI in admin portal
- [ ] Additional European registries:
  - [ ] Spain: Registro Mercantil
  - [ ] Italy: Registro delle Imprese
  - [ ] Poland: KRS (Krajowy Rejestr Sądowy)

---

## Notes

- **Agent Expansion:** Adding more specialized agents will improve code quality and reduce manual review burden
- **BDI Production:** RSA key generation and Key Vault storage are prerequisites for production BDI operations
- **Security:** PostgreSQL password rotation is critical and should be prioritized
- **Testing:** Playwright test suite is now established - continue building test coverage

---

See [docs/](./docs/) for detailed technical documentation and [CLAUDE.md](./CLAUDE.md) for way of working.
