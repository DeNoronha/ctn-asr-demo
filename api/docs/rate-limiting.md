# API Rate Limiting

## Overview

The CTN API implements comprehensive rate limiting to protect against abuse, ensure fair resource allocation, and prevent denial-of-service attacks. Rate limits are applied automatically to all API endpoints through the endpoint wrapper middleware.

## How It Works

### Rate Limiting Strategy

1. **User-Based Limiting** (Authenticated Requests)
   - Rate limits are tracked per `userId`
   - Key format: `user:{userId}`
   - Provides personalized quotas

2. **IP-Based Limiting** (Anonymous Requests)
   - Rate limits tracked by IP address
   - Key format: `ip:{ipAddress}`
   - Prevents abuse from unauthenticated clients

### Rate Limit Tiers

The API enforces different rate limits based on endpoint type:

| Tier | Limit | Duration | Block Duration | Use Case |
|------|-------|----------|----------------|----------|
| **API** | 100 requests | 1 minute | 1 minute | General API endpoints |
| **Auth** | 10 requests | 1 minute | 5 minutes | Authentication endpoints |
| **Token** | 5 requests | 1 hour | 1 hour | Token issuance |
| **Failed Auth** | 5 attempts | 1 hour | 1 hour | Failed authentication (by IP) |
| **Upload** | 20 requests | 1 hour | 30 minutes | File upload endpoints |

### Headers

The API includes rate limit information in response headers:

```http
X-RateLimit-Limit: 100
X-RateLimit-Remaining: 95
X-RateLimit-Reset: 2025-10-19T20:00:00.000Z
```

When a rate limit is exceeded, the API returns HTTP 429 with additional headers:

```http
HTTP/1.1 429 Too Many Requests
Retry-After: 60
X-RateLimit-Limit: 100
X-RateLimit-Remaining: 0
X-RateLimit-Reset: 2025-10-19T20:00:00.000Z

{
  "error": "rate_limit_exceeded",
  "error_description": "Too many requests. Please try again later.",
  "retry_after": 60,
  "reset_time": "2025-10-19T20:00:00.000Z"
}
```

## Implementation

### Enabling Rate Limiting

Rate limiting is **enabled by default** for all endpoints wrapped with `wrapEndpoint()`:

```typescript
import { wrapEndpoint, RateLimiterType } from '../middleware/endpointWrapper';

export default wrapEndpoint(
  async (request, context) => {
    // Your handler logic
    return { status: 200, body: 'Success' };
  },
  {
    requireAuth: true,
    enableRateLimit: true, // Default: true
    rateLimiterType: RateLimiterType.API, // Default tier
  }
);
```

### Using Different Rate Limit Tiers

```typescript
import { wrapEndpoint, RateLimiterType } from '../middleware/endpointWrapper';

// Authentication endpoint - stricter limits
export default wrapEndpoint(
  async (request, context) => {
    // Authentication logic
  },
  {
    requireAuth: false,
    rateLimiterType: RateLimiterType.AUTH,
  }
);

// File upload endpoint
export default wrapEndpoint(
  async (request, context) => {
    // Upload logic
  },
  {
    requireAuth: true,
    rateLimiterType: RateLimiterType.UPLOAD,
  }
);
```

### Disabling Rate Limiting

For specific endpoints that should not be rate-limited (e.g., health checks):

```typescript
export default wrapEndpoint(
  async (request, context) => {
    return { status: 200, body: 'OK' };
  },
  {
    requireAuth: false,
    enableRateLimit: false,
  }
);
```

### Penalizing Failed Attempts

For security-sensitive operations (e.g., failed logins), you can apply additional penalties:

```typescript
import { penalizeFailedAttempt } from '../middleware/rateLimiter';

export default wrapEndpoint(async (request, context) => {
  const credentials = await request.json();

  const isValid = await validateCredentials(credentials);

  if (!isValid) {
    // Consume additional points (default: 2) for failed attempt
    await penalizeFailedAttempt(request, context, 2);

    return {
      status: 401,
      body: JSON.stringify({ error: 'Invalid credentials' }),
    };
  }

  return { status: 200, body: 'Authenticated' };
});
```

## Monitoring

### Application Insights Queries

View rate limiting events in Azure Application Insights:

```kql
// Rate limit violations in the last hour
traces
| where timestamp > ago(1h)
| where message contains "Rate limit exceeded"
| project timestamp, message, customDimensions
| order by timestamp desc
```

```kql
// Rate limit checks by user
traces
| where timestamp > ago(1d)
| where message contains "Rate limit check passed"
| extend userId = tostring(customDimensions.userId)
| summarize count() by userId
| order by count_ desc
```

### Metrics to Monitor

1. **Rate Limit Violations**: Number of 429 responses
2. **Top Violators**: Users/IPs hitting rate limits most frequently
3. **Rate Limit Headroom**: Average remaining capacity per tier
4. **Block Duration Impact**: Time users are blocked vs. retry patterns

## Best Practices

### For API Consumers

1. **Respect Rate Limit Headers**
   - Check `X-RateLimit-Remaining` before making requests
   - Use `X-RateLimit-Reset` to schedule retries

2. **Implement Exponential Backoff**
   ```typescript
   async function callAPI(url: string, retries = 3): Promise<Response> {
     for (let attempt = 0; attempt < retries; attempt++) {
       const response = await fetch(url);

       if (response.status === 429) {
         const retryAfter = parseInt(response.headers.get('Retry-After') || '60');
         await new Promise(resolve => setTimeout(resolve, retryAfter * 1000));
         continue;
       }

       return response;
     }

     throw new Error('Rate limit exceeded after retries');
   }
   ```

3. **Batch Requests**
   - Use batch endpoints when available
   - Combine multiple reads into single request

4. **Cache Responses**
   - Cache responses locally to reduce API calls
   - Use ETags and conditional requests

### For API Developers

1. **Choose Appropriate Tiers**
   - Use stricter tiers (`AUTH`, `TOKEN`) for security-sensitive endpoints
   - Use relaxed tiers (`API`) for read-heavy operations

2. **Consider User Experience**
   - Don't apply overly restrictive limits to interactive operations
   - Provide clear error messages with retry guidance

3. **Monitor and Adjust**
   - Review rate limit violation patterns monthly
   - Adjust limits based on legitimate usage patterns

## Configuration

### Adjusting Rate Limits

Rate limits are configured in `api/src/middleware/rateLimiter.ts`:

```typescript
// General API rate limiter
const apiRateLimiter = new RateLimiterMemory({
  points: 100,        // Requests allowed
  duration: 60,       // Per 60 seconds
  blockDuration: 60,  // Block for 60 seconds if exceeded
});
```

To adjust limits, modify the `points`, `duration`, or `blockDuration` values.

### Environment-Specific Limits

For production vs. development environments:

```typescript
const isProduction = process.env.NODE_ENV === 'production';

const apiRateLimiter = new RateLimiterMemory({
  points: isProduction ? 100 : 1000,  // Higher limit in dev
  duration: 60,
  blockDuration: isProduction ? 60 : 10,  // Shorter block in dev
});
```

## Troubleshooting

### Issue: Legitimate Users Hit Rate Limits

**Solution**:
1. Check Application Insights for usage patterns
2. Increase limits for specific tiers if needed
3. Consider adding role-based limits (higher for premium users)

### Issue: Rate Limiter Memory Grows Too Large

**Solution**:
- Rate limiter uses in-memory storage (not suitable for multi-instance deployments)
- For production, consider:
  - Azure Redis Cache with `rate-limiter-flexible` Redis adapter
  - Azure API Management for distributed rate limiting

### Issue: Rate Limits Not Applied

**Solution**:
1. Verify endpoint uses `wrapEndpoint()` middleware
2. Check `enableRateLimit` option is not set to `false`
3. Review logs for rate limiter errors (fails open to avoid blocking)

## Future Enhancements

1. **Distributed Rate Limiting**
   - Implement Redis-based rate limiting for multi-instance deployments
   - Use Azure Redis Cache for shared state

2. **Dynamic Rate Limits**
   - Adjust limits based on user tier/subscription
   - Implement burst allowances for spiky traffic

3. **Rate Limit Analytics Dashboard**
   - Real-time visualization of rate limit usage
   - Alerting for abnormal patterns

4. **Allowlisting**
   - Bypass rate limits for trusted IPs/services
   - Higher limits for authenticated premium users

## References

- [rate-limiter-flexible](https://github.com/animir/node-rate-limiter-flexible) - Library documentation
- [RFC 6585](https://tools.ietf.org/html/rfc6585#section-4) - HTTP 429 Too Many Requests
- [IETF Draft: RateLimit Headers](https://datatracker.ietf.org/doc/html/draft-ietf-httpapi-ratelimit-headers) - Standard rate limit headers
