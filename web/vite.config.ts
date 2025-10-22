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
    },
  },
  define: {
    // Map process.env.VITE_* to import.meta.env.VITE_* for Azure Static Web Apps
    // This is required because Azure SWA builds from Git without .env files
    'process.env.VITE_AZURE_CLIENT_ID': 'import.meta.env.VITE_AZURE_CLIENT_ID',
    'process.env.VITE_AZURE_TENANT_ID': 'import.meta.env.VITE_AZURE_TENANT_ID',
    'process.env.VITE_REDIRECT_URI': 'import.meta.env.VITE_REDIRECT_URI',
    'process.env.VITE_API_URL': 'import.meta.env.VITE_API_URL',
  },
  build: {
    outDir: 'build',
    sourcemap: true,
  },
  server: {
    port: 3000,
    open: true,
  },
});
