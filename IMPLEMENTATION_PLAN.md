# Implementation Plan: Structured Logging with Winston

## Overview
**Goal**: Add production-ready logging framework to Azure Functions API with structured output, correlation IDs, and security event logging
**Estimated Stages**: 4

---

## Stage 1: Enhance Existing Logger Infrastructure
**Goal**: Add correlation ID support and request/response logging to existing AppInsightsLogger
**Success Criteria**:
- [x] Correlation ID generation and tracking added
- [x] Request logging helper created
- [x] Response logging helper created
- [x] Security event logging enhanced
- [x] Performance tracking already exists (verified)
- [x] Logger exports uuid dependency
- [x] Build passes

**Tests**:
- Correlation IDs generated correctly
- Request/response logs capture expected fields
- Security events logged with proper structure

**Status**: Complete

---

## Stage 2: Integrate Logging into Auth Middleware
**Goal**: Add structured logging to authentication middleware
**Success Criteria**:
- [x] Auth middleware uses AppInsightsLogger
- [x] Correlation IDs tracked through auth flow
- [x] Authentication success/failure logged
- [x] Security events logged for auth failures
- [x] JWT validation errors captured with context
- [x] Request/response timing tracked
- [x] X-Correlation-ID header returned in responses

**Tests**:
- Successful auth → info level log with correlation ID
- Missing token → security event logged
- Invalid token → security event with details
- Correlation IDs consistent across logs

**Status**: Complete

---

## Stage 3: Integrate Logging into RBAC Middleware
**Goal**: Add structured logging to authorization middleware
**Success Criteria**:
- [x] rbac.ts updated with authorization event logging
- [x] Security events logged for failed authz
- [x] Correlation IDs tracked through authz flow
- [x] Success/failure logged with user context
- [x] Required roles/permissions logged

**Tests**:
- Authorization logs show role checks
- Security events captured for authorization failures
- Correlation IDs consistent across request lifecycle

**Status**: Complete

**Note**: Individual API functions don't need logging updates because:
- endpointWrapper.ts already logs request/response with timing
- authenticate() middleware now logs all auth events
- requireRoles()/requirePermissions() now log all authz events
- Error handling is centralized in wrapEndpoint()
- Request IDs already tracked throughout

---

## Stage 4: Documentation and Testing
**Goal**: Complete documentation and verify logging works end-to-end
**Success Criteria**:
- [x] logging.md documentation created (comprehensive guide)
- [x] Build passes
- [x] All middleware updated
- [x] Correlation ID flow implemented
- [x] Security event logging in place
- [x] Auth/authz logging integrated

**Tests** (to be verified after deployment):
- Successful request → info level log
- Client error (400) → warn level log
- Server error (500) → error level log
- Authentication failure → security event
- Correlation IDs traced across requests

**Status**: Complete

**Implementation Notes**:
- No .gitignore changes needed (no file logging in Azure Functions)
- No .env.example changes needed (uses Application Insights automatic config)
- Logging is automatic through middleware - no function-level changes needed
- Application Insights integration is built into Azure Functions context

---

## Progress Tracking
- [x] Stage 1 complete - Logger infrastructure enhanced
- [x] Stage 2 complete - Auth middleware logging
- [x] Stage 3 complete - RBAC middleware logging
- [x] Stage 4 complete - Documentation
- [x] Build passing
- [x] Documentation complete

## Summary

Structured logging has been successfully implemented using the existing Application Insights integration:

**Enhanced:**
- `/api/src/utils/logger.ts` - Added correlation IDs and HTTP logging helpers
- `/api/src/middleware/auth.ts` - Full authentication event logging
- `/api/src/middleware/rbac.ts` - Full authorization event logging

**Created:**
- `/api/docs/logging.md` - Comprehensive logging guide

**Key Features:**
- Correlation ID tracking (X-Correlation-ID header)
- Automatic request/response logging
- Security event logging
- Performance tracking
- Azure Application Insights integration
- No individual function changes needed (middleware handles all logging)
