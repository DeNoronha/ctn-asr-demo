# Orchestrator Portal Mock API

A comprehensive mock API server for the Orchestrator Portal using `json-server` with custom middleware and realistic data.

## Features

- **30+ Orchestrations** across 2 tenants (ITG and Rotterdam Terminal)
- **100+ Events** with realistic timestamps and data
- **Parent-child orchestration relationships**
- **Webhooks** with delivery statistics
- **Realistic data**: Container IDs, BOL numbers, routes, parties, timestamps
- **Custom filtering**: By tenant, status, type, search terms
- **Pagination support**
- **Custom endpoints** with middleware

## Setup

1. **Install dependencies:**
   ```bash
   npm install
   ```

2. **Generate database:**
   ```bash
   npm run generate-db
   ```

3. **Start server:**
   ```bash
   npm start
   ```

The server will start at `http://localhost:3001`

## Available Endpoints

### Tenants
- `GET /api/v1/tenants` - List all tenants
- `GET /api/v1/tenants/:id` - Get tenant by ID

### Orchestrations
- `GET /api/v1/orchestrations` - List orchestrations (with filtering)
- `GET /api/v1/orchestrations/:id` - Get orchestration with recent events
- `POST /api/v1/orchestrations` - Create new orchestration
- `PATCH /api/v1/orchestrations/:id` - Update orchestration

### Events
- `GET /api/v1/events` - List events (with filtering)
- `GET /api/v1/events/:id` - Get event by ID

### Webhooks
- `GET /api/v1/webhooks` - List webhooks
- `GET /api/v1/webhooks/:id` - Get webhook by ID

### Health Check
- `GET /health` - Server health status

## Query Parameters

### Orchestrations
- `?tenantId=xxx` - Filter by tenant ID
- `?status=xxx` - Filter by status (active, completed, cancelled, draft, delayed)
- `?type=root` - Only root orchestrations
- `?type=child` - Only child orchestrations
- `?search=xxx` - Search by container ID or BOL ID
- `?_page=1` - Page number (default: 1)
- `?_limit=20` - Items per page (default: 20)

### Events
- `?orchestrationId=xxx` - Filter by orchestration ID
- `?type=xxx` - Filter by event type
- `?tenantId=xxx` - Filter by tenant ID
- `?startDate=xxx` - Events after this date (ISO 8601)
- `?endDate=xxx` - Events before this date (ISO 8601)
- `?_page=1` - Page number (default: 1)
- `?_limit=50` - Items per page (default: 50)

### Webhooks
- `?tenantId=xxx` - Filter by tenant ID
- `?status=xxx` - Filter by status (active, inactive)

## Example Requests

### Get all orchestrations for ITG tenant
```bash
curl http://localhost:3001/api/v1/orchestrations?tenantId=itg-001
```

### Get active orchestrations
```bash
curl http://localhost:3001/api/v1/orchestrations?status=active
```

### Search for container
```bash
curl http://localhost:3001/api/v1/orchestrations?search=MSCU
```

### Get orchestration with events
```bash
curl http://localhost:3001/api/v1/orchestrations/orch-itg-001000
```

### Get recent events
```bash
curl http://localhost:3001/api/v1/events?_page=1&_limit=20
```

### Get events for specific orchestration
```bash
curl http://localhost:3001/api/v1/events?orchestrationId=orch-itg-001000
```

### Create new orchestration
```bash
curl -X POST http://localhost:3001/api/v1/orchestrations \
  -H "Content-Type: application/json" \
  -d '{
    "tenantId": "itg-001",
    "containerId": "TEST1234567",
    "bolId": "BOL-2025-TEST",
    "status": "draft"
  }'
```

## Data Structure

### Orchestration
```json
{
  "id": "orch-itg-001000",
  "tenantId": "itg-001",
  "containerId": "MSCU1234567",
  "bolId": "BOL-2025-12345",
  "status": "active",
  "priority": "normal",
  "route": {
    "origin": { "location": "Rotterdam", "country": "Netherlands", "terminal": "Rotterdam Container Terminal", "unLocode": "NLRTM" },
    "destination": { "location": "Duisburg", "country": "Germany", "terminal": "Duisburg Intermodal Terminal", "unLocode": "DEDUI" }
  },
  "timeWindow": {
    "start": "2025-10-15T08:00:00Z",
    "end": "2025-10-18T16:00:00Z",
    "estimatedDeparture": "2025-10-15T10:00:00Z",
    "estimatedArrival": "2025-10-18T14:00:00Z",
    "actualDeparture": "2025-10-15T10:30:00Z",
    "actualArrival": null
  },
  "parties": [...],
  "cargo": {...},
  "documents": [...],
  "customsStatus": "in_progress",
  "childOrchestrationIds": [],
  "metadata": {...},
  "createdAt": "2025-10-10T12:00:00Z",
  "updatedAt": "2025-10-15T11:00:00Z"
}
```

### Event
```json
{
  "id": "evt-00005000",
  "type": "orchestration.created",
  "timestamp": "2025-10-10T12:00:00Z",
  "data": {
    "orchestrationId": "orch-itg-001000",
    "containerId": "MSCU1234567",
    "tenantId": "itg-001",
    "createdBy": "user@example.com",
    "status": "active"
  },
  "source": "orchestrator-api",
  "version": "1.0"
}
```

## Event Types

- `orchestration.created`
- `orchestration.updated`
- `orchestration.status.updated`
- `orchestration.delay.reported`
- `orchestration.cancelled`
- `orchestration.completed`
- `orchestration.child.created`
- `container.location.updated`
- `container.departed`
- `container.arrived`
- `container.loaded`
- `container.unloaded`
- `document.uploaded`
- `document.verified`
- `customs.cleared`
- `customs.inspection.required`
- `party.notified`
- `webhook.delivered`
- `webhook.failed`

## Regenerating Data

To regenerate the mock database with fresh random data:

```bash
npm run generate-db
```

This will create a new `db.json` file with fresh orchestrations, events, and webhooks.

## Development

The mock API consists of:

- `/data/tenants.js` - Tenant data
- `/data/orchestrations.js` - Orchestration generator
- `/data/events.js` - Event generator
- `/data/webhooks.js` - Webhook data
- `/generate-db.js` - Database generation script
- `/server.js` - Custom json-server with middleware
- `/routes.json` - API route mappings

## Notes

- All timestamps are in ISO 8601 format
- Container IDs follow the format: 4 letters + 7 numbers (e.g., MSCU1234567)
- BOL IDs follow the format: BOL-YYYY-XXXXX
- Parent orchestrations have `childOrchestrationIds` array
- Child orchestrations have `parentOrchestrationId` field
- Events are automatically sorted by timestamp (newest first)
- Pagination headers: `X-Total-Count`, `X-Page`, `X-Per-Page`
