import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'

export default defineConfig({
  plugins: [react(), tailwindcss()],
  // Any path is a doc id — always serve the app.
  appType: 'spa',
  server: {
    // Allow access through Cloudflare quick tunnels (hc tunnel).
    allowedHosts: ['.trycloudflare.com'],
  },
})
