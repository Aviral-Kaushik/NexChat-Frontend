import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// https://vite.dev/config/
export default defineConfig({
  plugins: [react()],
  define: {
    // Fix: sockjs-client expects Node's `global` in some builds.
    global: 'globalThis',
  },
  optimizeDeps: {
    // Ensure the same define is applied during dependency pre-bundling too.
    esbuildOptions: {
      define: {
        global: 'globalThis',
      },
    },
  },
})
