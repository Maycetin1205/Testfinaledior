import path from 'node:path'
import { execFile } from 'node:child_process'
import { promisify } from 'node:util'
import { fileURLToPath } from 'node:url'
import type { Plugin } from 'vite'
import { defineConfig } from 'vitest/config'
import react from '@vitejs/plugin-react'

// __dirname-Äquivalent für ESM-Config.
const here = path.dirname(fileURLToPath(import.meta.url))

const ausfuehren = promisify(execFile)

function exportLaufzeitAktuell(): Plugin {
  let lauf: Promise<unknown> = Promise.resolve()
  return {
    name: 'export-laufzeit-aktuell',
    apply: 'serve',
    async handleHotUpdate({ file }) {
      const relativ = path.relative(here, file).split(path.sep).join('/')
      if (!/^src\/(bausteine|kern|softengine)\/.*\.ts$/.test(relativ) || relativ.endsWith('.test.ts')) return
      const bauen = () => ausfuehren(process.execPath, ['tools/laufzeitBauen.mjs'], { cwd: here })
      lauf = lauf.then(bauen, bauen)
      await lauf
    },
  }
}

export default defineConfig({
  // Fester Port: die im Browser gespeicherten Masken und Datenquellen hängen
  // am Ursprung http://localhost:5300. Ein anderer Port fände sie nicht.
  server: { port: 5300, strictPort: true },
  plugins: [react(), exportLaufzeitAktuell()],
  resolve: {
    alias: {
      '@': path.resolve(here, 'src'),
    },
  },
  test: {
    // Ohne das liefert der `?raw`-Import von masken-tokens.css im Testlauf
    // einen LEEREN String (vitest stubbt CSS): der Export-Test pruefte dann
    // eine Maske ohne Masken-Tokens — nicht die, die der Editor abgibt.
    css: true,
  },
})
