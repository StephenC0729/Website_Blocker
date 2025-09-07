import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

// Vite config for building a single IIFE bundle suitable for MV3
export default defineConfig({
  plugins: [react()],
  define: {
    'process.env.NODE_ENV': JSON.stringify('production'),
    'process.env': '{}',
    global: 'globalThis',
  },
  build: {
    outDir: 'src/dashboard/react-dist',
    emptyOutDir: true,
    lib: {
      entry: 'src/react-dashboard/main.jsx',
      name: 'DashboardReactApp',
      formats: ['iife'],
      fileName: () => 'dashboard.react.js',
    },
    rollupOptions: {
      output: {
        inlineDynamicImports: true,
        manualChunks: undefined,
      },
    },
  },
});
