import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

// https://vite.dev/config/
export default defineConfig({
  plugins: [react()],
  server: {
    port: 5173,
    host: true,
  },
  build: {
    chunkSizeWarningLimit: 1500,
    rollupOptions: {
      output: {
        manualChunks: {
          'vendor-three': ['three', 'three-spritetext', 'react-force-graph-3d'],
          'vendor-xyflow': ['@xyflow/react', 'dagre'],
          'vendor-ui': ['framer-motion', 'lucide-react', 'canvas-confetti'],
        },
      },
    },
  },
});
