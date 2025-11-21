import { app, HttpRequest, HttpResponseInit, InvocationContext } from "@azure/functions";
import * as fs from 'fs';
import * as path from 'path';
import { handleError } from '../utils/errors';

/**
 * GetVersion - Returns API build and version information
 *
 * This endpoint provides build metadata including:
 * - Build number and ID
 * - Git commit SHA
 * - Build timestamp
 * - Environment
 *
 * Used by admin portal About page to display API version info
 */
async function handler(
  request: HttpRequest,
  context: InvocationContext
): Promise<HttpResponseInit> {
  try {
    // Try to read version.json from API dist folder
    const versionPath = path.join(__dirname, '..', 'version.json');

    let versionInfo;
    if (fs.existsSync(versionPath)) {
      const versionData = fs.readFileSync(versionPath, 'utf-8');
      versionInfo = JSON.parse(versionData);
    } else {
      // Fallback if version.json doesn't exist (local development)
      versionInfo = {
        buildNumber: 'dev',
        buildId: '0',
        buildReason: 'Local Development',
        commitSha: 'unknown',
        commitShaFull: 'unknown',
        branch: 'unknown',
        repository: 'ASR',
        triggeredBy: 'Developer',
        timestamp: new Date().toISOString(),
        version: 'dev',
        environment: 'local'
      };
    }

    // Add additional runtime info
    const response = {
      ...versionInfo,
      api: {
        name: 'CTN ASR API',
        nodeVersion: process.version,
        platform: process.platform,
        uptime: process.uptime(),
      },
      copyright: {
        year: new Date().getFullYear(),
        owner: 'Connected Trade Network (CTN)',
        license: 'Proprietary'
      }
    };

    return {
      status: 200,
      headers: {
        'Content-Type': 'application/json',
        'Cache-Control': 'public, max-age=300' // Cache for 5 minutes
      },
      jsonBody: response
    };
  } catch (error: any) {
    context.error('Error retrieving version info:', error);

    return {
      status: 500,
      jsonBody: {
        error: 'Failed to retrieve version information',
        details: error instanceof Error ? error.message : 'Unknown error'
      }
    };
  }
}

app.http('GetVersion', {
  methods: ['GET', 'OPTIONS'],
  route: 'v1/version',
  authLevel: 'anonymous', // Public endpoint
  handler: handler
});
