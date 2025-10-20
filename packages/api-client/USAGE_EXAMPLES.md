# API Client Usage Examples

This document provides practical examples of using the CTN ASR API Client in various scenarios.

## Table of Contents

1. [Basic Setup](#basic-setup)
2. [Member Management](#member-management)
3. [Legal Entity Operations](#legal-entity-operations)
4. [Contact Management](#contact-management)
5. [Identifier Management](#identifier-management)
6. [Webhook Endpoints](#webhook-endpoints)
7. [Audit Logs](#audit-logs)
8. [Error Handling](#error-handling)
9. [React Hooks](#react-hooks)
10. [TypeScript Usage](#typescript-usage)

## Basic Setup

### Admin Portal Setup

```typescript
// web/src/services/apiClient.ts
import { AsrApiClient } from '@ctn/api-client';
import { msalInstance } from '../authConfig';

async function getAccessToken(): Promise<string> {
  const accounts = msalInstance.getAllAccounts();
  const response = await msalInstance.acquireTokenSilent({
    account: accounts[0],
    scopes: ['api://bcc3ddce-6891-42aa-91f6-99d85b02bb7d/.default']
  });
  return response.accessToken;
}

export const apiClient = new AsrApiClient({
  baseURL: import.meta.env.VITE_API_URL,
  getAccessToken,
  timeout: 30000,
  retryAttempts: 3
});
```

### Member Portal Setup

```typescript
// portal/src/services/apiClient.ts
import { AsrApiClient } from '@ctn/api-client';
import { msalInstance } from '../authConfig';

async function getAccessToken(): Promise<string> {
  const accounts = msalInstance.getAllAccounts();
  const response = await msalInstance.acquireTokenSilent({
    account: accounts[0],
    scopes: ['api://bcc3ddce-6891-42aa-91f6-99d85b02bb7d/.default']
  });
  return response.accessToken;
}

export const apiClient = new AsrApiClient({
  baseURL: import.meta.env.VITE_API_URL,
  getAccessToken,
  onError: (error) => {
    // Show toast notification
    console.error('API Error:', error);
  }
});
```

## Member Management

### Get All Members (Admin Only)

```typescript
import { apiClient } from './services/apiClient';

async function getAllMembers() {
  try {
    const response = await apiClient.members.getAll({
      page: 1,
      pageSize: 20
    });

    console.log('Members:', response.data);
    console.log('Total:', response.pagination.total);
    console.log('Pages:', response.pagination.totalPages);
  } catch (error) {
    console.error('Failed to fetch members:', error);
  }
}
```

### Get Member by ID

```typescript
async function getMemberDetails(memberId: string) {
  const member = await apiClient.members.getById(memberId);
  console.log('Member:', member);
}
```

### Create New Member

```typescript
import { CreateMemberRequest } from '@ctn/api-client';

async function createMember() {
  const newMember: CreateMemberRequest = {
    org_id: 'ORG-12345',
    legal_name: 'Example Corporation',
    domain: 'example.com',
    lei: 'LEI123456789ABCD',
    kvk: '12345678',
    contacts: [
      {
        email: 'admin@example.com',
        name: 'John Doe',
        type: 'PRIMARY',
        phone: '+31612345678'
      }
    ]
  };

  const member = await apiClient.members.create(newMember);
  console.log('Created member:', member);
}
```

### Update Member

```typescript
async function updateMemberStatus(memberId: string) {
  const updated = await apiClient.members.update(memberId, {
    status: 'ACTIVE',
    membership_level: 'PREMIUM'
  });
  console.log('Updated member:', updated);
}
```

### Delete Member

```typescript
async function deleteMember(memberId: string) {
  await apiClient.members.delete(memberId);
  console.log('Member deleted successfully');
}
```

## Legal Entity Operations

### Get All Legal Entities

```typescript
async function getLegalEntities() {
  const response = await apiClient.legalEntities.getAll();
  console.log('Legal Entities:', response.data);
}
```

### Get Legal Entity Details

```typescript
async function getLegalEntityById(legalEntityId: string) {
  const entity = await apiClient.legalEntities.getById(legalEntityId);
  console.log('Legal Entity:', entity);
}
```

### Update Legal Entity

```typescript
async function updateLegalEntity(legalEntityId: string) {
  const updated = await apiClient.legalEntities.update(legalEntityId, {
    primary_legal_name: 'Updated Company Name',
    address_line1: '123 Main Street',
    city: 'Amsterdam',
    postal_code: '1012 AB',
    country_code: 'NL'
  });
  console.log('Updated:', updated);
}
```

## Contact Management

### Get Contacts for Legal Entity

```typescript
async function getContacts(legalEntityId: string) {
  const contacts = await apiClient.contacts.getByLegalEntity(legalEntityId);
  console.log('Contacts:', contacts);
}
```

### Create Contact

```typescript
import { ContactRequest } from '@ctn/api-client';

async function createContact(legalEntityId: string) {
  const newContact: ContactRequest = {
    email: 'technical@example.com',
    name: 'Jane Smith',
    type: 'TECHNICAL',
    phone: '+31687654321',
    job_title: 'IT Manager',
    department: 'Technology'
  };

  const contact = await apiClient.contacts.create(legalEntityId, newContact);
  console.log('Created contact:', contact);
}
```

### Update Contact

```typescript
async function updateContact(legalEntityId: string, contactId: string) {
  const updated = await apiClient.contacts.update(
    legalEntityId,
    contactId,
    {
      phone: '+31698765432',
      job_title: 'Senior IT Manager'
    }
  );
  console.log('Updated contact:', updated);
}
```

### Delete Contact

```typescript
async function deleteContact(legalEntityId: string, contactId: string) {
  await apiClient.contacts.delete(legalEntityId, contactId);
  console.log('Contact deleted');
}
```

## Identifier Management

### Get Identifiers

```typescript
async function getIdentifiers(legalEntityId: string) {
  const identifiers = await apiClient.identifiers.getByLegalEntity(legalEntityId);
  console.log('Identifiers:', identifiers);
}
```

### Create Identifier

```typescript
import { CreateIdentifierRequest } from '@ctn/api-client';

async function createIdentifier(legalEntityId: string) {
  const newIdentifier: CreateIdentifierRequest = {
    identifier_type: 'EORI',
    identifier_value: 'NL123456789',
    country_code: 'NL'
  };

  const identifier = await apiClient.identifiers.create(legalEntityId, newIdentifier);
  console.log('Created identifier:', identifier);
}
```

### Deactivate Identifier

```typescript
async function deactivateIdentifier(legalEntityId: string, identifierId: string) {
  const updated = await apiClient.identifiers.update(
    legalEntityId,
    identifierId,
    { is_active: false }
  );
  console.log('Deactivated identifier:', updated);
}
```

## Webhook Endpoints

### Get Endpoints

```typescript
async function getEndpoints(legalEntityId: string) {
  const endpoints = await apiClient.endpoints.getByLegalEntity(legalEntityId);
  console.log('Endpoints:', endpoints);
}
```

### Create Webhook Endpoint

```typescript
import { CreateEndpointRequest } from '@ctn/api-client';

async function createWebhook(legalEntityId: string) {
  const newEndpoint: CreateEndpointRequest = {
    endpoint_url: 'https://example.com/webhook',
    endpoint_type: 'WEBHOOK',
    auth_token: 'secret-token-123'
  };

  const endpoint = await apiClient.endpoints.create(legalEntityId, newEndpoint);
  console.log('Created endpoint:', endpoint);
}
```

### Test Endpoint

```typescript
async function testEndpoint(legalEntityId: string, endpointId: string) {
  const result = await apiClient.endpoints.test(legalEntityId, endpointId);

  if (result.success) {
    console.log('Endpoint test successful:', result.message);
  } else {
    console.error('Endpoint test failed:', result.message);
  }
}
```

## Audit Logs

### Get All Audit Logs

```typescript
async function getAuditLogs() {
  const response = await apiClient.auditLogs.getAll({
    page: 1,
    pageSize: 50,
    event_type: 'MEMBER_CREATED',
    result: 'success'
  });

  console.log('Audit Logs:', response.data);
}
```

### Get Audit Logs for Resource

```typescript
async function getResourceAuditLogs(resourceId: string) {
  const logs = await apiClient.auditLogs.getByResource('member', resourceId);
  console.log('Resource audit history:', logs);
}
```

### Get User Activity

```typescript
async function getUserActivity(userEmail: string) {
  const response = await apiClient.auditLogs.getByUser(userEmail, {
    start_date: '2024-01-01',
    end_date: '2024-12-31'
  });

  console.log('User activity:', response.data);
}
```

## Error Handling

### Basic Error Handling

```typescript
import { AsrApiError } from '@ctn/api-client';

async function handleErrors() {
  try {
    const member = await apiClient.members.getById('invalid-id');
  } catch (error) {
    if (error instanceof AsrApiError) {
      console.error('API Error:', {
        message: error.message,
        status: error.status,
        code: error.code,
        details: error.details
      });
    } else {
      console.error('Unexpected error:', error);
    }
  }
}
```

### Error Type Checking

```typescript
import { AsrApiError } from '@ctn/api-client';

async function handleSpecificErrors() {
  try {
    const member = await apiClient.members.getById('123');
  } catch (error) {
    if (error instanceof AsrApiError) {
      if (error.isNotFoundError()) {
        console.log('Member not found');
      } else if (error.isAuthError()) {
        console.log('Authentication failed - redirecting to login');
      } else if (error.isValidationError()) {
        console.log('Validation error:', error.details);
      } else if (error.isServerError()) {
        console.log('Server error - please try again later');
      }
    }
  }
}
```

## React Hooks

### Custom Hook for Members

```typescript
import { useState, useEffect } from 'react';
import { apiClient } from './services/apiClient';
import { Member, AsrApiError } from '@ctn/api-client';

export function useMembers() {
  const [members, setMembers] = useState<Member[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<AsrApiError | null>(null);

  useEffect(() => {
    async function fetchMembers() {
      try {
        setLoading(true);
        const response = await apiClient.members.getAll();
        setMembers(response.data);
        setError(null);
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

// Usage in component
function MembersPage() {
  const { members, loading, error } = useMembers();

  if (loading) return <div>Loading...</div>;
  if (error) return <div>Error: {error.message}</div>;

  return (
    <div>
      {members.map(member => (
        <div key={member.id}>{member.legal_name}</div>
      ))}
    </div>
  );
}
```

### Custom Hook for Legal Entity

```typescript
import { useState, useEffect } from 'react';
import { apiClient } from './services/apiClient';
import { LegalEntity, AsrApiError } from '@ctn/api-client';

export function useLegalEntity(legalEntityId: string) {
  const [entity, setEntity] = useState<LegalEntity | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<AsrApiError | null>(null);

  useEffect(() => {
    async function fetchEntity() {
      try {
        setLoading(true);
        const data = await apiClient.legalEntities.getById(legalEntityId);
        setEntity(data);
        setError(null);
      } catch (err) {
        if (err instanceof AsrApiError) {
          setError(err);
        }
      } finally {
        setLoading(false);
      }
    }

    if (legalEntityId) {
      fetchEntity();
    }
  }, [legalEntityId]);

  return { entity, loading, error };
}
```

## TypeScript Usage

### Type-Safe API Calls

```typescript
import {
  Member,
  CreateMemberRequest,
  UpdateMemberRequest,
  Contact,
  Identifier,
  AsrApiError
} from '@ctn/api-client';

// Function with typed parameters
async function createMemberWithType(request: CreateMemberRequest): Promise<Member> {
  return apiClient.members.create(request);
}

// Function with typed response
async function getMemberTyped(id: string): Promise<Member | null> {
  try {
    return await apiClient.members.getById(id);
  } catch (error) {
    if (error instanceof AsrApiError && error.isNotFoundError()) {
      return null;
    }
    throw error;
  }
}

// Using union types
type ContactType = 'PRIMARY' | 'TECHNICAL' | 'BILLING';

function getContactsByType(contacts: Contact[], type: ContactType): Contact[] {
  return contacts.filter(contact => contact.contact_type === type);
}
```

### Generic Functions

```typescript
import { PaginatedResponse } from '@ctn/api-client';

async function fetchPaginated<T>(
  fetchFn: (page: number, pageSize: number) => Promise<PaginatedResponse<T>>,
  pageSize: number = 20
): Promise<T[]> {
  const allItems: T[] = [];
  let currentPage = 1;
  let hasMore = true;

  while (hasMore) {
    const response = await fetchFn(currentPage, pageSize);
    allItems.push(...response.data);
    hasMore = currentPage < response.pagination.totalPages;
    currentPage++;
  }

  return allItems;
}

// Usage
const allMembers = await fetchPaginated(
  (page, pageSize) => apiClient.members.getAll({ page, pageSize })
);
```

## Best Practices

### 1. Centralize API Client Instance

Create a single instance and export it from a service file:

```typescript
// services/apiClient.ts
export const apiClient = new AsrApiClient({ ... });

// Use throughout the app
import { apiClient } from './services/apiClient';
```

### 2. Handle Errors Consistently

```typescript
async function safeApiCall<T>(
  apiCall: () => Promise<T>,
  fallbackValue: T
): Promise<T> {
  try {
    return await apiCall();
  } catch (error) {
    console.error('API call failed:', error);
    return fallbackValue;
  }
}
```

### 3. Use TypeScript Types

Import and use the provided types for type safety:

```typescript
import { Member, Contact, Identifier } from '@ctn/api-client';
```

### 4. Implement Retry Logic for Critical Operations

The client already has retry logic, but you can add custom retry:

```typescript
async function retryOperation<T>(
  operation: () => Promise<T>,
  maxRetries: number = 3
): Promise<T> {
  for (let i = 0; i < maxRetries; i++) {
    try {
      return await operation();
    } catch (error) {
      if (i === maxRetries - 1) throw error;
      await new Promise(resolve => setTimeout(resolve, 1000 * (i + 1)));
    }
  }
  throw new Error('Max retries exceeded');
}
```

### 5. Monitor API Usage

```typescript
const apiClient = new AsrApiClient({
  baseURL: '...',
  getAccessToken: async () => { ... },
  onError: (error) => {
    // Log to Application Insights
    appInsights.trackException({ exception: error });

    // Show user-friendly message
    showToast('An error occurred. Please try again.');
  }
});
```
