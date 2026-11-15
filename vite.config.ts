/// <reference types="vitest/config" />
import { fileURLToPath } from 'node:url';
import tailwindcss from '@tailwindcss/vite';
import { defineConfig } from 'vite';

/**
 * Configuración de Vite.
 *
 * - `base`: GitHub Pages sirve el proyecto en `/<repositorio>/`. El workflow de despliegue
 *   exporta `VITE_BASE_PATH`; en local queda `/`.
 */
export default defineConfig({
  base: process.env.VITE_BASE_PATH ?? '/',
  plugins: [tailwindcss()],
  resolve: {
    alias: { '@': fileURLToPath(new URL('./src', import.meta.url)) },
  },
  build: {
    outDir: 'dist',
    sourcemap: false,
  },
  test: {
    environment: 'node',
    include: ['tests/**/*.test.ts'],
    setupFiles: ['tests/setup.ts'],
  },
});
