import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import { terser } from '@rollup/plugin-terser'

export default defineConfig({
  plugins: [react()],
  server: {
    port: 3000,
    proxy: {
      '/api': {
        target: 'http://localhost:7071',
        changeOrigin: true
      }
    }
  },
  build: {
    outDir: 'build',
    minify: 'terser',
    terserOptions: {
      compress: {
        // SEC-VUL-003: Remove console.log/debug/info in production (keep error/warn for monitoring)
        pure_funcs: ['console.log', 'console.debug', 'console.info'],
      },
    },
  }
})
