import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

// dev 时把 /api 和 /socket.io 代理到后端 3001；
// 生产由后端 express.static 托管 dist，同源无需代理。
export default defineConfig({
  plugins: [react()],
  server: {
    port: 5173,
    proxy: {
      '/api': 'http://localhost:3001',
      '/socket.io': { target: 'http://localhost:3001', ws: true },
    },
  },
});
