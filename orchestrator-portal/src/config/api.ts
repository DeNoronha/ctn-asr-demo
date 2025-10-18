/**
 * API Configuration
 *
 * Centralized configuration for API base URL.
 *
 * Environment Variables:
 * - VITE_API_BASE_URL: API base URL set via Azure DevOps pipeline
 *
 * Local Development:
 * - Uses mock API at http://localhost:3001/api/v1
 * - Run mock API: npm run mock-api
 *
 * Production:
 * - Uses Azure Functions API via environment variable
 * - Set in Azure DevOps pipeline: VITE_API_BASE_URL=https://func-ctn-demo-asr-dev.azurewebsites.net/api/v1
 */

// Get API base URL from environment variable (set during build by Vite)
// Falls back to mock API for local development
const API_BASE_URL = process.env.VITE_API_BASE_URL || 'http://localhost:3001/api/v1';

// Log API base URL for debugging (only in development)
if (import.meta.env.DEV) {
  console.log('[API Config] Using API base URL:', API_BASE_URL);
}

export { API_BASE_URL };
