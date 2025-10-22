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
      react: path.resolve(__dirname, './node_modules/react'),
      'react-dom': path.resolve(__dirname, './node_modules/react-dom'),
      // Stub react-dom/server with browser-safe version for Kendo Excel Export
      'react-dom/server': path.resolve(__dirname, './src/react-dom-server-stub.js'),
    },
    // Prefer browser builds over Node.js builds
    conditions: ['browser', 'module', 'import', 'default'],
  },
  optimizeDeps: {
    // Exclude Kendo Excel from pre-bundling so our plugin can intercept imports
    exclude: ['@progress/kendo-react-excel-export'],
    // Force Vite to use browser-safe builds
    esbuildOptions: {
      conditions: ['browser'],
    },
  },
  build: {
    outDir: 'build',
    sourcemap: true,
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
  server: {
    port: 3000,
    open: true,
  },
});
