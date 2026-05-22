import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'

export default defineConfig({
  plugins: [react(), tailwindcss()],
  build: {
    rollupOptions: {
      output: {
        manualChunks(id) {
          if (id.includes('@xyflow')) return 'vendor-flow';
          if (id.includes('html2canvas') || id.includes('jspdf')) return 'vendor-pdf';
          if (id.includes('firebase')) return 'vendor-firebase';
          if (id.includes('node_modules')) return 'vendor';
        },
      },
    },
  },
})
