# Orchestrator Portal - Technical Architecture

**Version:** 1.0.0
**Last Updated:** October 18, 2025

---

## Table of Contents

1. [Overview](#overview)
2. [Architectural Principles](#architectural-principles)
3. [Folder Structure](#folder-structure)
4. [Component Architecture](#component-architecture)
5. [State Management](#state-management)
6. [Data Fetching Strategy](#data-fetching-strategy)
7. [Routing Structure](#routing-structure)
8. [Mock API Design](#mock-api-design)
9. [Kendo UI Integration](#kendo-ui-integration)
10. [Testing Architecture](#testing-architecture)
11. [Build and Deployment](#build-and-deployment)
12. [Performance Optimization](#performance-optimization)

---

## Overview

The Orchestrator Portal is a modern React 18 application built with TypeScript, Vite, and Kendo React UI. It provides real-time monitoring and management of container transport orchestrations for the CTN (Connected Trade Network) ecosystem.

### Key Architectural Decisions

- **React 18 with Hooks** - Modern functional components, no class components
- **TypeScript** - Strict type safety, minimal use of `any`
- **Vite** - Fast build tool with HMR (Hot Module Replacement)
- **Kendo React UI** - Professional UI components for grids, charts, and forms
- **TanStack Query** - Server state management with caching and auto-refetch
- **Zustand** - Lightweight client state management
- **React Router v7** - Client-side routing with nested routes

---

## Architectural Principles

### 1. Separation of Concerns

- **Pages** - High-level route components
- **Components** - Reusable UI components organized by feature
- **Services** - API communication layer
- **Hooks** - Reusable business logic
- **Stores** - Global state management
- **Types** - TypeScript type definitions

### 2. Component Composition

```
Page Component
  → Layout Component
    → Feature Components
      → Common/Reusable Components
```

### 3. Data Flow

```
API Service
  → TanStack Query Hook
    → Component State
      → UI Rendering
```

### 4. Type Safety

- All API responses are typed
- Props are strictly typed with interfaces
- Event handlers have proper type annotations
- No use of `any` except in test files (use `unknown` instead)

---

## Folder Structure

```
orchestrator-portal/
├── public/                           # Static assets
│   └── favicon.ico
│
├── src/
│   ├── components/                   # React components
│   │   ├── analytics/                # Analytics-specific components
│   │   │   ├── PriorityChart.tsx     # Priority breakdown chart
│   │   │   └── FilterControls.tsx    # Analytics filters
│   │   │
│   │   ├── common/                   # Reusable components
│   │   │   ├── StatCard.tsx          # Dashboard stat cards
│   │   │   ├── StatusBadge.tsx       # Status indicator badges
│   │   │   ├── LoadingSpinner.tsx    # Loading indicator
│   │   │   └── ErrorMessage.tsx      # Error display
│   │   │
│   │   ├── events/                   # Event feed components
│   │   │   ├── EventFeed.tsx         # Real-time event list
│   │   │   ├── EventItem.tsx         # Single event display
│   │   │   └── EventTypeFilter.tsx   # Event type filtering
│   │   │
│   │   ├── layout/                   # Layout components
│   │   │   ├── AppDrawer.tsx         # Navigation sidebar
│   │   │   ├── Header.tsx            # Top navigation bar
│   │   │   └── MainLayout.tsx        # Main layout wrapper
│   │   │
│   │   ├── orchestrations/           # Orchestration components
│   │   │   ├── OrchestrationsGrid.tsx    # Main grid
│   │   │   ├── StatusFilter.tsx          # Status filtering
│   │   │   ├── SearchBar.tsx             # Search functionality
│   │   │   ├── OrchestrationInfo.tsx     # Detail info display
│   │   │   ├── PartiesTable.tsx          # Parties list
│   │   │   └── RouteInfo.tsx             # Route display
│   │   │
│   │   └── webhooks/                 # Webhook components
│   │       ├── WebhooksGrid.tsx      # Webhooks list
│   │       └── WebhookEditModal.tsx  # Edit webhook dialog
│   │
│   ├── hooks/                        # Custom React hooks
│   │   ├── useEvents.ts              # Event data fetching
│   │   ├── useOrchestrations.ts      # Orchestration data fetching
│   │   └── useWebhooks.ts            # Webhook data fetching
│   │
│   ├── pages/                        # Page components (routes)
│   │   ├── AnalyticsPage.tsx         # /analytics
│   │   ├── DashboardPage.tsx         # /dashboard
│   │   ├── EventsPage.tsx            # /events
│   │   ├── LoginPage.tsx             # /login
│   │   ├── OrchestrationDetailPage.tsx  # /orchestrations/:id
│   │   ├── OrchestrationsPage.tsx    # /orchestrations
│   │   └── WebhooksPage.tsx          # /webhooks
│   │
│   ├── services/                     # API services
│   │   ├── events.ts                 # Event API calls
│   │   ├── orchestrations.ts         # Orchestration API calls
│   │   └── webhooks.ts               # Webhook API calls
│   │
│   ├── stores/                       # Zustand stores
│   │   ├── authStore.ts              # Authentication state
│   │   └── tenantStore.ts            # Tenant selection state
│   │
│   ├── types/                        # TypeScript types
│   │   ├── event.ts                  # Event types
│   │   ├── orchestration.ts          # Orchestration types
│   │   └── webhook.ts                # Webhook types
│   │
│   ├── utils/                        # Utility functions
│   │   └── dateFormatter.ts          # Date formatting helpers
│   │
│   ├── App.tsx                       # Root component
│   ├── main.tsx                      # Application entry point
│   ├── index.css                     # Global styles
│   ├── kendoLicense.ts               # Kendo license configuration
│   └── vite-env.d.ts                 # Vite type definitions
│
├── e2e/                              # Playwright E2E tests
│   ├── fixtures/                     # Test fixtures
│   │   └── auth.ts                   # Authentication helpers
│   ├── analytics.spec.ts             # Analytics tests
│   ├── auth.spec.ts                  # Authentication tests
│   ├── dashboard.spec.ts             # Dashboard tests
│   ├── events.spec.ts                # Events tests
│   ├── orchestrations.spec.ts        # Orchestrations tests
│   └── webhooks.spec.ts              # Webhooks tests
│
├── mock-api/                         # Mock API server
│   ├── data/                         # Data generators
│   │   ├── events.js                 # Event data generator
│   │   ├── orchestrations.js         # Orchestration data generator
│   │   ├── tenants.js                # Tenant data
│   │   └── webhooks.js               # Webhook data generator
│   │
│   ├── docs/                         # Mock API documentation
│   │   ├── API_SPECIFICATION.md      # Complete API spec
│   │   ├── INTEGRATION_EXAMPLES.md   # Integration examples
│   │   ├── QUICKSTART.md             # Quick start guide
│   │   └── README.md                 # Main documentation
│   │
│   ├── generate-db.js                # Database generation script
│   ├── routes.json                   # API route mappings
│   ├── server.js                     # Custom json-server
│   └── package.json                  # Mock API dependencies
│
├── docs/                             # Project documentation
│   └── ARCHITECTURE.md               # This file
│
├── biome.json                        # Biome configuration
├── package.json                      # Project dependencies
├── playwright.config.ts              # Playwright configuration
├── postcss.config.js                 # PostCSS configuration
├── tailwind.config.js                # Tailwind CSS configuration
├── tsconfig.json                     # TypeScript configuration
├── vite.config.ts                    # Vite configuration
└── README.md                         # Main documentation
```

---

## Component Architecture

### Page Components

Page components are route-level components that:
- Handle URL parameters
- Orchestrate data fetching
- Compose feature components
- Manage page-level state

**Example: DashboardPage.tsx**

```typescript
export const DashboardPage = () => {
  const { currentTenant } = useTenantStore();
  const { data: orchestrations } = useOrchestrations(currentTenant?.id);

  const stats = calculateStats(orchestrations);
  const recentEvents = getRecentEvents(orchestrations);

  return (
    <div className="dashboard">
      <StatCards stats={stats} />
      <StatusDonutChart data={stats} />
      <RecentActivityFeed events={recentEvents} />
    </div>
  );
};
```

### Feature Components

Feature components are domain-specific components:
- **Orchestrations** - Grid, filters, search, detail views
- **Events** - Event feed, event items, type filters
- **Webhooks** - Webhook grid, edit modals
- **Analytics** - Charts, filter controls

**Example: OrchestrationsGrid.tsx**

```typescript
interface OrchestrationsGridProps {
  data: Orchestration[];
  onRowClick: (orchestration: Orchestration) => void;
}

export const OrchestrationsGrid: React.FC<OrchestrationsGridProps> = ({
  data,
  onRowClick,
}) => {
  return (
    <Grid
      data={data}
      pageable={true}
      sortable={true}
      onRowClick={(e) => onRowClick(e.dataItem)}
    >
      <GridColumn field="id" title="ID" width="100px" />
      <GridColumn field="containerNumber" title="Container" />
      <GridColumn field="status" title="Status" cell={StatusCell} />
    </Grid>
  );
};
```

### Common Components

Reusable UI components used across features:
- **StatCard** - Dashboard statistics cards
- **StatusBadge** - Status indicators with color coding
- **LoadingSpinner** - Loading states
- **ErrorMessage** - Error display

**Example: StatusBadge.tsx**

```typescript
interface StatusBadgeProps {
  status: 'active' | 'completed' | 'delayed' | 'cancelled' | 'draft';
}

export const StatusBadge: React.FC<StatusBadgeProps> = ({ status }) => {
  const colorClass = {
    active: 'bg-blue-500',
    completed: 'bg-green-500',
    delayed: 'bg-yellow-500',
    cancelled: 'bg-red-500',
    draft: 'bg-gray-500',
  }[status];

  return (
    <span className={`px-2 py-1 rounded text-white ${colorClass}`}>
      {status.toUpperCase()}
    </span>
  );
};
```

### Layout Components

Layout components provide consistent UI structure:
- **MainLayout** - Wraps all authenticated pages
- **Header** - Top navigation with tenant selector and user menu
- **AppDrawer** - Side navigation menu

---

## State Management

### Global State (Zustand)

Used for client-side state that needs to persist across components:

#### Authentication Store (authStore.ts)

```typescript
interface AuthState {
  user: User | null;
  token: string | null;
  login: (email: string, password: string) => Promise<void>;
  logout: () => void;
  isAuthenticated: boolean;
}

export const useAuthStore = create<AuthState>((set) => ({
  user: null,
  token: null,
  isAuthenticated: false,
  login: async (email, password) => {
    // Mock login logic
    const response = await loginAPI(email, password);
    set({ user: response.user, token: response.token, isAuthenticated: true });
  },
  logout: () => {
    set({ user: null, token: null, isAuthenticated: false });
  },
}));
```

#### Tenant Store (tenantStore.ts)

```typescript
interface TenantState {
  currentTenant: Tenant | null;
  setTenant: (tenant: Tenant) => void;
}

export const useTenantStore = create<TenantState>((set) => ({
  currentTenant: null,
  setTenant: (tenant) => set({ currentTenant: tenant }),
}));
```

### Server State (TanStack Query)

Used for all server data fetching with automatic caching, refetching, and error handling.

**Benefits:**
- Automatic background refetching
- Caching with configurable stale time
- Loading and error states
- Request deduplication
- Optimistic updates

---

## Data Fetching Strategy

### Custom Hooks with TanStack Query

#### useOrchestrations Hook

```typescript
export const useOrchestrations = (
  tenantId?: string,
  filters?: OrchestrationFilters
) => {
  return useQuery({
    queryKey: ['orchestrations', tenantId, filters],
    queryFn: () => fetchOrchestrations(tenantId, filters),
    staleTime: 30000, // 30 seconds
    refetchInterval: 60000, // 1 minute
    enabled: !!tenantId, // Only fetch if tenantId exists
  });
};
```

#### useEvents Hook (Real-time Polling)

```typescript
export const useEvents = (filters?: EventFilters) => {
  return useQuery({
    queryKey: ['events', filters],
    queryFn: () => fetchEvents(filters),
    refetchInterval: 5000, // Poll every 5 seconds
    staleTime: 5000,
  });
};
```

### API Service Layer

All API calls are centralized in service files:

**orchestrations.ts:**

```typescript
export const fetchOrchestrations = async (
  tenantId?: string,
  filters?: OrchestrationFilters
): Promise<Orchestration[]> => {
  const params = new URLSearchParams();

  if (tenantId) params.append('tenantId', tenantId);
  if (filters?.status) params.append('status', filters.status);
  if (filters?.search) params.append('search', filters.search);

  const response = await axios.get(`/api/v1/orchestrations?${params}`);
  return response.data;
};
```

---

## Routing Structure

### Route Configuration (App.tsx)

```typescript
<Routes>
  <Route path="/login" element={<LoginPage />} />

  <Route element={<ProtectedRoute />}>
    <Route element={<MainLayout />}>
      <Route path="/" element={<Navigate to="/dashboard" />} />
      <Route path="/dashboard" element={<DashboardPage />} />
      <Route path="/orchestrations" element={<OrchestrationsPage />} />
      <Route path="/orchestrations/:id" element={<OrchestrationDetailPage />} />
      <Route path="/events" element={<EventsPage />} />
      <Route path="/webhooks" element={<WebhooksPage />} />
      <Route path="/analytics" element={<AnalyticsPage />} />
    </Route>
  </Route>
</Routes>
```

### Protected Routes

```typescript
const ProtectedRoute = () => {
  const { isAuthenticated } = useAuthStore();

  if (!isAuthenticated) {
    return <Navigate to="/login" replace />;
  }

  return <Outlet />;
};
```

### Dynamic Routes

- `/orchestrations/:id` - Orchestration detail page
- URL parameters accessed via `useParams()` hook

---

## Mock API Design

### Architecture

The mock API is built with **json-server** and custom middleware to simulate a production API.

### Components

1. **Data Generators** (`mock-api/data/`)
   - Generate realistic test data
   - Maintain referential integrity
   - Support regeneration

2. **Custom Server** (`mock-api/server.js`)
   - Custom middleware for filtering
   - Pagination support
   - Request logging
   - Response headers

3. **Route Mappings** (`mock-api/routes.json`)
   - Maps `/api/v1/*` to json-server resources

### Custom Middleware Features

```javascript
// Orchestration filtering
if (req.query.search) {
  const search = req.query.search.toLowerCase();
  filteredData = filteredData.filter(o =>
    o.containerNumber.toLowerCase().includes(search) ||
    o.bolNumber.toLowerCase().includes(search)
  );
}

// Pagination headers
res.setHeader('X-Total-Count', filteredData.length);
res.setHeader('X-Page', page);
res.setHeader('X-Per-Page', limit);
```

### Data Generation Strategy

**Realistic Data Patterns:**

```javascript
// Container ID format: MSCU1234567
const containerLines = ['MSCU', 'MAEU', 'TRIU', 'HLCU', 'COSU'];
const containerId = `${randomLine}${randomNumber(1000000, 9999999)}`;

// BOL number format: BOL-2025-12345
const bolNumber = `BOL-2025-${randomNumber(10000, 99999)}`;

// Timestamps: Events from last 30 days
const timestamp = new Date(Date.now() - randomDays * 24 * 60 * 60 * 1000);
```

---

## Kendo UI Integration

### Grid Integration

**Features Used:**
- Pagination with customizable page sizes
- Sorting on all columns
- Row click handling
- Custom cell renderers

```typescript
<Grid
  data={orchestrations}
  pageable={{
    buttonCount: 5,
    pageSizes: [10, 20, 50],
  }}
  sortable={true}
  onRowClick={handleRowClick}
>
  <GridColumn field="id" title="ID" width="100px" />
  <GridColumn field="status" title="Status" cell={StatusCell} />
</Grid>
```

### Chart Integration

**Donut Chart** (Dashboard):

```typescript
<Chart>
  <ChartSeries>
    <ChartSeriesItem
      type="donut"
      data={statusData}
      categoryField="status"
      field="count"
    />
  </ChartSeries>
  <ChartLegend position="bottom" />
</Chart>
```

**Column Chart** (Analytics):

```typescript
<Chart>
  <ChartCategoryAxis>
    <ChartCategoryAxisItem categories={priorities} />
  </ChartCategoryAxis>
  <ChartSeries>
    <ChartSeriesItem type="column" data={counts} />
  </ChartSeries>
</Chart>
```

### Kendo Theme Integration

```typescript
// index.css
import '@progress/kendo-theme-default/dist/all.css';

// Custom CSS overrides for CTN branding
.k-grid { ... }
.k-chart { ... }
```

---

## Testing Architecture

### E2E Testing with Playwright

**Test Organization:**
- One spec file per page/feature
- Reusable authentication fixtures
- Page Object Model (POM) pattern where beneficial

#### Authentication Fixture

```typescript
// e2e/fixtures/auth.ts
export const authenticatedPage = test.extend({
  page: async ({ page }, use) => {
    await page.goto('/login');
    await page.fill('input[name="email"]', 'admin@itg.nl');
    await page.fill('input[name="password"]', 'password123');
    await page.click('button[type="submit"]');
    await page.waitForURL('/dashboard');
    await use(page);
  },
});
```

#### Test Structure

```typescript
// e2e/orchestrations.spec.ts
test.describe('Orchestrations Page', () => {
  test('should display orchestrations grid', async ({ page }) => {
    await page.goto('/orchestrations');
    await expect(page.locator('.k-grid')).toBeVisible();
  });

  test('should filter by status', async ({ page }) => {
    await page.goto('/orchestrations');
    await page.selectOption('select[name="status"]', 'active');
    await expect(page.locator('.k-grid-table tr')).toHaveCount(16);
  });
});
```

### Test Coverage

**72 tests across 6 suites:**
- Authentication (6 tests)
- Dashboard (12 tests)
- Orchestrations (18 tests)
- Events (14 tests)
- Webhooks (12 tests)
- Analytics (10 tests)

---

## Build and Deployment

### Build Process

```bash
npm run build
```

**Steps:**
1. TypeScript compilation (`tsc --noEmit`)
2. Vite production build
3. CSS optimization (PostCSS + Tailwind)
4. Asset minification
5. Code splitting

### Build Configuration (vite.config.ts)

```typescript
export default defineConfig({
  plugins: [react(), tsconfigPaths()],
  build: {
    outDir: 'dist',
    sourcemap: false,
    minify: 'esbuild',
    chunkSizeWarningLimit: 1000,
    rollupOptions: {
      output: {
        manualChunks: {
          vendor: ['react', 'react-dom', 'react-router-dom'],
          kendo: [
            '@progress/kendo-react-grid',
            '@progress/kendo-react-charts',
          ],
        },
      },
    },
  },
});
```

### Deployment Targets

- **Azure Static Web Apps** (recommended)
- **Netlify**
- **Vercel**
- **AWS S3 + CloudFront**

**Deployment Steps:**
1. Build production bundle
2. Deploy `dist/` folder to hosting provider
3. Configure environment variables
4. Set up custom domain (optional)

---

## Performance Optimization

### Code Splitting

- Route-based code splitting via React Router
- Manual chunks for large dependencies (Kendo UI)
- Lazy loading of heavy components

### Caching Strategy

**TanStack Query:**
- 30-second stale time for orchestrations
- 5-second stale time for events (real-time)
- Automatic background refetching
- Cache invalidation on mutations

### Asset Optimization

- CSS minification with PostCSS
- JavaScript minification with esbuild
- Image optimization (if applicable)
- Gzip compression on server

### Runtime Performance

- **React.memo** for expensive components
- **useMemo** for expensive calculations
- **useCallback** for event handlers
- Virtual scrolling for large lists (Kendo Grid)

### Bundle Analysis

```bash
# Analyze bundle size
npm run build -- --analyze

# Check bundle composition
npx vite-bundle-visualizer
```

**Current Bundle Size:**
- Main bundle: ~1.5MB (uncompressed)
- Gzipped: ~400KB
- Kendo UI: ~60% of bundle size

---

## Security Considerations

### Authentication

- Session-based authentication via Zustand store
- Automatic redirect to login for unauthenticated users
- Token expiration handling

### CORS

```typescript
// Mock API CORS configuration
app.use(cors({
  origin: 'http://localhost:5173',
  credentials: true,
}));
```

### Input Sanitization

- All user inputs validated before API calls
- Search queries sanitized
- TypeScript ensures type safety

### Environment Variables

```bash
# .env (not committed)
VITE_API_BASE_URL=http://localhost:3001/api/v1
VITE_KENDO_LICENSE_KEY=xxxxx
```

### Production Hardening

- Enable CSP headers
- Set up HTTPS/TLS
- Configure security headers (X-Frame-Options, X-Content-Type-Options)
- Enable API rate limiting
- Implement audit logging

---

## Future Enhancements

### Planned Improvements

1. **WebSocket Integration** - Replace polling with real-time push
2. **Offline Support** - Service worker for offline mode
3. **Advanced Analytics** - More charts and filtering
4. **Export Functionality** - Export orchestrations to Excel/PDF
5. **User Preferences** - Save grid column preferences
6. **Dark Mode** - Theme switching
7. **Internationalization** - Multi-language support

### Technical Debt

- Add unit tests for components (currently only E2E tests)
- Implement error boundaries
- Add performance monitoring
- Set up logging infrastructure

---

## Conclusion

The Orchestrator Portal is a well-architected, production-ready application built with modern technologies and best practices. The architecture supports scalability, maintainability, and performance while providing an excellent developer experience.

**Key Strengths:**
- Type-safe with TypeScript
- Modular component architecture
- Efficient data fetching with TanStack Query
- Comprehensive E2E test coverage
- Fast build times with Vite
- Professional UI with Kendo React

**Next Steps:**
- Deploy to Azure Static Web Apps
- Connect to production API
- Configure Azure AD authentication
- Enable monitoring and logging

---

**Document Version:** 1.0.0
**Last Updated:** October 18, 2025
**Maintained By:** CTN Development Team
