/**
 * Health Check Function
 * Provides health status for monitoring and orchestration
 */

import { app, HttpRequest, HttpResponseInit, InvocationContext } from '@azure/functions';
import { getPool } from '../utils/database';

interface HealthStatus {
  status: 'healthy' | 'degraded' | 'unhealthy';
  timestamp: string;
  uptime: number;
  environment: string;
  version: string;
  checks: {
    database: {
      status: 'up' | 'down';
      responseTime?: number;
      error?: string;
    };
  };
}

export async function healthCheck(
  request: HttpRequest,
  context: InvocationContext
): Promise<HttpResponseInit> {
  const startTime = Date.now();

  // Handle CORS preflight
  if (request.method === 'OPTIONS') {
    return {
      status: 204,
      headers: {
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Methods': 'GET, OPTIONS',
        'Access-Control-Allow-Headers': 'Content-Type',
      }
    };
  }

  const health: HealthStatus = {
    status: 'healthy',
    timestamp: new Date().toISOString(),
    uptime: process.uptime(),
    environment: process.env.NODE_ENV || 'development',
    version: process.env.API_VERSION || '1.0.0',
    checks: {
      database: {
        status: 'up'
      }
    }
  };

  // Check database connectivity
  try {
    const dbCheckStart = Date.now();
    const pool = getPool();

    // Simple query to verify database connection
    await pool.query('SELECT 1 as health_check');

    health.checks.database.responseTime = Date.now() - dbCheckStart;
    health.checks.database.status = 'up';
  } catch (error: any) {
    context.error('Database health check failed:', error);
    health.checks.database.status = 'down';
    health.checks.database.error = error.message;
    health.status = 'degraded';
  }

  // Determine overall status
  if (health.checks.database.status === 'down') {
    health.status = 'unhealthy';
  }

  // Return appropriate HTTP status code
  const statusCode = health.status === 'healthy' ? 200 :
                     health.status === 'degraded' ? 200 : 503;

  context.log(`Health check completed in ${Date.now() - startTime}ms - Status: ${health.status}`);

  return {
    status: statusCode,
    headers: {
      'Content-Type': 'application/json',
      'Access-Control-Allow-Origin': '*',
      'Cache-Control': 'no-cache, no-store, must-revalidate'
    },
    jsonBody: health
  };
}

// Register HTTP trigger for health check
app.http('healthCheck', {
  methods: ['GET', 'OPTIONS'],
  authLevel: 'anonymous',
  route: 'health',
  handler: healthCheck
});
