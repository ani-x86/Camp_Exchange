import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import tailwindcss from '@tailwindcss/vite';
import { resolve } from 'path';

export default defineConfig({
  plugins: [react(), tailwindcss()],
  resolve: {
    alias: {
      '@': resolve(import.meta.dirname, 'src'),
    },
  },
  server: {
    proxy: {
      '/api': {
        target: 'http://localhost:5000',
        changeOrigin: true,
        configure(proxy) {
          proxy.on('error', (error, request, response) => {
            const path = request.url?.split('?')[0] || '/api';
            console.error(
              `[api proxy] ${request.method || 'GET'} ${path} failed: ${error.code || error.message}`
            );

            if (typeof response.writeHead !== 'function' || response.headersSent) {
              return;
            }

            response.writeHead(502, { 'Content-Type': 'application/json; charset=utf-8' });
            response.end(JSON.stringify({
              error: 'Backend API is unavailable. Start the server after configuring its PostgreSQL connection.',
            }));
          });
        },
      },
    },
    fs: {
      // Allow serving GIF assets from the Content directory above /client
      allow: ['..'],
    },
  },
});
