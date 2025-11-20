const https = require('https');

const API_BASE = 'https://ca-ctn-asr-api-dev.calmriver-700a8c55.westeurope.azurecontainerapps.io/api/v1';
const TEST_USER_EMAIL = 'test-e2@denoronha.consulting';
const TEST_USER_PASSWORD = process.env.E2E_TEST_USER_PASSWORD;

let authToken = null;

async function request(url, options = {}) {
  return new Promise((resolve, reject) => {
    const urlObj = new URL(url);
    const reqOptions = {
      hostname: urlObj.hostname,
      port: urlObj.port || 443,
      path: urlObj.pathname + urlObj.search,
      method: options.method || 'GET',
      headers: options.headers || {},
      timeout: 30000
    };

    const req = https.request(reqOptions, (res) => {
      let data = '';
      res.on('data', (chunk) => data += chunk);
      res.on('end', () => {
        try {
          resolve({ status: res.statusCode, data: data ? JSON.parse(data) : null, headers: res.headers });
        } catch (e) {
          resolve({ status: res.statusCode, data: data, headers: res.headers });
        }
      });
    });

    req.on('error', reject);
    req.on('timeout', () => {
      req.destroy();
      reject(new Error('Request timeout'));
    });

    if (options.body) {
      req.write(JSON.stringify(options.body));
    }
    req.end();
  });
}

async function authenticate() {
  console.log('🔐 Authenticating...');
  const response = await request(`${API_BASE}/auth/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: { email: TEST_USER_EMAIL, password: TEST_USER_PASSWORD }
  });

  if (response.status === 200 && response.data.token) {
    authToken = response.data.token;
    console.log('✅ Authentication successful\n');
    return true;
  } else {
    console.error('❌ Authentication failed:', response.status, response.data);
    return false;
  }
}

async function testEndpoint(name, url, expectedStatus = 200) {
  try {
    const response = await request(url, {
      headers: { 'Authorization': `Bearer ${authToken}` }
    });

    if (response.status === expectedStatus) {
      console.log(`✅ ${name}: ${response.status}`);
      return { passed: true, response };
    } else {
      console.log(`❌ ${name}: Expected ${expectedStatus}, got ${response.status}`);
      if (response.data && response.data.error) {
        console.log(`   Error: ${response.data.error}`);
      }
      return { passed: false, response };
    }
  } catch (error) {
    console.log(`❌ ${name}: ${error.message}`);
    return { passed: false, error };
  }
}

async function main() {
  console.log('='.repeat(60));
  console.log('🧪 Deployment Verification - Schema Column Fixes');
  console.log('='.repeat(60));
  console.log(`📅 Time: ${new Date().toISOString()}`);
  console.log(`🔗 API: ${API_BASE}\n`);

  if (!await authenticate()) {
    process.exit(1);
  }

  const results = [];

  // Get test entity ID from member context
  console.log('📋 Getting test entity ID...');
  const memberRes = await testEndpoint(
    'Get current member',
    `${API_BASE}/member`
  );

  if (!memberRes.passed || !memberRes.response.data || !memberRes.response.data.legalEntityId) {
    console.error('❌ Cannot get test entity ID');
    process.exit(1);
  }

  const entityId = memberRes.response.data.legalEntityId;
  console.log(`✅ Test entity ID: ${entityId}\n`);

  console.log('='.repeat(60));
  console.log('🧪 Testing Previously Failing Endpoints');
  console.log('='.repeat(60));

  // Test 1: Tier info endpoint (was failing with tier_verified_at error)
  console.log('\n1️⃣  Tier Info Endpoint (tier_verified_at fix)');
  console.log('-'.repeat(60));
  results.push(await testEndpoint(
    'GET /v1/entities/:id/tier',
    `${API_BASE}/entities/${entityId}/tier`
  ));

  // Test 2: DNS tokens endpoint (was failing with dt_created error)
  console.log('\n2️⃣  DNS Tokens Endpoint (dt_created fix)');
  console.log('-'.repeat(60));
  results.push(await testEndpoint(
    'GET /v1/entities/:id/dns/tokens',
    `${API_BASE}/entities/${entityId}/dns/tokens`
  ));

  // Test 3: M2M clients endpoint (was failing with client_id error)
  console.log('\n3️⃣  M2M Clients Endpoint (client_id fix)');
  console.log('-'.repeat(60));
  results.push(await testEndpoint(
    'GET /v1/legal-entities/:id/m2m-clients',
    `${API_BASE}/legal-entities/${entityId}/m2m-clients`
  ));

  // Test 4: Contacts endpoint (also had schema issues)
  console.log('\n4️⃣  Contacts Endpoint');
  console.log('-'.repeat(60));
  results.push(await testEndpoint(
    'GET /v1/legal-entities/:id/contacts',
    `${API_BASE}/legal-entities/${entityId}/contacts`
  ));

  // Summary
  console.log('\n' + '='.repeat(60));
  console.log('📊 Deployment Verification Summary');
  console.log('='.repeat(60));

  const passed = results.filter(r => r.passed).length;
  const total = results.length;

  console.log(`✅ Passed: ${passed}/${total}`);
  console.log(`❌ Failed: ${total - passed}/${total}`);

  if (passed === total) {
    console.log('\n🎉 ALL SCHEMA FIXES VERIFIED - Deployment successful!');
    process.exit(0);
  } else {
    console.log('\n⚠️  Some endpoints still failing - check Container App logs');
    process.exit(1);
  }
}

main().catch(err => {
  console.error('Fatal error:', err);
  process.exit(1);
});
