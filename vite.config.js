import { defineConfig } from 'vite';
import { resolve } from 'path';

export default defineConfig({
  server: {
    port: parseInt(process.env.PORT) || 5173,
  },
  build: {
    rollupOptions: {
      input: {
        main:        resolve(__dirname, 'index.html'),
        gsapGallery: resolve(__dirname, 'gsap-gallery.html'),
      },
    },
  },
});
