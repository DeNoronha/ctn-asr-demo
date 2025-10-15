/**
 * URGENT: Add KvK 95944192 to Contargo GmbH & Co. KG
 *
 * This script adds the KvK number directly via API call
 */

const https = require('https');
const fs = require('fs');
const path = require('path');

const API_BASE = 'https://func-ctn-demo-asr-dev.azurewebsites.net/api/v1';

// Read auth token from Playwright auth state
const authFilePath = path.join(__dirname, '../playwright/.auth/user.json');
const authState = JSON.parse(fs.readFileSync(authFilePath, 'utf8'));

// Extract access token from sessionStorage
let accessToken = null;
const appOrigin = authState.origins?.find(origin =>
  origin.origin.includes('azurestaticapps.net')
);

if (appOrigin?.sessionStorage) {
  for (const item of appOrigin.sessionStorage) {
    if (item.name.includes('accesstoken')) {
      try {
        const tokenData = JSON.parse(item.value);
        accessToken = tokenData.secret || tokenData.accessToken;
        break;
      } catch (e) {
        // Try as plain string
        accessToken = item.value;
      }
    }
  }
}

if (!accessToken) {
  console.error('❌ Could not find access token in auth state');
  process.exit(1);
}

console.log('✅ Found access token');

// Step 1: Get all members to find Contargo
function getAllMembers() {
  return new Promise((resolve, reject) => {
    const options = {
      hostname: 'func-ctn-demo-asr-dev.azurewebsites.net',
      port: 443,
      path: '/api/v1/all-members',
      method: 'GET',
      headers: {
        'Authorization': `Bearer ${accessToken}`,
        'Content-Type': 'application/json'
      }
    };

    const req = https.request(options, (res) => {
      let data = '';
      res.on('data', (chunk) => { data += chunk; });
      res.on('end', () => {
        if (res.statusCode === 200) {
          resolve(JSON.parse(data));
        } else {
          reject(new Error(`HTTP ${res.statusCode}: ${data}`));
        }
      });
    });

    req.on('error', reject);
    req.end();
  });
}

// Step 2: Create identifier for Contargo
function createIdentifier(entityId, identifier) {
  return new Promise((resolve, reject) => {
    const payload = JSON.stringify(identifier);

    const options = {
      hostname: 'func-ctn-demo-asr-dev.azurewebsites.net',
      port: 443,
      path: '/api/v1/identifiers',
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${accessToken}`,
        'Content-Type': 'application/json',
        'Content-Length': Buffer.byteLength(payload)
      }
    };

    const req = https.request(options, (res) => {
      let data = '';
      res.on('data', (chunk) => { data += chunk; });
      res.on('end', () => {
        if (res.statusCode === 200 || res.statusCode === 201) {
          console.log(`✅ Identifier created: ${data}`);
          resolve(JSON.parse(data));
        } else {
          reject(new Error(`HTTP ${res.statusCode}: ${data}`));
        }
      });
    });

    req.on('error', reject);
    req.write(payload);
    req.end();
  });
}

// Main execution
async function main() {
  try {
    console.log('🎯 MISSION: Add KvK 95944192 to Contargo GmbH & Co. KG');

    // Step 1: Find Contargo
    console.log('Step 1: Fetching all members...');
    const members = await getAllMembers();
    console.log(`✅ Found ${members.length} members`);

    const contargo = members.find(m =>
      m.legal_name && m.legal_name.includes('Contargo')
    );

    if (!contargo) {
      console.error('❌ CRITICAL: Contargo not found in members list!');
      console.log('Available members:', members.map(m => m.legal_name));
      process.exit(1);
    }

    console.log(`✅ Found Contargo: ${contargo.legal_name} (ID: ${contargo.entity_id})`);

    // Step 2: Create KvK identifier
    console.log('Step 2: Creating KvK identifier...');
    const identifier = {
      entity_id: contargo.entity_id,
      country_code: 'NL',
      identifier_type: 'KVK',
      identifier_value: '95944192',
      validation_status: 'PENDING'
    };

    const result = await createIdentifier(contargo.entity_id, identifier);
    console.log('✅✅✅ SUCCESS! KvK 95944192 added to Contargo!');
    console.log('Result:', JSON.stringify(result, null, 2));
    console.log('🎉 Ramon will see this tomorrow morning!');

  } catch (error) {
    console.error('❌ ERROR:', error.message);
    process.exit(1);
  }
}

main();
