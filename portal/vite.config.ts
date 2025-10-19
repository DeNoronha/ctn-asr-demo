import react from '@vitejs/plugin-react';
import { defineConfig } from 'vite';
import svgr from 'vite-plugin-svgr';
import viteTsconfigPaths from 'vite-tsconfig-paths';
import { createViteConfig, createEnvVarConfigs } from '../shared/vite-config-base';

// Define Member Portal specific environment variables
const requiredEnvVars = [
  'VITE_AAD_CLIENT_ID',
  'VITE_AAD_AUTHORITY',
  'VITE_AAD_REDIRECT_URI',
  'VITE_API_CLIENT_ID',
  'VITE_API_BASE_URL',
];

// Additional environment variables (optional)
const additionalEnvVars = ['NODE_ENV'];

// https://vitejs.dev/config/
export default defineConfig(
  createViteConfig({
    port: 3000,
    openBrowser: true,
    outDir: 'build',
    sourcemap: true,
    requiredEnvVars,
    envVars: [
      ...createEnvVarConfigs(requiredEnvVars),
      ...createEnvVarConfigs(additionalEnvVars),
    ],
  })(
    react(),
    viteTsconfigPaths(),
    svgr({
      include: '**/*.svg?react',
    })
  )
);
