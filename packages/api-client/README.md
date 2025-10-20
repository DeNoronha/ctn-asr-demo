# CTN Association Register API Client

Type-safe TypeScript client for the CTN Association Register API. Provides automatic authentication, retry logic, and comprehensive error handling.

## Features

- **Type Safety**: Full TypeScript support with comprehensive type definitions
- **Authentication**: Automatic Bearer token injection via configurable token provider
- **Retry Logic**: Exponential backoff retry for network errors and 5xx responses
- **Error Handling**: Structured error responses with helper methods
- **Resource Endpoints**: Pre-configured endpoints for all API resources
- **Flexible**: Access to raw Axios instance for custom requests

## Installation

This package is distributed as a workspace package in the monorepo. To use it in a portal:

```bash
npm install
```

The package is automatically available via workspace resolution.

## Quick Start

### Basic Setup

```typescript
import { AsrApiClient } from '@ctn/api-client';
import { msalInstance } from './authConfig';

// Create the client
const apiClient = new AsrApiClient({
  baseURL: 'https://func-ctn-demo-asr-dev.azurewebsites.net/api/v1',
  getAccessToken: async () => {
    const accounts = msalInstance.getAllAccounts();
    if (accounts.length === 0) {
      throw new Error('No authenticated user');
    }

    const response = await msalInstance.acquireTokenSilent({
      account: accounts[0],
      scopes: ['api://your-client-id/.default']
    });

    return response.accessToken;
  },
  timeout: 30000,
  retryAttempts: 3,
  onError: (error) => {
    console.error('API Error:', error);
    // Add toast notification or other error handling
  }
});

export { apiClient };
```

### Using in Components

```typescript
import { apiClient } from './services/apiClient';

// Get all members
const members = await apiClient.members.getAll({ page: 1, pageSize: 20 });

// Get member by ID
const member = await apiClient.members.getById('member-123');

// Create a new member
const newMember = await apiClient.members.create({
  org_id: 'ORG-001',
  legal_name: 'Example Corp',
  domain: 'example.com',
  lei: 'LEI123456789',
  contacts: [
    {
      email: 'admin@example.com',
      name: 'John Doe',
      type: 'PRIMARY'
    }
  ]
});

// Update member
const updated = await apiClient.members.update('member-123', {
  legal_name: 'Example Corporation',
  status: 'ACTIVE'
});

// Delete member
await apiClient.members.delete('member-123');
```

## Configuration Options

```typescript
interface ApiClientConfig {
  baseURL: string;                                      // Required: API base URL
  getAccessToken: () => Promise<string> | string;       // Required: Token provider
  timeout?: number;                                     // Optional: Request timeout (default: 30000ms)
  retryAttempts?: number;                              // Optional: Number of retries (default: 3)
  retryDelay?: number;                                 // Optional: Retry delay (uses exponential backoff)
  onError?: (error: Error) => void;                    // Optional: Global error handler
}
```

## Available Endpoints

### Members

```typescript
// Get all members (admin only)
apiClient.members.getAll(params?: PaginationParams): Promise<PaginatedResponse<Member>>

// Get member by ID
apiClient.members.getById(id: string): Promise<Member>

// Create new member
apiClient.members.create(member: CreateMemberRequest): Promise<Member>

// Update member
apiClient.members.update(id: string, updates: UpdateMemberRequest): Promise<Member>

// Delete member
apiClient.members.delete(id: string): Promise<void>
```

### Legal Entities

```typescript
// Get all legal entities
apiClient.legalEntities.getAll(): Promise<PaginatedResponse<LegalEntity>>

// Get legal entity by ID
apiClient.legalEntities.getById(id: string): Promise<LegalEntity>

// Update legal entity
apiClient.legalEntities.update(id: string, updates: UpdateLegalEntityRequest): Promise<LegalEntity>
```

### Contacts

```typescript
// Get contacts for legal entity
apiClient.contacts.getByLegalEntity(legalEntityId: string): Promise<Contact[]>

// Get contact by ID
apiClient.contacts.getById(legalEntityId: string, contactId: string): Promise<Contact>

// Create contact
apiClient.contacts.create(legalEntityId: string, contact: ContactRequest): Promise<Contact>

// Update contact
apiClient.contacts.update(legalEntityId: string, contactId: string, updates: UpdateContactRequest): Promise<Contact>

// Delete contact
apiClient.contacts.delete(legalEntityId: string, contactId: string): Promise<void>
```

### Identifiers

```typescript
// Get identifiers for legal entity
apiClient.identifiers.getByLegalEntity(legalEntityId: string): Promise<Identifier[]>

// Get identifier by ID
apiClient.identifiers.getById(legalEntityId: string, identifierId: string): Promise<Identifier>

// Create identifier
apiClient.identifiers.create(legalEntityId: string, identifier: CreateIdentifierRequest): Promise<Identifier>

// Update identifier
apiClient.identifiers.update(legalEntityId: string, identifierId: string, updates: UpdateIdentifierRequest): Promise<Identifier>

// Delete identifier
apiClient.identifiers.delete(legalEntityId: string, identifierId: string): Promise<void>
```

### Endpoints (Webhooks)

```typescript
// Get endpoints for legal entity
apiClient.endpoints.getByLegalEntity(legalEntityId: string): Promise<Endpoint[]>

// Get endpoint by ID
apiClient.endpoints.getById(legalEntityId: string, endpointId: string): Promise<Endpoint>

// Create endpoint
apiClient.endpoints.create(legalEntityId: string, endpoint: CreateEndpointRequest): Promise<Endpoint>

// Update endpoint
apiClient.endpoints.update(legalEntityId: string, endpointId: string, updates: UpdateEndpointRequest): Promise<Endpoint>

// Delete endpoint
apiClient.endpoints.delete(legalEntityId: string, endpointId: string): Promise<void>

// Test endpoint
apiClient.endpoints.test(legalEntityId: string, endpointId: string): Promise<{ success: boolean; message: string }>
```

### Audit Logs

```typescript
// Get all audit logs
apiClient.auditLogs.getAll(filters?: AuditLogFilters): Promise<PaginatedResponse<AuditLog>>

// Get audit log by ID
apiClient.auditLogs.getById(id: number): Promise<AuditLog>

// Get audit logs for resource
apiClient.auditLogs.getByResource(resourceType: string, resourceId: string): Promise<AuditLog[]>

// Get audit logs for user
apiClient.auditLogs.getByUser(userEmail: string, filters?: AuditLogFilters): Promise<PaginatedResponse<AuditLog>>
```

### Orchestrations

```typescript
// Get all orchestrations
apiClient.orchestrations.getAll(params?: PaginationParams): Promise<PaginatedResponse<Orchestration>>

// Get orchestration by ID
apiClient.orchestrations.getById(id: string): Promise<Orchestration>

// Create orchestration
apiClient.orchestrations.create(orchestration: CreateOrchestrationRequest): Promise<Orchestration>

// Get orchestrations by party
apiClient.orchestrations.getByParty(partyId: string, params?: PaginationParams): Promise<PaginatedResponse<Orchestration>>
```

### Auth

```typescript
// Get current user's party info
apiClient.auth.getPartyInfo(): Promise<PartyInfo>

// Validate token
apiClient.auth.validateToken(): Promise<{ valid: boolean; expires_at?: string }>
```

## Error Handling

The client provides a custom `AsrApiError` class with helper methods:

```typescript
import { AsrApiError } from '@ctn/api-client';

try {
  const member = await apiClient.members.getById('invalid-id');
} catch (error) {
  if (error instanceof AsrApiError) {
    // Check error type
    if (error.isNotFoundError()) {
      console.log('Member not found');
    } else if (error.isAuthError()) {
      console.log('Authentication failed');
    } else if (error.isValidationError()) {
      console.log('Validation error:', error.details);
    } else if (error.isServerError()) {
      console.log('Server error, please try again');
    }

    // Access error properties
    console.log(error.message);
    console.log(error.status);
    console.log(error.code);
    console.log(error.details);
  }
}
```

### Error Properties

```typescript
interface AsrApiError extends Error {
  message: string;      // Error message
  status: number;       // HTTP status code (0 for network errors)
  code?: string;        // Error code from API
  details?: unknown;    // Additional error details

  // Helper methods
  isAuthError(): boolean;
  isNotFoundError(): boolean;
  isValidationError(): boolean;
  isServerError(): boolean;
}
```

## Advanced Usage

### Custom Requests

Access the underlying Axios instance for custom requests:

```typescript
const response = await apiClient.axios.get('/custom-endpoint');
const data = await apiClient.axios.post('/custom-endpoint', payload);
```

The Axios instance is pre-configured with:
- Base URL
- Authentication interceptor
- Error handling interceptor
- Retry logic

### React Hook Example

```typescript
import { useState, useEffect } from 'react';
import { apiClient } from './services/apiClient';
import { Member, AsrApiError } from '@ctn/api-client';

function useMembers() {
  const [members, setMembers] = useState<Member[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<AsrApiError | null>(null);

  useEffect(() => {
    async function fetchMembers() {
      try {
        setLoading(true);
        const response = await apiClient.members.getAll();
        setMembers(response.data);
      } catch (err) {
        if (err instanceof AsrApiError) {
          setError(err);
        }
      } finally {
        setLoading(false);
      }
    }

    fetchMembers();
  }, []);

  return { members, loading, error };
}
```

## Type Exports

All types are exported for use in your application:

```typescript
import {
  Member,
  CreateMemberRequest,
  UpdateMemberRequest,
  LegalEntity,
  Contact,
  Identifier,
  Endpoint,
  AuditLog,
  Orchestration,
  PaginatedResponse,
  ApiError
} from '@ctn/api-client';
```

## Development

### Build

```bash
npm run build
```

### Test

```bash
npm test
```

### Lint

```bash
npm run lint
```

## License

UNLICENSED - Internal use only
