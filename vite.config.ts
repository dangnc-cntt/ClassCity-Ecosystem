import { defineConfig } from 'vitest/config';
import react from '@vitejs/plugin-react';
import tailwindcss from '@tailwindcss/vite';

export default defineConfig({
  plugins: [react(), tailwindcss()],
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
