import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// В Docker на Windows изменения файлов не доходят без опроса.
const usePolling = process.env.CHOKIDAR_USEPOLLING === 'true'

// В режиме live запросы /api и /media уходят на бэкенд (Django).
const apiTarget = process.env.API_PROXY_TARGET || 'http://backend:8000'

export default defineConfig({
  plugins: [react()],
  server: {
    host: '0.0.0.0',
    port: 5173,
    watch: usePolling ? { usePolling: true, interval: 300 } : undefined,
    proxy: {
      '/api': { target: apiTarget, changeOrigin: true },
      '/media': { target: apiTarget, changeOrigin: true },
    },
  },
  build: {
    chunkSizeWarningLimit: 1200,
    rollupOptions: {
      output: {
        // three и react кэшируются браузером отдельно от кода тура
        manualChunks: {
          three: ['three'],
          r3f: ['@react-three/fiber', '@react-three/drei'],
          react: ['react', 'react-dom', 'react-router-dom', 'zustand'],
          charts: ['recharts'],
        },
      },
    },
  },
})
