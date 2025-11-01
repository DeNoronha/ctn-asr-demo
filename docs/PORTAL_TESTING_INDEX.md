# CTN Portal Testing Configuration Index

This document serves as a navigation guide to all portal testing configuration documentation created during the comprehensive codebase scan on November 1, 2025.

## Documentation Overview

This folder contains three comprehensive guides for Playwright testing across the CTN monorepo:

### 1. **PORTAL_CONFIGURATIONS.md** - Technical Reference
**Complete configuration reference for all 5 portals**

Contains:
- Detailed setup for each portal (Admin, Member, Booking, Orchestrator, Docs)
- Directory structures and entry points
- MSAL configuration details (Client ID, Tenant ID, scopes)
- Router configuration and protected routes
- Playwright configuration for each portal
- Test file organization and counts
- CSS selectors used in existing tests
- Authentication methods and token management

**Use this when**: You need complete technical specifications for a portal

**Start here if**: Setting up a new Playwright configuration or understanding portal architecture

---

### 2. **PLAYWRIGHT_SETUP_GUIDE.md** - How-To & Troubleshooting
**Step-by-step guide for running and debugging tests**

Contains:
- Quick start commands for each portal
- Running tests locally, in UI mode, in debug mode
- Key CSS selectors for common automation tasks
- Authentication flow patterns (MSAL vs custom)
- Environment variables for CI/CD pipelines
- Common issues and solutions
- Test file organization best practices
- Performance optimization tips

**Use this when**: You're running tests and need to debug issues

**Start here if**: You want to execute tests immediately or fix failing tests

---

### 3. **LOGIN_SELECTORS_AND_ENDPOINTS.md** - Automation & API Reference
**Exact selectors and API endpoints for test automation**

Contains:
- CSS/Playwright selectors for each portal's login flow
- Login button selectors (Admin, Member, Booking)
- Authenticated state indicators
- Sign-out button locations
- Tab navigation selectors (Member Portal)
- ASR API endpoints (GET, POST, PUT, DELETE)
- Booking API endpoints
- Token management code examples
- Test user credentials
- Environment-specific URLs
- Debugging authentication in tests

**Use this when**: Writing Playwright tests for login flows or API interactions

**Start here if**: Building new test cases or debugging authentication issues

---

## Portal Quick Reference

### Admin Portal
- **Directory**: `/admin-portal`
- **Auth**: MSAL (Azure Entra ID)
- **Production URL**: https://calm-tree-03352ba03.1.azurestaticapps.net
- **Local Port**: 3000
- **Tests**: 40+ in `e2e/admin-portal/`
- **Main Selector**: `.user-name`

### Member Portal
- **Directory**: `/member-portal`
- **Auth**: MSAL React
- **Production URL**: https://calm-pebble-043b2db03.1.azurestaticapps.net
- **Local Port**: 3001
- **Tests**: 10+ across multiple suites
- **Main Selectors**: 
  - Login: `button:has-text("Sign In with Azure AD")`
  - Logout: `button:has-text("🚪 Sign Out")`

### Booking Portal
- **Directory**: `/booking-portal`
- **Auth**: MSAL
- **Production URL**: https://calm-mud-024a8ce03.1.azurestaticapps.net
- **Local Port**: 3000 (proxy to 7071)
- **Tests**: 10+ in `e2e/`

### Orchestrator Portal
- **Directory**: `/orchestrator-portal`
- **Auth**: Zustand (local store)
- **Production URL**: Not deployed
- **Local Port**: 5173 + mock API on 3001
- **Tests**: 6 tests

### Documentation Portal
- **Directory**: `/ctn-docs-portal`
- **Auth**: None (public)
- **Production URL**: https://ambitious-sky-098ea8e03.2.azurestaticapps.net
- **Build**: Static site generator
- **Tests**: 6 smoke tests

---

## Shared Credentials

**Test User** (All ASR Portals):
- Email: test-e2@denoronha.consulting
- Password: Madu5952
- Role: SystemAdmin
- MFA: Disabled

**MSAL Client ID** (Admin, Member, Booking):
- `d3037c11-a541-4f21-8862-8079137a0cde`

**MSAL Tenant ID**:
- `598664e7-725c-4daa-bd1f-89c4ada717ff`

---

## Common Tasks & Guide References

### I want to run Admin Portal tests
1. Read: **PLAYWRIGHT_SETUP_GUIDE.md** → "Admin Portal" section
2. Commands:
   ```bash
   cd admin-portal
   npm run test:e2e
   ```
3. For debugging: **LOGIN_SELECTORS_AND_ENDPOINTS.md** → "Admin Portal" section

### I want to write a login test for Member Portal
1. Read: **LOGIN_SELECTORS_AND_ENDPOINTS.md** → "Member Portal" section
2. Copy selector examples for login buttons
3. Reference: **PORTAL_CONFIGURATIONS.md** → "Member Portal" → "Router Configuration"

### I want to test API endpoints
1. Read: **LOGIN_SELECTORS_AND_ENDPOINTS.md** → "API Endpoints" section
2. ASR API: https://func-ctn-demo-asr-dev.azurewebsites.net/api/v1
3. Token examples: See "Token Management in Tests" section

### I want to set up CI/CD testing
1. Read: **PLAYWRIGHT_SETUP_GUIDE.md** → "Environment Variables for CI/CD" section
2. Copy environment variable configurations
3. Reference specific portal for variables (PLAYWRIGHT_BASE_URL vs BASE_URL vs BOOKING_PORTAL_URL)

### I want to debug MSAL authentication
1. Read: **PORTAL_CONFIGURATIONS.md** → "Authentication Details" for relevant portal
2. Reference: **LOGIN_SELECTORS_AND_ENDPOINTS.md** → "Debugging Authentication Issues"
3. Check token location and MSAL instance availability

### I want to understand portal architecture
1. Start: **PORTAL_CONFIGURATIONS.md** → Overview section
2. Review: Each portal's "Directory & Entry Points" section
3. Read: "Router Configuration" for each portal

### I want to optimize test performance
1. Read: **PLAYWRIGHT_SETUP_GUIDE.md** → "Performance Optimization" section
2. Review: Parallel execution, browser context reuse, slow test marking

---

## File Locations

All documentation is in `/Users/ramondenoronha/Dev/DIL/ASR-full/docs/`:

```
docs/
├── PORTAL_TESTING_INDEX.md (this file)
├── PORTAL_CONFIGURATIONS.md (technical reference)
├── PLAYWRIGHT_SETUP_GUIDE.md (how-to & troubleshooting)
└── LOGIN_SELECTORS_AND_ENDPOINTS.md (automation & API)
```

---

## Key Statistics

- **Total Portals**: 5
- **Total E2E Tests**: 70+
- **MSAL-based Portals**: 3 (Admin, Member, Booking)
- **Independent Portals**: 2 (Orchestrator, Docs)
- **Shared Client ID**: Yes (Admin, Member, Booking)
- **Production Deployments**: 4 (Orchestrator not deployed)
- **Local Dev Ports**: 3000, 3001, 5173, 8080

---

## Navigation Tips

### By User Role

**Playwright Test Engineer**:
1. Start: PLAYWRIGHT_SETUP_GUIDE.md
2. Reference: LOGIN_SELECTORS_AND_ENDPOINTS.md
3. Detailed specs: PORTAL_CONFIGURATIONS.md

**Backend/API Developer**:
1. Start: LOGIN_SELECTORS_AND_ENDPOINTS.md
2. Focus: API Endpoints section
3. Reference: Token Management & Debugging sections

**Frontend Developer**:
1. Start: PORTAL_CONFIGURATIONS.md
2. Focus: Your portal's Router Configuration & Components
3. Reference: PLAYWRIGHT_SETUP_GUIDE.md for testing

**DevOps/CI-CD Engineer**:
1. Start: PLAYWRIGHT_SETUP_GUIDE.md
2. Focus: Environment Variables for CI/CD section
3. Reference: Each portal's configuration for variables

**System Administrator**:
1. Start: PORTAL_CONFIGURATIONS.md
2. Focus: Production URLs and Deployment sections
3. Reference: Cross-Portal Information section

---

## Document Maintenance

**Last Updated**: November 1, 2025

**Scan Details**:
- Duration: ~1 hour
- Scope: Complete monorepo analysis
- Coverage: All portal files, configurations, and test setups
- Git Repository: ASR-full main branch

**Future Updates**:
When any of these change, update the corresponding documentation:
1. New portal added → Update PORTAL_CONFIGURATIONS.md
2. Playwright config changed → Update PLAYWRIGHT_SETUP_GUIDE.md
3. Login flow changed → Update LOGIN_SELECTORS_AND_ENDPOINTS.md
4. Test user credentials rotated → Update all three guides

---

## Quick Commands Reference

```bash
# Admin Portal
cd /Users/ramondenoronha/Dev/DIL/ASR-full/admin-portal
npm run test:e2e                      # Run all tests
npx playwright test --ui              # Interactive mode
npx playwright test --headed          # See browser
npx playwright test --debug           # Debug mode

# Member Portal
cd /Users/ramondenoronha/Dev/DIL/ASR-full/member-portal
npx playwright test                   # Run all tests
npx playwright test --project=firefox # Specific browser
npx playwright test --project='Mobile Chrome'  # Mobile

# Booking Portal
cd /Users/ramondenoronha/Dev/DIL/ASR-full/booking-portal
npx playwright test
npx playwright show-report            # View results

# Orchestrator Portal
cd /Users/ramondenoronha/Dev/DIL/ASR-full/orchestrator-portal
npm run mock-api &                    # Start mock API
npm run dev &                         # Start app
npx playwright test                   # Run tests

# Documentation Portal
cd /Users/ramondenoronha/Dev/DIL/ASR-full/ctn-docs-portal
npx playwright test                   # Tests run against production
```

---

## Support & Questions

For specific questions about:
- **Test execution**: See PLAYWRIGHT_SETUP_GUIDE.md
- **Selectors & automation**: See LOGIN_SELECTORS_AND_ENDPOINTS.md
- **Portal architecture**: See PORTAL_CONFIGURATIONS.md

All documentation includes examples and common issue solutions.

