import { app, InvocationContext, Timer } from '@azure/functions';
import { dnsVerificationService } from '../services/dnsVerificationService';

/**
 * Scheduled job to re-verify DNS records for Tier 2 members
 * Runs daily at 2:00 AM UTC
 *
 * Purpose: Ensure Tier 2 members maintain valid DNS verification
 * If verification fails, they are automatically downgraded to Tier 3
 */
async function dnsReverificationHandler(
  myTimer: Timer,
  context: InvocationContext
): Promise<void> {
  const startTime = Date.now();

  context.log('DNS re-verification job started', {
    isPastDue: myTimer.isPastDue,
  });

  try {
    const result = await dnsVerificationService.reverifyExpiredDnsRecords();

    const duration = Date.now() - startTime;

    context.log('DNS re-verification job completed', {
      total: result.total,
      verified: result.verified,
      failed: result.failed,
      durationMs: duration,
      successRate: result.total > 0 ? ((result.verified / result.total) * 100).toFixed(2) + '%' : 'N/A',
    });

    // Log warnings if there were failures
    if (result.failed > 0) {
      context.warn('Some DNS re-verifications failed', {
        failedCount: result.failed,
        totalCount: result.total,
      });
    }

    // Log if no entities needed reverification
    if (result.total === 0) {
      context.log('No entities required DNS re-verification');
    }
  } catch (error) {
    context.error('DNS re-verification job failed', error);

    // Don't throw - we don't want to fail the job completely
    // Individual entity failures are already logged in the service
  }
}

// Schedule: Run daily at 2:00 AM UTC
// Cron format: {second} {minute} {hour} {day} {month} {day-of-week}
// "0 0 2 * * *" = At 02:00:00 AM every day
app.timer('DnsReverificationJob', {
  schedule: '0 0 2 * * *',
  handler: dnsReverificationHandler,
});
