import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'
import { defineConfig } from 'vite'

// The dev server proxies /api and /webhook to the Express backend so cookies stay same-origin.
const api = process.env.API_TARGET || 'http://localhost:4000'

export default defineConfig({
  plugins: [react(), tailwindcss()],
  server: {
    port: 5173,
    // changeOrigin stays false so the backend sees the browser's own Host and its same-origin check passes.
    proxy: { '/api': { target: api, changeOrigin: false }, '/webhook': { target: api, changeOrigin: false } },
  },
})
