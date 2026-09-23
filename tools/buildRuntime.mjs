import { fileURLToPath } from 'node:url'
import { build } from 'vite'

// The mask always gets the production build of lit, whatever the environment says:
// the development warnings would otherwise travel into every mask.
process.env.NODE_ENV = 'production'

const [{ output: [runtime] }] = await build({
  root: fileURLToPath(new URL('..', import.meta.url)),
  configFile: false,
  logLevel: 'warn',
  define: { 'process.env.NODE_ENV': '"production"' },
  build: {
    lib: { entry: 'src/blocks/register.ts', formats: ['iife'], name: 'maskRuntime', fileName: () => 'runtime.js' },
    outDir: 'src/export/generated',
    // Not emptied first: an editor open in parallel would briefly find no runtime.
    emptyOutDir: false,
    minify: true,
  },
})

process.stdout.write(`runtime.js ${(Buffer.byteLength(runtime.code) / 1024).toFixed(1)} kB\n`)
