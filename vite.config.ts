import { resolve } from 'node:path';

// Change the import from 'vite-plugin-dts'
import dts from 'unplugin-dts/vite';
import { defineConfig } from 'vite';

export default defineConfig({
  build: {
    lib: {
      entry: resolve(import.meta.dirname, 'src/index.ts'),
      name: 'ReduxSyncWrapper',
      fileName: format => `index.${format === 'es' ? 'mjs' : 'js'}`,
      formats: ['es', 'cjs'],
    },
    rollupOptions: {
      external: ['react', 'react-dom', 'redux', '@reduxjs/toolkit'],
    },
    emptyOutDir: true,
  },
  plugins: [
    dts({
      // Replaces insertTypesEntry
      insertTypesEntry: true,
      include: ['src'],
      // unplugin-dts adds clean type bundling via API Extractor
      bundleTypes: true,
    }),
  ],
});
