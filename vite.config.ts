import { defineConfig } from 'vitest/config';
import react from '@vitejs/plugin-react';
import tailwindcss from '@tailwindcss/vite';

export default defineConfig({
  plugins: [react(), tailwindcss()],
  build: {
    chunkSizeWarningLimit: 750,
    rollupOptions: {
      output: {
        manualChunks(id) {
          if (id.includes('node_modules')) {
            if (id.includes('/three/') || id.includes('/three-stdlib/')) {
              return 'three-core';
            }
            if (id.includes('/@react-three/')) {
              return 'r3f-vendor';
            }
            if (
              id.includes('/gsap/') ||
              id.includes('/zod/') ||
              id.includes('/lucide-react/') ||
              id.includes('/canvas-confetti/') ||
              id.includes('/zustand/')
            ) {
              return 'ui-vendor';
            }
          }
          return undefined;
        },
      },
    },
  },
  ssr: {
    noExternal: [
      'three',
      '@react-three/fiber',
      '@react-three/drei',
      'three-stdlib',
    ],
    resolve: {
      mainFields: ['module', 'jsnext:main', 'jsnext', 'main'],
      conditions: ['module', 'import', 'default'],
    },
  },
});
