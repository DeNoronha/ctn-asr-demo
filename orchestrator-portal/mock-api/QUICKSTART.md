# Quick Start Guide - Mock API

## 1. Start the Mock API Server

```bash
# From the orchestrator-portal root directory
npm run mock-api
```

Or directly from the mock-api directory:

```bash
cd mock-api
npm start
```

The server will start at `http://localhost:3001`

## 2. Test the API

### Get all orchestrations
```bash
curl http://localhost:3001/api/v1/orchestrations
```

### Get ITG orchestrations
```bash
curl http://localhost:3001/api/v1/orchestrations?tenantId=itg-001
```

### Get active orchestrations
```bash
curl http://localhost:3001/api/v1/orchestrations?status=active
```

### Search for a container
```bash
curl http://localhost:3001/api/v1/orchestrations?search=MSCU
```

### Get specific orchestration with events
```bash
curl http://localhost:3001/api/v1/orchestrations/orch-itg-001000
```

### Get recent events
```bash
curl http://localhost:3001/api/v1/events?_page=1&_limit=20
```

### Get all tenants
```bash
curl http://localhost:3001/api/v1/tenants
```

### Get all webhooks
```bash
curl http://localhost:3001/api/v1/webhooks
```

## 3. Use in Your Application

Update your `.env` file:

```bash
VITE_API_BASE_URL=http://localhost:3001/api/v1
```

## 4. Regenerate Data (Optional)

If you want fresh random data:

```bash
# From orchestrator-portal root
npm run mock-api:generate

# Or from mock-api directory
npm run generate-db
```

## 5. Development Mode

This will regenerate the database and start the server:

```bash
# From orchestrator-portal root
npm run mock-api:dev

# Or from mock-api directory
npm run dev
```

## Data Overview

After starting the server, you'll see:

```
===========================================
  Orchestrator Portal Mock API Server
===========================================

  Server running at: http://localhost:3001

  Available endpoints:
    GET    /api/v1/tenants
    GET    /api/v1/orchestrations
    GET    /api/v1/orchestrations/:id
    POST   /api/v1/orchestrations
    PATCH  /api/v1/orchestrations/:id
    GET    /api/v1/events
    GET    /api/v1/webhooks
    GET    /health

  Query parameters:
    ?tenantId=xxx       - Filter by tenant
    ?status=xxx         - Filter by status
    ?type=root|child    - Filter orchestrations
    ?search=xxx         - Search containers/BOLs
    ?_page=1&_limit=20  - Pagination

===========================================
```

## Available Tenants

- **ITG Intermodal Transport Group** (ID: `itg-001`)
- **Rotterdam Container Terminal** (ID: `rotterdam-terminal-001`)

## Available Statuses

- `active`
- `completed`
- `cancelled`
- `draft`
- `delayed`

## Sample Container IDs

The mock data includes containers from various shipping lines:
- MSCU (MSC)
- MAEU (Maersk)
- TCLU (Triton)
- HLCU (Hapag-Lloyd)
- CSQU (COSCO)
- TEMU (ONE)
- OOLU (OOCL)
- CMAU (CMA CGM)

## Sample Routes

- Rotterdam → Duisburg
- Amsterdam → Basel
- Antwerp → Hamburg
- Rotterdam → Cologne
- Amsterdam → Venlo
