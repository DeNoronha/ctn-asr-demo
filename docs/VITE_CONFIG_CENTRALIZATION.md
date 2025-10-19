# Vite Configuration Centralization

**Date:** October 19, 2025
**Status:** ✅ Completed
**Impact:** Both Admin and Member Portals

---

## Overview

Successfully centralized Vite configuration across the Admin Portal (`web/`) and Member Portal (`portal/`) to eliminate duplication, improve maintainability, and ensure consistency.

## Problem

Both portals had nearly identical `vite.config.ts` files with:
- Duplicated plugin configuration
- Duplicated build settings
- Duplicated environment variable validation logic
- Only differences: portal-specific environment variable names

This duplication:
- Increased maintenance burden (changes needed in 2 places)
- Risk of configuration drift between portals
- Violated DRY principle

## Solution

Created a shared configuration package at `shared/vite-config-base/` using a factory pattern.

### Architecture

```
shared/vite-config-base/
├── index.ts           # Configuration factory and helpers
├── package.json       # Package metadata
└── README.md          # Comprehensive documentation

web/vite.config.ts     # Admin Portal (uses shared config)
portal/vite.config.ts  # Member Portal (uses shared config)
```

### Factory Pattern

The shared config uses a factory pattern to avoid module import issues:

```typescript
// Factory accepts options
createViteConfig(options)
  // Returns function that accepts plugin instances
  (react(), viteTsconfigPaths(), svgr())
  // Returns final UserConfig object
  → UserConfig
```

This ensures plugin imports are resolved in each portal's context while centralizing configuration logic.

## Implementation Details

### Shared Configuration Package

**File:** `/Users/ramondenoronha/Dev/DIL/ASR-full/shared/vite-config-base/index.ts`

**Exports:**
- `createViteConfig(options)` - Configuration factory
- `createEnvVarConfigs(varNames)` - Helper for environment variables
- `ViteConfigOptions` - TypeScript interface
- `EnvVarConfig` - TypeScript interface

**Features:**
- Environment variable validation with warnings
- Type-safe configuration options
- Centralized plugin management
- Consistent build settings

### Admin Portal Configuration

**File:** `/Users/ramondenoronha/Dev/DIL/ASR-full/web/vite.config.ts`

**Before:** 51 lines
**After:** 31 lines
**Reduction:** 39%

**Environment Variables:**
- `VITE_AZURE_CLIENT_ID`
- `VITE_AZURE_TENANT_ID`
- `VITE_REDIRECT_URI`
- `VITE_API_URL`

### Member Portal Configuration

**File:** `/Users/ramondenoronha/Dev/DIL/ASR-full/portal/vite.config.ts`

**Before:** 58 lines
**After:** 38 lines
**Reduction:** 34%

**Environment Variables:**
- `VITE_AAD_CLIENT_ID`
- `VITE_AAD_AUTHORITY`
- `VITE_AAD_REDIRECT_URI`
- `VITE_API_CLIENT_ID`
- `VITE_API_BASE_URL`
- `NODE_ENV` (optional)

## Benefits

### Maintainability
- **Single source of truth** for common configuration
- Changes to plugins, build settings apply to all portals
- Reduced code duplication (~50 lines eliminated)

### Consistency
- Ensures all portals use same plugin versions
- Identical build settings and optimization
- Consistent environment validation

### Type Safety
- TypeScript interfaces for configuration options
- Compile-time validation of configuration
- IntelliSense support for developers

### Flexibility
- Portal-specific environment variables
- Optional configuration overrides
- Additional plugins via `additionalPlugins` option

## Testing Results

### Admin Portal (web)

✅ **TypeCheck:** Passed
✅ **Build:** Successful
✅ **Output:** 2.4 MB main bundle (unchanged)
✅ **Env Validation:** Working correctly

```bash
cd web
npm run typecheck  # ✅ Passed
npm run build      # ✅ Built in 5.50s
```

### Member Portal (portal)

✅ **TypeCheck:** Passed
✅ **Build:** Successful
✅ **Output:** 807 KB main bundle (unchanged)
✅ **Env Validation:** Working correctly

```bash
cd portal
npm run typecheck  # ✅ Passed
npm run build      # ✅ Built in 2.05s
```

## Documentation

### Created Documentation

1. **Shared Config README**
   - File: `shared/vite-config-base/README.md`
   - Comprehensive API reference
   - Usage examples
   - Maintenance guidelines

2. **Updated Portal READMEs**
   - File: `web/README.md` (updated)
   - File: `portal/README.md` (created)
   - References to shared configuration
   - Portal-specific details

## Migration Path

### For Future Portals

To add a new portal using the shared configuration:

```typescript
import react from '@vitejs/plugin-react';
import { defineConfig } from 'vite';
import svgr from 'vite-plugin-svgr';
import viteTsconfigPaths from 'vite-tsconfig-paths';
import { createViteConfig, createEnvVarConfigs } from '../shared/vite-config-base';

const requiredEnvVars = [
  'VITE_NEW_PORTAL_VAR_1',
  'VITE_NEW_PORTAL_VAR_2',
];

export default defineConfig(
  createViteConfig({
    port: 3000,
    requiredEnvVars,
    envVars: createEnvVarConfigs(requiredEnvVars),
  })(react(), viteTsconfigPaths(), svgr({ include: '**/*.svg?react' }))
);
```

### Adding Common Configuration

To add configuration that applies to all portals:

1. Update `shared/vite-config-base/index.ts`
2. Add to `ViteConfigOptions` interface if needed
3. Update documentation
4. Test both portals

## Lessons Learned

### What Went Well

1. **Factory Pattern** - Solved module import issues elegantly
2. **Type Safety** - TypeScript interfaces caught issues early
3. **Testing** - Both portals built successfully on first try after fixes
4. **Documentation** - Comprehensive docs will help future developers

### Challenges

1. **Module Import Issues** - Initial approach had plugin import problems
2. **esbuild JSDoc Parsing** - Had to remove glob patterns from example code
3. **Solution** - Factory pattern that accepts plugin instances

### Best Practices Applied

1. ✅ **DRY Principle** - Eliminated duplication
2. ✅ **Type Safety** - Full TypeScript support
3. ✅ **Testing** - Verified both portals work correctly
4. ✅ **Documentation** - Comprehensive README with examples
5. ✅ **Incremental Changes** - Small, testable commits

## Future Enhancements

### Potential Improvements

1. **Code Splitting Configuration** - Add manual chunks configuration
2. **Bundle Analysis** - Integrate bundle analyzer
3. **Performance Optimization** - Tree shaking configuration
4. **PWA Support** - If needed for offline functionality

### Monitoring

- Watch for configuration drift between portals
- Monitor build times after updates
- Track bundle size changes
- Collect developer feedback

## References

### Files Changed

- `shared/vite-config-base/index.ts` (new)
- `shared/vite-config-base/package.json` (new)
- `shared/vite-config-base/README.md` (new)
- `web/vite.config.ts` (modified)
- `web/README.md` (modified)
- `portal/vite.config.ts` (modified)
- `portal/README.md` (new)

### Related Documentation

- [Vite Configuration Documentation](https://vitejs.dev/config/)
- [Factory Pattern](https://en.wikipedia.org/wiki/Factory_method_pattern)
- Project: `CLAUDE.md` - Way of Working

### Commit

**Hash:** `e9dc4c7`
**Message:** "refactor: Centralize Vite configuration across Admin and Member portals"
**Branch:** `main`

---

## Summary

Successfully centralized Vite configuration, reducing duplication by ~50 lines while maintaining full functionality. Both portals build successfully and use consistent configuration. Comprehensive documentation ensures future maintainability.

**Status:** ✅ Production-ready
**Risk Level:** Low (no runtime behavior changes)
**Rollback:** Easy (revert commit)
