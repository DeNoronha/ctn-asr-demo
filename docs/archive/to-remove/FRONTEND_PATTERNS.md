# Frontend Standardization Patterns

## Current State

**Stack:** React 18 + TypeScript + Mantine v8 + MSAL + i18next
**Portals:** Admin Portal, Member Portal
**Shared Package:** @ctn/api-client

## Priority Patterns

### 1. Complete API Client Migration (HIGH PRIORITY)

**Status:** Partial (EndpointManagement.tsx completed)

**Remaining Files to Migrate:**

```typescript
// admin-portal/src/components/M2MClientsManager.tsx
// admin-portal/src/components/IdentifierVerificationManager.tsx
// member-portal/src/components/MemberDashboard.tsx (if applicable)
```

**Standard Pattern:**

```typescript
// BEFORE (Manual fetch)
const getAccessToken = async () => {
  const accounts = msalInstance.getAllAccounts();
  // ... token acquisition logic
};

const response = await fetch(`${API_BASE}/endpoint`, {
  headers: { Authorization: `Bearer ${await getAccessToken()}` }
});

// AFTER (Using apiV2)
import { apiV2 } from '../services/apiV2';

const data = await apiV2.getEndpoints(legalEntityId);
```

**Benefits:**
- Automatic token injection
- Type safety
- Retry logic
- Consistent error handling

### 2. Standardize Form Validation (MEDIUM PRIORITY)

**Current:** Mix of manual validation and Mantine forms

**Recommended Pattern:**

```typescript
import { useForm } from '@mantine/form';
import { isValidEmail, isValidUUID } from '@ctn/api-client/validators';

function MyForm() {
  const form = useForm({
    initialValues: {
      email: '',
      legalEntityId: ''
    },
    validate: {
      email: (value) =>
        !isValidEmail(value) ? 'Invalid email format' : null,
      legalEntityId: (value) =>
        !isValidUUID(value) ? 'Invalid legal entity ID' : null
    }
  });

  return (
    <form onSubmit={form.onSubmit(handleSubmit)}>
      <TextInput
        label="Email"
        {...form.getInputProps('email')}
      />
      <TextInput
        label="Legal Entity ID"
        {...form.getInputProps('legalEntityId')}
      />
      <Button type="submit">Submit</Button>
    </form>
  );
}
```

**Files to Review:**
- All forms in admin-portal/src/components/
- All forms in member-portal/src/components/

### 3. Add Loading States (HIGH PRIORITY)

**Current:** Inconsistent loading indicators

**Standard Pattern:**

```typescript
import { useState } from 'react';
import { LoadingOverlay, Button } from '@mantine/core';

function DataComponent() {
  const [loading, setLoading] = useState(false);
  const [data, setData] = useState(null);
  const [error, setError] = useState<string | null>(null);

  const fetchData = async () => {
    setLoading(true);
    setError(null);
    try {
      const result = await apiV2.getData();
      setData(result);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load data');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={{ position: 'relative' }}>
      <LoadingOverlay visible={loading} />
      {error && <Alert color="red">{error}</Alert>}
      {data && <DataTable data={data} />}
    </div>
  );
}
```

### 4. Standardize Error Handling (MEDIUM PRIORITY)

**Create Shared Error Component:**

```typescript
// admin-portal/src/components/ErrorAlert.tsx
import { Alert } from '@mantine/core';
import { IconAlertCircle } from '@tabler/icons-react';

interface ErrorAlertProps {
  error: Error | string | null;
  onClose?: () => void;
}

export function ErrorAlert({ error, onClose }: ErrorAlertProps) {
  if (!error) return null;

  const message = error instanceof Error ? error.message : error;

  return (
    <Alert
      icon={<IconAlertCircle size="1rem" />}
      title="Error"
      color="red"
      onClose={onClose}
      withCloseButton={!!onClose}
    >
      {message}
    </Alert>
  );
}
```

**Usage:**

```typescript
const [error, setError] = useState<Error | null>(null);

return (
  <>
    <ErrorAlert error={error} onClose={() => setError(null)} />
    {/* Component content */}
  </>
);
```

### 5. Pagination Pattern (LOW PRIORITY)

**Current:** Manual implementation in components

**Standard Pattern:**

```typescript
import { Pagination } from '@mantine/core';
import { useState, useEffect } from 'react';
import { PAGINATION } from '../config/constants';

function PaginatedList() {
  const [page, setPage] = useState(1);
  const [data, setData] = useState<any[]>([]);
  const [totalPages, setTotalPages] = useState(1);

  useEffect(() => {
    fetchData(page);
  }, [page]);

  const fetchData = async (pageNum: number) => {
    const result = await apiV2.getMembers({
      page: pageNum,
      pageSize: PAGINATION.DEFAULT_PAGE_SIZE
    });

    setData(result.data);
    setTotalPages(result.pagination.totalPages);
  };

  return (
    <>
      <DataTable records={data} />
      <Pagination
        value={page}
        onChange={setPage}
        total={totalPages}
        mt="md"
      />
    </>
  );
}
```

## Implementation Checklist

### Week 1: API Client Migration
- [ ] Migrate M2MClientsManager.tsx
- [ ] Migrate IdentifierVerificationManager.tsx
- [ ] Update any remaining manual fetch calls

### Week 2: Form Validation
- [ ] Create shared validation utilities
- [ ] Audit all forms for validation patterns
- [ ] Standardize error messages

### Week 3: Loading States
- [ ] Add LoadingOverlay to all data fetch operations
- [ ] Create shared loading component
- [ ] Add skeleton loaders for tables

### Week 4: Error Handling
- [ ] Create ErrorAlert component
- [ ] Replace all alert() calls with ErrorAlert
- [ ] Add error boundaries

## Mantine Best Practices

**Components to Use:**
- `LoadingOverlay` for loading states
- `Alert` for error/success messages
- `Modal` for dialogs
- `Table` or `mantine-datatable` for data tables
- `TextInput`, `Select`, `Checkbox` for forms
- `Button` with loading prop for async actions

**Avoid:**
- Raw HTML form elements
- Inline styles (use Mantine sx prop or CSS)
- alert() / confirm() (use Mantine modals)
- Custom CSS when Mantine provides the component

## Code Quality Checks

**Before Committing:**
```bash
npm run lint
npm run typecheck
npm run test
```

**Biome Auto-fix:**
```bash
npm run lint:fix
npm run format
```
