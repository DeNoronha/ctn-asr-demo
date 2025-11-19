import path from 'node:path';
import react from '@vitejs/plugin-react';
import viteTsconfigPaths from 'vite-tsconfig-paths';
import { defineConfig } from 'vitest/config';

export default defineConfig({
  plugins: [react(), viteTsconfigPaths()],
  resolve: {
    alias: {
      react: path.resolve(__dirname, '../node_modules/react'),
      'react-dom': path.resolve(__dirname, '../node_modules/react-dom'),
    },
  },
  test: {
    globals: true,
    environment: 'jsdom',
    include: ['../tests/admin-portal/unit/**/*.test.{ts,tsx}'],
    setupFiles: ['../tests/admin-portal/unit/setupTests.ts'],
    css: true,
    coverage: {
      provider: 'v8',
      reporter: ['text', 'json', 'html'],
      reportsDirectory: '../tests/results/vitest/admin-portal',
      include: ['src/components/**/*.{ts,tsx}'],
      exclude: ['src/components/**/*.test.{ts,tsx}'],
    },
    reporters: process.env.CI ? ['junit', 'verbose'] : ['verbose'],
  },
});
