import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig({
  plugins: [react()],
  server: {
    host: true,
    port: 3000,
    proxy: {
      '/api': {
        target: 'http://127.0.0.1:5001',
        changeOrigin: true,
        configure: (proxy) => {
          proxy.on('error', (_err, _req, res) => {
            if (res && !('headersSent' in res && res.headersSent)) {
              res.writeHead(503, { 'Content-Type': 'application/json' });
              res.end(
                JSON.stringify({
                  error:
                    'AIIMS backend server is not running on port 5001. Please start the backend with npm run dev in Backend/.',
                  code: 'BACKEND_OFFLINE',
                })
              );
            }
          });
        },
      },
    },
  },
  build: {
    chunkSizeWarningLimit: 1200,
    rollupOptions: {
      output: {
        manualChunks: {
          'vendor-react': ['react', 'react-dom'],
          'vendor-icons': ['lucide-react'],
          'vendor-three': ['three', '@react-three/fiber', '@react-three/drei']
        }
      }
    }
  }
});
