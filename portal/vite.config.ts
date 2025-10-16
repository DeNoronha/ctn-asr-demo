import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import viteTsconfigPaths from 'vite-tsconfig-paths';
import svgr from 'vite-plugin-svgr';

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
    'process.env': {
      NODE_ENV: JSON.stringify(process.env.NODE_ENV || 'production'),
      REACT_APP_AAD_CLIENT_ID: JSON.stringify(process.env.REACT_APP_AAD_CLIENT_ID || ''),
      REACT_APP_AAD_AUTHORITY: JSON.stringify(process.env.REACT_APP_AAD_AUTHORITY || ''),
      REACT_APP_AAD_REDIRECT_URI: JSON.stringify(process.env.REACT_APP_AAD_REDIRECT_URI || ''),
      REACT_APP_API_CLIENT_ID: JSON.stringify(process.env.REACT_APP_API_CLIENT_ID || ''),
      REACT_APP_API_BASE_URL: JSON.stringify(process.env.REACT_APP_API_BASE_URL || ''),
    },
  },
});
