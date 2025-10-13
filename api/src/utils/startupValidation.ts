// ========================================
// Startup Validation
// ========================================
// Validates required environment variables and configuration on startup
// Fails fast if critical secrets are missing

/**
 * Required environment variables for the API to function
 */
const REQUIRED_SECRETS = [
  'POSTGRES_HOST',
  'POSTGRES_DATABASE',
  'POSTGRES_USER',
  'POSTGRES_PASSWORD',
  'AZURE_STORAGE_CONNECTION_STRING',
  'COMMUNICATION_SERVICES_CONNECTION_STRING',
  'DOC_INTELLIGENCE_KEY',
  'AZURE_AD_TENANT_ID',
  'AZURE_AD_CLIENT_ID',
  'JWT_SECRET',
] as const;

/**
 * Optional environment variables with warnings if missing
 */
const OPTIONAL_SECRETS = [
  'EVENT_GRID_ACCESS_KEY',
  'KVK_API_KEY',
  'JWT_ISSUER',
] as const;

/**
 * Production-only required secrets
 */
const PRODUCTION_REQUIRED = [
  'EVENT_GRID_ACCESS_KEY',
] as const;

export interface ValidationResult {
  valid: boolean;
  missing: string[];
  warnings: string[];
  httpsEnforced: boolean;
}

/**
 * Validate all required environment variables are configured
 * @returns Validation result with missing secrets
 */
export function validateEnvironmentSecrets(): ValidationResult {
  const missing: string[] = [];
  const warnings: string[] = [];
  const nodeEnv = process.env.NODE_ENV || 'development';
  const isProduction = nodeEnv === 'production';

  // Check required secrets
  for (const secret of REQUIRED_SECRETS) {
    if (!process.env[secret]) {
      missing.push(secret);
    }
  }

  // Check production-only required secrets
  if (isProduction) {
    for (const secret of PRODUCTION_REQUIRED) {
      if (!process.env[secret]) {
        missing.push(secret);
      }
    }
  }

  // Check optional secrets
  for (const secret of OPTIONAL_SECRETS) {
    if (!process.env[secret]) {
      warnings.push(`Optional secret ${secret} is not configured - some features may not work`);
    }
  }

  // Validate JWT secret strength (if present)
  if (process.env.JWT_SECRET) {
    const jwtSecret = process.env.JWT_SECRET;
    if (jwtSecret.length < 32) {
      warnings.push('JWT_SECRET is too short (minimum 32 characters recommended for HS256)');
    }
    if (jwtSecret === 'demo-secret' || jwtSecret === 'secret' || jwtSecret === 'changeme') {
      missing.push('JWT_SECRET (using insecure default value)');
    }
  }

  // Check HTTPS enforcement in production
  const httpsEnforced = isProduction ? (process.env.HTTPS_ONLY === 'true') : true;
  if (isProduction && !httpsEnforced) {
    warnings.push('HTTPS_ONLY is not enabled in production environment');
  }

  return {
    valid: missing.length === 0,
    missing,
    warnings,
    httpsEnforced,
  };
}

/**
 * Validate environment on startup and fail fast if required secrets are missing
 * @throws Error if validation fails
 */
export function enforceStartupValidation(): void {
  const result = validateEnvironmentSecrets();

  // Log warnings
  if (result.warnings.length > 0) {
    console.warn('⚠️  Configuration Warnings:');
    result.warnings.forEach((warning) => {
      console.warn(`   - ${warning}`);
    });
  }

  // Fail fast if required secrets are missing
  if (!result.valid) {
    console.error('❌ STARTUP VALIDATION FAILED - Missing required environment variables:');
    result.missing.forEach((secret) => {
      console.error(`   - ${secret}`);
    });
    console.error('');
    console.error('Please configure all required secrets in:');
    console.error('  - Azure Function App Settings (production)');
    console.error('  - local.settings.json (local development)');
    console.error('  - Azure Key Vault (recommended for all secrets)');
    console.error('');
    throw new Error('Missing required environment variables - cannot start API');
  }

  // Log success
  console.log('✅ Startup validation passed - all required secrets configured');
  if (!result.httpsEnforced) {
    console.warn('⚠️  HTTPS enforcement is disabled');
  }
}

/**
 * Check if running in secure HTTPS mode
 * In production, all requests should use HTTPS
 */
export function validateHttpsRequest(url: string, nodeEnv: string = process.env.NODE_ENV || 'development'): boolean {
  if (nodeEnv === 'production') {
    // In production, enforce HTTPS
    if (!url.startsWith('https://')) {
      return false;
    }
  }
  // In development, allow HTTP
  return true;
}
