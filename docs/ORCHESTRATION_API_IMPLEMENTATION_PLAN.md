# Orchestration API Implementation Plan

**Date:** October 18, 2025
**Status:** Infrastructure Complete - API Implementation Ready
**Estimated Effort:** 6-8 hours remaining

---

## ✅ Completed - Infrastructure Setup (2 hours)

### 1. Azure Cosmos DB with Gremlin API
- ✅ Account: `cosmos-ctn-orchestrator-dev`
- ✅ Database: `OrchestrationDB`
- ✅ Graph: `Orchestrations`
- ✅ Throughput: 400 RU/s (autoscale)
- ✅ Partition Key: `/partitionKey`
- ✅ Endpoint: `https://cosmos-ctn-orchestrator-dev.documents.azure.com:443/`

### 2. Key Vault Secrets
- ✅ `COSMOS-ORCHESTRATION-ENDPOINT` - Connection endpoint
- ✅ `COSMOS-ORCHESTRATION-KEY` - Primary access key

### 3. Architecture Documentation
- ✅ Reviewed: `20250926-ctn-orchestration-register.md`
- ✅ Reviewed: `20251017-ctn-orchestration-register-nested-architecture.md`
- ✅ Reviewed: `20251017-ctn-orchestration-register-deployment-guide.md`
- ✅ Graph database chosen for nested hierarchies and visibility boundaries

---

## 📋 Next Steps - API Implementation (6-8 hours)

### Phase 1: Graph Data Model Design (1 hour)

#### Vertex Types
```javascript
// Orchestration Vertex
{
  label: "orchestration",
  id: "orch-123",
  partitionKey: "bco-456",
  properties: {
    container_id: "MSCU1234567",
    bol_number: "BOL-2025-12345",
    status: "IN_TRANSIT",  // DRAFT, ACTIVE, IN_TRANSIT, COMPLETED, CANCELLED
    created_at: "2025-10-18T12:00:00Z",
    created_by: "bco-456",
    expires_at: "2025-11-18T12:00:00Z",
    priority: "HIGH"
  }
}

// Party Vertex
{
  label: "party",
  id: "party-789",
  partitionKey: "party-789",
  properties: {
    legal_entity_id: "le-uuid",
    name: "Rotterdam Terminal",
    role: "TERMINAL",  // BCO, FORWARDER, TERMINAL, CARRIER, TRUCKER, AUTHORITY
    member_status: true,
    access_level: "FULL"  // FULL, LIMITED, BASIC
  }
}

// Event Vertex
{
  label: "event",
  id: "event-456",
  partitionKey: "orch-123",
  properties: {
    event_type: "CONTAINER_GATE_IN",
    timestamp: "2025-10-18T14:30:00Z",
    location: "Rotterdam Port",
    details: {...}
  }
}
```

#### Edge Types
```javascript
// Orchestration → Party (INVOLVES)
{
  label: "involves",
  from: "orch-123",
  to: "party-789",
  properties: {
    role: "TERMINAL",
    involvement_type: "PRIMARY",  // PRIMARY, SUBCONTRACTOR
    added_at: "2025-10-18T12:00:00Z",
    added_by: "bco-456"
  }
}

// Orchestration → Orchestration (PARENT_OF)
{
  label: "parent_of",
  from: "orch-parent",
  to: "orch-child",
  properties: {
    visibility_boundary: true,  // Parent cannot see child's parties
    created_at: "2025-10-18T13:00:00Z"
  }
}

// Event → Orchestration (OCCURRED_IN)
{
  label: "occurred_in",
  from: "event-456",
  to: "orch-123",
  properties: {
    notified: true,
    notification_sent_at: "2025-10-18T14:31:00Z"
  }
}
```

### Phase 2: Gremlin Query Library (2 hours)

#### Query 1: Get All Orchestrations
```gremlin
// Get orchestrations for a party (with pagination)
g.V().hasLabel('party').has('id', 'party-789')
  .in('involves')
  .hasLabel('orchestration')
  .has('status', within('ACTIVE', 'IN_TRANSIT'))
  .order().by('created_at', desc)
  .range(skip, limit)
  .project('id', 'container_id', 'bol_number', 'status', 'created_at', 'parties')
  .by('id')
  .by('container_id')
  .by('bol_number')
  .by('status')
  .by('created_at')
  .by(out('involves').valueMap('role', 'name').fold())
```

#### Query 2: Get Orchestration Details
```gremlin
// Get orchestration with all parties (respecting visibility boundaries)
g.V('orch-123')
  .project('orchestration', 'parties', 'events', 'parent', 'children')
  .by(valueMap(true))
  .by(out('involves').valueMap(true).fold())
  .by(in('occurred_in').order().by('timestamp', desc).limit(10).valueMap(true).fold())
  .by(in('parent_of').valueMap('id', 'container_id').fold())
  .by(out('parent_of').valueMap('id', 'container_id').fold())
```

#### Query 3: Create Orchestration
```gremlin
// Create orchestration vertex
g.addV('orchestration')
  .property('id', 'orch-new')
  .property('partitionKey', 'bco-123')
  .property('container_id', 'MSCU7654321')
  .property('bol_number', 'BOL-2025-67890')
  .property('status', 'DRAFT')
  .property('created_at', now())
  .property('created_by', 'bco-123')
```

#### Query 4: Add Party to Orchestration
```gremlin
// Add party with INVOLVES edge
g.V('orch-123')
  .addE('involves')
  .to(V('party-789'))
  .property('role', 'TERMINAL')
  .property('involvement_type', 'PRIMARY')
  .property('added_at', now())
```

#### Query 5: Get Events for Orchestration
```gremlin
// Get recent events with ordering
g.V('orch-123')
  .in('occurred_in')
  .hasLabel('event')
  .order().by('timestamp', desc)
  .limit(20)
  .valueMap(true)
```

#### Query 6: Visibility-Respecting Query
```gremlin
// Only show parties at my level (not child orchestration parties)
g.V('orch-parent')
  .out('involves')
  .hasLabel('party')
  .valueMap(true)

// Child orchestration parties are hidden:
g.V('orch-parent')
  .out('parent_of')  // Go to child
  .out('involves')   // Would return child's parties (not allowed!)
  // This query should be blocked by authorization layer
```

### Phase 3: Azure Functions API (3 hours)

#### Function 1: GetOrchestrations
**Route:** `GET /api/v1/orchestrations`
**Query Params:** `?status=ACTIVE&page=1&limit=20`
**Logic:**
1. Authenticate user (Azure AD)
2. Get party_id from token
3. Query Gremlin for orchestrations where party is involved
4. Return paginated results

#### Function 2: GetOrchestrationDetails
**Route:** `GET /api/v1/orchestrations/:id`
**Logic:**
1. Authenticate user
2. Verify user's party is involved in orchestration
3. Query Gremlin for orchestration with parties, events
4. Enforce visibility boundaries (don't show child orchestration details)
5. Return orchestration data

#### Function 3: GetEvents
**Route:** `GET /api/v1/events`
**Query Params:** `?orchestration_id=orch-123&event_type=CONTAINER_GATE_IN&limit=50`
**Logic:**
1. Authenticate user
2. Verify access to orchestration
3. Query Gremlin for events
4. Return event stream

#### Function 4: GetWebhooks
**Route:** `GET /api/v1/webhooks`
**Logic:**
1. Authenticate user
2. Get party's webhook subscriptions from database
3. Return webhook configurations

**Note:** Webhooks may use PostgreSQL table instead of graph database (simpler for this use case)

### Phase 4: Gremlin Client Integration (1 hour)

#### Install Dependencies
```bash
cd api
npm install gremlin @azure/identity
```

#### Create Gremlin Connection Utility
```typescript
// api/src/utils/gremlinClient.ts
import gremlin from 'gremlin';

const authenticator = new gremlin.driver.auth.PlainTextSaslAuthenticator(
  `/dbs/${database}/colls/${graph}`,
  primaryKey
);

const client = new gremlin.driver.Client(
  endpoint,
  {
    authenticator,
    traversalsource: "g",
    rejectUnauthorized: true,
    mimeType: "application/vnd.gremlin-v2.0+json"
  }
);

export async function executeQuery(query: string, bindings?: any) {
  return await client.submit(query, bindings);
}
```

### Phase 5: Testing (1 hour)

#### Unit Tests
- Test Gremlin query construction
- Test visibility boundary enforcement
- Test pagination logic

#### E2E Tests (Playwright)
- Create orchestration via UI
- View orchestration list
- View orchestration details
- Subscribe to events
- Verify child orchestration hidden from parent

### Phase 6: Deployment (1 hour)

#### Update Function App Settings
```bash
az functionapp config appsettings set \
  --name func-ctn-demo-asr-dev \
  --resource-group rg-ctn-demo-asr-dev \
  --settings \
    COSMOS_ORCHESTRATION_ENDPOINT="@Microsoft.KeyVault(SecretUri=https://kv-ctn-demo-asr-dev.vault.azure.com/secrets/COSMOS-ORCHESTRATION-ENDPOINT/)" \
    COSMOS_ORCHESTRATION_KEY="@Microsoft.KeyVault(SecretUri=https://kv-ctn-demo-asr-dev.vault.azure.com/secrets/COSMOS-ORCHESTRATION-KEY/)" \
    COSMOS_ORCHESTRATION_DATABASE="OrchestrationDB" \
    COSMOS_ORCHESTRATION_GRAPH="Orchestrations"
```

#### Deploy Functions
```bash
cd api
npm run build
func azure functionapp publish func-ctn-demo-asr-dev --typescript --build remote
```

#### Verify Deployment
```bash
# Test orchestrations endpoint
curl https://func-ctn-demo-asr-dev.azurewebsites.net/api/v1/orchestrations \
  -H "Authorization: Bearer <token>"
```

---

## 📊 Progress Summary

**Total Estimated Effort:** 8 hours
**Completed:** 2 hours (25%)
**Remaining:** 6 hours (75%)

**Status:** Ready to start API implementation

**Blockers:** None - all infrastructure is in place

---

## 🎯 Success Criteria

1. ✅ All 4 endpoints implemented and deployed
2. ✅ Orchestrations stored in Cosmos DB Gremlin
3. ✅ Visibility boundaries enforced
4. ✅ Nested orchestrations supported
5. ✅ Events tracked and queryable
6. ✅ Webhooks configured
7. ✅ E2E tests pass
8. ✅ Orchestrator Portal shows live data

---

## 📚 References

- **Architecture:** `ctn-docs-portal/docs/arc42/05-building-blocks/20250926-ctn-orchestration-register.md`
- **Nested Orchestrations:** `ctn-docs-portal/docs/arc42/05-building-blocks/20251017-ctn-orchestration-register-nested-architecture.md`
- **Deployment Guide:** `ctn-docs-portal/docs/arc42/07-deployment/20251017-ctn-orchestration-register-deployment-guide.md`
- **API Spec:** `ctn-docs-portal/docs/arc42/05-building-blocks/20251017-ctn-orchestration-register-pip-api-spec.md`
- **Cosmos DB Gremlin Docs:** https://docs.microsoft.com/en-us/azure/cosmos-db/gremlin/
- **Gremlin Node.js Client:** https://www.npmjs.com/package/gremlin

---

**Next Session:** Start with Phase 2 (Gremlin Query Library) and implement the 4 API functions.
