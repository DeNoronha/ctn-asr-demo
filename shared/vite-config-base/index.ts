import type { UserConfig } from 'vite';

/**
 * Environment variable configuration for portal-specific settings
 */
export interface EnvVarConfig {
  /** Name of the environment variable */
  name: string;
  /** Value from process.env */
  value: string;
}

/**
 * Options for creating a Vite configuration
 */
export interface ViteConfigOptions {
  /** Server port (default: 3000) */
  port?: number;

  /** Whether to open browser on start (default: true) */
  openBrowser?: boolean;

  /** Build output directory (default: 'build') */
  outDir?: string;

  /** Enable source maps (default: true) */
  sourcemap?: boolean;

  /** List of required environment variables to validate */
  requiredEnvVars: string[];

  /** Environment variables to define in the build */
  envVars: EnvVarConfig[];

  /** Additional Vite plugins (optional) */
  additionalPlugins?: any[];
}

/**
 * Validates required environment variables and logs warnings for missing ones
 */
function validateEnvironmentVariables(requiredEnvVars: string[]): void {
  const missingEnvVars = requiredEnvVars.filter((varName) => !process.env[varName]);

  if (missingEnvVars.length > 0) {
    console.warn('\n⚠️  Warning: Missing required environment variables:');
    missingEnvVars.forEach((varName) => console.warn(`   - ${varName}`));
    console.warn('   Application may not function correctly.\n');
  }
}

/**
 * Creates environment variable definitions for Vite's define option
 */
function createEnvDefinitions(envVars: EnvVarConfig[]): Record<string, string> {
  const definitions: Record<string, string> = {};

  for (const { name, value } of envVars) {
    definitions[`process.env.${name}`] = JSON.stringify(value || '');
  }

  return definitions;
}

/**
 * Creates a Vite configuration factory with shared defaults and portal-specific customizations
 *
 * This function returns a factory that accepts plugin instances, avoiding import issues in config files.
 *
 * @param options Configuration options for the portal
 * @returns Factory function that accepts plugins and returns Vite UserConfig object
 */
export function createViteConfig(options: ViteConfigOptions) {
  const {
    port = 3000,
    openBrowser = true,
    outDir = 'build',
    sourcemap = true,
    requiredEnvVars,
    envVars,
    additionalPlugins = [],
  } = options;

  // Validate environment variables
  validateEnvironmentVariables(requiredEnvVars);

  // Create environment definitions
  const envDefinitions = createEnvDefinitions(envVars);

  // Return a factory function that accepts plugin instances
  return (...plugins: any[]): UserConfig => ({
    plugins: [...plugins, ...additionalPlugins],
    server: {
      port,
      open: openBrowser,
    },
    build: {
      outDir,
      sourcemap,
    },
    define: {
      // Vite environment variables
      // Use process.env directly to read shell environment variables from Azure DevOps
      ...envDefinitions,
    },
  });
}

/**
 * Helper function to create environment variable configurations from a list of variable names
 *
 * @param varNames Array of environment variable names
 * @returns Array of EnvVarConfig objects
 */
export function createEnvVarConfigs(varNames: string[]): EnvVarConfig[] {
  return varNames.map((name) => ({
    name,
    value: process.env[name] || '',
  }));
}
