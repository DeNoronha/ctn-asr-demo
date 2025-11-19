/**
 * Utility functions for API deployment tests
 */

const https = require('https');
const http = require('http');
const { config } = require('./config');

// Colors for terminal output
const colors = {
  reset: '\x1b[0m',
  green: '\x1b[32m',
  red: '\x1b[31m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
  gray: '\x1b[90m',
};

// Disable colors if not TTY
const c = config.output.colors ? colors : Object.fromEntries(
  Object.keys(colors).map(k => [k, ''])
);

/**
 * Log with formatting
 */
function log(message, type = 'info') {
  const prefix = {
    success: `${c.green}✓${c.reset}`,
    error: `${c.red}✗${c.reset}`,
    warning: `${c.yellow}⚠${c.reset}`,
    skip: `${c.gray}⊘${c.reset}`,
    info: `${c.blue}ℹ${c.reset}`,
  }[type] || '';

  console.log(`${prefix} ${message}`);
}

/**
 * Make HTTP request
 */
async function request(url, options = {}) {
  return new Promise((resolve, reject) => {
    const urlObj = new URL(url);
    const client = urlObj.protocol === 'https:' ? https : http;

    const requestOptions = {
      hostname: urlObj.hostname,
      port: urlObj.port || (urlObj.protocol === 'https:' ? 443 : 80),
      path: urlObj.pathname + urlObj.search,
      method: options.method || 'GET',
      headers: {
        'Content-Type': 'application/json',
        ...options.headers,
      },
      timeout: options.timeout || config.api.timeout,
    };

    const req = client.request(requestOptions, (res) => {
      let data = '';

      res.on('data', chunk => {
        data += chunk;
      });

      res.on('end', () => {
        let body = data;
        try {
          body = JSON.parse(data);
        } catch (e) {
          // Not JSON, keep as string
        }

        resolve({
          status: res.statusCode,
          headers: res.headers,
          body,
        });
      });
    });

    req.on('error', reject);
    req.on('timeout', () => {
      req.destroy();
      reject(new Error('Request timeout'));
    });

    if (options.body) {
      const bodyStr = typeof options.body === 'string'
        ? options.body
        : JSON.stringify(options.body);
      req.write(bodyStr);
    }

    req.end();
  });
}

/**
 * Acquire Azure AD token using ROPC flow
 */
async function getToken() {
  const { tenantId, clientId, username, password } = config.auth;

  const body = new URLSearchParams({
    client_id: clientId,
    scope: `${clientId}/.default`,
    username,
    password,
    grant_type: 'password',
  }).toString();

  try {
    const response = await request(
      `https://login.microsoftonline.com/${tenantId}/oauth2/v2.0/token`,
      {
        method: 'POST',
        headers: {
          'Content-Type': 'application/x-www-form-urlencoded',
        },
        body,
      }
    );

    if (response.status === 200 && response.body.access_token) {
      return response.body.access_token;
    }

    throw new Error(response.body.error_description || 'Failed to acquire token');
  } catch (error) {
    throw new Error(`Token acquisition failed: ${error.message}`);
  }
}

/**
 * Make authenticated API request
 */
async function apiRequest(endpoint, options = {}, token) {
  const url = endpoint.startsWith('http')
    ? endpoint
    : `${config.api.baseUrl}${endpoint}`;

  const headers = {
    ...options.headers,
  };

  if (token) {
    headers.Authorization = `Bearer ${token}`;
  }

  return request(url, {
    ...options,
    headers,
  });
}

/**
 * Test result tracker
 */
class TestRunner {
  constructor(name) {
    this.name = name;
    this.results = [];
    this.startTime = Date.now();
  }

  async test(description, testFn) {
    const testStart = Date.now();
    try {
      await testFn();
      const duration = Date.now() - testStart;
      this.results.push({ description, success: true, duration });
      log(`${description} (${duration}ms)`, 'success');
      return true;
    } catch (error) {
      const duration = Date.now() - testStart;
      this.results.push({ description, success: false, error: error.message, duration });
      log(`${description}: ${error.message}`, 'error');
      return false;
    }
  }

  skip(description, reason) {
    this.results.push({ description, skipped: true, reason });
    log(`${description}: ${reason}`, 'skip');
  }

  printSummary() {
    const passed = this.results.filter(r => r.success).length;
    const failed = this.results.filter(r => !r.success && !r.skipped).length;
    const skipped = this.results.filter(r => r.skipped).length;
    const duration = Date.now() - this.startTime;

    console.log('\n' + '='.repeat(50));
    console.log(`${this.name} - Summary`);
    console.log('='.repeat(50));
    console.log(`${c.green}Passed:${c.reset}  ${passed}`);
    console.log(`${c.red}Failed:${c.reset}  ${failed}`);
    console.log(`${c.gray}Skipped:${c.reset} ${skipped}`);
    console.log(`Duration: ${duration}ms`);
    console.log('='.repeat(50));

    return { passed, failed, skipped, duration };
  }
}

/**
 * Assert helper
 */
function assert(condition, message) {
  if (!condition) {
    throw new Error(message);
  }
}

module.exports = {
  log,
  request,
  getToken,
  apiRequest,
  TestRunner,
  assert,
  colors: c,
};
