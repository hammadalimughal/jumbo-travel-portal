import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// https://vite.dev/config/
export default defineConfig({
  plugins: [
    react({
      babel: {
        plugins: [['babel-plugin-react-compiler']],
      },
    }),
  ],
  server: {
    host: true, // This exposes the project on your local network
    port: 5173, // Optional: specify a port
    proxy: {
      '/api': {
        target: 'http://localhost:6947',
        changeOrigin: true,
      },
      '/pdfs': {
        target: 'http://localhost:6947',
        changeOrigin: true,
      },
    },
  }
})
