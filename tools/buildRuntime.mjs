import { mkdirSync, readFileSync, rmSync, writeFileSync } from 'node:fs'
import { fileURLToPath } from 'node:url'
import { parseAst } from 'rolldown/parseAst'
import { build } from 'vite'

// The mask runtime, built in parts: one part per block and one per piece of
// code that several blocks share. The export puts together only the parts the
// blocks of a mask need (src/export/runtime.ts), so a mask without a kanban
// carries no kanban code.

// The mask always gets the production build of lit, whatever the environment says:
// the development warnings would otherwise travel into every mask.
process.env.NODE_ENV = 'production'

const ROOT = fileURLToPath(new URL('..', import.meta.url))
const BLOCKS = `${ROOT}src/blocks/`
const OUT = `${ROOT}src/export/generated/`

// The blocks as register.ts lists them, each with the type it declares.
const blocks = [...readFileSync(`${BLOCKS}register.ts`, 'utf8').matchAll(/^import '\.\/([\w/]+)'$/gm)]
  .map(([, path]) => {
    const type = /static readonly type = '(\w+)'/.exec(readFileSync(`${BLOCKS}${path}.ts`, 'utf8'))?.[1]
    if (type === undefined) throw new Error(`${path}.ts nennt keinen Bausteintyp`)
    return { type, path }
  })

// The css`` of the blocks without comments and indentation; the minifier
// leaves the inside of a template as it is.
function tightCss(raw, first, last) {
  let tight = raw.replace(/\/\*[\s\S]*?\*\//g, '').replace(/\s+/g, ' ').replace(/ ?([{};,]) ?/g, '$1')
  if (first) tight = tight.trimStart()
  if (last) tight = tight.trimEnd()
  return tight
}

const SRC = `${ROOT.replace(/\\/g, '/')}src/`

const tightCssPlugin = {
  name: 'tight-lit-css',
  enforce: 'post',
  transform(code, id) {
    if (!id.replace(/\\/g, '/').startsWith(SRC) || !code.includes('css`')) return null
    const edits = []
    const walk = (node) => {
      if (Array.isArray(node)) return node.forEach(walk)
      if (!node || typeof node !== 'object') return
      if (node.type === 'TaggedTemplateExpression' && node.tag.type === 'Identifier' && node.tag.name === 'css') {
        const quasis = node.quasi.quasis
        quasis.forEach((q, i) => edits.push([q.start, q.end, tightCss(code.slice(q.start, q.end), i === 0, i === quasis.length - 1)]))
      }
      for (const key in node) walk(node[key])
    }
    walk(parseAst(code))
    let out = code
    for (const [start, end, text] of edits.sort((a, b) => b[0] - a[0])) out = out.slice(0, start) + text + out.slice(end)
    return { code: out, map: null }
  },
}

const result = await build({
  root: ROOT,
  configFile: false,
  logLevel: 'warn',
  plugins: [tightCssPlugin],
  define: { 'process.env.NODE_ENV': '"production"' },
  build: {
    write: false,
    minify: true,
    rollupOptions: {
      input: Object.fromEntries(blocks.map((b) => [b.type, `${BLOCKS}${b.path}.ts`])),
      // Strict: shared code goes into a part of its own instead of into the
      // part of one block, which would then come along with every other.
      preserveEntrySignatures: 'strict',
      output: { format: 'cjs', entryFileNames: '[name].js', chunkFileNames: '[name].js' },
    },
  },
})
const chunks = (Array.isArray(result) ? result[0] : result).output
  .filter((c) => c.type === 'chunk')
  .sort((a, b) => a.fileName.localeCompare(b.fileName))
const idOf = new Map(chunks.map((c, i) => [c.fileName, i]))

// The CommonJS of each part, made short for the loader of the export: parts
// required by number, exports handed over in one call of __ff.
const EXPORT = /Object\.defineProperty\(exports,"([\w$]+)",\{enumerable:!0,get:function\(\)\{return ([\w$]+)\}\}\)/g
function forLoader(chunk) {
  let code = chunk.code.replace(/Object\.defineProperty\(exports,Symbol\.toStringTag,\{value:`Module`\}\);?/, '')
  if (/\b__ff\b/.test(code)) throw new Error(`${chunk.fileName} benutzt schon den Namen __ff`)
  const exported = [...code.matchAll(EXPORT)]
  if (exported.length > 0) {
    const call = `__ff(exports,{${exported.map(([, name, local]) => `${name}:()=>${local}`).join(',')}})`
    let first = true
    code = code.replace(new RegExp(`,?${EXPORT.source}`, 'g'), (hit) => {
      if (!first) return ''
      first = false
      return (hit.startsWith(',') ? ',' : '') + call
    })
  }
  code = code.replace(/require\("\.\/([^"]+)"\)/g, (hit, file) => {
    if (!idOf.has(file)) throw new Error(`${chunk.fileName} verlangt ${file}, das kein Teil ist`)
    return `require(${idOf.get(file)})`
  })
  if (/Object\.defineProperty\(exports|require\("/.test(code)) {
    throw new Error(`${chunk.fileName}: CommonJS in unerwarteter Form, der Loader des Exports versteht es nicht`)
  }
  new Function('require', 'module', 'exports', code)
  return code
}

const parts = {
  chunks: chunks.map((c) => ({ code: forLoader(c), imports: c.imports.map((f) => idOf.get(f)) })),
  blocks: Object.fromEntries(blocks.map((b) => [b.type, idOf.get(`${b.type}.js`)])),
  order: blocks.map((b) => b.type),
}
mkdirSync(OUT, { recursive: true })
writeFileSync(`${OUT}runtime.json`, JSON.stringify(parts))
// Left over from the runtime in one piece.
rmSync(`${OUT}runtime.js`, { force: true })

const kb = (n) => (n / 1024).toFixed(1)
const total = parts.chunks.reduce((sum, c) => sum + c.code.length, 0)
process.stdout.write(`runtime.json ${parts.chunks.length} Teile, zusammen ${kb(total)} kB\n`)
