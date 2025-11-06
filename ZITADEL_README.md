# Zitadel M2M Authentication - Quick Start

Self-hosted identity provider for machine-to-machine authentication in CTN ASR.

## What is this?

Zitadel provides OAuth2.0/OIDC authentication for external organizations (terminals, carriers, portals) to access CTN ASR APIs without requiring user accounts.

## Quick Start (5 minutes)

### 1. Start Zitadel

```bash
# Copy configuration
cp .env.zitadel.example .env.zitadel

# Edit passwords (REQUIRED)
nano .env.zitadel

# Start services
docker-compose -f docker-compose.zitadel.yml --env-file .env.zitadel up -d

# Wait for initialization
docker-compose -f docker-compose.zitadel.yml logs -f zitadel
```

### 2. Configure Zitadel

```bash
# Run automated setup
./scripts/setup-zitadel-m2m.sh

# Saves credentials to: zitadel-credentials.json
```

### 3. Apply Database Migration

```bash
psql "host=psql-ctn-demo-asr-dev.postgres.database.azure.com..." \
  -f database/migrations/023-zitadel-m2m-credentials.sql
```

### 4. Test M2M Flow

```bash
node examples/m2m-auth-flow.js test-client
```

## What's Included

### Files Created

| File | Purpose |
|------|---------|
| `docker-compose.zitadel.yml` | Zitadel + PostgreSQL containers |
| `.env.zitadel.example` | Configuration template |
| `scripts/setup-zitadel-m2m.sh` | Automated setup script |
| `examples/m2m-auth-flow.js` | M2M authentication example |
| `api/src/middleware/zitadel-auth.ts` | JWT validation middleware |
| `database/migrations/023-zitadel-m2m-credentials.sql` | Database schema |
| `docs/ZITADEL_M2M_SETUP.md` | Comprehensive guide (150+ pages) |

### Architecture

```
┌────────────────┐
│  M2M Client    │
│  (Terminal/    │
│   Carrier)     │
└───────┬────────┘
        │ 1. Client Credentials
        │    (client_id + secret)
        ▼
┌────────────────┐
│    Zitadel     │ ◄── Self-hosted IDP
│  (Docker)      │     http://localhost:8080
└───────┬────────┘
        │ 2. JWT Access Token
        ▼
┌────────────────┐
│  CTN ASR API   │
│  (Azure Funcs) │
└────────────────┘
```

## URLs

- **Zitadel Console:** http://localhost:8080/ui/console
- **Token Endpoint:** http://localhost:8080/oauth/v2/token
- **JWKS Endpoint:** http://localhost:8080/oauth/v2/keys

## Default Credentials

**Admin Console:**
- Username: `admin` (configurable in .env.zitadel)
- Password: `Admin123!` (configurable in .env.zitadel)

**IMPORTANT:** Change these immediately after first login!

## Service Accounts Created

The setup script creates 4 service accounts:

1. **test-client** - Testing and development
2. **terminal-operator** - Terminal operator integration
3. **carrier** - Carrier integration
4. **portal-integration** - External portal integration

Each has a unique client ID and secret saved in `zitadel-credentials.json`.

## API Integration Example

### Authenticate Request

```typescript
import { authenticateDual } from '../middleware/zitadel-auth';

async function handler(request: HttpRequest, context: InvocationContext) {
  // Validate Zitadel or Azure AD token
  const result = await authenticateDual(request, context);

  if ('status' in result) {
    return result; // 401 Unauthorized
  }

  const authedRequest = result.request;

  // Access authenticated user info
  console.log('Party ID:', authedRequest.partyId);
  console.log('Is M2M:', authedRequest.isM2M);
  console.log('Client ID:', authedRequest.clientId);
  console.log('Roles:', authedRequest.userRoles);

  // ... business logic ...
}
```

### Client Example

```bash
# 1. Get access token
TOKEN=$(curl -s -X POST "http://localhost:8080/oauth/v2/token" \
  -u "client_id:client_secret" \
  -d "grant_type=client_credentials" \
  -d "scope=openid profile email" \
  | jq -r '.access_token')

# 2. Call API
curl -X GET "http://localhost:7071/api/v1/containers" \
  -H "Authorization: Bearer $TOKEN" \
  | jq '.'
```

## Configuration

### Environment Variables (Azure Functions)

Add to `local.settings.json`:

```json
{
  "Values": {
    "ZITADEL_ISSUER": "http://localhost:8080",
    "ZITADEL_PROJECT_ID": "from-setup-script",
    "ZITADEL_API_CLIENT_ID": "from-setup-script"
  }
}
```

### Database Mapping

Link Zitadel clients to CTN parties:

```sql
INSERT INTO ctn_m2m_credentials (
  party_id,
  zitadel_client_id,
  service_account_name,
  assigned_scopes
) VALUES (
  'party-uuid',
  '123456@789',
  'terminal-operator',
  ARRAY['api.access', 'containers.read']
);
```

## Scopes

Define scopes based on API access:

- `api.access` - Basic API access (required)
- `containers.read` - View container data
- `containers.write` - Update container data
- `eta.read` - View ETA information
- `eta.write` - Update ETA information
- `members.read` - View member data
- `members.write` - Manage member data

## Security

### Best Practices

✅ Store client secrets in Azure Key Vault
✅ Rotate secrets every 30-90 days
✅ Use HTTPS in production (TLS)
✅ Monitor authentication failures
✅ Log all M2M access

❌ Never commit secrets to Git
❌ Never log tokens or secrets
❌ Never skip JWT validation

### Token Security

- **Lifetime:** 1 hour (configurable)
- **Algorithm:** RS256 (RSA + SHA-256)
- **Validation:** Signature, expiration, audience, issuer

## Troubleshooting

### Zitadel won't start

```bash
# Check logs
docker-compose -f docker-compose.zitadel.yml logs zitadel

# Common issues:
# - Port 8080 already in use
# - PostgreSQL not ready (wait 30-60 seconds)
# - Invalid ZITADEL_MASTERKEY (must be 32+ chars)
```

### Token validation fails

```bash
# Verify issuer matches
echo $TOKEN | cut -d'.' -f2 | base64 -d | jq '.iss'
# Should match: ZITADEL_ISSUER

# Check JWKS endpoint
curl http://localhost:8080/oauth/v2/keys | jq '.'
```

### Party not found

```sql
-- Verify database mapping
SELECT * FROM ctn_m2m_credentials
WHERE zitadel_client_id = 'client-id-here';

-- Add mapping if missing
INSERT INTO ctn_m2m_credentials (...) VALUES (...);
```

## Documentation

**Full Guide:** [docs/ZITADEL_M2M_SETUP.md](docs/ZITADEL_M2M_SETUP.md)

Covers:
- Architecture deep-dive
- Production deployment
- Security considerations
- Complete API reference
- Troubleshooting guide

## Commands Reference

```bash
# Start Zitadel
docker-compose -f docker-compose.zitadel.yml up -d

# Stop Zitadel
docker-compose -f docker-compose.zitadel.yml down

# View logs
docker-compose -f docker-compose.zitadel.yml logs -f

# Restart services
docker-compose -f docker-compose.zitadel.yml restart

# Run setup script
./scripts/setup-zitadel-m2m.sh

# Test M2M flow
node examples/m2m-auth-flow.js [service-account-name]

# Apply database migration
psql "connection-string" -f database/migrations/023-zitadel-m2m-credentials.sql
```

## Production Checklist

Before deploying to production:

- [ ] Change default admin password
- [ ] Configure HTTPS/TLS
- [ ] Use managed PostgreSQL database
- [ ] Store secrets in Azure Key Vault
- [ ] Set up monitoring and alerting
- [ ] Configure backups (daily)
- [ ] Implement secret rotation policy
- [ ] Review security logs regularly
- [ ] Document organization-specific procedures

## Support

- **Zitadel Docs:** https://zitadel.com/docs
- **CTN ASR Docs:** docs/ZITADEL_M2M_SETUP.md
- **Issues:** File in project management system

---

**Version:** 1.0
**Last Updated:** November 6, 2025
