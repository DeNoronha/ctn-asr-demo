# Mock API Specification

Complete API specification for the Orchestrator Portal Mock API.

## Base URL

```
http://localhost:3001/api/v1
```

## Authentication

The mock API does not require authentication. In production, all endpoints would require Bearer token authentication.

## Response Headers

All successful responses include:

```
X-API-Version: 1.0.0
X-Response-Time: {time}ms
Content-Type: application/json
```

Paginated responses also include:

```
X-Total-Count: {total}
X-Page: {page}
X-Per-Page: {limit}
```

## Endpoints

### Tenants

#### GET /tenants

List all tenants.

**Query Parameters:** None

**Response:** `200 OK`

```json
[
  {
    "id": "itg-001",
    "name": "ITG Intermodal Transport Group",
    "code": "ITG",
    "type": "forwarder",
    "status": "active",
    "contactEmail": "operations@itg-logistics.com",
    "contactPhone": "+31 10 234 5678",
    "address": {
      "street": "Waalhaven Zuidzijde 15",
      "city": "Rotterdam",
      "postalCode": "3089 JH",
      "country": "Netherlands"
    },
    "settings": {
      "defaultLanguage": "en",
      "timezone": "Europe/Amsterdam",
      "enableWebhooks": true,
      "enableEmailNotifications": true
    },
    "createdAt": "2024-01-15T10:00:00Z",
    "updatedAt": "2025-10-10T14:30:00Z"
  }
]
```

#### GET /tenants/:id

Get tenant by ID.

**Response:** `200 OK` or `404 Not Found`

---

### Orchestrations

#### GET /orchestrations

List orchestrations with filtering and pagination.

**Query Parameters:**

- `tenantId` (string) - Filter by tenant ID
- `status` (string) - Filter by status: `active`, `completed`, `cancelled`, `draft`, `delayed`
- `type` (string) - Filter by type: `root`, `child`
- `search` (string) - Search by container ID or BOL ID
- `_page` (number) - Page number (default: 1)
- `_limit` (number) - Items per page (default: 20, max: 100)

**Response:** `200 OK`

```json
[
  {
    "id": "orch-itg-001000",
    "tenantId": "itg-001",
    "containerId": "MSCU1234567",
    "bolId": "BOL-2025-12345",
    "status": "active",
    "priority": "normal",
    "route": {
      "origin": {
        "location": "Rotterdam",
        "country": "Netherlands",
        "terminal": "Rotterdam Container Terminal",
        "unLocode": "NLRTM"
      },
      "destination": {
        "location": "Duisburg",
        "country": "Germany",
        "terminal": "Duisburg Intermodal Terminal",
        "unLocode": "DEDUI"
      }
    },
    "timeWindow": {
      "start": "2025-10-15T08:00:00Z",
      "end": "2025-10-18T16:00:00Z",
      "estimatedDeparture": "2025-10-15T10:00:00Z",
      "estimatedArrival": "2025-10-18T14:00:00Z",
      "actualDeparture": "2025-10-15T10:30:00Z",
      "actualArrival": null
    },
    "parties": [
      {
        "role": "shipper",
        "name": "Global Electronics BV",
        "contactEmail": "logistics@example.com",
        "contactPhone": "+31 20 123 4567"
      }
    ],
    "cargo": {
      "description": "Electronics",
      "weight": 25000,
      "weightUnit": "kg",
      "value": 150000,
      "currency": "EUR",
      "hsCode": "8517.62"
    },
    "documents": [
      {
        "type": "BOL",
        "id": "BOL-2025-12345",
        "status": "verified"
      }
    ],
    "customsStatus": "in_progress",
    "childOrchestrationIds": [],
    "metadata": {
      "createdBy": "user@example.com",
      "source": "api",
      "version": "1.0",
      "tags": ["root", "active", "rotterdam"]
    },
    "createdAt": "2025-10-10T12:00:00Z",
    "updatedAt": "2025-10-15T11:00:00Z"
  }
]
```

**Headers:**
```
X-Total-Count: 45
X-Page: 1
X-Per-Page: 20
```

#### GET /orchestrations/:id

Get single orchestration with recent events.

**Response:** `200 OK` or `404 Not Found`

```json
{
  "id": "orch-itg-001000",
  "tenantId": "itg-001",
  "containerId": "MSCU1234567",
  "bolId": "BOL-2025-12345",
  "status": "active",
  "priority": "normal",
  "route": { ... },
  "timeWindow": { ... },
  "parties": [ ... ],
  "cargo": { ... },
  "documents": [ ... ],
  "customsStatus": "in_progress",
  "childOrchestrationIds": [],
  "metadata": { ... },
  "createdAt": "2025-10-10T12:00:00Z",
  "updatedAt": "2025-10-15T11:00:00Z",
  "recentEvents": [
    {
      "id": "evt-00005000",
      "type": "orchestration.created",
      "timestamp": "2025-10-10T12:00:00Z",
      "data": { ... },
      "source": "orchestrator-api",
      "version": "1.0"
    }
  ]
}
```

#### POST /orchestrations

Create new orchestration.

**Request Body:**

```json
{
  "tenantId": "itg-001",
  "containerId": "TEST1234567",
  "bolId": "BOL-2025-TEST",
  "status": "draft",
  "priority": "normal",
  "route": {
    "origin": {
      "location": "Rotterdam",
      "country": "Netherlands",
      "terminal": "Rotterdam Container Terminal",
      "unLocode": "NLRTM"
    },
    "destination": {
      "location": "Duisburg",
      "country": "Germany",
      "terminal": "Duisburg Intermodal Terminal",
      "unLocode": "DEDUI"
    }
  },
  "timeWindow": {
    "start": "2025-10-20T08:00:00Z",
    "end": "2025-10-23T16:00:00Z",
    "estimatedDeparture": "2025-10-20T10:00:00Z",
    "estimatedArrival": "2025-10-23T14:00:00Z"
  },
  "parties": [ ... ],
  "cargo": { ... }
}
```

**Response:** `201 Created`

Returns the created orchestration with generated `id`, `createdAt`, and `updatedAt` fields.

#### PATCH /orchestrations/:id

Update orchestration.

**Request Body:**

```json
{
  "status": "active",
  "priority": "high"
}
```

**Response:** `200 OK` or `404 Not Found`

Returns the updated orchestration.

---

### Events

#### GET /events

List events with filtering and pagination.

**Query Parameters:**

- `orchestrationId` (string) - Filter by orchestration ID
- `type` (string) - Filter by event type
- `tenantId` (string) - Filter by tenant ID
- `startDate` (ISO 8601) - Events after this date
- `endDate` (ISO 8601) - Events before this date
- `_page` (number) - Page number (default: 1)
- `_limit` (number) - Items per page (default: 50, max: 200)

**Response:** `200 OK`

```json
[
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
]
```

**Headers:**
```
X-Total-Count: 287
X-Page: 1
X-Per-Page: 50
```

#### GET /events/:id

Get event by ID.

**Response:** `200 OK` or `404 Not Found`

---

### Webhooks

#### GET /webhooks

List webhooks with filtering.

**Query Parameters:**

- `tenantId` (string) - Filter by tenant ID
- `status` (string) - Filter by status: `active`, `inactive`

**Response:** `200 OK`

```json
[
  {
    "id": "webhook-001",
    "tenantId": "itg-001",
    "name": "ITG Orchestration Updates",
    "url": "https://api.itg-logistics.com/webhooks/orchestration-updates",
    "events": [
      "orchestration.created",
      "orchestration.status.updated",
      "orchestration.completed",
      "orchestration.cancelled"
    ],
    "status": "active",
    "secret": "whsec_***************************",
    "headers": {
      "X-API-Key": "api_key_***************",
      "Content-Type": "application/json"
    },
    "retryPolicy": {
      "maxRetries": 3,
      "backoffMultiplier": 2,
      "initialDelay": 1000
    },
    "statistics": {
      "totalDeliveries": 1247,
      "successfulDeliveries": 1189,
      "failedDeliveries": 58,
      "averageResponseTime": 145,
      "lastDeliveryAt": "2025-10-16T21:24:35+02:00",
      "lastSuccessAt": "2025-10-16T21:24:35+02:00",
      "lastFailureAt": "2025-10-15T21:24:35+02:00"
    },
    "createdAt": "2024-03-15T10:00:00Z",
    "updatedAt": "2025-10-16T21:24:35+02:00"
  }
]
```

#### GET /webhooks/:id

Get webhook by ID.

**Response:** `200 OK` or `404 Not Found`

---

### Health Check

#### GET /health

Health check endpoint.

**Response:** `200 OK`

```json
{
  "status": "healthy",
  "timestamp": "2025-10-17T19:25:47.867Z",
  "version": "1.0.0"
}
```

---

## Event Types

The following event types are available:

### Orchestration Events

- `orchestration.created` - Orchestration created
- `orchestration.updated` - Orchestration updated
- `orchestration.status.updated` - Status changed
- `orchestration.delay.reported` - Delay reported
- `orchestration.cancelled` - Orchestration cancelled
- `orchestration.completed` - Orchestration completed
- `orchestration.child.created` - Child orchestration created

### Container Events

- `container.location.updated` - Location updated
- `container.departed` - Container departed
- `container.arrived` - Container arrived
- `container.loaded` - Container loaded
- `container.unloaded` - Container unloaded

### Document Events

- `document.uploaded` - Document uploaded
- `document.verified` - Document verified

### Customs Events

- `customs.cleared` - Customs cleared
- `customs.inspection.required` - Inspection required

### System Events

- `party.notified` - Party notified
- `webhook.delivered` - Webhook delivered successfully
- `webhook.failed` - Webhook delivery failed

---

## Status Values

### Orchestration Status

- `draft` - Initial state
- `active` - In progress
- `completed` - Successfully completed
- `cancelled` - Cancelled
- `delayed` - Delayed

### Priority

- `normal` - Normal priority
- `medium` - Medium priority
- `high` - High priority

### Customs Status

- `pending` - Not yet cleared
- `in_progress` - Clearance in progress
- `cleared` - Cleared
- `inspection_required` - Inspection required

---

## Error Responses

### 404 Not Found

```json
{
  "error": "Orchestration not found"
}
```

### 400 Bad Request

```json
{
  "error": "Invalid request parameters"
}
```

---

## Rate Limiting

The mock API does not implement rate limiting. Production API would enforce:

- 1000 requests per minute per tenant
- 100 requests per second per tenant

---

## Pagination

All list endpoints support pagination:

- Default page size: 20 (orchestrations), 50 (events)
- Maximum page size: 100 (orchestrations), 200 (events)
- Page numbers start at 1

**Example:**

```
GET /api/v1/orchestrations?_page=2&_limit=50
```

**Response Headers:**

```
X-Total-Count: 287
X-Page: 2
X-Per-Page: 50
```

---

## Data Consistency

The mock API maintains referential integrity:

- All events reference valid orchestrations
- Child orchestrations reference valid parent orchestrations
- All orchestrations reference valid tenants
- Timestamps are chronologically consistent

---

## Differences from Production API

The mock API differs from production in these ways:

1. **No Authentication:** Mock API doesn't require tokens
2. **No Rate Limiting:** Unlimited requests
3. **No WebSockets:** Events are only available via REST
4. **Simplified Validation:** Less strict input validation
5. **No File Uploads:** Document uploads are simulated
6. **Static Webhooks:** Webhooks don't actually deliver
7. **No Audit Trail:** Changes aren't tracked in audit log

For production integration, ensure your code handles:

- Authentication headers
- Rate limit responses (429 Too Many Requests)
- WebSocket connections for real-time events
- File upload multipart/form-data requests
- Stricter validation errors
