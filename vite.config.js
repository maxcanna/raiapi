import { defineConfig } from 'vite'
import preact from '@preact/preset-vite'

// https://vitejs.dev/config/
export default defineConfig({
  plugins: [preact()],
  root: 'src', // Set the project root to 'src' to find index.html
  publicDir: '../public', // Path to the public directory, relative to the new root
  server: {
    proxy: {
      // Proxy API requests to the backend server
      '/api': {
        target: 'http://localhost:3000',
        changeOrigin: true, // Recommended for most cases
        // secure: false, // Uncomment if your backend is not HTTPS
      }
    }
  },
  build: {
    // Output directory for the build, relative to the project root (not src)
    // Vite's default is 'dist' relative to project root.
    // If root is 'src', outDir default becomes '../dist'.
    outDir: '../dist',
  }
})
