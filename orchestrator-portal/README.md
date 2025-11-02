# CTN Orchestrator Portal

A modern, real-time monitoring and management portal for Container Transport Network (CTN) orchestrations, built with React 18, TypeScript, and Mantine v8.

**Status:** ⚠️ **IN DEVELOPMENT - API NOT DEPLOYED**

---

## ⚠️ IMPORTANT - API Status

This portal is **deployed to Azure** but requires Orchestrations API endpoints that are **not yet implemented in production**:

**Missing Endpoints:**
- `GET /api/v1/orchestrations` - List orchestrations
- `GET /api/v1/orchestrations/:id` - Get orchestration details
- `GET /api/v1/events` - List events
- `GET /api/v1/webhooks` - List webhooks

**Current API:** https://func-ctn-demo-asr-dev.azurewebsites.net/api/v1

**Portal URL:** https://blue-dune-0353f1303.1.azurestaticapps.net (deployed but will show empty due to missing API)

### Options

**Option 1: Use Mock API (Development Only)**
```bash
cd orchestrator-portal
npm run mock-api:dev  # Starts mock API on http://localhost:3001
npm run dev           # Starts portal on http://localhost:5173
```

**Option 2: Wait for API Implementation**
- **Status:** Coming Soon
- **Estimated Effort:** 8 hours to build orchestrations API backend
- Portal is fully built and tested, just waiting for API deployment

**Option 3: Build Orchestrations API**
- Create new Azure Functions for orchestrations, events, and webhooks
- Implement business logic for container transport orchestrations
- Deploy to `func-ctn-demo-asr-dev`

---

## Overview

The Orchestrator Portal provides real-time visibility into container transport orchestrations across the CTN ecosystem. It enables operations teams to monitor shipments, track events, manage webhooks, and analyze orchestration performance.

### Key Features

- **Real-time Dashboard** - Live statistics with orchestration status breakdown
- **Orchestration Management** - Search, filter, and monitor all orchestrations
- **Event Stream** - Real-time event feed with auto-refresh (5-second polling)
- **Webhook Management** - Configure and monitor webhook deliveries
- **Analytics** - Visual insights with priority breakdown charts
- **Multi-Tenant Support** - Isolated data access per organization
- **Comprehensive Testing** - 72 E2E tests with Playwright

---

## Technology Stack

### Frontend
- **React 18.3.1** - Modern React with hooks
- **TypeScript 5.9.3** - Type-safe development
- **Vite 7.1.10** - Lightning-fast build tool
- **Mantine 8.3.6** - Professional UI component library
  - mantine-datatable for data grids
  - Buttons, inputs, modals, notifications
- **Recharts** - React charting library for data visualization
- **TanStack Query 5.32.0** - Powerful data fetching and caching
- **Zustand 4.5.2** - Lightweight state management
- **React Router 7.9.3** - Client-side routing

### Styling
- **Tailwind CSS 3.4.3** - Utility-first CSS framework
- **Mantine Styles** - Built-in Mantine styling system
- **Lucide React 0.545.0** - Beautiful icon library

### Development Tools
- **Biome 1.9.4** - Fast linting and formatting
- **Playwright 1.56.1** - E2E testing framework
- **json-server 1.0.0-beta.3** - Mock API server

---

## Installation

### Prerequisites
- **Node.js 20.x** or higher
- **npm** or **yarn**

### Setup

```bash
# Clone the repository
git clone <repository-url>
cd orchestrator-portal

# Install dependencies
npm install

# Configure environment variables
cp .env.example .env

# Edit .env with your configuration
nano .env
```

### Environment Variables

Create a `.env` file in the project root:

```bash
# API Configuration
VITE_API_BASE_URL=http://localhost:3001/api/v1
```

---

## Development Workflow

### Start Development Server

```bash
# Terminal 1: Start the mock API server
npm run mock-api:dev

# Terminal 2: Start the Vite dev server
npm run dev
```

The application will be available at: **http://localhost:5173**

The mock API will be available at: **http://localhost:3001**

### Available Scripts

```bash
# Development
npm run dev                 # Start Vite dev server
npm run mock-api:dev        # Start mock API with auto-reload
npm run mock-api:generate   # Regenerate mock database

# Building
npm run build              # TypeScript compilation + production build
npm run typecheck          # Type checking without build
npm run preview            # Preview production build locally

# Code Quality
npm run lint               # Check code with Biome
npm run lint:fix           # Auto-fix Biome issues
npm run format             # Format code with Biome

# Testing
npm run test:e2e           # Run Playwright E2E tests
npm run test:e2e:ui        # Run tests with Playwright UI
npm run test:e2e:headed    # Run tests in headed mode
npm run test:e2e:debug     # Debug tests
npm run test:e2e:report    # Show test report
```

---

## Login Credentials

The mock API provides two test users for different tenants:

### ITG User
- **Email:** `admin@itg.nl`
- **Password:** `password123`
- **Tenant:** Inland Terminals Group
- **Access:** ITG orchestrations

### Rotterdam User
- **Email:** `admin@rotterdam.nl`
- **Password:** `password123`
- **Tenant:** Rotterdam Container Terminal
- **Access:** Rotterdam orchestrations

---

## Architecture Overview

### Folder Structure

```
orchestrator-portal/
├── public/                 # Static assets
├── src/
│   ├── components/        # React components
│   │   ├── analytics/     # Analytics page components
│   │   ├── common/        # Reusable components
│   │   ├── events/        # Event feed components
│   │   ├── layout/        # Layout components (header, drawer)
│   │   ├── orchestrations/ # Orchestration components
│   │   └── webhooks/      # Webhook management components
│   ├── hooks/             # Custom React hooks
│   │   ├── useEvents.ts   # Event data fetching
│   │   ├── useOrchestrations.ts # Orchestration data
│   │   └── useWebhooks.ts # Webhook data
│   ├── pages/             # Page components
│   │   ├── DashboardPage.tsx
│   │   ├── OrchestrationsPage.tsx
│   │   ├── OrchestrationDetailPage.tsx
│   │   ├── EventsPage.tsx
│   │   ├── WebhooksPage.tsx
│   │   ├── AnalyticsPage.tsx
│   │   └── LoginPage.tsx
│   ├── services/          # API services
│   │   ├── orchestrations.ts
│   │   ├── events.ts
│   │   └── webhooks.ts
│   ├── stores/            # Zustand stores
│   │   ├── authStore.ts   # Authentication state
│   │   └── tenantStore.ts # Tenant state
│   ├── types/             # TypeScript types
│   │   ├── orchestration.ts
│   │   ├── event.ts
│   │   └── webhook.ts
│   ├── utils/             # Utility functions
│   ├── App.tsx            # Root component
│   └── main.tsx           # Application entry point
├── e2e/                   # Playwright E2E tests (72 tests)
├── mock-api/              # Mock API server
│   ├── data/              # Data generators
│   ├── docs/              # API documentation
│   └── server.js          # Custom json-server
├── docs/                  # Project documentation
└── package.json
```

### Component Hierarchy

```
App
├── LoginPage (unauthenticated)
└── MainLayout (authenticated)
    ├── Header
    │   ├── Tenant Selector
    │   └── User Menu
    ├── AppDrawer (Navigation)
    └── Page Content
        ├── DashboardPage
        │   ├── StatCards (4)
        │   ├── StatusDonutChart
        │   └── RecentActivityFeed
        ├── OrchestrationsPage
        │   ├── OrchestrationsGrid (mantine-datatable)
        │   ├── StatusFilter
        │   └── SearchBar
        ├── OrchestrationDetailPage
        │   ├── OrchestrationInfo
        │   ├── PartiesTable
        │   ├── RouteInfo
        │   └── RecentEvents
        ├── EventsPage
        │   ├── EventFeed
        │   └── EventTypeFilter
        ├── WebhooksPage
        │   └── WebhooksGrid
        └── AnalyticsPage
            ├── PriorityChart
            └── FilterControls
```

### State Management

**Zustand Stores:**

1. **authStore.ts** - Authentication state
   - User credentials
   - Login/logout actions
   - Auth status

2. **tenantStore.ts** - Tenant selection
   - Current tenant
   - Tenant switching
   - Tenant-filtered data

### Data Fetching

**TanStack Query Hooks:**

1. **useOrchestrations(tenantId, filters)** - Fetch orchestrations
   - Pagination support
   - Search and filtering
   - Auto-refetch on filter changes

2. **useEvents(filters)** - Fetch events
   - Real-time polling (5-second interval)
   - Event type filtering
   - Pagination

3. **useWebhooks(tenantId)** - Fetch webhooks
   - Webhook list
   - Delivery statistics

### Routing Structure

```typescript
/ - Redirect to /dashboard or /login
/login - Login page
/dashboard - Dashboard with stats and activity feed
/orchestrations - Orchestrations grid
/orchestrations/:id - Orchestration detail page
/events - Real-time event stream
/webhooks - Webhook management
/analytics - Analytics and charts
```

---

## Mock API Design

The mock API provides realistic test data for development and testing.

### Features
- **45 orchestrations** (27 root, 18 child)
- **287 events** across 19 event types
- **7 webhooks** with delivery stats
- **2 tenants** (ITG, Rotterdam)
- **Realistic data** - Container IDs, BOL numbers, routes
- **Pagination** - Server-side pagination with headers
- **Filtering** - By tenant, status, type, search term

### Endpoints

```
GET    /api/v1/tenants
GET    /api/v1/orchestrations
GET    /api/v1/orchestrations/:id
POST   /api/v1/orchestrations
PATCH  /api/v1/orchestrations/:id
GET    /api/v1/events
GET    /api/v1/webhooks
GET    /health
```

### Data Generation

Mock data is generated with realistic patterns:

- **Container IDs:** MSCU1234567 (4 letters + 7 numbers)
- **BOL Numbers:** BOL-2025-12345
- **Routes:** Rotterdam → Duisburg, Amsterdam → Basel, etc.
- **Parties:** Realistic company names with proper roles
- **Timestamps:** Events from last 30 days

See `mock-api/docs/` for full API specification and integration examples.

---

## Mantine UI Integration Patterns

### Grid Usage

```typescript
import { DataTable, useDataTableColumns } from 'mantine-datatable';

const { effectiveColumns } = useDataTableColumns({
  key: 'orchestrations-grid',
  columns: [
    { accessor: 'id', title: 'ID', width: 100, sortable: true },
    { accessor: 'containerNumber', title: 'Container', sortable: true },
    { accessor: 'status', title: 'Status', render: StatusCell, sortable: true },
  ],
});

<DataTable
  records={orchestrations}
  columns={effectiveColumns}
  page={page}
  onPageChange={setPage}
  recordsPerPage={pageSize}
  onRecordsPerPageChange={setPageSize}
  recordsPerPageOptions={[10, 20, 50]}
  onRowClick={({ record }) => handleRowClick(record)}
  withTableBorder
  striped
  highlightOnHover
/>
```

### Charts Usage (Recharts)

```typescript
import { PieChart, Pie, Cell, Legend, Tooltip } from 'recharts';

<PieChart width={400} height={400}>
  <Pie
    data={statusData}
    dataKey="count"
    nameKey="status"
    cx="50%"
    cy="50%"
    innerRadius={60}
    outerRadius={80}
  >
    {statusData.map((entry, index) => (
      <Cell key={`cell-${index}`} fill={COLORS[index]} />
    ))}
  </Pie>
  <Tooltip />
  <Legend />
</PieChart>
```

---

## Testing

### E2E Test Coverage

**72 Playwright tests** across 6 test suites:

1. **Authentication Tests** (auth.spec.ts)
   - Login flow
   - Logout flow
   - Session persistence

2. **Dashboard Tests** (dashboard.spec.ts)
   - Stat cards rendering
   - Chart display
   - Recent activity feed

3. **Orchestrations Tests** (orchestrations.spec.ts)
   - Grid display and pagination
   - Search functionality
   - Status filtering
   - Row navigation

4. **Events Tests** (events.spec.ts)
   - Event feed rendering
   - Real-time updates
   - Event type filtering

5. **Webhooks Tests** (webhooks.spec.ts)
   - Webhook list display
   - Test webhook functionality
   - Edit webhook modal

6. **Analytics Tests** (analytics.spec.ts)
   - Chart rendering
   - Filter options
   - Export capabilities

### Running Tests

```bash
# Run all tests
npm run test:e2e

# Run with UI mode (recommended for debugging)
npm run test:e2e:ui

# Run in headed mode (see browser)
npm run test:e2e:headed

# Debug specific test
npm run test:e2e:debug -- orchestrations.spec.ts

# View last test report
npm run test:e2e:report
```

### Authentication Fixtures

Tests use reusable authentication fixtures to avoid repetitive login:

```typescript
// e2e/fixtures/auth.ts
export const authenticatedPage = test.extend({
  page: async ({ page }, use) => {
    await page.goto('/login');
    await page.fill('input[name="email"]', 'admin@itg.nl');
    await page.fill('input[name="password"]', 'password123');
    await page.click('button[type="submit"]');
    await use(page);
  },
});
```

---

## Build Instructions

### Development Build

```bash
npm run build
```

**Output:**
- Type checking with TypeScript
- Vite production build
- Optimized bundle in `dist/` folder
- Build size: ~1.2MB (includes Mantine + Recharts)

### Build Artifacts

```
dist/
├── index.html
├── assets/
│   ├── index-[hash].js    # Main application bundle
│   ├── index-[hash].css   # Compiled styles
│   └── vendor-[hash].js   # Third-party dependencies
└── favicon.ico
```

### Production Deployment

```bash
# Build for production
npm run build

# Preview production build locally
npm run preview

# Deploy dist/ folder to your hosting provider
# (Azure Static Web Apps, Netlify, Vercel, etc.)
```

---

## Code Quality

### Linting and Formatting

The project uses **Biome** for fast, consistent code quality:

```bash
# Check code quality
npm run lint

# Auto-fix issues
npm run lint:fix

# Format code
npm run format
```

### Configuration

**biome.json:**
- TypeScript strict mode
- React best practices
- Consistent formatting
- Import sorting

**Current Status:**
- TypeScript: Zero compilation errors
- Production build: Successful
- Biome warnings: 20 (mostly in mock-api, not production code)

---

## Security Considerations

### Authentication
- Session-based authentication
- Protected routes
- Automatic logout on token expiration

### API Security
- CORS configuration
- Tenant isolation
- Input validation

### Production Checklist
- [ ] Replace mock API with production endpoints
- [ ] Configure Azure AD authentication
- [ ] Set up HTTPS/TLS certificates
- [ ] Enable security headers
- [ ] Configure CSP (Content Security Policy)
- [ ] Set up API rate limiting
- [ ] Enable audit logging

---

## Performance

### Build Performance
- **TypeScript compilation:** <1 second
- **Vite build:** ~5 seconds
- **Bundle size:** 1.5MB (gzipped: ~400KB)

### Runtime Performance
- **Initial load:** <2 seconds
- **Time to interactive:** <3 seconds
- **Event polling:** 5-second interval (configurable)
- **Grid pagination:** Client-side (20 items per page)

### Optimization Strategies
- Code splitting by route
- Lazy loading of charts
- TanStack Query caching
- Virtualized grids for large datasets

---

## Troubleshooting

### Mock API Not Starting

```bash
# Check if port 3001 is already in use
lsof -i :3001

# Kill the process
kill -9 <PID>

# Regenerate database
npm run mock-api:generate
```

### Build Errors

```bash
# Clear node_modules and reinstall
rm -rf node_modules package-lock.json
npm install

# Clear Vite cache
rm -rf node_modules/.vite

# Rebuild
npm run build
```

### TypeScript Errors

```bash
# Run type checking only
npm run typecheck

# Check for missing types
npm install --save-dev @types/node
```

---

## Browser Support

- **Chrome/Edge:** Latest 2 versions
- **Firefox:** Latest 2 versions
- **Safari:** Latest 2 versions
- **Mobile:** iOS Safari 14+, Chrome Android

---

## Contributing

### Development Guidelines

1. **Code Style:** Use Biome for formatting
2. **Type Safety:** No `any` types (use `unknown` with type guards)
3. **Testing:** Add E2E tests for new features
4. **Documentation:** Update README and docs/ for significant changes

### Commit Message Format

```
feat: Add webhook retry functionality
fix: Resolve grid pagination bug
docs: Update API documentation
test: Add E2E tests for analytics page
```

---

## Related Documentation

- **[ARCHITECTURE.md](./docs/ARCHITECTURE.md)** - Technical architecture details
- **[Mock API Documentation](./mock-api/docs/README.md)** - API specification
- **[Test Report](./TEST_REPORT.md)** - Latest E2E test results

---

## License

Proprietary - CTN Association Register

---

## Support

For questions or issues:

1. Check the documentation in `docs/`
2. Review the mock API docs in `mock-api/docs/`
3. Contact the development team

---

**Built with React, TypeScript, and Mantine v8**
