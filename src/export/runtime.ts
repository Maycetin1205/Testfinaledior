import partsRaw from './generated/runtime.json?raw'

// The mask runtime in parts, as tools/buildRuntime.mjs builds them: one part
// per block and one per piece of code several blocks share. A mask carries
// the parts its blocks need and nothing else.

interface RuntimeParts {
  chunks: { code: string; imports: number[] }[]
  blocks: Record<string, number>

  // The blocks in the order of register.ts; they start in it.
  order: string[]
}

const PARTS = JSON.parse(partsRaw) as RuntimeParts

// Each part runs once, on its first require, and hands its exports over as
// getters; a part needed by several runs before the first of them goes on.
const LOADER = 'var d={},c={};'
  + 'function __ff(e,o){for(var k in o)Object.defineProperty(e,k,{enumerable:!0,get:o[k]})}'
  + 'function r(n){var m=c[n];if(!m){m=c[n]={exports:{}};d[n](r,m,m.exports)}return m.exports}'

export function runtimeFor(types: Iterable<string>): string {
  const wanted = new Set(types)
  const starts = PARTS.order.filter((type) => wanted.has(type))
  const unknown = [...wanted].filter((type) => PARTS.blocks[type] === undefined)
  if (unknown.length > 0) {
    throw new Error(`Für ${unknown.map((t) => `"${t}"`).join(', ')} fehlt die Laufzeit (npm run build:runtime)`)
  }
  if (starts.length === 0) return ''

  const needed = new Set<number>()
  const visit = (id: number) => {
    if (needed.has(id)) return
    needed.add(id)
    PARTS.chunks[id].imports.forEach(visit)
  }
  starts.forEach((type) => visit(PARTS.blocks[type]))

  const defined = [...needed].sort((a, b) => a - b)
    .map((id) => `d[${id}]=function(require,module,exports){${PARTS.chunks[id].code}\n};`)
  const started = starts.map((type) => `r(${PARTS.blocks[type]});`)
  return `(function(){${LOADER}\n${defined.join('\n')}\n${started.join('')}})();`
}
