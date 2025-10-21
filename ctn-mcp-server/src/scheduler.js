/**
 * Scheduled Refresh for CTN MCP Server
 *
 * Provides scheduled documentation refresh as a fallback mechanism.
 * Uses cron-style scheduling (default: daily at 2 AM UTC).
 * Can be disabled via environment variable.
 */

const cron = require('node-cron');

/**
 * Setup scheduled refresh
 * @param {Object} documentationLoader - Documentation loader instance
 * @param {Object} config - Configuration object
 * @param {Object} logger - Logger instance
 * @returns {Object} Scheduler control object
 */
function setupScheduledRefresh(documentationLoader, config, logger) {
  if (!config.enableScheduledRefresh) {
    logger.info({ message: 'Scheduled refresh is disabled' });
    return { task: null, stop: () => {} };
  }

  // Validate cron expression
  if (!cron.validate(config.refreshSchedule)) {
    logger.error({
      message: 'Invalid cron expression for refresh schedule',
      schedule: config.refreshSchedule,
    });
    throw new Error(`Invalid REFRESH_SCHEDULE cron expression: ${config.refreshSchedule}`);
  }

  logger.info({
    message: 'Scheduling automatic documentation refresh',
    schedule: config.refreshSchedule,
  });

  // Create scheduled task
  const task = cron.schedule(config.refreshSchedule, async () => {
    logger.info({
      message: 'Starting scheduled documentation refresh',
      schedule: config.refreshSchedule,
    });

    try {
      const result = await documentationLoader.refresh();

      logger.info({
        message: 'Scheduled documentation refresh completed',
        pageCount: result.pageCount,
        memoryUsageMB: result.memoryUsageMB,
        durationMs: result.durationMs,
      });

    } catch (error) {
      logger.error({
        message: 'Scheduled documentation refresh failed',
        error: error.message,
        stack: error.stack,
      });
    }
  });

  // Start the task
  task.start();

  logger.info({
    message: 'Scheduled refresh configured and started',
    schedule: config.refreshSchedule,
  });

  // Return control object
  return {
    task,
    stop: () => {
      task.stop();
      logger.info({ message: 'Scheduled refresh stopped' });
    },
  };
}

module.exports = { setupScheduledRefresh };
