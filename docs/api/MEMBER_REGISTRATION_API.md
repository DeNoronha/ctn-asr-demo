# Member Registration API Documentation

**Endpoint:** POST `/api/v1/register-member`
**Authentication:** Public (no authentication required)
**Rate Limiting:** 10 requests per minute per IP address
**Related:** [Implementation Plan](../MEMBER_REGISTRATION_IMPLEMENTATION_PLAN.md)

---

## Overview

Public endpoint for self-service member registration. Creates a pending application for admin review. This endpoint enables prospective members to submit registration applications through the member portal without requiring prior authentication.

---

## Request

### HTTP Method
```
POST /api/v1/register-member
```

### Headers
```
Content-Type: application/json
```

### Request Body Schema

```typescript
{
  // Company Information
  legalName: string;          // Required - Company legal name
  kvkNumber: string;          // Required - 8-digit Dutch KvK number
  lei?: string;               // Optional - 20-character LEI code
  companyAddress: string;     // Required - Full company address
  postalCode: string;         // Required - Postal/ZIP code
  city: string;               // Required - City name
  country: string;            // Required - Country name

  // Contact Information
  contactName: string;        // Required - Primary contact full name
  contactEmail: string;       // Required - Valid email address
  contactPhone: string;       // Required - Phone number with country code
  jobTitle: string;           // Required - Contact's job title

  // Membership
  membershipType: string;     // Required - One of: basic, standard, premium, enterprise

  // Legal Acceptance
  termsAccepted: boolean;     // Required - Must be true
  gdprConsent: boolean;       // Required - Must be true
}
```

### Example Request

```json
{
  "legalName": "Acme Logistics B.V.",
  "kvkNumber": "12345678",
  "lei": "549300ABCD1234567890",
  "companyAddress": "Havenstraat 123",
  "postalCode": "3011 AB",
  "city": "Rotterdam",
  "country": "Netherlands",
  "contactName": "Jan de Vries",
  "contactEmail": "j.devries@acme-logistics.nl",
  "contactPhone": "+31 10 1234567",
  "jobTitle": "Operations Manager",
  "membershipType": "standard",
  "termsAccepted": true,
  "gdprConsent": true
}
```

---

## Response

### Success Response (201 Created)

```json
{
  "message": "Application submitted successfully",
  "applicationId": "550e8400-e29b-41d4-a716-446655440000",
  "status": "pending",
  "submittedAt": "2025-10-30T22:31:39.123Z",
  "nextSteps": [
    "You will receive a confirmation email shortly",
    "Our admin team will review your application within 2-3 business days",
    "You will be notified by email once your application is approved",
    "After approval, you will receive an Azure AD invitation to access the member portal"
  ]
}
```

### Error Responses

#### 400 Bad Request - Missing Fields
```json
{
  "error": "Missing required fields",
  "missingFields": ["legalName", "kvkNumber"]
}
```

#### 400 Bad Request - Invalid Email
```json
{
  "error": "Invalid email address format"
}
```

#### 400 Bad Request - Invalid KvK Number
```json
{
  "error": "KvK number must be 8 digits"
}
```

#### 400 Bad Request - Invalid LEI
```json
{
  "error": "LEI must be 20 alphanumeric characters"
}
```

#### 400 Bad Request - Invalid Phone
```json
{
  "error": "Invalid phone number format"
}
```

#### 400 Bad Request - Missing Consent
```json
{
  "error": "Terms and GDPR consent must be accepted"
}
```

#### 400 Bad Request - Invalid Membership Type
```json
{
  "error": "Invalid membership type",
  "validTypes": ["basic", "standard", "premium", "enterprise"]
}
```

#### 409 Conflict - Duplicate Application
```json
{
  "error": "Application already exists",
  "message": "An application with this email address is already pending review",
  "applicationId": "550e8400-e29b-41d4-a716-446655440000",
  "status": "pending"
}
```

#### 409 Conflict - KvK Already Registered
```json
{
  "error": "KvK number already registered",
  "message": "This KvK number is already associated with a member organization",
  "existingMember": {
    "orgId": "660e8400-e29b-41d4-a716-446655440000",
    "legalName": "Existing Company B.V."
  }
}
```

#### 429 Too Many Requests
```json
{
  "error": "Rate limit exceeded",
  "message": "Too many registration attempts. Please try again in 1 minute."
}
```

#### 500 Internal Server Error
```json
{
  "error": "Registration failed",
  "message": "An error occurred while processing your registration. Please try again later or contact support.",
  "errorId": "f47ac10b-58cc-4372-a567-0e02b2c3d479"
}
```

---

## Validation Rules

### Required Fields
All fields except `lei` are required. The API returns a 400 error with a list of missing fields if any required field is omitted.

### Email Validation
- **Pattern:** `^[^\s@]+@[^\s@]+\.[^\s@]+$`
- **Example:** `user@example.com`

### KvK Number Validation
- **Format:** Exactly 8 digits
- **Pattern:** `^\d{8}$`
- **Example:** `12345678`
- **Note:** Dutch Chamber of Commerce registration number

### LEI Validation (Optional)
- **Format:** Exactly 20 alphanumeric characters (uppercase)
- **Pattern:** `^[A-Z0-9]{20}$`
- **Example:** `549300ABCD1234567890`
- **Note:** Legal Entity Identifier (ISO 17442)

### Phone Number Validation
- **Format:** Allows digits, spaces, +, -, ()
- **Pattern:** `^[\d\s\+\-\(\)]+$`
- **Minimum Length:** 7 characters
- **Example:** `+31 10 1234567` or `+44 (20) 1234 5678`

### Membership Type Validation
- **Valid Values:** `basic`, `standard`, `premium`, `enterprise`
- **Case Insensitive:** Converted to lowercase internally

### Legal Acceptance
- **termsAccepted:** Must be `true`
- **gdprConsent:** Must be `true`

---

## Duplicate Detection

The API checks for duplicates before creating a new application:

1. **Email Check:** Searches `applications` table for pending/under_review applications with the same email
2. **KvK Check:** Searches `members` table for existing members with the same KvK number

If a duplicate is found, the API returns a 409 Conflict response with details about the existing record.

---

## Security Features

### Rate Limiting
- **Limit:** 10 requests per minute per IP address
- **Purpose:** Prevents abuse and spam registrations
- **Response:** 429 Too Many Requests when exceeded

### Input Sanitization
All user input is validated and sanitized before being stored in the database to prevent:
- SQL injection
- XSS attacks
- Data corruption

### Audit Logging
Every registration attempt is logged with:
- Application ID
- Applicant email
- Legal name
- KvK number
- Membership type
- Timestamp
- IP address (via rate limiting middleware)

Audit event type: `APPLICATION_SUBMITTED`

---

## Database Storage

Applications are stored in the `applications` table with the following key fields:

| Column | Type | Description |
|--------|------|-------------|
| application_id | UUID | Unique identifier (auto-generated) |
| applicant_email | VARCHAR(255) | Contact email address |
| applicant_name | VARCHAR(255) | Contact full name |
| legal_name | VARCHAR(255) | Company legal name |
| kvk_number | VARCHAR(50) | Dutch KvK number |
| lei | VARCHAR(20) | Legal Entity Identifier (optional) |
| membership_type | VARCHAR(50) | Membership tier |
| status | VARCHAR(50) | Application status (pending/under_review/approved/rejected) |
| terms_accepted | BOOLEAN | Terms acceptance flag |
| gdpr_consent | BOOLEAN | GDPR consent flag |
| submitted_at | TIMESTAMP | Submission timestamp |

See [Migration 016](../../database/migrations/016_member_registration_applications.sql) for complete schema.

---

## Workflow Integration

### Current Implementation
1. User submits registration form via member portal
2. API validates data and creates pending application
3. API logs audit event
4. API returns success response with application ID
5. User sees confirmation message with next steps

### Future Enhancements (Not Yet Implemented)
1. **Email Notifications:** Send confirmation email to applicant and alert email to admin team
2. **Document Upload:** Support KvK document upload via multipart/form-data
3. **Azure AI Document Intelligence:** Automated KvK document verification
4. **Admin Review UI:** Admin portal interface for reviewing applications
5. **Approval Workflow:** Azure AD B2B invitation upon approval

See [Implementation Plan](../MEMBER_REGISTRATION_IMPLEMENTATION_PLAN.md) for complete roadmap.

---

## Testing

### API Test Example (curl)

```bash
# Test registration endpoint
curl -X POST https://func-ctn-demo-asr-dev.azurewebsites.net/api/v1/register-member \
  -H "Content-Type: application/json" \
  -d '{
    "legalName": "Test Company B.V.",
    "kvkNumber": "98765432",
    "companyAddress": "Test Street 123",
    "postalCode": "1234 AB",
    "city": "Amsterdam",
    "country": "Netherlands",
    "contactName": "Test User",
    "contactEmail": "test@example.com",
    "contactPhone": "+31 20 1234567",
    "jobTitle": "Test Manager",
    "membershipType": "basic",
    "termsAccepted": true,
    "gdprConsent": true
  }'
```

### Expected Response
```json
{
  "message": "Application submitted successfully",
  "applicationId": "550e8400-e29b-41d4-a716-446655440000",
  "status": "pending",
  "submittedAt": "2025-10-30T22:31:39.123Z",
  "nextSteps": [...]
}
```

---

## Error Handling

The endpoint uses comprehensive error handling:

1. **Validation Errors (400):** Clear error messages indicating which validation rule failed
2. **Duplicate Errors (409):** Informative messages with existing record details
3. **Rate Limit Errors (429):** Clear indication of rate limit and retry timing
4. **Server Errors (500):** Generic error message with unique error ID for support tracking

All errors are logged to Application Insights for monitoring and debugging.

---

## Monitoring

### Application Insights Metrics

**Custom Events:**
- `member_registration_request` - Fired on every request
- `member_registration_success` - Fired on successful application creation

**Custom Metrics:**
- `registration_duration` - Total time to process registration (milliseconds)
- `database_query_duration` - Time to create application record (milliseconds)

**Exceptions:**
- All unhandled exceptions are tracked with context (operation, user data)

---

## CORS Configuration

The endpoint supports CORS for browser-based requests:

```javascript
allowCors: true
```

This enables the member portal (Static Web App) to call the API directly from the browser.

---

## Related Documentation

- [Implementation Plan](../MEMBER_REGISTRATION_IMPLEMENTATION_PLAN.md) - Complete feature roadmap
- [Database Migration 016](../../database/migrations/016_member_registration_applications.sql) - Applications table schema
- [Audit Log Middleware](../../api/src/middleware/auditLog.ts) - Audit event types
- [Public Endpoint Wrapper](../../api/src/middleware/endpointWrapper.ts) - Rate limiting and CORS

---

## Deployment

**Function Name:** `registerMember`
**Route:** `v1/register-member`
**Auth Level:** `anonymous` (public endpoint)
**Deployment:** Committed to `main` branch (commit 0fe1a78)
**Status:** Deployed to Azure Functions (func-ctn-demo-asr-dev)

---

**Last Updated:** October 30, 2025
**Implementation:** CA Agent
**Documentation:** TW Agent
