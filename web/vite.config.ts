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
      REACT_APP_AZURE_CLIENT_ID: JSON.stringify(env.REACT_APP_AZURE_CLIENT_ID || ''),
      REACT_APP_AZURE_TENANT_ID: JSON.stringify(env.REACT_APP_AZURE_TENANT_ID || ''),
      REACT_APP_REDIRECT_URI: JSON.stringify(env.REACT_APP_REDIRECT_URI || ''),
      REACT_APP_API_URL: JSON.stringify(env.REACT_APP_API_URL || ''),
    },
  },
};
});
