# BDI Integration Guide
**CTN Association Register - BVAD & BVOD Implementation**
**Last Updated:** October 13, 2025

## Overview

The CTN Association Register (ASR) implements the **BDI (Basic Data Infrastructure)** Reference Architecture, providing two core capabilities:

1. **BVAD (BDI Verifiable Assurance Document)** - "Can this member be trusted?"
2. **BVOD (BDI Verifiable Orchestration Document) Validation** - "Is this member involved in this orchestration?"

These capabilities enable secure, verifiable trust and authorization checks within the container transport ecosystem.

---

## Architecture

### BVAD Flow
```
External System → POST /api/v1/bdi/bvad/generate
                  (Authentication: Keycloak/Azure AD)
                  ↓
            CTN ASR verifies member status
                  ↓
            Generates signed JWT token (RS256)
                  ↓
            Returns BVAD token
                  ↓
External System validates token using /.well-known/jwks
```

### BVOD Validation Flow
```
External System → POST /api/v1/bdi/bvod/validate
                  (Authentication: Keycloak/Azure AD)
                  (Payload: BVOD token + member_domain)
                  ↓
            CTN ASR validates BVOD signature
                  ↓
            Checks member involvement in orchestration
                  ↓
            Returns validation result
```

---

## API Endpoints

### 1. JWKS Endpoint (Public)

**Endpoint:** `GET /.well-known/jwks`
**Authentication:** None (public)
**Purpose:** Provides public keys for BVAD signature verification

**Response:**
```json
{
  "keys": [
    {
      "kty": "RSA",
      "use": "sig",
      "alg": "RS256",
      "kid": "ctn-bdi-2025-001",
      "n": "...",  // Base64url-encoded modulus
      "e": "AQAB"  // Base64url-encoded exponent
    }
  ]
}
```

**Example:**
```bash
curl https://func-ctn-demo-asr-dev.azurewebsites.net/.well-known/jwks
```

---

### 2. Generate BVAD

**Endpoint:** `POST /api/v1/bdi/bvad/generate`
**Authentication:** Required (Keycloak or Azure AD)
**Permissions:** `read:all_entities`

**Purpose:** Generate a signed BVAD token for a member organization

**Request Body:**
```json
{
  "memberDomain": "vanberkellogistics.nl",
  "audience": "https://www.dhl.com",
  "validityHours": 24
}
```

**Alternative Identifiers:**
- `kvk`: Dutch Chamber of Commerce number
- `lei`: Legal Entity Identifier

**Response:**
```json
{
  "bvad_token": "eyJhbGciOiJSUzI1NiIsInR5cCI6IkpXVCIsImtpZCI6ImN0bi1iZGktMjAyNS0wMDEifQ...",
  "token_type": "Bearer",
  "expires_in": 86400,
  "member": {
    "domain": "vanberkellogistics.nl",
    "legal_name": "Van Berkel Logistics B.V.",
    "kvk": "17187159",
    "lei": "724500F1QBVV6D4V0T23",
    "euid": "NL.17187159",
    "country_code": "NL",
    "registry_identifiers": [
      {
        "type": "KVK",
        "value": "17187159",
        "countryCode": "NL",
        "registryName": "Kamer van Koophandel"
      },
      {
        "type": "LEI",
        "value": "724500F1QBVV6D4V0T23",
        "countryCode": null,
        "registryName": "Global LEI System"
      },
      {
        "type": "EUID",
        "value": "NL.17187159",
        "countryCode": "NL",
        "registryName": "European Unique Identifier"
      }
    ],
    "status": "ACTIVE"
  },
  "jti": "a1b2c3d4e5f6..."
}
```

**Error Responses:**

- `400` - Invalid request (missing identifier)
- `404` - Member not found
- `403` - Member not active (status not ACTIVE/APPROVED)
- `401` - Authentication required
- `500` - Internal server error

**Example:**
```bash
curl -X POST https://func-ctn-demo-asr-dev.azurewebsites.net/api/v1/bdi/bvad/generate \
  -H "Authorization: Bearer YOUR_ACCESS_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "memberDomain": "vanberkellogistics.nl",
    "audience": "https://www.dhl.com",
    "validityHours": 24
  }'
```

---

### 3. Validate BVOD

**Endpoint:** `POST /api/v1/bdi/bvod/validate`
**Authentication:** Required (Keycloak or Azure AD)
**Permissions:** `read:all_entities`

**Purpose:** Validate if a member is involved in an orchestration

**Request Body:**
```json
{
  "bvod_token": "eyJhbGciOiJSUzI1NiIsInR5cCI6IkpXVCJ9...",
  "member_domain": "vanberkellogistics.nl",
  "check_role": "Carrier"
}
```

**Parameters:**
- `bvod_token` (required): The BVOD JWT token to validate
- `member_domain` (required): Domain of the member to check
- `check_role` (optional): Expected role (Carrier, Forwarder, Terminal, Customs, etc.)

**Response (Valid):**
```json
{
  "valid": true,
  "member_involved": true,
  "member_domain": "vanberkellogistics.nl",
  "member_role": "Carrier",
  "role_matches": true,
  "orchestration": {
    "orchestration_id": "uuid-here",
    "in_database": true
  },
  "token_validation": {
    "signature_valid": true,
    "expired": false,
    "not_yet_valid": false
  },
  "validation_duration_ms": 45
}
```

**Response (Invalid):**
```json
{
  "valid": false,
  "member_involved": false,
  "member_domain": "vanberkellogistics.nl",
  "member_role": null,
  "role_matches": false,
  "orchestration": {
    "in_database": false,
    "internal_order_id": "DHL-ORDER-2025-001234",
    "orchestrator": "dhl.com"
  },
  "token_validation": {
    "signature_valid": true,
    "expired": false,
    "not_yet_valid": false
  },
  "validation_duration_ms": 38
}
```

**Example:**
```bash
curl -X POST https://func-ctn-demo-asr-dev.azurewebsites.net/api/v1/bdi/bvod/validate \
  -H "Authorization: Bearer YOUR_ACCESS_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "bvod_token": "eyJhbGciOiJSUzI1NiIsInR5cCI6IkpXVCJ9...",
    "member_domain": "vanberkellogistics.nl",
    "check_role": "Carrier"
  }'
```

---

## BVAD Token Structure

### Standard JWT Claims
- `iss` - Issuer: `https://www.connectedtradenetwork.org`
- `sub` - Subject: `https://{member-domain}`
- `aud` - Audience: Requesting system or `https://schemas.connectedtradenetwork.org/ctn_audience`
- `iat` - Issued at (Unix timestamp)
- `exp` - Expiration (Unix timestamp)
- `jti` - JWT ID (unique identifier)

### BDI Custom Claims
All custom claims use the namespace: `https://schemas.connectedtradenetwork.org/claims/`

#### Document Claims
- `document/type`: `"CTN Verifiable Assurance Document"`
- `document/type_uri`: Link to specification

#### Legal Entity Claims
- `legal_entity/name`: Legal name of the organization
- `legal_entity/domain`: Primary domain
- `legal_entity/country_code`: ISO 3166-1 alpha-2 country code (e.g., "NL", "DE", "BE")
- `legal_entity/registry/kvk`: KvK number (if applicable)
- `legal_entity/registry/lei`: LEI (if applicable)
- `legal_entity/registry/euid`: European Unique Identifier (if applicable)
- `legal_entity/registry/{type}`: Additional registry identifiers (e.g., HRB for Germany, SIREN for France)
  - Each includes: `value`, `country_code`, `registry_name`
- `legal_entity/bdi_connector_endpoint_uri`: BDI connector URL
- `legal_entity/bdi_connector_endpoint_authentication_method`: Auth method

#### Compliance Claims
- `compliance/owner_checked`: Boolean - ownership verified
- `compliance/owner_last_checked_at`: Unix timestamp
- `compliance/compliance_checked`: Boolean - compliance verified
- `compliance/compliance_last_checked_at`: Unix timestamp
- `compliance/status`: Member status (ACTIVE, PENDING, SUSPENDED, etc.)

#### Terms Claims
- `terms/version`: Terms version accepted
- `terms/uri`: Link to terms document
- `terms/accepted_at`: Unix timestamp

#### Subject/Contact Claims
- `subject/admin_contact`: Object with name, email, role, phone

---

## BVOD Token Structure

BVOD tokens are issued by orchestrators (like DHL, Maersk, etc.) and validated by CTN ASR.

### Standard JWT Claims
- `iss` - Issuer: `https://{orchestrator-domain}`
- `sub` - Subject: `https://{subject-company-domain}`
- `aud` - Audience: Array of involved parties
- `iat`, `exp`, `nbf` - Timestamps
- `jti` - Unique token ID
- `kid` - Key ID

### Orchestration Claims
- `orchestration/internal_order_identifier`: Order reference
- `orchestration/internal_uuid`: Orchestration UUID
- `orchestration/keys`: Business identifiers (Bill of Lading, Container #, etc.)
- `orchestration/orchestrator`: Object with orchestrator details
- `orchestration/customer`: Object with customer details
- `orchestration/subject_company`: Object with subject company and role

**Example BVOD Payload:**
```json
{
  "iss": "https://www.dhl.com",
  "sub": "https://www.vanberkellogistics.nl",
  "aud": ["https://www.portbase.com", "https://www.rwg.nl"],
  "iat": 1754831970,
  "exp": 1754835570,
  "jti": "3e4531bf-6ac3-47e8-95f9-42ef99f3f83e",
  "kid": "dhl-2025-key-001",
  "https://schemas.connectedtradenetwork.org/claims/document/type": "CTN Verifiable Orchestration Document",
  "https://schemas.connectedtradenetwork.org/claims/orchestration/internal_order_identifier": "DHL-ORDER-2025-001234",
  "https://schemas.connectedtradenetwork.org/claims/orchestration/keys": {
    "Bill of Lading": "MSCU123456789",
    "Container #": "MSCU6639871"
  },
  "https://schemas.connectedtradenetwork.org/claims/orchestration/orchestrator": {
    "legal_name": "DHL Supply Chain Netherlands",
    "domain": "dhl.com",
    "registry": { "lei": "724500F1QBVV6D4V0T23" }
  },
  "https://schemas.connectedtradenetwork.org/claims/orchestration/subject_company": {
    "legal_name": "Van Berkel Logistics",
    "domain": "vanberkellogistics.nl",
    "registry": { "kvk": "17187159" },
    "role": "Carrier"
  }
}
```

---

## Database Schema

### bdi_orchestrations
Tracks orchestration instances.

**Key Columns:**
- `orchestration_id` (UUID, PK)
- `internal_order_identifier` - Order reference
- `orchestrator_domain` - Who is orchestrating
- `business_keys` (JSONB) - Bill of Lading, Container #, etc.
- `status` - active, completed, cancelled

### bdi_orchestration_participants
Tracks which members are involved in each orchestration.

**Key Columns:**
- `participant_id` (UUID, PK)
- `orchestration_id` (UUID, FK)
- `legal_entity_id` (UUID, FK) - Links to members
- `participant_domain` - Member domain
- `participant_role` - Carrier, Forwarder, Terminal, etc.

### bvad_issued_tokens
Audit trail of all issued BVAD tokens.

**Key Columns:**
- `bvad_token_id` (UUID, PK)
- `legal_entity_id` (UUID, FK)
- `jti` - JWT ID (unique)
- `token_hash` - SHA-256 of full token
- `issued_at`, `expires_at` - Validity period
- `claims_snapshot` (JSONB) - Full claims
- `is_revoked` - Revocation status

### bvod_validation_log
Security audit log of all BVOD validation attempts.

**Key Columns:**
- `validation_id` (UUID, PK)
- `orchestration_id` (UUID, FK, nullable)
- `bvod_jti` - BVOD JWT ID
- `requested_by` - Client/system requesting
- `validation_result` - valid, invalid, expired, etc.
- `member_domain_checked` - Which member was checked
- `member_found_in_orchestration` - Boolean result

### bdi_external_systems
Authorized external systems that can access BDI APIs.

**Key Columns:**
- `system_id` (UUID, PK)
- `system_domain` - External system domain
- `keycloak_client_id` - Keycloak client for auth
- `allowed_operations` - Array of allowed operations
- `is_active`, `is_approved` - Status flags

### company_registries
Reference table for known Chambers of Commerce and company registries worldwide.

**Key Columns:**
- `registry_id` (UUID, PK)
- `registry_code` - Unique code (e.g., "KVK", "IHK_BERLIN", "COMPANIES_HOUSE")
- `registry_name` - Full name
- `country_code` - ISO 3166-1 alpha-2
- `registry_type` - chamber_of_commerce, companies_registry, tax_authority
- `jurisdiction` - Region/state if applicable (e.g., "Berlin", "Noord-Holland")
- `verification_url` - URL pattern for verification (use {identifier} placeholder)
- `identifier_pattern` - Regex pattern for validation
- `supports_api_lookup` - Boolean

**Supported Registries:**
- Netherlands: KvK (Kamer van Koophandel)
- Germany: IHK Berlin, IHK Munich, Handelsregister (HRA/HRB)
- Belgium: KBO/BCE (Kruispuntbank van Ondernemingen)
- France: SIREN (9 digits), SIRET (14 digits)
- UK: Companies House
- EU: EUID (European Unique Identifier)
- Global: LEI (Legal Entity Identifier)

### legal_entity_number
Extended to support international company registrations.

**New Columns (Migration 012):**
- `registry_name` - Name of the issuing registry/chamber (e.g., "IHK Berlin", "KvK")
- `registry_url` - URL to the registry for verification purposes
- `country_code` - ISO 3166-1 alpha-2 country code

**Indexes:**
- `idx_legal_entity_number_country` - For country-specific queries
- `idx_legal_entity_number_type_country` - Composite index for type + country queries

---

## International Registry Support

The CTN ASR supports company registrations from Chambers of Commerce worldwide, not just Dutch KvK numbers.

### Supported Identifier Types

| Type | Description | Country | Format | Example |
|------|-------------|---------|--------|---------|
| **KVK** | Kamer van Koophandel | NL | 8 digits | 17187159 |
| **EUID** | European Unique Identifier | EU | CC.identifier | NL.17187159 |
| **LEI** | Legal Entity Identifier | Global | 20 alphanumeric | 724500F1QBVV6D4V0T23 |
| **HRB** | Handelsregister B (corporations) | DE | HRB + digits | HRB 123456 B |
| **HRA** | Handelsregister A (partnerships) | DE | HRA + digits | HRA 98765 |
| **KBO** | Kruispuntbank van Ondernemingen | BE | 10 digits | 0123456789 |
| **BCE** | Banque-Carrefour des Entreprises | BE | 10 digits | 0123456789 |
| **SIREN** | Système d'Identification | FR | 9 digits | 123456789 |
| **SIRET** | SIREN + établissement | FR | 14 digits | 12345678901234 |
| **CRN** | Company Registration Number | GB | 8 characters | 12345678 or SC123456 |
| **EORI** | Economic Operators Registration | EU | CC + identifier | NL123456789 |

### Example: German Company

A German company registered with IHK Berlin might have multiple identifiers:

```json
{
  "registry_identifiers": [
    {
      "type": "HRB",
      "value": "HRB 123456 B",
      "countryCode": "DE",
      "registryName": "IHK Berlin"
    },
    {
      "type": "LEI",
      "value": "529900T8BM49AURSDO55",
      "countryCode": null,
      "registryName": "Global LEI System"
    },
    {
      "type": "EUID",
      "value": "DE.HRB123456B",
      "countryCode": "DE",
      "registryName": "European Unique Identifier"
    }
  ]
}
```

### BVAD Token Example (International Company)

For a German company, the BVAD token includes all registry identifiers:

```json
{
  "iss": "https://www.connectedtradenetwork.org",
  "sub": "https://example-logistics.de",
  "https://schemas.connectedtradenetwork.org/claims/legal_entity/name": "Example Logistics GmbH",
  "https://schemas.connectedtradenetwork.org/claims/legal_entity/country_code": "DE",
  "https://schemas.connectedtradenetwork.org/claims/legal_entity/registry/hrb": {
    "value": "HRB 123456 B",
    "country_code": "DE",
    "registry_name": "IHK Berlin"
  },
  "https://schemas.connectedtradenetwork.org/claims/legal_entity/registry/lei": {
    "value": "529900T8BM49AURSDO55",
    "country_code": null,
    "registry_name": "Global LEI System"
  },
  "https://schemas.connectedtradenetwork.org/claims/legal_entity/registry/euid": {
    "value": "DE.HRB123456B",
    "country_code": "DE",
    "registry_name": "European Unique Identifier"
  }
}
```

### Adding New Registries

To add support for a new Chamber of Commerce or registry:

```sql
INSERT INTO company_registries (
  registry_code,
  registry_name,
  country_code,
  registry_type,
  jurisdiction,
  registry_url,
  verification_url,
  identifier_pattern,
  identifier_example,
  supports_api_lookup,
  notes
) VALUES (
  'IHK_FRANKFURT',
  'IHK Frankfurt am Main',
  'DE',
  'chamber_of_commerce',
  'Frankfurt',
  'https://www.frankfurt-main.ihk.de',
  'https://www.unternehmensregister.de/ureg/search1.2.html?submitaction=language&language=en',
  '^HRB\\s?\\d{1,6}(\\s?[A-Z]{1,3})?$',
  'HRB 123456',
  false,
  'Frankfurt regional chamber'
);
```

---

## Authentication

### For External BDI Systems

External systems (like DHL, Maersk, etc.) authenticate using:
1. **Keycloak** (recommended for production)
2. **Azure AD** (for CTN internal systems)

### Keycloak Setup

1. **Create Client in Keycloak:**
   - Client ID: `dhl-supply-chain-nl`
   - Client Protocol: `openid-connect`
   - Access Type: `confidential`
   - Valid Redirect URIs: `https://www.dhl.com/callback`

2. **Register in CTN ASR:**
   ```sql
   INSERT INTO bdi_external_systems (
     system_name,
     system_domain,
     keycloak_client_id,
     allowed_operations,
     is_active,
     is_approved
   ) VALUES (
     'DHL Supply Chain NL',
     'dhl.com',
     'dhl-supply-chain-nl',
     ARRAY['bvad_generate', 'bvod_validate'],
     true,
     true
   );
   ```

3. **Obtain Access Token:**
   ```bash
   curl -X POST https://keycloak.connectedtradenetwork.org/realms/bdi/protocol/openid-connect/token \
     -H "Content-Type: application/x-www-form-urlencoded" \
     -d "client_id=dhl-supply-chain-nl" \
     -d "client_secret=YOUR_CLIENT_SECRET" \
     -d "grant_type=client_credentials"
   ```

4. **Use Token:**
   ```bash
   curl -X POST https://func-ctn-demo-asr-dev.azurewebsites.net/api/v1/bdi/bvad/generate \
     -H "Authorization: Bearer YOUR_ACCESS_TOKEN" \
     -H "Content-Type: application/json" \
     -d '{"memberDomain": "vanberkellogistics.nl"}'
   ```

---

## Security Considerations

1. **Token Signing:**
   - All BVAD tokens signed with RS256 (asymmetric)
   - Private key stored securely in Azure Key Vault
   - Public key exposed via JWKS endpoint

2. **Token Validation:**
   - Always validate signature using JWKS
   - Check expiration (`exp`) claim
   - Check not-before (`nbf`) claim
   - Validate issuer (`iss`) matches expected value

3. **Audit Logging:**
   - All BVAD issuance logged in `bvad_issued_tokens`
   - All BVOD validation logged in `bvod_validation_log`
   - Includes IP address, user agent, result, duration

4. **Rate Limiting:**
   - Per-system rate limits configured in `bdi_external_systems`
   - Default: 1000 requests/hour

5. **Member Status:**
   - BVADs only issued for ACTIVE/APPROVED members
   - Suspended/terminated members return 403 Forbidden

---

## Configuration

### Environment Variables

```bash
# BDI JWT Signing Keys (RSA)
BDI_PRIVATE_KEY="-----BEGIN RSA PRIVATE KEY-----\n...\n-----END RSA PRIVATE KEY-----"
BDI_PUBLIC_KEY="-----BEGIN PUBLIC KEY-----\n...\n-----END PUBLIC KEY-----"
BDI_KEY_ID="ctn-bdi-2025-001"

# CTN Issuer URL
CTN_ISSUER_URL="https://www.connectedtradenetwork.org"

# Keycloak Configuration (optional)
KEYCLOAK_REALM_URL="https://keycloak.connectedtradenetwork.org/realms/bdi"
KEYCLOAK_CLIENT_ID="ctn-asr"
KEYCLOAK_CLIENT_SECRET="secret"
```

### Generate RSA Key Pair

```bash
# Generate private key (2048-bit)
openssl genrsa -out private.pem 2048

# Extract public key
openssl rsa -in private.pem -pubout -out public.pem

# View keys
cat private.pem
cat public.pem

# Store in Azure Key Vault
az keyvault secret set --vault-name kv-ctn-asr-dev --name BDI-PRIVATE-KEY --file private.pem
az keyvault secret set --vault-name kv-ctn-asr-dev --name BDI-PUBLIC-KEY --file public.pem
```

---

## Testing

### Test BVAD Generation

```javascript
const axios = require('axios');

async function testBvadGeneration() {
  const response = await axios.post(
    'https://func-ctn-demo-asr-dev.azurewebsites.net/api/v1/bdi/bvad/generate',
    {
      memberDomain: 'vanberkellogistics.nl',
      audience: 'https://www.dhl.com',
      validityHours: 1
    },
    {
      headers: {
        'Authorization': 'Bearer YOUR_ACCESS_TOKEN',
        'Content-Type': 'application/json'
      }
    }
  );

  console.log('BVAD Token:', response.data.bvad_token);

  // Decode token (client-side, no verification)
  const jwt = require('jsonwebtoken');
  const decoded = jwt.decode(response.data.bvad_token);
  console.log('Claims:', JSON.stringify(decoded, null, 2));
}
```

### Test BVOD Validation

```javascript
async function testBvodValidation(bvodToken) {
  const response = await axios.post(
    'https://func-ctn-demo-asr-dev.azurewebsites.net/api/v1/bdi/bvod/validate',
    {
      bvod_token: bvodToken,
      member_domain: 'vanberkellogistics.nl',
      check_role: 'Carrier'
    },
    {
      headers: {
        'Authorization': 'Bearer YOUR_ACCESS_TOKEN',
        'Content-Type': 'application/json'
      }
    }
  );

  console.log('Validation Result:', response.data);
  console.log('Member Involved:', response.data.member_involved);
  console.log('Member Role:', response.data.member_role);
}
```

---

## Troubleshooting

### Issue: "Public key not configured"
**Solution:** Ensure `BDI_PUBLIC_KEY` environment variable is set in Function App settings.

### Issue: "Signature verification failed"
**Solution:** Verify the public key in JWKS endpoint matches the private key used for signing.

### Issue: "Member not found"
**Solution:** Verify member exists in database and is not soft-deleted (`is_deleted = false`).

### Issue: "Member not active"
**Solution:** Check member status. Only ACTIVE/APPROVED members can have BVADs issued.

### Issue: "Token expired"
**Solution:** Request a new BVAD token. Default validity is 24 hours.

---

## References

- [RFC 7519 - JSON Web Token (JWT)](https://datatracker.ietf.org/doc/html/rfc7519)
- [RFC 7515 - JSON Web Signature (JWS)](https://datatracker.ietf.org/doc/html/rfc7515)
- [RFC 7517 - JSON Web Key (JWK)](https://datatracker.ietf.org/doc/html/rfc7517)
- [BDI Reference Architecture](https://docs.connectedtradenetwork.org/bdi)
- [CTN Association Register Documentation](./README.md)

---

**For questions or support, contact:** technical-support@connectedtradenetwork.org
