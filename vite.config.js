import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

export default defineConfig({
  plugins: [react()],
  optimizeDeps: {
    exclude: ['@huggingface/transformers'],
  },
  test: {
    environment: 'jsdom',
    setupFiles: './src/__tests__/setup.js',
    globals: true,
    environmentOptions: {
      jsdom: { url: 'http://localhost' },
    },
  },
})
