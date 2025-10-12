# ASR (Aansluitingen Service Register) - Comprehensive Code Review Report

**Date:** October 12, 2025
**Reviewer:** Claude Code (AI Code Reviewer)
**Project:** CTN Association Register
**Version:** 1.0.0

---

## Executive Summary

This comprehensive security and code quality review covers the entire ASR codebase, including frontend applications (Admin Portal and Member Portal), backend API (Azure Functions), database migrations, and infrastructure configuration. The system consists of approximately 110 TypeScript files and manages member organizations, KvK document verification, token issuance, and endpoint management.

### Overall Assessment

**Security Rating:** HIGH RISK
**Code Quality:** MEDIUM
**Readiness:** REQUIRES IMMEDIATE SECURITY FIXES BEFORE PRODUCTION

**Critical Issues Found:** 7
**High Priority Issues:** 12
**Medium Priority Issues:** 15
**Low Priority Issues:** 8

**Key Findings:**
1. ALL API endpoints are configured with `authLevel: 'anonymous'` - NO AUTHENTICATION
2. No Aikido or security scanning tools detected in the project
3. Credentials exposed in committed `.env.production` files
4. CORS configured with wildcard `*` - accepts requests from any origin
5. JWT tokens signed with weak fallback secret ('demo-secret')
6. No JWT token validation in API endpoints
7. SQL injection vulnerabilities mitigated by parameterized queries (GOOD)
8. No XSS vulnerabilities detected in React components (GOOD)

---

## Critical Issues 🔴

### 1. NO AUTHENTICATION ON API ENDPOINTS

**Severity:** CRITICAL
**Risk:** Unauthorized access, data breach, token theft, complete system compromise
**Files Affected:** All 46 API functions in `/api/src/functions/`

**Problem:**
Every single API endpoint is configured with `authLevel: 'anonymous'`, meaning ANYONE can call these endpoints without any authentication:

```typescript
// Example from /api/src/functions/GetMembers.ts:41
app.http('GetMembers', {
  methods: ['GET'],
  route: 'v1/members',
  authLevel: 'anonymous',  // ❌ NO AUTHENTICATION REQUIRED
  handler: GetMembers
});

// Example from /api/src/functions/IssueToken.ts:101
app.http('IssueToken', {
  methods: ['POST'],
  route: 'v1/oauth/token',
  authLevel: 'anonymous',  // ❌ ANYONE CAN ISSUE TOKENS
  handler: IssueToken
});

// Example from /api/src/functions/uploadKvkDocument.ts:273
app.http('uploadKvkDocument', {
  methods: ['POST', 'OPTIONS'],
  authLevel: 'anonymous',  // ❌ NO AUTH FOR FILE UPLOAD
  route: 'v1/legal-entities/{legalEntityId}/kvk-document',
  handler: uploadKvkDocument,
});
```

**Impact:**
- Attackers can list all members: `GET /api/v1/members`
- Attackers can create fake members: `POST /api/v1/members`
- Attackers can issue BVAD tokens for any organization: `POST /api/v1/oauth/token`
- Attackers can upload malicious files: `POST /api/v1/legal-entities/{id}/kvk-document`
- Attackers can access, modify, or delete any data in the system
- Complete data breach of all member information

**Solution:**
```typescript
// 1. Change authLevel to 'function' for all endpoints requiring authentication
app.http('GetMembers', {
  methods: ['GET'],
  route: 'v1/members',
  authLevel: 'function',  // ✅ Requires function key
  handler: GetMembers
});

// 2. Add Azure AD JWT validation middleware
import { InvocationContext, HttpRequest, HttpResponseInit } from '@azure/functions';
import jwt from 'jsonwebtoken';
import jwksClient from 'jwks-rsa';

const jwksClientInstance = jwksClient({
  jwksUri: `https://login.microsoftonline.com/${process.env.AZURE_TENANT_ID}/discovery/v2.0/keys`
});

function getKey(header: any, callback: any) {
  jwksClientInstance.getSigningKey(header.kid, (err, key) => {
    if (err) callback(err);
    else callback(null, key?.getPublicKey());
  });
}

async function validateAzureADToken(request: HttpRequest, context: InvocationContext): Promise<any> {
  const authHeader = request.headers.get('authorization');

  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    throw new Error('Missing or invalid authorization header');
  }

  const token = authHeader.substring(7);

  return new Promise((resolve, reject) => {
    jwt.verify(token, getKey, {
      audience: process.env.AZURE_CLIENT_ID,
      issuer: `https://login.microsoftonline.com/${process.env.AZURE_TENANT_ID}/v2.0`,
      algorithms: ['RS256']
    }, (err, decoded) => {
      if (err) reject(err);
      else resolve(decoded);
    });
  });
}

// 3. Apply validation to all protected endpoints
export async function GetMembers(request: HttpRequest, context: InvocationContext): Promise<HttpResponseInit> {
  try {
    // Validate token
    const userClaims = await validateAzureADToken(request, context);

    // Check user roles
    const roles = userClaims.roles || [];
    if (!roles.includes('AssociationAdmin') && !roles.includes('SystemAdmin')) {
      return {
        status: 403,
        body: JSON.stringify({ error: 'Insufficient permissions' })
      };
    }

    // Proceed with business logic...
    const result = await pool.query('SELECT * FROM members...');

    return {
      status: 200,
      body: JSON.stringify(result.rows)
    };
  } catch (error) {
    if (error.message.includes('authorization')) {
      return { status: 401, body: JSON.stringify({ error: 'Unauthorized' }) };
    }
    context.error('Error:', error);
    return { status: 500, body: JSON.stringify({ error: 'Internal error' }) };
  }
}
```

**Action Required:** IMMEDIATE - Implement before ANY production deployment

---

### 2. CREDENTIALS EXPOSED IN COMMITTED FILES

**Severity:** CRITICAL
**Risk:** Azure tenant and client credentials exposed in version control
**Files Affected:**
- `/web/.env.production` (line 1-4)
- `/portal/.env.production` (line 1-5)

**Problem:**
Production environment files containing Azure AD credentials are committed to Git:

```bash
# /web/.env.production
REACT_APP_AZURE_CLIENT_ID=d3037c11-a541-4f21-8862-8079137a0cde
REACT_APP_AZURE_TENANT_ID=598664e7-725c-4daa-bd1f-89c4ada717ff
REACT_APP_REDIRECT_URI=https://calm-tree-03352ba03.1.azurestaticapps.net
REACT_APP_API_URL=https://func-ctn-demo-asr-dev.azurewebsites.net/api/v1

# /portal/.env.production
REACT_APP_AAD_CLIENT_ID=d3037c11-a541-4f21-8862-8079137a0cde
REACT_APP_AAD_AUTHORITY=https://login.microsoftonline.com/598664e7-725c-4daa-bd1f-89c4ada717ff
REACT_APP_AAD_REDIRECT_URI=https://calm-pebble-043b2db03.1.azurestaticapps.net
REACT_APP_API_CLIENT_ID=d3037c11-a541-4f21-8862-8079137a0cde
REACT_APP_API_BASE_URL=https://func-ctn-demo-asr-dev.azurewebsites.net/api/v1
```

**Impact:**
- Client ID and Tenant ID exposed in Git history
- Anyone with repository access can see these credentials
- Credentials visible in Azure DevOps repository
- Risk of credential theft if repository is compromised

**Solution:**
```bash
# 1. Remove files from Git history
git rm --cached web/.env.production
git rm --cached portal/.env.production
git commit -m "Remove exposed credentials"

# 2. Update .gitignore to prevent future commits
echo ".env.production" >> .gitignore
git add .gitignore
git commit -m "Update .gitignore to exclude production env files"

# 3. Rotate credentials in Azure Portal
# - Create new App Registration or rotate client secrets
# - Update Azure Static Web App configuration

# 4. Use Azure Static Web App Environment Variables
# In Azure Portal > Static Web App > Configuration > Application settings:
REACT_APP_AZURE_CLIENT_ID=<new-client-id>
REACT_APP_AZURE_TENANT_ID=<tenant-id>
REACT_APP_API_URL=<api-url>

# 5. Create .env.production.template instead
# /web/.env.production.template (safe to commit)
REACT_APP_AZURE_CLIENT_ID=<your-client-id>
REACT_APP_AZURE_TENANT_ID=<your-tenant-id>
REACT_APP_REDIRECT_URI=<your-redirect-uri>
REACT_APP_API_URL=<your-api-url>
```

**Action Required:** IMMEDIATE - Remove from Git and rotate credentials

---

### 3. WILDCARD CORS CONFIGURATION

**Severity:** CRITICAL
**Risk:** Cross-Site Request Forgery (CSRF), unauthorized API access
**File:** `/api/host.json` (line 20-27)

**Problem:**
CORS is configured to accept requests from ANY origin using wildcard `*`:

```json
// /api/host.json:20-27
"cors": {
  "allowedOrigins": [
    "http://localhost:3000",
    "https://calm-pebble-043b2db03.1.azurestaticapps.net",
    "*"  // ❌ ACCEPTS REQUESTS FROM ANY WEBSITE
  ],
  "supportCredentials": false
}
```

**Impact:**
- ANY website can call your API
- Malicious websites can make requests on behalf of users
- Combined with no authentication, this is a complete bypass
- Attackers can embed API calls in their own websites
- Data exfiltration through third-party sites

**Solution:**
```json
// /api/host.json - FIXED
{
  "version": "2.0",
  "logging": {
    "applicationInsights": {
      "samplingSettings": {
        "isEnabled": true,
        "excludedTypes": "Request"
      }
    }
  },
  "extensionBundle": {
    "id": "Microsoft.Azure.Functions.ExtensionBundle",
    "version": "[4.*, 5.0.0)"
  },
  "extensions": {
    "http": {
      "routePrefix": "api"
    }
  },
  "cors": {
    "allowedOrigins": [
      "http://localhost:3000",
      "http://localhost:3001",
      "https://calm-tree-03352ba03.1.azurestaticapps.net",
      "https://calm-pebble-043b2db03.1.azurestaticapps.net"
    ],
    "supportCredentials": true
  }
}
```

**Action Required:** IMMEDIATE - Remove wildcard and whitelist specific origins only

---

### 4. JWT SIGNED WITH WEAK DEFAULT SECRET

**Severity:** CRITICAL
**Risk:** Token forgery, unauthorized access escalation
**File:** `/api/src/functions/IssueToken.ts` (line 69)

**Problem:**
JWT tokens are signed with a weak fallback secret if environment variable is not set:

```typescript
// /api/src/functions/IssueToken.ts:69
const token = jwt.sign(payload, process.env.JWT_SECRET || 'demo-secret', {
  algorithm: 'HS256'
});
```

**Impact:**
- If `JWT_SECRET` is not configured, tokens are signed with 'demo-secret'
- Attackers can forge valid tokens using the weak secret
- Complete authentication bypass
- Privilege escalation to any organization

**Solution:**
```typescript
// /api/src/functions/IssueToken.ts - FIXED
export async function IssueToken(request: HttpRequest, context: InvocationContext): Promise<HttpResponseInit> {
  try {
    // Validate JWT_SECRET is configured
    const jwtSecret = process.env.JWT_SECRET;
    if (!jwtSecret || jwtSecret === 'demo-secret') {
      context.error('JWT_SECRET not properly configured');
      return {
        status: 500,
        body: JSON.stringify({ error: 'Service misconfigured' })
      };
    }

    // Validate request has authentication
    const userClaims = await validateAzureADToken(request, context);

    const body = await request.json() as any;

    if (!body.org_id) {
      return {
        status: 400,
        body: JSON.stringify({ error: 'org_id is required' })
      };
    }

    // Verify user has permission to issue token for this org
    const memberResult = await pool.query(
      'SELECT * FROM members WHERE org_id = $1 AND status = $2',
      [body.org_id, 'ACTIVE']
    );

    if (memberResult.rows.length === 0) {
      return {
        status: 401,
        body: JSON.stringify({ error: 'Invalid credentials or inactive member' })
      };
    }

    const member = memberResult.rows[0];
    const jti = `bvad-${uuidv4()}`;
    const expiresIn = 3600; // 1 hour
    const now = Math.floor(Date.now() / 1000);

    const payload = {
      iss: process.env.JWT_ISSUER,
      sub: member.org_id,
      aud: 'ctn:network',
      exp: now + expiresIn,
      iat: now,
      jti: jti,
      type: 'BVAD',
      org: {
        id: member.org_id,
        name: member.legal_name,
        lei: member.lei,
        kvk: member.kvk,
        domain: member.domain
      },
      membership: {
        level: member.membership_level,
        status: member.status,
        joined: member.created_at
      }
    };

    // Sign with strong secret
    const token = jwt.sign(payload, jwtSecret, {
      algorithm: 'HS256'
    });

    // Record token issuance
    await pool.query(
      'INSERT INTO issued_tokens (jti, token_type, member_id, expires_at) VALUES ($1, $2, $3, to_timestamp($4))',
      [jti, 'BVAD', member.id, now + expiresIn]
    );

    return {
      status: 200,
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        access_token: token,
        token_type: 'Bearer',
        expires_in: expiresIn,
        scope: 'ctn:read ctn:write'
      })
    };
  } catch (error) {
    context.error('Error issuing token:', error);
    return {
      status: 500,
      body: JSON.stringify({ error: 'Failed to issue token' })
    };
  }
}

// Set Azure Function App Setting:
// JWT_SECRET=<generate-strong-random-secret-min-32-chars>
```

**Action Required:** IMMEDIATE - Configure strong JWT_SECRET and remove fallback

---

### 5. NO JWT TOKEN VALIDATION IN API

**Severity:** CRITICAL
**Risk:** Unauthorized API access, data manipulation
**File:** `/api/src/functions/GetAuthenticatedMember.ts` (line 27-48)

**Problem:**
The API decodes JWT tokens without validating signatures or expiration:

```typescript
// /api/src/functions/GetAuthenticatedMember.ts:27-48
// Parse the JWT token to get user claims
const token = authHeader.substring(7);
const tokenParts = token.split('.');

if (tokenParts.length !== 3) {
  return {
    status: 401,
    body: JSON.stringify({ error: 'Invalid token format' })
  };
}

// ❌ DANGEROUS: Decoding without validation
const payload = JSON.parse(Buffer.from(tokenParts[1], 'base64').toString());
const userObjectId = payload.oid || payload.sub;
const userEmail = payload.email || payload.preferred_username || payload.upn;
```

**Impact:**
- Attackers can forge tokens with any claims
- No signature verification = anyone can create valid-looking tokens
- No expiration check = tokens never expire
- No issuer validation = tokens from any source accepted
- Complete authentication bypass

**Solution:**
```typescript
// Install dependencies
// npm install jsonwebtoken jwks-rsa

import jwt from 'jsonwebtoken';
import jwksClient from 'jwks-rsa';

const jwksClientInstance = jwksClient({
  jwksUri: `https://login.microsoftonline.com/${process.env.AZURE_TENANT_ID}/discovery/v2.0/keys`,
  cache: true,
  cacheMaxAge: 86400000, // 24 hours
  rateLimit: true,
  jwksRequestsPerMinute: 10
});

function getKey(header: any, callback: any) {
  jwksClientInstance.getSigningKey(header.kid, (err, key) => {
    if (err) {
      callback(err);
      return;
    }
    const signingKey = key?.getPublicKey();
    callback(null, signingKey);
  });
}

export async function GetAuthenticatedMember(request: HttpRequest, context: InvocationContext): Promise<HttpResponseInit> {
  try {
    const authHeader = request.headers.get('authorization');

    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return {
        status: 401,
        body: JSON.stringify({ error: 'Missing or invalid authorization header' })
      };
    }

    const token = authHeader.substring(7);

    // ✅ PROPER VALIDATION with signature, expiration, issuer checks
    const decoded = await new Promise<any>((resolve, reject) => {
      jwt.verify(token, getKey, {
        audience: process.env.AZURE_CLIENT_ID,
        issuer: `https://login.microsoftonline.com/${process.env.AZURE_TENANT_ID}/v2.0`,
        algorithms: ['RS256']
      }, (err, decoded) => {
        if (err) reject(err);
        else resolve(decoded);
      });
    });

    const userObjectId = decoded.oid || decoded.sub;
    const userEmail = decoded.email || decoded.preferred_username || decoded.upn;

    if (!userObjectId && !userEmail) {
      return {
        status: 401,
        body: JSON.stringify({ error: 'Unable to identify user from token' })
      };
    }

    context.log(`Authenticated user: ${userEmail} (${userObjectId})`);

    // Query member data...
    let result = await pool.query(`...`, [userEmail]);

    // Rest of function...
    return {
      status: 200,
      headers: {
        'Content-Type': 'application/json',
        'Access-Control-Allow-Origin': 'https://calm-tree-03352ba03.1.azurestaticapps.net',
        'Access-Control-Allow-Headers': 'Content-Type,Authorization'
      },
      body: JSON.stringify(result.rows[0])
    };
  } catch (error) {
    if (error.name === 'TokenExpiredError') {
      return {
        status: 401,
        body: JSON.stringify({ error: 'Token expired' })
      };
    }
    if (error.name === 'JsonWebTokenError') {
      return {
        status: 401,
        body: JSON.stringify({ error: 'Invalid token' })
      };
    }
    context.error('Error fetching authenticated member:', error);
    return {
      status: 500,
      body: JSON.stringify({ error: 'Failed to fetch member data' })
    };
  }
}
```

**Action Required:** IMMEDIATE - Implement proper JWT validation

---

### 6. FILE UPLOAD WITHOUT AUTHENTICATION

**Severity:** CRITICAL
**Risk:** Malicious file upload, storage abuse, denial of service
**File:** `/api/src/functions/uploadKvkDocument.ts` (line 273)

**Problem:**
KvK document upload endpoint has no authentication:

```typescript
// /api/src/functions/uploadKvkDocument.ts:273
app.http('uploadKvkDocument', {
  methods: ['POST', 'OPTIONS'],
  authLevel: 'anonymous',  // ❌ NO AUTHENTICATION
  route: 'v1/legal-entities/{legalEntityId}/kvk-document',
  handler: uploadKvkDocument,
});
```

**Impact:**
- Anyone can upload files to your Azure Blob Storage
- Potential for malicious PDF uploads (PDF exploits, malware)
- Storage abuse (fill up storage with large files)
- Denial of service through storage exhaustion
- Cost implications (storage and Document Intelligence API calls)

**Solution:**
```typescript
export async function uploadKvkDocument(
  request: HttpRequest,
  context: InvocationContext
): Promise<HttpResponseInit> {
  context.log('KvK Document Upload requested');

  // CORS preflight
  if (request.method === 'OPTIONS') {
    return {
      status: 204,
      headers: {
        'Access-Control-Allow-Origin': 'https://calm-tree-03352ba03.1.azurestaticapps.net',
        'Access-Control-Allow-Methods': 'POST, OPTIONS',
        'Access-Control-Allow-Headers': 'Content-Type, Authorization',
      },
    };
  }

  try {
    // ✅ ADD AUTHENTICATION
    const userClaims = await validateAzureADToken(request, context);

    const legalEntityId = request.params.legalEntityId;

    if (!legalEntityId) {
      return {
        status: 400,
        jsonBody: { error: 'Legal entity ID is required' },
        headers: { 'Access-Control-Allow-Origin': 'https://calm-tree-03352ba03.1.azurestaticapps.net' },
      };
    }

    // ✅ VERIFY USER HAS PERMISSION FOR THIS LEGAL ENTITY
    const entityResult = await pool.query(
      `SELECT le.legal_entity_id, le.primary_legal_name, c.email
       FROM legal_entity le
       JOIN legal_entity_contact c ON le.legal_entity_id = c.legal_entity_id
       WHERE le.legal_entity_id = $1
         AND le.is_deleted = false
         AND c.email = $2
         AND c.is_active = true`,
      [legalEntityId, userClaims.email]
    );

    if (entityResult.rows.length === 0) {
      return {
        status: 403,
        jsonBody: { error: 'You do not have permission to upload documents for this entity' },
        headers: { 'Access-Control-Allow-Origin': 'https://calm-tree-03352ba03.1.azurestaticapps.net' },
      };
    }

    // Parse multipart form data...
    const contentType = request.headers.get('content-type');
    // ... rest of validation and upload logic

    // ✅ ADD FILE CONTENT SCANNING (recommended)
    // Use Azure Defender for Storage or ClamAV to scan uploaded files

    return {
      status: 200,
      jsonBody: {
        message: 'Document uploaded and verification started',
        documentUrl: blobUrl,
        legalEntityId,
      },
      headers: { 'Access-Control-Allow-Origin': 'https://calm-tree-03352ba03.1.azurestaticapps.net' },
    };
  } catch (error: any) {
    context.error('Upload error:', error);
    return {
      status: 500,
      jsonBody: { error: 'Failed to upload document', details: error.message },
      headers: { 'Access-Control-Allow-Origin': 'https://calm-tree-03352ba03.1.azurestaticapps.net' },
    };
  }
}

// Change authLevel
app.http('uploadKvkDocument', {
  methods: ['POST', 'OPTIONS'],
  authLevel: 'function',  // ✅ REQUIRE AUTHENTICATION
  route: 'v1/legal-entities/{legalEntityId}/kvk-document',
  handler: uploadKvkDocument,
});
```

**Action Required:** IMMEDIATE - Add authentication and user authorization checks

---

### 7. SSL CERTIFICATE VALIDATION DISABLED

**Severity:** CRITICAL
**Risk:** Man-in-the-middle attacks, data interception
**Files:** All database connection configurations

**Problem:**
PostgreSQL connections disable SSL certificate validation:

```typescript
// Multiple files: GetMembers.ts, CreateMember.ts, IssueToken.ts, etc.
const pool = new Pool({
  host: process.env.POSTGRES_HOST,
  port: parseInt(process.env.POSTGRES_PORT || '5432'),
  database: process.env.POSTGRES_DATABASE,
  user: process.env.POSTGRES_USER,
  password: process.env.POSTGRES_PASSWORD,
  ssl: { rejectUnauthorized: false }  // ❌ VULNERABLE TO MITM
});
```

**Impact:**
- Database connections vulnerable to man-in-the-middle attacks
- Attackers can intercept database credentials
- Data in transit can be read or modified
- Especially dangerous in development environments with weak network security

**Solution:**
```typescript
const pool = new Pool({
  host: process.env.POSTGRES_HOST,
  port: parseInt(process.env.POSTGRES_PORT || '5432'),
  database: process.env.POSTGRES_DATABASE,
  user: process.env.POSTGRES_USER,
  password: process.env.POSTGRES_PASSWORD,
  ssl: {
    rejectUnauthorized: true,  // ✅ VALIDATE SSL CERTIFICATES
    ca: process.env.POSTGRES_SSL_CA,  // Azure Database SSL CA certificate
  },
  connectionTimeoutMillis: 10000,
  idleTimeoutMillis: 30000,
});

// Add to Azure Function App Settings:
// POSTGRES_SSL_CA=<Azure Database SSL certificate>
// Or for Azure Database for PostgreSQL, use:
ssl: {
  rejectUnauthorized: true,
  // Azure provides trusted root certificate
}
```

**Action Required:** HIGH PRIORITY - Enable SSL verification for production

---

## High Priority Issues 🟡

### 8. NO RATE LIMITING

**Severity:** HIGH
**Risk:** Denial of Service, brute force attacks, API abuse
**Files Affected:** All API endpoints

**Problem:**
No rate limiting implemented on any API endpoints. Combined with anonymous access, this allows unlimited requests.

**Impact:**
- Brute force attacks on token issuance
- Denial of service through request flooding
- Azure costs from excessive API calls
- Database overload

**Solution:**
```typescript
// Install Azure Functions middleware
// npm install azure-functions-middlewares

import { rateLimiter } from './middleware/rateLimiter';

// Implement rate limiter middleware
export class RateLimiter {
  private requests: Map<string, { count: number; resetTime: number }> = new Map();

  check(clientId: string, maxRequests: number, windowMs: number): boolean {
    const now = Date.now();
    const clientData = this.requests.get(clientId);

    if (!clientData || now > clientData.resetTime) {
      this.requests.set(clientId, {
        count: 1,
        resetTime: now + windowMs
      });
      return true;
    }

    if (clientData.count >= maxRequests) {
      return false;
    }

    clientData.count++;
    return true;
  }
}

const rateLimiter = new RateLimiter();

// Apply to endpoints
export async function IssueToken(request: HttpRequest, context: InvocationContext): Promise<HttpResponseInit> {
  const clientIp = request.headers.get('x-forwarded-for') || 'unknown';

  if (!rateLimiter.check(clientIp, 10, 60000)) { // 10 requests per minute
    return {
      status: 429,
      body: JSON.stringify({ error: 'Rate limit exceeded. Try again later.' })
    };
  }

  // Continue with normal logic...
}
```

**Recommended:** Implement Azure API Management for advanced rate limiting

---

### 9. MISSING INPUT VALIDATION

**Severity:** HIGH
**Risk:** Invalid data in database, application crashes
**Files Affected:** Most API create/update functions

**Problem:**
Minimal input validation on API endpoints:

```typescript
// /api/src/functions/CreateMember.ts:18-25
// Validate required fields
if (!body.org_id || !body.legal_name || !body.domain) {
  return {
    status: 400,
    body: JSON.stringify({
      error: 'Missing required fields: org_id, legal_name, domain'
    })
  };
}
// ❌ No validation of format, length, or content
```

**Solution:**
```typescript
// Install validation library
// npm install joi

import Joi from 'joi';

const createMemberSchema = Joi.object({
  org_id: Joi.string().uuid().required(),
  legal_name: Joi.string().min(2).max(255).required(),
  lei: Joi.string().length(20).pattern(/^[A-Z0-9]{20}$/).optional(),
  kvk: Joi.string().length(8).pattern(/^\d{8}$/).optional(),
  domain: Joi.string().domain().required(),
  status: Joi.string().valid('PENDING', 'ACTIVE', 'SUSPENDED', 'TERMINATED').default('PENDING'),
  membership_level: Joi.string().valid('BASIC', 'PREMIUM', 'ENTERPRISE').default('BASIC'),
  metadata: Joi.object().optional()
});

export async function CreateMember(request: HttpRequest, context: InvocationContext): Promise<HttpResponseInit> {
  try {
    const body = await request.json() as any;

    // Validate input
    const { error, value } = createMemberSchema.validate(body, { abortEarly: false });

    if (error) {
      return {
        status: 400,
        body: JSON.stringify({
          error: 'Validation failed',
          details: error.details.map(d => ({ field: d.path.join('.'), message: d.message }))
        })
      };
    }

    // Use validated data
    const result = await pool.query(
      `INSERT INTO members (org_id, legal_name, lei, kvk, domain, status, membership_level, metadata)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
       RETURNING *`,
      [
        value.org_id,
        value.legal_name,
        value.lei,
        value.kvk,
        value.domain,
        value.status,
        value.membership_level,
        value.metadata ? JSON.stringify(value.metadata) : null
      ]
    );

    return {
      status: 201,
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(result.rows[0])
    };
  } catch (error: any) {
    context.error('Error creating member:', error);

    if (error.code === '23505') {
      return {
        status: 409,
        body: JSON.stringify({ error: 'Member with this org_id already exists' })
      };
    }

    return {
      status: 500,
      body: JSON.stringify({ error: 'Failed to create member' })
    };
  }
}
```

---

### 10. NO AUDIT LOGGING FOR SENSITIVE OPERATIONS

**Severity:** HIGH
**Risk:** Compliance violations, inability to track security incidents
**Files Affected:** Most API functions

**Problem:**
Minimal audit logging. Only some KvK verification operations log to audit_logs table.

**Solution:**
```typescript
// Create audit logging middleware
async function logAuditEvent(
  pool: Pool,
  eventType: string,
  actorOrgId: string,
  actorEmail: string,
  resourceType: string,
  resourceId: string,
  action: string,
  result: string,
  metadata?: any
) {
  await pool.query(
    `INSERT INTO audit_logs (event_type, actor_org_id, actor_email, resource_type, resource_id, action, result, metadata)
     VALUES ($1, $2, $3, $4, $5, $6, $7, $8)`,
    [eventType, actorOrgId, actorEmail, resourceType, resourceId, action, result, JSON.stringify(metadata)]
  );
}

// Apply to all sensitive operations
export async function IssueToken(request: HttpRequest, context: InvocationContext): Promise<HttpResponseInit> {
  const userClaims = await validateAzureADToken(request, context);

  try {
    const body = await request.json() as any;

    // ... token issuance logic ...

    // ✅ LOG SUCCESS
    await logAuditEvent(
      pool,
      'TOKEN_ISSUED',
      body.org_id,
      userClaims.email,
      'token',
      jti,
      'ISSUE',
      'SUCCESS',
      { token_type: 'BVAD', expires_in: expiresIn }
    );

    return { status: 200, body: JSON.stringify({ access_token: token }) };
  } catch (error) {
    // ✅ LOG FAILURE
    await logAuditEvent(
      pool,
      'TOKEN_ISSUANCE_FAILED',
      body.org_id || 'UNKNOWN',
      userClaims.email,
      'token',
      '',
      'ISSUE',
      'FAILURE',
      { error: error.message }
    );

    throw error;
  }
}
```

**Add audit logging for:**
- Token issuance and revocation
- Member creation, updates, deletion
- KvK document uploads
- Role changes
- Login attempts (successful and failed)
- Configuration changes

---

### 11. NO ERROR HANDLING STANDARDIZATION

**Severity:** HIGH
**Risk:** Information disclosure, inconsistent error messages
**Files Affected:** All API functions

**Problem:**
Error handling is inconsistent and sometimes exposes internal details:

```typescript
// Various files show different error handling patterns
return {
  status: 500,
  body: JSON.stringify({ error: 'Failed to create member' })
};

// vs

return {
  status: 500,
  jsonBody: { error: 'Failed to upload document', details: error.message }
};
```

**Solution:**
```typescript
// Create error handler utility
export class ApiError extends Error {
  constructor(
    public statusCode: number,
    public message: string,
    public code?: string,
    public details?: any
  ) {
    super(message);
    this.name = 'ApiError';
  }
}

export function handleError(error: any, context: InvocationContext): HttpResponseInit {
  // Log full error for debugging
  context.error('API Error:', {
    message: error.message,
    stack: error.stack,
    code: error.code
  });

  if (error instanceof ApiError) {
    return {
      status: error.statusCode,
      body: JSON.stringify({
        error: error.message,
        code: error.code,
        // Only include details in development
        ...(process.env.NODE_ENV === 'development' && { details: error.details })
      })
    };
  }

  // Database errors
  if (error.code === '23505') {
    return {
      status: 409,
      body: JSON.stringify({ error: 'Resource already exists', code: 'DUPLICATE' })
    };
  }

  if (error.code === '23503') {
    return {
      status: 400,
      body: JSON.stringify({ error: 'Referenced resource not found', code: 'FK_VIOLATION' })
    };
  }

  // Authentication errors
  if (error.name === 'JsonWebTokenError' || error.name === 'TokenExpiredError') {
    return {
      status: 401,
      body: JSON.stringify({ error: 'Unauthorized', code: 'AUTH_FAILED' })
    };
  }

  // Default error (don't expose internal details)
  return {
    status: 500,
    body: JSON.stringify({
      error: 'An internal error occurred',
      code: 'INTERNAL_ERROR',
      // Only in development
      ...(process.env.NODE_ENV === 'development' && { message: error.message })
    })
  };
}

// Usage
export async function CreateMember(request: HttpRequest, context: InvocationContext): Promise<HttpResponseInit> {
  try {
    // Validate authentication
    const userClaims = await validateAzureADToken(request, context);

    const body = await request.json() as any;

    if (!body.org_id) {
      throw new ApiError(400, 'org_id is required', 'MISSING_FIELD');
    }

    const result = await pool.query(/* ... */);

    return {
      status: 201,
      body: JSON.stringify(result.rows[0])
    };
  } catch (error) {
    return handleError(error, context);
  }
}
```

---

### 12. FILE SIZE LIMIT ONLY IN FRONTEND

**Severity:** HIGH
**Risk:** Storage abuse through API bypass
**Files:** `/api/src/functions/uploadKvkDocument.ts`, `/web/src/components/KvkDocumentUpload.tsx`

**Problem:**
File size validation only exists in frontend (10MB limit), not enforced on backend:

```typescript
// Frontend validation only (line 78)
if (file.size > 10 * 1024 * 1024) {
  setNotification({ type: 'error', message: 'File size must be less than 10MB' });
  return;
}
```

**Solution:**
```typescript
// /api/src/functions/uploadKvkDocument.ts - Add backend validation
export async function uploadKvkDocument(
  request: HttpRequest,
  context: InvocationContext
): Promise<HttpResponseInit> {
  try {
    // ... authentication ...

    const bodyBuffer = await request.arrayBuffer();

    // ✅ VALIDATE FILE SIZE ON BACKEND
    const MAX_FILE_SIZE = 10 * 1024 * 1024; // 10MB
    if (bodyBuffer.byteLength > MAX_FILE_SIZE) {
      return {
        status: 413,
        jsonBody: { error: 'File size exceeds maximum allowed size of 10MB' },
        headers: { 'Access-Control-Allow-Origin': 'https://calm-tree-03352ba03.1.azurestaticapps.net' },
      };
    }

    // Parse multipart...
    const parts = multipart.parse(Buffer.from(bodyBuffer), boundary);
    const filePart = parts.find(part => part.name === 'file');

    if (!filePart || !filePart.data) {
      return {
        status: 400,
        jsonBody: { error: 'No file uploaded' },
        headers: { 'Access-Control-Allow-Origin': 'https://calm-tree-03352ba03.1.azurestaticapps.net' },
      };
    }

    // ✅ VALIDATE FILE SIZE AGAIN (multipart data)
    if (filePart.data.length > MAX_FILE_SIZE) {
      return {
        status: 413,
        jsonBody: { error: 'File size exceeds maximum allowed size of 10MB' },
        headers: { 'Access-Control-Allow-Origin': 'https://calm-tree-03352ba03.1.azurestaticapps.net' },
      };
    }

    // ✅ VALIDATE FILE TYPE (magic number check, not just extension)
    const isPdf = filePart.data[0] === 0x25 &&
                  filePart.data[1] === 0x50 &&
                  filePart.data[2] === 0x44 &&
                  filePart.data[3] === 0x46; // %PDF

    if (!isPdf) {
      return {
        status: 400,
        jsonBody: { error: 'Invalid file format. Only PDF files are allowed.' },
        headers: { 'Access-Control-Allow-Origin': 'https://calm-tree-03352ba03.1.azurestaticapps.net' },
      };
    }

    // Continue with upload...
  } catch (error: any) {
    context.error('Upload error:', error);
    return {
      status: 500,
      jsonBody: { error: 'Failed to upload document' },
      headers: { 'Access-Control-Allow-Origin': 'https://calm-tree-03352ba03.1.azurestaticapps.net' },
    };
  }
}
```

---

### 13. NO DEPENDENCY VULNERABILITY SCANNING

**Severity:** HIGH
**Risk:** Using packages with known vulnerabilities
**Files:** `package.json` files

**Problem:**
No security scanning tools configured. Dependencies not checked for vulnerabilities.

**Solution:**
```bash
# 1. Install npm audit
npm audit

# 2. Add to package.json scripts
{
  "scripts": {
    "audit": "npm audit",
    "audit:fix": "npm audit fix",
    "security:check": "npm audit && npm outdated"
  }
}

# 3. Add GitHub Dependabot (create .github/dependabot.yml)
version: 2
updates:
  - package-ecosystem: "npm"
    directory: "/api"
    schedule:
      interval: "weekly"
    open-pull-requests-limit: 10
  - package-ecosystem: "npm"
    directory: "/web"
    schedule:
      interval: "weekly"
    open-pull-requests-limit: 10
  - package-ecosystem: "npm"
    directory: "/portal"
    schedule:
      interval: "weekly"
    open-pull-requests-limit: 10

# 4. Add Snyk or Aikido scanning
npm install -g snyk
snyk auth
snyk test
snyk monitor

# Or add Aikido (recommended)
npm install --save-dev @aikidosec/firewall
# Configure in package.json or aikido.config.js

# 5. Add to CI/CD pipeline
# In azure-pipelines.yml
- task: Npm@1
  displayName: 'Security Audit'
  inputs:
    command: 'custom'
    customCommand: 'audit'
  continueOnError: false
```

---

### 14. MISSING CONTENT SECURITY POLICY

**Severity:** HIGH
**Risk:** XSS attacks, clickjacking
**Files:** `/web/public/staticwebapp.config.json`, `/portal/public/staticwebapp.config.json`

**Problem:**
No Content Security Policy headers configured:

```json
{
  "navigationFallback": {
    "rewrite": "/index.html"
  },
  "routes": [],
  "responseOverrides": {
    "404": {
      "rewrite": "/index.html",
      "statusCode": 200
    }
  }
  // ❌ No security headers
}
```

**Solution:**
```json
{
  "navigationFallback": {
    "rewrite": "/index.html",
    "exclude": ["/static/*", "/*.{css,js,json,png,jpg,jpeg,gif,svg,ico,woff,woff2,ttf,eot}"]
  },
  "routes": [],
  "responseOverrides": {
    "404": {
      "rewrite": "/index.html",
      "statusCode": 200
    }
  },
  "globalHeaders": {
    "Content-Security-Policy": "default-src 'self'; script-src 'self' 'unsafe-inline' 'unsafe-eval' https://login.microsoftonline.com; style-src 'self' 'unsafe-inline'; img-src 'self' data: https:; font-src 'self' data:; connect-src 'self' https://login.microsoftonline.com https://graph.microsoft.com https://func-ctn-demo-asr-dev.azurewebsites.net; frame-ancestors 'none';",
    "X-Content-Type-Options": "nosniff",
    "X-Frame-Options": "DENY",
    "X-XSS-Protection": "1; mode=block",
    "Referrer-Policy": "strict-origin-when-cross-origin",
    "Permissions-Policy": "geolocation=(), microphone=(), camera=()"
  }
}
```

---

### 15. PASSWORD/SECRET IN CONNECTION STRING PARSING

**Severity:** HIGH
**Risk:** Credential exposure in logs
**File:** `/api/src/services/blobStorageService.ts` (line 18-27)

**Problem:**
Connection string parsing extracts credentials without proper handling:

```typescript
// Parse connection string to extract account name and key for SAS generation
const accountNameMatch = connectionString.match(/AccountName=([^;]+)/);
const accountKeyMatch = connectionString.match(/AccountKey=([^;]+)/);

if (!accountNameMatch || !accountKeyMatch) {
  throw new Error('Invalid Azure Storage connection string');
}

this.accountName = accountNameMatch[1];
this.accountKey = accountKeyMatch[1];
```

**Solution:**
```typescript
constructor() {
  const connectionString = process.env.AZURE_STORAGE_CONNECTION_STRING || '';

  if (!connectionString) {
    throw new Error('AZURE_STORAGE_CONNECTION_STRING not configured');
  }

  this.blobServiceClient = BlobServiceClient.fromConnectionString(connectionString);

  try {
    // Parse connection string safely
    const accountNameMatch = connectionString.match(/AccountName=([^;]+)/);
    const accountKeyMatch = connectionString.match(/AccountKey=([^;]+)/);

    if (!accountNameMatch || !accountKeyMatch) {
      throw new Error('Invalid Azure Storage connection string format');
    }

    this.accountName = accountNameMatch[1];
    this.accountKey = accountKeyMatch[1];

    // ✅ DON'T LOG CREDENTIALS
    console.log(`Blob Storage initialized for account: ${this.accountName}`);
  } catch (error) {
    // ✅ DON'T EXPOSE CONNECTION STRING IN ERROR
    throw new Error('Failed to initialize Blob Storage service');
  }
}
```

---

### 16. NO HTTPS ENFORCEMENT

**Severity:** HIGH
**Risk:** Credentials transmitted over unencrypted connections
**Files:** Frontend API clients

**Problem:**
Frontend allows HTTP connections in development (fallback to localhost:7071)

**Solution:**
```typescript
// /web/src/services/apiV2.ts
const API_BASE_URL = process.env.REACT_APP_API_URL || 'http://localhost:7071/api/v1';

// Add HTTPS enforcement in production
const API_BASE_URL = (() => {
  const url = process.env.REACT_APP_API_URL || 'http://localhost:7071/api/v1';

  // ✅ ENFORCE HTTPS IN PRODUCTION
  if (process.env.NODE_ENV === 'production' && !url.startsWith('https://')) {
    throw new Error('API URL must use HTTPS in production');
  }

  return url;
})();

// Add Axios interceptor to enforce HTTPS
axios.interceptors.request.use((config) => {
  if (process.env.NODE_ENV === 'production' && config.url && !config.url.startsWith('https://')) {
    throw new Error('All API requests must use HTTPS in production');
  }
  return config;
});
```

---

### 17. DATABASE CONNECTION POOL NOT OPTIMIZED

**Severity:** MEDIUM-HIGH
**Risk:** Connection exhaustion, performance issues
**Files:** All API functions

**Problem:**
Every function creates its own database pool:

```typescript
// Repeated in every function file
const pool = new Pool({
  host: process.env.POSTGRES_HOST,
  port: parseInt(process.env.POSTGRES_PORT || '5432'),
  database: process.env.POSTGRES_DATABASE,
  user: process.env.POSTGRES_USER,
  password: process.env.POSTGRES_PASSWORD,
  ssl: { rejectUnauthorized: false }
});
```

**Solution:**
```typescript
// Create shared database connection module
// /api/src/utils/database.ts
import { Pool } from 'pg';

let pool: Pool | null = null;

export function getPool(): Pool {
  if (!pool) {
    pool = new Pool({
      host: process.env.POSTGRES_HOST,
      port: parseInt(process.env.POSTGRES_PORT || '5432'),
      database: process.env.POSTGRES_DATABASE,
      user: process.env.POSTGRES_USER,
      password: process.env.POSTGRES_PASSWORD,
      ssl: {
        rejectUnauthorized: true
      },
      // ✅ CONNECTION POOL SETTINGS
      max: 20, // Maximum pool size
      min: 5, // Minimum pool size
      idleTimeoutMillis: 30000,
      connectionTimeoutMillis: 10000,
      // Graceful shutdown
      allowExitOnIdle: false
    });

    // Handle pool errors
    pool.on('error', (err) => {
      console.error('Unexpected database pool error:', err);
    });
  }

  return pool;
}

// Graceful shutdown
export async function closePool(): Promise<void> {
  if (pool) {
    await pool.end();
    pool = null;
  }
}

// Use in functions
import { getPool } from '../utils/database';

export async function GetMembers(request: HttpRequest, context: InvocationContext): Promise<HttpResponseInit> {
  const pool = getPool();
  // ... use pool ...
}
```

---

### 18. NO SECRETS IN AZURE KEY VAULT

**Severity:** HIGH
**Risk:** Secrets exposed in Function App configuration
**Files:** N/A (Configuration issue)

**Problem:**
Secrets likely stored as plain text in Azure Function App Settings instead of Key Vault.

**Solution:**
```bash
# 1. Create Azure Key Vault
az keyvault create \
  --name "kv-ctn-demo-asr-dev" \
  --resource-group "rg-ctn-demo-asr-dev" \
  --location "westeurope"

# 2. Add secrets to Key Vault
az keyvault secret set \
  --vault-name "kv-ctn-demo-asr-dev" \
  --name "PostgresConnectionString" \
  --value "Host=...;Database=...;Username=...;Password=..."

az keyvault secret set \
  --vault-name "kv-ctn-demo-asr-dev" \
  --name "JwtSecret" \
  --value "<strong-random-secret>"

az keyvault secret set \
  --vault-name "kv-ctn-demo-asr-dev" \
  --name "AzureStorageConnectionString" \
  --value "DefaultEndpointsProtocol=https;..."

# 3. Grant Function App access to Key Vault
az functionapp identity assign \
  --name "func-ctn-demo-asr-dev" \
  --resource-group "rg-ctn-demo-asr-dev"

PRINCIPAL_ID=$(az functionapp identity show \
  --name "func-ctn-demo-asr-dev" \
  --resource-group "rg-ctn-demo-asr-dev" \
  --query principalId -o tsv)

az keyvault set-policy \
  --name "kv-ctn-demo-asr-dev" \
  --object-id $PRINCIPAL_ID \
  --secret-permissions get list

# 4. Update Function App Settings to reference Key Vault
az functionapp config appsettings set \
  --name "func-ctn-demo-asr-dev" \
  --resource-group "rg-ctn-demo-asr-dev" \
  --settings \
    "POSTGRES_CONNECTION_STRING=@Microsoft.KeyVault(SecretUri=https://kv-ctn-demo-asr-dev.vault.azure.net/secrets/PostgresConnectionString/)" \
    "JWT_SECRET=@Microsoft.KeyVault(SecretUri=https://kv-ctn-demo-asr-dev.vault.azure.net/secrets/JwtSecret/)" \
    "AZURE_STORAGE_CONNECTION_STRING=@Microsoft.KeyVault(SecretUri=https://kv-ctn-demo-asr-dev.vault.azure.net/secrets/AzureStorageConnectionString/)"
```

---

### 19. EVENTGRID HANDLER NO VALIDATION

**Severity:** HIGH
**Risk:** Accepting events from unauthorized sources
**File:** `/api/src/functions/EventGridHandler.ts` (line 188)

**Problem:**
EventGrid handler configured with `authLevel: 'anonymous'`, accepting events from any source:

```typescript
app.http('EventGridHandler', {
  methods: ['POST'],
  authLevel: 'anonymous',  // ❌ ANYONE CAN SEND EVENTS
  handler: EventGridHandler
});
```

**Solution:**
```typescript
// 1. Enable Event Grid signature validation
export async function EventGridHandler(
  request: HttpRequest,
  context: InvocationContext
): Promise<HttpResponseInit> {
  context.log('Event Grid Handler triggered');

  try {
    // ✅ VALIDATE EVENT GRID SIGNATURE
    const signature = request.headers.get('aeg-event-type');
    const eventType = request.headers.get('aeg-event-type');

    if (!signature || !eventType) {
      return {
        status: 401,
        body: JSON.stringify({ error: 'Missing Event Grid headers' })
      };
    }

    const body = await request.text();
    const events = JSON.parse(body);

    // Handle validation handshake
    if (events[0]?.eventType === 'Microsoft.EventGrid.SubscriptionValidationEvent') {
      context.log('Handling subscription validation');
      return {
        status: 200,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          validationResponse: events[0].data.validationCode
        })
      };
    }

    // ✅ VALIDATE EVENT SOURCE
    const allowedTopics = [
      '/subscriptions/.../resourceGroups/.../providers/Microsoft.EventGrid/topics/ctn-asr-events'
    ];

    for (const event of events) {
      if (!allowedTopics.includes(event.topic)) {
        context.log(`Rejected event from unauthorized topic: ${event.topic}`);
        return {
          status: 403,
          body: JSON.stringify({ error: 'Unauthorized event source' })
        };
      }
    }

    // Process events...
    // ...

  } catch (error) {
    context.error('Error processing events:', error);
    return {
      status: 500,
      body: JSON.stringify({ error: 'Internal error' })
    };
  }
}

// 2. Change authLevel to function or add Event Grid key validation
app.http('EventGridHandler', {
  methods: ['POST'],
  authLevel: 'function',  // ✅ OR USE EVENT GRID MANAGED IDENTITY
  handler: EventGridHandler
});

// 3. Configure Event Grid to use Managed Identity
// In Azure Portal: Event Grid > Event Subscription > Endpoint Type = Azure Function (with Managed Identity)
```

---

## Medium Priority Issues 🟢

### 20. NO API VERSIONING STRATEGY

**Severity:** MEDIUM
**Risk:** Breaking changes affect clients
**Files:** API routes

**Problem:**
API uses `/api/v1/` prefix but no actual versioning strategy implemented.

**Recommendation:**
- Document API version in responses
- Implement version negotiation headers
- Plan migration strategy for v2
- Add deprecation warnings for old endpoints

---

### 21. MISSING TRANSACTION SUPPORT

**Severity:** MEDIUM
**Risk:** Data inconsistency in multi-step operations
**Files:** Functions performing multiple database operations

**Problem:**
Multi-step operations not wrapped in transactions:

```typescript
// /api/src/functions/CreateMemberContact.ts
// Multiple operations without transaction
const result = await pool.query('INSERT INTO legal_entity_contact...');
await pool.query('INSERT INTO audit_logs...');
```

**Solution:**
```typescript
export async function CreateMemberContact(request: HttpRequest, context: InvocationContext): Promise<HttpResponseInit> {
  const client = await pool.connect();

  try {
    await client.query('BEGIN');

    // Operation 1
    const result = await client.query(
      'INSERT INTO legal_entity_contact (...) VALUES (...) RETURNING *',
      [...]
    );

    // Operation 2
    await client.query(
      'INSERT INTO audit_logs (...) VALUES (...)',
      [...]
    );

    await client.query('COMMIT');

    return {
      status: 201,
      body: JSON.stringify(result.rows[0])
    };
  } catch (error) {
    await client.query('ROLLBACK');
    context.error('Transaction failed:', error);
    return {
      status: 500,
      body: JSON.stringify({ error: 'Failed to create contact' })
    };
  } finally {
    client.release();
  }
}
```

---

### 22. NO API DOCUMENTATION

**Severity:** MEDIUM
**Risk:** Developers unable to use API correctly
**Files:** `/api/src/functions/swagger.ts` (disabled)

**Problem:**
Swagger/OpenAPI documentation is disabled:

```typescript
// /api/src/index.ts:41
// import './functions/swagger';  // Temporarily disabled - missing openapi.json
```

**Solution:**
Enable and configure OpenAPI documentation using swagger-jsdoc:

```typescript
// /api/src/functions/swagger.ts
import { app, HttpRequest, HttpResponseInit } from '@azure/functions';
import swaggerJsdoc from 'swagger-jsdoc';

const options = {
  definition: {
    openapi: '3.0.0',
    info: {
      title: 'CTN ASR API',
      version: '1.0.0',
      description: 'API for managing CTN member organizations',
    },
    servers: [
      {
        url: 'https://func-ctn-demo-asr-dev.azurewebsites.net/api',
        description: 'Development server',
      },
    ],
    components: {
      securitySchemes: {
        BearerAuth: {
          type: 'http',
          scheme: 'bearer',
          bearerFormat: 'JWT',
        },
      },
    },
    security: [{ BearerAuth: [] }],
  },
  apis: ['./src/functions/*.ts'], // Path to API docs
};

const swaggerSpec = swaggerJsdoc(options);

export async function GetSwaggerSpec(request: HttpRequest): Promise<HttpResponseInit> {
  return {
    status: 200,
    headers: {
      'Content-Type': 'application/json',
      'Access-Control-Allow-Origin': '*',
    },
    body: JSON.stringify(swaggerSpec),
  };
}

app.http('swagger', {
  methods: ['GET'],
  authLevel: 'anonymous',
  route: 'swagger.json',
  handler: GetSwaggerSpec,
});

// Enable in /api/src/index.ts
import './functions/swagger';
```

Add JSDoc comments to endpoints:

```typescript
/**
 * @swagger
 * /v1/members:
 *   get:
 *     summary: Get all members
 *     tags: [Members]
 *     security:
 *       - BearerAuth: []
 *     responses:
 *       200:
 *         description: List of members
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 data:
 *                   type: array
 *                   items:
 *                     $ref: '#/components/schemas/Member'
 *       401:
 *         description: Unauthorized
 */
export async function GetMembers(request: HttpRequest, context: InvocationContext): Promise<HttpResponseInit> {
  // ...
}
```

---

### 23. LANGUAGE DETECTION IN EMAIL SERVICE

**Severity:** MEDIUM
**Risk:** Users receiving emails in wrong language
**File:** `/api/src/services/emailTemplateService.ts`

**Problem:**
Email template service defaults to English if language not recognized:

```typescript
const lang = ['en', 'nl', 'de'].includes(language) ? language : 'en';
```

**Recommendation:**
- Store user language preference in database
- Fall back to organization's default language
- Log when language fallback occurs for monitoring

---

### 24. NO HEALTH CHECK ENDPOINT

**Severity:** MEDIUM
**Risk:** Unable to monitor API availability
**Files:** N/A

**Problem:**
No health check endpoint for monitoring.

**Solution:**
```typescript
// /api/src/functions/health.ts
import { app, HttpRequest, HttpResponseInit, InvocationContext } from '@azure/functions';
import { getPool } from '../utils/database';

export async function HealthCheck(request: HttpRequest, context: InvocationContext): Promise<HttpResponseInit> {
  const checks: any = {
    status: 'healthy',
    timestamp: new Date().toISOString(),
    checks: {}
  };

  try {
    // Check database connection
    const pool = getPool();
    const dbStart = Date.now();
    await pool.query('SELECT 1');
    checks.checks.database = {
      status: 'healthy',
      responseTime: Date.now() - dbStart
    };
  } catch (error) {
    checks.status = 'unhealthy';
    checks.checks.database = {
      status: 'unhealthy',
      error: error.message
    };
  }

  try {
    // Check blob storage
    const blobService = new BlobStorageService();
    // ... check connection
    checks.checks.storage = {
      status: 'healthy'
    };
  } catch (error) {
    checks.checks.storage = {
      status: 'unhealthy',
      error: error.message
    };
  }

  const statusCode = checks.status === 'healthy' ? 200 : 503;

  return {
    status: statusCode,
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(checks)
  };
}

app.http('health', {
  methods: ['GET'],
  authLevel: 'anonymous',
  route: 'health',
  handler: HealthCheck
});
```

---

### 25. HARDCODED PORTAL URL IN EVENT HANDLER

**Severity:** MEDIUM
**Risk:** Incorrect links in production emails
**File:** `/api/src/functions/EventGridHandler.ts` (line 118)

**Problem:**
Portal URL is hardcoded with fallback:

```typescript
portalUrl: process.env.MEMBER_PORTAL_URL || 'https://calm-pebble-0b2ffb603-12.westeurope.5.azurestaticapps.net',
```

**Solution:**
- Move to environment variable (already done)
- Validate URL format on startup
- Remove hardcoded fallback for production

---

### 26. NO PAGINATION ON LIST ENDPOINTS

**Severity:** MEDIUM
**Risk:** Performance issues with large datasets
**Files:** `/api/src/functions/GetMembers.ts`, `/api/src/functions/GetContacts.ts`

**Problem:**
No pagination support - returns all records:

```typescript
const result = await pool.query(
  'SELECT * FROM members ORDER BY created_at DESC'
);
```

**Solution:**
```typescript
export async function GetMembers(request: HttpRequest, context: InvocationContext): Promise<HttpResponseInit> {
  try {
    const userClaims = await validateAzureADToken(request, context);

    // Parse pagination parameters
    const page = parseInt(request.query.get('page') || '1');
    const limit = Math.min(parseInt(request.query.get('limit') || '50'), 100);
    const offset = (page - 1) * limit;

    // Get total count
    const countResult = await pool.query('SELECT COUNT(*) FROM members');
    const total = parseInt(countResult.rows[0].count);

    // Get paginated results
    const result = await pool.query(
      'SELECT * FROM members ORDER BY created_at DESC LIMIT $1 OFFSET $2',
      [limit, offset]
    );

    return {
      status: 200,
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        data: result.rows,
        pagination: {
          page,
          limit,
          total,
          totalPages: Math.ceil(total / limit),
          hasNext: offset + limit < total,
          hasPrevious: page > 1
        }
      })
    };
  } catch (error) {
    context.error('Error fetching members:', error);
    return {
      status: 500,
      body: JSON.stringify({ error: 'Failed to fetch members' })
    };
  }
}
```

---

### 27. NO TIMEOUT CONFIGURATION

**Severity:** MEDIUM
**Risk:** Long-running requests exhausting resources
**Files:** API functions, external API calls

**Problem:**
No timeout configuration for external API calls:

```typescript
// /api/src/services/kvkService.ts:50-55
const response = await axios.get(`${this.baseUrl}/basisprofielen/${kvkNumber}`, {
  headers: {
    'apikey': this.apiKey,
  },
  timeout: 10000,  // ✅ Good - timeout configured
});
```

**Recommendation:**
- Configure function timeout in host.json
- Set timeouts on all axios calls
- Implement retry logic with exponential backoff

---

### 28. MISSING INDEX ON FREQUENTLY QUERIED COLUMNS

**Severity:** MEDIUM
**Risk:** Slow queries as data grows
**Files:** Database migrations

**Problem:**
Some frequently queried columns lack indexes.

**Solution:**
```sql
-- Add missing indexes
CREATE INDEX IF NOT EXISTS idx_members_status ON members(status) WHERE status != 'TERMINATED';
CREATE INDEX IF NOT EXISTS idx_members_domain ON members(domain);
CREATE INDEX IF NOT EXISTS idx_issued_tokens_expires ON issued_tokens(expires_at) WHERE expires_at > NOW();
CREATE INDEX IF NOT EXISTS idx_audit_logs_event_type ON audit_logs(event_type);
CREATE INDEX IF NOT EXISTS idx_audit_logs_created_at ON audit_logs(created_at DESC);
```

---

### 29. NO MONITORING/TELEMETRY

**Severity:** MEDIUM
**Risk:** Unable to detect issues in production
**Files:** Application code

**Problem:**
No custom telemetry or monitoring beyond default Azure Application Insights.

**Recommendation:**
```typescript
// Add custom metrics
import { TelemetryClient } from 'applicationinsights';

const appInsights = new TelemetryClient();

export async function IssueToken(request: HttpRequest, context: InvocationContext): Promise<HttpResponseInit> {
  const startTime = Date.now();

  try {
    // ... token issuance logic ...

    // Track success
    appInsights.trackMetric({
      name: 'TokenIssuance.Duration',
      value: Date.now() - startTime
    });

    appInsights.trackEvent({
      name: 'TokenIssued',
      properties: {
        org_id: body.org_id,
        token_type: 'BVAD'
      }
    });

    return { status: 200, body: JSON.stringify({ access_token: token }) };
  } catch (error) {
    // Track failure
    appInsights.trackException({
      exception: error,
      properties: {
        org_id: body.org_id,
        operation: 'IssueToken'
      }
    });

    throw error;
  }
}
```

---

### 30. FRONTEND ERROR BOUNDARIES LIMITED

**Severity:** MEDIUM
**Risk:** Poor user experience on errors
**File:** `/web/src/components/ErrorBoundary.tsx`

**Problem:**
Only one ErrorBoundary component, not used throughout app.

**Recommendation:**
- Wrap each major component with ErrorBoundary
- Implement different error boundaries for different sections
- Add error reporting to Application Insights

---

### 31. NO REQUEST ID TRACKING

**Severity:** MEDIUM
**Risk:** Difficult to trace requests across services
**Files:** API functions

**Problem:**
No correlation ID for tracking requests.

**Solution:**
```typescript
import { v4 as uuidv4 } from 'uuid';

export async function GetMembers(request: HttpRequest, context: InvocationContext): Promise<HttpResponseInit> {
  const requestId = request.headers.get('x-request-id') || uuidv4();

  context.log(`[${requestId}] GetMembers started`);

  try {
    const result = await pool.query('SELECT * FROM members');

    return {
      status: 200,
      headers: {
        'Content-Type': 'application/json',
        'X-Request-ID': requestId
      },
      body: JSON.stringify(result.rows)
    };
  } catch (error) {
    context.error(`[${requestId}] Error:`, error);
    return {
      status: 500,
      headers: { 'X-Request-ID': requestId },
      body: JSON.stringify({ error: 'Internal error', requestId })
    };
  }
}
```

---

### 32. INCONSISTENT NAMING CONVENTIONS

**Severity:** MEDIUM
**Risk:** Code maintainability issues
**Files:** Database schema, API responses

**Problem:**
Mixed naming conventions (snake_case in DB, camelCase in TypeScript):

```typescript
// Database uses snake_case
legal_entity_id, primary_legal_name

// TypeScript uses camelCase
organizationId, legalName

// But some places mix both
```

**Recommendation:**
- Choose one convention and stick to it
- Use database column transformation layer
- Document naming conventions

---

### 33. LOCALE/TIMEZONE NOT HANDLED

**Severity:** MEDIUM
**Risk:** Date/time confusion across timezones
**Files:** Frontend components, API responses

**Problem:**
No explicit timezone handling. Dates stored as `TIMESTAMPTZ` but frontend may display incorrectly.

**Recommendation:**
- Always store dates in UTC
- Convert to user's timezone in frontend
- Display timezone in UI
- Use date-fns or dayjs for consistent formatting

---

### 34. NO DATA RETENTION POLICY

**Severity:** MEDIUM
**Risk:** GDPR compliance issues, storage costs
**Files:** Database

**Problem:**
No automated data cleanup or retention policy.

**Recommendation:**
```sql
-- Create data retention stored procedure
CREATE OR REPLACE FUNCTION cleanup_old_audit_logs()
RETURNS void AS $$
BEGIN
  -- Delete audit logs older than 2 years
  DELETE FROM audit_logs
  WHERE created_at < NOW() - INTERVAL '2 years';

  -- Delete expired tokens
  DELETE FROM issued_tokens
  WHERE expires_at < NOW() - INTERVAL '90 days';
END;
$$ LANGUAGE plpgsql;

-- Schedule with pg_cron extension
SELECT cron.schedule('cleanup-old-data', '0 2 * * 0', 'SELECT cleanup_old_audit_logs()');
```

---

## Low Priority Issues 🔵

### 35. CODE DUPLICATION IN API FUNCTIONS

**Severity:** LOW
**Risk:** Maintenance burden
**Files:** Multiple API function files

**Problem:**
Database pool creation repeated in every function.

**Solution:** Already covered in Issue #17 (database connection pool)

---

### 36. MISSING TYPESCRIPT STRICT MODE

**Severity:** LOW
**Risk:** Type safety issues
**Files:** `tsconfig.json`

**Recommendation:**
```json
{
  "compilerOptions": {
    "strict": true,
    "noImplicitAny": true,
    "strictNullChecks": true,
    "strictFunctionTypes": true,
    "strictPropertyInitialization": true
  }
}
```

---

### 37. NO UNIT TESTS

**Severity:** LOW (but important for quality)
**Risk:** Regressions, bugs in production
**Files:** Entire codebase

**Problem:**
Only one test file exists: `/web/src/App.test.tsx`

**Recommendation:**
```typescript
// Example test for IssueToken function
import { IssueToken } from '../functions/IssueToken';
import { HttpRequest } from '@azure/functions';

describe('IssueToken', () => {
  it('should require org_id', async () => {
    const request = new HttpRequest({
      method: 'POST',
      url: 'http://localhost/api/v1/oauth/token',
      body: { stringBody: JSON.stringify({}) }
    });

    const context = { log: jest.fn(), error: jest.fn() } as any;
    const response = await IssueToken(request, context);

    expect(response.status).toBe(400);
    expect(JSON.parse(response.body as string).error).toBe('org_id is required');
  });

  // Add more tests...
});
```

---

### 38. CONSOLE.LOG IN PRODUCTION CODE

**Severity:** LOW
**Risk:** Information disclosure, performance
**Files:** Multiple

**Problem:**
Uses `console.log` instead of proper logging:

```typescript
// /api/src/services/kvkService.ts:35
console.warn('⚠️  KVK_API_KEY not configured - validation will be skipped');
```

**Solution:**
Use context.log() in Azure Functions or Application Insights logger.

---

### 39. MAGIC NUMBERS IN CODE

**Severity:** LOW
**Risk:** Unclear code
**Files:** Multiple

**Problem:**
Magic numbers without explanation:

```typescript
if (file.size > 10 * 1024 * 1024) { // What is this?
```

**Solution:**
```typescript
const MAX_FILE_SIZE_MB = 10;
const MAX_FILE_SIZE_BYTES = MAX_FILE_SIZE_MB * 1024 * 1024;

if (file.size > MAX_FILE_SIZE_BYTES) {
  // ...
}
```

---

### 40. EMPTY CATCH BLOCKS

**Severity:** LOW
**Risk:** Hidden errors
**Files:** Various

**Problem:**
Some error handling is minimal.

**Recommendation:**
Always log errors with context before swallowing them.

---

### 41. NO E2E TESTS

**Severity:** LOW
**Risk:** Integration issues
**Files:** N/A

**Recommendation:**
Implement E2E tests with Playwright or Cypress for critical user flows.

---

### 42. INCONSISTENT HTTP STATUS CODES

**Severity:** LOW
**Risk:** API usability
**Files:** API functions

**Problem:**
Some endpoints use 200 for errors, others use appropriate codes.

**Recommendation:**
Standardize on REST conventions:
- 200 OK - Success
- 201 Created - Resource created
- 400 Bad Request - Invalid input
- 401 Unauthorized - Missing/invalid auth
- 403 Forbidden - Insufficient permissions
- 404 Not Found - Resource not found
- 409 Conflict - Duplicate resource
- 413 Payload Too Large - File size exceeded
- 429 Too Many Requests - Rate limit
- 500 Internal Server Error - Server error

---

## Security Best Practices Analysis

### SQL Injection Protection ✅ GOOD

**Status:** PROTECTED

All database queries use parameterized queries:

```typescript
// Good example from multiple files
await pool.query(
  'SELECT * FROM members WHERE org_id = $1 AND status = $2',
  [body.org_id, 'ACTIVE']
);
```

No string interpolation found in SQL queries. ✅

---

### XSS Protection ✅ GOOD

**Status:** PROTECTED

React's default XSS protection active. No `dangerouslySetInnerHTML` usage found. ✅

---

### Authentication ❌ CRITICAL

**Status:** COMPLETELY MISSING

ALL endpoints accept anonymous requests. IMMEDIATE FIX REQUIRED. ❌

---

### Authorization ❌ CRITICAL

**Status:** MISSING

No role-based access control implemented. Any authenticated user can access any endpoint. ❌

---

### CORS Configuration ❌ CRITICAL

**Status:** INSECURE

Wildcard `*` allows any origin. IMMEDIATE FIX REQUIRED. ❌

---

### Data Encryption

**Status:** PARTIAL

- ✅ HTTPS enforced by Azure Static Web Apps and Functions
- ✅ Database connections use SSL (but certificate validation disabled)
- ❌ Secrets not in Key Vault
- ❌ JWT tokens not encrypted (only signed)

---

### Secrets Management ❌ HIGH RISK

**Status:** EXPOSED

- ❌ Credentials in committed `.env.production` files
- ❌ JWT fallback to weak secret
- ❌ No Key Vault integration

---

## Code Quality Analysis

### TypeScript Usage ✅ GOOD

**Status:** GOOD

TypeScript used throughout. Type definitions exist for most interfaces.

**Improvements Needed:**
- Enable strict mode
- Add type guards for runtime validation
- Remove `any` types

---

### Error Handling ⚠️ NEEDS IMPROVEMENT

**Status:** INCONSISTENT

Error handling exists but varies between functions. Standardization needed.

---

### Code Organization ✅ GOOD

**Status:** GOOD

Clear separation:
- `/api/src/functions/` - Endpoint handlers
- `/api/src/services/` - Business logic
- `/web/src/components/` - React components
- `/database/migrations/` - Schema changes

---

### Testing ❌ CRITICAL GAP

**Status:** ALMOST NONE

Only 1 test file exists. No unit tests, integration tests, or E2E tests.

---

## Aikido Security Scan Results

**Status:** NOT FOUND

No Aikido configuration or scan results found in the repository.

**Recommendation:** Install and configure Aikido:

```bash
# Install Aikido
npm install --save @aikidosec/firewall

# Add to package.json
"aikido": {
  "endpoint": "https://api.aikido.dev",
  "token": "<your-token>"
}

# Run scan
npx aikido scan
```

---

## Infrastructure Security

### Bicep Templates

**Status:** NOT REVIEWED IN DETAIL

Bicep templates exist but were not analyzed in depth. Recommended manual review of:
- `/infrastructure/bicep/main.bicep`
- All module files in `/infrastructure/bicep/modules/`

**Key Areas to Check:**
- Network security groups
- Firewall rules
- Private endpoints
- Key Vault access policies
- Role assignments
- Managed identities

---

## Compliance Considerations

### GDPR Compliance ⚠️

**Issues:**
- No data retention policy
- No user data deletion workflow
- No consent tracking
- Audit logs stored indefinitely

### PCI DSS (if applicable) ❌

**Issues:**
- No encryption at rest for sensitive data
- No network segmentation
- Weak authentication

---

## Performance Considerations

1. Database connection pooling needs optimization (Issue #17)
2. No caching strategy implemented
3. No CDN for static assets mentioned
4. Missing pagination on large datasets (Issue #26)
5. No query optimization or indexes on all frequently used columns

---

## Accessibility (a11y)

**Status:** NOT ASSESSED

Frontend components use Kendo React which includes accessibility features, but no explicit a11y testing was performed.

**Recommendation:**
- Add aria-labels where needed
- Test with screen readers
- Ensure keyboard navigation works
- Run axe or WAVE accessibility checks

---

## Deployment Security

### CI/CD Pipeline

**File:** `/azure-pipelines.yml`

**Recommendations:**
1. Add security scanning to pipeline
2. Run automated tests before deployment
3. Use separate service principals for dev/prod
4. Implement approval gates for production
5. Scan for secrets before commit

---

## Action Plan - Priority Order

### IMMEDIATE (Deploy Blockers) 🚨

1. **Implement Authentication** (Issue #1) - ALL endpoints require this
2. **Remove Wildcard CORS** (Issue #3) - Security hole
3. **Remove Exposed Credentials** (Issue #2) - Rotate all secrets
4. **Fix JWT Secret** (Issue #4) - Configure strong secret
5. **Implement JWT Validation** (Issue #5) - Prevent token forgery
6. **Secure File Upload** (Issue #6) - Add auth to upload endpoint
7. **Enable SSL Certificate Validation** (Issue #7) - Database security

### HIGH PRIORITY (Pre-Production) ⚠️

8. Implement rate limiting (Issue #8)
9. Add input validation (Issue #9)
10. Implement audit logging (Issue #10)
11. Standardize error handling (Issue #11)
12. Backend file size validation (Issue #12)
13. Add dependency scanning (Issue #13)
14. Configure security headers (Issue #14)
15. Move secrets to Key Vault (Issue #18)
16. Secure EventGrid handler (Issue #19)

### MEDIUM PRIORITY (Post-Launch) 📋

17-34. All medium priority issues

### LOW PRIORITY (Technical Debt) 🔧

35-42. All low priority issues

---

## Recommended Tools & Services

### Security
- **Aikido** - Runtime application security
- **Snyk** - Dependency vulnerability scanning
- **OWASP ZAP** - Penetration testing
- **Azure Defender for Cloud** - Cloud security posture
- **SonarQube** - Code quality and security

### Monitoring
- **Azure Application Insights** (already configured)
- **Azure Monitor** - Infrastructure monitoring
- **Grafana** - Metrics visualization
- **Sentry** - Error tracking

### Testing
- **Jest** - Unit testing
- **Playwright** or **Cypress** - E2E testing
- **k6** - Load testing
- **Postman** or **Insomnia** - API testing

---

## Estimated Effort

| Priority | Issues | Estimated Effort |
|----------|--------|------------------|
| IMMEDIATE | 7 | 5-7 days |
| HIGH | 12 | 8-10 days |
| MEDIUM | 15 | 10-12 days |
| LOW | 8 | 5-6 days |
| **TOTAL** | **42** | **28-35 days** |

---

## Conclusion

The ASR application has a solid foundation with good database design, proper SQL injection protection, and clean code organization. However, **it is NOT production-ready** due to critical security issues:

### Showstoppers:
1. **NO AUTHENTICATION** on any API endpoint
2. **CREDENTIALS EXPOSED** in Git repository
3. **WILDCARD CORS** allowing any origin
4. **WEAK JWT SECRET** with fallback to 'demo-secret'
5. **NO JWT VALIDATION** - tokens decoded without verification

### Positive Aspects:
- ✅ Parameterized SQL queries (SQL injection protected)
- ✅ React XSS protection active
- ✅ Good code organization and structure
- ✅ TypeScript usage throughout
- ✅ Comprehensive database schema with proper indexes
- ✅ Multi-language support infrastructure

### Immediate Actions Required:

1. **HALT production deployment** until authentication is implemented
2. **Rotate all exposed credentials** from `.env.production` files
3. **Remove wildcard CORS** and whitelist specific origins
4. **Implement JWT validation** with proper signature verification
5. **Configure strong JWT_SECRET** (min 32 characters)
6. **Add authentication to file upload** endpoint
7. **Enable SSL certificate validation** for database

**Estimated Time to Production-Ready:** 2-3 weeks for critical fixes

---

## Sign-Off

This review was conducted by Claude Code AI Code Reviewer on October 12, 2025.

**Reviewed Components:**
- ✅ 46 API Functions
- ✅ 48 Frontend Components (Admin Portal)
- ✅ 16 Frontend Components (Member Portal)
- ✅ 6 Database Migration Scripts
- ✅ 17 Bicep Infrastructure Templates (high-level)
- ✅ Configuration Files
- ✅ Package Dependencies

**Not Reviewed:**
- Infrastructure Bicep templates (detailed review)
- Azure Portal configuration
- Network security groups
- Azure AD App Registration settings
- Azure Key Vault configuration (doesn't exist yet)

---

**For Questions or Clarifications:**
Contact the development team or refer to this report.

**Next Review:** After critical fixes are implemented
