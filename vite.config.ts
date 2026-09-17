import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import { topologyBridgePlugin } from './plugins/topologyBridgePlugin.js';

// https://vite.dev/config/
export default defineConfig({
  plugins: [react(), topologyBridgePlugin()],
  server: {
    port: 5173,
    host: true,
  },
  build: {
    chunkSizeWarningLimit: 1600,
    rollupOptions: {
      output: {
        manualChunks: {
          'vendor-xyflow': ['@xyflow/react', 'dagre'],
          'vendor-framer': ['framer-motion'],
          'vendor-icons': ['lucide-react'],
          'vendor-confetti': ['canvas-confetti'],
        },
      },
    },
  },
});
