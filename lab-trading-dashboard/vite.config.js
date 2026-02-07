import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// https://vite.dev/config/
export default defineConfig({
  esbuild: {
    minify: false,
  },
  plugins: [react()],
  server: {
    proxy: {
      '/api': 'http://localhost:10000',
    },
  },
})

