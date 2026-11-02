import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import path from 'path';

const backendPort = process.env.VITE_BACKEND_PORT || process.env.BACKEND_PORT || '5000';
const backendTarget = `http://localhost:${backendPort}`;

export default defineConfig({
  plugins: [react()],
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src'),
      '@proxispeak/shared': path.resolve(__dirname, '../shared/types/index.ts')
    }
  },
  server: {
    port: 3000,
    proxy: {
      '/api': {
        target: backendTarget,
        changeOrigin: true
      },
      '/socket.io': {
        target: backendTarget,
        ws: true
      }
    }
  }
});
