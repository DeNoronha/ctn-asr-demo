// Simple test to call the identifier API and see the actual error
const https = require('node:https');

// You'll need to get an auth token from the browser
// 1. Open DevTools -> Application -> Session Storage
// 2. Find the MSAL token entry
// 3. Copy the access_token value

const TOKEN = process.env.AUTH_TOKEN || 'YOUR_TOKEN_HERE';
const LEGAL_ENTITY_ID = '75d44bd4-fb7f-4406-b31a-20af89506d12'; // From the screenshot

const data = JSON.stringify({
  identifier_type: 'KVK',
  identifier_value: '95944192',
  country_code: 'NL',
});

const options = {
  hostname: 'func-ctn-demo-asr-dev.azurewebsites.net',
  port: 443,
  path: `/api/v1/entities/${LEGAL_ENTITY_ID}/identifiers`,
  method: 'POST',
  headers: {
    'Content-Type': 'application/json',
    'Content-Length': data.length,
    Authorization: `Bearer ${TOKEN}`,
  },
};

console.log('Testing POST to:', `https://${options.hostname}${options.path}`);
console.log('Request body:', data);
console.log('\nSending request...\n');

const req = https.request(options, (res) => {
  console.log(`Status Code: ${res.statusCode}`);
  console.log(`Status Message: ${res.statusMessage}`);
  console.log('\nResponse Headers:');
  console.log(JSON.stringify(res.headers, null, 2));
  console.log('\nResponse Body:');

  let body = '';
  res.on('data', (chunk) => {
    body += chunk;
  });

  res.on('end', () => {
    try {
      const json = JSON.parse(body);
      console.log(JSON.stringify(json, null, 2));
    } catch (_e) {
      console.log(body);
    }

    if (res.statusCode >= 400) {
      console.log('\n❌ Request failed!');
      process.exit(1);
    } else {
      console.log('\n✅ Request succeeded!');
    }
  });
});

req.on('error', (error) => {
  console.error('❌ Request error:', error);
  process.exit(1);
});

req.write(data);
req.end();
