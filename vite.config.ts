import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

export default defineConfig({
  plugins: [react()],
  // Relative assets work on both a GitHub project page and geinvestkft.com.
  base: './',
  build: {
    sourcemap: true,
    rollupOptions: {
      input: {
        main: 'index.html',
        markak: 'markak/index.html',
        szerviz: 'szerviz/index.html',
        referenciak: 'referenciak/index.html',
        kapcsolat: 'kapcsolat/index.html',
        metso: 'metso/index.html',
        mjRecycling: 'mj-recycling/index.html',
        mfl: 'mfl/index.html',
        outotec: 'outotec/index.html',
      },
    },
  },
})
