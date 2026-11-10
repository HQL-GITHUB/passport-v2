import { defineConfig } from 'vite';

export default defineConfig({
  base: './',
  server: { host: '127.0.0.1', port: 4173, strictPort: true },
  preview: { host: '127.0.0.1', port: 4174, strictPort: true },
  build: {
    outDir: 'dist/site',
    emptyOutDir: true,
    cssCodeSplit: false,
    target: 'es2022',
  },
});
