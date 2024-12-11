import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// https://vite.dev/config/
export default defineConfig({
  plugins: [react()],
  server: {
    host: 'localhost', // Specify the host or IP address (no protocol)
    port: 5050,        // Specify the port number here
  },
})