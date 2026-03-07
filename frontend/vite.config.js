import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import { resolve } from 'path'

export default defineConfig({
  plugins: [react()],
  root: '.',
  base: '/',
  resolve: {
    alias: {
      '@shared': resolve(__dirname, '../shared'),
      '@supabase/supabase-js': resolve(__dirname, 'node_modules/@supabase/supabase-js'),
    },
  },
  build: {
    outDir: 'dist',
    rollupOptions: {
      input: {
        main: resolve(__dirname, 'index.html'),
      },
    },
  },
  publicDir: 'public',
  server: {
    port: 5173,
    proxy: {
      '/auth': 'http://localhost:8000',
      '/jobs': 'http://localhost:8000',
      '/dashboard': 'http://localhost:8000',
      '/health': 'http://localhost:8000',
      '/push': 'http://localhost:8000',
    },
  },
})
