# Security Analysis Report - Admin Portal
**Date:** October 25, 2025
**Analyst:** Security Analyst (SA) Agent
**Scope:** Admin Portal Authentication, Authorization, and API Security
**Codebase Version:** Latest commit (main branch)

---

## Executive Summary

This security analysis examines the admin portal's authentication, authorization, and API security implementation. The analysis identifies **3 CRITICAL**, **5 HIGH**, **7 MEDIUM**, and **4 LOW** severity findings across authentication, authorization, API security, and configuration management.

**Key Concerns:**
1. **IDOR vulnerabilities** in API clients - no party affiliation validation
2. **Missing authentication** on unauthenticated API calls
3. **MFA bypass** in authentication context (intentional but risky)
4. **Weak CSP policy** allowing 'unsafe-inline' and 'unsafe-eval'
5. **Token exposure** in browser DevTools and logs

---

## Severity Distribution

| Severity | Count | Category |
|----------|-------|----------|
| CRITICAL | 3 | IDOR, Auth Bypass, Token Exposure |
| HIGH | 5 | Authorization, CSP, Input Validation |
| MEDIUM | 7 | Logging, Error Handling, Session Management |
| LOW | 4 | Headers, CORS, Best Practices |
| **TOTAL** | **19** | |

---

## CRITICAL Findings

### [CRITICAL-001] IDOR Vulnerability in API Clients - No Authorization Checks
**File:** `admin-portal/src/services/apiV2.ts:298-368`
**CWE:** CWE-639 (Authorization Bypass Through User-Controlled Key)
**OWASP:** ASVS 4.1.1, OWASP Top 10 2021 A01:2021 - Broken Access Control
**Severity:** Critical

**Description:**
The API client functions directly access legal entities, identifiers, contacts, and endpoints using user-provided IDs without validating party affiliation. This violates Lesson #18 (IDOR vulnerabilities in multi-tenant systems) from LESSONS_LEARNED.md.

**Vulnerable Code:**
```typescript
// apiV2.ts:298-302
async getLegalEntity(legalEntityId: string): Promise<LegalEntity> {
  const axiosInstance = await getAuthenticatedAxios();
  const response = await axiosInstance.get<LegalEntity>(`/legal-entities/${legalEntityId}`);
  return response.data;
}

// apiV2.ts:331-337
async getIdentifiers(legalEntityId: string): Promise<LegalEntityIdentifier[]> {
  const axiosInstance = await getAuthenticatedAxios();
  const response = await axiosInstance.get<{ data: LegalEntityIdentifier[]; pagination: PaginationMetadata }>(
    `/entities/${legalEntityId}/identifiers`
  );
  return response.data.data;
}

// apiV2.ts:382-388
async getContacts(legalEntityId: string): Promise<LegalEntityContact[]> {
  const axiosInstance = await getAuthenticatedAxios();
  const response = await axiosInstance.get<{ data: LegalEntityContact[]; pagination: PaginationMetadata }>(
    `/legal-entities/${legalEntityId}/contacts`
  );
  return response.data.data;
}
```

**Exploitation Scenario:**
1. Association Admin A authenticates and gets legal entity ID for Organization X
2. Admin A modifies request to access `/legal-entities/ORGANIZATION_Y` (different association)
3. API returns Organization Y's data without checking if Admin A has access
4. Admin A can enumerate all entities, contacts, identifiers by incrementing IDs

**Impact:**
- **Confidentiality:** High - Unauthorized access to sensitive business data
- **Authorization Bypass:** Complete - No party affiliation checks
- **Data Leakage:** Legal names, contacts, identifiers, API endpoints, tokens

**Fix:**
Backend API MUST implement party affiliation validation before returning data:

```typescript
// Backend implementation (API layer)
async function getLegalEntity(req, res) {
  const { legalEntityId } = req.params;
  const userPartyId = req.user.partyId; // From JWT claims
  const userRole = req.user.role;

  // Fetch entity
  const entity = await db.query(
    'SELECT * FROM legal_entities WHERE legal_entity_id = $1',
    [legalEntityId]
  );

  if (!entity) {
    // Return 404, not 403, to prevent information disclosure
    return res.status(404).json({ error: 'Legal entity not found' });
  }

  // CRITICAL: Check party affiliation
  if (userRole !== 'SystemAdmin') {
    const hasAccess = await db.query(
      `SELECT 1 FROM party_relationships
       WHERE (source_party_id = $1 OR target_party_id = $1)
       AND (source_party_id = $2 OR target_party_id = $2)`,
      [userPartyId, entity.party_id]
    );

    if (!hasAccess) {
      // Log IDOR attempt
      await auditLog.log({
        action: 'IDOR_ATTEMPT',
        userId: req.user.id,
        targetId: legalEntityId,
        severity: 'CRITICAL',
        security_issue: true
      });

      // Return 404, not 403
      return res.status(404).json({ error: 'Legal entity not found' });
    }
  }

  return res.json(entity);
}
```

**Remediation Steps:**
1. **Backend API:** Implement party affiliation validation on ALL legal entity endpoints
2. **Authorization Middleware:** Create reusable middleware to check party relationships
3. **Audit Logging:** Log all IDOR attempts with `security_issue: true` flag
4. **Frontend Validation:** Add defensive checks (but don't rely on them)
5. **Testing:** Create E2E tests attempting cross-party access

**References:**
- OWASP IDOR: https://owasp.org/www-project-web-security-testing-guide/latest/4-Web_Application_Security_Testing/05-Authorization_Testing/04-Testing_for_Insecure_Direct_Object_References
- CWE-639: https://cwe.mitre.org/data/definitions/639.html
- Lesson #18: docs/LESSONS_LEARNED.md

---

### [CRITICAL-002] Unauthenticated API Calls in EndpointManagement
**File:** `admin-portal/src/components/EndpointManagement.tsx:74-136`
**CWE:** CWE-306 (Missing Authentication for Critical Function)
**OWASP:** ASVS 4.1.1, OWASP Top 10 2021 A01:2021 - Broken Access Control
**Severity:** Critical

**Description:**
The EndpointManagement component makes API calls using native `fetch()` without authentication tokens, allowing unauthorized access to endpoint management functions.

**Vulnerable Code:**
```typescript
// EndpointManagement.tsx:74-84
const loadEndpoints = async () => {
  setLoading(true);
  try {
    const response = await fetch(`${API_BASE}/legal-entities/${legalEntityId}/endpoints`);
    const data = await response.json();
    setEndpoints(data);
  } catch (error) {
    console.error('Error loading endpoints:', error);
  } finally {
    setLoading(false);
  }
};

// EndpointManagement.tsx:87-112
const handleCreateEndpoint = async () => {
  setLoading(true);
  try {
    const response = await fetch(`${API_BASE}/legal-entities/${legalEntityId}/endpoints`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(formData),
    });
    // ... NO Authorization header
  }
};

// EndpointManagement.tsx:114-136
const handleIssueToken = async (endpoint: Endpoint) => {
  setLoading(true);
  try {
    const response = await fetch(
      `${API_BASE}/endpoints/${endpoint.legal_entity_endpoint_id}/tokens`,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({}),
      }
    );
    // ... NO Authorization header
  }
};
```

**Exploitation Scenario:**
1. Attacker opens browser DevTools
2. Copies API endpoint URL from network tab
3. Issues POST requests to create endpoints or tokens without authentication
4. Gains access to endpoint management functions

**Fix:**
```typescript
// EndpointManagement.tsx - Use authenticated axios instance
import { msalInstance } from '../auth/AuthContext';

async function getAccessToken(): Promise<string | null> {
  try {
    const accounts = msalInstance.getAllAccounts();
    if (accounts.length > 0) {
      const clientId = import.meta.env.VITE_AZURE_CLIENT_ID;
      const response = await msalInstance.acquireTokenSilent({
        scopes: [`api://${clientId}/access_as_user`],
        account: accounts[0],
      });
      return response.accessToken;
    }
  } catch (error) {
    console.error('Failed to acquire token:', error);
  }
  return null;
}

const loadEndpoints = async () => {
  setLoading(true);
  try {
    const token = await getAccessToken();
    if (!token) {
      notification.showError('Authentication required');
      return;
    }

    const response = await fetch(`${API_BASE}/legal-entities/${legalEntityId}/endpoints`, {
      headers: {
        'Authorization': `Bearer ${token}`
      }
    });

    if (!response.ok) {
      throw new Error(`HTTP ${response.status}`);
    }

    const data = await response.json();
    setEndpoints(data);
  } catch (error) {
    console.error('Error loading endpoints:', error);
    notification.showError('Failed to load endpoints');
  } finally {
    setLoading(false);
  }
};
```

**Remediation Steps:**
1. Replace all `fetch()` calls with authenticated axios instances
2. Add error handling for 401/403 responses
3. Implement token refresh logic for expired tokens
4. Add authorization checks in backend API
5. Test with expired tokens and invalid credentials

**References:**
- OWASP Authentication Cheat Sheet: https://cheatsheetseries.owasp.org/cheatsheets/Authentication_Cheat_Sheet.html
- CWE-306: https://cwe.mitre.org/data/definitions/306.html

---

### [CRITICAL-003] MFA Bypass in Production Environment
**File:** `admin-portal/src/auth/AuthContext.tsx:82-84`
**CWE:** CWE-306 (Missing Authentication for Critical Function)
**OWASP:** ASVS 2.1.1, OWASP Top 10 2021 A07:2021 - Identification and Authentication Failures
**Severity:** Critical

**Description:**
The authentication context bypasses MFA validation with a hardcoded `true` value, allowing users to authenticate without multi-factor authentication. While marked as "TODO" for Conditional Access policy enforcement, this creates a critical security gap in production.

**Vulnerable Code:**
```typescript
// AuthContext.tsx:82-84
// Check MFA status from claims
// TODO: Re-enable strict MFA checking once Conditional Access policy is fully enforced
const mfaEnabled = true; // Temporarily bypassed - idTokenClaims?.amr?.includes('mfa') || false;
console.log('MFA enabled:', mfaEnabled, '(bypassed until CA policy active)');
```

**Exploitation Scenario:**
1. Attacker compromises user credentials (password only)
2. Logs in to admin portal without MFA challenge
3. Gains full access to association management functions
4. Can view/modify legal entities, issue tokens, manage members

**Fix:**
```typescript
// AuthContext.tsx:82-84 - Re-enable MFA validation
// Check MFA status from claims
const amrClaims = idTokenClaims?.amr as string[] | undefined;
const mfaEnabled = amrClaims?.includes('mfa') || false;

// CRITICAL: Enforce MFA for production
if (process.env.NODE_ENV === 'production' && !mfaEnabled) {
  console.error('MFA required but not enabled for user:', account.username);
  setUser(null);
  return;
}

console.log('MFA enabled:', mfaEnabled, 'Environment:', process.env.NODE_ENV);
```

**Backend Enforcement (Defense in Depth):**
```typescript
// API middleware - verify MFA claim in JWT
function requireMFA(req, res, next) {
  const amr = req.user?.amr || [];

  if (!amr.includes('mfa')) {
    return res.status(403).json({
      error: 'Multi-factor authentication required',
      code: 'MFA_REQUIRED'
    });
  }

  next();
}

// Apply to all protected routes
app.use('/api/v1/*', authenticateJWT, requireMFA);
```

**Remediation Steps:**
1. **Immediate:** Enable Azure AD Conditional Access policy requiring MFA
2. **Code Fix:** Re-enable MFA validation in AuthContext.tsx
3. **Backend Enforcement:** Add MFA claim validation to API middleware
4. **Testing:** Verify users without MFA are blocked
5. **Monitoring:** Alert on MFA bypass attempts

**References:**
- NIST SP 800-63B: https://pages.nist.gov/800-63-3/sp800-63b.html
- Azure AD MFA: https://learn.microsoft.com/en-us/azure/active-directory/authentication/concept-mfa-howitworks
- CWE-306: https://cwe.mitre.org/data/definitions/306.html

---

## HIGH Severity Findings

### [HIGH-001] Weak Content Security Policy (CSP)
**File:** `admin-portal/public/staticwebapp.config.json:24`
**CWE:** CWE-1021 (Improper Restriction of Rendered UI Layers or Frames)
**OWASP:** ASVS 1.14.1, OWASP Top 10 2021 A03:2021 - Injection
**Severity:** High

**Description:**
The CSP allows `'unsafe-inline'` and `'unsafe-eval'` in `script-src`, which defeats the primary purpose of CSP and enables XSS attacks.

**Vulnerable Code:**
```json
"Content-Security-Policy": "default-src 'self'; script-src 'self' 'unsafe-inline' 'unsafe-eval'; style-src 'self' 'unsafe-inline' https://unpkg.com; img-src 'self' data: https:; font-src 'self' data: https://unpkg.com; connect-src 'self' https://func-ctn-demo-asr-dev.azurewebsites.net https://login.microsoftonline.com https://graph.microsoft.com; frame-ancestors 'none'"
```

**Exploitation Scenario:**
1. XSS vulnerability exists in any React component
2. Attacker injects `<script>alert(document.cookie)</script>`
3. CSP allows inline scripts due to `'unsafe-inline'`
4. Script executes, steals session tokens from sessionStorage

**Fix:**
```json
{
  "globalHeaders": {
    "Content-Security-Policy": "default-src 'self'; script-src 'self' 'nonce-{RANDOM}'; style-src 'self' 'nonce-{RANDOM}' https://unpkg.com; img-src 'self' data: https:; font-src 'self' data: https://unpkg.com; connect-src 'self' https://func-ctn-demo-asr-dev.azurewebsites.net https://login.microsoftonline.com https://graph.microsoft.com; frame-ancestors 'none'; base-uri 'self'; form-action 'self'; upgrade-insecure-requests; block-all-mixed-content; report-uri /api/csp-report"
  }
}
```

**Implementation with Nonce:**
```typescript
// Vite plugin to inject CSP nonce
// vite.config.ts
import { defineConfig } from 'vite';

export default defineConfig({
  plugins: [
    {
      name: 'csp-nonce',
      transformIndexHtml(html) {
        const nonce = crypto.randomBytes(16).toString('base64');
        return html
          .replace(/<script/g, `<script nonce="${nonce}"`)
          .replace(/<style/g, `<style nonce="${nonce}"`);
      }
    }
  ]
});
```

**Remediation Steps:**
1. Remove `'unsafe-inline'` and `'unsafe-eval'` from CSP
2. Implement nonce-based CSP for inline scripts/styles
3. Configure CSP reporting endpoint to monitor violations
4. Test with browser DevTools CSP violation reports
5. Gradually tighten policy (use `Content-Security-Policy-Report-Only` first)

**References:**
- CSP Level 3: https://www.w3.org/TR/CSP3/
- OWASP CSP Cheat Sheet: https://cheatsheetseries.owasp.org/cheatsheets/Content_Security_Policy_Cheat_Sheet.html
- CWE-1021: https://cwe.mitre.org/data/definitions/1021.html

---

### [HIGH-002] Session Token Storage in sessionStorage (XSS Risk)
**File:** `admin-portal/src/auth/authConfig.ts:26`
**CWE:** CWE-922 (Insecure Storage of Sensitive Information)
**OWASP:** ASVS 3.2.1, OWASP Top 10 2021 A01:2021 - Broken Access Control
**Severity:** High

**Description:**
Authentication tokens are stored in `sessionStorage`, which is accessible via JavaScript. If an XSS vulnerability exists, attackers can steal tokens and impersonate users.

**Vulnerable Code:**
```typescript
// authConfig.ts:25-28
cache: {
  cacheLocation: 'sessionStorage', // Use sessionStorage for security
  storeAuthStateInCookie: false, // Set to true for IE11/Edge
},
```

**Exploitation Scenario:**
1. XSS vulnerability allows attacker to execute JavaScript
2. Attacker runs: `sessionStorage.getItem('msal.token.keys.bcc3ddce-6891-42aa-91f6-99d85b02bb7d')`
3. Attacker extracts access token and refresh token
4. Attacker uses tokens to make authenticated API requests
5. Session hijacking successful, no MFA re-challenge required

**Fix:**
While `sessionStorage` is more secure than `localStorage` (cleared on tab close), httpOnly cookies are preferred:

```typescript
// authConfig.ts - Use memory-only token cache
cache: {
  cacheLocation: 'memory', // Tokens stored in memory, not accessible via JS
  storeAuthStateInCookie: true, // Use httpOnly cookies for token state
},
```

**Backend Cookie-Based Auth (Alternative):**
```typescript
// API endpoint to exchange MSAL token for httpOnly cookie
app.post('/api/auth/exchange', async (req, res) => {
  const { accessToken } = req.body;

  // Verify MSAL token
  const verified = await verifyAzureADToken(accessToken);
  if (!verified) {
    return res.status(401).json({ error: 'Invalid token' });
  }

  // Set httpOnly cookie
  res.cookie('session', verified.sessionId, {
    httpOnly: true,
    secure: true,
    sameSite: 'strict',
    maxAge: 3600000 // 1 hour
  });

  res.json({ success: true });
});
```

**Remediation Steps:**
1. Change `cacheLocation` to `'memory'` for in-memory token storage
2. Enable `storeAuthStateInCookie: true` for cross-tab persistence
3. Implement token refresh logic (tokens lost on page reload with memory cache)
4. Add CSP to prevent XSS (defense in depth)
5. Monitor session hijacking attempts in audit logs

**References:**
- OWASP Session Management: https://cheatsheetseries.owasp.org/cheatsheets/Session_Management_Cheat_Sheet.html
- MSAL.js Token Cache: https://github.com/AzureAD/microsoft-authentication-library-for-js/blob/dev/lib/msal-browser/docs/token-lifetimes.md
- CWE-922: https://cwe.mitre.org/data/definitions/922.html

---

### [HIGH-003] No Input Validation on Identifier Values
**File:** `admin-portal/src/components/IdentifiersManager.tsx:400-476`
**CWE:** CWE-20 (Improper Input Validation)
**OWASP:** ASVS 5.1.1, OWASP Top 10 2021 A03:2021 - Injection
**Severity:** High

**Description:**
While frontend regex validation exists (lines 268-296), the API call at line 436-447 submits identifier data without backend validation. Attackers can bypass frontend validation via API calls.

**Vulnerable Code:**
```typescript
// IdentifiersManager.tsx:436-447
// Add new identifier
const newIdentifier = await apiV2.addIdentifier({
  legal_entity_id: legalEntityId,
  identifier_type: formData.identifier_type as LegalEntityIdentifier['identifier_type'],
  identifier_value: formData.identifier_value!, // NO backend validation
  country_code: formData.country_code,
  registry_name: formData.registry_name,
  registry_url: formData.registry_url,
  validation_status: formData.validation_status as LegalEntityIdentifier['validation_status'],
  validation_date: formData.validation_date,
  verification_notes: formData.verification_notes,
});
```

**Exploitation Scenario:**
1. Attacker intercepts API request in browser DevTools
2. Modifies `identifier_value` to SQL injection payload: `'; DROP TABLE legal_entity_identifiers; --`
3. Backend API inserts malicious value without validation
4. If parameterized queries not used, SQL injection executes

**Fix (Backend API):**
```typescript
// Backend API - /api/v1/entities/:id/identifiers
import Joi from 'joi';

const identifierSchema = Joi.object({
  identifier_type: Joi.string().valid('LEI', 'KVK', 'EORI', 'VAT', 'DUNS', 'EUID', 'HRB', 'HRA', 'KBO', 'SIREN', 'SIRET', 'CRN', 'OTHER').required(),
  identifier_value: Joi.string().max(50).pattern(/^[A-Z0-9.\-\s]+$/i).required(),
  country_code: Joi.string().length(2).pattern(/^[A-Z]{2}$/i).required(),
  registry_name: Joi.string().max(200).optional(),
  registry_url: Joi.string().uri().max(500).optional(),
  validation_status: Joi.string().valid('PENDING', 'VALIDATED', 'FAILED', 'EXPIRED').optional(),
  verification_notes: Joi.string().max(1000).optional()
});

async function addIdentifier(req, res) {
  // Validate input
  const { error, value } = identifierSchema.validate(req.body);
  if (error) {
    return res.status(400).json({
      error: 'Invalid input',
      details: error.details
    });
  }

  // Type-specific validation
  const typeValidation = {
    'KVK': /^\d{8}$/,
    'LEI': /^[A-Z0-9]{20}$/,
    'EORI': /^[A-Z]{2}[A-Z0-9]{1,15}$/,
    // ... other types
  };

  if (typeValidation[value.identifier_type] &&
      !typeValidation[value.identifier_type].test(value.identifier_value)) {
    return res.status(400).json({
      error: `Invalid ${value.identifier_type} format`
    });
  }

  // Parameterized query (NO SQL injection possible)
  const result = await db.query(
    `INSERT INTO legal_entity_identifiers
     (legal_entity_id, identifier_type, identifier_value, country_code, registry_name, registry_url)
     VALUES ($1, $2, $3, $4, $5, $6)
     RETURNING *`,
    [req.params.legalEntityId, value.identifier_type, value.identifier_value,
     value.country_code, value.registry_name, value.registry_url]
  );

  return res.json(result.rows[0]);
}
```

**Remediation Steps:**
1. **Backend API:** Add Joi schema validation for all inputs
2. **SQL Queries:** Verify ALL queries use parameterized statements
3. **Type Validation:** Enforce regex patterns on backend
4. **Length Limits:** Apply max length constraints
5. **Testing:** Attempt SQL injection, XSS payloads in identifier fields

**References:**
- OWASP Input Validation: https://cheatsheetseries.owasp.org/cheatsheets/Input_Validation_Cheat_Sheet.html
- Joi Validation: https://joi.dev/api/
- CWE-20: https://cwe.mitre.org/data/definitions/20.html

---

### [HIGH-004] Hardcoded Production API URL in Default Fallback
**File:** `admin-portal/src/services/apiClient.ts:46`
**CWE:** CWE-547 (Use of Hard-coded, Security-relevant Constants)
**OWASP:** ASVS 14.1.1
**Severity:** High

**Description:**
The API client falls back to a hardcoded production URL if `VITE_API_URL` is not set, exposing production endpoints in development/test environments.

**Vulnerable Code:**
```typescript
// apiClient.ts:46
baseURL: import.meta.env.VITE_API_URL || 'https://func-ctn-demo-asr-dev.azurewebsites.net/api/v1',
```

**Exploitation Scenario:**
1. Developer runs app locally without setting `VITE_API_URL`
2. App connects to production API by default
3. Developer tests data creation/modification
4. Production data corrupted or sensitive data leaked to logs

**Fix:**
```typescript
// apiClient.ts:46 - Fail fast if API URL not configured
const API_URL = import.meta.env.VITE_API_URL;

if (!API_URL) {
  throw new Error(
    'VITE_API_URL environment variable not set. ' +
    'Please configure it in .env file. ' +
    'See .env.example for reference.'
  );
}

export const apiClient = new AsrApiClient({
  baseURL: API_URL,
  timeout: 30000,
  retryAttempts: 3,
  getAccessToken,
  onError: handleApiError
});
```

**Environment Validation (vite.config.ts):**
```typescript
// vite.config.ts - Validate required env vars at build time
export default defineConfig({
  plugins: [
    {
      name: 'validate-env',
      config() {
        const required = [
          'VITE_API_URL',
          'VITE_AZURE_CLIENT_ID',
          'VITE_AZURE_TENANT_ID',
          'VITE_REDIRECT_URI'
        ];

        const missing = required.filter(key => !process.env[key]);

        if (missing.length > 0) {
          throw new Error(
            `Missing required environment variables:\n${missing.join('\n')}\n\n` +
            `Please configure them in .env file. See .env.example for reference.`
          );
        }
      }
    }
  ]
});
```

**Remediation Steps:**
1. Remove hardcoded production URLs from all API clients
2. Throw errors if required env vars missing
3. Add startup validation for all required environment variables
4. Update `.env.example` with clear documentation
5. Add validation to CI/CD pipeline

**References:**
- Twelve-Factor App: https://12factor.net/config
- CWE-547: https://cwe.mitre.org/data/definitions/547.html

---

### [HIGH-005] Token Value Displayed in Plain Text in UI
**File:** `admin-portal/src/components/EndpointManagement.tsx:264-276`
**CWE:** CWE-319 (Cleartext Transmission of Sensitive Information)
**OWASP:** ASVS 6.2.1, OWASP Top 10 2021 A02:2021 - Cryptographic Failures
**Severity:** High

**Description:**
The EndpointManagement component displays full token values in plain text in the UI, making them visible to anyone with screen access or screen-sharing sessions.

**Vulnerable Code:**
```typescript
// EndpointManagement.tsx:264-276
<div className="token-display">
  <p className="success-message">
    ✅ New token issued for <strong>{selectedEndpoint.endpoint_name}</strong>
  </p>

  <div className="token-info">
    <label>Token Value:</label>
    <div className="token-value-container">
      <code className="token-value">{newToken.token_value}</code>  {/* EXPOSED */}
      <Button size="small" onClick={() => copyToClipboard(newToken.token_value)}>
        Copy
      </Button>
    </div>
  </div>
```

**Exploitation Scenario:**
1. Admin generates token for endpoint
2. Token displayed in full on screen
3. User shares screen in video call
4. Attacker in call screenshots token value
5. Attacker uses token to access API endpoints

**Fix:**
```typescript
// EndpointManagement.tsx - Mask token display
const [showFullToken, setShowFullToken] = useState(false);

const maskToken = (token: string) => {
  if (showFullToken) return token;
  return token.substring(0, 8) + '...' + token.substring(token.length - 8);
};

// In render:
<div className="token-info">
  <label>Token Value:</label>
  <div className="token-value-container">
    <code className="token-value">{maskToken(newToken.token_value)}</code>
    <Button
      size="small"
      onClick={() => setShowFullToken(!showFullToken)}
      fillMode="flat"
    >
      {showFullToken ? 'Hide' : 'Show'}
    </Button>
    <Button size="small" onClick={() => copyToClipboard(newToken.token_value)}>
      Copy
    </Button>
  </div>
  <span className="warning-text">
    ⚠️ Token will only be shown once. Copy and store securely.
  </span>
</div>
```

**Remediation Steps:**
1. Mask token values by default (show first/last 8 chars)
2. Add "Show/Hide" toggle for full token display
3. Auto-hide token after 60 seconds
4. Add warning about token visibility
5. Implement token download as encrypted file option

**References:**
- OWASP Credential Management: https://cheatsheetseries.owasp.org/cheatsheets/Credential_Storage_Cheat_Sheet.html
- CWE-319: https://cwe.mitre.org/data/definitions/319.html

---

## MEDIUM Severity Findings

### [MEDIUM-001] Console Logging of Sensitive Authentication Data
**File:** `admin-portal/src/auth/AuthContext.tsx:67-111`
**CWE:** CWE-532 (Insertion of Sensitive Information into Log File)
**OWASP:** ASVS 7.1.1
**Severity:** Medium

**Description:**
The authentication context logs sensitive user data to browser console, including ID token claims, roles, and MFA status. These logs are accessible via browser DevTools and may be captured by error tracking tools.

**Vulnerable Code:**
```typescript
// AuthContext.tsx:67-111
console.log('Loading user roles for account:', account);
console.log('ID Token Claims:', idTokenClaims);  // Sensitive data
console.log('Extracted roles:', roles);
console.log('MFA enabled:', mfaEnabled, '(bypassed until CA policy active)');
console.log('Primary role:', primaryRole);
console.log('User loaded successfully');
```

**Fix:**
```typescript
// Create secure logger utility
// utils/logger.ts
const isDevelopment = process.env.NODE_ENV === 'development';

export const secureLog = {
  debug: (message: string, data?: any) => {
    if (isDevelopment) {
      console.debug(message, data);
    }
  },

  info: (message: string) => {
    console.info(message);
  },

  error: (message: string, error?: Error) => {
    console.error(message, error?.message);
    // Send to monitoring (without sensitive data)
  },

  // NEVER log sensitive data in production
  sensitive: (message: string, data?: any) => {
    if (isDevelopment) {
      console.debug(`[SENSITIVE] ${message}`, data);
    }
  }
};

// AuthContext.tsx - Use secure logging
import { secureLog } from '../utils/logger';

const loadUserRoles = async (account: AccountInfo) => {
  try {
    secureLog.debug('Loading user roles');

    const idTokenClaims = (account.idTokenClaims || {}) as IdTokenClaims;
    secureLog.sensitive('ID Token Claims', idTokenClaims);  // Only in dev

    const roles = (idTokenClaims?.roles || []) as UserRole[];
    secureLog.debug('User has roles', { count: roles.length });  // Don't log actual roles

    secureLog.info('User authentication successful');
  } catch (error) {
    secureLog.error('Error loading user roles', error);
    setUser(null);
  }
};
```

**Remediation Steps:**
1. Create secure logging utility that respects environment
2. Remove sensitive data from console.log in production
3. Configure error tracking tools to filter PII
4. Add ESLint rule to prevent console.log in production code
5. Review all console.log statements for sensitive data

**References:**
- OWASP Logging Cheat Sheet: https://cheatsheetseries.owasp.org/cheatsheets/Logging_Cheat_Sheet.html
- CWE-532: https://cwe.mitre.org/data/definitions/532.html

---

### [MEDIUM-002] Error Messages Expose System Information
**File:** `admin-portal/src/components/IdentifiersManager.tsx:464-474`
**CWE:** CWE-209 (Generation of Error Message Containing Sensitive Information)
**OWASP:** ASVS 7.4.1
**Severity:** Medium

**Description:**
Error handlers display backend error messages directly to users, potentially exposing database schemas, file paths, or internal system details.

**Vulnerable Code:**
```typescript
// IdentifiersManager.tsx:464-474
catch (error: any) {
  console.error('Failed to save identifier:', error);

  // Show specific error message from API if available
  if (error.response?.status === 409) {
    const errorMsg = error.response?.data?.error || 'This identifier already exists for this entity';
    notification.showError(errorMsg);  // May expose internal details
  } else if (error.response?.data?.error) {
    notification.showError(error.response.data.error);  // Direct backend message
  } else {
    notification.showError('Failed to save identifier');
  }
}
```

**Fix:**
```typescript
// utils/errorHandler.ts
export function getSafeErrorMessage(error: any): string {
  // Map of safe user-facing messages
  const safeMessages: Record<number, string> = {
    400: 'Invalid input. Please check your data and try again.',
    401: 'Authentication required. Please log in.',
    403: 'You do not have permission to perform this action.',
    404: 'The requested resource was not found.',
    409: 'This identifier already exists for this entity.',
    422: 'Invalid data format. Please check your input.',
    500: 'An unexpected error occurred. Please try again later.',
    503: 'Service temporarily unavailable. Please try again later.'
  };

  const status = error.response?.status;

  // Log full error for debugging (server-side only in production)
  if (process.env.NODE_ENV === 'development') {
    console.error('Full error:', error.response?.data);
  }

  // Return safe message
  return safeMessages[status] || 'An error occurred. Please contact support.';
}

// IdentifiersManager.tsx:464-474
catch (error: any) {
  const userMessage = getSafeErrorMessage(error);
  notification.showError(userMessage);

  // Log detailed error for debugging (development only)
  if (process.env.NODE_ENV === 'development') {
    console.error('Failed to save identifier:', error);
  }
}
```

**Remediation Steps:**
1. Create error mapping utility for safe user messages
2. Never display raw API error messages to users
3. Log detailed errors server-side for debugging
4. Implement error tracking (Application Insights, Sentry)
5. Review all error handlers for information disclosure

**References:**
- OWASP Error Handling: https://cheatsheetseries.owasp.org/cheatsheets/Error_Handling_Cheat_Sheet.html
- CWE-209: https://cwe.mitre.org/data/definitions/209.html

---

### [MEDIUM-003] No Session Timeout Mechanism
**File:** `admin-portal/src/auth/AuthContext.tsx` (missing timeout logic)
**CWE:** CWE-613 (Insufficient Session Expiration)
**OWASP:** ASVS 3.3.1, OWASP Top 10 2021 A07:2021 - Identification and Authentication Failures
**Severity:** Medium

**Description:**
The authentication context does not implement inactivity timeout. User sessions remain active indefinitely until manual logout or token expiration (potentially hours), creating risk of session hijacking on shared/public computers.

**Fix:**
```typescript
// hooks/useSessionTimeout.ts
import { useEffect, useRef } from 'react';
import { useAuth } from '../auth/AuthContext';

const INACTIVITY_TIMEOUT = 15 * 60 * 1000; // 15 minutes
const WARNING_TIMEOUT = 13 * 60 * 1000; // Show warning at 13 minutes

export function useSessionTimeout(onWarning: () => void, onTimeout: () => void) {
  const { isAuthenticated, logout } = useAuth();
  const timeoutRef = useRef<NodeJS.Timeout>();
  const warningRef = useRef<NodeJS.Timeout>();

  const resetTimer = () => {
    // Clear existing timers
    if (timeoutRef.current) clearTimeout(timeoutRef.current);
    if (warningRef.current) clearTimeout(warningRef.current);

    if (!isAuthenticated) return;

    // Set warning timer
    warningRef.current = setTimeout(() => {
      onWarning();
    }, WARNING_TIMEOUT);

    // Set logout timer
    timeoutRef.current = setTimeout(async () => {
      await logout();
      onTimeout();
    }, INACTIVITY_TIMEOUT);
  };

  useEffect(() => {
    if (!isAuthenticated) return;

    // Track user activity
    const events = ['mousedown', 'keydown', 'scroll', 'touchstart'];
    events.forEach(event => {
      document.addEventListener(event, resetTimer);
    });

    // Initial timer
    resetTimer();

    return () => {
      events.forEach(event => {
        document.removeEventListener(event, resetTimer);
      });
      if (timeoutRef.current) clearTimeout(timeoutRef.current);
      if (warningRef.current) clearTimeout(warningRef.current);
    };
  }, [isAuthenticated]);
}

// AdminPortal.tsx - Implement timeout
import { useSessionTimeout } from '../hooks/useSessionTimeout';

const AdminPortal: React.FC = () => {
  const [showTimeoutWarning, setShowTimeoutWarning] = useState(false);

  useSessionTimeout(
    () => setShowTimeoutWarning(true),
    () => notification.showWarning('Session expired due to inactivity')
  );

  return (
    <>
      {showTimeoutWarning && (
        <Dialog title="Session Timeout Warning">
          <p>Your session will expire in 2 minutes due to inactivity.</p>
          <Button onClick={() => setShowTimeoutWarning(false)}>
            Continue Session
          </Button>
        </Dialog>
      )}
      {/* ... rest of component */}
    </>
  );
};
```

**Remediation Steps:**
1. Implement inactivity timeout hook (15 minutes recommended)
2. Show warning dialog at 13 minutes
3. Auto-logout at 15 minutes
4. Reset timer on user activity
5. Allow users to configure timeout in settings

**References:**
- OWASP Session Management: https://cheatsheetseries.owasp.org/cheatsheets/Session_Management_Cheat_Sheet.html
- CWE-613: https://cwe.mitre.org/data/definitions/613.html

---

### [MEDIUM-004] Missing CSRF Protection on State-Changing Operations
**File:** `admin-portal/src/services/apiV2.ts` (all POST/PUT/DELETE requests)
**CWE:** CWE-352 (Cross-Site Request Forgery)
**OWASP:** ASVS 4.2.2, OWASP Top 10 2021 A01:2021 - Broken Access Control
**Severity:** Medium

**Description:**
While using Azure AD tokens provides some CSRF protection, explicit CSRF tokens should be used for state-changing operations (POST/PUT/DELETE) to prevent CSRF attacks.

**Fix:**
```typescript
// Backend API - CSRF middleware
import csrf from 'csurf';

const csrfProtection = csrf({
  cookie: {
    httpOnly: true,
    secure: true,
    sameSite: 'strict'
  }
});

// Apply to all state-changing routes
app.post('/api/v1/*', csrfProtection);
app.put('/api/v1/*', csrfProtection);
app.delete('/api/v1/*', csrfProtection);

// Endpoint to get CSRF token
app.get('/api/v1/csrf-token', csrfProtection, (req, res) => {
  res.json({ csrfToken: req.csrfToken() });
});

// Frontend - Get and include CSRF token
// apiV2.ts
let csrfToken: string | null = null;

async function getCsrfToken(): Promise<string> {
  if (csrfToken) return csrfToken;

  const axiosInstance = await getAuthenticatedAxios();
  const response = await axiosInstance.get('/csrf-token');
  csrfToken = response.data.csrfToken;
  return csrfToken;
}

async function getAuthenticatedAxios() {
  const token = await getAccessToken();
  const csrf = await getCsrfToken();

  return axios.create({
    baseURL: API_BASE_URL,
    headers: {
      Authorization: token ? `Bearer ${token}` : '',
      'X-CSRF-Token': csrf
    }
  });
}
```

**Remediation Steps:**
1. Implement CSRF token generation on backend
2. Add CSRF token to all state-changing requests
3. Validate CSRF token on backend
4. Use SameSite=Strict cookies
5. Test CSRF attacks with automated tools

**References:**
- OWASP CSRF Prevention: https://cheatsheetseries.owasp.org/cheatsheets/Cross-Site_Request_Forgery_Prevention_Cheat_Sheet.html
- CWE-352: https://cwe.mitre.org/data/definitions/352.html

---

### [MEDIUM-005] Insufficient Rate Limiting on API Endpoints
**File:** Backend API (not implemented)
**CWE:** CWE-770 (Allocation of Resources Without Limits or Throttling)
**OWASP:** ASVS 4.3.1
**Severity:** Medium

**Description:**
No rate limiting implemented on API endpoints, allowing attackers to perform brute-force attacks, data scraping, or denial-of-service attacks.

**Fix:**
```typescript
// Backend API - Rate limiting middleware
import rateLimit from 'express-rate-limit';
import RedisStore from 'rate-limit-redis';
import { createClient } from 'redis';

const redisClient = createClient({
  url: process.env.REDIS_URL
});

// General API rate limit
const apiLimiter = rateLimit({
  store: new RedisStore({
    client: redisClient,
    prefix: 'rate_limit:'
  }),
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 100, // Limit each IP to 100 requests per windowMs
  message: 'Too many requests from this IP, please try again later.',
  standardHeaders: true,
  legacyHeaders: false,
});

// Stricter limit for authentication
const authLimiter = rateLimit({
  store: new RedisStore({ client: redisClient }),
  windowMs: 15 * 60 * 1000,
  max: 5, // 5 login attempts per 15 minutes
  skipSuccessfulRequests: true,
  message: 'Too many login attempts, please try again later.'
});

// Apply limiters
app.use('/api/v1/', apiLimiter);
app.use('/api/v1/auth/', authLimiter);

// Per-user rate limiting (after authentication)
const userLimiter = rateLimit({
  store: new RedisStore({ client: redisClient }),
  windowMs: 60 * 1000, // 1 minute
  max: 30, // 30 requests per minute per user
  keyGenerator: (req) => req.user?.id || req.ip
});

app.use('/api/v1/entities/', authenticateJWT, userLimiter);
```

**Remediation Steps:**
1. Implement Redis-based rate limiting
2. Set different limits for auth vs. general API
3. Add per-user rate limits after authentication
4. Return 429 status with Retry-After header
5. Monitor rate limit violations in logs

**References:**
- OWASP API Security: https://owasp.org/API-Security/editions/2023/en/0xa4-unrestricted-resource-consumption/
- CWE-770: https://cwe.mitre.org/data/definitions/770.html

---

### [MEDIUM-006] Missing Secure Headers (X-Content-Type-Options)
**File:** `admin-portal/public/staticwebapp.config.json:19`
**CWE:** CWE-693 (Protection Mechanism Failure)
**OWASP:** ASVS 1.14.4
**Severity:** Medium

**Description:**
While `X-Content-Type-Options: nosniff` is present, other security headers like `Permissions-Policy` could be strengthened, and `X-XSS-Protection` is deprecated.

**Current Headers:**
```json
"globalHeaders": {
  "X-Content-Type-Options": "nosniff",
  "X-Frame-Options": "DENY",
  "X-XSS-Protection": "1; mode=block",  // DEPRECATED
  "Referrer-Policy": "strict-origin-when-cross-origin",
  "Permissions-Policy": "camera=(), microphone=(), geolocation=()",
  "Content-Security-Policy": "...",
  "Strict-Transport-Security": "max-age=31536000; includeSubDomains; preload"
}
```

**Fix:**
```json
{
  "globalHeaders": {
    "X-Content-Type-Options": "nosniff",
    "X-Frame-Options": "DENY",
    "Referrer-Policy": "strict-origin-when-cross-origin",
    "Permissions-Policy": "accelerometer=(), autoplay=(), camera=(), cross-origin-isolated=(), display-capture=(), encrypted-media=(), fullscreen=(), geolocation=(), gyroscope=(), keyboard-map=(), magnetometer=(), microphone=(), midi=(), payment=(), picture-in-picture=(), publickey-credentials-get=(), screen-wake-lock=(), sync-xhr=(), usb=(), web-share=(), xr-spatial-tracking=()",
    "Content-Security-Policy": "...",
    "Strict-Transport-Security": "max-age=31536000; includeSubDomains; preload",
    "Cross-Origin-Embedder-Policy": "require-corp",
    "Cross-Origin-Opener-Policy": "same-origin",
    "Cross-Origin-Resource-Policy": "same-origin"
  }
}
```

**Remediation Steps:**
1. Remove deprecated `X-XSS-Protection` header
2. Strengthen `Permissions-Policy` to deny all unnecessary features
3. Add COOP, COEP, CORP headers
4. Test headers with securityheaders.com
5. Monitor CSP violations

**References:**
- OWASP Secure Headers: https://owasp.org/www-project-secure-headers/
- Security Headers Best Practices: https://securityheaders.com/

---

### [MEDIUM-007] Bulk Operations Without Transaction Support
**File:** `admin-portal/src/components/MembersGrid.tsx:290-345`
**CWE:** CWE-362 (Concurrent Execution using Shared Resource with Improper Synchronization)
**OWASP:** ASVS 5.4.1
**Severity:** Medium

**Description:**
Bulk operations execute individual API calls without transaction support. If operation fails midway, partial changes remain applied without rollback capability.

**Vulnerable Code:**
```typescript
// MembersGrid.tsx:313-322
case 'token': {
  const tokenResult = await performBulkOperation(selectedIds, 'token', async (id) => {
    await onIssueToken(id);  // Individual API call, no transaction
    return Promise.resolve();
  });
  // If fails at record 50/100, first 49 tokens are issued without rollback
}
```

**Fix:**
```typescript
// Backend API - Bulk token issuance with transaction
app.post('/api/v1/bulk/tokens/issue', async (req, res) => {
  const { orgIds } = req.body;
  const client = await db.getClient();

  try {
    await client.query('BEGIN');

    const tokens = [];
    for (const orgId of orgIds) {
      // Verify access
      const hasAccess = await verifyAccess(req.user, orgId);
      if (!hasAccess) {
        throw new Error(`Access denied for ${orgId}`);
      }

      // Generate token
      const token = await generateToken(orgId);
      tokens.push(token);
    }

    await client.query('COMMIT');
    res.json({ success: true, tokens });

  } catch (error) {
    await client.query('ROLLBACK');
    res.status(500).json({ error: 'Bulk operation failed, rolled back' });
  } finally {
    client.release();
  }
});

// Frontend - Use bulk endpoint
case 'token': {
  try {
    const response = await apiV2.bulkIssueTokens(selectedIds);
    notification.showSuccess(`Issued ${response.tokens.length} tokens`);
  } catch (error) {
    notification.showError('Token issuance failed, no changes made');
  }
}
```

**Remediation Steps:**
1. Implement bulk operation endpoints on backend
2. Use database transactions for atomic operations
3. Add rollback capability for failed operations
4. Validate all items before starting operation
5. Return detailed success/failure report

**References:**
- ACID Transactions: https://en.wikipedia.org/wiki/ACID
- CWE-362: https://cwe.mitre.org/data/definitions/362.html

---

## LOW Severity Findings

### [LOW-001] Missing Subresource Integrity (SRI) for CDN Resources
**File:** `admin-portal/index.html` (if CDN resources used)
**CWE:** CWE-353 (Missing Support for Integrity Check)
**OWASP:** ASVS 14.2.3
**Severity:** Low

**Description:**
External resources loaded from unpkg.com CDN (fonts, styles) lack Subresource Integrity (SRI) hashes, allowing CDN compromise to inject malicious code.

**Fix:**
```html
<!-- With SRI -->
<link
  rel="stylesheet"
  href="https://unpkg.com/@progress/kendo-theme-default@latest/dist/all.css"
  integrity="sha384-HASH_HERE"
  crossorigin="anonymous"
/>
```

**Remediation Steps:**
1. Generate SRI hashes for all external resources
2. Add `integrity` and `crossorigin` attributes
3. Consider self-hosting critical dependencies
4. Monitor CDN availability and integrity

**References:**
- SRI: https://developer.mozilla.org/en-US/docs/Web/Security/Subresource_Integrity

---

### [LOW-002] Verbose Error Stack Traces in Development Mode
**File:** `admin-portal/src/components/ErrorBoundary.tsx:76`
**CWE:** CWE-209 (Generation of Error Message Containing Sensitive Information)
**OWASP:** ASVS 7.4.1
**Severity:** Low

**Description:**
Error boundary displays full stack traces in development mode, which could leak file paths and code structure if accidentally deployed to production.

**Fix:**
```typescript
// Add production check
{process.env.NODE_ENV === 'development' &&
 import.meta.env.MODE === 'development' &&
 this.state.errorInfo && (
  <details>...</details>
)}
```

**Remediation Steps:**
1. Double-check NODE_ENV in production builds
2. Strip stack traces in build process
3. Add CI/CD validation for production builds
4. Configure error tracking service

---

### [LOW-003] CORS Configuration Not Documented
**File:** Backend API (CORS settings)
**CWE:** CWE-942 (Overly Permissive Cross-domain Whitelist)
**OWASP:** ASVS 14.5.3
**Severity:** Low

**Description:**
CORS configuration for backend API is not visible in frontend code, making it difficult to verify security.

**Recommendation:**
```typescript
// Document expected CORS configuration
// Backend API should have:
const corsOptions = {
  origin: [
    'https://calm-tree-03352ba03.1.azurestaticapps.net', // Admin portal
    'https://calm-pebble-043b2db03.1.azurestaticapps.net' // Member portal
  ],
  credentials: true,
  maxAge: 86400,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH'],
  allowedHeaders: ['Content-Type', 'Authorization', 'X-CSRF-Token']
};
```

**References:**
- OWASP CORS: https://cheatsheetseries.owasp.org/cheatsheets/HTML5_Security_Cheat_Sheet.html#cross-origin-resource-sharing

---

### [LOW-004] No Dependency License Scanning
**File:** `admin-portal/package.json`
**CWE:** CWE-1104 (Use of Unmaintained Third Party Components)
**OWASP:** ASVS 14.2.1
**Severity:** Low

**Description:**
No automated license scanning to detect GPL or other copyleft licenses that could conflict with proprietary code.

**Fix:**
```json
// package.json
{
  "scripts": {
    "license:check": "license-checker --summary --production --onlyAllow 'MIT;Apache-2.0;BSD-2-Clause;BSD-3-Clause;ISC'",
    "ci": "npm run lint && npm run license:check && npm audit --audit-level=high"
  }
}
```

**Remediation Steps:**
1. Install `license-checker` package
2. Define allowed licenses in package.json
3. Add license check to CI/CD pipeline
4. Review all dependencies for license compatibility

---

## Merge Gate Decision

### Recommendation: BLOCK MERGE

**Rationale:**
This pull request introduces **3 CRITICAL security vulnerabilities** that must be resolved before merging to production:

1. **CRITICAL-001: IDOR Vulnerability** - Complete authorization bypass allowing cross-party data access
2. **CRITICAL-002: Unauthenticated API Calls** - Missing authentication on endpoint management
3. **CRITICAL-003: MFA Bypass** - Hardcoded bypass allowing password-only authentication

**Additional HIGH-severity issues:**
- Weak CSP policy enabling XSS attacks
- Tokens stored in sessionStorage (XSS-accessible)
- No backend input validation
- Hardcoded production URLs
- Plain-text token display

### Required Fixes Before Merge:

#### CRITICAL (Must Fix):
1. **Backend API:** Implement party affiliation validation on ALL legal entity endpoints
2. **EndpointManagement:** Add authentication to all fetch() calls
3. **AuthContext:** Re-enable MFA validation (or enable Azure AD Conditional Access first)

#### HIGH (Strongly Recommended):
4. **CSP:** Remove 'unsafe-inline' and 'unsafe-eval', implement nonce-based policy
5. **Token Storage:** Change to memory-only cache or httpOnly cookies
6. **Input Validation:** Add backend Joi schema validation for all inputs
7. **API URLs:** Remove hardcoded production URLs, fail fast if env vars missing
8. **Token Display:** Mask token values by default, add show/hide toggle

### Post-Merge Actions:

#### Security Hardening:
1. Implement session timeout (15 minutes inactivity)
2. Add CSRF token validation
3. Implement rate limiting (Redis-based)
4. Create secure logging utility
5. Add safe error message mapping

#### Monitoring & Testing:
6. Deploy Application Insights for security monitoring
7. Create E2E tests for IDOR attacks
8. Set up CSP violation reporting
9. Configure automated security scanning (Aikido, npm audit)
10. Test MFA enforcement in production

### Compliance Notes:

**GDPR/Privacy:**
- Remove console logging of PII (email, roles, claims)
- Implement secure audit logging
- Add data access controls per GDPR Art. 32

**OWASP ASVS:**
- Currently failing: 4.1.1 (AuthZ), 2.1.1 (MFA), 1.14.1 (CSP)
- After fixes: Should achieve ASVS Level 2 compliance

**Estimated Remediation Time:**
- Critical fixes: 2-3 days (backend + frontend changes)
- High fixes: 2-3 days (CSP, token storage, validation)
- Medium/Low fixes: 2-3 days (logging, error handling, headers)
- **Total: 6-9 days of security hardening**

---

## Appendix A: Security Testing Checklist

### IDOR Testing:
- [ ] Attempt to access other associations' legal entities
- [ ] Try modifying entity IDs in API requests
- [ ] Enumerate identifiers by incrementing IDs
- [ ] Verify 404 (not 403) returned for unauthorized access
- [ ] Check audit logs for IDOR attempts

### Authentication Testing:
- [ ] Verify MFA required for all users
- [ ] Test login with expired tokens
- [ ] Attempt token refresh with revoked tokens
- [ ] Test session timeout (15 minutes)
- [ ] Verify logout clears all tokens

### Authorization Testing:
- [ ] Member cannot access admin portal
- [ ] Association Admin cannot access other associations
- [ ] System Admin can access all resources
- [ ] Role-based UI elements hidden correctly
- [ ] Backend enforces role checks

### Input Validation Testing:
- [ ] SQL injection in identifier values
- [ ] XSS payloads in text fields
- [ ] Path traversal in file uploads
- [ ] Oversized inputs (>10MB)
- [ ] Special characters in identifiers

### CSP Testing:
- [ ] Inline scripts blocked
- [ ] eval() blocked
- [ ] External scripts from unauthorized domains blocked
- [ ] CSP violation reports received
- [ ] No CSP bypasses via DOM manipulation

---

## Appendix B: Security Monitoring Queries

### Application Insights Queries:

```kusto
// IDOR Attempts
customEvents
| where name == "IDOR_ATTEMPT"
| where customDimensions.security_issue == "true"
| project timestamp, user=customDimensions.userId, target=customDimensions.targetId
| order by timestamp desc

// Failed Authentication
requests
| where resultCode == 401 or resultCode == 403
| summarize failures=count() by user_AuthenticatedId, bin(timestamp, 1h)
| where failures > 5
| order by timestamp desc

// CSP Violations
customEvents
| where name == "CSP_VIOLATION"
| summarize count() by tostring(customDimensions.violatedDirective), bin(timestamp, 1h)
| order by timestamp desc

// Rate Limit Violations
requests
| where resultCode == 429
| summarize count() by client_IP, bin(timestamp, 5m)
| where count_ > 10
```

---

## Document History

| Date | Version | Author | Changes |
|------|---------|--------|---------|
| 2025-10-25 | 1.0 | SA Agent | Initial security analysis |

**Next Review:** Before production deployment

---

**Classification:** Internal Security Review
**Distribution:** Development Team, Security Team, DevOps
**Status:** BLOCKING - Critical fixes required before merge
