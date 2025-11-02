import react from '@vitejs/plugin-react';
import path from 'path';
import { defineConfig } from 'vite';
import svgr from 'vite-plugin-svgr';
import viteTsconfigPaths from 'vite-tsconfig-paths';
import { terser } from '@rollup/plugin-terser';

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
    minify: 'terser',
    target: 'es2020',
    terserOptions: {
      compress: {
        // SEC-VUL-003: Remove console.log/debug/info in production (keep error/warn for monitoring)
        pure_funcs: ['console.log', 'console.debug', 'console.info'],
      },
    },
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
      output: {
        // Manual chunk splitting for better caching and code splitting
        manualChunks: {
          // Core React libraries
          'react-vendor': ['react', 'react-dom', 'react-router-dom'],

          // Mantine UI libraries (largest vendor dependency)
          'mantine-core': ['@mantine/core', '@mantine/hooks'],
          'mantine-datatable': ['mantine-datatable'],
          'mantine-forms': ['@mantine/form', '@mantine/dates'],
          'mantine-notifications': ['@mantine/notifications'],

          // Icon libraries (can be large)
          'icons': ['@tabler/icons-react'],

          // Authentication libraries
          'auth': ['@azure/msal-browser', '@azure/msal-react'],

          // i18n libraries
          'i18n': ['i18next', 'react-i18next', 'i18next-http-backend'],

          // Excel/export libraries (large, rarely used)
          'excel-vendor': ['exceljs'],
        },
      },
    },
  },
  server: {
    port: 3000,
    open: true,
  },
});
