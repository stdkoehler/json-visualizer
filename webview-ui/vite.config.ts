import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import { resolve } from 'path';

export default defineConfig({
  plugins: [react()],
  build: {
    outDir: '../media',
    emptyOutDir: true,
    rollupOptions: {
      input: resolve(__dirname, 'index.html'),
      output: {
        entryFileNames: `assets/index.jsx`,
        chunkFileNames: `assets/[name].jsx`,
        assetFileNames: `assets/[name].[ext]`,
      },
    },
  }
});