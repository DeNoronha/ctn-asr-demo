/**
 * Aikido Security Configuration (Reserved for Future Use)
 *
 * Note: Aikido Security is a commercial platform requiring:
 * - Cloud account (https://www.aikido.dev)
 * - API key from their platform
 * - Binary download (aikido-local-scanner)
 *
 * Current Security Scanning:
 * - npm audit (built-in dependency vulnerability scanning)
 * - Biome (code quality and basic security linting)
 *
 * To enable Aikido Security:
 * 1. Sign up at https://www.aikido.dev
 * 2. Download aikido-local-scanner binary
 * 3. Get API key from platform
 * 4. Update package.json scripts with: aikido-local-scanner scan
 *
 * This configuration file is kept for future integration.
 */

module.exports = {
  // Scan configuration
  scanners: {
    sast: true,           // Static analysis
    sca: true,            // Dependency scanning
    secrets: true,        // Secret detection
    iac: true,            // Infrastructure as Code
    containers: false     // Set to true if using Docker
  },

  // Severity threshold
  failOn: ['high', 'critical'],

  // Paths to scan
  include: [
    'src/**/*',
    'public/**/*',
    'package.json',
    'package-lock.json'
  ],

  // Paths to ignore
  exclude: [
    'node_modules/**',
    'build/**',
    'dist/**',
    '.next/**',
    'coverage/**',
    'reports/**',
    '**/*.test.ts',
    '**/*.test.tsx'
  ],

  // Output configuration
  output: {
    format: 'json',
    path: 'reports/aikido-results.json'
  }
};
