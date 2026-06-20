import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// https://vitejs.dev/config/
export default defineConfig({
  base: '/',
  plugins: [react()],
  server: {
    port: 5200, // Use a completely different port to avoid conflicts
  },
  build: {
    chunkSizeWarningLimit: 3000, // Increase limit to 3MB to avoid Vercel warnings
    minify: 'terser', // Use Terser for better minification
    terserOptions: {
      compress: {
        drop_console: true, // Remove console logs in production
        drop_debugger: true
      }
    },
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
