import react from '@vitejs/plugin-react';
import { defineConfig } from 'vite';
import svgr from 'vite-plugin-svgr';
import viteTsconfigPaths from 'vite-tsconfig-paths';
import { createViteConfig, createEnvVarConfigs } from '../shared/vite-config-base';

// Define Admin Portal specific environment variables
const requiredEnvVars = [
  'VITE_AZURE_CLIENT_ID',
  'VITE_AZURE_TENANT_ID',
  'VITE_REDIRECT_URI',
  'VITE_API_URL',
];

// https://vitejs.dev/config/
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
