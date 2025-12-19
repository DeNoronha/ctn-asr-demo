/**
 * Express Server for Container Apps
 * Replaces Azure Functions runtime with standard Express.js
 */

import express, { Request, Response, NextFunction } from 'express';
import cors from 'cors';
import swaggerUi from 'swagger-ui-express';
import { getPool } from './utils/database';
import { initializeTelemetry } from './utils/telemetry';
import { performStartupDiagnostics } from './utils/startup-diagnostics';
import * as fs from 'fs';
import * as path from 'path';

// Initialize simple logger for Container Apps
interface Logger {
  info: (message: string, context?: any) => void;
  warn: (message: string, context?: any) => void;
  error: (message: string, error?: any, context?: any) => void;
  request: (method: string, path: string, statusCode: number, duration: number) => void;
}

const logger: Logger = {
  info: (message: string, context?: any) => {
    const log = { timestamp: new Date().toISOString(), level: 'INFO', message, ...context };
    console.log(JSON.stringify(log));
  },
  warn: (message: string, context?: any) => {
    const log = { timestamp: new Date().toISOString(), level: 'WARN', message, ...context };
    console.warn(JSON.stringify(log));
  },
  error: (message: string, error?: any, context?: any) => {
    const log = {
      timestamp: new Date().toISOString(),
      level: 'ERROR',
      message,
      error: error?.message || error,
      stack: error?.stack,
      ...context
    };
    console.error(JSON.stringify(log));
  },
  request: (method: string, path: string, statusCode: number, duration: number) => {
    const log = {
      timestamp: new Date().toISOString(),
      level: 'INFO',
      message: 'HTTP Request',
      http: { method, path, statusCode, duration }
    };
    console.log(JSON.stringify(log));
  }
};

// Initialize telemetry
initializeTelemetry();
logger.info('Telemetry initialized');

// Run startup diagnostics
performStartupDiagnostics();
logger.info('Startup diagnostics completed');

const app = express();
const PORT = process.env.PORT || 8080;

// Middleware
app.use(cors());
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

// Request logging middleware
app.use((req: Request, res: Response, next: NextFunction) => {
  const start = Date.now();
  res.on('finish', () => {
    const duration = Date.now() - start;
    logger.request(req.method, req.path, res.statusCode, duration);
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
    logger.error('Database health check failed', error);
  }

  // Check App Insights
  if (!process.env.APPINSIGHTS_INSTRUMENTATIONKEY) {
    health.checks.applicationInsights.status = 'down';
  }

  const statusCode = health.status === 'healthy' ? 200 : 503;
  const duration = Date.now() - startTime;

  logger.info('Health check completed', {
    duration,
    status: health.status,
    dbResponseTime: health.checks.database.responseTime
  });

  res.status(statusCode).json(health);
});

// Swagger UI Documentation
try {
  const openapiPath = path.join(__dirname, 'openapi.json');
  if (fs.existsSync(openapiPath)) {
    const openapiDocument = JSON.parse(fs.readFileSync(openapiPath, 'utf8'));

    // Serve Swagger UI at /api/docs
    app.use('/api/docs', swaggerUi.serve);
    app.get('/api/docs', swaggerUi.setup(openapiDocument, {
      customSiteTitle: 'CTN ASR API Documentation',
      customCss: '.swagger-ui .topbar { display: none }',
      swaggerOptions: {
        persistAuthorization: true,
        displayRequestDuration: true,
        filter: true,
        tryItOutEnabled: true
      }
    }));

    // Serve raw OpenAPI JSON
    app.get('/api/openapi.json', (req, res) => {
      res.json(openapiDocument);
    });

    logger.info('Swagger UI documentation enabled', {
      path: '/api/docs',
      openapiPath: '/api/openapi.json'
    });
  } else {
    logger.warn('OpenAPI specification not found', { expectedPath: openapiPath });
  }
} catch (error) {
  logger.error('Failed to load Swagger UI', error);
}

// Import and register all route handlers from modular routes structure
// Note: './routes' now points to routes/index.ts (modular structure)
// The old routes.ts is kept for reference but no longer used
import { router } from './routes';
app.use('/api', router);

// Error handling middleware
app.use((err: Error, req: Request, res: Response, next: NextFunction) => {
  logger.error('Unhandled error', err, {
    method: req.method,
    path: req.path,
    query: req.query
  });

  res.status(500).json({
    error: 'Internal Server Error',
    message: process.env.NODE_ENV === 'development' ? err.message : 'An unexpected error occurred'
  });
});

// 404 handler
app.use((req: Request, res: Response) => {
  logger.warn('Route not found', {
    method: req.method,
    path: req.path
  });

  res.status(404).json({
    error: 'Not Found',
    message: `Route ${req.method} ${req.path} not found`
  });
});

// Start server
const server = app.listen(PORT, () => {
  const banner = `
╔════════════════════════════════════════════════════════════╗
║  CTN ASR API - Container Apps Runtime                      ║
╠════════════════════════════════════════════════════════════╣
║  Port: ${PORT}                                                 ║
║  Environment: ${(process.env.ENVIRONMENT || 'production').padEnd(41)}║
║  Version: ${(process.env.API_VERSION || '1.0.0').padEnd(45)}║
╚════════════════════════════════════════════════════════════╝
  `;
  console.log(banner);

  logger.info('Server started successfully', {
    port: PORT,
    environment: process.env.ENVIRONMENT || 'production',
    version: process.env.API_VERSION || '1.0.0',
    runtime: 'container-apps'
  });
});

// Graceful shutdown handler for Container Apps
async function gracefulShutdown(signal: string) {
  logger.warn('Graceful shutdown initiated', { signal });

  // Stop accepting new connections
  server.close(async () => {
    logger.info('HTTP server closed');

    try {
      // Close database connections
      const pool = getPool();
      await pool.end();
      logger.info('Database connections closed');

      logger.info('Graceful shutdown completed');
      process.exit(0);
    } catch (error) {
      logger.error('Error during graceful shutdown', error);
      process.exit(1);
    }
  });

  // Force shutdown after timeout (30 seconds)
  setTimeout(() => {
    logger.error('Forced shutdown after 30s timeout');
    process.exit(1);
  }, 30000);
}

// Handle termination signals
process.on('SIGTERM', () => gracefulShutdown('SIGTERM'));
process.on('SIGINT', () => gracefulShutdown('SIGINT'));

// Handle uncaught exceptions
process.on('uncaughtException', (error: Error) => {
  logger.error('Uncaught Exception', error);
  gracefulShutdown('UNCAUGHT_EXCEPTION');
});

// Handle unhandled promise rejections
process.on('unhandledRejection', (reason: any, promise: Promise<any>) => {
  logger.error('Unhandled Promise Rejection', reason, { promise: String(promise) });
  gracefulShutdown('UNHANDLED_REJECTION');
});

export { app };
