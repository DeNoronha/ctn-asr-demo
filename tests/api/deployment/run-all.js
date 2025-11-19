#!/usr/bin/env node

/**
 * Main Test Runner for API Deployment Tests
 *
 * Runs all deployment verification tests in sequence.
 *
 * Usage:
 *   node run-all.js           # Run all tests
 *   node run-all.js health    # Run specific test
 *   node run-all.js --help    # Show help
 *
 * Environment:
 *   E2E_TEST_USER_PASSWORD - Required
 *   API_URL - Optional
 */

const { spawn } = require('child_process');
const path = require('path');

// Available tests
const tests = {
  health: {
    file: 'health.test.js',
    description: 'Health & core endpoints',
    order: 1,
  },
  contacts: {
    file: 'contacts.test.js',
    description: 'Contact CRUD operations',
    order: 2,
  },
  identifiers: {
    file: 'identifiers.test.js',
    description: 'Identifier CRUD operations',
    order: 3,
  },
  security: {
    file: 'security.test.js',
    description: 'Security controls (IDOR, auth, validation)',
    order: 4,
  },
};

// Parse arguments
const args = process.argv.slice(2);

if (args.includes('--help') || args.includes('-h')) {
  console.log(`
API Deployment Test Runner

Usage:
  node run-all.js [options] [test-names...]

Options:
  --help, -h     Show this help message
  --list, -l     List available tests
  --quick, -q    Run only health tests (quick verification)

Available Tests:
${Object.entries(tests)
    .sort((a, b) => a[1].order - b[1].order)
    .map(([name, t]) => `  ${name.padEnd(15)} ${t.description}`)
    .join('\n')}

Examples:
  node run-all.js              # Run all tests
  node run-all.js health       # Run health tests only
  node run-all.js --quick      # Quick deployment verification

Environment Variables:
  E2E_TEST_USER_PASSWORD   Azure AD test user password (required)
  API_URL                  API base URL (optional)
  VERBOSE                  Set to 'true' for verbose output
`);
  process.exit(0);
}

if (args.includes('--list') || args.includes('-l')) {
  console.log('Available tests:\n');
  Object.entries(tests)
    .sort((a, b) => a[1].order - b[1].order)
    .forEach(([name, t]) => {
      console.log(`  ${name.padEnd(15)} ${t.description}`);
    });
  process.exit(0);
}

// Determine which tests to run
let testsToRun;

if (args.includes('--quick') || args.includes('-q')) {
  testsToRun = ['health'];
} else if (args.length > 0 && !args[0].startsWith('-')) {
  testsToRun = args.filter(a => !a.startsWith('-'));
  // Validate test names
  const invalid = testsToRun.filter(t => !tests[t]);
  if (invalid.length > 0) {
    console.error(`Unknown tests: ${invalid.join(', ')}`);
    console.error(`Run with --list to see available tests`);
    process.exit(1);
  }
} else {
  testsToRun = Object.keys(tests).sort((a, b) => tests[a].order - tests[b].order);
}

// Run tests
async function runTest(name) {
  const test = tests[name];
  const testPath = path.join(__dirname, test.file);

  return new Promise((resolve) => {
    console.log(`\n${'='.repeat(60)}`);
    console.log(`Running: ${name} - ${test.description}`);
    console.log(`${'='.repeat(60)}\n`);

    const proc = spawn('node', [testPath], {
      stdio: 'inherit',
      env: process.env,
    });

    proc.on('close', (code) => {
      resolve({ name, success: code === 0 });
    });

    proc.on('error', (error) => {
      console.error(`Failed to start test: ${error.message}`);
      resolve({ name, success: false });
    });
  });
}

async function main() {
  console.log('='.repeat(60));
  console.log('CTN ASR API Deployment Tests');
  console.log('='.repeat(60));
  console.log(`Tests to run: ${testsToRun.join(', ')}`);
  console.log(`API URL: ${process.env.API_URL || '(default)'}`);

  const startTime = Date.now();
  const results = [];

  for (const testName of testsToRun) {
    const result = await runTest(testName);
    results.push(result);

    // Stop on first failure if running all tests
    if (!result.success && testsToRun.length > 1) {
      console.log(`\nStopping test run due to failure in: ${testName}`);
      break;
    }
  }

  // Print summary
  const duration = Date.now() - startTime;
  const passed = results.filter(r => r.success).length;
  const failed = results.filter(r => !r.success).length;

  console.log(`\n${'='.repeat(60)}`);
  console.log('Test Run Summary');
  console.log('='.repeat(60));

  results.forEach(r => {
    const status = r.success ? '\x1b[32m✓\x1b[0m' : '\x1b[31m✗\x1b[0m';
    console.log(`${status} ${r.name}`);
  });

  console.log('');
  console.log(`Total: ${results.length}, Passed: ${passed}, Failed: ${failed}`);
  console.log(`Duration: ${(duration / 1000).toFixed(1)}s`);
  console.log('='.repeat(60));

  process.exit(failed > 0 ? 1 : 0);
}

main().catch(error => {
  console.error('Test runner failed:', error.message);
  process.exit(1);
});
