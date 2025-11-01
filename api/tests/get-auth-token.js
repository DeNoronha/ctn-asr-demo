#!/usr/bin/env node
/**
 * Get Azure AD Authentication Token
 *
 * This script obtains an Azure AD access token for API testing.
 * It uses the device code flow which works without MFA issues.
 *
 * Usage:
 *   node get-auth-token.js
 *
 * The token will be saved to .auth-token file for reuse by test scripts.
 */

const https = require('https');
const fs = require('fs');
const path = require('path');

// Configuration
const TENANT_ID = '598664e7-725c-4daa-bd1f-89c4ada717ff';
const CLIENT_ID = 'd3037c11-a541-4f21-8862-8079137a0cde';
const SCOPE = 'api://d3037c11-a541-4f21-8862-8079137a0cde/.default';
const TOKEN_FILE = path.join(__dirname, '.auth-token');

// ANSI colors
const colors = {
  reset: '\x1b[0m',
  bright: '\x1b[1m',
  cyan: '\x1b[36m',
  green: '\x1b[32m',
  yellow: '\x1b[33m',
  red: '\x1b[31m',
};

function print(msg, color = '') {
  console.log(`${color}${msg}${colors.reset}`);
}

function makeRequest(options, postData = null) {
  return new Promise((resolve, reject) => {
    const req = https.request(options, (res) => {
      let data = '';
      res.on('data', (chunk) => { data += chunk; });
      res.on('end', () => {
        try {
          resolve({ statusCode: res.statusCode, data: JSON.parse(data) });
        } catch (e) {
          resolve({ statusCode: res.statusCode, data: data });
        }
      });
    });

    req.on('error', reject);

    if (postData) {
      req.write(postData);
    }

    req.end();
  });
}

async function getDeviceCode() {
  print('\n🔐 Initiating device code flow...', colors.cyan);

  const postData = new URLSearchParams({
    client_id: CLIENT_ID,
    scope: SCOPE,
  }).toString();

  const options = {
    hostname: 'login.microsoftonline.com',
    path: `/${TENANT_ID}/oauth2/v2.0/devicecode`,
    method: 'POST',
    headers: {
      'Content-Type': 'application/x-www-form-urlencoded',
      'Content-Length': Buffer.byteLength(postData),
    },
  };

  const response = await makeRequest(options, postData);

  if (response.statusCode !== 200) {
    throw new Error(`Failed to get device code: ${JSON.stringify(response.data)}`);
  }

  return response.data;
}

async function pollForToken(deviceCode, interval, expiresIn) {
  const startTime = Date.now();
  const expiresAt = startTime + (expiresIn * 1000);

  while (Date.now() < expiresAt) {
    await new Promise(resolve => setTimeout(resolve, interval * 1000));

    const postData = new URLSearchParams({
      client_id: CLIENT_ID,
      grant_type: 'urn:ietf:params:oauth:grant-type:device_code',
      device_code: deviceCode,
    }).toString();

    const options = {
      hostname: 'login.microsoftonline.com',
      path: `/${TENANT_ID}/oauth2/v2.0/token`,
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
        'Content-Length': Buffer.byteLength(postData),
      },
    };

    const response = await makeRequest(options, postData);

    if (response.statusCode === 200) {
      return response.data;
    }

    if (response.data.error === 'authorization_pending') {
      process.stdout.write('.');
      continue;
    }

    if (response.data.error === 'slow_down') {
      await new Promise(resolve => setTimeout(resolve, 5000));
      continue;
    }

    throw new Error(`Token acquisition failed: ${JSON.stringify(response.data)}`);
  }

  throw new Error('Device code expired. Please try again.');
}

async function main() {
  try {
    print('\n========================================', colors.bright);
    print('Azure AD Token Acquisition', colors.bright);
    print('========================================\n', colors.bright);
    print(`Tenant ID: ${TENANT_ID}`, colors.cyan);
    print(`Client ID: ${CLIENT_ID}`, colors.cyan);
    print(`Scope: ${SCOPE}\n`, colors.cyan);

    // Get device code
    const deviceCodeResponse = await getDeviceCode();

    print('\n📱 USER ACTION REQUIRED:', colors.yellow + colors.bright);
    print(`\n1. Open your browser and navigate to: ${deviceCodeResponse.verification_uri}`, colors.yellow);
    print(`2. Enter the code: ${deviceCodeResponse.user_code}`, colors.yellow);
    print(`3. Sign in with: test-e2@denoronha.consulting`, colors.yellow);
    print(`\nWaiting for authentication`, colors.cyan);

    // Poll for token
    const tokenResponse = await pollForToken(
      deviceCodeResponse.device_code,
      deviceCodeResponse.interval,
      deviceCodeResponse.expires_in
    );

    print('\n\n✅ Token acquired successfully!', colors.green + colors.bright);

    // Save token to file
    const tokenData = {
      access_token: tokenResponse.access_token,
      expires_at: Date.now() + (tokenResponse.expires_in * 1000),
      acquired_at: new Date().toISOString(),
    };

    fs.writeFileSync(TOKEN_FILE, JSON.stringify(tokenData, null, 2));

    print(`\n💾 Token saved to: ${TOKEN_FILE}`, colors.green);
    print(`   Expires in: ${Math.floor(tokenResponse.expires_in / 60)} minutes\n`, colors.cyan);

    // Display token info
    const payload = tokenResponse.access_token.split('.')[1];
    const paddedPayload = payload + '='.repeat((4 - payload.length % 4) % 4);
    const decodedPayload = JSON.parse(Buffer.from(paddedPayload, 'base64').toString());

    print('\n📋 Token Claims:', colors.cyan);
    print(`   User: ${decodedPayload.upn || decodedPayload.unique_name || 'N/A'}`, colors.cyan);
    print(`   Name: ${decodedPayload.name || 'N/A'}`, colors.cyan);
    print(`   Roles: ${decodedPayload.roles ? decodedPayload.roles.join(', ') : 'N/A'}`, colors.cyan);
    print(`   App Roles: ${decodedPayload.wids ? decodedPayload.wids.join(', ') : 'N/A'}\n`, colors.cyan);

    print('✅ Ready for API testing! Run: ./admin-portal-comprehensive-test.sh\n', colors.green + colors.bright);

  } catch (error) {
    print(`\n❌ Error: ${error.message}`, colors.red);
    process.exit(1);
  }
}

main();
