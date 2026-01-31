import path from 'node:path';
import { terser } from '@rollup/plugin-terser';
import react from '@vitejs/plugin-react';
import { defineConfig } from 'vite';
import svgr from 'vite-plugin-svgr';
import viteTsconfigPaths from 'vite-tsconfig-paths';

// https://vitejs.dev/config/
export default defineConfig(() => ({
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
      // In workspace setup, use parent node_modules
      react: path.resolve(__dirname, '../node_modules/react'),
      'react-dom': path.resolve(__dirname, '../node_modules/react-dom'),
    },
  },
  define: {
    // Expose environment variables as process.env for compatibility
    'process.env.VITE_AZURE_CLIENT_ID': JSON.stringify(process.env.VITE_AZURE_CLIENT_ID),
    'process.env.VITE_AZURE_TENANT_ID': JSON.stringify(process.env.VITE_AZURE_TENANT_ID),
    'process.env.VITE_REDIRECT_URI': JSON.stringify(process.env.VITE_REDIRECT_URI),
    'process.env.VITE_API_CLIENT_ID': JSON.stringify(process.env.VITE_API_CLIENT_ID),
    'process.env.VITE_API_URL': JSON.stringify(process.env.VITE_API_URL),
    'process.env.VITE_API_BASE_URL': JSON.stringify(process.env.VITE_API_BASE_URL),
  },
  build: {
    outDir: 'build',
    sourcemap: true,
    minify: 'terser',
    terserOptions: {
      compress: {
        // SEC-VUL-003: Remove console.log/debug/info in production (keep error/warn for monitoring)
        pure_funcs: ['console.log', 'console.debug', 'console.info'],
      },
    },
  },
  server: {
    port: 3001,
    open: true,
  },
}));
