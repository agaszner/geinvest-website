import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

export default defineConfig({
  plugins: [react()],
  // Relative assets work on both a GitHub project page and geinvestkft.com.
  base: './',
  build: { sourcemap: true },
})
