/**
 * Quick API Check - Tests if new routes are deployed
 */

const { config, validateConfig } = require('./config');
const { apiRequest } = require('./utils');

validateConfig();

const API_EMAIL = config.auth.username;
const API_PASSWORD = config.auth.password;

async function main() {
  console.log('Quick API Check - Testing New Routes');
  console.log('=====================================\n');

  // Get token
  console.log('Acquiring token...');
  const authResponse = await apiRequest('/authenticate', {
    method: 'POST',
    body: {
      email: API_EMAIL,
      password: API_PASSWORD
    }
  });

  if (authResponse.status !== 200) {
    console.log('❌ Auth failed:', authResponse.status);
    return;
  }

  const token = authResponse.body.token;
  console.log('✅ Token acquired\n');

  // Test GET /contacts/:contactId (should exist in new code, 404 is OK)
  console.log('Testing: GET /v1/contacts/00000000-0000-0000-0000-000000000000');
  const contactTest = await apiRequest('/contacts/00000000-0000-0000-0000-000000000000', {
    headers: { Authorization: `Bearer ${token}` }
  });
  console.log('  Status:', contactTest.status);
  console.log('  Body:', JSON.stringify(contactTest.body).substring(0, 100));

  if (contactTest.status === 404) {
    console.log('  ✅ Route exists (404 = not found, but route handled request)');
  } else if (contactTest.status === 500) {
    console.log('  ❌ Route missing (500 = old code, route doesn\'t exist)');
  }
  console.log('');

  // Test GET /identifiers/:identifierId (should exist in new code, 404 is OK)
  console.log('Testing: GET /v1/identifiers/00000000-0000-0000-0000-000000000000');
  const identifierTest = await apiRequest('/identifiers/00000000-0000-0000-0000-000000000000', {
    headers: { Authorization: `Bearer ${token}` }
  });
  console.log('  Status:', identifierTest.status);
  console.log('  Body:', JSON.stringify(identifierTest.body).substring(0, 100));

  if (identifierTest.status === 404) {
    console.log('  ✅ Route exists (404 = not found, but route handled request)');
  } else if (identifierTest.status === 500) {
    console.log('  ❌ Route missing (500 = old code, route doesn\'t exist)');
  }
  console.log('');

  console.log('=====================================');
  if (contactTest.status === 404 && identifierTest.status === 404) {
    console.log('✅ NEW CODE DEPLOYED - Routes exist!');
    process.exit(0);
  } else {
    console.log('❌ OLD CODE STILL RUNNING - Routes missing');
    process.exit(1);
  }
}

main().catch(err => {
  console.error('Error:', err);
  process.exit(1);
});
