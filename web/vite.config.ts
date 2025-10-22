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
      // Fix Kendo Excel Export: Polyfill react-dom/server for browser compatibility
      'react-dom/server': path.resolve(__dirname, './node_modules/react-dom/server.browser.js'),
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
