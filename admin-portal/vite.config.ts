import react from '@vitejs/plugin-react';
import path from 'path';
import { defineConfig } from 'vite';
import svgr from 'vite-plugin-svgr';
import viteTsconfigPaths from 'vite-tsconfig-paths';

// https://vitejs.dev/config/
export default defineConfig({
  plugins: [
    react(),
    viteTsconfigPaths(),
    svgr({
      include: '**/*.svg?react',
    }),
  ],
  resolve: {
    alias: {
      // Force single React instance to prevent "Cannot read properties of null (reading 'useContext')" error
      react: path.resolve(__dirname, '../node_modules/react'),
      'react-dom': path.resolve(__dirname, '../node_modules/react-dom'),
    },
    // Prefer browser builds over Node.js builds
    conditions: ['browser', 'module', 'import', 'default'],
  },
  optimizeDeps: {
    // Force Vite to use browser-safe builds
    esbuildOptions: {
      conditions: ['browser'],
    },
  },
  build: {
    outDir: 'build',
    sourcemap: true,
    // SEC-009: Remove console.log/debug/info in production builds (keep error/warn for monitoring)
    minify: 'esbuild',
    target: 'es2020',
    // Suppress warnings about server-side modules being externalized
    rollupOptions: {
      onwarn(warning, warn) {
        // Ignore warnings about externalizing Node.js modules for browser compatibility
        if (
          warning.code === 'UNUSED_EXTERNAL_IMPORT' ||
          (warning.code === 'PLUGIN_WARNING' && warning.message.includes('externalized for browser compatibility'))
        ) {
          return;
        }
        warn(warning);
      },
    },
  },
  esbuild: {
    // SEC-009: esbuild drop only supports ['console'] (all methods) or ['debugger']
    // Cannot selectively drop console.log/debug/info while keeping error/warn
    // TODO: Implement selective console stripping with a Vite plugin or Terser
    // drop: process.env.NODE_ENV === 'production' ? ['console'] : [],
  },
  server: {
    port: 3000,
    open: true,
  },
});
