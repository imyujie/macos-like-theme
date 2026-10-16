import { defineConfig } from 'vite';

export default defineConfig({
  build: {
    outDir: 'dist-theme',
    lib: {
      entry: 'src/theme/index.ts',
      formats: ['es'],
      fileName: 'index',
      cssFileName: 'theme',
    },
    rollupOptions: {
      external: ['react', 'react/jsx-runtime'],
    },
  },
});
