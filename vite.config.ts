
import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

// https://vitejs.dev/config/
export default defineConfig({
  plugins: [react()],
  // Definimos variables globales que algunas librerías (como qrcode/jspdf) esperan encontrar
  define: {
    global: 'window',
    'process.env': {}
  },
  build: {
    chunkSizeWarningLimit: 1600,
    rollupOptions: {
      // Librerías que NO están en node_modules y se cargarán desde el CDN (index.html)
      external: [
        'qrcode',
        'jspdf',
        'jspdf-autotable',
        'xlsx'
      ],
      output: {
        format: 'es',
        globals: {
          qrcode: 'QRCode',
          jspdf: 'jsPDF',
          xlsx: 'XLSX'
        },
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
