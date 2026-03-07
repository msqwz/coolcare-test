import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import { resolve } from 'path'

// https://vite.dev/config/
export default defineConfig({
  plugins: [react()],
  base: '/admin/',
  resolve: {
    alias: {
      '@shared': resolve(__dirname, '../shared'),
      '@supabase/supabase-js': resolve(__dirname, 'node_modules/@supabase/supabase-js'),
    },
  },
})
