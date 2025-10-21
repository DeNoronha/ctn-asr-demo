#!/usr/bin/env node

/**
 * CTN MCP Server - Main Entry Point
 *
 * Model Context Protocol server for serving CTN documentation to AI tools.
 * Supports both stdio (local) and HTTP/SSE (Azure) transports.
 *
 * Environment Variables:
 * - DOCUMENTATION_URL: URL of documentation site (required)
 * - REFRESH_API_KEY: API key(s) for refresh endpoint (comma-separated)
 * - PORT: Server port (default: 3000)
 * - MCP_TRANSPORT: 'stdio' or 'http' (default: http)
 * - REFRESH_SCHEDULE: Cron expression for scheduled refresh
 * - NODE_ENV: 'development' or 'production'
 */

const express = require('express');
const { loadConfig } = require('./config');
const DocumentationLoader = require('./documentation-loader');
const CTNMCPServer = require('./mcp-server');
const { setupRefreshEndpoint } = require('./refresh-endpoint');
const { setupScheduledRefresh } = require('./scheduler');

/**
 * Simple JSON logger with structured logging
 */
class Logger {
  constructor(level = 'info') {
    this.levels = { debug: 0, info: 1, warn: 2, error: 3 };
    this.level = this.levels[level] || 1;
  }

  log(level, data) {
    if (this.levels[level] >= this.level) {
      console.log(JSON.stringify({
        timestamp: new Date().toISOString(),
        level,
        ...data,
      }));
    }
  }

  debug(data) { this.log('debug', data); }
  info(data) { this.log('info', data); }
  warn(data) { this.log('warn', data); }
  error(data) { this.log('error', data); }
}

/**
 * Main server startup
 */
async function main() {
  let config;
  let logger;

  try {
    // Load and validate configuration
    config = loadConfig();
    logger = new Logger(config.logLevel);

    logger.info({
      message: 'Starting CTN MCP Server',
      version: '1.0.0',
      nodeEnv: config.nodeEnv,
      transport: config.mcpTransport,
    });

    // Initialize documentation loader
    const documentationLoader = new DocumentationLoader(config, logger);

    // Perform initial documentation load
    logger.info({ message: 'Performing initial documentation load' });
    await documentationLoader.refresh();

    // Initialize MCP server
    const mcpServer = new CTNMCPServer(documentationLoader, config, logger);

    // Choose transport mode
    if (config.mcpTransport === 'stdio') {
      // Stdio mode for local development (Claude Desktop)
      logger.info({ message: 'Starting in stdio mode for local use' });
      await mcpServer.connectStdio();

      // Keep process alive
      process.on('SIGINT', () => {
        logger.info({ message: 'Received SIGINT, shutting down' });
        process.exit(0);
      });

    } else {
      // HTTP mode for Azure Container Apps
      logger.info({ message: 'Starting in HTTP mode for Azure deployment' });

      const app = express();
      app.use(express.json());

      // Health check endpoint
      app.get('/health', (req, res) => {
        const stats = documentationLoader.getStats();
        res.status(200).json({
          status: 'healthy',
          uptime: process.uptime(),
          ...stats,
        });
      });

      // Root endpoint with info
      app.get('/', (req, res) => {
        const stats = documentationLoader.getStats();
        res.status(200).json({
          name: 'CTN MCP Server',
          version: '1.0.0',
          description: 'Model Context Protocol server for CTN documentation',
          endpoints: {
            health: 'GET /health',
            refresh: 'POST /refresh (requires X-API-Key)',
            mcp_sse: 'GET /mcp/sse',
            mcp_message: 'POST /mcp/message',
          },
          stats,
        });
      });

      // Setup refresh endpoint
      setupRefreshEndpoint(app, documentationLoader, config, logger);

      // Setup MCP SSE transport
      mcpServer.setupSSETransport(app);

      // Setup scheduled refresh (if enabled)
      const scheduler = setupScheduledRefresh(documentationLoader, config, logger);

      // Start HTTP server
      const server = app.listen(config.port, () => {
        logger.info({
          message: 'CTN MCP Server is running',
          port: config.port,
          url: `http://localhost:${config.port}`,
        });
      });

      // Graceful shutdown
      const shutdown = async () => {
        logger.info({ message: 'Received shutdown signal, closing server' });

        // Stop scheduler
        if (scheduler.task) {
          scheduler.stop();
        }

        // Close HTTP server
        server.close(() => {
          logger.info({ message: 'Server closed' });
          process.exit(0);
        });

        // Force exit after 10 seconds
        setTimeout(() => {
          logger.error({ message: 'Forced shutdown after timeout' });
          process.exit(1);
        }, 10000);
      };

      process.on('SIGTERM', shutdown);
      process.on('SIGINT', shutdown);
    }

  } catch (error) {
    if (logger) {
      logger.error({
        message: 'Fatal error during startup',
        error: error.message,
        stack: error.stack,
      });
    } else {
      console.error('Fatal error during startup:', error);
    }
    process.exit(1);
  }
}

// Start server
if (require.main === module) {
  main();
}

module.exports = { main };
