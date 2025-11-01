# CTN Monorepo - Portal Configuration Summary

## Overview
The CTN monorepo contains 5 distinct portals across different applications:
- **3 ASR (Association Register) Portals**: Single-tenant, tightly coupled
- **2 Independent Portals**: Multi-tenant (DocuFlow/Booking) and Documentation

---

## Portal Configurations

### 1. ADMIN PORTAL (Association Register)
**Single-tenant management portal for system and association administrators**

#### Directory & Entry Points
- **Path**: `/Users/ramondenoronha/Dev/DIL/ASR-full/admin-portal`
- **Main Entry**: `src/index.tsx`
- **App Component**: `src/App.tsx`
- **HTML Entry**: `index.html` (port 3000, auto-opens)

#### Production URLs
- **Production**: https://calm-tree-03352ba03.1.azurestaticapps.net
- **Development**: http://localhost:3000 (local dev)

#### Configuration Files
- **Vite Config**: `vite.config.ts` (port 3000, React + SVG support)
- **Environment Files**:
  - `.env` (Playwright E2E config)
  - `.env.production` (Azure client ID, tenant ID, API endpoint)
  - `.env.test` (Test user credentials for E2E)
  - `.env.template` (Template)

#### MSAL Configuration
```
Client ID: d3037c11-a541-4f21-8862-8079137a0cde
Tenant ID: 598664e7-725c-4daa-bd1f-89c4ada717ff
Authority: https://login.microsoftonline.com/598664e7-725c-4daa-bd1f-89c4ada717ff
Redirect URI: https://calm-tree-03352ba03.1.azurestaticapps.net
API URL: https://func-ctn-demo-asr-dev.azurewebsites.net/api/v1
```

#### Authentication Details
- **Auth Type**: Azure Entra ID (MSAL)
- **Auth Context File**: `src/auth/AuthContext.tsx`
- **Auth Config File**: `src/auth/authConfig.ts`
- **Configuration Method**: Uses import.meta.env.VITE_* variables
- **Scopes**: User.Read, openid, profile, email
- **API Scopes**: api://{clientId}/access_as_user
- **Cache**: sessionStorage
- **Session Timeout**: 30 minutes idle timeout
- **Token Refresh**: 5 minutes before expiry

#### User Roles
```typescript
enum UserRole {
  SYSTEM_ADMIN = 'SystemAdmin',
  ASSOCIATION_ADMIN = 'AssociationAdmin',
  MEMBER = 'Member',
}
```

#### Portal Access Control
- **Admin Portal Access**: SystemAdmin, AssociationAdmin
- **Member Portal Access**: Member, AssociationAdmin (can view)

#### Router Configuration
- **Framework**: React Router v6
- **Main Routes** (src/App.tsx):
  - Public: `/login`, `/mfa-required`, `/unauthorized`
  - Protected: `/*` (all admin portal routes)
  - Catch-all: `/404`

#### Components & Navigation
- **Main Component**: `AdminPortal` (src/components/AdminPortal.tsx)
- **Default Landing Page**: Admin Portal dashboard (after `/*` route)
- **Login Button Selector**: Microsoft Sign-in button (Azure AD)
- **User Info Display**: `.user-info`, `.user-name` classes
- **Logout Button**: Located in header

#### Playwright Configuration
- **Config File**: `playwright.config.ts`
- **Test Directory**: `./e2e`
- **Base URL**: https://calm-tree-03352ba03.1.azurestaticapps.net
- **Auth State**: Stored in `playwright/.auth/user.json`
- **Test User**: test-e2@denoronha.consulting / Madu5952
- **Browsers**: Chromium (default, only one configured)
- **Timeout**: 60 seconds per test
- **Global Setup**: `playwright/global-setup.ts`
- **Screenshots/Video**: Enabled on failure

#### Test Files Structure
```
e2e/
├── admin-portal/
│   ├── authentication.spec.ts
│   ├── accessibility.spec.ts
│   ├── identifiers-crud.spec.ts
│   ├── members-grid-row-click.spec.ts
│   └── ... (10+ test files)
├── quick-test.spec.ts
├── critical-flows.spec.ts
└── ... (40+ test files total)
```

#### Selectors for Playwright (from tests)
```
User Info: .user-info, .user-name, [data-testid="user-name"]
User Role: .user-role, [data-testid="user-role"]
Login Page: Check for login.microsoftonline.com redirect
Admin Portal Elements: Kendo UI components (grids, buttons, forms)
```

---

### 2. MEMBER PORTAL (Association Register)
**Self-service portal for organization members to manage profiles and integrations**

#### Directory & Entry Points
- **Path**: `/Users/ramondenoronha/Dev/DIL/ASR-full/member-portal`
- **Main Entry**: `src/index.tsx`
- **App Component**: `src/App.tsx`
- **HTML Entry**: `index.html` (port 3001, auto-opens)

#### Production URLs
- **Production**: https://calm-pebble-043b2db03.1.azurestaticapps.net
- **Development**: http://localhost:3001 (local dev)

#### Configuration Files
- **Vite Config**: `vite.config.ts` (port 3001, mode-based env variables)
- **Environment Files**:
  - `.env` (Playwright BASE_URL)
  - `.env.production` (Azure/API configuration)
  - `.env.example` (Template)

#### MSAL Configuration
```
Client ID: d3037c11-a541-4f21-8862-8079137a0cde
Authority: https://login.microsoftonline.com/598664e7-725c-4daa-bd1f-89c4ada717ff
Redirect URI: https://calm-pebble-043b2db03.1.azurestaticapps.net
API Base URL: https://func-ctn-demo-asr-dev.azurewebsites.net/api/v1
```

#### Authentication Details
- **Auth Type**: Azure Entra ID (MSAL React)
- **Auth Config File**: `src/auth/authConfig.ts`
- **Configuration Method**: Uses process.env.VITE_* variables
- **Scopes**: User.Read, openid, profile, email, api://{clientId}/Member.Read
- **Cache**: sessionStorage
- **MSAL Provider**: Wraps entire app in MsalProvider

#### Router Configuration
- **Framework**: React Router v6
- **Uses**: AuthenticatedTemplate, UnauthenticatedTemplate from @azure/msal-react
- **Main Routes** (src/App.tsx):
  - Unauthenticated: Welcome page with "Sign In with Azure AD", "Register as Member" buttons
  - Authenticated: Tab-based navigation

#### Tab Navigation
After successful authentication, user sees these tabs:
1. **Dashboard** - Overview and member summary
2. **Organization Profile** - Legal details, LEI, KvK info
3. **Contacts** - Contact management
4. **System Integrations** - API endpoints configuration
5. **API Access** - API key and token management
6. **DNS Verification** - Domain verification
7. **Support** - Help and support

#### Default Landing Page
- **Unauthenticated**: Welcome page with login/register options
- **Authenticated**: Dashboard tab

#### Components & Navigation
- **Header**: Logo, Member Portal title, Language switcher, User name, Sign Out button
- **Login Buttons**: "Sign In with Azure AD", "Register as Member"
- **Sign Out Button**: Located in header (uses msal.logoutRedirect)

#### Playwright Configuration
- **Config File**: `playwright.config.ts`
- **Test Directory**: `./e2e`
- **Base URL**: https://calm-pebble-043b2db03.1.azurestaticapps.net
- **Browsers**: Chromium, Firefox, Webkit (desktop), Mobile Chrome, Mobile Safari
- **Timeout**: 30 seconds per test
- **Screenshots/Video**: Enabled on failure
- **No Global Setup**: Tests run directly without pre-auth setup

#### Test Files Structure
```
e2e/
├── web/e2e/
│   ├── vite-migration/
│   │   ├── admin-portal.spec.ts
│   │   └── member-portal.spec.ts
│   └── member-portal.spec.ts
├── security-headers.spec.ts
└── ... (additional test files)
```

#### Selectors for Playwright
```
Login Button: Text "Sign In with Azure AD"
Register Button: Text "Register as Member"
Sign Out Button: "🚪 Sign Out"
User Name Display: .user-name
Tab Navigation: .tab-button (multiple elements)
Dashboard Tab: .tab-button.active (when "dashboard" activeTab)
```

---

### 3. BOOKING PORTAL (DocuFlow - Multi-Tenant)
**Terminal operators and freight forwarders manage bookings and document uploads**

#### Directory & Entry Points
- **Path**: `/Users/ramondenoronha/Dev/DIL/ASR-full/booking-portal`
- **Web Frontend**: `booking-portal/web/src/main.tsx`
- **Backend API**: `booking-portal/api/` (separate Node.js Functions)
- **HTML Entry**: `web/index.html` (port 3000, local proxy to API)

#### Production URLs
- **Production**: https://calm-mud-024a8ce03.1.azurestaticapps.net
- **Development**: http://localhost:3000 (local dev)

#### Configuration Files
- **Vite Config**: `vite.config.ts` (port 3000, proxy to http://localhost:7071)
- **Environment**: `.env` (Azure subscription, tenant, API URL)
- **API Config**: `src/config/api.ts`

#### Backend Configuration
```
API Base URL: https://func-ctn-booking-prod.azurewebsites.net
Azure Tenant: 598664e7-725c-4daa-bd1f-89c4ada717ff
Azure Subscription: add6a89c-7fb9-4f8a-9d63-7611a617430e
```

#### Authentication Details
- **Auth Type**: Custom Authentication (AuthContext with MSAL, similar to booking)
- **Auth Context File**: `web/src/auth/AuthContext.tsx`
- **Auth Config File**: `web/src/auth/authConfig.ts`
- **Configuration Method**: Uses import.meta.env.VITE_* variables
- **MSAL Instance**: Initialized in authConfig

#### User Roles (Booking Portal Specific)
```typescript
enum UserRole {
  SYSTEM_ADMIN = 'System Admin',  // Note: space in name
  TERMINAL_OPERATOR = 'TerminalOperator',
  FREIGHT_FORWARDER = 'FreightForwarder',
}
```

#### Router Configuration
- **Framework**: React Router v6
- **Main Routes** (src/App.tsx):
  - Public: `/login`, `/unauthorized`
  - Protected: All other routes via ProtectedRoute
  - Dashboard (default landing)

#### Protected Routes
- `/` redirects to `/dashboard`
- `/dashboard` - Main dashboard
- `/upload` - Document upload page
- `/bookings` - Bookings grid
- `/validate/:bookingId` - Validation details
- `/admin` - Admin panel

#### Components & Navigation
- **Header Component**: Navigation with portal name
- **Main Layout**: app-container, main-content, content-area structure
- **Default Landing**: Dashboard page after login

#### Playwright Configuration
- **Config File**: `playwright.config.ts`
- **Test Directory**: `./e2e`
- **Base URL**: https://calm-mud-024a8ce03.1.azurestaticapps.net (env: BOOKING_PORTAL_URL)
- **Browsers**: Chromium (default)
- **Reporter**: HTML report

#### Test Files
```
e2e/
├── bookings-grid-journey-timeline.spec.ts
├── document-upload-progress.spec.ts
├── transport-order-validation.spec.ts
├── week3-ux-improvements.spec.ts
└── ... (additional tests)

web/e2e/
├── pdf-viewer-diagnosis.spec.ts
├── tests/debug-upload.spec.ts
└── ... (additional tests)

api/e2e/
└── capture-upload-error.spec.ts
```

---

### 4. ORCHESTRATOR PORTAL (Independent - Multi-Tenant)
**Workflow and process orchestration management**

#### Directory & Entry Points
- **Path**: `/Users/ramondenoronha/Dev/DIL/ASR-full/orchestrator-portal`
- **Main Entry**: `src/main.tsx`
- **App Component**: `src/App.tsx`
- **HTML Entry**: `index.html` (port 5173)

#### Production URLs
- **Production**: Not yet deployed to production
- **Development**: http://localhost:5173 (local dev)

#### Configuration Files
- **Vite Config**: `vite.config.ts` (port 5173, dist output)
- **No .env files in root** - Uses process.env directly in Vite define block

#### Authentication Details
- **Auth Type**: Custom Auth Store with Zustand (authStore)
- **Auth Store**: `src/stores/authStore.ts`
- **No MSAL Configuration**: Uses local authentication or API-based auth

#### Router Configuration
- **Framework**: React Router v6
- **Main Routes** (src/App.tsx):
  - Public: `/login`
  - Protected: `/*` (all other routes)

#### Protected Routes
All routes wrapped in ProtectedRoute that checks authStore.isAuthenticated

#### Playwright Configuration
- **Config File**: `playwright.config.ts`
- **Test Directory**: `./e2e`
- **Base URL**: http://localhost:5173
- **Browsers**: Chromium, Firefox
- **Web Servers**: 
  - Main app on port 5173 (npm run dev)
  - Mock API on port 3001 (npm run mock-api)
- **Timeout**: 30 seconds per test

#### Test Files
```
e2e/
├── auth.spec.ts
├── dashboard.spec.ts
├── orchestrations.spec.ts
├── events.spec.ts
├── webhooks.spec.ts
└── analytics.spec.ts
```

---

### 5. DOCUMENTATION PORTAL (Static Site - No Authentication)
**Static documentation and Arc42 architecture reference**

#### Directory & Entry Points
- **Path**: `/Users/ramondenoronha/Dev/DIL/ASR-full/ctn-docs-portal`
- **Source**: `src/` (CSS, JS, templates - no React app)
- **Build Output**: `public/` (static HTML files)
- **HTML Entry**: `public/index.html` (generated from markdown)

#### Production URLs
- **Production**: https://ambitious-sky-098ea8e03.2.azurestaticapps.net
- **Development**: http://localhost:8080 (local dev)

#### Build Process
```
Scripts transform markdown docs → HTML
No runtime authentication
Pure static site generator
```

#### Configuration Files
- **Environment**: `.env` (Azure subscription, tenant - for CI/CD)
- **No Vite Config**: Custom Node.js build scripts
- **Package.json Scripts**:
  - `npm run build` - Generate static site
  - `npm run dev` - Build + serve locally
  - `npm run watch` - Watch markdown files and rebuild

#### Markdown Processing
- **Input**: `docs/` folder (markdown files)
- **Processing**: Scripts convert markdown to HTML with Arc42 formatting
- **Output**: `public/` folder (static HTML + assets)

#### Playwright Configuration
- **Config File**: `playwright.config.ts`
- **Test Directory**: `./e2e`
- **Base URL**: https://ambitious-sky-098ea8e03.2.azurestaticapps.net (production)
- **Browsers**: Chromium (desktop), iPhone 13 (mobile)
- **No Web Server**: Tests against live production only
- **Tests**: Navigation, branding, error pages, accessibility, security headers

#### Test Files
```
e2e/
├── home-page.spec.ts
├── navigation.spec.ts
├── branding.spec.ts
├── error-pages.spec.ts
├── accessibility.spec.ts
└── security-headers.spec.ts
```

---

## Cross-Portal Information

### Shared MSAL Client ID
```
Client ID: d3037c11-a541-4f21-8862-8079137a0cde
Tenant ID: 598664e7-725c-4daa-bd1f-89c4ada717ff
```

This is shared across:
- Admin Portal
- Member Portal
- Booking Portal (with fallback defaults)

### E2E Test User (All ASR Portals)
```
Email: test-e2@denoronha.consulting
Password: Madu5952
Object ID: 7e093589-f654-4e53-9522-898995d1201b
Role: SystemAdmin
```

**Important**: This user is excluded from MFA requirements for automated testing.

### API Endpoints
- **ASR API**: https://func-ctn-demo-asr-dev.azurewebsites.net/api/v1
- **Booking API**: https://func-ctn-booking-prod.azurewebsites.net

### Build Output Directories
- **Admin Portal**: `admin-portal/build/`
- **Member Portal**: `member-portal/build/`
- **Booking Portal**: `booking-portal/web/build/`
- **Orchestrator Portal**: `orchestrator-portal/dist/`
- **Docs Portal**: `ctn-docs-portal/public/`

### Testing Framework
- **Tool**: Playwright
- **Config Pattern**: Each portal has `playwright.config.ts`
- **Auth State**: Admin portal uses `playwright/.auth/user.json`
- **Test Organization**: `e2e/` directories (or `e2e/admin-portal/` for admin)

---

## Summary Table

| Portal | Type | Auth | Client ID | Production URL | Dev Port | Tests |
|--------|------|------|-----------|---------------|---------|----|
| Admin | ASR | MSAL | d3037... | calm-tree-... | 3000 | 40+ |
| Member | ASR | MSAL | d3037... | calm-pebble-... | 3001 | 10+ |
| Booking | DocuFlow | MSAL | d3037... | calm-mud-... | 3000 | 10+ |
| Orchestrator | Independent | Zustand | N/A | localhost | 5173 | 6 |
| Docs | Static | None | N/A | ambitious-sky-... | 8080 | 6 |

