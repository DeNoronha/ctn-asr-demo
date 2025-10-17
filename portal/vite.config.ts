import { defineConfig, loadEnv } from 'vite';
import react from '@vitejs/plugin-react';
import viteTsconfigPaths from 'vite-tsconfig-paths';
import svgr from 'vite-plugin-svgr';

// https://vitejs.dev/config/
export default defineConfig(({ mode }) => {
  // Load env file based on `mode` in the current working directory.
  // Set the third parameter to '' to load all env regardless of the `VITE_` prefix.
  const env = loadEnv(mode, process.cwd(), '');

  return {
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
      NODE_ENV: JSON.stringify(env.NODE_ENV || 'production'),
      REACT_APP_AAD_CLIENT_ID: JSON.stringify(env.REACT_APP_AAD_CLIENT_ID || ''),
      REACT_APP_AAD_AUTHORITY: JSON.stringify(env.REACT_APP_AAD_AUTHORITY || ''),
      REACT_APP_AAD_REDIRECT_URI: JSON.stringify(env.REACT_APP_AAD_REDIRECT_URI || ''),
      REACT_APP_API_CLIENT_ID: JSON.stringify(env.REACT_APP_API_CLIENT_ID || ''),
      REACT_APP_API_BASE_URL: JSON.stringify(env.REACT_APP_API_BASE_URL || ''),
    },
  },
};
});
