# @ctn-asr/vite-config-base

Shared Vite configuration for CTN ASR portals (Admin and Member).

## Purpose

This package provides a centralized Vite configuration that:
- Eliminates duplication across multiple portal configurations
- Ensures consistency in build settings, plugins, and environment handling
- Simplifies maintenance by centralizing common configuration
- Provides type-safe configuration options

## Installation

This is an internal package. Both portals import it directly via relative path:

```typescript
import { createViteConfig, createEnvVarConfigs } from '../shared/vite-config-base';
```

## Usage

### Basic Setup

```typescript
import react from '@vitejs/plugin-react';
import { defineConfig } from 'vite';
import svgr from 'vite-plugin-svgr';
import viteTsconfigPaths from 'vite-tsconfig-paths';
import { createViteConfig, createEnvVarConfigs } from '../shared/vite-config-base';

// Define portal-specific environment variables
const requiredEnvVars = [
  'VITE_AZURE_CLIENT_ID',
  'VITE_AZURE_TENANT_ID',
  'VITE_API_URL',
];

export default defineConfig(
  createViteConfig({
    port: 3000,
    openBrowser: true,
    outDir: 'build',
    sourcemap: true,
    requiredEnvVars,
    envVars: createEnvVarConfigs(requiredEnvVars),
  })(
    react(),
    viteTsconfigPaths(),
    svgr({
      include: '**/*.svg?react',
    })
  )
);
```

## API Reference

### `createViteConfig(options)`

Creates a Vite configuration factory with shared defaults.

**Parameters:**

- `options` (ViteConfigOptions): Configuration options

**Returns:** A factory function that accepts plugin instances and returns a Vite UserConfig object.

### ViteConfigOptions

```typescript
interface ViteConfigOptions {
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
```

### `createEnvVarConfigs(varNames)`

Helper function to create environment variable configurations from a list of variable names.

**Parameters:**

- `varNames` (string[]): Array of environment variable names

**Returns:** Array of EnvVarConfig objects

**Example:**

```typescript
const envVars = createEnvVarConfigs(['VITE_API_URL', 'VITE_CLIENT_ID']);
// Returns:
// [
//   { name: 'VITE_API_URL', value: process.env.VITE_API_URL || '' },
//   { name: 'VITE_CLIENT_ID', value: process.env.VITE_CLIENT_ID || '' }
// ]
```

## Features

### Environment Variable Validation

The shared config automatically validates required environment variables and logs warnings for missing ones:

```
⚠️  Warning: Missing required environment variables:
   - VITE_API_URL
   - VITE_CLIENT_ID
   Application may not function correctly.
```

### Consistent Plugin Configuration

All portals share the same plugin configuration:
- React plugin with Fast Refresh
- TypeScript path resolution
- SVG as React components

### Build Settings

Common build settings across all portals:
- Output directory: `build/`
- Source maps: enabled
- Server port: 3000 (configurable)
- Auto-open browser on start

## Portal-Specific Customization

Each portal can customize:

1. **Environment Variables**: Define portal-specific required environment variables
2. **Port**: Override the default port if needed
3. **Additional Plugins**: Add portal-specific plugins via `additionalPlugins`

### Example: Admin Portal

```typescript
const requiredEnvVars = [
  'VITE_AZURE_CLIENT_ID',
  'VITE_AZURE_TENANT_ID',
  'VITE_REDIRECT_URI',
  'VITE_API_URL',
];

export default defineConfig(
  createViteConfig({
    port: 3000,
    requiredEnvVars,
    envVars: createEnvVarConfigs(requiredEnvVars),
  })(/* plugins */)
);
```

### Example: Member Portal

```typescript
const requiredEnvVars = [
  'VITE_AAD_CLIENT_ID',
  'VITE_AAD_AUTHORITY',
  'VITE_AAD_REDIRECT_URI',
  'VITE_API_CLIENT_ID',
  'VITE_API_BASE_URL',
];

const additionalEnvVars = ['NODE_ENV'];

export default defineConfig(
  createViteConfig({
    port: 3000,
    requiredEnvVars,
    envVars: [
      ...createEnvVarConfigs(requiredEnvVars),
      ...createEnvVarConfigs(additionalEnvVars),
    ],
  })(/* plugins */)
);
```

## Architecture

### Factory Pattern

The configuration uses a factory pattern to avoid module import issues:

1. `createViteConfig(options)` - Creates a factory with validated options
2. Factory accepts plugin instances - `(react(), viteTsconfigPaths(), svgr())`
3. Returns final Vite UserConfig object

This pattern ensures:
- Plugin imports are resolved in the portal's context
- Shared configuration logic is centralized
- Type safety is maintained

## Maintenance

### Adding New Common Configuration

To add configuration that applies to all portals:

1. Update the factory function in `index.ts`
2. Add appropriate types to `ViteConfigOptions` if needed
3. Update this README with the new feature
4. Test both portals

### Adding Portal-Specific Configuration

Portal-specific configuration should remain in the portal's `vite.config.ts`:

```typescript
export default defineConfig(
  createViteConfig({
    // ... shared config
    additionalPlugins: [portalSpecificPlugin()],
  })(/* standard plugins */)
);
```

## Testing

After making changes to the shared configuration:

```bash
# Test Admin Portal
cd web
npm run typecheck
npm run build
npm start  # Verify dev server starts

# Test Member Portal
cd portal
npm run typecheck
npm run build
npm start  # Verify dev server starts
```

## Files

- `index.ts` - Main configuration factory and helper functions
- `package.json` - Package metadata and peer dependencies
- `README.md` - This documentation

## Dependencies

Peer dependencies (must be installed in consuming portals):

- `vite` ^7.0.0
- `@vitejs/plugin-react` ^5.0.0
- `vite-plugin-svgr` ^4.0.0
- `vite-tsconfig-paths` ^5.0.0

## Version History

### 1.0.0 (2025-10-19)

- Initial release
- Centralized Vite configuration for Admin and Member portals
- Environment variable validation
- Factory pattern for plugin management
- Type-safe configuration options
