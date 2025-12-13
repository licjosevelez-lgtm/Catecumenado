
import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

// https://vitejs.dev/config/
export default defineConfig({
  plugins: [react()],
  build: {
    chunkSizeWarningLimit: 1600,
    rollupOptions: {
      // ESTRATEGIA HÍBRIDA:
      // 1. Externalizamos SOLO las librerías auxiliares que faltan en node_modules
      //    y que se cargarán vía CDN (importmap en index.html).
      external: [
        'qrcode',
        'jspdf',
        'jspdf-autotable',
        'xlsx'
      ],
      output: {
        // Aseguramos formato ES Module para compatibilidad con importmap
        format: 'es',
        // 2. El resto (React, Supabase, etc.) se empaqueta y se divide para optimización
        manualChunks(id) {
          if (id.includes('node_modules')) {
            if (id.includes('@supabase')) return 'supabase';
            if (id.includes('recharts')) return 'charts';
            if (id.includes('lucide')) return 'icons';
            return 'vendor';
          }
        }
      }
    }
  }
});
