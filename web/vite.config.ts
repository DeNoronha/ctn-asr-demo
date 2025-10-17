import react from '@vitejs/plugin-react';
import { defineConfig } from 'vite';
import svgr from 'vite-plugin-svgr';
import viteTsconfigPaths from 'vite-tsconfig-paths';

// Validate required environment variables
const requiredEnvVars = [
  'REACT_APP_AZURE_CLIENT_ID',
  'REACT_APP_AZURE_TENANT_ID',
  'REACT_APP_REDIRECT_URI',
  'REACT_APP_API_URL',
];

const missingEnvVars = requiredEnvVars.filter((varName) => !process.env[varName]);

if (missingEnvVars.length > 0) {
  console.warn('\n⚠️  Warning: Missing required environment variables:');
  missingEnvVars.forEach((varName) => console.warn(`   - ${varName}`));
  console.warn('   Application may not function correctly.\n');
}

// https://vitejs.dev/config/
export default defineConfig({
  plugins: [
    react(),
    viteTsconfigPaths(),
    svgr({
      include: '**/*.svg?react',
    }),
  ],
  server: {
    port: 3000,
    open: true,
  },
  build: {
    outDir: 'build',
    sourcemap: true,
  },
  define: {
    // For compatibility with CRA environment variables
    // Use process.env directly to read shell environment variables from Azure DevOps
    'process.env.REACT_APP_AZURE_CLIENT_ID': JSON.stringify(
      process.env.REACT_APP_AZURE_CLIENT_ID || ''
    ),
    'process.env.REACT_APP_AZURE_TENANT_ID': JSON.stringify(
      process.env.REACT_APP_AZURE_TENANT_ID || ''
    ),
    'process.env.REACT_APP_REDIRECT_URI': JSON.stringify(process.env.REACT_APP_REDIRECT_URI || ''),
    'process.env.REACT_APP_API_URL': JSON.stringify(process.env.REACT_APP_API_URL || ''),
  },
});
