# Member Portal Self-Service Registration - Implementation Plan

**Created:** October 30, 2025
**Status:** Planning
**Priority:** High

## Overview

Replace the current mailto-based member registration with a fully automated self-service registration flow that includes:
- Public registration form
- KvK document upload and verification
- Automated admin notifications
- Admin review and approval workflow
- Azure Entra ID B2B invitation upon approval

## Current State

**Member Portal** (`member-portal/src/App.tsx` lines 286-299):
```typescript
<Button
  onClick={() => {
    window.location.href = 'mailto:support@ctn-network.com?subject=Member Registration Request&body=I would like to register my organization as a CTN member.';
  }}
  size="large"
>
  Request to Join
</Button>
```

**Problem:** Manual email-based process, no automation, slow response time

## Target Architecture

```
┌─────────────────────────────────────────────────────────────────────┐
│ 1. MEMBER PORTAL LANDING (Unauthenticated)                          │
│    - Public-facing registration page                                 │
│    - Company details form (KvK, legal name, contact info)           │
│    - Membership type selection (Basic/Premium/Enterprise)            │
│    - KvK document upload                                             │
└────────────────┬────────────────────────────────────────────────────┘
                 │
                 ↓ Form Submit
┌─────────────────────────────────────────────────────────────────────┐
│ 2. AZURE FUNCTION API (api/src/functions/register-member.ts)        │
│    - Validate form data                                              │
│    - Store KvK document in Azure Blob Storage                       │
│    - Create pending application record (new table: applications)    │
│    - Trigger Azure AI Document Intelligence                          │
│    - Send email notifications                                        │
└────────────────┬────────────────────────────────────────────────────┘
                 │
                 ├──────> Azure AI Document Intelligence
                 │         - Extract KvK data from uploaded document
                 │         - Validate against form data
                 │         - Store extracted data
                 │
                 ├──────> Email Notifications
                 │         - Applicant: Confirmation email
                 │         - Admin Team: New application alert
                 │
                 ↓
┌─────────────────────────────────────────────────────────────────────┐
│ 3. ADMIN PORTAL REVIEW (admin-portal/src/components/)               │
│    - New "Pending Applications" dashboard view                       │
│    - Application detail view with:                                   │
│      * Applicant information                                         │
│      * Uploaded KvK document viewer                                  │
│      * Extracted data comparison                                     │
│      * Approve/Reject buttons with notes                             │
└────────────────┬────────────────────────────────────────────────────┘
                 │
                 ↓ Admin Approval
┌─────────────────────────────────────────────────────────────────────┐
│ 4. AZURE ENTRA ID B2B INVITATION                                     │
│    - Create member record in legal_entities table                    │
│    - Send Azure AD B2B invitation to applicant email                │
│    - Email applicant with invitation link                            │
│    - Set application status = 'approved'                             │
└────────────────┬────────────────────────────────────────────────────┘
                 │
                 ↓ User Accepts Invitation
┌─────────────────────────────────────────────────────────────────────┐
│ 5. MEMBER ACCESS GRANTED                                             │
│    - User signs in with Azure AD                                     │
│    - Member portal shows authenticated dashboard                     │
│    - Full access to CTN features                                     │
└─────────────────────────────────────────────────────────────────────┘
```

## Database Schema Changes

### New Table: `applications`

```sql
CREATE TABLE applications (
    application_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    applicant_email VARCHAR(255) NOT NULL,
    applicant_name VARCHAR(255) NOT NULL,
    legal_name VARCHAR(255) NOT NULL,
    kvk_number VARCHAR(50) NOT NULL,
    domain VARCHAR(255),
    company_address TEXT,
    contact_phone VARCHAR(50),
    membership_type VARCHAR(50) DEFAULT 'basic',
    kvk_document_url TEXT,
    kvk_extracted_data JSONB,
    status VARCHAR(50) DEFAULT 'pending', -- pending, under_review, approved, rejected
    submitted_at TIMESTAMP DEFAULT NOW(),
    reviewed_at TIMESTAMP,
    reviewed_by UUID REFERENCES users(user_id),
    review_notes TEXT,
    rejection_reason TEXT,
    created_by VARCHAR(255) DEFAULT 'system',
    dt_created TIMESTAMP DEFAULT NOW(),
    dt_updated TIMESTAMP DEFAULT NOW()
);

CREATE INDEX idx_applications_status ON applications(status);
CREATE INDEX idx_applications_email ON applications(applicant_email);
CREATE INDEX idx_applications_kvk ON applications(kvk_number);
```

## Implementation Phases

### Phase 1: Frontend Registration Form (TONIGHT)

**Components to Create:**

1. **`member-portal/src/components/RegistrationForm.tsx`**
   - Company information fields (KvK, legal name, address)
   - Contact information (name, email, phone)
   - Membership type selector (Basic/Premium/Enterprise)
   - Terms & conditions checkbox
   - Form validation (Kendo React Form)

2. **`member-portal/src/components/KvKDocumentUpload.tsx`**
   - Drag-and-drop file upload
   - File type validation (PDF, image)
   - File size validation (max 10MB)
   - Preview uploaded document
   - Clear/replace functionality

3. **Update `member-portal/src/App.tsx`**
   - Replace mailto button with "Register" button
   - Add registration view/modal
   - Handle registration flow state

**Estimated Time:** 2-3 hours

### Phase 2: Backend API (TONIGHT)

**API Endpoints to Create:**

1. **POST `/api/v1/register-member`** (`api/src/functions/register-member.ts`)
   - Validate registration data
   - Upload KvK document to Azure Blob Storage
   - Create application record in database
   - Trigger email notifications
   - Return application ID and confirmation

2. **GET `/api/v1/applications`** (admin only)
   - List all pending applications
   - Filter by status
   - Pagination support

3. **GET `/api/v1/applications/:id`** (admin only)
   - Get application details
   - Include KvK document URL
   - Include extracted data

4. **POST `/api/v1/applications/:id/approve`** (admin only)
   - Approve application
   - Create member record
   - Trigger Azure AD B2B invitation
   - Send approval email

5. **POST `/api/v1/applications/:id/reject`** (admin only)
   - Reject application with reason
   - Send rejection email
   - Update application status

**Estimated Time:** 3-4 hours

### Phase 3: Email Notifications (TONIGHT)

**Email Templates to Create:**

1. **`api/src/email-templates/registration-confirmation.html`**
   - Thank applicant for submitting
   - Explain review process and timeline
   - Provide application reference number

2. **`api/src/email-templates/admin-new-application.html`**
   - Alert admin team of new application
   - Include applicant summary
   - Link to admin portal review page

3. **`api/src/email-templates/application-approved.html`**
   - Notify applicant of approval
   - Include Azure AD B2B invitation link
   - Onboarding instructions

4. **`api/src/email-templates/application-rejected.html`**
   - Notify applicant of rejection
   - Include reason for rejection
   - Offer appeal/resubmission process

**Email Service:** Use existing Azure Communication Services or SendGrid integration

**Estimated Time:** 2 hours

### Phase 4: Admin Review UI (TOMORROW)

**Components to Create:**

1. **`admin-portal/src/components/PendingApplications.tsx`**
   - Grid view of pending applications
   - Status filters
   - Search by KvK/name/email
   - Click to view details

2. **`admin-portal/src/components/ApplicationDetailView.tsx`**
   - Full application information
   - KvK document viewer (embedded PDF)
   - Extracted data comparison table
   - Approve/Reject action buttons
   - Notes/comments field

3. **Update `admin-portal/src/components/AdminPortal.tsx`**
   - Add "Applications" menu item
   - Add badge showing pending count
   - Route to applications view

**Estimated Time:** 3-4 hours

### Phase 5: Azure AI Document Intelligence Integration (REQUIRES CONFIG)

**What Needs to Be Done:**

1. **Azure Resource Setup** (Manual/DevOps)
   - Create Azure AI Document Intelligence resource
   - Configure custom model for KvK extraction
   - Train model with sample KvK documents
   - Store resource endpoint and key in Key Vault

2. **Backend Integration** (`api/src/services/document-intelligence.ts`)
   - Create service to call Azure AI Document Intelligence
   - Parse extracted data
   - Map to application fields
   - Store in `kvk_extracted_data` JSONB column

3. **Validation Logic**
   - Compare extracted KvK number vs form-entered
   - Compare extracted legal name vs form-entered
   - Flag discrepancies for admin review

**Estimated Time:** 4-6 hours (includes Azure setup)

**Dependencies:** Requires Azure subscription access and Document Intelligence resource provisioning

### Phase 6: Azure Entra ID B2B Invitation Flow (REQUIRES CONFIG)

**What Needs to Be Done:**

1. **Azure AD Configuration** (Manual)
   - Configure B2B invitation settings
   - Set up external identity provider
   - Configure invitation redemption URL
   - Set default user permissions

2. **Backend Integration** (`api/src/services/azure-ad-invitation.ts`)
   - Use Microsoft Graph API
   - Create invitation
   - Send invitation email
   - Track invitation status

3. **Member Onboarding**
   - User accepts invitation
   - User signs in for first time
   - Automatically link to member record
   - Redirect to member portal dashboard

**Estimated Time:** 4-5 hours

**Dependencies:** Requires Azure AD B2B configuration and Graph API permissions

## Testing Strategy

### Unit Tests
- Form validation logic
- File upload validation
- API input validation
- Email template rendering

### Integration Tests
- End-to-end registration flow
- Email delivery
- Document upload to Azure Blob Storage
- Database record creation

### E2E Tests (Playwright)
1. **User Registration Flow**
   - Navigate to member portal
   - Click "Register"
   - Fill form
   - Upload KvK document
   - Submit
   - Verify confirmation message

2. **Admin Review Flow**
   - Login as admin
   - Navigate to Applications
   - Click pending application
   - Review details
   - Approve application
   - Verify member created

3. **Member Access Flow**
   - Accept B2B invitation (simulated)
   - Sign in to member portal
   - Verify dashboard access

## Security Considerations

1. **Input Validation**
   - Sanitize all form inputs
   - Validate file types and sizes
   - Prevent SQL injection
   - Prevent XSS

2. **File Upload Security**
   - Validate file extensions
   - Scan for malware
   - Store in isolated blob container
   - Generate secure download URLs with expiration

3. **Authorization**
   - Only admins can view applications
   - Only admins can approve/reject
   - Rate limiting on registration endpoint
   - CAPTCHA to prevent bot registrations

4. **Data Privacy**
   - GDPR compliance for applicant data
   - Secure storage of KvK documents
   - Audit trail for all actions
   - Data retention policy

## Rollout Plan

### Step 1: Deploy Backend API
- Create database migration
- Deploy API endpoints
- Test with Postman/curl

### Step 2: Deploy Frontend
- Deploy registration form
- Test registration flow
- Verify email notifications

### Step 3: Deploy Admin UI
- Deploy admin review components
- Test approval/rejection flow

### Step 4: User Acceptance Testing
- Internal team testing
- Fix bugs
- Refinements

### Step 5: Production Release
- Enable feature flag
- Monitor error logs
- Gradual rollout

## Success Criteria

✅ **Phase 1 Complete When:**
- Registration form is functional
- KvK upload works
- Form validation is solid
- User experience is smooth

✅ **Phase 2 Complete When:**
- API endpoints are working
- Database records are created
- Email notifications are sent
- Error handling is robust

✅ **Phase 3 Complete When:**
- Admin can view pending applications
- Admin can approve/reject
- Member record is created on approval
- Status updates work correctly

✅ **Phase 4 Complete When:**
- Azure AD B2B invitations work
- Users can sign in after approval
- Full end-to-end flow is tested
- Documentation is complete

## Risks & Mitigation

| Risk | Impact | Mitigation |
|------|--------|------------|
| Azure AI Document Intelligence setup delays | High | Start with manual KvK verification, add AI later |
| Azure AD B2B config issues | High | Work with Azure admin team, document clearly |
| File upload security vulnerabilities | Critical | Strict validation, malware scanning, isolated storage |
| Email delivery failures | Medium | Use reliable service (SendGrid), implement retry logic |
| Database migration issues | Medium | Test migrations thoroughly, have rollback plan |

## Next Steps (Tonight)

1. ✅ Create `RegistrationForm.tsx` component
2. ✅ Create `KvKDocumentUpload.tsx` component
3. ✅ Update `App.tsx` with registration flow
4. ✅ Create backend API endpoints
5. ✅ Set up email notifications
6. ✅ Create database migration
7. ✅ Test registration flow end-to-end
8. ✅ Create comprehensive documentation

## Documentation Updates Needed

- API documentation (endpoints, request/response schemas)
- User guide for registration process
- Admin guide for application review
- Architecture diagrams
- Database schema documentation

---

**Implementation Owner:** Claude Code
**Review Required:** User approval before Phase 5 & 6 (Azure resource setup)
