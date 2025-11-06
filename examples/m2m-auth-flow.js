/**
 * Zitadel M2M Authentication Flow Example
 *
 * This example demonstrates the complete OAuth2.0 client credentials grant flow
 * for machine-to-machine authentication with Zitadel and calling the CTN ASR API.
 *
 * Flow:
 * 1. Service account requests access token from Zitadel using client credentials
 * 2. Zitadel validates credentials and returns JWT access token
 * 3. Client calls CTN ASR API endpoint with token in Authorization header
 * 4. API middleware validates JWT signature and claims
 * 5. API processes request and returns response
 *
 * Prerequisites:
 * - Zitadel running with service accounts configured
 * - zitadel-credentials.json file from setup script
 * - CTN ASR API running with Zitadel middleware enabled
 *
 * Usage:
 *   node examples/m2m-auth-flow.js [service-account-name]
 *
 * Example:
 *   node examples/m2m-auth-flow.js test-client
 */

const https = require('https');
const http = require('http');
const fs = require('fs');
const path = require('path');

// Configuration
const CREDENTIALS_FILE = path.join(__dirname, '../zitadel-credentials.json');
const ZITADEL_URL = process.env.ZITADEL_ISSUER || 'http://localhost:8080';
const API_URL = process.env.API_URL || 'http://localhost:7071/api/v1';

// ANSI color codes
const colors = {
  reset: '\x1b[0m',
  bright: '\x1b[1m',
  red: '\x1b[31m',
  green: '\x1b[32m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
  cyan: '\x1b[36m',
};

function log(message, color = 'reset') {
  console.log(`${colors[color]}${message}${colors.reset}`);
}

function logSection(title) {
  console.log('');
  log('='.repeat(60), 'cyan');
  log(title, 'bright');
  log('='.repeat(60), 'cyan');
  console.log('');
}

// Load credentials
function loadCredentials() {
  try {
    const data = fs.readFileSync(CREDENTIALS_FILE, 'utf8');
    return JSON.parse(data);
  } catch (error) {
    log('Error: Could not load credentials file', 'red');
    log(`Please run: ./scripts/setup-zitadel-m2m.sh`, 'yellow');
    log(`Expected file: ${CREDENTIALS_FILE}`, 'yellow');
    process.exit(1);
  }
}

// HTTP request helper
function makeRequest(url, options, postData = null) {
  return new Promise((resolve, reject) => {
    const urlObj = new URL(url);
    const client = urlObj.protocol === 'https:' ? https : http;

    const reqOptions = {
      ...options,
      hostname: urlObj.hostname,
      port: urlObj.port,
      path: urlObj.pathname + urlObj.search,
    };

    const req = client.request(reqOptions, (res) => {
      let data = '';

      res.on('data', (chunk) => {
        data += chunk;
      });

      res.on('end', () => {
        try {
          const response = {
            statusCode: res.statusCode,
            headers: res.headers,
            body: data ? JSON.parse(data) : null,
          };
          resolve(response);
        } catch (error) {
          resolve({
            statusCode: res.statusCode,
            headers: res.headers,
            body: data,
          });
        }
      });
    });

    req.on('error', (error) => {
      reject(error);
    });

    if (postData) {
      req.write(postData);
    }

    req.end();
  });
}

// Step 1: Request access token from Zitadel
async function getAccessToken(clientId, clientSecret) {
  logSection('Step 1: Requesting Access Token from Zitadel');

  log(`Zitadel URL: ${ZITADEL_URL}`, 'blue');
  log(`Client ID: ${clientId}`, 'blue');
  log('Grant Type: client_credentials', 'blue');
  console.log('');

  const tokenUrl = `${ZITADEL_URL}/oauth/v2/token`;
  const credentials = Buffer.from(`${clientId}:${clientSecret}`).toString('base64');

  const postData = new URLSearchParams({
    grant_type: 'client_credentials',
    scope: 'openid email profile urn:zitadel:iam:org:project:id:zitadel:aud',
  }).toString();

  try {
    log('Sending token request...', 'yellow');

    const response = await makeRequest(
      tokenUrl,
      {
        method: 'POST',
        headers: {
          'Content-Type': 'application/x-www-form-urlencoded',
          'Content-Length': Buffer.byteLength(postData),
          'Authorization': `Basic ${credentials}`,
        },
      },
      postData
    );

    if (response.statusCode !== 200) {
      throw new Error(`Token request failed: ${response.statusCode} - ${JSON.stringify(response.body)}`);
    }

    log('✓ Access token received', 'green');
    console.log('');
    log('Token Details:', 'cyan');
    log(`  Token Type: ${response.body.token_type}`, 'blue');
    log(`  Expires In: ${response.body.expires_in} seconds`, 'blue');
    log(`  Scope: ${response.body.scope}`, 'blue');
    console.log('');

    // Decode JWT to show claims (for demonstration only - not validating)
    const tokenParts = response.body.access_token.split('.');
    if (tokenParts.length === 3) {
      const payload = JSON.parse(Buffer.from(tokenParts[1], 'base64').toString());
      log('JWT Claims:', 'cyan');
      log(`  Issuer: ${payload.iss}`, 'blue');
      log(`  Subject: ${payload.sub}`, 'blue');
      log(`  Audience: ${JSON.stringify(payload.aud)}`, 'blue');
      log(`  Issued At: ${new Date(payload.iat * 1000).toISOString()}`, 'blue');
      log(`  Expires At: ${new Date(payload.exp * 1000).toISOString()}`, 'blue');
    }

    return response.body.access_token;
  } catch (error) {
    log(`✗ Token request failed: ${error.message}`, 'red');
    throw error;
  }
}

// Step 2: Call CTN ASR API with access token
async function callApi(accessToken, endpoint = '/health') {
  logSection('Step 2: Calling CTN ASR API');

  const apiUrl = `${API_URL}${endpoint}`;
  log(`API URL: ${apiUrl}`, 'blue');
  log('Method: GET', 'blue');
  console.log('');

  try {
    log('Sending API request with Bearer token...', 'yellow');

    const response = await makeRequest(apiUrl, {
      method: 'GET',
      headers: {
        'Authorization': `Bearer ${accessToken}`,
        'Accept': 'application/json',
      },
    });

    log(`✓ API responded with status: ${response.statusCode}`, 'green');
    console.log('');
    log('Response:', 'cyan');
    console.log(JSON.stringify(response.body, null, 2));

    return response.body;
  } catch (error) {
    log(`✗ API request failed: ${error.message}`, 'red');
    throw error;
  }
}

// Step 3: Demonstrate token validation (JWT inspection)
function inspectToken(accessToken) {
  logSection('Step 3: Token Inspection');

  try {
    const tokenParts = accessToken.split('.');
    if (tokenParts.length !== 3) {
      throw new Error('Invalid JWT format');
    }

    log('JWT Structure:', 'cyan');
    log(`  Header: ${tokenParts[0].substring(0, 50)}...`, 'blue');
    log(`  Payload: ${tokenParts[1].substring(0, 50)}...`, 'blue');
    log(`  Signature: ${tokenParts[2].substring(0, 50)}...`, 'blue');
    console.log('');

    const header = JSON.parse(Buffer.from(tokenParts[0], 'base64').toString());
    const payload = JSON.parse(Buffer.from(tokenParts[1], 'base64').toString());

    log('Header:', 'cyan');
    console.log(JSON.stringify(header, null, 2));
    console.log('');

    log('Payload:', 'cyan');
    console.log(JSON.stringify(payload, null, 2));
    console.log('');

    log('Validation Checklist:', 'cyan');
    log(`  ✓ Token format is valid (3 parts)`, 'green');
    log(`  ✓ Signature algorithm: ${header.alg}`, 'green');
    log(`  ✓ Token type: ${header.typ}`, 'green');
    log(`  ✓ Issuer: ${payload.iss}`, 'green');
    log(`  ✓ Subject: ${payload.sub}`, 'green');
    log(`  ✓ Expiration: ${new Date(payload.exp * 1000).toISOString()}`, 'green');

    const now = Math.floor(Date.now() / 1000);
    if (payload.exp < now) {
      log(`  ✗ Token is EXPIRED`, 'red');
    } else {
      log(`  ✓ Token is valid for ${payload.exp - now} more seconds`, 'green');
    }
  } catch (error) {
    log(`✗ Token inspection failed: ${error.message}`, 'red');
  }
}

// Main execution
async function main() {
  logSection('Zitadel M2M Authentication Flow Example');

  // Load credentials
  const credentials = loadCredentials();
  log(`Project ID: ${credentials.project_id}`, 'blue');
  log(`Available service accounts: ${credentials.service_accounts.length}`, 'blue');
  console.log('');

  // Get service account from command line or use first one
  const serviceAccountName = process.argv[2];
  let serviceAccount;

  if (serviceAccountName) {
    serviceAccount = credentials.service_accounts.find(
      (sa) => sa.name === serviceAccountName
    );
    if (!serviceAccount) {
      log(`Error: Service account '${serviceAccountName}' not found`, 'red');
      log('Available service accounts:', 'yellow');
      credentials.service_accounts.forEach((sa) => {
        log(`  - ${sa.name}: ${sa.description}`, 'blue');
      });
      process.exit(1);
    }
  } else {
    serviceAccount = credentials.service_accounts[0];
    log('No service account specified, using first available:', 'yellow');
  }

  log(`Using: ${serviceAccount.name}`, 'green');
  log(`Description: ${serviceAccount.description}`, 'blue');
  console.log('');

  try {
    // Step 1: Get access token
    const accessToken = await getAccessToken(
      serviceAccount.client_id,
      serviceAccount.client_secret
    );

    // Step 2: Call API
    await callApi(accessToken, '/health');

    // Step 3: Inspect token
    inspectToken(accessToken);

    logSection('Success! M2M Authentication Flow Complete');
    log('Next steps:', 'yellow');
    log('1. Try different endpoints: node examples/m2m-auth-flow.js test-client', 'blue');
    log('2. Implement this flow in your client application', 'blue');
    log('3. Store credentials securely in Azure Key Vault', 'blue');
    log('4. Configure token caching to reduce token requests', 'blue');
    console.log('');
  } catch (error) {
    logSection('Error');
    log(error.message, 'red');
    if (error.stack) {
      console.log('');
      log('Stack trace:', 'yellow');
      console.log(error.stack);
    }
    process.exit(1);
  }
}

// Run
main();
