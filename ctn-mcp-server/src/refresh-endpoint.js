/**
 * Refresh Endpoint for CTN MCP Server
 *
 * Provides HTTP endpoint for triggering documentation refresh.
 * Secured with API key authentication.
 * Designed for integration with Azure DevOps pipelines.
 */

const { validateApiKey } = require('./config');

/**
 * Setup refresh endpoint on Express app
 * @param {Object} app - Express app instance
 * @param {Object} documentationLoader - Documentation loader instance
 * @param {Object} config - Configuration object
 * @param {Object} logger - Logger instance
 */
function setupRefreshEndpoint(app, documentationLoader, config, logger) {
  /**
   * POST /refresh
   * Trigger documentation refresh
   * Requires X-API-Key header
   */
  app.post('/refresh', async (req, res) => {
    const startTime = Date.now();
    const apiKey = req.headers['x-api-key'];
    const clientIp = req.ip || req.connection.remoteAddress;

    // Log request
    logger.info({
      message: 'Refresh endpoint called',
      ip: clientIp,
      hasApiKey: !!apiKey,
    });

    // Validate API key
    if (!validateApiKey(apiKey, config.refreshApiKeys)) {
      logger.warn({
        message: 'Refresh endpoint: unauthorized access attempt',
        ip: clientIp,
      });

      return res.status(401).json({
        success: false,
        error: 'Unauthorized: Invalid or missing API key',
        message: 'Provide valid API key in X-API-Key header',
      });
    }

    // Check if refresh is already in progress
    if (documentationLoader.isRefreshing) {
      logger.info({
        message: 'Refresh endpoint: refresh already in progress',
        ip: clientIp,
      });

      return res.status(409).json({
        success: false,
        error: 'Conflict: Refresh already in progress',
        message: 'Please wait for current refresh to complete',
      });
    }

    // Trigger refresh
    try {
      logger.info({
        message: 'Starting documentation refresh via endpoint',
        ip: clientIp,
      });

      const result = await documentationLoader.refresh();
      const duration = Date.now() - startTime;

      logger.info({
        message: 'Documentation refresh completed via endpoint',
        ip: clientIp,
        pageCount: result.pageCount,
        durationMs: duration,
      });

      res.status(200).json({
        success: true,
        timestamp: result.timestamp,
        pageCount: result.pageCount,
        memoryUsageMB: result.memoryUsageMB,
        durationMs: duration,
        message: 'Documentation refreshed successfully',
      });

    } catch (error) {
      const duration = Date.now() - startTime;

      logger.error({
        message: 'Documentation refresh failed via endpoint',
        ip: clientIp,
        error: error.message,
        stack: error.stack,
        durationMs: duration,
      });

      res.status(500).json({
        success: false,
        error: 'Internal Server Error',
        message: 'Failed to refresh documentation',
        details: config.nodeEnv === 'development' ? error.message : undefined,
      });
    }
  });

  logger.info({ message: 'Refresh endpoint configured at POST /refresh' });
}

module.exports = { setupRefreshEndpoint };
