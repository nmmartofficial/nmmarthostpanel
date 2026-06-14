import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// https://vitejs.dev/config/
export default defineConfig({
  plugins: [react()],
  server: {
    port: 5174, // Change port to avoid issues with 5173
  },
  build: {
    chunkSizeWarningLimit: 3000, // Increase limit to 3MB to avoid Vercel warnings
    rollupOptions: {
      output: {
        manualChunks: {
          // Split large libraries into separate chunks for better performance and to avoid the warning
          'vendor-react': ['react', 'react-dom'],
          'vendor-supabase': ['@supabase/supabase-js'],
          'vendor-utils': ['framer-motion', 'lucide-react', 'xlsx'],
          'vendor-pdf': ['jspdf', 'jspdf-autotable'],
        }
      }
    }
  }
})
