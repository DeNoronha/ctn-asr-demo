# Integration Examples

This document shows how to use the mock API with your Orchestrator Portal application.

## Configuration

### Environment Variables

Create or update your `.env` file:

```bash
VITE_API_BASE_URL=http://localhost:3001/api/v1
VITE_ENABLE_MOCK_API=true
```

## API Client Examples

### Using Axios

```typescript
import axios from 'axios';

const apiClient = axios.create({
  baseURL: import.meta.env.VITE_API_BASE_URL || 'http://localhost:3001/api/v1',
  timeout: 10000,
  headers: {
    'Content-Type': 'application/json',
  },
});

// Get all orchestrations
const getOrchestrations = async (tenantId: string, page = 1, limit = 20) => {
  const response = await apiClient.get('/orchestrations', {
    params: { tenantId, _page: page, _limit: limit },
  });

  return {
    data: response.data,
    total: parseInt(response.headers['x-total-count'] || '0'),
    page: parseInt(response.headers['x-page'] || '1'),
    perPage: parseInt(response.headers['x-per-page'] || '20'),
  };
};

// Get single orchestration with events
const getOrchestration = async (id: string) => {
  const response = await apiClient.get(`/orchestrations/${id}`);
  return response.data;
};

// Search orchestrations
const searchOrchestrations = async (searchTerm: string, tenantId?: string) => {
  const response = await apiClient.get('/orchestrations', {
    params: { search: searchTerm, tenantId },
  });
  return response.data;
};

// Get events
const getEvents = async (filters: {
  orchestrationId?: string;
  type?: string;
  tenantId?: string;
  page?: number;
  limit?: number;
}) => {
  const response = await apiClient.get('/events', {
    params: { ...filters, _page: filters.page, _limit: filters.limit },
  });

  return {
    data: response.data,
    total: parseInt(response.headers['x-total-count'] || '0'),
  };
};

// Create orchestration
const createOrchestration = async (data: any) => {
  const response = await apiClient.post('/orchestrations', data);
  return response.data;
};

// Update orchestration
const updateOrchestration = async (id: string, data: Partial<any>) => {
  const response = await apiClient.patch(`/orchestrations/${id}`, data);
  return response.data;
};
```

### Using React Query

```typescript
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';

// Hook for fetching orchestrations
export const useOrchestrations = (tenantId: string, page = 1, limit = 20) => {
  return useQuery({
    queryKey: ['orchestrations', tenantId, page, limit],
    queryFn: () => getOrchestrations(tenantId, page, limit),
  });
};

// Hook for fetching single orchestration
export const useOrchestration = (id: string) => {
  return useQuery({
    queryKey: ['orchestration', id],
    queryFn: () => getOrchestration(id),
    enabled: !!id,
  });
};

// Hook for searching orchestrations
export const useSearchOrchestrations = (searchTerm: string, tenantId?: string) => {
  return useQuery({
    queryKey: ['orchestrations', 'search', searchTerm, tenantId],
    queryFn: () => searchOrchestrations(searchTerm, tenantId),
    enabled: searchTerm.length >= 3,
  });
};

// Hook for events
export const useEvents = (filters: any) => {
  return useQuery({
    queryKey: ['events', filters],
    queryFn: () => getEvents(filters),
  });
};

// Mutation for creating orchestration
export const useCreateOrchestration = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: createOrchestration,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['orchestrations'] });
    },
  });
};

// Mutation for updating orchestration
export const useUpdateOrchestration = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ id, data }: { id: string; data: any }) =>
      updateOrchestration(id, data),
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ['orchestrations'] });
      queryClient.invalidateQueries({ queryKey: ['orchestration', variables.id] });
    },
  });
};
```

## Component Examples

### Orchestration List Component

```typescript
import React, { useState } from 'react';
import { useOrchestrations } from './hooks/useOrchestrations';

export const OrchestrationList: React.FC<{ tenantId: string }> = ({ tenantId }) => {
  const [page, setPage] = useState(1);
  const { data, isLoading, error } = useOrchestrations(tenantId, page, 20);

  if (isLoading) return <div>Loading orchestrations...</div>;
  if (error) return <div>Error loading orchestrations</div>;

  return (
    <div>
      <h2>Orchestrations ({data?.total})</h2>

      <table>
        <thead>
          <tr>
            <th>Container ID</th>
            <th>BOL ID</th>
            <th>Status</th>
            <th>Route</th>
            <th>Priority</th>
          </tr>
        </thead>
        <tbody>
          {data?.data.map((orch) => (
            <tr key={orch.id}>
              <td>{orch.containerId}</td>
              <td>{orch.bolId}</td>
              <td>
                <span className={`status-${orch.status}`}>
                  {orch.status}
                </span>
              </td>
              <td>
                {orch.route.origin.location} → {orch.route.destination.location}
              </td>
              <td>{orch.priority}</td>
            </tr>
          ))}
        </tbody>
      </table>

      <div className="pagination">
        <button
          onClick={() => setPage(p => Math.max(1, p - 1))}
          disabled={page === 1}
        >
          Previous
        </button>
        <span>Page {page} of {Math.ceil((data?.total || 0) / 20)}</span>
        <button
          onClick={() => setPage(p => p + 1)}
          disabled={page >= Math.ceil((data?.total || 0) / 20)}
        >
          Next
        </button>
      </div>
    </div>
  );
};
```

### Search Component

```typescript
import React, { useState } from 'react';
import { useSearchOrchestrations } from './hooks/useOrchestrations';

export const OrchestrationSearch: React.FC = () => {
  const [searchTerm, setSearchTerm] = useState('');
  const { data, isLoading } = useSearchOrchestrations(searchTerm);

  return (
    <div>
      <input
        type="text"
        placeholder="Search by Container ID or BOL ID..."
        value={searchTerm}
        onChange={(e) => setSearchTerm(e.target.value)}
      />

      {isLoading && <div>Searching...</div>}

      {data && data.length > 0 && (
        <div className="search-results">
          <h3>Found {data.length} results</h3>
          <ul>
            {data.map((orch) => (
              <li key={orch.id}>
                <strong>{orch.containerId}</strong> - {orch.bolId}
                <br />
                {orch.route.origin.location} → {orch.route.destination.location}
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
};
```

### Event Timeline Component

```typescript
import React from 'react';
import { useEvents } from './hooks/useOrchestrations';
import { formatDistanceToNow } from 'date-fns';

export const EventTimeline: React.FC<{ orchestrationId: string }> = ({
  orchestrationId
}) => {
  const { data, isLoading } = useEvents({ orchestrationId, limit: 50 });

  if (isLoading) return <div>Loading events...</div>;

  return (
    <div className="event-timeline">
      <h3>Event Timeline</h3>

      {data?.data.map((event) => (
        <div key={event.id} className="event-item">
          <div className="event-type">{event.type}</div>
          <div className="event-timestamp">
            {formatDistanceToNow(new Date(event.timestamp), { addSuffix: true })}
          </div>
          <div className="event-details">
            {event.type === 'container.location.updated' && (
              <div>Location: {event.data.location}</div>
            )}
            {event.type === 'orchestration.delay.reported' && (
              <div>
                Delay: {event.data.delayMinutes} minutes
                <br />
                Reason: {event.data.reason}
              </div>
            )}
          </div>
        </div>
      ))}
    </div>
  );
};
```

## Testing Examples

### Unit Tests

```typescript
import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import { getOrchestrations, getOrchestration } from './api';

describe('Orchestration API', () => {
  it('should fetch orchestrations for a tenant', async () => {
    const result = await getOrchestrations('itg-001', 1, 10);

    expect(result.data).toBeInstanceOf(Array);
    expect(result.data.length).toBeGreaterThan(0);
    expect(result.data[0]).toHaveProperty('containerId');
    expect(result.data[0]).toHaveProperty('bolId');
  });

  it('should fetch single orchestration with events', async () => {
    const orchestrations = await getOrchestrations('itg-001', 1, 1);
    const id = orchestrations.data[0].id;

    const result = await getOrchestration(id);

    expect(result).toHaveProperty('id', id);
    expect(result).toHaveProperty('recentEvents');
    expect(result.recentEvents).toBeInstanceOf(Array);
  });

  it('should search orchestrations by container ID', async () => {
    const result = await searchOrchestrations('MSCU');

    expect(result).toBeInstanceOf(Array);
    expect(result.every((o) => o.containerId.includes('MSCU'))).toBe(true);
  });
});
```

## Real-Time Updates (Optional)

While the mock API doesn't support WebSockets, you can simulate real-time updates using polling:

```typescript
import { useEffect } from 'react';
import { useQueryClient } from '@tanstack/react-query';

export const useRealtimeUpdates = (tenantId: string, interval = 30000) => {
  const queryClient = useQueryClient();

  useEffect(() => {
    const intervalId = setInterval(() => {
      queryClient.invalidateQueries({ queryKey: ['orchestrations', tenantId] });
      queryClient.invalidateQueries({ queryKey: ['events'] });
    }, interval);

    return () => clearInterval(intervalId);
  }, [tenantId, interval, queryClient]);
};
```

## Debugging Tips

### Enable Request Logging

```typescript
apiClient.interceptors.request.use((config) => {
  console.log('API Request:', config.method?.toUpperCase(), config.url, config.params);
  return config;
});

apiClient.interceptors.response.use(
  (response) => {
    console.log('API Response:', response.status, response.config.url);
    return response;
  },
  (error) => {
    console.error('API Error:', error.response?.status, error.message);
    return Promise.reject(error);
  }
);
```

### Monitor Server Logs

The mock API server logs all requests to console:

```
[2025-10-17T19:25:47.867Z] GET /api/v1/orchestrations?tenantId=itg-001
[2025-10-17T19:25:48.123Z] GET /api/v1/events?orchestrationId=orch-itg-001000
```

## Switching to Production API

When ready to switch to the production API, simply update your `.env`:

```bash
VITE_API_BASE_URL=https://api.orchestrator-production.com/api/v1
VITE_ENABLE_MOCK_API=false
```

The mock API is fully compatible with the expected production API structure.
