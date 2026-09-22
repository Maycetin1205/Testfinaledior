// Builds the mask runtime in parts: one base file plus one per block,
// behavior, core and bridge file.
// Call: node tools/buildRuntime.mjs [--out <folder>]
import { existsSync, mkdirSync, readdirSync, readFileSync, renameSync, rmSync, writeFileSync } from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

// The mask always gets the production build of lit, whatever the environment
// says: otherwise it carries 15 kB of development warnings depending on the call.
process.env.NODE_ENV = 'production'

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..')
const SRC = posix(path.join(ROOT, 'src'))
const BLOCK_DIR = SRC + '/blocks'
const CORE_DIR = SRC + '/core'
const BRIDGE_DIR = SRC + '/softengine'
// Only these three layers run in the mask; the editor stays out.
const RUNTIME_ROOTS = ['blocks', 'core', 'softengine'].map((name) => `${SRC}/${name}`)
// blocks/base is not a block but the ground every block stands on.
const NOT_A_BLOCK = new Set(['base'])
// Every behavior is a part of its own, like a block: only what a block plugs
// in travels into the mask, not the whole collection.
const BEHAVIOR_DIR = 'behavior'
const BEHAVIOR_PREFIX = 'behavior-'
// Core and bridge travel the same way: one part per file. A text field would
// otherwise carry the whole SoftEngine door it never opens.
const CORE_PREFIX = 'core-'
const BRIDGE_PREFIX = 'bridge-'
const BASE = 'base'
const TYPE_ONLY = /^\s*type\s/
// One draft folder per run: dev server, test and hand call would otherwise
// build into the same folder and delete each other's entry points.
const DRAFT = posix(path.join(ROOT, `node_modules/.tmp/runtime-draft-${process.pid}`))

function posix(p) {
  return p.split(path.sep).join('/')
}

function allSourceFiles(folder) {
  const found = []
  for (const entry of readdirSync(folder, { withFileTypes: true })) {
    const full = posix(path.join(folder, entry.name))
    if (entry.isDirectory()) found.push(...allSourceFiles(full))
    else if (entry.name.endsWith('.ts') && !entry.name.endsWith('.test.ts')) found.push(full)
  }
  return found
}

// Everything reachable from these files through our own sources.
function closureOf(entries) {
  const found = new Set()
  const open = [...entries]
  while (open.length > 0) {
    const file = open.pop()
    if (found.has(file)) continue
    found.add(file)
    for (const { spec } of importsOf(readFileSync(file, 'utf8'))) {
      if (spec.startsWith('.')) open.push(resolveSpec(spec, path.dirname(file)))
    }
  }
  return found
}

// The base is no dumping ground: it carries the error guard and the ground of
// every block, and from core and bridge only what those pull in themselves.
const BASE_FILES = closureOf([
  SRC + '/export/errorGuard.ts',
  ...[...NOT_A_BLOCK].flatMap((folder) => allSourceFiles(`${BLOCK_DIR}/${folder}`)),
])

// What no block reaches runs in the editor only: it is not built and so pulls
// no module into the base that no mask ever touches.
const IN_THE_MASK = closureOf([SRC + '/export/errorGuard.ts', ...allSourceFiles(BLOCK_DIR)])

// Which part does a file belong to? Base first, then one part per file.
function partOf(file) {
  if (BASE_FILES.has(file)) return BASE
  if (file.startsWith(CORE_DIR + '/')) return CORE_PREFIX + partName(file, CORE_DIR)
  if (file.startsWith(BRIDGE_DIR + '/')) return BRIDGE_PREFIX + partName(file, BRIDGE_DIR)
  if (!file.startsWith(BLOCK_DIR + '/')) return BASE
  const [folder, name] = file.slice(BLOCK_DIR.length + 1).split('/')
  if (folder === BEHAVIOR_DIR) return BEHAVIOR_PREFIX + name.replace(/\.ts$/, '')
  return folder.endsWith('.ts') || NOT_A_BLOCK.has(folder) ? BASE : folder
}

// core/data/actions.ts becomes core-data-actions: one file name per part.
function partName(file, folder) {
  return file.slice(folder.length + 1).replace(/\.ts$/, '').replace(/\//g, '-')
}

// Behaviors, core and bridge register no block type; they travel with the
// block that plugs them in or imports them.
function withoutBlock(part) {
  return [BEHAVIOR_PREFIX, CORE_PREFIX, BRIDGE_PREFIX].some((prefix) => part.startsWith(prefix))
}

// The name a module stands under in the window: FF.core$block$tree.
function globalName(id) {
  const key = (id.startsWith(SRC + '/') ? id.slice(SRC.length + 1) : id)
    .replace(/\.ts$/, '')
    .replace(/[^A-Za-z0-9]/g, '$')
  return 'FF.' + key
}

// The names in an import clause as the target exports them: 'a as b' counts as
// 'a', an interspersed 'type X' drops out.
function namesOf(clause, spec) {
  const braces = /\{([^}]*)\}/.exec(clause)
  const ahead = clause.slice(0, braces ? braces.index : clause.length).trim()
  if (ahead !== '' && ahead !== ',') {
    throw new Error(`Import "${spec}": "${ahead}" — the runtime only knows { name } imports.`)
  }
  if (!braces) return []
  return braces[1]
    .split(',')
    .map((piece) => piece.trim())
    .filter((piece) => piece !== '' && !TYPE_ONLY.test(piece))
    .map((piece) => piece.split(/\s+as\s+/)[0].trim())
}

// What this file needs at runtime: per target the names it touches. Pure type
// imports do not count: they vanish on compile and would otherwise tie parts
// together. The clause holds no quote, or it would swallow an import line
// without names in front of it.
function importsOf(source) {
  const found = []
  const withNames = /(?:^|\n)\s*(?:import|export)\b([^'"]*?)\bfrom\s*['"]([^'"]+)['"]/g
  for (const hit of source.matchAll(withNames)) {
    if (TYPE_ONLY.test(hit[1])) continue
    found.push({ spec: hit[2], names: namesOf(hit[1], hit[2]) })
  }
  const effectOnly = /(?:^|\n)\s*import\s*['"]([^'"]+)['"]/g
  for (const hit of source.matchAll(effectOnly)) found.push({ spec: hit[1], names: [] })
  return found
}

function resolveSpec(spec, fromFolder) {
  if (!spec.startsWith('.')) return spec
  const raw = posix(path.resolve(fromFolder, spec))
  for (const candidate of [raw, raw + '.ts', raw + '/index.ts', raw.replace(/\.js$/, '.ts')]) {
    if (candidate.endsWith('.ts') && existsSync(candidate)) return candidate
  }
  throw new Error(`Import "${spec}" from ${fromFolder} points at no source file.`)
}

// With override and a spelled out type too: an inheriting block writes both.
const BLOCK_TYPE = /static\s+(?:override\s+)?(?:readonly\s+)?type(?:\s*:\s*string)?\s*=\s*['"]([^'"]+)['"]/g

// Reads the build plan from the sources: which part carries which blocks, which
// modules it must put up for the others, which part it needs itself.
function buildPlan() {
  const filesPerPart = new Map([[BASE, []]])
  for (const root of RUNTIME_ROOTS) {
    for (const file of allSourceFiles(root)) {
      if (!IN_THE_MASK.has(file)) continue
      const part = partOf(file)
      if (!filesPerPart.has(part)) filesPerPart.set(part, [])
      filesPerPart.get(part).push(file)
    }
  }

  // Put up only what a block touches from outside, and of that only the names:
  // everything else a part pulls in through those modules and otherwise drops
  // out at build time.
  const putsUp = new Map([...filesPerPart.keys()].map((part) => [part, new Map()]))
  const needs = new Map([...filesPerPart.keys()].map((part) => [part, new Set()]))

  for (const [part, files] of filesPerPart) {
    for (const file of files) {
      for (const { spec, names } of importsOf(readFileSync(file, 'utf8'))) {
        const target = resolveSpec(spec, path.dirname(file))
        const own = target.startsWith(SRC + '/')
        if (own && !RUNTIME_ROOTS.some((r) => target.startsWith(r + '/'))) {
          throw new Error(`${file} takes "${spec}" from a layer that does not belong in the mask.`)
        }
        const targetPart = own ? partOf(target) : BASE
        if (targetPart === part) continue
        // The base runs first; a module from a part would not exist yet and the
        // mask would stay white. register.ts hands the editor every block and
        // never reaches the mask.
        if (part === BASE && !file.endsWith('/blocks/register.ts')) {
          throw new Error(`${file} takes "${spec}" from part ${targetPart}; the base may only load base and packages.`)
        }
        const up = putsUp.get(targetPart)
        if (!up.has(target)) up.set(target, new Set())
        for (const name of names) up.get(target).add(name)
        if (targetPart !== BASE) needs.get(part).add(targetPart)
      }
    }
  }

  const parts = []
  for (const [part, files] of filesPerPart) {
    if (part === BASE) continue
    const blockTypes = files.flatMap((file) =>
      [...readFileSync(file, 'utf8').matchAll(BLOCK_TYPE)].map((hit) => hit[1]))
    if (blockTypes.length === 0 && !withoutBlock(part)) {
      throw new Error(`The folder blocks/${part} registers no block type.`)
    }
    parts.push({
      name: part,
      file: `ff-${part}.js`,
      blockTypes: blockTypes.sort(),
      needs: [...needs.get(part)].sort(),
    })
  }

  return { filesPerPart, putsUp, baseFile: `ff-${BASE}.js`, parts: byDependency(parts) }
}

// Load order: whoever uses a module of another part comes after it.
function byDependency(parts) {
  const open = [...parts].sort((a, b) => a.name.localeCompare(b.name))
  const done = []
  while (open.length > 0) {
    const next = open.findIndex((p) => p.needs.every((n) => done.some((d) => d.name === n)))
    if (next === -1) {
      throw new Error(`Blocks need each other in a circle: ${open.map((p) => p.name).join(', ')}`)
    }
    done.push(...open.splice(next, 1))
  }
  return done
}

// The entry point of a part: registers its blocks and puts up the modules the
// other parts take from it.
function writeEntry(name, files, putsUp) {
  // Entered is every file that registers a block type, whatever its name.
  // A fresh pattern without the g flag: the global one remembers the position
  // of the previous part and so overlooked the divider, whose part stayed empty.
  const hasBlockType = new RegExp(BLOCK_TYPE.source)
  const head = name === BASE
    ? [`import '${SRC}/export/errorGuard'`]
    : files
      .filter((file) => hasBlockType.test(readFileSync(file, 'utf8')))
      .map((file) => `import '${file}'`)
  const body = putsUp.size === 0 ? [] : ['window.FF = window.FF || {};']
  let nr = 0
  for (const [module, names] of [...putsUp].sort(([a], [b]) => (a < b ? -1 : 1))) {
    const list = [...names].sort()
    // Only the used names, not the whole module: what no part touches drops out
    // at build time. Without names only the file's effect remains.
    if (list.length === 0) {
      head.push(`import '${module}'`)
      continue
    }
    const mark = `t${nr++}`
    head.push(`import { ${list.map((n) => `${n} as ${mark}$${n}`).join(', ')} } from '${module}'`)
    body.push(`${globalName(module)} = { ${list.map((n) => `${n}: ${mark}$${n}`).join(', ')} };`)
  }
  const entry = `${DRAFT}/${name}.ts`
  mkdirSync(DRAFT, { recursive: true })
  writeFileSync(entry, [...head, ...body].join('\n') + '\n')
  return entry
}

async function buildPart(vite, name, plan, out) {
  const entry = writeEntry(name, plan.filesPerPart.get(name), plan.putsUp.get(name))
  const globals = {}
  for (const [part, modules] of plan.putsUp) {
    if (part === name) continue
    for (const module of modules.keys()) globals[module] = globalName(module)
  }

  await vite.build({
    configFile: false,
    mode: 'production',
    logLevel: 'warn',
    publicDir: false,
    define: { 'process.env.NODE_ENV': '"production"' },
    plugins: [{
      name: 'ff-parts',
      // Before vite's own resolution, or this hook never gets its turn.
      enforce: 'pre',
      resolveId(spec, importer, options) {
        if (options.isEntry || importer === undefined) return null
        const from = posix(importer)
        // Only our own sources are split up; what a foreign package imports
        // inside itself is none of this plan's business.
        if (!from.startsWith(SRC + '/') && !from.startsWith(DRAFT + '/')) return null
        const target = spec.startsWith('.') ? resolveSpec(spec, path.dirname(from)) : spec
        const targetPart = target.startsWith(SRC + '/') ? partOf(target) : BASE
        if (targetPart === name) return null
        if (globals[target] === undefined) {
          throw new Error(`${name} takes "${spec}" from ${targetPart}, but that part does not put it up.`)
        }
        return { id: target, external: true }
      },
    }],
    build: {
      lib: { entry, formats: ['iife'], name: 'FFPart', fileName: () => `ff-${name}.js` },
      outDir: out,
      emptyOutDir: false,
      minify: true,
      rollupOptions: { output: { globals } },
    },
  })
}

async function buildRuntime(out) {
  const vite = await import('vite')
  const plan = buildPlan()
  rmSync(DRAFT, { recursive: true, force: true })
  mkdirSync(out, { recursive: true })
  await buildPart(vite, BASE, plan, out)
  for (const part of plan.parts) await buildPart(vite, part.name, plan, out)
  rmSync(DRAFT, { recursive: true, force: true })

  const manifest = {
    baseFile: plan.baseFile,
    parts: plan.parts.map(({ name, file, blockTypes, needs }) => ({ name, file, blockTypes, needs })),
  }
  writeFileSync(path.join(out, 'parts.json'), JSON.stringify(manifest, null, 2) + '\n')

  // Tidy up only at the end, never before: an editor open in parallel would
  // otherwise pick up an intermediate state without a runtime through HMR.
  const belongs = new Set([plan.baseFile, ...plan.parts.map((p) => p.file), 'parts.json', 'runtime.json'])
  for (const name of readdirSync(out)) {
    if (!belongs.has(name)) rmSync(path.join(out, name))
  }

  // The editor reads exactly one complete state. During a rebuild manifest and
  // code stay together, even when single parts are already finished.
  const contents = Object.fromEntries(
    [plan.baseFile, ...plan.parts.map((p) => p.file)]
      .map((file) => [file, readFileSync(path.join(out, file), 'utf8')]),
  )
  const temporary = path.join(out, 'runtime.json.tmp')
  writeFileSync(temporary, JSON.stringify({ ...manifest, contents }) + '\n')
  renameSync(temporary, path.join(out, 'runtime.json'))

  for (const file of [plan.baseFile, ...plan.parts.map((p) => p.file)]) {
    const kb = (readFileSync(path.join(out, file)).length / 1024).toFixed(1)
    process.stdout.write(`${file.padEnd(20)}${kb.padStart(7)} kB\n`)
  }
}

const at = process.argv.indexOf('--out')
await buildRuntime(at === -1
  ? path.join(ROOT, 'src/export/generated')
  : path.resolve(process.argv[at + 1]))
