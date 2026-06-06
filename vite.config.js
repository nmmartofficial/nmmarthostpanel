import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// https://vitejs.dev/config/
export default defineConfig({
  plugins: [react()],
  build: {
    chunkSizeWarningLimit: 1600, // Increase limit to 1.6MB
    rollupOptions: {
      output: {
        manualChunks: {
          // Split large libraries into separate chunks for better performance and to avoid the warning
          'vendor-react': ['react', 'react-dom'],
          'vendor-supabase': ['@supabase/supabase-js'],
          'vendor-utils': ['framer-motion', 'lucide-react', 'xlsx'],
        }
      }
    }
  }
})
