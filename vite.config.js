// vite.config.js
import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

export default defineConfig({
  plugins: [react()],
  resolve: {
    // Ensure only ONE React is ever bundled to prevent hook issues
    dedupe: ['react', 'react-dom'],
  },
})