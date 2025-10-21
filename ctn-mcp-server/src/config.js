/**
 * Configuration Management for CTN MCP Server
 *
 * Centralizes all configuration from environment variables with validation.
 * Fails fast on startup if required configuration is missing.
 */

/**
 * Load and validate configuration from environment variables
 * @returns {Object} Validated configuration object
 * @throws {Error} If required configuration is missing or invalid
 */
function loadConfig() {
  const config = {
    // Documentation source URL
    documentationUrl: process.env.DOCUMENTATION_URL || 'https://delightful-desert-0e783ed03.1.azurestaticapps.net',

    // API key for refresh endpoint (comma-separated for multiple keys)
    refreshApiKeys: process.env.REFRESH_API_KEY ? process.env.REFRESH_API_KEY.split(',').map(k => k.trim()) : [],

    // Server port
    port: parseInt(process.env.PORT || '3000', 10),

    // Node environment
    nodeEnv: process.env.NODE_ENV || 'development',

    // Refresh schedule (cron format)
    refreshSchedule: process.env.REFRESH_SCHEDULE || '0 2 * * *', // Default: 2 AM UTC daily

    // Enable scheduled refresh
    enableScheduledRefresh: process.env.ENABLE_SCHEDULED_REFRESH !== 'false', // Default: true

    // MCP transport mode: 'stdio' for local, 'http' for Azure
    mcpTransport: process.env.MCP_TRANSPORT || 'http',

    // Logging level
    logLevel: process.env.LOG_LEVEL || 'info',

    // Cache settings
    cacheMaxSizeMB: parseInt(process.env.CACHE_MAX_SIZE_MB || '128', 10),

    // Documentation refresh timeout (ms)
    refreshTimeoutMs: parseInt(process.env.REFRESH_TIMEOUT_MS || '30000', 10),
  };

  // Validation
  if (!config.documentationUrl) {
    throw new Error('DOCUMENTATION_URL is required');
  }

  if (!config.documentationUrl.startsWith('https://')) {
    throw new Error('DOCUMENTATION_URL must use HTTPS protocol');
  }

  if (config.nodeEnv === 'production' && config.refreshApiKeys.length === 0) {
    throw new Error('REFRESH_API_KEY is required in production');
  }

  if (isNaN(config.port) || config.port < 1 || config.port > 65535) {
    throw new Error('PORT must be a valid port number (1-65535)');
  }

  return config;
}

/**
 * Validate API key against configured keys
 * @param {string} apiKey - API key to validate
 * @param {Array<string>} validKeys - Array of valid API keys
 * @returns {boolean} True if valid, false otherwise
 */
function validateApiKey(apiKey, validKeys) {
  if (!apiKey || validKeys.length === 0) {
    return false;
  }
  return validKeys.includes(apiKey);
}

module.exports = {
  loadConfig,
  validateApiKey,
};
