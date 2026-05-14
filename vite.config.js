import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

export default defineConfig({
  plugins: [react()],
  // widget.js está en public/ y Vite lo copia automáticamente a dist/
  // No necesita configuración extra
  build: {
    rollupOptions: {
      // Asegurar que index.html de la SPA no interfiera con widget.js
    }
  }
})
