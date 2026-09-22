import path from 'node:path'
import { fileURLToPath } from 'node:url'
import { defineConfig } from 'vitest/config'
import react from '@vitejs/plugin-react'

const here = path.dirname(fileURLToPath(import.meta.url))

export default defineConfig({
  // Fixed port: the masks and data sources saved in the browser hang on the
  // origin http://localhost:5300. Another port would not find them.
  server: { port: 5300, strictPort: true },
  plugins: [react()],
  resolve: {
    alias: {
      '@': path.resolve(here, 'src'),
    },
  },
  test: {
    // Without this the `?raw` import of mask.css yields an empty string in a
    // test run (vitest stubs CSS), and the export test would check a mask
    // without the mask tokens.
    css: true,
  },
})
