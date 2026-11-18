import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig({
  plugins: [react()],
  server: {
    host: true, // dapat diakses dari komputer lain di jaringan lab
    port: 5173,
    proxy: {
      // API Laravel (php artisan serve) — termasuk /api/broadcasting/auth untuk Reverb.
      '/api': { target: 'http://127.0.0.1:8000', changeOrigin: true },
    },
  },
});
