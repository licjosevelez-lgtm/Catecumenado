import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

// https://vitejs.dev/config/
export default defineConfig({
  plugins: [react()],
  // Definimos variables globales para compatibilidad con librerías antiguas o externas
  define: {
    global: 'window',
    'process.env': {}
  },
  build: {
    // Aumentamos el límite para que no avise sobre el tamaño del archivo vendor unificado
    chunkSizeWarningLimit: 2500,
    rollupOptions: {
      // Estas librerías NO se empaquetan porque se cargan desde el CDN (index.html)
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
        // CORRECCIÓN CRÍTICA:
        // Enviamos TODAS las dependencias instaladas (React, Supabase, etc.) a un único
        // archivo 'vendor'. Esto evita errores de "ReferenceError" por dependencias circulares
        // que ocurren al dividir Supabase en su propio chunk.
        manualChunks(id) {
          if (id.includes('node_modules')) {
            return 'vendor';
          }
        }
      }
    }
  }
});
