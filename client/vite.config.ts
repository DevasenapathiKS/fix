import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import path from 'path'

// https://vite.dev/config/
export default defineConfig({
  plugins: [react()],
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src'),
    },
  },
  build: {
    outDir: 'dist',
    emptyOutDir: true,
    sourcemap: process.env.NODE_ENV === 'development',
    rollupOptions: {
      output: {
        manualChunks: {
          vendor: ['react', 'react-dom', 'react-router-dom'],
          ui: ['@headlessui/react', '@heroicons/react', 'framer-motion'],
          data: ['@tanstack/react-query', 'axios', 'zustand'],
        },
      },
    },
  },
  server: {
    port: 5173,
    strictPort: false,
    open: true,
    hmr: {
      overlay: true,
    },
    watch: {
      usePolling: false,
    },
  },
})
