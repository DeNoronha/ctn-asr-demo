// Test index - gradually add functions back
console.log('Starting test index...');

// Try importing health check first (simplest function)
try {
  console.log('Importing healthCheck...');
  require('./functions/healthCheck');
  console.log('✓ healthCheck imported successfully');
} catch (error) {
  console.error('✗ healthCheck import failed:', error);
}

// Try importing simpleTest
try {
  console.log('Importing simpleTest...');
  require('./functions/simpleTest');
  console.log('✓ simpleTest imported successfully');
} catch (error) {
  console.error('✗ simpleTest import failed:', error);
}

// Try importing bdiJwks (doesn't use database)
try {
  console.log('Importing bdiJwks...');
  require('./functions/bdiJwks');
  console.log('✓ bdiJwks imported successfully');
} catch (error) {
  console.error('✗ bdiJwks import failed:', error);
}

// Try importing GetAuthenticatedMember (critical for portals)
try {
  console.log('Importing GetAuthenticatedMember...');
  require('./functions/GetAuthenticatedMember');
  console.log('✓ GetAuthenticatedMember imported successfully');
} catch (error) {
  console.error('✗ GetAuthenticatedMember import failed:', error);
}

// Try importing GetMembers
try {
  console.log('Importing GetMembers...');
  require('./functions/GetMembers');
  console.log('✓ GetMembers imported successfully');
} catch (error) {
  console.error('✗ GetMembers import failed:', error);
}

console.log('Test index loaded - check which functions registered');
