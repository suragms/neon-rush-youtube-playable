import { defineConfig } from 'vite';

export default defineConfig({
  base: './',
  build: {
    target: 'es2019',
    minify: 'esbuild',
    assetsInlineLimit: 8192,
    chunkSizeWarningLimit: 300
  }
});
