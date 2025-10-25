# Implementation Plan: M2M Authentication for CTN API

## Overview
**Goal**: Implement machine-to-machine (M2M) authentication using Azure AD Client Credentials Flow with scope-based permissions for external container systems to access CTN API securely.
**Estimated Stages**: 5
**Feature Branch**: feature/m2m-authentication

---

## Stage 1: Azure AD App Roles Configuration
**Goal**: Define application roles (scopes) in Azure AD for M2M clients
**Success Criteria**:
- [ ] 5 app roles defined in Azure AD (ETA.Read, Container.Read, Booking.Read, Booking.Write, Orchestration.Read)
- [ ] App roles visible in Azure Portal → App Registrations → CTN API → App roles
- [ ] Each role has proper description and is enabled

**Tests**:
- Verify app roles exist in Azure AD using `az ad app show`
- Confirm roles have "Application" member type (not "User")

**Status**: Not Started

**Implementation Notes**:
- Use Azure CLI to create app roles programmatically
- Generate UUIDs for each role ID
- Set allowedMemberTypes to ["Application"] for M2M clients

---

## Stage 2: Test M2M Client Registration
**Goal**: Create test M2M client app registration with assigned permissions
**Success Criteria**:
- [ ] Test client app registration created (CTN-M2M-TestClient)
- [ ] Client secret generated and stored in Azure Key Vault
- [ ] Service principal created for test client
- [ ] ETA.Read and Container.Read roles assigned to test client
- [ ] Permissions granted (admin consent)

**Tests**:
- Get access token using client credentials flow
- Verify token contains correct roles claim
- Confirm token audience matches API app ID

**Status**: Not Started

**Implementation Notes**:
- Use client credentials grant type
- Store client secret in kv-ctn-demo-asr-dev
- Document test client credentials for TE agent

---

## Stage 3: M2M Token Validation Middleware
**Goal**: Extend existing auth.ts middleware to validate M2M tokens with scope enforcement
**Success Criteria**:
- [ ] validateM2MToken function added to auth.ts
- [ ] Token validation checks: signature, expiration, issuer, audience
- [ ] Scope validation logic implemented
- [ ] requireScopes middleware wrapper created
- [ ] M2M authentication logged with client ID
- [ ] Clear error messages for missing scopes (403)

**Tests**:
- Unit test: validate token with correct scopes (should pass)
- Unit test: validate token with missing scopes (should fail with 403)
- Unit test: validate expired token (should fail)
- Unit test: validate token with wrong issuer (should fail)

**Status**: Not Started

**Implementation Notes**:
- Reuse existing JWT validation infrastructure (jwks-rsa, jsonwebtoken)
- M2M tokens use "roles" claim (not user tokens' "scp" claim)
- Support both user tokens and M2M tokens in same middleware
- Add client ID to context for audit logging

---

## Stage 4: Apply Scope Requirements to Endpoints
**Goal**: Create example endpoints with scope enforcement and document pattern
**Success Criteria**:
- [ ] ETA updates endpoint created/updated with ETA.Read scope
- [ ] Container status endpoint created/updated with Container.Read scope
- [ ] Booking endpoints protected with Booking.Read/Write scopes
- [ ] All endpoints use requireScopes middleware
- [ ] Client ID logged in audit trail for M2M requests

**Tests**:
- Test ETA endpoint with valid token (should succeed)
- Test ETA endpoint with token missing ETA.Read (should fail 403)
- Test Booking POST with Booking.Read only (should fail 403)
- Test Booking POST with Booking.Write (should succeed)

**Status**: Not Started

**Implementation Notes**:
- Apply to existing endpoints if they exist, or create stubs
- Follow existing endpoint patterns in api/src/functions/
- Document scope requirements in endpoint comments
- Update essential-index.ts to register new endpoints

---

## Stage 5: Integration Testing and Documentation
**Goal**: Create comprehensive test suite and deployment documentation
**Success Criteria**:
- [ ] Test script created: api/tests/test-m2m-auth.sh
- [ ] Test script covers: token acquisition, valid scopes, missing scopes, no token
- [ ] All tests pass locally
- [ ] TE agent validates all scenarios
- [ ] README updated with M2M authentication documentation
- [ ] Client onboarding guide created

**Tests**:
- End-to-end test: External client → Token → API call → Success
- Negative test: Token with wrong scope → 403
- Negative test: No token → 401
- Performance test: 100 requests with same token

**Status**: Not Started

**Implementation Notes**:
- Use curl for API testing (CLAUDE.md requirement)
- Create reusable test functions
- Invoke TE agent for comprehensive testing
- Document example token requests for external clients

---

## Stage 6 (Optional): Azure API Management
**Goal**: Deploy APIM for rate limiting and analytics (if time permits)
**Success Criteria**:
- [ ] APIM Consumption tier instance created
- [ ] CTN API imported into APIM
- [ ] JWT validation policy applied
- [ ] Rate limiting by client ID configured (1000 req/hour)
- [ ] APIM URL documented for production use

**Tests**:
- Test API calls through APIM
- Verify rate limiting triggers after 1000 requests
- Confirm JWT validation at APIM layer

**Status**: Not Started

**Implementation Notes**:
- APIM creation takes 5-10 minutes
- Use consumption tier for cost efficiency
- This is optional Phase 2 - prioritize Phase 1 first

---

## Progress Tracking
- [ ] Stage 1: Azure AD App Roles - Not Started
- [ ] Stage 2: Test M2M Client - Not Started
- [ ] Stage 3: M2M Middleware - Not Started
- [ ] Stage 4: Endpoint Protection - Not Started
- [ ] Stage 5: Testing & Docs - Not Started
- [ ] Stage 6: APIM (Optional) - Not Started

---

## Deployment Checklist
- [ ] All code committed to feature branch
- [ ] Frequent commits with descriptive messages
- [ ] TE agent testing completed
- [ ] No secrets in code (all in Key Vault)
- [ ] Pipeline passes on feature branch
- [ ] Ready for user review (DO NOT MERGE TO MAIN)

---

**Last Updated**: October 25, 2025 (created)
**Current Stage**: Starting Stage 1
