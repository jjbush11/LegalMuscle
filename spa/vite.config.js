import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// https://vite.dev/config/
export default defineConfig({
  plugins: [react()],
  server: {
    host: true, // Allow Vite to be accessed from outside the container
    proxy: {
      // Proxy API requests to FastAPI backend during development
      '/api': {
        target: 'http://api:8000', // Target the 'api' service name and its internal port
        changeOrigin: true,
        secure: false,
      },
      '/health': {
        target: 'http://api:8000', // Target the 'api' service name and its internal port
        changeOrigin: true,
        secure: false,
      },
    }
  }
})
