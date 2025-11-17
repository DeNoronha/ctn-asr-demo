# SEC-007: Rate Limiter Circuit Breaker Implementation

**Date:** November 17, 2025
**Security Issue:** CWE-755 - Improper Handling of Exceptional Conditions
**Severity:** High
**Status:** Fixed

## Executive Summary

Fixed critical security vulnerability where the rate limiter failed OPEN (allowed unlimited requests) when Redis became unavailable, creating a DoS attack vector. Implemented circuit breaker pattern to fail CLOSED (block requests) when rate limiting services are unavailable.

## Vulnerability Description

### Before (Vulnerable Code)

```typescript
// api/src/middleware/rateLimiter.ts:205-209
try {
  // Rate limit check
} catch (error) {
  console.error('Error checking rate limit:', error);
  return {
    allowed: true, // ❌ SECURITY ISSUE: Allows unlimited requests on error
    remaining: -1,
    resetTime: new Date(),
  };
}
```

### Attack Scenario

1. Attacker triggers rate limiter exceptions (e.g., memory exhaustion, Redis connection errors)
2. Rate limiter catches error and fails OPEN
3. All requests bypass rate limiting
4. Attacker launches DoS attack with unlimited requests
5. API becomes unavailable for legitimate users

### CVSS 3.1 Score: 6.5 (MEDIUM → HIGH in production context)

**Vector:** `CVSS:3.1/AV:N/AC:L/PR:N/UI:N/S:U/C:N/I:N/A:L`

- **Attack Vector (AV:N):** Network - remotely exploitable
- **Attack Complexity (AC:L):** Low - minimal effort to trigger errors
- **Privileges Required (PR:N):** None - unauthenticated attack
- **User Interaction (UI:N):** None
- **Scope (S:U):** Unchanged
- **Confidentiality (C:N):** No data breach
- **Integrity (I:N):** No data modification
- **Availability (A:L):** Low availability impact (upgraded to HIGH in production)

**Why HIGH severity despite CVSS 6.5:**
- Production impact: Complete DoS capability
- No compensating controls when rate limiter fails
- Exploitation difficulty: Low (trigger Redis errors)
- Business impact: Service outage, revenue loss

## Solution Architecture

### Circuit Breaker Pattern

Implemented three-state circuit breaker:

```
┌─────────────────────────────────────────────────┐
│            CLOSED (Normal Operation)            │
│  - All requests processed through Redis        │
│  - Track failures in sliding window            │
└──────────────┬──────────────────────────────────┘
               │
               │ Error threshold exceeded (5 failures)
               ↓
┌─────────────────────────────────────────────────┐
│              OPEN (Fail Closed)                 │
│  - Block ALL requests with 503                  │
│  - No Redis calls attempted                     │
│  - Wait for timeout (60 seconds)                │
└──────────────┬──────────────────────────────────┘
               │
               │ Timeout expires
               ↓
┌─────────────────────────────────────────────────┐
│          HALF_OPEN (Testing Recovery)           │
│  - Allow limited test requests (3 max)          │
│  - If success → transition to CLOSED            │
│  - If failure → back to OPEN                    │
└─────────────────────────────────────────────────┘
```

### Rate Limiting Architecture

**Before (Vulnerable):**
```
Request → In-Memory Rate Limiter → [Error] → ALLOW (fail open) → API
```

**After (Secure):**
```
Request → Circuit Breaker → Redis Rate Limiter → API
                ↓
          [Error/OPEN]
                ↓
           503 Service Unavailable (fail closed)
```

## Implementation Details

### 1. Circuit Breaker Configuration

**File:** `api/src/config/constants.ts`

```typescript
export const CIRCUIT_BREAKER = {
  /** Number of consecutive failures before opening circuit */
  ERROR_THRESHOLD: 5,

  /** Duration to keep circuit open (milliseconds) - 60 seconds */
  OPEN_DURATION_MS: 60000,

  /** Maximum test requests allowed in half-open state */
  HALF_OPEN_MAX_REQUESTS: 3,

  /** Time window for tracking errors (milliseconds) - 5 minutes */
  MONITOR_WINDOW_MS: 300000,
} as const;
```

### 2. Redis Client Implementation

**File:** `api/src/utils/redisClient.ts`

**Key Features:**
- Sliding window rate limiting (more accurate than fixed windows)
- Distributed rate limiting across Azure Function instances
- TLS encryption for Azure Redis Cache
- Automatic reconnection with exponential backoff

**Algorithm:**
```typescript
async function checkRateLimitRedis(key: string, limit: number, windowMs: number) {
  1. Remove expired entries (older than windowMs)
  2. Count remaining entries in sorted set
  3. If count >= limit: REJECT request
  4. If count < limit: Add entry + ALLOW request
  5. Set expiration on key for cleanup
}
```

### 3. Circuit Breaker Class

**File:** `api/src/utils/circuitBreaker.ts`

**State Management:**
- `CLOSED`: Normal operation, tracks failures
- `OPEN`: Blocks all requests after threshold
- `HALF_OPEN`: Tests recovery with limited requests

**Application Insights Events:**
- `CircuitBreakerOpened`: Circuit transitioned to OPEN
- `CircuitBreakerHalfOpen`: Testing recovery
- `CircuitBreakerClosed`: Recovered to normal operation

### 4. Updated Rate Limiter Middleware

**File:** `api/src/middleware/rateLimiter.ts`

**Security Fix:**
```typescript
try {
  const result = await circuitBreaker.execute(async () => {
    return await checkRateLimitRedis(key, limit, windowMs, context);
  });

  if (!result.allowed) {
    return { status: 429, body: 'Too many requests' };
  }

  return { allowed: true };
} catch (error) {
  // **SECURITY FIX: FAIL CLOSED**
  return {
    allowed: false,
    response: {
      status: 503,
      body: {
        error: 'service_unavailable',
        error_description: 'Rate limiting service temporarily unavailable',
        retry_after: 60
      }
    }
  };
}
```

## Environment Variables

### Required for Redis

```bash
# Azure Redis Cache connection
REDIS_HOST=<redis-name>.redis.cache.windows.net
REDIS_PORT=6380  # Azure default
REDIS_PASSWORD=<access-key>
REDIS_TLS=true   # Required for Azure Redis Cache
REDIS_DB=0       # Database number (default: 0)

# Optional
REDIS_KEY_PREFIX=asr:ratelimit:  # Default prefix
REDIS_ENABLED=true               # Set to 'false' to use in-memory only
```

### Azure Redis Cache Setup

```bash
# Create Azure Redis Cache (Standard tier)
az redis create \
  --resource-group rg-ctn-demo-asr-dev \
  --name redis-ctn-asr-dev \
  --location eastus \
  --sku Standard \
  --vm-size c1 \
  --enable-non-ssl-port false

# Get access keys
az redis list-keys \
  --resource-group rg-ctn-demo-asr-dev \
  --name redis-ctn-asr-dev
```

### Add to Azure Function App Settings

```bash
# Get Redis access key from Azure
REDIS_KEY=$(az redis list-keys --resource-group rg-ctn-demo-asr-dev --name redis-ctn-asr-dev --query primaryKey -o tsv)

az functionapp config appsettings set \
  --name func-ctn-demo-asr-dev \
  --resource-group rg-ctn-demo-asr-dev \
  --settings \
    REDIS_HOST="redis-ctn-asr-dev.redis.cache.windows.net" \
    REDIS_PORT="6380" \
    REDIS_PASSWORD="$REDIS_KEY" \
    REDIS_TLS="true" \
    REDIS_ENABLED="true"
```

## Testing

### Unit Tests

**File:** `api/src/utils/__tests__/circuitBreaker.test.ts`

**Coverage:**
- State transitions (CLOSED → OPEN → HALF_OPEN → CLOSED)
- Error threshold enforcement
- Half-open request limiting
- Manual reset functionality
- Statistics reporting

**Run tests:**
```bash
cd api
npm test -- circuitBreaker.test.ts
```

### Integration Testing

**Test Scenario 1: Circuit Breaker Opens**
```bash
# Kill Redis
docker stop redis

# Send requests - should see 503 after 5 failures
for i in {1..10}; do
  curl -i https://func-ctn-demo-asr-dev.azurewebsites.net/api/health
done

# Expected: First 5 may succeed (in-memory fallback), then 503s
```

**Test Scenario 2: Circuit Breaker Recovers**
```bash
# Start Redis
docker start redis

# Wait 60 seconds for circuit to enter HALF_OPEN

# Send test request - should succeed and close circuit
curl -i https://func-ctn-demo-asr-dev.azurewebsites.net/api/health
```

### Load Testing

**Verify rate limiting under high traffic:**
```bash
# Install k6
brew install k6

# Run load test
k6 run load-test.js

# Expected behavior:
# - First 100 requests/min: 200 OK
# - Additional requests: 429 Too Many Requests
# - Circuit breaker prevents DoS even if Redis fails
```

## Monitoring & Alerts

### Application Insights Queries

**Circuit Breaker State Changes:**
```kusto
customEvents
| where name in ("CircuitBreakerOpened", "CircuitBreakerHalfOpen", "CircuitBreakerClosed")
| project timestamp, name, customDimensions
| order by timestamp desc
```

**Rate Limit Failures:**
```kusto
traces
| where message contains "Rate limiter failed"
| project timestamp, message, customDimensions
| order by timestamp desc
```

**503 Responses (Fail-Closed):**
```kusto
requests
| where resultCode == "503"
| where name contains "api"
| summarize count() by bin(timestamp, 5m)
| render timechart
```

### Recommended Alerts

**1. Circuit Breaker Opened**
```kusto
customEvents
| where name == "CircuitBreakerOpened"
| where timestamp > ago(5m)
```

**Alert Settings:**
- Severity: High
- Frequency: 5 minutes
- Action: Page on-call engineer, create incident

**2. High Rate of 503 Errors**
```kusto
requests
| where resultCode == "503"
| where timestamp > ago(5m)
| summarize count()
| where count_ > 100
```

**Alert Settings:**
- Severity: Medium
- Frequency: 5 minutes
- Action: Email DevOps team

## Rollback Plan

If circuit breaker causes issues, disable Redis rate limiting:

```bash
# Fallback to in-memory rate limiting
az functionapp config appsettings set \
  --name func-ctn-demo-asr-dev \
  --resource-group rg-ctn-demo-asr-dev \
  --settings REDIS_ENABLED="false"

# Restart function app
az functionapp restart \
  --name func-ctn-demo-asr-dev \
  --resource-group rg-ctn-demo-asr-dev
```

**Note:** In-memory rate limiting is per-instance, less effective against distributed DoS attacks.

## Security Benefits

### Before
- ❌ Fails open on errors (allows unlimited requests)
- ❌ In-memory only (per-instance, not distributed)
- ❌ No circuit breaker (cascading failures)
- ❌ No Application Insights monitoring

### After
- ✅ Fails closed on errors (blocks requests with 503)
- ✅ Redis-based distributed rate limiting
- ✅ Circuit breaker prevents cascading failures
- ✅ Application Insights events for monitoring
- ✅ Automatic recovery (HALF_OPEN state)
- ✅ Defense-in-depth (fallback to in-memory)

## Compliance

- **OWASP A04:2021** - Insecure Design (availability protection)
- **CWE-755** - Improper Handling of Exceptional Conditions (FIXED)
- **ASVS V11.1.1** - Verify rate limiting is enforced even during errors

## References

- [Circuit Breaker Pattern - Martin Fowler](https://martinfowler.com/bliki/CircuitBreaker.html)
- [Azure Redis Cache Best Practices](https://docs.microsoft.com/en-us/azure/azure-cache-for-redis/cache-best-practices)
- [Rate Limiting Strategies](https://www.cloudflare.com/learning/bots/what-is-rate-limiting/)
- [CWE-755: Improper Handling of Exceptional Conditions](https://cwe.mitre.org/data/definitions/755.html)

## Next Steps

1. ✅ Deploy to dev environment
2. ⬜ Monitor circuit breaker metrics for 1 week
3. ⬜ Provision Azure Redis Cache (Standard tier)
4. ⬜ Deploy to production
5. ⬜ Configure Application Insights alerts
6. ⬜ Document runbook for circuit breaker troubleshooting
