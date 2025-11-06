# Zitadel M2M Authentication Setup Guide

**Last Updated:** November 6, 2025
**Version:** 1.0
**Author:** CTN ASR Team

---

## Table of Contents

1. [Overview](#overview)
2. [Architecture](#architecture)
3. [Prerequisites](#prerequisites)
4. [Quick Start](#quick-start)
5. [Detailed Setup](#detailed-setup)
6. [Configuration](#configuration)
7. [Database Schema](#database-schema)
8. [API Integration](#api-integration)
9. [Testing](#testing)
10. [Production Deployment](#production-deployment)
11. [Security Considerations](#security-considerations)
12. [Troubleshooting](#troubleshooting)
13. [API Reference](#api-reference)

---

## Overview

This guide explains how to set up **Zitadel** as a self-hosted identity provider (IDP) for machine-to-machine (M2M) authentication in the CTN Association Register (ASR) API.

### Why Zitadel?

- **Self-hosted:** Full control over identity infrastructure
- **Non-US:** Independent from US-based cloud providers
- **OAuth2.0/OIDC compliant:** Industry-standard authentication
- **Open-source:** No vendor lock-in, transparent security
- **Multi-tenancy:** Single instance supports multiple organizations

### Use Cases

- **Terminal operators** accessing container tracking APIs
- **Carriers** updating ETA information
- **External portals** integrating with CTN ASR services
- **IoT devices** sending telemetry data
- **Batch processing** systems performing automated operations

### Authentication Flow

```
┌─────────────────┐
│  M2M Client     │
│  (Carrier/      │
│   Terminal)     │
└────────┬────────┘
         │
         │ 1. POST /oauth/v2/token
         │    grant_type=client_credentials
         │    client_id=...
         │    client_secret=...
         │
         ▼
┌─────────────────┐
│    Zitadel      │
│   (IDP Server)  │
└────────┬────────┘
         │
         │ 2. JWT Access Token
         │    (signed, time-limited)
         │
         ▼
┌─────────────────┐
│  M2M Client     │
└────────┬────────┘
         │
         │ 3. GET /api/v1/members
         │    Authorization: Bearer <jwt>
         │
         ▼
┌─────────────────┐
│  CTN ASR API    │
│  (Azure         │
│   Functions)    │
└────────┬────────┘
         │
         │ 4. Validate JWT:
         │    - Signature (JWKS)
         │    - Expiration
         │    - Audience
         │    - Issuer
         │
         ├─ Valid? ──────────► 5. Process Request
         │                          Return Data
         │
         └─ Invalid? ────────► 401 Unauthorized
```

---

## Architecture

### Components

1. **Zitadel Instance** (Docker)
   - Identity provider
   - OAuth2.0/OIDC server
   - User and service account management
   - JWT token issuance

2. **PostgreSQL Database** (Docker)
   - Zitadel data persistence
   - Separate from CTN ASR database

3. **CTN ASR API** (Azure Functions)
   - Resource server
   - JWT validation middleware
   - Party-based authorization

4. **CTN ASR Database** (PostgreSQL)
   - M2M credentials mapping
   - Party associations
   - Usage audit logs

### Integration Points

```
┌──────────────────────────────────────────────────────┐
│                                                      │
│  ┌────────────┐          ┌────────────┐            │
│  │  Zitadel   │          │ Zitadel DB │            │
│  │  Instance  │◄─────────│(PostgreSQL)│            │
│  │  (Docker)  │          │  (Docker)  │            │
│  └─────┬──────┘          └────────────┘            │
│        │                                             │
│        │ JWKS Endpoint                              │
│        │ /oauth/v2/keys                             │
│        │                                             │
└────────┼─────────────────────────────────────────────┘
         │
         │ Public Key
         │ Retrieval
         │
┌────────▼─────────────────────────────────────────────┐
│                                                      │
│  ┌────────────┐          ┌────────────┐            │
│  │  CTN ASR   │◄─────────│  CTN ASR   │            │
│  │    API     │          │  Database  │            │
│  │  (Azure    │          │(PostgreSQL)│            │
│  │ Functions) │          │            │            │
│  └────────────┘          └────────────┘            │
│       │                         │                   │
│       │ Validate JWT            │ Resolve Party    │
│       │ Check Audience          │ Check Permissions│
│       │ Verify Signature        │                  │
│                                                      │
└──────────────────────────────────────────────────────┘
```

---

## Prerequisites

### Software Requirements

- **Docker Desktop** (or Docker Engine + Docker Compose)
  - Version 20.10 or higher
  - [Download](https://www.docker.com/products/docker-desktop)

- **Node.js**
  - Version 20.x (same as Azure Functions)
  - [Download](https://nodejs.org/)

- **jq** (JSON processor for shell scripts)
  ```bash
  brew install jq  # macOS
  ```

- **curl** (for API testing)
  - Pre-installed on macOS/Linux

- **psql** (PostgreSQL client - optional, for database inspection)
  ```bash
  brew install postgresql  # macOS
  ```

### Access Requirements

- **Admin access** to CTN ASR database
- **Azure Functions** deployment permissions
- **Docker** permissions on local machine

### Network Requirements

- Port **8080** available (Zitadel API)
- Port **5433** available (Zitadel PostgreSQL - avoids conflict with ASR DB on 5432)

---

## Quick Start

### 1. Start Zitadel

```bash
cd /path/to/ASR-full

# Copy environment template
cp .env.zitadel.example .env.zitadel

# Edit configuration (change passwords!)
nano .env.zitadel

# Start Zitadel and PostgreSQL
docker-compose -f docker-compose.zitadel.yml --env-file .env.zitadel up -d

# Check status
docker-compose -f docker-compose.zitadel.yml ps

# Wait for initialization (30-60 seconds)
docker-compose -f docker-compose.zitadel.yml logs -f zitadel
# Look for: "successfully started"
```

### 2. Access Zitadel Console

Open browser: [http://localhost:8080/ui/console](http://localhost:8080/ui/console)

**Default Login:**
- Username: `admin` (from .env.zitadel)
- Password: `Admin123!` (from .env.zitadel)

**IMPORTANT:** Change password immediately after first login!

### 3. Run Setup Script

```bash
# Install jq if not already installed
brew install jq

# Run automated setup
./scripts/setup-zitadel-m2m.sh

# Follow prompts and save credentials
# Output file: zitadel-credentials.json
```

### 4. Apply Database Migration

```bash
# Connect to CTN ASR database
psql "host=psql-ctn-demo-asr-dev.postgres.database.azure.com \
  port=5432 \
  dbname=ctn_asr \
  user=asr_admin \
  sslmode=require"

# Run migration
\i database/migrations/023-zitadel-m2m-credentials.sql

# Verify tables created
\dt ctn_m2m_credentials
\dt ctn_zitadel_secret_audit
```

### 5. Test M2M Authentication

```bash
# Test authentication flow
node examples/m2m-auth-flow.js test-client

# Expected output:
# ✓ Access token received
# ✓ API responded with status: 200
# ✓ Token validation successful
```

---

## Detailed Setup

### Step 1: Zitadel Configuration

#### 1.1 Configure Environment

Edit `.env.zitadel`:

```bash
# Development settings
ZITADEL_DOMAIN=localhost
ZITADEL_PORT=8080
ZITADEL_SECURE=false

# Organization
ZITADEL_ORG_NAME=CTN Association Register

# Admin user (change password!)
ZITADEL_ADMIN_USERNAME=admin
ZITADEL_ADMIN_PASSWORD=YourStrongPassword123!
ZITADEL_ADMIN_EMAIL=admin@ctn-asr.local

# Database
ZITADEL_DB_PASSWORD=YourDatabasePassword456!

# Master key (CRITICAL - back this up!)
ZITADEL_MASTERKEY=MustBeAtLeast32CharactersLongChangeMe789!
```

**CRITICAL:** The `ZITADEL_MASTERKEY` encrypts sensitive data. Back it up securely!

#### 1.2 Start Services

```bash
docker-compose -f docker-compose.zitadel.yml --env-file .env.zitadel up -d
```

**Verify startup:**
```bash
# Check container status
docker-compose -f docker-compose.zitadel.yml ps

# Should show:
# NAME              STATUS
# ctn-zitadel       Up (healthy)
# ctn-zitadel-db    Up (healthy)

# Check logs
docker-compose -f docker-compose.zitadel.yml logs zitadel | grep "successfully started"
```

#### 1.3 Initial Console Login

1. Open http://localhost:8080/ui/console
2. Login with admin credentials
3. Complete initial setup wizard:
   - Verify organization name
   - Set email settings (optional for dev)
   - Review default policies

### Step 2: Project and Service Account Setup

#### Option A: Automated Setup (Recommended)

```bash
./scripts/setup-zitadel-m2m.sh
```

This script automatically creates:
- CTN ASR API project
- API application for token validation
- 4 service accounts (test, terminal, carrier, portal)
- Client credentials for each service account
- Project roles and grants

**Output:** `zitadel-credentials.json`

```json
{
  "project_id": "123456789",
  "api_client_id": "123456789@project",
  "api_client_secret": "secret...",
  "service_accounts": [
    {
      "name": "terminal-operator",
      "description": "Terminal Operator M2M Client",
      "user_id": "987654321",
      "client_id": "987654321@123456789",
      "client_secret": "secret..."
    }
  ]
}
```

#### Option B: Manual Setup

**1. Create Project:**

- Navigate to: Projects → New Project
- Name: `CTN ASR API`
- Enable: Project Role Assertion ✓
- Enable: Project Role Check ✓

**2. Create API Application:**

- Select project → Applications → New Application
- Name: `CTN ASR Backend`
- Type: API
- Authentication: Basic Auth

**3. Create Service Users:**

- Navigate to: Users → Service Users → New
- Username: `terminal-operator`
- Name: `Terminal Operator M2M Client`
- Access Token Type: JWT

**4. Generate Client Secret:**

- Select service user → Actions → Generate Client Secret
- **CRITICAL:** Copy secret immediately - shown only once!

**5. Grant Project Access:**

- Select service user → Authorizations
- Grant: `CTN ASR API` project
- Role: `api.access`

Repeat steps 3-5 for each organization type (carrier, portal, etc.)

### Step 3: Database Schema Setup

#### 3.1 Apply Migration

```bash
# Connect to database
psql "host=psql-ctn-demo-asr-dev.postgres.database.azure.com \
  port=5432 \
  dbname=ctn_asr \
  user=asr_admin \
  sslmode=require"

# Run migration
\i database/migrations/023-zitadel-m2m-credentials.sql
```

#### 3.2 Verify Tables

```sql
-- Check table structure
\d ctn_m2m_credentials
\d ctn_zitadel_secret_audit

-- View created indexes
\di ctn_m2m*

-- Check view
\dv v_zitadel_m2m_active
```

#### 3.3 Seed Initial Data

```sql
-- Example: Map test-client to a party
INSERT INTO ctn_m2m_credentials (
  party_id,
  zitadel_client_id,
  zitadel_project_id,
  zitadel_user_id,
  service_account_name,
  description,
  auth_provider,
  auth_issuer,
  assigned_scopes,
  created_by
) VALUES (
  (SELECT party_id FROM party_reference WHERE party_name = 'Test Terminal Operator' LIMIT 1),
  '987654321@123456789',  -- From zitadel-credentials.json
  '123456789',
  '987654321',
  'terminal-operator',
  'Terminal operator M2M authentication',
  'zitadel',
  'http://localhost:8080',
  ARRAY['api.access', 'containers.read', 'eta.write'],
  (SELECT party_id FROM party_reference WHERE party_type = 'System' LIMIT 1)
);

-- Verify
SELECT * FROM v_zitadel_m2m_active;
```

### Step 4: API Integration

#### 4.1 Configure Environment Variables

Add to Azure Functions `local.settings.json`:

```json
{
  "IsEncrypted": false,
  "Values": {
    "ZITADEL_ISSUER": "http://localhost:8080",
    "ZITADEL_PROJECT_ID": "123456789",
    "ZITADEL_API_CLIENT_ID": "123456789@project"
  }
}
```

For Azure deployment, add to Application Settings:

```bash
az functionapp config appsettings set \
  --name func-ctn-demo-asr-dev \
  --resource-group ctn-demo \
  --settings \
    ZITADEL_ISSUER="https://zitadel.ctn-asr.com" \
    ZITADEL_PROJECT_ID="123456789" \
    ZITADEL_API_CLIENT_ID="123456789@project"
```

#### 4.2 Use Zitadel Middleware

**Example endpoint with Zitadel authentication:**

```typescript
// api/src/functions/GetContainers.ts
import { app, HttpRequest, HttpResponseInit, InvocationContext } from '@azure/functions';
import { authenticateDual } from '../middleware/zitadel-auth';
import { wrapEndpoint } from '../middleware/endpointWrapper';

async function getContainersHandler(
  request: HttpRequest,
  context: InvocationContext
): Promise<HttpResponseInit> {
  // Request is already authenticated (Azure AD or Zitadel)
  const partyId = (request as any).partyId;
  const isM2M = (request as any).isM2M;

  context.log(`Fetching containers for party: ${partyId} (M2M: ${isM2M})`);

  // ... business logic ...

  return {
    status: 200,
    jsonBody: {
      data: containers,
      count: containers.length
    }
  };
}

// Register with dual authentication (Azure AD or Zitadel)
app.http('GetContainers', {
  methods: ['GET'],
  authLevel: 'anonymous',
  route: 'v1/containers',
  handler: wrapEndpoint(getContainersHandler, {
    authenticate: authenticateDual, // Supports both Azure AD and Zitadel
    requiredScopes: ['containers.read'],
  }),
});
```

**Zitadel-only authentication:**

```typescript
import { authenticateZitadel } from '../middleware/zitadel-auth';

app.http('GetContainersM2M', {
  methods: ['GET'],
  authLevel: 'anonymous',
  route: 'v1/m2m/containers',
  handler: wrapEndpoint(getContainersHandler, {
    authenticate: authenticateZitadel, // Only Zitadel tokens accepted
    requiredScopes: ['containers.read'],
  }),
});
```

---

## Configuration

### Environment Variables

#### Zitadel Instance (.env.zitadel)

| Variable | Required | Default | Description |
|----------|----------|---------|-------------|
| `ZITADEL_DOMAIN` | Yes | `localhost` | Domain where Zitadel is accessible |
| `ZITADEL_PORT` | Yes | `8080` | Port for Zitadel UI and API |
| `ZITADEL_SECURE` | Yes | `false` | Enable HTTPS (true for production) |
| `ZITADEL_ORG_NAME` | Yes | `CTN Association Register` | Organization name |
| `ZITADEL_ADMIN_USERNAME` | Yes | `admin` | Initial admin username |
| `ZITADEL_ADMIN_PASSWORD` | Yes | `Admin123!` | Initial admin password |
| `ZITADEL_DB_PASSWORD` | Yes | - | PostgreSQL password |
| `ZITADEL_MASTERKEY` | Yes | - | Encryption master key (32+ chars) |

#### Azure Functions (local.settings.json / App Settings)

| Variable | Required | Description |
|----------|----------|-------------|
| `ZITADEL_ISSUER` | Yes | Zitadel instance URL (e.g., `https://zitadel.ctn-asr.com`) |
| `ZITADEL_PROJECT_ID` | Yes | Project ID from setup script |
| `ZITADEL_API_CLIENT_ID` | Yes | API application client ID |

### Scopes

Define scopes based on API capabilities:

| Scope | Description | Example Usage |
|-------|-------------|---------------|
| `api.access` | Basic API access | Required for all M2M clients |
| `containers.read` | Read container data | Terminal operators viewing containers |
| `containers.write` | Update container data | Carriers updating container status |
| `eta.read` | Read ETA information | External portals displaying ETAs |
| `eta.write` | Update ETA information | Carriers updating arrival times |
| `members.read` | Read member data | Admin applications |
| `members.write` | Manage member data | Registration systems |
| `bookings.read` | Read bookings | Orchestration systems |
| `bookings.write` | Create/update bookings | DocuFlow integration |

### Token Configuration

Default token settings:

- **Access token lifetime:** 3600 seconds (1 hour)
- **Refresh token:** Not applicable for M2M (client credentials)
- **Token type:** JWT (signed with RS256)
- **Signature algorithm:** RS256 (RSA with SHA-256)

To customize token lifetime in Zitadel:
1. Navigate to: Project → Applications → Select API Application
2. Settings → Token Settings
3. Adjust: Access Token Lifetime
4. Save

---

## Database Schema

### Tables

#### ctn_m2m_credentials

Maps Zitadel service accounts to CTN parties.

| Column | Type | Description |
|--------|------|-------------|
| `credential_id` | UUID | Primary key |
| `party_id` | UUID | CTN party ID (FK) |
| `zitadel_client_id` | VARCHAR(500) | Zitadel client ID (`user_id@project_id`) |
| `zitadel_project_id` | VARCHAR(255) | Zitadel project ID |
| `zitadel_user_id` | VARCHAR(255) | Zitadel service user ID |
| `service_account_name` | VARCHAR(255) | Friendly name |
| `description` | TEXT | Purpose description |
| `auth_provider` | VARCHAR(50) | `zitadel`, `azure_ad`, `okta` |
| `auth_issuer` | VARCHAR(500) | Issuer URL |
| `assigned_scopes` | TEXT[] | Granted scopes |
| `allowed_endpoints` | TEXT[] | Optional endpoint restrictions |
| `is_active` | BOOLEAN | Active status |
| `last_used_at` | TIMESTAMPTZ | Last authentication timestamp |
| `total_requests` | INTEGER | Request counter |

**Indexes:**
- `idx_zitadel_m2m_client_id` (performance-critical for auth)
- `idx_zitadel_m2m_party`
- `idx_zitadel_m2m_active`

#### ctn_zitadel_secret_audit

Audit log for client secret lifecycle.

| Column | Type | Description |
|--------|------|-------------|
| `audit_id` | UUID | Primary key |
| `credential_id` | UUID | Related credential (FK) |
| `secret_generated_at` | TIMESTAMPTZ | Generation timestamp |
| `generated_by` | UUID | Party who generated |
| `is_revoked` | BOOLEAN | Revocation status |
| `revoked_at` | TIMESTAMPTZ | Revocation timestamp |
| `revoked_by` | UUID | Party who revoked |

**Important:** Never stores actual secrets - metadata only.

### Views

#### v_zitadel_m2m_active

Convenience view for active credentials with party information.

```sql
SELECT * FROM v_zitadel_m2m_active
WHERE party_id = 'some-uuid';
```

### Functions

#### update_zitadel_m2m_usage()

Updates usage statistics after successful authentication.

```sql
SELECT update_zitadel_m2m_usage(
  '987654321@123456789',
  '203.0.113.42'
);
```

Called automatically by Zitadel middleware.

---

## API Integration

### Middleware Components

#### authenticateZitadel()

Validates Zitadel JWT tokens, resolves party ID.

```typescript
import { authenticateZitadel } from '../middleware/zitadel-auth';

const result = await authenticateZitadel(request, context);
if ('status' in result) {
  return result; // Authentication failed (401)
}

const authenticatedRequest = result.request;
// Access: authenticatedRequest.partyId, .isM2M, .clientId
```

#### authenticateDual()

Supports both Azure AD and Zitadel tokens (detects issuer).

```typescript
import { authenticateDual } from '../middleware/zitadel-auth';

const result = await authenticateDual(request, context);
// Automatically routes to correct authentication provider
```

#### requireZitadelRole()

Enforces role-based access control.

```typescript
import { requireZitadelRole } from '../middleware/zitadel-auth';

const roleResult = requireZitadelRole(
  authenticatedRequest,
  context,
  'containers.write'
);

if ('status' in roleResult) {
  return roleResult; // Insufficient permissions (403)
}
```

### Request Flow

```typescript
// Full authentication and authorization example
async function secureEndpointHandler(
  request: HttpRequest,
  context: InvocationContext
): Promise<HttpResponseInit> {
  // 1. Authenticate (dual mode)
  const authResult = await authenticateDual(request, context);
  if ('status' in authResult) {
    return authResult; // 401 Unauthorized
  }

  const authedRequest = authResult.request;

  // 2. Check role
  const roleResult = requireZitadelRole(authedRequest, context, 'containers.write');
  if ('status' in roleResult) {
    return roleResult; // 403 Forbidden
  }

  // 3. Verify party access (IDOR prevention)
  const requestedPartyId = authedRequest.params.partyId;
  if (authedRequest.partyId !== requestedPartyId && !authedRequest.userRoles?.includes('admin')) {
    return {
      status: 404, // Not 403 - prevent information disclosure
      jsonBody: { error: 'not_found', message: 'Resource not found' }
    };
  }

  // 4. Process request
  // ...business logic...

  return { status: 200, jsonBody: { success: true } };
}
```

### Error Responses

#### 401 Unauthorized

Token validation failed.

```json
{
  "error": "unauthorized",
  "message": "Invalid Zitadel token: signature verification failed"
}
```

#### 403 Forbidden

Authenticated but insufficient permissions.

```json
{
  "error": "forbidden",
  "message": "Insufficient permissions. Required role: containers.write"
}
```

#### 404 Not Found

IDOR prevention - party doesn't match or doesn't exist.

```json
{
  "error": "not_found",
  "message": "Resource not found"
}
```

---

## Testing

### Unit Tests

#### Test JWT Validation

```bash
cd api
npm test -- zitadel-auth.test.ts
```

#### Test Middleware Integration

```bash
npm test -- middleware-integration.test.ts
```

### Integration Tests

#### Test M2M Flow

```bash
# Start Zitadel
docker-compose -f docker-compose.zitadel.yml up -d

# Run example script
node examples/m2m-auth-flow.js test-client

# Expected output:
# ✓ Access token received
# ✓ API responded with status: 200
# ✓ Token is valid for 3599 more seconds
```

#### Test with curl

```bash
# 1. Get access token
TOKEN=$(curl -s -X POST "http://localhost:8080/oauth/v2/token" \
  -u "987654321@123456789:your-client-secret" \
  -d "grant_type=client_credentials" \
  -d "scope=openid profile email urn:zitadel:iam:org:project:id:zitadel:aud" \
  | jq -r '.access_token')

echo "Token: $TOKEN"

# 2. Call API
curl -X GET "http://localhost:7071/api/v1/containers" \
  -H "Authorization: Bearer $TOKEN" \
  -H "Accept: application/json" \
  | jq '.'

# Expected: 200 OK with container data
```

#### Test Invalid Token

```bash
# Test with invalid token
curl -X GET "http://localhost:7071/api/v1/containers" \
  -H "Authorization: Bearer invalid-token" \
  -H "Accept: application/json" \
  | jq '.'

# Expected: 401 Unauthorized
```

#### Test Insufficient Permissions

```bash
# Get token with limited scopes
TOKEN=$(curl -s -X POST "http://localhost:8080/oauth/v2/token" \
  -u "987654321@123456789:your-client-secret" \
  -d "grant_type=client_credentials" \
  -d "scope=openid containers.read" \  # Missing containers.write
  | jq -r '.access_token')

# Try to update container (requires containers.write)
curl -X PUT "http://localhost:7071/api/v1/containers/CTN123" \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"status":"in_transit"}' \
  | jq '.'

# Expected: 403 Forbidden
```

### Load Testing

#### Apache Bench

```bash
# Generate 1000 requests with 10 concurrent connections
# First, get a valid token
TOKEN="<access-token-from-previous-step>"

# Create request file
cat > request.txt << EOF
GET /api/v1/health HTTP/1.1
Host: localhost:7071
Authorization: Bearer $TOKEN
Accept: application/json

EOF

# Run load test
ab -n 1000 -c 10 -T 'application/json' \
  -H "Authorization: Bearer $TOKEN" \
  http://localhost:7071/api/v1/health

# Check results:
# - Requests per second
# - Average response time
# - Failed requests (should be 0)
```

---

## Production Deployment

### Zitadel Production Configuration

#### 1. Infrastructure

**Option A: Docker Swarm**

```yaml
# docker-compose.prod.yml
version: '3.8'

services:
  zitadel:
    image: ghcr.io/zitadel/zitadel:latest
    command: 'start --masterkeyFromEnv --tlsMode external'
    environment:
      ZITADEL_EXTERNALDOMAIN: zitadel.ctn-asr.com
      ZITADEL_EXTERNALPORT: 443
      ZITADEL_EXTERNALSECURE: true
      ZITADEL_TLS_ENABLED: false  # TLS terminated at reverse proxy
      ZITADEL_MASTERKEY_FILE: /run/secrets/zitadel_masterkey
      ZITADEL_DATABASE_POSTGRES_HOST: postgres-prod.internal
      ZITADEL_DATABASE_POSTGRES_PORT: 5432
      ZITADEL_DATABASE_POSTGRES_DATABASE: zitadel
      ZITADEL_DATABASE_POSTGRES_USER_USERNAME: zitadel
      ZITADEL_DATABASE_POSTGRES_USER_PASSWORD_FILE: /run/secrets/zitadel_db_password
    secrets:
      - zitadel_masterkey
      - zitadel_db_password
    deploy:
      replicas: 2
      resources:
        limits:
          cpus: '2'
          memory: 2G

secrets:
  zitadel_masterkey:
    external: true
  zitadel_db_password:
    external: true
```

**Option B: Kubernetes**

```yaml
# zitadel-deployment.yaml
apiVersion: apps/v1
kind: Deployment
metadata:
  name: zitadel
spec:
  replicas: 2
  selector:
    matchLabels:
      app: zitadel
  template:
    metadata:
      labels:
        app: zitadel
    spec:
      containers:
      - name: zitadel
        image: ghcr.io/zitadel/zitadel:latest
        command: ['start', '--masterkeyFromEnv', '--tlsMode', 'external']
        env:
        - name: ZITADEL_EXTERNALDOMAIN
          value: "zitadel.ctn-asr.com"
        - name: ZITADEL_EXTERNALPORT
          value: "443"
        - name: ZITADEL_EXTERNALSECURE
          value: "true"
        - name: ZITADEL_MASTERKEY
          valueFrom:
            secretKeyRef:
              name: zitadel-secrets
              key: masterkey
        # ... database config ...
```

#### 2. SSL/TLS Configuration

**Nginx Reverse Proxy:**

```nginx
# /etc/nginx/sites-available/zitadel
server {
    listen 443 ssl http2;
    server_name zitadel.ctn-asr.com;

    ssl_certificate /etc/letsencrypt/live/zitadel.ctn-asr.com/fullchain.pem;
    ssl_certificate_key /etc/letsencrypt/live/zitadel.ctn-asr.com/privkey.pem;

    ssl_protocols TLSv1.2 TLSv1.3;
    ssl_ciphers HIGH:!aNULL:!MD5;
    ssl_prefer_server_ciphers on;

    location / {
        proxy_pass http://zitadel-backend:8080;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
    }
}
```

#### 3. Database

**Use managed PostgreSQL:**

- **Azure Database for PostgreSQL**
- **AWS RDS PostgreSQL**
- **Google Cloud SQL**

Benefits:
- Automated backups
- High availability
- Scaling
- Security patches

#### 4. Monitoring

**Health checks:**

```bash
# Add to monitoring system
curl -f https://zitadel.ctn-asr.com/debug/healthz || alert
```

**Metrics to monitor:**
- Token issuance rate
- Authentication failures
- Response times
- Database connections
- Certificate expiration

### Azure Functions Production Configuration

#### 1. Application Settings

```bash
# Add via Azure Portal or CLI
az functionapp config appsettings set \
  --name func-ctn-asr-prod \
  --resource-group ctn-prod \
  --settings \
    ZITADEL_ISSUER="https://zitadel.ctn-asr.com" \
    ZITADEL_PROJECT_ID="<project-id>" \
    ZITADEL_API_CLIENT_ID="<api-client-id>"
```

#### 2. Key Vault Integration

Store sensitive values in Azure Key Vault:

```bash
# Store in Key Vault
az keyvault secret set \
  --vault-name ctn-asr-keyvault \
  --name ZitadelProjectId \
  --value "<project-id>"

az keyvault secret set \
  --vault-name ctn-asr-keyvault \
  --name ZitadelApiClientId \
  --value "<api-client-id>"

# Reference in Function App
az functionapp config appsettings set \
  --name func-ctn-asr-prod \
  --resource-group ctn-prod \
  --settings \
    ZITADEL_PROJECT_ID="@Microsoft.KeyVault(SecretUri=https://ctn-asr-keyvault.vault.azure.net/secrets/ZitadelProjectId/)" \
    ZITADEL_API_CLIENT_ID="@Microsoft.KeyVault(SecretUri=https://ctn-asr-keyvault.vault.azure.net/secrets/ZitadelApiClientId/)"
```

#### 3. Client Credentials Management

**Storage:** Store client secrets in Azure Key Vault

```bash
# Store client secret
az keyvault secret set \
  --vault-name ctn-asr-keyvault \
  --name TerminalOperatorClientSecret \
  --value "<client-secret>" \
  --description "Zitadel M2M client secret for Terminal Operator X"

# Add metadata tags
az keyvault secret set-attributes \
  --vault-name ctn-asr-keyvault \
  --name TerminalOperatorClientSecret \
  --tags \
    organization="Terminal Operator X" \
    zitadel_client_id="987654321@123456789" \
    created_date="2025-11-06"
```

**Rotation:** Implement secret rotation policy

```bash
# Rotation script (run monthly)
./scripts/rotate-zitadel-secrets.sh --organization "Terminal Operator X"

# Steps:
# 1. Generate new secret in Zitadel
# 2. Store in Key Vault with version
# 3. Notify organization
# 4. Grace period (30 days dual-secret support)
# 5. Revoke old secret
```

### Database Production Setup

#### 1. Connection Pooling

```typescript
// api/src/utils/database.ts
import { Pool } from 'pg';

const productionPool = new Pool({
  host: process.env.DB_HOST,
  port: parseInt(process.env.DB_PORT || '5432'),
  database: process.env.DB_NAME,
  user: process.env.DB_USER,
  password: process.env.DB_PASSWORD,
  ssl: { rejectUnauthorized: true },

  // Production settings
  max: 20, // Maximum connections
  min: 5,  // Minimum connections
  idleTimeoutMillis: 30000,
  connectionTimeoutMillis: 2000,
});
```

#### 2. Indexes and Performance

```sql
-- Verify critical indexes exist
SELECT
  schemaname,
  tablename,
  indexname,
  indexdef
FROM pg_indexes
WHERE tablename = 'ctn_m2m_credentials'
ORDER BY indexname;

-- Analyze query performance
EXPLAIN ANALYZE
SELECT * FROM ctn_m2m_credentials
WHERE zitadel_client_id = '987654321@123456789'
  AND is_active = true
  AND is_deleted = false;

-- Should use: idx_zitadel_m2m_client_id
```

#### 3. Backup Strategy

```bash
# Daily backup script
pg_dump \
  --host=psql-ctn-prod.postgres.database.azure.com \
  --username=asr_admin \
  --dbname=ctn_asr \
  --table=ctn_m2m_credentials \
  --table=ctn_zitadel_secret_audit \
  --format=custom \
  --file=/backup/zitadel_credentials_$(date +%Y%m%d).backup

# Retention: 30 days
```

---

## Security Considerations

### Threat Model

#### 1. Token Theft

**Risk:** Access tokens intercepted or stolen

**Mitigations:**
- Short token lifetime (1 hour)
- TLS encryption in transit
- No token storage in logs
- Secure client secret storage

#### 2. Client Secret Compromise

**Risk:** Client credentials leaked or stolen

**Mitigations:**
- Regular secret rotation (monthly)
- Secret revocation capability
- Audit logging
- Rate limiting on token endpoint

#### 3. Replay Attacks

**Risk:** Valid tokens replayed by attackers

**Mitigations:**
- Token expiration (exp claim)
- Issued-at timestamp (iat claim)
- Optional: Nonce or jti claim

#### 4. IDOR (Insecure Direct Object Reference)

**Risk:** M2M clients accessing data of other parties

**Mitigations:**
- Party ID resolution from credentials
- Party ownership validation
- 404 responses (not 403) to prevent enumeration
- Security logging

### Best Practices

#### 1. Secret Management

- ✅ Store secrets in Azure Key Vault
- ✅ Rotate secrets regularly (30-90 days)
- ✅ Use strong secrets (32+ characters, high entropy)
- ✅ Audit secret access
- ❌ Never commit secrets to Git
- ❌ Never log secrets
- ❌ Never transmit secrets over unencrypted channels

#### 2. Token Validation

- ✅ Verify signature (JWKS)
- ✅ Verify issuer (iss claim)
- ✅ Verify audience (aud claim)
- ✅ Verify expiration (exp claim)
- ✅ Verify issued-at (iat claim)
- ✅ Check token revocation (optional)
- ❌ Never skip validation steps
- ❌ Never trust client-provided tokens without verification

#### 3. Authorization

- ✅ Validate scopes for each endpoint
- ✅ Verify party ownership
- ✅ Use role-based access control (RBAC)
- ✅ Log authorization failures
- ❌ Never rely on authentication alone
- ❌ Never trust client-provided party IDs

#### 4. Logging and Monitoring

- ✅ Log authentication attempts
- ✅ Log authorization failures
- ✅ Log unusual patterns (rate spikes)
- ✅ Alert on security events
- ❌ Never log tokens or secrets
- ❌ Never log PII without encryption

### Compliance

#### GDPR Considerations

- **Purpose limitation:** M2M credentials used only for specified purposes
- **Data minimization:** Store only necessary information
- **Storage limitation:** Retention policies for audit logs (90 days)
- **Security:** Encryption at rest and in transit
- **Auditability:** Complete audit trail of credential lifecycle

#### SOC 2 Controls

- **Access control:** Role-based permissions
- **Change management:** Credential generation audit
- **Monitoring:** Security event logging
- **Incident response:** Secret revocation procedures

---

## Troubleshooting

### Common Issues

#### 1. "Connection refused" to Zitadel

**Symptoms:**
```
Error: connect ECONNREFUSED 127.0.0.1:8080
```

**Causes:**
- Zitadel not running
- Port conflict

**Solutions:**
```bash
# Check if running
docker-compose -f docker-compose.zitadel.yml ps

# Check logs
docker-compose -f docker-compose.zitadel.yml logs zitadel

# Check port usage
lsof -i :8080

# Restart services
docker-compose -f docker-compose.zitadel.yml restart
```

#### 2. "Invalid token: signature verification failed"

**Symptoms:**
```json
{
  "error": "unauthorized",
  "message": "Invalid Zitadel token: signature verification failed"
}
```

**Causes:**
- Wrong issuer URL
- Token from different Zitadel instance
- Expired token

**Solutions:**
```bash
# Verify issuer in token
TOKEN="<your-access-token-here>"
echo $TOKEN | cut -d'.' -f2 | base64 -d | jq '.iss'
# Should match: ZITADEL_ISSUER

# Check API configuration
echo $ZITADEL_ISSUER
# Should match token issuer

# Get new token
curl -X POST "${ZITADEL_ISSUER}/oauth/v2/token" ...
```

#### 3. "Invalid audience"

**Symptoms:**
```json
{
  "error": "unauthorized",
  "message": "Invalid audience. Expected project or API client ID."
}
```

**Causes:**
- Wrong project ID in configuration
- Wrong API client ID
- Token requested for different audience

**Solutions:**
```bash
# Verify audience in token
echo $TOKEN | cut -d'.' -f2 | base64 -d | jq '.aud'
# Should match: ZITADEL_PROJECT_ID or ZITADEL_API_CLIENT_ID

# Check configuration
echo $ZITADEL_PROJECT_ID
echo $ZITADEL_API_CLIENT_ID

# Request token with correct audience
curl -X POST "${ZITADEL_ISSUER}/oauth/v2/token" \
  -d "scope=urn:zitadel:iam:org:project:id:${ZITADEL_PROJECT_ID}:aud" \
  ...
```

#### 4. "No party found for Zitadel client ID"

**Symptoms:**
- API returns 401
- Logs show: "No party found for Zitadel client ID: 123456@789"

**Causes:**
- Missing database mapping
- Incorrect client ID format

**Solutions:**
```sql
-- Verify mapping exists
SELECT * FROM ctn_m2m_credentials
WHERE zitadel_client_id = '123456@789';

-- Insert mapping if missing
INSERT INTO ctn_m2m_credentials (...) VALUES (...);
```

#### 5. "Failed to get admin access token" (setup script)

**Symptoms:**
```
Error: Failed to get admin access token
Response: {"error":"invalid_client"}
```

**Causes:**
- Wrong admin credentials
- Zitadel not fully initialized

**Solutions:**
```bash
# Wait for initialization
docker-compose -f docker-compose.zitadel.yml logs -f zitadel | grep "successfully started"

# Verify admin credentials
cat .env.zitadel | grep ADMIN

# Test manual login
curl -X POST "http://localhost:8080/oauth/v2/token" \
  -d "grant_type=password" \
  -d "username=admin" \
  -d "password=YourPassword" \
  -d "scope=openid"
```

### Debugging Tools

#### Inspect JWT Token

```bash
# Decode token (header + payload only - signature not verified)
function jwt_decode() {
  local token=$1
  echo "Header:"
  echo $token | cut -d'.' -f1 | base64 -d | jq '.'
  echo ""
  echo "Payload:"
  echo $token | cut -d'.' -f2 | base64 -d | jq '.'
}

jwt_decode "eyJhbGc..."
```

#### Test Token Validity

```bash
# Check if token is expired
TOKEN="<your-access-token-here>"
EXP=$(echo $TOKEN | cut -d'.' -f2 | base64 -d | jq -r '.exp')
NOW=$(date +%s)

if [ $EXP -gt $NOW ]; then
  echo "Token is valid for $(($EXP - $NOW)) more seconds"
else
  echo "Token expired $(($NOW - $EXP)) seconds ago"
fi
```

#### Verify JWKS Endpoint

```bash
# Retrieve public keys
curl -s "http://localhost:8080/oauth/v2/keys" | jq '.'

# Should return:
# {
#   "keys": [
#     {
#       "kty": "RSA",
#       "use": "sig",
#       "kid": "...",
#       "n": "...",
#       "e": "AQAB"
#     }
#   ]
# }
```

#### Database Query Debugging

```sql
-- Check credential mapping
SELECT
  c.service_account_name,
  c.zitadel_client_id,
  c.is_active,
  c.assigned_scopes,
  p.party_name
FROM ctn_m2m_credentials c
JOIN party_reference p ON c.party_id = p.party_id
WHERE c.is_deleted = false;

-- Check usage statistics
SELECT
  service_account_name,
  last_used_at,
  total_requests,
  last_request_ip
FROM ctn_m2m_credentials
WHERE is_active = true
ORDER BY last_used_at DESC;

-- Check audit trail
SELECT
  c.service_account_name,
  a.secret_generated_at,
  a.is_revoked,
  a.revoked_at
FROM ctn_zitadel_secret_audit a
JOIN ctn_m2m_credentials c ON a.credential_id = c.credential_id
ORDER BY a.secret_generated_at DESC
LIMIT 20;
```

---

## API Reference

### Zitadel Endpoints

#### POST /oauth/v2/token

Request access token using client credentials.

**Request:**
```bash
POST http://localhost:8080/oauth/v2/token
Content-Type: application/x-www-form-urlencoded
Authorization: Basic <base64(client_id:client_secret)>

grant_type=client_credentials
&scope=openid profile email urn:zitadel:iam:org:project:id:zitadel:aud
```

**Response (200 OK):**
```json
{
  "access_token": "eyJhbGciOiJSUzI1NiIsImtpZCI6...",
  "token_type": "Bearer",
  "expires_in": 3600,
  "scope": "openid profile email urn:zitadel:iam:org:project:id:zitadel:aud"
}
```

#### GET /oauth/v2/keys

Retrieve JSON Web Key Set (JWKS) for token validation.

**Request:**
```bash
GET http://localhost:8080/oauth/v2/keys
```

**Response (200 OK):**
```json
{
  "keys": [
    {
      "kty": "RSA",
      "use": "sig",
      "kid": "123456",
      "n": "0vx7agoebGcQSuuPiLJXZptN9nndrQmbXEps2aiAFbWhM78LhWx...",
      "e": "AQAB",
      "alg": "RS256"
    }
  ]
}
```

### CTN ASR API Endpoints (with Zitadel Auth)

#### GET /api/v1/health

Health check endpoint (no authentication required).

**Request:**
```bash
GET http://localhost:7071/api/v1/health
```

**Response (200 OK):**
```json
{
  "status": "healthy",
  "timestamp": "2025-11-06T12:00:00Z",
  "version": "1.2.3"
}
```

#### GET /api/v1/containers

List containers (requires authentication).

**Request:**
```bash
GET http://localhost:7071/api/v1/containers
Authorization: Bearer <access_token>
Accept: application/json
```

**Response (200 OK):**
```json
{
  "data": [
    {
      "container_id": "CTN123456",
      "status": "in_transit",
      "location": "Port of Rotterdam",
      "eta": "2025-11-10T14:30:00Z"
    }
  ],
  "count": 1,
  "page": 1,
  "page_size": 50
}
```

**Response (401 Unauthorized):**
```json
{
  "error": "unauthorized",
  "message": "Invalid Zitadel token: signature verification failed"
}
```

---

## Summary

This guide has covered:

✅ Zitadel Docker Compose setup
✅ Service account creation and management
✅ Database schema for M2M credentials
✅ Azure Functions middleware integration
✅ OAuth2.0 client credentials flow
✅ Production deployment considerations
✅ Security best practices
✅ Troubleshooting procedures

### Next Steps

1. **Review** configuration files and adjust for your environment
2. **Test** M2M flow locally using example scripts
3. **Implement** Zitadel authentication in your API endpoints
4. **Deploy** to staging environment for integration testing
5. **Monitor** authentication patterns and performance
6. **Document** organization-specific procedures

### Support

- **Zitadel Documentation:** https://zitadel.com/docs
- **CTN ASR Documentation:** docs/ folder
- **Issues:** File tickets in project management system

---

**Document Version:** 1.0
**Last Reviewed:** November 6, 2025
**Next Review:** February 6, 2026
