# CTN ASR Roadmap

**Last Updated:** October 14, 2025

This file contains ALL pending actions. See [docs/COMPLETED_ACTIONS.md](./docs/COMPLETED_ACTIONS.md) for historical record.

---

## CRITICAL - Security (Do First)

- [ ] **Rotate PostgreSQL password** - Currently exposed in Git history
- [ ] **Clean Git history** - Remove exposed credentials using git-filter-repo
- [ ] **Move all secrets to Azure Key Vault** - PostgreSQL, JWT, Storage, Event Grid keys
- [ ] **Generate strong JWT secret** - Replace any demo/default secrets
- [ ] **Audit database access logs** - Check for unauthorized access (last 30 days)
- [ ] **Set up secret rotation schedule** - Document and calendar quarterly rotations

---

## HIGH - UI/UX Polish (Next Actions)

**Priority: Complete before adding new features**
**Total Effort: ~3 hours remaining**

- [ ] **H2: Keyboard navigation for grid action buttons** (3h) - **REMAINING HIGH PRIORITY**
  - Add keyboard shortcuts (Enter, Space) for action buttons
  - Implement proper tab order for grid navigation
  - Add focus indicators and ARIA labels
  - Ensure WCAG 2.1 Level AA accessibility compliance
  - Update IdentifiersManager, ContactsManager, TokensManager

**Medium Priority UI/UX** (~9 hours):
- [ ] **M1: Visual feedback during async operations** (2h)
- [ ] **M2: Color contrast fixes on warnings** (30min)
- [ ] **M3: Tooltips for truncated grid content** (1h)
- [ ] **M4: Standardize section header spacing** (1h)
- [ ] **M5: Drag-drop visual feedback for uploads** (1h)
- [ ] **M6: Always show "Last Modified" in Company Details** (30min)
- [ ] **M7: Add semantic HTML roles to status badges** (1h)
- [ ] **M8: Default sort by last_used_at in Tokens grid** (15min)

**Low Priority UI/UX** (~23 hours):
- [ ] **L1: Bulk actions for grid operations** (4h)
- [ ] **L2: Export functionality for grids** (2h)
- [ ] **L3: Audit trail/change history** (6h)
- [ ] **L4: Advanced filtering** (4h)
- [ ] **L5: Contextual help system** (3h)
- [ ] **L6: Progressive disclosure for complex forms** (2h)
- [ ] **L7: Responsive layout improvements** (1h)
- [ ] **L8: Print-friendly views** (1h)

---

## HIGH - Production Readiness

### API Stability
- [ ] **Re-enable startup validation** - Currently disabled for debugging
- [ ] **Add comprehensive error logging** - Application Insights integration
- [ ] **Set up proper production environment** - Move from "dev" naming convention

### Missing API Functions (Re-add Gradually)
- [ ] Newsletter/subscription management
- [ ] Task management
- [ ] Swagger documentation endpoint
- [ ] Event Grid handler

### BDI Production Setup
- [ ] **Configure BDI RSA keys in Key Vault** - BDI_PRIVATE_KEY, BDI_PUBLIC_KEY
- [ ] **Set BDI_KEY_ID in Function App Settings**
- [ ] **Test BVAD generation with international companies**
- [ ] **Test BVOD validation with sample orchestrations**
- [ ] **Register external BDI systems** - DHL, Maersk, etc. in `bdi_external_systems` table
- [ ] **Configure Keycloak realm for BDI** (if using external Keycloak)

---

## MEDIUM - Code Quality & Testing

### TypeScript & Code Quality
- [ ] **Remove remaining TypeScript 'any' types**
- [ ] **Implement database transactions** - For multi-step operations
- [ ] **Define API versioning strategy**
- [ ] **Standardize naming conventions** across codebase
- [ ] **Handle locale/timezone consistently**

### Testing
- [ ] **Expand Playwright E2E test coverage**
  - [ ] Member portal critical paths
  - [ ] Admin portal complete workflows
  - [ ] BDI token generation and validation
- [ ] **Add comprehensive unit tests**
- [ ] **Performance testing and optimization**

### Monitoring
- [ ] **Configure Application Insights telemetry** - Detailed metrics
- [ ] **Set up alerting rules** - Failed requests, slow queries, errors
- [ ] **Create operational dashboard** - Azure Monitor

---

## MEDIUM - Agent Workflow

- [ ] **Add agent invocation to workflow documentation** - Update CLAUDE.md with when/how agents should be invoked
- [ ] **Create agent invocation checklist** - Before commits, before PRs, after features
- [ ] **Add additional specialized agents:**
  - [ ] Performance Tuner (PT) - Optimize slow queries and frontend performance
  - [ ] Database Expert (DB) - Database schema design and query optimization
  - [ ] Architecture Reviewer (AR) - System architecture and design patterns
  - [ ] Quality Auditor (QA) - Overall quality assessment and standards compliance
  - [ ] Research Manager (RM) - Research and document new features/technologies

---

## LOW - Future Features

### DNS and Security Infrastructure
- [ ] **DNS verification for member onboarding**
- [ ] **WAF/Firewall configuration**

### Registry Integrations
- [ ] **KvK API integration** - Automated verification (https://developers.kvk.nl)
- [ ] **Companies House API** - UK registry integration
- [ ] **Implement regex validation** - For each international identifier type
- [ ] **Registry verification UI** - Admin portal feature
- [ ] **Add more European registries:**
  - [ ] Spain: Registro Mercantil
  - [ ] Italy: Registro delle Imprese
  - [ ] Poland: KRS (Krajowy Rejestr Sądowy)

### Member Portal Enhancements
- [ ] **Member self-service token management**
- [ ] **Member contact updates**
- [ ] **Member endpoint registration**
- [ ] **Newsletter subscription management**

---

## Notes

**Security Priority:** PostgreSQL password rotation and Git history cleanup are CRITICAL and should be done immediately upon receiving this roadmap.

**UI/UX Polish Status:** Major progress completed today! 5 of 6 HIGH priority items done (8 hours). Only H2 (keyboard navigation, 3 hours) remains for full WCAG 2.1 Level AA accessibility compliance. All improvements are live and deployed.

**Production Readiness:** Most API functions have been restored and are working correctly. Remaining items are non-critical enhancements.

**BDI Setup:** RSA key generation and Key Vault storage are prerequisites for production BDI operations.

**One-Person Operation:** This roadmap is optimized for single-developer workflow. Tasks are prioritized by risk and impact.

---

## Recently Completed (October 14, 2025)

### CRITICAL Fixes
- ✅ **Fixed authentication on all apiV2 endpoints** - All CRUD operations (identifiers, contacts, endpoints, tokens) now authenticated correctly
- ✅ **Implemented user locale detection for date formatting** - No more hardcoded nl-NL, uses browser locale (navigator.language)
- ✅ **Resolved KVK identifier 404 errors** - Users can now successfully add identifiers

### HIGH Priority UI/UX Improvements (8 hours completed)
- ✅ **H1: Consistent loading states** (1h) - Added Kendo Loader components with descriptive text across all tabs
- ✅ **H3: Inline validation feedback** (2h) - Real-time validation for 12 identifier types with format examples and error messages
- ✅ **H5: Consistent empty state styling** (2h) - Created reusable EmptyState component used across 4 managers
- ✅ **H6: Replace window.confirm** (2h) - Professional ConfirmDialog component replacing all browser alerts
- ✅ **H7: Optimize grid column widths** (1h) - Better data visibility with minResizableWidth support
- ✅ **Replaced browser alert() with toast notifications** - EndpointManagement now uses non-blocking toasts

### Component Improvements
- ✅ **TokensManager** - Unified component with status tracking, filtering, and consistent UI
- ✅ **ContactsManager** - Updated with EmptyState and ConfirmDialog
- ✅ **IdentifiersManager** - Comprehensive validation, EmptyState, ConfirmDialog
- ✅ **IdentifierVerificationManager** - Genericized from KvK-only to support all identifier types
- ✅ **Button Standardization** - Consistent UI patterns across all tabs

### Quality Assurance
- ✅ **Design Analyst Review** - Completed comprehensive UI/UX assessment
- ✅ **5 of 6 HIGH priority DA issues resolved** - Only H2 (keyboard navigation) remaining
- ✅ **All improvements deployed** - Live at https://calm-tree-03352ba03.1.azurestaticapps.net

### API Functions Restored
- ✅ Member self-service endpoints (contacts, tokens)
- ✅ Multi-system endpoint management
- ✅ KvK document upload and review
- ✅ BVOD validation endpoint

---

## Quick References

- **Completed Actions:** See [docs/COMPLETED_ACTIONS.md](./docs/COMPLETED_ACTIONS.md)
- **Deployment:** See [docs/DEPLOYMENT_GUIDE.md](./docs/DEPLOYMENT_GUIDE.md)
- **Security:** See [docs/SECRET_ROTATION_GUIDE.md](./docs/SECRET_ROTATION_GUIDE.md)
- **BDI Integration:** See [docs/BDI_INTEGRATION.md](./docs/BDI_INTEGRATION.md)
- **Way of Working:** See [CLAUDE.md](./CLAUDE.md)
