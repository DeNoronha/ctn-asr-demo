/**
 * Startup Diagnostics for Azure Functions
 * Comprehensive health checks and diagnostics to detect deployment/runtime issues
 */

export interface DiagnosticResult {
  check: string;
  status: 'PASS' | 'FAIL' | 'WARN';
  message: string;
  details?: any;
}

export interface StartupDiagnostics {
  timestamp: string;
  environment: string;
  nodeVersion: string;
  functionRuntime: string;
  checks: DiagnosticResult[];
  summary: {
    total: number;
    passed: number;
    failed: number;
    warnings: number;
  };
}

/**
 * Run comprehensive startup diagnostics
 */
export function runStartupDiagnostics(): StartupDiagnostics {
  const checks: DiagnosticResult[] = [];

  // 1. Node.js version check
  checks.push({
    check: 'Node.js Version',
    status: process.version.startsWith('v20.') ? 'PASS' : 'WARN',
    message: `Running Node.js ${process.version}`,
    details: { expected: 'v20.x', actual: process.version }
  });

  // 2. Azure Functions runtime check
  const azureFunctionsVersion = process.env.FUNCTIONS_EXTENSION_VERSION;
  checks.push({
    check: 'Azure Functions Runtime',
    status: azureFunctionsVersion ? 'PASS' : 'WARN',
    message: azureFunctionsVersion || 'Runtime version not detected',
    details: { version: azureFunctionsVersion }
  });

  // 3. Environment variables check
  const requiredEnvVars = [
    'POSTGRES_HOST',
    'POSTGRES_DATABASE',
    'POSTGRES_USER',
    'POSTGRES_PASSWORD',
    'AZURE_STORAGE_CONNECTION_STRING',
    'JWT_SECRET',
    'AZURE_AD_TENANT_ID',
    'AZURE_AD_CLIENT_ID'
  ];

  const missingEnvVars = requiredEnvVars.filter(v => !process.env[v]);
  checks.push({
    check: 'Required Environment Variables',
    status: missingEnvVars.length === 0 ? 'PASS' : 'FAIL',
    message: missingEnvVars.length === 0
      ? 'All required environment variables are set'
      : `Missing: ${missingEnvVars.join(', ')}`,
    details: {
      required: requiredEnvVars.length,
      missing: missingEnvVars.length,
      missingVars: missingEnvVars
    }
  });

  // 4. Optional environment variables check (won't fail startup)
  const optionalEnvVars = [
    'COSMOS_ORCHESTRATION_ENDPOINT',
    'COSMOS_ORCHESTRATION_KEY',
    'DOC_INTELLIGENCE_ENDPOINT',
    'KVK_API_KEY'
  ];

  const missingOptionalVars = optionalEnvVars.filter(v => !process.env[v]);
  if (missingOptionalVars.length > 0) {
    checks.push({
      check: 'Optional Environment Variables',
      status: 'WARN',
      message: `Optional features may be disabled: ${missingOptionalVars.join(', ')}`,
      details: { missingOptionalVars }
    });
  }

  // 5. Package dependencies check
  try {
    require('@azure/functions');
    checks.push({
      check: '@azure/functions Package',
      status: 'PASS',
      message: 'Azure Functions SDK loaded successfully'
    });
  } catch (error) {
    checks.push({
      check: '@azure/functions Package',
      status: 'FAIL',
      message: 'Failed to load Azure Functions SDK',
      details: { error: (error as Error).message }
    });
  }

  try {
    require('pg');
    checks.push({
      check: 'PostgreSQL Driver',
      status: 'PASS',
      message: 'PostgreSQL driver loaded successfully'
    });
  } catch (error) {
    checks.push({
      check: 'PostgreSQL Driver',
      status: 'FAIL',
      message: 'Failed to load PostgreSQL driver',
      details: { error: (error as Error).message }
    });
  }

  // 6. Application Insights check
  const appInsightsKey = process.env.APPLICATIONINSIGHTS_CONNECTION_STRING;
  checks.push({
    check: 'Application Insights',
    status: appInsightsKey ? 'PASS' : 'WARN',
    message: appInsightsKey ? 'Telemetry enabled' : 'Telemetry disabled',
    details: { enabled: !!appInsightsKey }
  });

  // Calculate summary
  const summary = {
    total: checks.length,
    passed: checks.filter(c => c.status === 'PASS').length,
    failed: checks.filter(c => c.status === 'FAIL').length,
    warnings: checks.filter(c => c.status === 'WARN').length
  };

  const diagnostics: StartupDiagnostics = {
    timestamp: new Date().toISOString(),
    environment: process.env.ENVIRONMENT || 'unknown',
    nodeVersion: process.version,
    functionRuntime: process.env.FUNCTIONS_EXTENSION_VERSION || 'unknown',
    checks,
    summary
  };

  return diagnostics;
}

/**
 * Log startup diagnostics in a formatted way
 */
export function logStartupDiagnostics(diagnostics: StartupDiagnostics): void {
  console.log('\n' + '='.repeat(80));
  console.log('🔍 AZURE FUNCTIONS STARTUP DIAGNOSTICS');
  console.log('='.repeat(80));
  console.log(`Timestamp: ${diagnostics.timestamp}`);
  console.log(`Environment: ${diagnostics.environment}`);
  console.log(`Node.js: ${diagnostics.nodeVersion}`);
  console.log(`Functions Runtime: ${diagnostics.functionRuntime}`);
  console.log('-'.repeat(80));

  // Log each check
  for (const check of diagnostics.checks) {
    const icon = check.status === 'PASS' ? '✅' : check.status === 'FAIL' ? '❌' : '⚠️';
    console.log(`${icon} ${check.check}: ${check.message}`);
    if (check.details && check.status !== 'PASS') {
      console.log(`   Details: ${JSON.stringify(check.details, null, 2)}`);
    }
  }

  console.log('-'.repeat(80));
  console.log(`Summary: ${diagnostics.summary.passed} passed, ${diagnostics.summary.failed} failed, ${diagnostics.summary.warnings} warnings`);
  console.log('='.repeat(80) + '\n');

  // Throw error if critical checks failed
  if (diagnostics.summary.failed > 0) {
    const failedChecks = diagnostics.checks
      .filter(c => c.status === 'FAIL')
      .map(c => c.check)
      .join(', ');
    throw new Error(`Startup diagnostics failed: ${failedChecks}`);
  }
}

/**
 * Run and log startup diagnostics (use at app startup)
 */
export function performStartupDiagnostics(): void {
  console.log('🚀 Running startup diagnostics...');
  const diagnostics = runStartupDiagnostics();
  logStartupDiagnostics(diagnostics);
}
