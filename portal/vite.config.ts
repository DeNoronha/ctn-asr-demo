import react from '@vitejs/plugin-react';
import { defineConfig } from 'vite';
import svgr from 'vite-plugin-svgr';
import viteTsconfigPaths from 'vite-tsconfig-paths';

// Validate required environment variables
const requiredEnvVars = [
  'VITE_AAD_CLIENT_ID',
  'VITE_AAD_AUTHORITY',
  'VITE_AAD_REDIRECT_URI',
  'VITE_API_CLIENT_ID',
  'VITE_API_BASE_URL',
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
    // Vite environment variables
    // Use process.env directly to read shell environment variables from Azure DevOps
    'process.env.NODE_ENV': JSON.stringify(process.env.NODE_ENV || 'production'),
    'process.env.VITE_AAD_CLIENT_ID': JSON.stringify(
      process.env.VITE_AAD_CLIENT_ID || ''
    ),
    'process.env.VITE_AAD_AUTHORITY': JSON.stringify(
      process.env.VITE_AAD_AUTHORITY || ''
    ),
    'process.env.VITE_AAD_REDIRECT_URI': JSON.stringify(
      process.env.VITE_AAD_REDIRECT_URI || ''
    ),
    'process.env.VITE_API_CLIENT_ID': JSON.stringify(
      process.env.VITE_API_CLIENT_ID || ''
    ),
    'process.env.VITE_API_BASE_URL': JSON.stringify(process.env.VITE_API_BASE_URL || ''),
  },
});
