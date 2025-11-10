# Implementation Plan: Endpoint Registration with Multi-Step Verification

## Overview
**Goal**: Implement a multi-step endpoint registration flow using Mantine Stepper component that guides members through endpoint creation, email verification, testing, and activation.

**Estimated Stages**: 4

**Architecture Pattern**: Follow DNS verification pattern (token generation, verification, status tracking)

---

## Stage 1: Database Schema Enhancement
**Goal**: Add verification token and status tracking fields to support multi-step registration flow
**Success Criteria**:
- [ ] Migration adds verification_token, verification_status, verification_sent_at fields
- [ ] Migration adds test_result_data jsonb field for storing test results
- [ ] CHECK constraint validates verification_status enum
- [ ] Default values ensure backward compatibility with existing endpoints

**Tests**:
- Test migration on dev database
- Verify existing endpoints remain functional
- Verify new fields accept null values for existing records

**Status**: Not Started

**Implementation Notes**:
- Add to `legal_entity_endpoint` table:
  - `verification_token` VARCHAR(255) - unique token for email verification
  - `verification_status` VARCHAR(50) DEFAULT 'pending' - ['pending', 'token_sent', 'token_verified', 'test_passed', 'active', 'failed']
  - `verification_sent_at` TIMESTAMPTZ - when email was sent
  - `verification_expires_at` TIMESTAMPTZ - token expiry (24 hours)
  - `test_result_data` JSONB - store test API response details
- Add CHECK constraint for verification_status
- Create index on verification_token for lookup
- Make fields nullable for backward compatibility

**SQL Preview**:
```sql
ALTER TABLE legal_entity_endpoint
  ADD COLUMN verification_token VARCHAR(255) UNIQUE,
  ADD COLUMN verification_status VARCHAR(50) DEFAULT 'pending',
  ADD COLUMN verification_sent_at TIMESTAMPTZ,
  ADD COLUMN verification_expires_at TIMESTAMPTZ,
  ADD COLUMN test_result_data JSONB,
  ADD CONSTRAINT chk_verification_status
    CHECK (verification_status IN ('pending', 'token_sent', 'token_verified', 'test_passed', 'active', 'failed'));
```

---

## Stage 2: Backend API Functions
**Goal**: Create API endpoints for multi-step verification flow with mock email service
**Success Criteria**:
- [ ] POST endpoint initiates registration and generates verification token
- [ ] POST endpoint sends mock verification email and updates status
- [ ] POST endpoint verifies token and marks as verified
- [ ] POST endpoint tests member's endpoint using mock Association test API
- [ ] GET endpoint retrieves endpoint status and verification details
- [ ] All endpoints enforce IDOR protection (ownership verification)
- [ ] Audit logging for all verification steps

**Tests**:
- curl test: Create endpoint returns verification_token
- curl test: Send email updates verification_status to 'token_sent'
- curl test: Verify token with correct token succeeds
- curl test: Verify token with expired token fails
- curl test: Test endpoint records test results in test_result_data
- curl test: Non-owner cannot access other entity's endpoints

**Status**: Not Started

**Implementation Notes**:
- **File**: `api/src/functions/EndpointRegistration.ts`
- Create 5 new functions following existing pattern in `EndpointManagement.ts`:

  1. **InitiateEndpointRegistration** - POST `/v1/entities/{legal_entity_id}/endpoints/register`
     - Create endpoint record with verification_status='pending'
     - Generate cryptographically secure token (crypto.randomBytes)
     - Set expires_at to now + 24 hours
     - Return endpoint_id and token (for development/testing)
     - IDOR: Verify user owns legal_entity_id

  2. **SendVerificationEmail** - POST `/v1/endpoints/{endpoint_id}/send-verification`
     - MOCK: Log email details instead of sending via Azure Communication Services
     - Update verification_status='token_sent', verification_sent_at=now()
     - Return success message with mock email details
     - IDOR: Verify user owns endpoint

  3. **VerifyEndpointToken** - POST `/v1/endpoints/verify`
     - Body: { token: string }
     - Lookup endpoint by verification_token
     - Check token not expired (verification_expires_at > now)
     - Update verification_status='token_verified'
     - Return endpoint details for next step
     - IDOR: Not needed (token itself proves ownership)

  4. **TestEndpoint** - POST `/v1/endpoints/{endpoint_id}/test`
     - MOCK: Simulate calling member's endpoint with BVAD token
     - Generate test BVAD token using existing issueTokenHandler logic
     - Mock HTTP call to endpoint_url with Authorization header
     - Store mock response in test_result_data
     - Update verification_status='test_passed' or 'failed'
     - Update last_connection_test, last_connection_status
     - IDOR: Verify user owns endpoint

  5. **ActivateEndpoint** - POST `/v1/endpoints/{endpoint_id}/activate`
     - Verify verification_status='test_passed'
     - Update is_active=true, activation_date=now(), verification_status='active'
     - Return activated endpoint
     - IDOR: Verify user owns endpoint

- Register functions in `api/src/index.ts` or `api/src/essential-index.ts`
- Follow existing RBAC patterns (Permission.UPDATE_OWN_ENTITY)
- Use wrapEndpoint middleware for auth, audit, error handling

**Mock Email Service Pattern**:
```typescript
// Instead of Azure Communication Services
context.info('MOCK EMAIL: Sending verification to contacts', {
  endpoint_id,
  token: verification_token,
  expires_at: verification_expires_at
});
```

**Mock Test API Pattern**:
```typescript
// Simulate calling member's endpoint
const mockTestResult = {
  success: Math.random() > 0.3, // 70% success rate for testing
  status_code: 200,
  response_time_ms: Math.floor(Math.random() * 500) + 100,
  headers: { 'content-type': 'application/json' },
  body: { data: 'mock response' },
  tested_at: new Date().toISOString()
};
```

---

## Stage 3: Frontend Stepper Component
**Goal**: Create multi-step registration UI using Mantine Stepper
**Success Criteria**:
- [ ] Stepper component with 4 steps renders correctly
- [ ] Step 1: Form captures endpoint details (name, URL, description, category)
- [ ] Step 2: Displays verification token and "Resend Email" button
- [ ] Step 3: Form validates token input and proceeds on success
- [ ] Step 4: Shows test results and activates endpoint
- [ ] Stepper allows going back to edit previous steps
- [ ] Form validation uses Mantine useForm hook
- [ ] Loading states during API calls
- [ ] Error handling with notifications

**Tests**:
- Playwright E2E: Complete full registration flow
- Playwright E2E: Verify token expiration handling
- Playwright E2E: Test failure scenario shows error
- Playwright E2E: Back navigation preserves form data

**Status**: Not Started

**Implementation Notes**:
- **File**: `member-portal/src/components/EndpointRegistrationWizard.tsx`
- Use Mantine Stepper component (study docs/MANTINE_LLMS.txt patterns)
- Replace existing "Add Endpoint" flow in `EndpointsView.tsx`

**Component Structure**:
```typescript
import { Stepper, Button, TextInput, Textarea, Select } from '@mantine/core';
import { useForm } from '@mantine/form';

export const EndpointRegistrationWizard: React.FC<Props> = () => {
  const [active, setActive] = useState(0);
  const [endpointId, setEndpointId] = useState<string | null>(null);
  const [verificationToken, setVerificationToken] = useState<string | null>(null);

  const form = useForm({
    initialValues: {
      endpoint_name: '',
      endpoint_url: '',
      endpoint_description: '',
      data_category: 'SHIPMENT',
      endpoint_type: 'REST_API'
    },
    validate: {
      endpoint_name: (value) => value.length < 3 ? 'Name too short' : null,
      endpoint_url: (value) => !value.startsWith('https://') ? 'Must use HTTPS' : null
    }
  });

  return (
    <Modal opened={opened} onClose={onClose} size="xl" title="Register New Endpoint">
      <Stepper active={active} onStepClick={setActive}>
        <Stepper.Step label="Endpoint Details" description="Configure your endpoint">
          {/* Step 1 form */}
        </Stepper.Step>

        <Stepper.Step label="Email Verification" description="Verify ownership">
          {/* Step 2 token display */}
        </Stepper.Step>

        <Stepper.Step label="Test Connection" description="Validate endpoint">
          {/* Step 3 token input + test */}
        </Stepper.Step>

        <Stepper.Completed>
          {/* Step 4 success/activation */}
        </Stepper.Completed>
      </Stepper>
    </Modal>
  );
};
```

**Step Details**:

**Step 1 - Endpoint Details**:
- TextInput: endpoint_name (required)
- TextInput: endpoint_url (required, https only)
- Textarea: endpoint_description
- Select: data_category (SHIPMENT, TRACKING, INVOICE, ORDER, OTHER)
- Select: endpoint_type (REST_API, SOAP, SFTP, FTP, OTHER)
- Button: "Next" → calls InitiateEndpointRegistration API

**Step 2 - Email Verification**:
- Display: "Verification email sent to your registered contacts"
- Display: Verification token (for dev/testing - show in alert box)
- Display: Expiry time (24 hours countdown)
- Button: "Resend Email" → calls SendVerificationEmail API
- Button: "Next" (auto-advance after token sent)

**Step 3 - Test Connection**:
- TextInput: "Enter verification token from email"
- Button: "Verify Token" → calls VerifyEndpointToken API
- On success: Auto-trigger TestEndpoint API
- Display: Loading spinner during test
- Display: Test results (success/failure, response time, status code)
- If failed: Show error + "Retry Test" button
- Button: "Next" (enabled only if test_passed)

**Step 4 - Activation & Completion**:
- Display: Success checkmark icon
- Display: Endpoint summary (name, URL, status)
- Display: "Your endpoint is now active and discoverable"
- Button: "View All Endpoints" → closes wizard, refreshes list
- Button: "Register Another" → resets wizard to step 1

**Integration with EndpointsView.tsx**:
```typescript
// Replace existing showDialog modal with:
{showWizard && (
  <EndpointRegistrationWizard
    opened={showWizard}
    onClose={() => setShowWizard(false)}
    apiBaseUrl={apiBaseUrl}
    getAccessToken={getAccessToken}
    legalEntityId={memberData.organizationId}
    onSuccess={handleRegistrationSuccess}
  />
)}
```

---

## Stage 4: API Client & Integration Testing
**Goal**: Update shared API client and perform end-to-end testing
**Success Criteria**:
- [ ] API client methods added for all new endpoints
- [ ] Type definitions include new fields
- [ ] E2E test covers complete registration flow
- [ ] E2E test validates error scenarios
- [ ] Documentation updated with flow diagram

**Tests**:
- Playwright E2E: Full happy path (create → verify → test → activate)
- Playwright E2E: Token expiration after 24 hours
- Playwright E2E: Invalid token handling
- Playwright E2E: Test failure retry
- Playwright E2E: Multiple endpoints for same entity

**Status**: Not Started

**Implementation Notes**:

**Update API Client** (`packages/api-client/src/endpoints/endpoints.ts`):
```typescript
export class EndpointsEndpoint {
  // Add new methods
  async initiateRegistration(
    legalEntityId: string,
    data: CreateEndpointRequest
  ): Promise<{ endpoint_id: string; verification_token: string }> {
    const { data: result } = await this.axios.post(
      `/entities/${legalEntityId}/endpoints/register`,
      data
    );
    return result;
  }

  async sendVerification(endpointId: string): Promise<void> {
    await this.axios.post(`/endpoints/${endpointId}/send-verification`);
  }

  async verifyToken(token: string): Promise<Endpoint> {
    const { data } = await this.axios.post('/endpoints/verify', { token });
    return data;
  }

  async testEndpoint(endpointId: string): Promise<TestResult> {
    const { data } = await this.axios.post(`/endpoints/${endpointId}/test`);
    return data;
  }

  async activate(endpointId: string): Promise<Endpoint> {
    const { data } = await this.axios.post(`/endpoints/${endpointId}/activate`);
    return data;
  }
}
```

**Update Types** (`packages/api-client/src/types.ts`):
```typescript
export interface Endpoint {
  // Existing fields...
  verification_token?: string;
  verification_status?: string;
  verification_sent_at?: string;
  verification_expires_at?: string;
  test_result_data?: {
    success: boolean;
    status_code: number;
    response_time_ms: number;
    tested_at: string;
    error?: string;
  };
}

export interface TestResult {
  success: boolean;
  status_code: number;
  response_time_ms: number;
  message: string;
}
```

**E2E Test** (`member-portal/e2e/endpoint-registration.spec.ts`):
```typescript
import { test, expect } from '@playwright/test';

test.describe('Endpoint Registration Flow', () => {
  test.use({ storageState: 'playwright/.auth/user.json' });

  test('complete endpoint registration with verification', async ({ page }) => {
    await page.goto('http://localhost:3000');

    // Navigate to endpoints
    await page.click('text=API Access');
    await page.click('button:has-text("Register Endpoint")');

    // Step 1: Enter details
    await page.fill('input[name="endpoint_name"]', 'Test Shipment API');
    await page.fill('input[name="endpoint_url"]', 'https://api.test.com/shipments');
    await page.fill('textarea[name="endpoint_description"]', 'Test endpoint');
    await page.click('button:has-text("Next")');

    // Step 2: Verification sent
    await expect(page.locator('text=Verification email sent')).toBeVisible();
    const token = await page.locator('[data-testid="verification-token"]').textContent();
    await page.click('button:has-text("Next")');

    // Step 3: Enter token and test
    await page.fill('input[name="verification_token"]', token || '');
    await page.click('button:has-text("Verify Token")');
    await expect(page.locator('text=Test passed')).toBeVisible({ timeout: 10000 });
    await page.click('button:has-text("Next")');

    // Step 4: Activation
    await expect(page.locator('text=Endpoint is now active')).toBeVisible();
    await page.click('button:has-text("View All Endpoints")');

    // Verify endpoint appears in list
    await expect(page.locator('text=Test Shipment API')).toBeVisible();
  });

  test('handles expired token', async ({ page }) => {
    // Test expired token scenario
  });

  test('handles test failure', async ({ page }) => {
    // Test endpoint test failure scenario
  });
});
```

**Documentation**: Update `docs/COMPLETED_ACTIONS.md` with:
- Flow diagram (Mermaid syntax)
- API endpoint documentation
- Security considerations (token validation, IDOR prevention)
- Future enhancement: Replace mock email with Azure Communication Services

---

## Progress Tracking
- [ ] Stage 1: Database Schema Enhancement
- [ ] Stage 2: Backend API Functions
- [ ] Stage 3: Frontend Stepper Component
- [ ] Stage 4: API Client & Integration Testing

---

## Security Considerations

**IDOR Prevention**:
- All endpoints verify ownership via legal_entity_contact.email = userEmail
- VerifyEndpointToken uses token lookup (no entity_id parameter)
- Return 404 (not 403) when entity not found to prevent information disclosure

**Token Security**:
- Use crypto.randomBytes(32) for cryptographically secure tokens
- Token format: `ENDPOINT_VERIFY_{timestamp}_{hex}`
- 24-hour expiry enforced at database level
- One-time use: Clear token after successful verification

**Rate Limiting**:
- Apply existing rate limiting middleware to prevent email spam
- Limit verification attempts per endpoint (5 attempts before lockout)

**Data Validation**:
- Enforce HTTPS for endpoint URLs (security requirement)
- Validate URL format (prevent javascript:, data: schemes)
- Sanitize all user inputs before database insertion

---

## Future Enhancements (Out of Scope)

- Replace mock email with Azure Communication Services integration
- Replace mock test API with actual HTTP client call to member's endpoint
- Add webhook notifications when endpoint becomes discoverable
- Implement endpoint health monitoring (periodic testing)
- Add endpoint analytics (usage statistics, uptime)
- Support multiple authentication methods (OAuth2, mutual TLS)

---

## Dependencies

**No new npm packages required**:
- Mantine Stepper: Already in @mantine/core
- crypto: Node.js built-in
- Axios: Already in @ctn/api-client
- Playwright: Already configured

**Azure Services**:
- PostgreSQL: Existing tables modified
- Azure Functions: Existing infrastructure
- Azure Communication Services: Future (currently mocked)

---

## Rollback Plan

If issues arise:
1. Migration includes rollback script (DROP new columns)
2. New API functions can be removed from index.ts
3. Frontend changes isolated to new component (easy to revert)
4. Existing endpoint CRUD functionality remains untouched
