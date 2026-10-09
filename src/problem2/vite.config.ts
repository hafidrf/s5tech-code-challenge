import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig({
  plugins: [react()],
  server: {
    port: 5173,
    // The Problem 5 server (Express + SQLite) provides persistent swap
    // history. Proxying keeps the frontend same-origin in development and
    // avoids CORS configuration for the happy path.
    proxy: {
      '/api': {
        target: 'http://localhost:4000',
        changeOrigin: true,
      },
    },
  },
});
