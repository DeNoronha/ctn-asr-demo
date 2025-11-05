/**
 * Generate RSA Key Pair for BDI BVAD Signing
 *
 * Run: node scripts/generate-bdi-keys.js
 *
 * This will generate:
 * - Private key (for signing BVADs) - Store in Azure Key Vault as BDI_PRIVATE_KEY
 * - Public key (for JWKS endpoint) - Store in Azure Key Vault as BDI_PUBLIC_KEY
 */

const crypto = require('crypto');
const fs = require('fs');
const path = require('path');

console.log('🔐 Generating RSA-2048 key pair for BDI BVAD signing...\n');

// Generate 2048-bit RSA key pair
const { publicKey, privateKey } = crypto.generateKeyPairSync('rsa', {
  modulusLength: 2048,
  publicKeyEncoding: {
    type: 'spki',
    format: 'pem'
  },
  privateKeyEncoding: {
    type: 'pkcs8',
    format: 'pem'
  }
});

// Generate key ID based on current date
const keyId = `ctn-bdi-${new Date().getFullYear()}-${String(Date.now()).slice(-6)}`;

console.log('✅ Key pair generated successfully!\n');
console.log('📋 Key ID:', keyId);
console.log('\n='.repeat(80));

// Save to files
const outputDir = path.join(__dirname, '../keys');
if (!fs.existsSync(outputDir)) {
  fs.mkdirSync(outputDir, { recursive: true });
}

const privateKeyPath = path.join(outputDir, 'bdi-private-key.pem');
const publicKeyPath = path.join(outputDir, 'bdi-public-key.pem');
const envPath = path.join(outputDir, 'bdi-keys.env');

fs.writeFileSync(privateKeyPath, privateKey);
fs.writeFileSync(publicKeyPath, publicKey);

console.log('\n📁 Keys saved to:');
console.log('   Private:', privateKeyPath);
console.log('   Public:', publicKeyPath);

// Create .env file template
const envContent = `# BDI Key Configuration
# Add these to Azure Key Vault and reference in Function App settings

BDI_KEY_ID=${keyId}
BDI_PRIVATE_KEY="${privateKey.replace(/\n/g, '\\n')}"
BDI_PUBLIC_KEY="${publicKey.replace(/\n/g, '\\n')}"
`;

fs.writeFileSync(envPath, envContent);
console.log('   .env:', envPath);

console.log('\n' + '='.repeat(80));
console.log('\n🔐 SECURITY INSTRUCTIONS:\n');
console.log('1. ADD TO AZURE KEY VAULT:');
console.log('   az keyvault secret set --vault-name ctn-demo-kv --name BDI-PRIVATE-KEY --file', privateKeyPath);
console.log('   az keyvault secret set --vault-name ctn-demo-kv --name BDI-PUBLIC-KEY --file', publicKeyPath);
console.log('   az keyvault secret set --vault-name ctn-demo-kv --name BDI-KEY-ID --value', keyId);
console.log('');
console.log('2. REFERENCE IN FUNCTION APP:');
console.log('   BDI_PRIVATE_KEY=@Microsoft.KeyVault(SecretUri=https://ctn-demo-kv.vault.azure.net/secrets/BDI-PRIVATE-KEY)');
console.log('   BDI_PUBLIC_KEY=@Microsoft.KeyVault(SecretUri=https://ctn-demo-kv.vault.azure.net/secrets/BDI-PUBLIC-KEY)');
console.log('   BDI_KEY_ID=@Microsoft.KeyVault(SecretUri=https://ctn-demo-kv.vault.azure.net/secrets/BDI-KEY-ID)');
console.log('');
console.log('3. DELETE LOCAL FILES after upload:');
console.log('   rm -rf', outputDir);
console.log('');
console.log('4. TEST JWKS ENDPOINT:');
console.log('   curl https://func-ctn-demo-asr-dev.azurewebsites.net/api/.well-known/jwks');
console.log('');
console.log('⚠️  NEVER commit private keys to git!');
console.log('');
console.log('='.repeat(80));
