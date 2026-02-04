# CTN Endpoint Lifecycle Demo Summary

**Date:** February 4, 2026
**Audience:** Poort8

---

## Overview

The CTN (Cargo Trust Network) Member Portal now implements a comprehensive 6-phase endpoint lifecycle for secure data sharing between organizations. This document summarizes the implementation for demonstration purposes.

---

## The 4-Step Data Sharing Flow

The member portal guides users through a clear 4-step process:

### Step 1: System Credentials
**Tab: "1. System Credentials"**

- Create OAuth 2.0 M2M (Machine-to-Machine) client credentials
- Each client gets a unique Client ID and Secret
- Used by backend systems (TMS, ERP, etc.) to authenticate with CTN endpoints
- Supports granular scope-based permissions

### Step 2: Publish Your Endpoints
**Tab: "2. Publish"**

Provider flow for sharing your data:
1. **Register** - Create a new endpoint with name, URL, description
2. **Verify** - Callback challenge-response proves you own the endpoint
3. **Choose Access Model**:
   - **Open** - Any CTN member gets immediate access (auto-approve)
   - **Restricted** - Each access request requires your manual approval
   - **Private** - Invitation-only, not visible in directory
4. **Publish** - Makes endpoint visible in CTN Directory (or keep as draft)

### Step 3: Discover Other Endpoints
**Tab: "3. Discover"**

Consumer flow for finding and accessing data:
1. Browse the CTN Directory of published endpoints
2. See provider names, data categories, access models
3. Request access with optional message/scopes
4. Open endpoints grant access immediately
5. Restricted endpoints show "Pending" until provider approves

### Step 4: My Connections
**Tab: "4. My Connections"**

View and manage your active connections:
- See all endpoints you have access to
- View endpoint URLs, granted scopes, provider details
- Track when access was granted
- Revoke your own access if needed
- See history of revoked grants

---

## Technical Implementation

### Database Schema (Migration 066)

New tables added:
- `endpoint_access_request` - Tracks access requests between consumers and providers
- `endpoint_consumer_grant` - Active access grants with scopes and revocation tracking

New columns on `legal_entity_endpoint`:
- `access_model` - 'open', 'restricted', or 'private'
- `publication_status` - 'draft', 'published', or 'unpublished'
- `published_at` / `unpublished_at` - Timestamps

### API Endpoints

**Publication (Phase 3):**
- `POST /api/v1/endpoints/:id/publish` - Publish to directory
- `POST /api/v1/endpoints/:id/unpublish` - Remove from directory

**Consumer Discovery (Phase 4):**
- `GET /api/v1/endpoint-directory` - Browse published endpoints

**Access Requests (Phase 4-5):**
- `POST /api/v1/endpoints/:id/request-access` - Request access
- `GET /api/v1/endpoints/:id/access-requests` - View requests (provider)
- `POST /api/v1/access-requests/:id/approve` - Approve request
- `POST /api/v1/access-requests/:id/deny` - Deny request

**Grants (Phase 6):**
- `GET /api/v1/my-access-grants` - View my granted access
- `POST /api/v1/grants/:id/revoke` - Revoke a grant

### API Tests (All Passing)

```bash
# Directory listing
GET /api/v1/endpoint-directory ✓

# My access grants
GET /api/v1/my-access-grants ✓

# Request access (auto-approves for open endpoints)
POST /api/v1/endpoints/:id/request-access ✓

# Revoke grant
POST /api/v1/grants/:id/revoke ✓
```

---

## Demo Flow

### As a Provider:

1. **Login** to Member Portal
2. Go to **"2. Publish"** tab
3. Click **"Register New Endpoint"**
4. Fill in:
   - Name: "My Booking API"
   - URL: https://api.example.com/bookings
   - Description: "Real-time booking data"
   - Data Category: DATA_EXCHANGE
   - Access Model: **Restricted** (show manual approval)
5. Click **"Verify"** (callback challenge)
6. Click **"Publish"** to make it visible in directory

### As a Consumer:

1. Go to **"3. Discover"** tab
2. Browse the CTN Directory
3. Find an endpoint, click **"Request Access"**
4. For **open** endpoints: instant access
5. For **restricted** endpoints: wait for approval
6. Go to **"4. My Connections"** to see your active grants

### Showing Provider Approval:

1. Provider logs in
2. Goes to **"2. Publish"** tab
3. Sees pending requests badge
4. Opens endpoint details
5. Approves or denies with reason

---

## URLs

- **Member Portal:** https://calm-pebble-043b2db03.1.azurestaticapps.net
- **Admin Portal:** https://calm-tree-03352ba03.1.azurestaticapps.net
- **API Health:** https://ca-ctn-asr-api-dev.calmriver-700a8c55.westeurope.azurecontainerapps.io/api/health

**Test Account:**
- Email: test-e2@denoronha.consulting
- Password: Madu5952
- Role: SystemAdmin

---

## Key Differentiators

1. **Callback Verification** - Proves endpoint ownership via challenge-response
2. **Three Access Models** - Open, Restricted, Private for flexible control
3. **Provider Control** - Full visibility and approval workflow
4. **Consumer Self-Service** - Browse, request, manage without admin intervention
5. **Complete Audit Trail** - Who requested, when approved, why revoked

---

## Next Steps (Future Enhancements)

- Email notifications for access requests
- Webhook notifications for real-time updates
- Analytics dashboard for endpoint usage
- SLA monitoring for response times
- Bulk import/export of endpoint configurations

---

*Document generated: February 4, 2026*
