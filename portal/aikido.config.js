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
