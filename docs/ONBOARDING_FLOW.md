# Association Member Onboarding Flow

**Document Version:** 1.1  
**Date:** October 6, 2025  
**Author:** Ramon de Noronha  
**Status:** Updated with Portal Architecture

---

## Overview

This document describes the complete onboarding flow for new members joining the CTN Association through the Association Service Register (ASR). The system uses **two separate portals** - one for members and one for administrators - with clear checkpoints and manual verification steps to ensure security and compliance.

**Demo Scenario:** A representative from Contargo GmbH wants to onboard their company to the CTN Association.

---

## Table of Contents

1. [Portal Architecture](#portal-architecture)
2. [User Journey Overview](#user-journey-overview)
3. [Detailed Flow Steps](#detailed-flow-steps)
4. [System Architecture](#system-architecture)
5. [Integration Points](#integration-points)
6. [Security & Compliance](#security--compliance)
7. [Token Issuance & Testing](#token-issuance--testing)
8. [Implementation Status](#implementation-status)

---

## Portal Architecture

### Two Separate Portals

**1. Member Portal** (`https://member.ctn-association.nl`)
- Member registration and onboarding
- Company profile management
- Endpoint configuration
- API credential management
- Token testing and verification
- Self-service documentation

**2. Admin Portal** (`https://admin.ctn-association.nl`)
- Secure admin authentication
- Member approval workflow
- KvK verification review (4-eyes principle)
- Token issuance
- System administration
- Audit logs and reporting
- Member status management

**Key Principle:** Clear separation of concerns with multiple checkpoints requiring admin approval to ensure quality and security.

---

## User Journey Overview

```
┌─────────────────────────────────────────────────────────────────────┐
│                    MEMBER ONBOARDING JOURNEY                         │
├──────────────────────────────────────────────────────────────────────┤
│                                                                       │
│  MEMBER PORTAL (member.ctn-association.nl)                           │
│  ──────────────────────────────────────────────────────              │
│  1. Account Creation          → Email + Password                     │
│  2. Email Verification        → Confirmation Link                    │
│  3. MFA Setup                 → Mobile Number + SMS/Authenticator    │
│  4. Company Registration      → Legal Details                        │
│  5. Document Upload           → KvK Statement (CoC)                  │
│  6. Automated Verification    → KvK API Check                        │
│                                                                       │
│  ↓ [System notifies admin via email]                                │
│                                                                       │
│  ADMIN PORTAL (admin.ctn-association.nl)                             │
│  ──────────────────────────────────────────────────────              │
│  7a. Admin Login              → Receives notification email          │
│  7b. Review Pending List      → View member with status "pending"    │
│  7c. Manual Verification      → 4-eyes check of KvK API results      │
│  7d. Approve Company Details  → Click "Approve"                      │
│                                                                       │
│  ↓ [System notifies member: "Company details approved"]             │
│                                                                       │
│  MEMBER PORTAL (continued)                                           │
│  ──────────────────────────────────────────────────────              │
│  8a. Member Logs In           → Sees approval notification           │
│  8b. Endpoint Registration    → API Endpoints & Contact Details      │
│  8c. Submit Endpoints         → Click "Submit for Review"            │
│                                                                       │
│  ↓ [System notifies admin: "Endpoints submitted"]                   │
│                                                                       │
│  ADMIN PORTAL (continued)                                            │
│  ──────────────────────────────────────────────────────              │
│  9a. Review Endpoints         → Validate URLs and contacts           │
│  9b. Issue Tokens             → Generate Client ID & Secret          │
│  9c. Share Credentials        → Email Client ID (best practice TBD)  │
│                                                                       │
│  ↓ [Member receives token credentials]                              │
│                                                                       │
│  MEMBER PORTAL (final)                                               │
│  ──────────────────────────────────────────────────────              │
│  10a. Receive Credentials     → Email with Client ID                 │
│  10b. Test Token              → Make test API call                   │
│  10c. Verify Connectivity     → Confirm endpoints work               │
│  10d. Report Success          → "Test successful" confirmation       │
│                                                                       │
│  ↓ [Member or Admin confirms testing successful]                    │
│                                                                       │
│  ADMIN PORTAL (final)                                                │
│  ──────────────────────────────────────────────────────              │
│  11a. Review Test Results     → Verify token works                   │
│  11b. Mark as Active          → Member status → ACTIVE               │
│  11c. Enable Discovery        → Endpoints now discoverable           │
│                                                                       │
│  ✅ ONBOARDING COMPLETE - Member is Active                           │
│                                                                       │
└─────────────────────────────────────────────────────────────────────┘
```

**Total Time:** 30-60 minutes (excluding admin response time)  
**Admin Checkpoints:** 3 (Company approval, Token issuance, Activation)  
**Automation Level:** High with manual 4-eyes verification at critical points

---

## Detailed Flow Steps

### Steps 1-6: Member Self-Registration

*These steps are identical to the previous specification - see [original flow](#step-1-account-creation)*

---

### Step 7: Administrator Review (4-Eyes Verification)

**Admin Receives Email Notification:**
```
Subject: New Member Registration - Contargo GmbH [ACTION REQUIRED]

Dear Administrator,

A new member has completed registration and automated verification:

Company Details:
- Legal Name: Contargo GmbH
- KvK Number: 12345678
- Domain: contargo.net
- Primary Contact: Hans Mueller (hans.mueller@contargo.net)

Automated Verification Results:
✅ KvK Number: Valid (12345678)
✅ Company Name: Match (98% confidence)
✅ Status: Active
✅ Document: KvK Statement uploaded and verified

Representative:
- Name: Hans Mueller
- Email: hans.mueller@contargo.net (verified)
- Phone: +31 10 123 4567 (MFA enabled)

ACTION REQUIRED:
Please log in to the Admin Portal to review and approve:
https://admin.ctn-association.nl/login?redirect=/pending/org-uuid

Quick Actions:
[Approve] [Request More Info] [Reject]

Documents:
- KvK Statement: [View PDF]
- Verification Report: [View Details]

Registered: 2025-10-06 10:21 CET

---
CTN Association Service Register
```

**Step 7a: Admin Portal Login**

Admin navigates to: `https://admin.ctn-association.nl/login`

```
┌─────────────────────────────────────────────────────────────┐
│ CTN Association - Admin Portal                              │
├─────────────────────────────────────────────────────────────┤
│                                                              │
│ Sign In                                                      │
│                                                              │
│ Email:    [admin@ctn-association.nl              ]          │
│ Password: [●●●●●●●●●●●●                          ]          │
│                                                              │
│ [x] Remember me        [Forgot password?]                   │
│                                                              │
│ [ Sign In ]                                                  │
│                                                              │
│ Secure Admin Access - MFA Required                          │
│                                                              │
└─────────────────────────────────────────────────────────────┘
```

**Step 7b: Review Pending Members List**

After login, admin sees dashboard with pending members:

```
┌─────────────────────────────────────────────────────────────┐
│ Pending Approvals (3 new)                                   │
├─────────────────────────────────────────────────────────────┤
│                                                              │
│ ⚠️ Contargo GmbH              Status: Pending Approval      │
│ KvK: 12345678                 Registered: 2 hours ago       │
│ Auto-Check: ✅ Passed (98%)   [Review Details]              │
│                                                              │
│ ───────────────────────────────────────────────────────     │
│                                                              │
│ 🔵 Transport Co BV            Status: Pending Approval      │
│ KvK: 87654321                 Registered: 1 day ago         │
│ Auto-Check: ⚠️ Name mismatch  [Review Details]              │
│                                                              │
│ ───────────────────────────────────────────────────────     │
│                                                              │
│ 🔵 Logistics Plus             Status: Endpoints Submitted   │
│ KvK: 11223344                 Approved: 3 days ago          │
│ Endpoints: Ready for review   [Review Details]              │
│                                                              │
└─────────────────────────────────────────────────────────────┘
```

**Step 7c: Manual Verification (4-Eyes Check)**

Admin clicks "Review Details" on Contargo GmbH:

```
┌─────────────────────────────────────────────────────────────┐
│ Member Review: Contargo GmbH                                 │
├─────────────────────────────────────────────────────────────┤
│                                                              │
│ Status: ⚠️ PENDING APPROVAL - Manual Review Required        │
│                                                              │
│ ═══════════════════════════════════════════════════════     │
│ COMPANY INFORMATION                                          │
│ ═══════════════════════════════════════════════════════     │
│                                                              │
│ Legal Name: Contargo GmbH                                    │
│ KvK Number: 12345678           ✅ Verified                   │
│ Domain:     contargo.net       ✅ Validated                  │
│ Address:    Nijverheidsweg 10, 3044 NN Rotterdam            │
│ Country:    Netherlands                                      │
│                                                              │
│ ═══════════════════════════════════════════════════════     │
│ AUTOMATED VERIFICATION RESULTS (KvK API)                     │
│ ═══════════════════════════════════════════════════════     │
│                                                              │
│ ✅ KvK Number Exists in Register                             │
│    KvK API Response: 12345678 (Actief)                       │
│                                                              │
│ ✅ Company Name Match (98% confidence)                       │
│    Submitted:  "Contargo GmbH"                               │
│    KvK Record: "Contargo GmbH"                               │
│    Match Score: 98%                                          │
│                                                              │
│ ✅ Company is Active                                         │
│    KvK Status: "Actief"                                      │
│    Registered: 2010-03-15                                    │
│                                                              │
│ ✅ Address Matches                                           │
│    Submitted:  Nijverheidsweg 10, 3044 NN Rotterdam         │
│    KvK Record: Nijverheidsweg 10, 3044NN Rotterdam          │
│                                                              │
│ [View Full KvK API Response]                                 │
│                                                              │
│ ═══════════════════════════════════════════════════════     │
│ DOCUMENTS                                                    │
│ ═══════════════════════════════════════════════════════     │
│                                                              │
│ 📄 KvK Statement (Chamber of Commerce)                      │
│    Uploaded: 2025-10-06 10:20 CET (2 hours ago)             │
│    File: contargo_kvk_statement.pdf (1.2 MB)                │
│    [Download PDF] [View in Browser]                          │
│                                                              │
│ ═══════════════════════════════════════════════════════     │
│ REPRESENTATIVE                                               │
│ ═══════════════════════════════════════════════════════     │
│                                                              │
│ Name:  Hans Mueller                                          │
│ Email: hans.mueller@contargo.net  ✅ Verified                │
│ Phone: +31 10 123 4567            ✅ MFA Enabled             │
│ Role:  IT Manager                                            │
│                                                              │
│ ═══════════════════════════════════════════════════════     │
│ ADMIN NOTES                                                  │
│ ═══════════════════════════════════════════════════════     │
│                                                              │
│ [Add internal notes...]                                      │
│                                                              │
│                                                              │
│ ═══════════════════════════════════════════════════════     │
│ DECISION                                                     │
│ ═══════════════════════════════════════════════════════     │
│                                                              │
│ ⚠️ Manual 4-Eyes Verification Required                       │
│                                                              │
│ Checklist:                                                   │
│ [ ] Company details match KvK register                       │
│ [ ] KvK document is valid and recent (< 3 months)           │
│ [ ] Representative email domain matches company domain       │
│ [ ] No red flags in company information                      │
│ [ ] All automated checks passed                              │
│                                                              │
│ [Approve Registration]  [Request More Info]  [Reject]       │
│                                                              │
└─────────────────────────────────────────────────────────────┘
```

**Step 7d: Admin Approves Company Details**

Admin clicks "Approve Registration":

```
┌─────────────────────────────────────────────────────────────┐
│ Confirm Approval                                             │
├─────────────────────────────────────────────────────────────┤
│                                                              │
│ You are about to approve:                                    │
│ Company: Contargo GmbH                                       │
│ KvK: 12345678                                                │
│                                                              │
│ This will:                                                   │
│ • Change status to "Company Approved"                        │
│ • Send approval email to member                              │
│ • Allow member to register endpoints                         │
│                                                              │
│ Admin comments (optional):                                   │
│ [All checks passed. Approved for onboarding.]               │
│                                                              │
│ [ Cancel ]  [ Confirm Approval ]                             │
│                                                              │
└─────────────────────────────────────────────────────────────┘
```

**System Action:**
- Updates organization status: `company_approved`
- Logs approval action with admin details
- Sends email to member
- Creates notification in member portal

**Email to Member:**
```
Subject: Company Details Approved - Next Steps

Dear Hans Mueller,

Good news! Your company registration has been approved by our administration team.

Company: Contargo GmbH
KvK Number: 12345678
Status: Company Details Approved ✅

NEXT STEPS:
Please log in to complete your registration by adding:
1. Your API endpoints
2. Technical and operational contact details

Login here:
https://member.ctn-association.nl/login?redirect=/endpoints

Once you submit your endpoints, our team will review them and issue your API credentials.

Questions? Reply to this email or contact support@ctn-association.nl

Best regards,
CTN Association Team

---
CTN Connecting the Netherlands
www.ctn-association.nl
```

---

### Step 8: Endpoint Registration (Member Portal)

**Step 8a: Member Logs In**

Member logs into Member Portal and sees notification:

```
┌─────────────────────────────────────────────────────────────┐
│ Welcome back, Hans Mueller                                   │
├─────────────────────────────────────────────────────────────┤
│                                                              │
│ 🎉 Your company details have been approved!                  │
│                                                              │
│ Next Step: Register your API endpoints                       │
│ [ Continue Setup → ]                                         │
│                                                              │
└─────────────────────────────────────────────────────────────┘
```

**Step 8b & 8c: Register and Submit Endpoints**

*(Form and process same as original specification)*

After submitting endpoints:

```
┌─────────────────────────────────────────────────────────────┐
│ Endpoints Submitted Successfully                             │
├─────────────────────────────────────────────────────────────┤
│                                                              │
│ ✅ Your API endpoints have been submitted for review.        │
│                                                              │
│ What happens next:                                           │
│ 1. Our team will review your endpoints                       │
│ 2. We'll verify connectivity and configuration               │
│ 3. You'll receive API credentials via email                  │
│                                                              │
│ Expected time: 1-2 business days                             │
│                                                              │
│ You can track the status in your dashboard.                  │
│                                                              │
│ [ View Dashboard ]                                           │
│                                                              │
└─────────────────────────────────────────────────────────────┘
```

**System Action:**
- Updates organization status: `endpoints_submitted`
- Sends email notification to administrators
- Creates admin task for review

**Email to Admin:**
```
Subject: Endpoints Submitted - Contargo GmbH [ACTION REQUIRED]

Dear Administrator,

Contargo GmbH has submitted their API endpoints for review.

Company: Contargo GmbH
KvK: 12345678
Status: Endpoints Submitted

Endpoints Registered:
• Production: https://api.contargo.net
  - Authentication: /oauth/token
  - Bookings: /v1/bookings
  - Tracking: /v1/tracking
  - Documents: /v1/documents

Technical Contact:
• Thomas Schmidt (thomas.schmidt@contargo.net)

Operations Contact:
• Maria van der Berg (maria.vandenberg@contargo.net)

ACTION REQUIRED:
Please review and issue tokens:
https://admin.ctn-association.nl/members/org-uuid/issue-tokens

[Review & Issue Tokens]

---
CTN Association Service Register
```

---

### Step 9: Token Issuance (Admin Portal)

**Step 9a: Admin Reviews Endpoints**

Admin logs into Admin Portal and navigates to pending tokens:

```
┌─────────────────────────────────────────────────────────────┐
│ Issue Tokens: Contargo GmbH                                  │
├─────────────────────────────────────────────────────────────┤
│                                                              │
│ Company: Contargo GmbH                                       │
│ KvK: 12345678                                                │
│ Status: Endpoints Submitted                                  │
│                                                              │
│ ═══════════════════════════════════════════════════════     │
│ REGISTERED ENDPOINTS                                         │
│ ═══════════════════════════════════════════════════════     │
│                                                              │
│ Production Environment:                                      │
│ Base URL: https://api.contargo.net                          │
│                                                              │
│ Endpoints:                                                   │
│ • /oauth/token     (Authentication)                          │
│ • /v1/bookings     (Booking API)                            │
│ • /v1/tracking     (Track & Trace)                          │
│ • /v1/documents    (Documents)                              │
│                                                              │
│ Callback URL: https://portal.contargo.net/auth/callback     │
│ Webhook URL:  https://portal.contargo.net/webhooks          │
│                                                              │
│ [Test Endpoint Connectivity]                                 │
│                                                              │
│ ═══════════════════════════════════════════════════════     │
│ CONTACTS                                                     │
│ ═══════════════════════════════════════════════════════     │
│                                                              │
│ Technical: Thomas Schmidt (thomas.schmidt@contargo.net)     │
│ Operations: Maria van der Berg (maria.vandenberg@...net)   │
│                                                              │
│ ═══════════════════════════════════════════════════════     │
│ TOKEN CONFIGURATION                                          │
│ ═══════════════════════════════════════════════════════     │
│                                                              │
│ Environment: [Production ▼]                                  │
│ Membership Level: [Silver ▼]                                 │
│                                                              │
│ Scopes (select all that apply):                              │
│ ✓ bvod:read         - Read organization data                 │
│ ✓ bvod:write        - Write organization data                │
│ ✓ bookings:read     - Read booking data                      │
│ ✓ bookings:write    - Create/update bookings                │
│ ✓ tracking:read     - Read tracking information              │
│ ✓ documents:read    - Read documents                         │
│ ✓ documents:write   - Upload documents                       │
│                                                              │
│ Rate Limits (based on Silver tier):                          │
│ • 100 requests/minute                                        │
│ • 10,000 requests/day                                        │
│                                                              │
│ [Generate Tokens]                                            │
│                                                              │
└─────────────────────────────────────────────────────────────┘
```

**Step 9b: Generate Tokens**

Admin clicks "Generate Tokens":

```
┌─────────────────────────────────────────────────────────────┐
│ Tokens Generated Successfully                                │
├─────────────────────────────────────────────────────────────┤
│                                                              │
│ ⚠️ SECURITY NOTICE                                           │
│ Client Secret is shown only once!                            │
│                                                              │
│ Client ID:                                                   │
│ contargo_prod_a1b2c3d4e5                                    │
│ [Copy]                                                       │
│                                                              │
│ Client Secret:                                               │
│ sk_live_9f8e7d6c5b4a3f2e1d0c9b8a7                          │
│ [Copy] [Download]                                            │
│                                                              │
│ Token Endpoint:                                              │
│ https://auth.ctn-association.nl/oauth/token                 │
│                                                              │
│ Created: 2025-10-06 14:30 CET                               │
│ Expires: Never (manual rotation recommended every 90 days)   │
│                                                              │
│ [Download as JSON]  [Send to Technical Contact]             │
│                                                              │
└─────────────────────────────────────────────────────────────┘
```

**System Action:**
- Generates RSA key pair (4096-bit)
- Stores keys in Azure Key Vault
- Creates OAuth client record
- Logs token generation event
- Updates organization status: `tokens_issued`

**Step 9c: Share Credentials**

Admin clicks "Send to Technical Contact". System presents options:

```
┌─────────────────────────────────────────────────────────────┐
│ Share Credentials - Security Best Practice                   │
├─────────────────────────────────────────────────────────────┤
│                                                              │
│ ⚠️ DISCUSSION REQUIRED: Best practice for sharing secrets    │
│                                                              │
│ Option 1: Email Client ID Only (Recommended)                 │
│ • Send Client ID via email                                   │
│ • Send Client Secret via separate secure channel            │
│ • Member retrieves secret from Member Portal (one-time view) │
│                                                              │
│ Option 2: Secure Link (Alternative)                          │
│ • Generate one-time access link                              │
│ • Link expires in 24 hours                                   │
│ • Accessed only once                                         │
│                                                              │
│ Option 3: Split Delivery                                     │
│ • Client ID via email                                        │
│ • Client Secret via SMS to verified phone                    │
│                                                              │
│ Select method: [Option 1: Email + Portal ▼]                  │
│                                                              │
│ [ Cancel ]  [ Send Credentials ]                             │
│                                                              │
└─────────────────────────────────────────────────────────────┘
```

**Email to Member (Client ID Only):**
```
Subject: API Credentials Generated - Contargo GmbH

Dear Hans Mueller,

Your API credentials have been generated and are ready for use.

CLIENT ID:
contargo_prod_a1b2c3d4e5

CLIENT SECRET:
For security, your Client Secret is available in the Member Portal.
Please log in to retrieve it (one-time view only):
https://member.ctn-association.nl/settings/api-credentials

IMPORTANT SECURITY INSTRUCTIONS:
• Store your Client Secret securely (Azure Key Vault, AWS Secrets Manager)
• Never commit credentials to version control
• Never share credentials via email or chat
• Rotate credentials every 90 days
• Report any suspected compromise immediately

TOKEN ENDPOINT:
https://auth.ctn-association.nl/oauth/token

NEXT STEPS:
1. Retrieve your Client Secret from the portal
2. Test your credentials using our testing guide
3. Report test results to complete onboarding

API Documentation:
https://docs.ctn-association.nl/api

Testing Guide:
https://docs.ctn-association.nl/api/testing

Need help? Contact technical support:
support@ctn-association.nl

---
CTN Association Service Register
```

---

### Step 10: Token Testing (Member Portal)

**Step 10a: Member Retrieves Client Secret**

Member logs into Member Portal:

```
┌─────────────────────────────────────────────────────────────┐
│ Your API Credentials                                         │
├─────────────────────────────────────────────────────────────┤
│                                                              │
│ ⚠️ CRITICAL: This is the only time the Client Secret will   │
│ be shown. Save it securely now!                              │
│                                                              │
│ Client ID:                                                   │
│ contargo_prod_a1b2c3d4e5                                    │
│ [Copy]                                                       │
│                                                              │
│ Client Secret: (visible for 5 minutes)                       │
│ sk_live_9f8e7d6c5b4a3f2e1d0c9b8a7●●●●●●●●                  │
│ [Show Full Secret] [Copy] [Download as JSON]                │
│                                                              │
│ Token Endpoint:                                              │
│ https://auth.ctn-association.nl/oauth/token                 │
│ [Copy]                                                       │
│                                                              │
│ ⏱️ Time Remaining: 4:37                                      │
│                                                              │
│ After this time, you cannot retrieve the secret again.       │
│ You will need to generate new credentials.                   │
│                                                              │
│ [I have saved my credentials securely] ✓                     │
│                                                              │
└─────────────────────────────────────────────────────────────┘
```

**Step 10b: Test Token**

Member Portal provides testing interface:

```
┌─────────────────────────────────────────────────────────────┐
│ Test Your API Credentials                                    │
├─────────────────────────────────────────────────────────────┤
│                                                              │
│ Step 1: Get Access Token                                     │
│                                                              │
│ Request:                                                     │
│ curl -X POST https://auth.ctn-association.nl/oauth/token \  │
│   -H "Content-Type: application/x-www-form-urlencoded" \    │
│   -d "grant_type=client_credentials" \                       │
│   -d "client_id=contargo_prod_a1b2c3d4e5" \                 │
│   -d "client_secret=YOUR_SECRET" \                           │
│   -d "scope=bvod:read"                                       │
│                                                              │
│ [Run Test]                                                   │
│                                                              │
│ Response:                                                    │
│ {                                                            │
│   "access_token": "eyJhbGciOiJSUzI1NiIsInR5cCI6IkpXVCJ9...",│
│   "token_type": "Bearer",                                    │
│   "expires_in": 3600,                                        │
│   "scope": "bvod:read"                                       │
│ }                                                            │
│                                                              │
│ ✅ Token generated successfully!                             │
│                                                              │
│ ───────────────────────────────────────────────────────     │
│                                                              │
│ Step 2: Test API Call                                        │
│                                                              │
│ Request:                                                     │
│ curl -X GET \                                                │
│   https://api.ctn-association.nl/v1/bvod/organizations/... \│
│   -H "Authorization: Bearer YOUR_ACCESS_TOKEN"               │
│                                                              │
│ [Run Test]                                                   │
│                                                              │
│ Response:                                                    │
│ {                                                            │
│   "org_id": "uuid-here",                                     │
│   "legal_name": "Contargo GmbH",                             │
│   "kvk": "12345678",                                         │
│   "status": "active"                                         │
│ }                                                            │
│                                                              │
│ ✅ API call successful!                                      │
│                                                              │
│ ───────────────────────────────────────────────────────     │
│                                                              │
│ Step 3: Test Your Endpoints                                  │
│                                                              │
│ Test connectivity to your registered endpoints:              │
│                                                              │
│ ✅ https://api.contargo.net/oauth/token                      │
│ ✅ https://api.contargo.net/v1/bookings                      │
│ ✅ https://api.contargo.net/v1/tracking                      │
│ ✅ https://api.contargo.net/v1/documents                     │
│                                                              │
│ [ Run Connectivity Tests ]                                   │
│                                                              │
└─────────────────────────────────────────────────────────────┘
```

**Step 10c & 10d: Verify and Report**

After successful testing:

```
┌─────────────────────────────────────────────────────────────┐
│ Testing Complete                                             │
├─────────────────────────────────────────────────────────────┤
│                                                              │
│ ✅ All tests passed successfully!                            │
│                                                              │
│ Results:                                                     │
│ ✅ Token generation: Success                                 │
│ ✅ API authentication: Success                               │
│ ✅ Endpoint connectivity: All endpoints reachable            │
│                                                              │
│ Your integration is ready to go live.                        │
│                                                              │
│ IMPORTANT: Please confirm testing is complete                │
│                                                              │
│ By confirming, you certify that:                             │
│ • Tokens work correctly                                      │
│ • All endpoints are accessible                               │
│ • You're ready for production use                            │
│                                                              │
│ [ Confirm - Request Activation ]                             │
│                                                              │
└─────────────────────────────────────────────────────────────┘
```

**System Action:**
- Logs test results
- Updates organization status: `testing_complete`
- Notifies admin
- Creates activation request

---

### Step 11: Final Activation (Admin Portal)

**Admin Receives Notification:**
```
Subject: Token Testing Complete - Contargo GmbH [ACTIVATION REQUIRED]

Dear Administrator,

Contargo GmbH has successfully completed token testing.

Company: Contargo GmbH
KvK: 12345678
Status: Testing Complete

Test Results:
✅ Token Generation: Success
✅ API Authentication: Success
✅ Endpoint Connectivity: All endpoints reachable
✅ Member Confirmation: Certified ready for production

ACTION REQUIRED:
Please activate the member to enable endpoint discovery:
https://admin.ctn-association.nl/members/org-uuid/activate

[Activate Member]

---
CTN Association Service Register
```

**Step 11a & 11b: Admin Reviews and Activates**

Admin reviews test results and activates member:

```
┌─────────────────────────────────────────────────────────────┐
│ Activate Member: Contargo GmbH                               │
├─────────────────────────────────────────────────────────────┤
│                                                              │
│ Company: Contargo GmbH                                       │
│ KvK: 12345678                                                │
│ Status: Testing Complete → Ready for Activation              │
│                                                              │
│ ═══════════════════════════════════════════════════════     │
│ TEST RESULTS                                                 │
│ ═══════════════════════════════════════════════════════     │
│                                                              │
│ ✅ Token Generation: Success (2025-10-06 15:00)              │
│ ✅ API Authentication: Success (2025-10-06 15:01)            │
│ ✅ Endpoint Tests: All passed (2025-10-06 15:02)            │
│ ✅ Member Confirmed: Ready for production                    │
│                                                              │
│ [View Detailed Test Logs]                                    │
│                                                              │
│ ═══════════════════════════════════════════════════════     │
│ ACTIVATION                                                   │
│ ═══════════════════════════════════════════════════════     │
│                                                              │
│ Activating this member will:                                 │
│ • Change status to "ACTIVE"                                  │
│ • Make endpoints discoverable in the registry                │
│ • Enable full API access                                     │
│ • Send activation confirmation email                         │
│                                                              │
│ Membership Level: [Silver ▼]                                 │
│                                                              │
│ Admin notes:                                                 │
│ [Testing successful. Approved for activation.]              │
│                                                              │
│ [ Cancel ]  [ Activate Member ]                              │
│                                                              │
└─────────────────────────────────────────────────────────────┘
```

**Step 11c: Endpoints Now Discoverable**

After activation:

```
┌─────────────────────────────────────────────────────────────┐
│ Member Activated Successfully                                │
├─────────────────────────────────────────────────────────────┤
│                                                              │
│ ✅ Contargo GmbH is now ACTIVE                               │
│                                                              │
│ Status changed:                                              │
│ Testing Complete → ACTIVE                                    │
│                                                              │
│ Actions completed:                                           │
│ ✅ Member marked as active                                   │
│ ✅ Endpoints published to registry                           │
│ ✅ Discovery enabled                                         │
│ ✅ Confirmation email sent                                   │
│                                                              │
│ The member can now be discovered by other participants.      │
│                                                              │
│ [ View Member Profile ]  [ Back to Dashboard ]               │
│                                                              │
└─────────────────────────────────────────────────────────────┘
```

**Email to Member:**
```
Subject: Welcome! Your Membership is Now Active 🎉

Dear Hans Mueller,

Congratulations! Your membership with CTN Association is now active.

Company: Contargo GmbH
KvK: 12345678
Status: ✅ ACTIVE
Membership Level: Silver

YOUR INTEGRATION IS LIVE:
✅ API credentials are active
✅ Endpoints are discoverable
✅ Full access to association network
✅ Ready for production data exchange

WHAT YOU CAN DO NOW:
• Exchange BVOD data with other members
• Create and manage bookings
• Track shipments
• Share documents

MEMBER PORTAL:
Access your dashboard: https://member.ctn-association.nl/dashboard

API DOCUMENTATION:
https://docs.ctn-association.nl/api

SUPPORT:
Technical: support@ctn-association.nl
Emergency: +31 (0)20 123 4567 (24/7)

Welcome to the CTN Association! We're excited to have you as part of
our network connecting logistics across the Netherlands and beyond.

Best regards,
CTN Association Team

---
CTN Connecting the Netherlands
Building the digital infrastructure for logistics
www.ctn-association.nl
```

---

## Summary

**Complete Onboarding Flow with Dual Portals:**

1. ✅ **Member Portal** - Self-service registration (Steps 1-6)
2. ✅ **Admin Portal** - Manual verification of company details (Step 7)
3. ✅ **Member Portal** - Endpoint registration (Step 8)
4. ✅ **Admin Portal** - Token issuance (Step 9)
5. ✅ **Member Portal** - Token testing and verification (Step 10)
6. ✅ **Admin Portal** - Final activation and discovery enablement (Step 11)

**Key Features:**
- **Dual Portal Architecture**: Clear separation between member and admin functions
- **4-Eyes Principle**: Manual verification at critical checkpoints
- **Multiple Checkpoints**: 3 admin review points ensure quality
- **Secure Credentials**: Best practices for token delivery (TBD)
- **Testing Before Activation**: Ensures integration works before going live
- **Audit Trail**: Complete logging of all actions

**Open Items for Discussion:**
1. Best practice for securely sharing Client Secret
2. Token testing process - member vs. admin initiated
3. Auto-activation vs. manual activation after successful tests
4. Credential rotation policy
5. Emergency revocation procedures

---

**Document Owner:** Ramon de Noronha  
**Last Updated:** October 6, 2025 (v1.1 - Added dual portal architecture)  
**Status:** Ready for Review  
**Next Steps:** Discuss token delivery security and begin implementation
