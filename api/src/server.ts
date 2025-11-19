/**
 * Express Server for Container Apps
 * Replaces Azure Functions runtime with standard Express.js
 */

import express, { Request, Response, NextFunction } from 'express';
import cors from 'cors';
import { getPool } from './utils/database';
import { initializeTelemetry } from './utils/telemetry';
import { performStartupDiagnostics } from './utils/startup-diagnostics';

// Initialize telemetry
initializeTelemetry();

// Run startup diagnostics
performStartupDiagnostics();

const app = express();
const PORT = process.env.PORT || 8080;

// Middleware
app.use(cors());
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

// Request logging
app.use((req: Request, res: Response, next: NextFunction) => {
  const start = Date.now();
  res.on('finish', () => {
    const duration = Date.now() - start;
    console.log(`${req.method} ${req.path} ${res.statusCode} ${duration}ms`);
  });
  next();
});

// Health check endpoint
app.get('/api/health', async (req: Request, res: Response) => {
  const startTime = Date.now();

  const health = {
    status: 'healthy' as 'healthy' | 'degraded' | 'unhealthy',
    timestamp: new Date().toISOString(),
    uptime: process.uptime(),
    environment: process.env.ENVIRONMENT || 'production',
    version: process.env.API_VERSION || '1.0.0',
    runtime: 'container-apps',
    checks: {
      database: { status: 'up' as 'up' | 'down', responseTime: 0 },
      applicationInsights: { status: 'up' as 'up' | 'down' }
    }
  };

  // Check database
  try {
    const dbCheckStart = Date.now();
    const pool = getPool();
    await pool.query('SELECT 1 as health_check');
    health.checks.database.responseTime = Date.now() - dbCheckStart;
  } catch (error: any) {
    health.checks.database.status = 'down';
    health.status = 'unhealthy';
  }

  // Check App Insights
  if (!process.env.APPINSIGHTS_INSTRUMENTATIONKEY) {
    health.checks.applicationInsights.status = 'down';
  }

  const statusCode = health.status === 'healthy' ? 200 : 503;
  console.log(`Health check completed in ${Date.now() - startTime}ms - Status: ${health.status}`);

  res.status(statusCode).json(health);
});

// Import and register all route handlers
import { router } from './routes';
app.use('/api', router);

// Error handling middleware
app.use((err: Error, req: Request, res: Response, next: NextFunction) => {
  console.error('Unhandled error:', err);
  res.status(500).json({
    error: 'Internal Server Error',
    message: process.env.NODE_ENV === 'development' ? err.message : 'An unexpected error occurred'
  });
});

// 404 handler
app.use((req: Request, res: Response) => {
  res.status(404).json({
    error: 'Not Found',
    message: `Route ${req.method} ${req.path} not found`
  });
});

// Start server
app.listen(PORT, () => {
  console.log(`
╔════════════════════════════════════════════════════════════╗
║  CTN ASR API - Container Apps Runtime                      ║
╠════════════════════════════════════════════════════════════╣
║  Port: ${PORT}                                                 ║
║  Environment: ${(process.env.ENVIRONMENT || 'production').padEnd(41)}║
║  Version: ${(process.env.API_VERSION || '1.0.0').padEnd(45)}║
╚════════════════════════════════════════════════════════════╝
  `);
});

export { app };
