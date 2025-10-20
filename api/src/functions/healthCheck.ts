/**
 * Health Check Function
 * Provides comprehensive health status for monitoring and orchestration
 * Checks: Database, Application Insights, Azure Key Vault, Static Web Apps
 */

import { app, HttpRequest, HttpResponseInit, InvocationContext } from '@azure/functions';
import { getPool } from '../utils/database';
import axios from 'axios';

interface HealthCheck {
  status: 'up' | 'down';
  responseTime?: number;
  error?: string;
  details?: Record<string, any>;
}

interface HealthStatus {
  status: 'healthy' | 'degraded' | 'unhealthy';
  timestamp: string;
  uptime: number;
  environment: string;
  version: string;
  checks: {
    database: HealthCheck;
    applicationInsights: HealthCheck;
    azureKeyVault: HealthCheck;
    staticWebApps: HealthCheck;
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
      database: { status: 'up' },
      applicationInsights: { status: 'up' },
      azureKeyVault: { status: 'up' },
      staticWebApps: { status: 'up' }
    }
  };

  // Check 1: Database connectivity
  try {
    const dbCheckStart = Date.now();
    const pool = getPool();
    await pool.query('SELECT 1 as health_check');
    health.checks.database.responseTime = Date.now() - dbCheckStart;
    health.checks.database.status = 'up';
  } catch (error: any) {
    context.error('Database health check failed:', error);
    health.checks.database.status = 'down';
    health.checks.database.error = error.message;
  }

  // Check 2: Application Insights
  try {
    const appInsightsKey = process.env.APPINSIGHTS_INSTRUMENTATIONKEY;
    if (appInsightsKey) {
      health.checks.applicationInsights.status = 'up';
      health.checks.applicationInsights.details = {
        configured: true
      };
    } else {
      health.checks.applicationInsights.status = 'down';
      health.checks.applicationInsights.error = 'Not configured';
    }
  } catch (error: any) {
    context.error('Application Insights health check failed:', error);
    health.checks.applicationInsights.status = 'down';
    health.checks.applicationInsights.error = error.message;
  }

  // Check 3: Azure Key Vault connectivity
  try {
    const kvCheckStart = Date.now();
    // Simple check: verify environment variables from Key Vault are present
    const hasKvVars = process.env.POSTGRES_PASSWORD !== undefined;
    health.checks.azureKeyVault.responseTime = Date.now() - kvCheckStart;
    health.checks.azureKeyVault.status = hasKvVars ? 'up' : 'down';
    if (!hasKvVars) {
      health.checks.azureKeyVault.error = 'Key Vault variables not loaded';
    }
  } catch (error: any) {
    context.error('Azure Key Vault health check failed:', error);
    health.checks.azureKeyVault.status = 'down';
    health.checks.azureKeyVault.error = error.message;
  }

  // Check 4: Static Web Apps (Admin and Member portals)
  try {
    const swaCheckStart = Date.now();
    const adminPortalUrl = 'https://calm-tree-03352ba03.1.azurestaticapps.net';
    const memberPortalUrl = 'https://calm-pebble-043b2db03.1.azurestaticapps.net';

    const [adminCheck, memberCheck] = await Promise.allSettled([
      axios.head(adminPortalUrl, { timeout: 5000 }),
      axios.head(memberPortalUrl, { timeout: 5000 })
    ]);

    health.checks.staticWebApps.responseTime = Date.now() - swaCheckStart;
    health.checks.staticWebApps.status =
      adminCheck.status === 'fulfilled' && memberCheck.status === 'fulfilled' ? 'up' : 'down';
    health.checks.staticWebApps.details = {
      adminPortal: adminCheck.status === 'fulfilled' ? 'up' : 'down',
      memberPortal: memberCheck.status === 'fulfilled' ? 'up' : 'down'
    };

    if (adminCheck.status === 'rejected' || memberCheck.status === 'rejected') {
      const errors = [];
      if (adminCheck.status === 'rejected') errors.push('Admin portal unreachable');
      if (memberCheck.status === 'rejected') errors.push('Member portal unreachable');
      health.checks.staticWebApps.error = errors.join('; ');
    }
  } catch (error: any) {
    context.error('Static Web Apps health check failed:', error);
    health.checks.staticWebApps.status = 'down';
    health.checks.staticWebApps.error = error.message;
  }

  // Determine overall status based on failed checks
  const failedChecks = Object.values(health.checks).filter(c => c.status === 'down').length;
  if (failedChecks === 0) {
    health.status = 'healthy';
  } else if (failedChecks <= 2) {
    health.status = 'degraded';
  } else {
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
