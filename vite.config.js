import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// https://vitejs.dev/config/
export default defineConfig({
  plugins: [react()],
  server: {
    port: 3000,
    proxy: {
      '/api': {
        target: 'http://172.20.10.12:5001/',
        changeOrigin: true,
      },
    },
  },
  optimizeDeps: {
    include: ['@mui/x-date-pickers', '@mui/material', 'dayjs'],
  },
  resolve: {
    dedupe: ['react', 'react-dom'],
  },
})

